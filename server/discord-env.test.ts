import axios from "axios";
import { describe, expect, it } from "vitest";

const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

describe("Discord OAuth environment", () => {
  it.skipIf(!clientId || !clientSecret)("accepts the configured client credentials", async () => {
    const response = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
      }).toString(),
      {
        auth: { username: clientId!, password: clientSecret! },
        headers: { "content-type": "application/x-www-form-urlencoded" },
        timeout: 15_000,
        validateStatus: () => true,
      }
    );

    // An empty authorization-code request is expected to be rejected with 400.
    // Invalid client credentials are rejected as 401, so this verifies the
    // client pair without minting an application token or exposing it in a test.
    expect(response.status).toBe(400);
  }, 20_000);
});
