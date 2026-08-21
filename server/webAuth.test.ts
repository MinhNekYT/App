import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import * as db from "./db";
import { createWebSession, parseWebSession } from "./webAuth";
import { registerWebAuthRoutes } from "./webAuth";

const secret = "test-web-session-secret";

async function requestFrom(app: express.Express, path: string, cookie?: string) {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, { headers: cookie ? { Cookie: cookie } : undefined });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

afterEach(() => vi.restoreAllMocks());

describe("FrierenCloud web sessions", () => {
  it("accepts a signed, active Discord session", () => {
    const token = createWebSession({ userId: 12, discordId: "987654321", name: "Frieren", avatarUrl: "https://cdn.example/avatar.png", expiresAt: Date.now() + 60_000 }, secret);
    expect(parseWebSession(token, secret)).toMatchObject({ userId: 12, discordId: "987654321", name: "Frieren" });
  });

  it("rejects tampered and expired Discord sessions", () => {
    const token = createWebSession({ userId: 12, discordId: "987654321", name: "Frieren", avatarUrl: "https://cdn.example/avatar.png", expiresAt: Date.now() + 60_000 }, secret);
    const expired = createWebSession({ userId: 12, discordId: "987654321", name: "Frieren", avatarUrl: "https://cdn.example/avatar.png", expiresAt: Date.now() - 1 }, secret);
    expect(parseWebSession(`${token}tampered`, secret)).toBeNull();
    expect(parseWebSession(expired, secret)).toBeNull();
  });

  it("uses the supplied Discord OAuth configuration in the login endpoint without exposing the client secret", async () => {
    expect(process.env.DISCORD_CLIENT_ID).toBeTruthy();
    expect(process.env.DISCORD_CLIENT_SECRET).toBeTruthy();
    expect(process.env.DISCORD_REDIRECT_URI).toBeTruthy();
    const app = express();
    registerWebAuthRoutes(app);
    const server = app.listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not start");
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/auth/discord`, { redirect: "manual" });
      const location = new URL(response.headers.get("location") ?? "");
      expect(response.status).toBe(302);
      expect(location.hostname).toBe("discord.com");
      expect(location.searchParams.get("client_id")).toBe(process.env.DISCORD_CLIENT_ID);
      expect(location.searchParams.get("redirect_uri")).toBe(process.env.DISCORD_REDIRECT_URI);
      expect(location.searchParams.has("client_secret")).toBe(false);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("rejects dashboard API calls without a valid signed Discord session", async () => {
    const app = express();
    registerWebAuthRoutes(app);
    const balance = vi.spyOn(db, "getCoinBalance");
    const response = await requestFrom(app, "/api/web/dashboard");
    expect(response.status).toBe(401);
    expect(balance).not.toHaveBeenCalled();
  });

  it("loads coins and VM records only for the Discord user represented by the signed session", async () => {
    const app = express();
    registerWebAuthRoutes(app);
    vi.spyOn(db, "getCoinBalance").mockResolvedValue(47);
    vi.spyOn(db, "listVmInstances").mockResolvedValue([{ id: 3, hostname: "frieren-03", ubuntuVersion: "24.04", status: "running", sshxUrl: null, createdAt: new Date() }] as any);
    const session = createWebSession({ userId: 12, discordId: "987654321", name: "Frieren", avatarUrl: "https://cdn.example/avatar.png", expiresAt: Date.now() + 60_000 });
    const response = await requestFrom(app, "/api/web/dashboard", `frierencloud_web_session=${session}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ coins: 47, instances: [{ id: 3, hostname: "frieren-03" }] });
    expect(db.getCoinBalance).toHaveBeenCalledWith(12);
    expect(db.listVmInstances).toHaveBeenCalledWith(12);
  });

  it("does not return a VPS unless it belongs to the signed Discord user", async () => {
    const app = express();
    registerWebAuthRoutes(app);
    vi.spyOn(db, "getVmForUser").mockResolvedValue(undefined);
    const session = createWebSession({ userId: 12, discordId: "987654321", name: "Frieren", avatarUrl: "https://cdn.example/avatar.png", expiresAt: Date.now() + 60_000 });
    const response = await requestFrom(app, "/api/web/vms/99", `frierencloud_web_session=${session}`);
    expect(response.status).toBe(404);
    expect(db.getVmForUser).toHaveBeenCalledWith(99, 12);
  });
});
