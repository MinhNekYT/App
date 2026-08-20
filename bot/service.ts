import { Client, EmbedBuilder, Events, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import * as db from "../server/db";
import { createVmLogSignature, dispatchWorkflow, validateLinuxHostname } from "../server/github";
import { decryptGithubToken, encryptGithubToken, githubTokenSettingKey } from "../server/githubToken";
import { createClaimSignature } from "../server/claimSignature";
import { setAntiminingWebhook } from "../server/antimining";
import { hasAdminAccess } from "./access";
import { botConfig } from "./config";

const VPS_COST = 2;
const BANNED = "ERROR: You have been banned by an admin. If you think this is a misunderstanding, please contact any admin via DMS.";
const NOT_ADMIN = "ERROR: You cannot use this command because you are not an administrator.";
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
  if ((await db.getBotAccess(user.id)).isBanned) { await i.reply({ content: BANNED, ephemeral: true }); return null; }
  return user;
}
async function admin(i: ChatInputCommandInteraction, user: BotUser) {
  const dynamic = (await db.getBotAccess(user.id)).isAdmin;
  if (!dynamic && !hasAdminAccess(i.user.id, botConfig.ownerId, botConfig.adminIds)) { await i.reply({ content: NOT_ADMIN, ephemeral: true }); return false; }
  return true;
}
function runner() { const r = botConfig.defaultRunner; if (!r.githubOwner || !r.githubRepo) throw new Error("GitHub runner is not configured."); return r; }
async function token() { const v = await db.getBotSetting(githubTokenSettingKey); if (!v) throw new Error("No GitHub token is configured. Ask an administrator to use /token."); return decryptGithubToken(v); }
function card(v: any) { return new EmbedBuilder().setColor(0x8be9fd).setTitle(`Ubuntu ${v.ubuntuVersion} VPS #${v.id} · ${v.hostname}`).addFields({ name: "Status", value: v.status, inline: true }, { name: "SSHX", value: v.sshxUrl || "Waiting for real workflow output" }); }

export async function handleCommand(i: ChatInputCommandInteraction) {
  const user = await currentUser(i); if (!user) return;
  if (i.commandName === "help") return i.reply({ content: "`/coin daily` · `/balance` · `/create` · `/manage` · `/info` · `/token` · `/webhook` · `/give` · `/user`", ephemeral: true });
  if (i.commandName === "info") return i.reply({ content: `ℹ️ | FrierenCloud Info\n👑 | Owner: <@${botConfig.ownerId ?? "1071750161488937060"}>\n💿 | Version: 1.0\n🤖 | Ping: ${i.client.ws.ping}ms`, ephemeral: true });
  if (i.commandName === "balance") return i.reply({ content: `Your balance is **${await db.getCoinBalance(user.id)} coins**.`, ephemeral: true });
  if (i.commandName === "coin") {
    const sub = i.options.getSubcommand();
    if (sub === "maximum-daily") { if (!await admin(i, user)) return; const times = i.options.getInteger("times", true); await db.setDailyClaimLimit(times); return i.reply({ content: `Maximum daily claims set to **${times}**.`, ephemeral: true }); }
    const link = await db.createCoinClaimLink({ userId: user.id, discordName: i.user.globalName || i.user.username, avatarUrl: i.user.displayAvatarURL() });
    return i.reply({ content: `Claim link (expires in 15 minutes): ${botConfig.publicBaseUrl}/coin/${link.id}?sig=${createClaimSignature(link.id)}`, ephemeral: true });
  }
  if (i.commandName === "user") {
    if (!await admin(i, user)) return;
    const id = i.options.getString("user_id", true); const target = await ensureUser(id, `Discord user ${id}`); const subcommand = i.options.getSubcommand(); const sub = i.options.getSubcommandGroup(false) ? `add-${subcommand}` : subcommand;
    if (sub === "add-admin") await db.setBotAccess(target.id, { isAdmin: true });
    if (sub === "add-partner") await db.setBotAccess(target.id, { isPartner: true });
    if (sub === "ban") await db.setBotAccess(target.id, { isBanned: true });
    if (sub === "unban") await db.setBotAccess(target.id, { isBanned: false });
    return i.reply({ content: `User ${id} updated: ${sub}.`, ephemeral: true });
  }
  if (i.commandName === "token") { if (!await admin(i, user)) return; await db.setBotSetting(githubTokenSettingKey, encryptGithubToken(i.options.getString("github_token", true))); return i.reply({ content: "GitHub token stored securely.", ephemeral: true }); }
  if (i.commandName === "webhook") { if (!await admin(i, user)) return; await setAntiminingWebhook(i.options.getString("webhook_url", true)); return i.reply({ content: "FrierenCloud Antimining webhook configured securely.", ephemeral: true }); }
  if (i.commandName === "give") { if (!await admin(i, user)) return; const target = i.options.getUser("user", true); const coins = i.options.getInteger("coins", true); const recipient = await ensureUser(target.id, target.globalName || target.username); const balance = await db.addCoins({ userId: recipient.id, actorUserId: user.id, amount: coins, reason: "admin_grant" }); return i.reply({ content: `Gave **${coins} coins** to ${target}. New balance: **${balance}**.`, ephemeral: true }); }
  if (i.commandName === "manage") { const list = await db.listVmInstances(user.id); return i.reply({ embeds: list.length ? list.slice(0, 10).map(card) : [new EmbedBuilder().setDescription("No VPS sessions yet.")], ephemeral: true }); }
  if (i.commandName === "create") {
    await i.deferReply({ ephemeral: true }); const hostname = validateLinuxHostname(i.options.getString("hostname", true)); const ubuntuVersion = i.options.getString("ubuntu", true) as "22.04" | "24.04" | "26.04";
    if (!await db.reserveCoinsForVps({ userId: user.id, cost: VPS_COST })) return i.editReply(`You need **${VPS_COST} coins** to create a VPS.`);
    try { const r = runner(); const vm = await db.createVmInstance({ userId: user.id, hostname, ubuntuVersion, githubOwner: r.githubOwner!, githubRepo: r.githubRepo!, workflowFile: r.workflowFile }); const callbackUrl = `${botConfig.publicBaseUrl}/api/vm-logs/${vm.id}?sig=${createVmLogSignature(vm.id)}`; const antiminingUrl = `${botConfig.publicBaseUrl}/api/antimining/${vm.id}?sig=${createVmLogSignature(vm.id)}`; const run = await dispatchWorkflow({ ...r, hostname, ubuntuVersion, callbackUrl, antiminingUrl, token: await token() }); await db.updateVmFromCallback(vm.id, { workflowRunId: String(run.runId ?? ""), status: "running" }); return i.editReply({ embeds: [card({ ...vm, status: "running" })] }); }
    catch (e) { await db.addCoins({ userId: user.id, actorUserId: user.id, amount: VPS_COST, reason: "vps_create_refund" }); return i.editReply(`Provisioning failed and your ${VPS_COST} coins were refunded. ${e instanceof Error ? e.message : ""}`); }
  }
  if (i.commandName === "status") return i.reply({ content: "FrierenCloud is online.", ephemeral: true });
}
export function createDiscordBot() { const client = new Client({ intents: [GatewayIntentBits.Guilds] }); client.once(Events.ClientReady, async r => { await db.awardDuePartnerRewards(); console.info(`[FrierenCloud] Logged in as ${r.user.tag}`); r.user.setActivity("/help · Ubuntu VPS control"); }); client.on(Events.InteractionCreate, async x => { if (x.isChatInputCommand()) try { await handleCommand(x); } catch (e) { const m = e instanceof Error ? e.message : "Unexpected command error."; if (x.deferred || x.replied) await x.editReply(`Command failed: ${m}`); else await x.reply({ content: `Command failed: ${m}`, ephemeral: true }); } }); return client; }
export async function notifyVpsCompletion(client: Client, instance: Awaited<ReturnType<typeof db.getVmById>>) { if (!instance?.sshxUrl) return; const owner = await db.getUserById(instance.userId); const id = owner?.openId.startsWith("discord_") ? owner.openId.slice(8) : undefined; if (!id) return; try { await (await client.users.fetch(id)).send({ content: "Your Ubuntu VPS is ready.", embeds: [card(instance)] }); } catch {} }
