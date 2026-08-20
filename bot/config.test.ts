import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; vi.resetModules(); });

describe("bot runtime configuration", () => {
  it("fails closed when persistent bot credentials or callback URL are absent", async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_APPLICATION_ID;
    delete process.env.OWNER_ID;
    delete process.env.BOT_PUBLIC_URL;
    const { requireBotRuntimeConfig } = await import("./config");
    expect(() => requireBotRuntimeConfig()).toThrow("Missing required bot configuration");
  });
});
