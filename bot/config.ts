import "dotenv/config";
import { FRIERENCLOUD_AVATAR_URL } from "./avatar";

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function list(name: string): string[] {
  return (process.env[name] ?? "").split(",").map(value => value.trim()).filter(Boolean);
}

export const botConfig = {
  token: optional("DISCORD_BOT_TOKEN"),
  applicationId: optional("DISCORD_APPLICATION_ID"),
  guildId: optional("DISCORD_GUILD_ID"),
  ownerId: optional("OWNER_ID"),
  adminIds: list("ADMIN_IDS"),
  publicBaseUrl: (optional("BASE_URL") ?? optional("BOT_PUBLIC_URL"))?.replace(/\/+$/, ""),
  avatarUrl: optional("BOT_AVATAR_URL") ?? FRIERENCLOUD_AVATAR_URL,
  defaultRunner: {
    githubOwner: optional("GITHUB_RUNNER_OWNER"),
    githubRepo: optional("GITHUB_RUNNER_REPO"),
    workflowFile: optional("GITHUB_WORKFLOW_FILE") ?? "frierencloud-vm.yml",
    ref: optional("GITHUB_WORKFLOW_REF") ?? "main",
  },
};

export function requireBotRuntimeConfig() {
  const missing = [["DISCORD_BOT_TOKEN", botConfig.token], ["DISCORD_APPLICATION_ID", botConfig.applicationId], ["OWNER_ID", botConfig.ownerId], ["BASE_URL", botConfig.publicBaseUrl]].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required bot configuration: ${missing.join(", ")}`);
}
