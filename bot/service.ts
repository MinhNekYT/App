import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import { randomUUID } from "node:crypto";
import * as db from "../server/db";
import { GITHUB_ACCOUNT_ACCESS_ERROR } from "../server/github";
import { encryptGithubToken, githubTokenSettingKey } from "../server/githubToken";
import { createClaimSignature } from "../server/claimSignature";
import { setAntiminingWebhook } from "../server/antimining";
import { auditLogChannelSettingKey, formatAuditCommand } from "../server/audit";
import { VPS_COST, provisionVps } from "../server/provisioning";
import { copy, normalizeLocale } from "../server/language";
import { hasAdminAccess } from "./access";
import { botConfig } from "./config";

const CONTRIBUTION_WARNING = "ARE YOU SURE THIS IS THE TOKEN FOR THE GITHUB SECONDARY ACCOUNT? THIS ACTION MAY RESULT IN THE ACCOUNT BEING BANNED. IF YOU AGREE, CLICK THE \"Confirm\" BUTTON BELOW.";
const pendingContributions = new Map<string, { discordId: string; token: string; expiresAt: number }>();
type BotUser = { id: number; discordId: string; name: string | null };

async function ensureUser(discordId: string, name: string): Promise<BotUser> {
  const openId = `discord_${discordId}`;
  await db.upsertUser({ openId, name, loginMethod: "discord-bot", lastSignedIn: new Date() });
  const user = await db.getUserByOpenId(openId);
  if (!user) throw new Error("FrierenCloud could not resolve your account.");
  return { id: user.id, discordId, name: user.name };
}

async function currentUser(i: ChatInputCommandInteraction) {
  const user = await ensureUser(i.user.id, i.user.globalName || i.user.username);
  const locale = await db.getUserLocale(user.id);
  if ((await db.getBotAccess(user.id)).isBanned) { await i.reply({ content: copy[locale].banned, ephemeral: true }); return null; }
  return { user, locale };
}

async function admin(i: ChatInputCommandInteraction, user: BotUser, locale: "en" | "vi") {
  const dynamic = (await db.getBotAccess(user.id)).isAdmin;
  if (!dynamic && !hasAdminAccess(i.user.id, botConfig.ownerId, botConfig.adminIds)) { await i.reply({ content: copy[locale].notAdmin, ephemeral: true }); return false; }
  return true;
}

function card(v: { ubuntuVersion: string; id: number; hostname: string; status: string; sshxUrl?: string | null }) {
  return new EmbedBuilder().setColor(0x8be9fd).setTitle(`Ubuntu ${v.ubuntuVersion} VPS #${v.id} · ${v.hostname}`).addFields({ name: "Status", value: v.status, inline: true }, { name: "SSHX", value: v.sshxUrl || "Waiting for real workflow output" });
}

function prunePendingContributions() {
  const now = Date.now();
  for (const [id, value] of pendingContributions) if (value.expiresAt <= now) pendingContributions.delete(id);
}

export async function handleCommand(i: ChatInputCommandInteraction) {
  const context = await currentUser(i); if (!context) return;
  const { user, locale } = context;
  if (i.commandName === "help") return i.reply({ content: locale === "vi" ? "`/coin daily` · `/balance` · `/create` · `/manage` · `/language` · `/token contribute`" : "`/coin daily` · `/balance` · `/create` · `/manage` · `/language` · `/token contribute`", ephemeral: true });
  if (i.commandName === "info") return i.reply({ content: `ℹ️ | FrierenCloud Info\n👑 | Owner: <@${botConfig.ownerId ?? "1071750161488937060"}>\n💿 | Version: 1.0\n🤖 | Ping: ${i.client.ws.ping}ms`, ephemeral: true });
  if (i.commandName === "balance") return i.reply({ content: locale === "vi" ? `Số dư của bạn là **${await db.getCoinBalance(user.id)} xu**.` : `Your balance is **${await db.getCoinBalance(user.id)} coins**.`, ephemeral: true });
  if (i.commandName === "language") { const saved = await db.setUserLocale(user.id, normalizeLocale(i.options.getString("language", true))); return i.reply({ content: copy[saved].languageSaved, ephemeral: true }); }
  if (i.commandName === "coin") {
    const sub = i.options.getSubcommand();
    if (sub === "maximum-daily") { if (!await admin(i, user, locale)) return; const times = i.options.getInteger("times", true); await db.setDailyClaimLimit(times); return i.reply({ content: `Maximum daily claims set to **${times}**.`, ephemeral: true }); }
    if (sub === "receive") {
      if (!await admin(i, user, locale)) return;
      const target = i.options.getUser("user", true); const recipient = await ensureUser(target.id, target.globalName || target.username);
      if (!await db.hasContributionToken(recipient.id)) return i.reply({ content: copy[locale].noContribution, ephemeral: true });
      const coins = i.options.getInteger("coins", true); const balance = await db.addCoins({ userId: recipient.id, actorUserId: user.id, amount: coins, reason: "contribution_review" });
      return i.reply({ content: `Contribution approved: **${coins} coins** credited to ${target}. New balance: **${balance}**.`, ephemeral: true });
    }
    const link = await db.createCoinClaimLink({ userId: user.id, discordName: i.user.globalName || i.user.username, avatarUrl: i.user.displayAvatarURL() });
    return i.reply({ content: `Claim link (expires in 15 minutes): ${botConfig.publicBaseUrl}/coin/${link.id}?sig=${createClaimSignature(link.id)}`, ephemeral: true });
  }
  if (i.commandName === "user") {
    if (!await admin(i, user, locale)) return;
    const id = i.options.getString("user_id", true); const target = await ensureUser(id, `Discord user ${id}`); const subcommand = i.options.getSubcommand(); const sub = i.options.getSubcommandGroup(false) ? `add-${subcommand}` : subcommand;
    if (sub === "add-admin") await db.setBotAccess(target.id, { isAdmin: true }); if (sub === "add-partner") await db.setBotAccess(target.id, { isPartner: true }); if (sub === "ban") await db.setBotAccess(target.id, { isBanned: true }); if (sub === "unban") await db.setBotAccess(target.id, { isBanned: false });
    return i.reply({ content: `User ${id} updated: ${sub}.`, ephemeral: true });
  }
  if (i.commandName === "token") {
    const sub = i.options.getSubcommand();
    if (sub === "github") { if (!await admin(i, user, locale)) return; await db.setBotSetting(githubTokenSettingKey, encryptGithubToken(i.options.getString("github_token", true))); return i.reply({ content: copy[locale].tokenStored, ephemeral: true }); }
    prunePendingContributions(); const id = randomUUID(); pendingContributions.set(id, { discordId: i.user.id, token: i.options.getString("token", true), expiresAt: Date.now() + 5 * 60 * 1000 });
    return i.reply({ content: CONTRIBUTION_WARNING, components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`fc-contribute-confirm:${id}`).setLabel("Confirm").setStyle(ButtonStyle.Danger))], ephemeral: true });
  }
  if (i.commandName === "webhook") { if (!await admin(i, user, locale)) return; await setAntiminingWebhook(i.options.getString("webhook_url", true)); return i.reply({ content: "FrierenCloud Antimining webhook configured securely.", ephemeral: true }); }
  if (i.commandName === "logs") { if (!await admin(i, user, locale)) return; const channel = i.options.getChannel("channel", true); if (!(channel as any).isTextBased?.() || !("send" in channel)) return i.reply({ content: "Please choose a text-based channel.", ephemeral: true }); await db.setBotSetting(auditLogChannelSettingKey, channel.id); return i.reply({ content: `Command audit logging enabled for <#${channel.id}>.`, ephemeral: true }); }
  if (i.commandName === "give") { if (!await admin(i, user, locale)) return; const target = i.options.getUser("user", true); const coins = i.options.getInteger("coins", true); const recipient = await ensureUser(target.id, target.globalName || target.username); const balance = await db.addCoins({ userId: recipient.id, actorUserId: user.id, amount: coins, reason: "admin_grant" }); return i.reply({ content: `Gave **${coins} coins** to ${target}. New balance: **${balance}**.`, ephemeral: true }); }
  if (i.commandName === "manage") { const list = await db.listVmInstances(user.id); return i.reply({ embeds: list.length ? list.slice(0, 10).map(card) : [new EmbedBuilder().setDescription("No VPS sessions yet.")], ephemeral: true }); }
  if (i.commandName === "create") { await i.deferReply({ ephemeral: true }); try { const vm = await provisionVps({ userId: user.id, hostname: i.options.getString("hostname", false), ubuntuVersion: i.options.getString("ubuntu", true) as "22.04" | "24.04" | "26.04" }); return i.editReply({ embeds: [card(vm)] }); } catch (error) { if (error instanceof Error && error.message === GITHUB_ACCOUNT_ACCESS_ERROR) return i.editReply(GITHUB_ACCOUNT_ACCESS_ERROR); return i.editReply(`Provisioning failed and your ${VPS_COST} coins were refunded when applicable. ${error instanceof Error ? error.message : ""}`); } }
  if (i.commandName === "status") return i.reply({ content: "FrierenCloud is online.", ephemeral: true });
}

export async function handleContributionConfirmation(i: ButtonInteraction) {
  if (!i.customId.startsWith("fc-contribute-confirm:")) return;
  const id = i.customId.slice("fc-contribute-confirm:".length); const pending = pendingContributions.get(id);
  if (!pending || pending.expiresAt <= Date.now() || pending.discordId !== i.user.id) return i.reply({ content: "This contribution confirmation is invalid or expired.", ephemeral: true });
  pendingContributions.delete(id); const user = await ensureUser(i.user.id, i.user.globalName || i.user.username); const locale = await db.getUserLocale(user.id);
  await db.saveContributionToken(user.id, encryptGithubToken(pending.token));
  return i.update({ content: copy[locale].contributionStored, components: [] });
}

export async function sendAuditLog(client: Client, input: { userId: string; userTag: string; commandName: string; options: ReadonlyArray<{ name: string; value?: unknown; options?: ReadonlyArray<{ name: string; value?: unknown }> }> }) { const channelId = await db.getBotSetting(auditLogChannelSettingKey); if (!channelId) return; try { const channel = await client.channels.fetch(channelId); if (channel?.isTextBased() && "send" in channel) await channel.send({ content: formatAuditCommand({ ...input, options: input.options as any }), allowedMentions: { users: [input.userId] } }); } catch (error) { console.warn("[FrierenCloud] Audit log delivery failed", error); } }
export function createDiscordBot() { const client = new Client({ intents: [GatewayIntentBits.Guilds] }); client.once(Events.ClientReady, async ready => { await db.awardDuePartnerRewards(); console.info(`[FrierenCloud] Logged in as ${ready.user.tag}`); ready.user.setActivity("/help · Ubuntu VPS control"); }); client.on(Events.InteractionCreate, async interaction => { try { if (interaction.isChatInputCommand()) { await sendAuditLog(client, { userId: interaction.user.id, userTag: interaction.user.tag, commandName: interaction.commandName, options: interaction.options.data }); await handleCommand(interaction); } else if (interaction.isButton()) await handleContributionConfirmation(interaction); } catch (error) { const message = error instanceof Error ? error.message : "Unexpected command error."; if (interaction.isChatInputCommand() && (interaction.deferred || interaction.replied)) await interaction.editReply(`Command failed: ${message}`); else if (interaction.isRepliable()) await interaction.reply({ content: `Command failed: ${message}`, ephemeral: true }); } }); return client; }
export async function notifyVpsCompletion(client: Client, instance: Awaited<ReturnType<typeof db.getVmById>>) { if (!instance?.sshxUrl) return; const owner = await db.getUserById(instance.userId); const id = owner?.openId.startsWith("discord_") ? owner.openId.slice(8) : undefined; if (!id) return; try { await (await client.users.fetch(id)).send({ content: "Your Ubuntu VPS is ready.", embeds: [card(instance)] }); } catch {} }
export async function notifyAntiminingViolation(client: Client, instance: Awaited<ReturnType<typeof db.getVmById>>, evidence: string) { if (!instance) return; const forfeited = await db.forfeitCoinsForViolation({ userId: instance.userId, instanceId: instance.id }); await db.setBotAccess(instance.userId, { isBanned: true }); const owner = await db.getUserById(instance.userId); const id = owner?.openId.startsWith("discord_") ? owner.openId.slice(8) : undefined; if (!id) return; try { await (await client.users.fetch(id)).send({ content: `FrierenCloud Antimining detected a policy violation on VPS #${instance.id}. The VPS is being shut down, your account has been banned, and ${forfeited} coins were forfeited. Evidence: ${evidence.slice(0, 700)}` }); } catch {} }
