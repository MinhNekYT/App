import { describe, expect, it } from "vitest";
import { isValidAntiminingEvent, validateDiscordWebhookUrl } from "./antimining";

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
});
