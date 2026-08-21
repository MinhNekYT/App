import express from "express";
import path from "node:path";
import { createDiscordBot, notifyAntiminingViolation, notifyVpsCompletion } from "./service";
import { botConfig, requireBotRuntimeConfig } from "./config";
import { registerVmCallbackRoute } from "../server/vmCallback";
import * as db from "../server/db";
import { isValidClaimSignature } from "../server/claimSignature";
import { isValidVmLogSignature } from "../server/github";
import { isValidAntiminingEvent, sendAntiminingWebhook } from "../server/antimining";
import { registerWebAuthRoutes } from "../server/webAuth";

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!); }
function claimPage(link: { id: string; discordName: string; avatarUrl: string | null }, notice?: string) {
  const avatar = link.avatarUrl ? `<img src="${escapeHtml(link.avatarUrl)}" alt="Discord avatar"/>` : "<div class=avatar>FC</div>";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>FrierenCloud Daily Coins</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#061a60;color:#fff;font-family:system-ui}.card{width:min(420px,calc(100% - 32px);padding:32px;text-align:center;border:1px solid #8be9fd55;background:#071d67;box-shadow:10px 10px #020a34}.avatar,img{width:84px;height:84px;border-radius:50%;object-fit:cover;margin:auto;background:#8be9fd;color:#061a60;display:grid;place-items:center;font-weight:800}button{margin-top:24px;border:0;background:#8be9fd;color:#061a60;padding:14px 20px;font-weight:800;font-size:16px;cursor:pointer}.note{color:#ccecff}</style></head><body><main class=card>${avatar}<p class=note>Daily coin claim</p><h1>${escapeHtml(link.discordName)}</h1><p>Claim your FrierenCloud daily coins.</p>${notice ? `<p class=note>${escapeHtml(notice)}</p>` : `<form method="post" action="/coin/${link.id}/claim"><button>Get coins here</button></form>`}</main></body></html>`;
}

async function main() {
  requireBotRuntimeConfig();
  const bot = createDiscordBot();
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => res.status(200).json({ service: "frierencloud-bot", status: "ok" }));
  app.get("/coin/:id", async (req, res) => { const sig = String(req.query.sig ?? ""); const link = await db.getCoinClaimLink(req.params.id); if (!isValidClaimSignature(req.params.id, sig) || !link || link.usedAt || link.expiresAt.getTime() < Date.now()) return res.status(404).send("Claim link is invalid, expired, or already used."); res.type("html").send(claimPage(link)); });
  app.post("/coin/:id/claim", async (req, res) => { const sig = String(req.query.sig ?? ""); const link = await db.getCoinClaimLink(req.params.id); if (!isValidClaimSignature(req.params.id, sig) || !link) return res.status(404).send("Claim link is invalid."); try { const balance = await db.redeemCoinClaimLink(link.id); res.type("html").send(claimPage(link, `Coins claimed successfully. Your balance is now ${balance}.`)); } catch (error) { res.type("html").send(claimPage(link, error instanceof Error ? error.message : "Claim failed.")); } });
  app.post("/api/scheduled/partner-rewards", async (req, res) => { if (!process.env.PARTNER_REWARD_CRON_SECRET || req.header("x-cron-secret") !== process.env.PARTNER_REWARD_CRON_SECRET) return res.status(403).json({ error: "cron-only" }); try { res.json({ ok: true, rewarded: await db.awardDuePartnerRewards() }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "Partner reward failure" }); } });
  app.post("/api/antimining/:instanceId", async (req, res) => { const instanceId = Number(req.params.instanceId); const sig = String(req.query.sig ?? ""); const event = req.body?.event; const message = req.body?.message; if (!Number.isInteger(instanceId) || !isValidVmLogSignature(instanceId, sig) || !isValidAntiminingEvent(event, message)) return res.status(400).json({ error: "invalid-antimining-event" }); const instance = await db.getVmById(instanceId); if (!instance) return res.status(404).json({ error: "instance-not-found" }); console.info("[Antimining]", { instanceId, event, message }); await db.appendVmLog(instanceId, `[Antimining:${event}] ${message}`); if (event === "violation") { await db.updateVmFromCallback(instanceId, { status: "failed" }); await notifyAntiminingViolation(bot, instance, message); } await sendAntiminingWebhook({ instanceId, hostname: instance.hostname, event, message }); res.json({ ok: true }); });
  registerVmCallbackRoute(app, instance => notifyVpsCompletion(bot, instance));
  registerWebAuthRoutes(app);
  const webRoot = path.join(process.cwd(), "dist", "public");
  app.use(express.static(webRoot));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/coin/")) return next();
    res.sendFile(path.join(webRoot, "index.html"), error => { if (error) next(); });
  });
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The hosting provider must supply a valid PORT.");
  app.listen(port, () => console.info("[FrierenCloud] Callback service is listening."));
  await bot.login(botConfig.token);
}

main().catch(error => { console.error("[FrierenCloud] Startup failed", error); process.exit(1); });
