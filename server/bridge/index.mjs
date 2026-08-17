import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import express from "express";
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
  origins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
};
const supabase = createClient(config.supabaseUrl, config.serviceKey, {
  auth: { persistSession: false },
});
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

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
  return res.status(403).json({ error: "Origin is not allowed." });
});

async function requireUser(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token)
    return res.status(401).json({ error: "Supabase session is required." });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ error: "Invalid Supabase session." });
  req.user = data.user;
  return next();
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
  return res.json({ instances: data.map(output) });
});

app.post("/api/v1/instances", requireUser, async (req, res) => {
  const { hostname, repository, secondaryGithubToken, consent } =
    req.body ?? {};
  if (!isValidHostname(hostname ?? ""))
    return res.status(400).json({ error: "Invalid hostname." });
  if (!isValidRepository(repository ?? ""))
    return res.status(400).json({ error: "Invalid repository." });
  if (
    !consent ||
    typeof secondaryGithubToken !== "string" ||
    secondaryGithubToken.length < 20
  )
    return res
      .status(400)
      .json({ error: "Secondary GitHub token consent is required." });
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
    return res
      .status(502)
      .json({ error: "GitHub Actions rejected the request." });
  }
  return res.status(201).json({ instance: output(instance) });
});

app.post("/api/v1/instances/:id/refresh", requireUser, async (req, res) => {
  try {
    const instance = await ownedInstance(req.params.id, req.user.id);
    return res.json({ instance: output(await refresh(instance)) });
  } catch (error) {
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
