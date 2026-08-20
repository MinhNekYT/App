import { describe, expect, it } from "vitest";
import { validateDiscordWebhookUrl } from "./antimining";

describe("Antimining webhook validation", () => {
  it("accepts HTTPS Discord webhook URLs only", () => {
    expect(validateDiscordWebhookUrl("https://discord.com/api/webhooks/123/token")).toBe("https://discord.com/api/webhooks/123/token");
    expect(() => validateDiscordWebhookUrl("https://example.com/webhook")).toThrow("Discord webhook");
    expect(() => validateDiscordWebhookUrl("http://discord.com/api/webhooks/123/token")).toThrow("Discord webhook");
  });
});
