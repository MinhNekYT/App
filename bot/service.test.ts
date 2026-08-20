import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({ botConfig: { ownerId: "owner-discord-id", adminIds: ["admin-discord-id"], publicBaseUrl: "https://bot.example.test", defaultRunner: { githubOwner: "owner", githubRepo: "repo", workflowFile: "frierencloud-vm.yml", ref: "main" } } }));
vi.mock("../server/db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getBotAccess: vi.fn(),
  setBotAccess: vi.fn(),
  reserveCoinsForVps: vi.fn(),
  getCoinBalance: vi.fn(),
  createVmInstance: vi.fn(),
  appendVmLog: vi.fn(),
  updateVmFromCallback: vi.fn(),
  getVmForUser: vi.fn(),
  addCoins: vi.fn(),
  getBotSetting: vi.fn(),
  getUserById: vi.fn(),
  forfeitCoinsForViolation: vi.fn(),
}));
vi.mock("../server/github", () => ({ createVmLogSignature: vi.fn(() => "signed"), dispatchWorkflow: vi.fn(), validateLinuxHostname: vi.fn(value => value) }));
vi.mock("../server/githubToken", () => ({ decryptGithubToken: vi.fn(() => "github-token"), encryptGithubToken: vi.fn(), githubTokenSettingKey: "github_dispatch_token_v1" }));
vi.mock("../server/antimining", () => ({ setAntiminingWebhook: vi.fn() }));

import * as db from "../server/db";
import { dispatchWorkflow } from "../server/github";
import { handleCommand, notifyAntiminingViolation, notifyVpsCompletion } from "./service";

function createInteraction(hostname = "frieren-01") {
  return { commandName: "create", user: { id: "guest-discord-id", username: "guest", globalName: "Guest" }, options: { getString: () => hostname }, reply: vi.fn(), deferReply: vi.fn().mockResolvedValue(undefined), editReply: vi.fn().mockResolvedValue(undefined) } as any;
}

function nonAdminInteraction(commandName: "token" | "give" | "webhook" | "logs") {
  return { commandName, user: { id: "guest-discord-id" }, options: { getString: () => "token", getUser: () => null, getInteger: () => 1 }, reply: vi.fn().mockResolvedValue(undefined) } as any;
}

describe("command and coin behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getUserByOpenId).mockResolvedValue({ id: 5, openId: "discord_guest", name: "Guest" } as any);
    vi.mocked(db.getBotAccess).mockResolvedValue({ userId: 5, isAdmin: false, isBanned: false, isPartner: false } as any);
    vi.mocked(db.getBotSetting).mockResolvedValue("encrypted-token");
    vi.mocked(db.forfeitCoinsForViolation).mockResolvedValue(7);
    vi.mocked(db.createVmInstance).mockResolvedValue({ id: 8 } as any);
    vi.mocked(db.getVmForUser).mockResolvedValue({ id: 8, hostname: "frieren-01", status: "running", githubOwner: "owner", githubRepo: "repo", workflowRunId: "42", sshxUrl: null } as any);
  });

  it.each(["token", "give", "webhook", "logs"] as const)("rejects non-admin /%s access", async commandName => {
    const interaction = nonAdminInteraction(commandName);
    await handleCommand(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: "ERROR: You cannot use this command because you are not an administrator.", ephemeral: true }));
  });

  it("rejects /create when the user does not have 2 coins", async () => {
    vi.mocked(db.reserveCoinsForVps).mockResolvedValue(false);
    vi.mocked(db.getCoinBalance).mockResolvedValue(1);
    const interaction = createInteraction();
    await handleCommand(interaction);
    expect(db.reserveCoinsForVps).toHaveBeenCalledWith({ userId: 5, cost: 2 });
    expect(dispatchWorkflow).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining("need **2 coins**"));
  });

  it("debits 2 coins before dispatching a VPS workflow", async () => {
    vi.mocked(db.reserveCoinsForVps).mockResolvedValue(true);
    vi.mocked(dispatchWorkflow).mockResolvedValue({ runId: 42 });
    const interaction = createInteraction();
    await handleCommand(interaction);
    expect(db.reserveCoinsForVps).toHaveBeenCalledWith({ userId: 5, cost: 2 });
    expect(dispatchWorkflow).toHaveBeenCalled();
    expect(db.addCoins).not.toHaveBeenCalled();
  });

  it("refunds 2 coins when GitHub workflow dispatch fails", async () => {
    vi.mocked(db.reserveCoinsForVps).mockResolvedValue(true);
    vi.mocked(dispatchWorkflow).mockRejectedValue(new Error("dispatch failed"));
    const interaction = createInteraction();
    await handleCommand(interaction);
    expect(db.addCoins).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, amount: 2, reason: "vps_create_refund" }));
    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining("coins were refunded"));
  });

  it("DMs the requesting Discord user when real callback output includes SSHX", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ openId: "discord_987" } as any);
    const send = vi.fn().mockResolvedValue(undefined);
    const client = { users: { fetch: vi.fn().mockResolvedValue({ send }) } } as any;
    await notifyVpsCompletion(client, { userId: 5, id: 8, hostname: "frieren-01", status: "completed", githubOwner: "owner", githubRepo: "repo", workflowRunId: "42", sshxUrl: "https://sshx.io/example" } as any);
    expect(client.users.fetch).toHaveBeenCalledWith("987");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("ready") }));
  });

  it("forfeits coins and bans the user when Antimining confirms a violation", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ openId: "discord_987" } as any);
    const send = vi.fn().mockResolvedValue(undefined); const client = { users: { fetch: vi.fn().mockResolvedValue({ send }) } } as any;
    await notifyAntiminingViolation(client, { userId: 5, id: 8 } as any, "xmrig signature");
    expect(db.forfeitCoinsForViolation).toHaveBeenCalledWith({ userId: 5, instanceId: 8 });
    expect(db.setBotAccess).toHaveBeenCalledWith(5, { isBanned: true });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("7 coins were forfeited") }));
  });
});
