import { describe, expect, it } from "vitest";

const botToken = process.env.DISCORD_BOT_TOKEN;

describe.skipIf(!botToken)("Discord bot token", () => {
  it("authenticates against the Discord current-user endpoint", async () => {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${botToken}` },
    });
    expect(response.ok).toBe(true);
    const body = await response.json() as { bot?: boolean; id?: string };
    expect(body.bot).toBe(true);
    expect(typeof body.id).toBe("string");
  }, 15_000);
});
