import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({ botConfig: { ownerId: "owner-discord-id", adminIds: ["admin-discord-id"], publicBaseUrl: "https://bot.example.test", defaultRunner: { githubOwner: "owner", githubRepo: "repo", workflowFile: "frierencloud-vm.yml", ref: "main" } } }));
vi.mock("../server/db", () => ({ upsertUser: vi.fn(), getUserByOpenId: vi.fn(), getBotAccess: vi.fn(), setBotAccess: vi.fn(), getCoinBalance: vi.fn(), getBotSetting: vi.fn(), getUserById: vi.fn(), forfeitCoinsForViolation: vi.fn(), getUserLocale: vi.fn(), setUserLocale: vi.fn(), addCoins: vi.fn(), hasContributionToken: vi.fn(), createCoinClaimLink: vi.fn(), setDailyClaimLimit: vi.fn(), listVmInstances: vi.fn(), saveContributionToken: vi.fn() }));
vi.mock("../server/github", () => ({ GITHUB_ACCOUNT_ACCESS_ERROR: "ERROR: Unable to create VPS because account access is unavailable." }));
vi.mock("../server/githubToken", () => ({ encryptGithubToken: vi.fn(value => `enc:${value}`), githubTokenSettingKey: "github_dispatch_token_v1" }));
vi.mock("../server/antimining", () => ({ setAntiminingWebhook: vi.fn() }));
vi.mock("../server/provisioning", () => ({ VPS_COST: 2, provisionVps: vi.fn() }));

import * as db from "../server/db";
import { GITHUB_ACCOUNT_ACCESS_ERROR } from "../server/github";
import { provisionVps } from "../server/provisioning";
import { handleCommand, handleContributionConfirmation, notifyAntiminingViolation, notifyVpsCompletion } from "./service";

function interaction(commandName: string, values: Record<string, unknown> = {}) {
  return { commandName, user: { id: "guest-discord-id", username: "guest", globalName: "Guest" }, options: { getString: (name: string) => values[name] ?? null, getInteger: (name: string) => values[name] ?? null, getUser: () => values.user ?? null, getSubcommand: () => values.subcommand ?? "github", getSubcommandGroup: () => null, getChannel: () => null }, reply: vi.fn().mockResolvedValue(undefined), deferReply: vi.fn().mockResolvedValue(undefined), editReply: vi.fn().mockResolvedValue(undefined), client: { ws: { ping: 10 } } } as any;
}

describe("command and shared VPS behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getUserByOpenId).mockResolvedValue({ id: 5, openId: "discord_guest", name: "Guest" } as any);
    vi.mocked(db.getBotAccess).mockResolvedValue({ userId: 5, isAdmin: false, isBanned: false, isPartner: false } as any);
    vi.mocked(db.getUserLocale).mockResolvedValue("en");
    vi.mocked(db.getCoinBalance).mockResolvedValue(4);
    vi.mocked(provisionVps).mockResolvedValue({ id: 8, hostname: "frierencloud", ubuntuVersion: "24.04", status: "running", sshxUrl: null } as any);
    vi.mocked(db.forfeitCoinsForViolation).mockResolvedValue(7);
  });

  it("uses the default frierencloud hostname when /create leaves it empty", async () => {
    const i = interaction("create", { hostname: "", ubuntu: "24.04" });
    await handleCommand(i);
    expect(provisionVps).toHaveBeenCalledWith({ userId: 5, hostname: "", ubuntuVersion: "24.04" });
  });

  it("returns the public GitHub account access error from shared provisioning", async () => {
    vi.mocked(provisionVps).mockRejectedValue(new Error(GITHUB_ACCOUNT_ACCESS_ERROR));
    const i = interaction("create", { hostname: "frieren", ubuntu: "24.04" });
    await handleCommand(i);
    expect(i.editReply).toHaveBeenCalledWith(GITHUB_ACCOUNT_ACCESS_ERROR);
  });

  it("persists a language choice shared with the website", async () => {
    vi.mocked(db.setUserLocale).mockResolvedValue("vi");
    const i = interaction("language", { language: "vi" });
    await handleCommand(i);
    expect(db.setUserLocale).toHaveBeenCalledWith(5, "vi");
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("tiếng Việt") }));
  });

  it("does not let a non-admin set the global GitHub dispatch token", async () => {
    const i = interaction("token", { subcommand: "github", github_token: "secret" });
    await handleCommand(i);
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: "ERROR: You cannot use this command because you are not an administrator." }));
  });

  it("stores a contribution token only after the requesting user presses Confirm", async () => {
    const command = interaction("token", { subcommand: "contribute", token: "secondary-token" });
    await handleCommand(command);
    const response = command.reply.mock.calls[0][0];
    expect(response.content).toContain("ARE YOU SURE THIS IS THE TOKEN FOR THE GITHUB SECONDARY ACCOUNT?");
    const customId = response.components[0].toJSON().components[0].custom_id;
    const button = { customId, user: command.user, update: vi.fn().mockResolvedValue(undefined), reply: vi.fn().mockResolvedValue(undefined) } as any;
    await handleContributionConfirmation(button);
    expect(db.saveContributionToken).toHaveBeenCalledWith(5, "enc:secondary-token");
    expect(button.update).toHaveBeenCalledWith(expect.objectContaining({ components: [] }));
  });

  it("rejects a contribution Confirm button pressed by another Discord user", async () => {
    const command = interaction("token", { subcommand: "contribute", token: "secondary-token" });
    await handleCommand(command);
    const customId = command.reply.mock.calls[0][0].components[0].toJSON().components[0].custom_id;
    const button = { customId, user: { id: "other-discord-id", username: "other", globalName: "Other" }, update: vi.fn(), reply: vi.fn().mockResolvedValue(undefined) } as any;
    await handleContributionConfirmation(button);
    expect(db.saveContributionToken).not.toHaveBeenCalled();
    expect(button.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("invalid or expired") }));
  });

  it("rejects an expired contribution Confirm button", async () => {
    vi.useFakeTimers();
    try {
      const command = interaction("token", { subcommand: "contribute", token: "secondary-token" });
      await handleCommand(command);
      const customId = command.reply.mock.calls[0][0].components[0].toJSON().components[0].custom_id;
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      const button = { customId, user: command.user, update: vi.fn(), reply: vi.fn().mockResolvedValue(undefined) } as any;
      await handleContributionConfirmation(button);
      expect(db.saveContributionToken).not.toHaveBeenCalled();
      expect(button.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("invalid or expired") }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("credits confirmed contribution coins only through an administrator", async () => {
    vi.mocked(db.getBotAccess).mockResolvedValue({ userId: 5, isAdmin: true, isBanned: false, isPartner: false } as any);
    vi.mocked(db.hasContributionToken).mockResolvedValue(true);
    vi.mocked(db.addCoins).mockResolvedValue(12);
    const target = { id: "contributor-discord-id", username: "contributor", globalName: "Contributor" };
    const i = interaction("coin", { subcommand: "receive", coins: 3, user: target });
    await handleCommand(i);
    expect(db.addCoins).toHaveBeenCalledWith(expect.objectContaining({ amount: 3, reason: "contribution_review" }));
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Contribution approved") }));
  });

  it("rejects /coin receive for a non-admin before a coin credit is attempted", async () => {
    const target = { id: "contributor-discord-id", username: "contributor", globalName: "Contributor" };
    const i = interaction("coin", { subcommand: "receive", coins: 3, user: target });
    await handleCommand(i);
    expect(db.addCoins).not.toHaveBeenCalled();
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: "ERROR: You cannot use this command because you are not an administrator." }));
  });

  it("rejects a contribution credit when the recipient has not confirmed a token", async () => {
    vi.mocked(db.getBotAccess).mockResolvedValue({ userId: 5, isAdmin: true, isBanned: false, isPartner: false } as any);
    vi.mocked(db.hasContributionToken).mockResolvedValue(false);
    const target = { id: "contributor-discord-id", username: "contributor", globalName: "Contributor" };
    const i = interaction("coin", { subcommand: "receive", coins: 3, user: target });
    await handleCommand(i);
    expect(db.addCoins).not.toHaveBeenCalled();
    expect(i.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("Confirm a contribution token") }));
  });

  it("DMs the requesting Discord user when real callback output includes SSHX", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ openId: "discord_987" } as any);
    const send = vi.fn().mockResolvedValue(undefined); const client = { users: { fetch: vi.fn().mockResolvedValue({ send }) } } as any;
    await notifyVpsCompletion(client, { userId: 5, id: 8, hostname: "frieren-01", ubuntuVersion: "24.04", status: "completed", sshxUrl: "https://sshx.io/example" } as any);
    expect(client.users.fetch).toHaveBeenCalledWith("987");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("ready") }));
  });

  it("forfeits coins and bans the user when Antimining confirms a violation", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ openId: "discord_987" } as any);
    const send = vi.fn().mockResolvedValue(undefined); const client = { users: { fetch: vi.fn().mockResolvedValue({ send }) } } as any;
    await notifyAntiminingViolation(client, { userId: 5, id: 8 } as any, "xmrig signature");
    expect(db.forfeitCoinsForViolation).toHaveBeenCalledWith({ userId: 5, instanceId: 8 });
    expect(db.setBotAccess).toHaveBeenCalledWith(5, { isBanned: true });
  });
});
