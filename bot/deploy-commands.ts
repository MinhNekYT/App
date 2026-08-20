import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandBuilders } from "./commands";
import { botConfig } from "./config";

async function deploy() {
  if (!botConfig.token || !botConfig.applicationId) throw new Error("DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required.");
  const rest = new REST({ version: "10" }).setToken(botConfig.token);
  const route = botConfig.guildId ? Routes.applicationGuildCommands(botConfig.applicationId, botConfig.guildId) : Routes.applicationCommands(botConfig.applicationId);
  await rest.put(route, { body: commandBuilders });
  console.info(`[FrierenCloud] Deployed ${commandBuilders.length} slash commands.`);
}
deploy().catch(error => { console.error("[FrierenCloud] Command deployment failed", error); process.exit(1); });
