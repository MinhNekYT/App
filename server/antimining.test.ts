import { describe, expect, it } from "vitest";
import { BLOCKED_MINING_PORTS, isValidAntiminingEvent, MINING_PROCESS_SIGNATURES, validateDiscordWebhookUrl } from "./antimining";

describe("Antimining webhook validation", () => {
  it("accepts HTTPS Discord webhook URLs only", () => {
    expect(validateDiscordWebhookUrl("https://discord.com/api/webhooks/123/token")).toBe("https://discord.com/api/webhooks/123/token");
    expect(() => validateDiscordWebhookUrl("https://example.com/webhook")).toThrow("Discord webhook");
    expect(() => validateDiscordWebhookUrl("http://discord.com/api/webhooks/123/token")).toThrow("Discord webhook");
  });
  it("accepts only bounded structured monitoring events", () => {
    expect(isValidAntiminingEvent("heartbeat", "healthy")).toBe(true);
    expect(isValidAntiminingEvent("command", "rm -rf /")).toBe(false);
    expect(isValidAntiminingEvent("heartbeat", "")).toBe(false);
  });
  it("contains the requested mining network ports and process signatures", () => {
    expect(BLOCKED_MINING_PORTS).toEqual(expect.arrayContaining([2222, 3333, 4444, 5555, 7777, 8888, 13333, 14444]));
    expect(MINING_PROCESS_SIGNATURES).toEqual(expect.arrayContaining(["xmrig", "cgminer", "bfgminer"]));
  });
});
