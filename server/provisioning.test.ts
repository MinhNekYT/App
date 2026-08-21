import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../bot/config", () => ({ botConfig: { publicBaseUrl: "https://bot.example.test", defaultRunner: { githubOwner: "owner", githubRepo: "repo", workflowFile: "frierencloud-vm.yml", ref: "main" } } }));
vi.mock("./db", () => ({ reserveCoinsForVps: vi.fn(), createVmInstance: vi.fn(), appendVmLog: vi.fn(), updateVmFromCallback: vi.fn(), getVmById: vi.fn(), getBotSetting: vi.fn(), addCoins: vi.fn() }));
vi.mock("./github", () => ({ createVmLogSignature: vi.fn(() => "sig"), dispatchWorkflow: vi.fn(), validateLinuxHostname: vi.fn(value => value), GITHUB_ACCOUNT_ACCESS_ERROR: "ERROR: Unable to create VPS because account access is unavailable." }));
vi.mock("./githubToken", () => ({ decryptGithubToken: vi.fn(() => "token"), githubTokenSettingKey: "github_dispatch_token_v1" }));

import * as db from "./db";
import { dispatchWorkflow, validateLinuxHostname } from "./github";
import { provisionVps } from "./provisioning";

describe("shared VPS provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.reserveCoinsForVps).mockResolvedValue(true);
    vi.mocked(db.getBotSetting).mockResolvedValue("encrypted");
    vi.mocked(db.createVmInstance).mockResolvedValue({ id: 7 } as any);
    vi.mocked(db.getVmById).mockResolvedValue({ id: 7, hostname: "frierencloud", status: "running" } as any);
    vi.mocked(dispatchWorkflow).mockResolvedValue({ runId: 42 });
  });

  it("defaults an omitted hostname to frierencloud before dispatch", async () => {
    await provisionVps({ userId: 5, ubuntuVersion: "24.04" });
    expect(validateLinuxHostname).toHaveBeenCalledWith("frierencloud");
    expect(db.reserveCoinsForVps).toHaveBeenCalledWith({ userId: 5, cost: 2 });
  });

  it("refunds coins when dispatch fails", async () => {
    vi.mocked(dispatchWorkflow).mockRejectedValue(new Error("dispatch failed"));
    await expect(provisionVps({ userId: 5, hostname: "frieren", ubuntuVersion: "22.04" })).rejects.toThrow("dispatch failed");
    expect(db.addCoins).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, amount: 2, reason: "vps_create_refund" }));
  });
});
