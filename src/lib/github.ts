import type { InstanceStatus } from "../types";

const API_VERSION = "2026-03-10";

type DispatchResult = {
  runId?: number;
  runUrl?: string;
};

type WorkflowSnapshot = {
  status: InstanceStatus;
  logText: string;
  sshxUrl?: string;
};

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

export function validateHostname(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function validateRepository(value: string) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function normalizeStatus(status: string | null, conclusion: string | null): InstanceStatus {
  if (status === "queued" || status === "requested" || status === "waiting") return "queued";
  if (status === "in_progress") return "provisioning";
  if (conclusion === "success") return "ready";
  if (conclusion === "cancelled" || conclusion === "skipped") return "stopped";
  return "failed";
}

function extractSshxUrl(logText: string) {
  return logText.match(/https:\/\/sshx\.io\/[A-Za-z0-9_./?=&%-]+/i)?.[0];
}

export async function dispatchProvisionWorkflow({
  token,
  repository,
  hostname,
}: {
  token: string;
  repository: string;
  hostname: string;
}): Promise<DispatchResult> {
  if (!validateHostname(hostname)) {
    throw new Error("Machine name must be a lowercase hostname: a–z, 0–9, and hyphens only.");
  }
  if (!validateRepository(repository)) {
    throw new Error("Repository must use the owner/repository format.");
  }
  if (token.trim().length < 20) {
    throw new Error("Enter a valid GitHub token with access to the selected repository.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/provision-linux.yml/dispatches`,
    {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main", inputs: { hostname } }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub Actions could not start this session (${response.status}): ${detail || response.statusText}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { workflow_run_id?: number; html_url?: string; run_url?: string }
    | null;
  return { runId: payload?.workflow_run_id, runUrl: payload?.html_url ?? payload?.run_url };
}

export async function fetchWorkflowSnapshot({
  token,
  repository,
  runId,
}: {
  token: string;
  repository: string;
  runId: number;
}): Promise<WorkflowSnapshot> {
  const runResponse = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}`, {
    headers: headers(token),
  });
  if (!runResponse.ok) throw new Error("Unable to read the workflow status with the provided token.");
  const run = (await runResponse.json()) as { status: string | null; conclusion: string | null };

  const jobsResponse = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs`, {
    headers: headers(token),
  });
  if (!jobsResponse.ok) throw new Error("Unable to read jobs for this workflow.");
  const jobs = (await jobsResponse.json()) as { jobs: Array<{ id: number }> };
  const firstJob = jobs.jobs[0];
  const fallbackLog = "Workflow was accepted. Waiting for the GitHub runner to publish setup output…";
  if (!firstJob) {
    return { status: normalizeStatus(run.status, run.conclusion), logText: fallbackLog };
  }

  const logResponse = await fetch(`https://api.github.com/repos/${repository}/actions/jobs/${firstJob.id}/logs`, {
    headers: headers(token),
  });
  const logText = logResponse.ok ? await logResponse.text() : fallbackLog;
  return {
    status: normalizeStatus(run.status, run.conclusion),
    logText,
    sshxUrl: extractSshxUrl(logText),
  };
}
