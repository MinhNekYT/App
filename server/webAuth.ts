import axios from "axios";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import * as db from "./db";
import { createClaimSignature } from "./claimSignature";
import { normalizeLocale } from "./language";
import { provisionVps } from "./provisioning";

const SESSION_COOKIE = "frierencloud_web_session";
const STATE_COOKIE = "frierencloud_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DiscordProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

export type WebSession = {
  userId: number;
  discordId: string;
  name: string;
  avatarUrl: string;
  expiresAt: number;
};

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signingSecret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) throw new Error("JWT_SECRET is required for FrierenCloud web sessions.");
  return value;
}

function sign(value: string, secret = signingSecret()) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createWebSession(session: WebSession, secret?: string) {
  const payload = base64Url(JSON.stringify(session));
  return `${payload}.${sign(payload, secret)}`;
}

export function parseWebSession(value: string | undefined, secret?: string): WebSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(fromBase64Url(payload)) as WebSession;
    if (!Number.isInteger(session.userId) || !session.discordId || !session.name || !session.avatarUrl || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string) {
  const entries = (req.headers.cookie ?? "").split(";").map(value => value.trim());
  const match = entries.find(value => value.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function cookieOptions(req: Request, maxAge: number) {
  const forwarded = req.header("x-forwarded-proto");
  const secure = forwarded === "https" || req.protocol === "https";
  return { httpOnly: true, sameSite: "lax" as const, secure, maxAge, path: "/" };
}

function publicBaseUrl() {
  return (process.env.BASE_URL ?? process.env.BOT_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
}

function oauthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const redirectUri = (process.env.DISCORD_REDIRECT_URI?.trim() || (publicBaseUrl() ? `${publicBaseUrl()}/auth/discord/callback` : ""));
  return { clientId, clientSecret, redirectUri };
}

function discordAvatar(profile: DiscordProfile) {
  if (profile.avatar) return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(profile.id) % 5}.png`;
}

function readSession(req: Request) {
  return parseWebSession(readCookie(req, SESSION_COOKIE));
}

function unauthorized(res: Response) {
  return res.status(401).json({ error: "authentication_required" });
}

export function registerWebAuthRoutes(app: Express) {
  app.get("/auth/discord", (req, res) => {
    const { clientId, redirectUri } = oauthConfig();
    if (!clientId || !redirectUri) return res.status(503).type("html").send("Discord OAuth2 is not configured. Add DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI to .env.");
    const state = randomUUID();
    res.cookie(STATE_COOKIE, state, cookieOptions(req, 10 * 60 * 1000));
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  app.get("/auth/discord/callback", async (req, res) => {
    const { clientId, clientSecret, redirectUri } = oauthConfig();
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const storedState = readCookie(req, STATE_COOKIE);
    if (!clientId || !clientSecret || !redirectUri || !code || !storedState || state !== storedState) return res.status(400).type("html").send("Discord login could not be verified. Please return and try again.");
    try {
      const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri }), { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15_000 });
      const accessToken = String(tokenResponse.data?.access_token ?? "");
      if (!accessToken) throw new Error("Missing Discord access token");
      const profileResponse = await axios.get<DiscordProfile>("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15_000 });
      const profile = profileResponse.data;
      const name = profile.global_name?.trim() || profile.username;
      await db.upsertUser({ openId: `discord_${profile.id}`, name, email: profile.email ?? null, loginMethod: "discord-oauth", lastSignedIn: new Date() });
      const user = await db.getUserByOpenId(`discord_${profile.id}`);
      if (!user) throw new Error("FrierenCloud user record was unavailable");
      const session: WebSession = { userId: user.id, discordId: profile.id, name, avatarUrl: discordAvatar(profile), expiresAt: Date.now() + SESSION_TTL_MS };
      res.clearCookie(STATE_COOKIE, cookieOptions(req, -1));
      res.cookie(SESSION_COOKIE, createWebSession(session), cookieOptions(req, SESSION_TTL_MS));
      res.redirect("/dashboard");
    } catch (error) {
      console.error("[FrierenCloud] Discord OAuth callback failed", error);
      res.status(502).type("html").send("FrierenCloud could not complete Discord sign-in. Please try again later.");
    }
  });

  app.post("/auth/logout", (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req, -1));
    res.json({ ok: true });
  });

  app.get("/api/web/session", (req, res) => {
    const session = readSession(req);
    if (!session) return res.json({ authenticated: false });
    res.json({ authenticated: true, user: session });
  });

  app.get("/api/web/dashboard", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const [coins, instances, locale, dailyLimit, dailyUsage, contributionConfigured] = await Promise.all([db.getCoinBalance(session.userId), db.listVmInstances(session.userId), db.getUserLocale(session.userId), db.getDailyClaimLimit(), db.getDailyClaimUsageToday(session.userId), db.hasContributionToken(session.userId)]);
    res.json({ user: session, coins, locale, daily: { limit: dailyLimit, used: dailyUsage }, contributionConfigured, instances: instances.map(instance => ({ id: instance.id, hostname: instance.hostname, ubuntuVersion: instance.ubuntuVersion, status: instance.status, sshxUrl: instance.sshxUrl, createdAt: instance.createdAt })) });
  });

  app.post("/api/web/language", express.json(), async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const locale = await db.setUserLocale(session.userId, normalizeLocale(req.body?.locale));
    res.json({ locale });
  });

  app.post("/api/web/coin/daily", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const link = await db.createCoinClaimLink({ userId: session.userId, discordName: session.name, avatarUrl: session.avatarUrl });
    res.json({ url: `${publicBaseUrl()}/coin/${link.id}?sig=${createClaimSignature(link.id)}`, expiresAt: link.expiresAt });
  });

  app.post("/api/web/vms", express.json(), async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    if ((await db.getBotAccess(session.userId)).isBanned) return res.status(403).json({ error: "account_banned" });
    const ubuntuVersion = req.body?.ubuntuVersion === "22.04" ? "22.04" : "24.04";
    try {
      const instance = await provisionVps({ userId: session.userId, hostname: typeof req.body?.hostname === "string" ? req.body.hostname : "", ubuntuVersion });
      res.status(201).json({ instance });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create VPS.";
      res.status(message.includes("need") ? 400 : 500).json({ error: message });
    }
  });

  app.get("/api/web/vms/:instanceId", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const instanceId = Number(req.params.instanceId);
    if (!Number.isInteger(instanceId) || instanceId < 1) return res.status(400).json({ error: "invalid_instance" });
    const instance = await db.getVmForUser(instanceId, session.userId);
    if (!instance) return res.status(404).json({ error: "not_found" });
    res.json({ instance, logs: await db.getVmLogs(instanceId) });
  });
}
