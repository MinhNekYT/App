import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import express from "express";
import { SignJWT, jwtVerify } from "jose";
import { audit } from "./audit.mjs";
import {
  isValidHostname,
  isValidRepository,
  sshxUrlFromLog,
  statusFromRun,
} from "./core.mjs";

const credentialDirectory = process.env.CREDENTIALS_DIRECTORY;
async function configValue(name) {
  if (process.env[name]) return process.env[name];
  if (credentialDirectory) {
    const credential = await readFile(
      join(credentialDirectory, name.toLowerCase()),
      "utf8",
    ).catch(() => null);
    if (credential?.trim()) return credential.trim();
  }
  throw new Error(`Missing server-only configuration: ${name}`);
}

const config = {
  port: Number(process.env.PORT ?? 8000),
  supabaseUrl: await configValue("SUPABASE_URL"),
  serviceKey: await configValue("SUPABASE_SERVICE_ROLE_KEY"),
  githubReadToken: await configValue("GITHUB_BRIDGE_TOKEN"),
  discordClientId: await configValue("DISCORD_CLIENT_ID"),
  discordClientSecret: await configValue("DISCORD_CLIENT_SECRET"),
  discordRedirectUri: await configValue("DISCORD_REDIRECT_URI"),
  mobileRedirectUri:
    process.env.MOBILE_REDIRECT_URI ?? "frierencloud://auth/discord",
  sessionSecret: await configValue("SESSION_SECRET"),
  origins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};
const sessionKey = new TextEncoder().encode(config.sessionSecret);
const supabase = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { persistSession: false },
});
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

function safeAudit(entry) {
  return audit(entry).catch(() => undefined);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || config.origins.includes(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    return req.method === "OPTIONS" ? res.status(204).end() : next();
  }
  void safeAudit({
    event: "origin_rejected",
    method: req.method,
    path: req.path,
    status: 403,
  });
  return res.status(403).json({ error: "Origin is not allowed." });
});

async function signedJwt(payload, expiresIn) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(sessionKey);
}

async function requireUser(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    void safeAudit({
      event: "session_missing",
      method: req.method,
      path: req.path,
      status: 401,
    });
    return res.status(401).json({ error: "Discord session is required." });
  }
  try {
    const { payload } = await jwtVerify(token, sessionKey);
    if (typeof payload.sub !== "string")
      throw new Error("Missing Discord user id.");
    req.user = {
      id: payload.sub,
      username: typeof payload.username === "string" ? payload.username : null,
    };
    return next();
  } catch {
    void safeAudit({
      event: "session_invalid",
      method: req.method,
      path: req.path,
      status: 401,
    });
    return res
      .status(401)
      .json({ error: "Discord session is invalid or expired." });
  }
}

function github(path, options = {}, accessToken = config.githubReadToken) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2026-03-10",
      ...options.headers,
    },
  });
}

function output(instance) {
  return {
    id: instance.id,
    name: instance.name,
    repository: instance.repository,
    createdAt: instance.created_at,
    status: instance.status,
    runId: instance.github_run_id,
    logText: instance.log_text,
    sshxUrl: instance.sshx_url,
  };
}

async function ownedInstance(id, ownerId) {
  const { data, error } = await supabase
    .from("vm_instances")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .single();
  if (error || !data) throw new Error("VM instance was not found.");
  return data;
}

async function findRun(repository, createdAt) {
  const response = await github(
    `/repos/${repository}/actions/runs?event=workflow_dispatch&per_page=20`,
  );
  if (!response.ok) return null;
  const runs = (await response.json()).workflow_runs ?? [];
  return (
    runs.find(
      (run) => Date.parse(run.created_at) >= Date.parse(createdAt) - 5000,
    )?.id ?? null
  );
}

async function refresh(instance) {
  const runId =
    instance.github_run_id ??
    (await findRun(instance.repository, instance.created_at));
  if (!runId) return instance;
  const runResponse = await github(
    `/repos/${instance.repository}/actions/runs/${runId}`,
  );
  if (!runResponse.ok)
    throw new Error("GitHub workflow status could not be loaded.");
  const run = await runResponse.json();
  const jobsResponse = await github(
    `/repos/${instance.repository}/actions/runs/${runId}/jobs`,
  );
  const job = jobsResponse.ok ? (await jobsResponse.json()).jobs?.[0] : null;
  let logText =
    instance.log_text || "GitHub Actions is provisioning the runner…";
  if (job?.id) {
    const logs = await github(
      `/repos/${instance.repository}/actions/jobs/${job.id}/logs`,
    );
    if (logs.ok) logText = await logs.text();
  }
  const update = {
    github_run_id: runId,
    status: statusFromRun(run.status, run.conclusion),
    log_text: logText,
    sshx_url: sshxUrlFromLog(logText),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("vm_instances")
    .update(update)
    .eq("id", instance.id)
    .select("*")
    .single();
  if (error) throw new Error("Shared VM data could not be updated.");
  return data;
}

const health = (_req, res) =>
  res.json({ status: "ok", service: "frierencloud-api-bridge" });
app.get("/", health);
app.get("/health", health);

app.get("/auth/discord/start", async (req, res) => {
  const appRedirect =
    typeof req.query.redirect_uri === "string"
      ? req.query.redirect_uri
      : config.mobileRedirectUri;
  if (appRedirect !== config.mobileRedirectUri)
    return res.status(400).send("Unsupported mobile redirect URI.");
  await safeAudit({
    event: "discord_login_started",
    method: "GET",
    path: "/auth/discord/start",
    status: 302,
  });
  const state = await signedJwt(
    { purpose: "discord-oauth", nonce: randomBytes(16).toString("base64url") },
    "10m",
  );
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", config.discordClientId);
  authorize.searchParams.set("redirect_uri", config.discordRedirectUri);
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "consent");
  return res.redirect(authorize.toString());
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    if (!code || !state)
      throw new Error("Missing Discord authorization response.");
    const { payload } = await jwtVerify(state, sessionKey);
    if (payload.purpose !== "discord-oauth")
      throw new Error("Invalid Discord OAuth state.");
    const basic = Buffer.from(
      `${config.discordClientId}:${config.discordClientSecret}`,
    ).toString("base64");
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.discordRedirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Discord token exchange failed.");
    const tokenData = await tokenResponse.json();
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userResponse.ok) throw new Error("Discord profile request failed.");
    const user = await userResponse.json();
    const session = await signedJwt(
      {
        sub: user.id,
        username: user.global_name ?? user.username ?? "Discord user",
      },
      "7d",
    );
    await safeAudit({
      event: "discord_login_success",
      method: "GET",
      path: "/auth/discord/callback",
      status: 302,
      userId: user.id,
    });
    const mobile = new URL(config.mobileRedirectUri);
    mobile.searchParams.set("token", session);
    return res.redirect(mobile.toString());
  } catch (error) {
    await safeAudit({
      event: "discord_login_failed",
      method: "GET",
      path: "/auth/discord/callback",
      status: 401,
    });
    return res
      .status(401)
      .send(error instanceof Error ? error.message : "Discord sign-in failed.");
  }
});

app.get("/api/v1/auth/me", requireUser, async (req, res) => {
  await safeAudit({
    event: "profile_checked",
    method: "GET",
    path: req.path,
    status: 200,
    userId: req.user.id,
  });
  return res.json({ user: req.user });
});

app.get("/api/v1/instances", requireUser, async (req, res) => {
  const { data, error } = await supabase
    .from("vm_instances")
    .select("*")
    .eq("owner_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error)
    return res
      .status(500)
      .json({ error: "Shared VM data could not be loaded." });
  await safeAudit({
    event: "instances_listed",
    method: "GET",
    path: req.path,
    status: 200,
    userId: req.user.id,
  });
  return res.json({ instances: data.map(output) });
});

app.post("/api/v1/instances", requireUser, async (req, res) => {
  const { hostname, repository, secondaryGithubToken, consent } =
    req.body ?? {};
  if (
    !isValidHostname(hostname ?? "") ||
    !isValidRepository(repository ?? "") ||
    !consent ||
    typeof secondaryGithubToken !== "string" ||
    secondaryGithubToken.length < 20
  )
    return res.status(400).json({ error: "Invalid provision request." });
  const { data: instance, error } = await supabase
    .from("vm_instances")
    .insert({
      owner_id: req.user.id,
      name: hostname,
      repository,
      status: "queued",
      log_text: "Submitting a request to GitHub Actions…",
    })
    .select("*")
    .single();
  if (error || !instance)
    return res.status(500).json({ error: "VM instance could not be created." });
  const dispatch = await github(
    `/repos/${repository}/actions/workflows/provision-linux.yml/dispatches`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main", inputs: { hostname } }),
    },
    secondaryGithubToken,
  );
  if (!dispatch.ok) {
    await supabase
      .from("vm_instances")
      .update({
        status: "failed",
        log_text: "GitHub Actions rejected the request.",
      })
      .eq("id", instance.id);
    await safeAudit({
      event: "instance_dispatch_failed",
      method: "POST",
      path: req.path,
      status: 502,
      userId: req.user.id,
    });
    return res
      .status(502)
      .json({ error: "GitHub Actions rejected the request." });
  }
  await safeAudit({
    event: "instance_created",
    method: "POST",
    path: req.path,
    status: 201,
    userId: req.user.id,
  });
  return res.status(201).json({ instance: output(instance) });
});

app.post("/api/v1/instances/:id/refresh", requireUser, async (req, res) => {
  try {
    const instance = await ownedInstance(req.params.id, req.user.id);
    const refreshed = await refresh(instance);
    await safeAudit({
      event: "instance_refreshed",
      method: "POST",
      path: req.path,
      status: 200,
      userId: req.user.id,
    });
    return res.json({ instance: output(refreshed) });
  } catch (error) {
    await safeAudit({
      event: "instance_refresh_failed",
      method: "POST",
      path: req.path,
      status: 502,
      userId: req.user.id,
    });
    return res.status(502).json({
      error:
        error instanceof Error ? error.message : "Instance refresh failed.",
    });
  }
});

app.listen(config.port, "127.0.0.1", () =>
  console.log(
    `FrierenCloud API bridge listening on http://localhost:${config.port}`,
  ),
);
