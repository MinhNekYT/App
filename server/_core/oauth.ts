import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { randomBytes } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const DISCORD_STATE_COOKIE = "frierencloud_discord_state";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function callbackUri(req: Request) {
  if (ENV.discordRedirectUri) return ENV.discordRedirectUri;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol ?? "https";
  return `${proto}://${req.get("host")}/api/auth/discord/callback`;
}

function isSecure(req: Request) {
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/discord/login", (req: Request, res: Response) => {
    if (!ENV.discordClientId || !ENV.discordClientSecret) {
      res.status(503).json({ error: "Discord OAuth2 chưa được cấu hình." });
      return;
    }
    const state = randomBytes(32).toString("hex");
    res.cookie(DISCORD_STATE_COOKIE, state, {
      httpOnly: true,
      path: "/",
      maxAge: 10 * 60 * 1_000,
      sameSite: "lax",
      secure: isSecure(req),
    });
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", ENV.discordClientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", callbackUri(req));
    url.searchParams.set("scope", "identify");
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[DISCORD_STATE_COOKIE];
    if (!expectedState || state !== expectedState) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(DISCORD_STATE_COOKIE, { path: "/", secure: isSecure(req), sameSite: "lax" });

    try {
      const tokenResponse = await axios.post<{ access_token: string }>(
        "https://discord.com/api/oauth2/token",
        new URLSearchParams({
          client_id: ENV.discordClientId,
          client_secret: ENV.discordClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUri(req),
        }).toString(),
        { headers: { "content-type": "application/x-www-form-urlencoded" }, timeout: 15_000 }
      );
      const profileResponse = await axios.get<{ id: string; username: string; global_name?: string | null }>(
        "https://discord.com/api/users/@me",
        { headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }, timeout: 15_000 }
      );
      const userInfo = profileResponse.data;
      const openId = `discord_${userInfo.id}`;

      await db.upsertUser({
        openId,
        name: userInfo.global_name || userInfo.username || null,
        loginMethod: "discord",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.global_name || userInfo.username || "Discord user",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/vm-instances");
    } catch (error) {
      console.error("[Discord OAuth] Callback failed", error);
      res.status(500).json({ error: "Discord OAuth callback failed" });
    }
  });
}
