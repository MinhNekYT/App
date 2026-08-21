import axios from "axios";
import * as db from "./db";
import { decryptGithubToken, encryptGithubToken } from "./githubToken";

export const antiminingWebhookSettingKey = "antimining_discord_webhook";
export const BLOCKED_MINING_PORTS = [2222, 3333, 4444, 5555, 7777, 8888, 13333, 14444] as const;
export const MINING_PROCESS_SIGNATURES = ["xmrig", "cgminer", "bfgminer", "cpuminer", "minerd", "nbminer", "lolminer", "t-rex"] as const;
export function isValidAntiminingEvent(event: unknown, message: unknown): event is "installed" | "heartbeat" | "terminated" | "alert" | "violation" {
  return ["installed", "heartbeat", "terminated", "alert", "violation"].includes(String(event)) && typeof message === "string" && message.length > 0 && message.length <= 1000;
}

export function validateDiscordWebhookUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname) || !url.pathname.startsWith("/api/webhooks/")) {
    throw new Error("Webhook URL must be a valid HTTPS Discord webhook URL.");
  }
  return url.toString();
}

export async function setAntiminingWebhook(url: string) {
  await db.setBotSetting(antiminingWebhookSettingKey, encryptGithubToken(validateDiscordWebhookUrl(url)));
}

export async function sendAntiminingWebhook(input: { instanceId: number; hostname: string; event: "installed" | "heartbeat" | "terminated" | "alert" | "violation"; message: string }) {
  const encrypted = await db.getBotSetting(antiminingWebhookSettingKey);
  if (!encrypted) return false;
  try {
    await axios.post(decryptGithubToken(encrypted), { username: "FrierenCloud Antimining", embeds: [{ color: input.event === "terminated" ? 0xef4444 : 0x22d3ee, title: `Antimining · ${input.event}`, description: input.message.slice(0, 1000), fields: [{ name: "VPS", value: `#${input.instanceId} · ${input.hostname}` }] }] }, { timeout: 8_000 });
    return true;
  } catch { return false; }
}
