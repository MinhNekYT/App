import type { InstanceStatus } from "./types";

const apiVersion = "2026-03-10";

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": apiVersion,
  };
}

export function isValidHostname(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function isValidRepository(value: string) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function statusFromGitHub(
  status: string | null,
  conclusion: string | null,
): InstanceStatus {
  if (status === "queued" || status === "requested" || status === "waiting")
    return "queued";
  if (status === "in_progress") return "provisioning";
  if (conclusion === "success") return "ready";
  if (conclusion === "cancelled" || conclusion === "skipped") return "stopped";
  return "failed";
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function findLatestProvisionRun({
  token,
  repository,
  requestedAt,
}: {
  token: string;
  repository: string;
  requestedAt: number;
}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await delay(1_000);
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/provision-linux.yml/runs?event=workflow_dispatch&per_page=10`,
      { headers: headers(token) },
    );
    if (!response.ok) continue;
    const payload = (await response.json()) as {
      workflow_runs?: Array<{ id: number; created_at?: string }>;
    };
    const run = payload.workflow_runs?.find((candidate) => {
      const createdAt = candidate.created_at ? Date.parse(candidate.created_at) : 0;
      return Number.isFinite(createdAt) && createdAt >= requestedAt - 10_000;
    });
    if (run) return run.id;
  }
  return undefined;
}

export async function dispatchProvision({
  token,
  repository,
  hostname,
}: {
  token: string;
  repository: string;
  hostname: string;
}) {
  if (!isValidHostname(hostname)) {
    throw new Error(
      "Machine name must contain lowercase letters, numbers, and hyphens only.",
    );
  }
  if (!isValidRepository(repository)) {
    throw new Error("Repository must use the owner/repository format.");
  }
  const requestedAt = Date.now();
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
    throw new Error(
      `GitHub Actions could not start this session (${response.status}): ${detail || response.statusText}`,
    );
  }
  return findLatestProvisionRun({ token, repository, requestedAt });
}

export async function getProvisionLog({
  token,
  repository,
  runId,
}: {
  token: string;
  repository: string;
  runId: number;
}) {
  const runResponse = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}`,
    {
      headers: headers(token),
    },
  );
  if (!runResponse.ok)
    throw new Error("Unable to read the GitHub workflow status.");
  const run = (await runResponse.json()) as {
    status: string | null;
    conclusion: string | null;
  };

  const jobsResponse = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs`,
    {
      headers: headers(token),
    },
  );
  if (!jobsResponse.ok) throw new Error("Unable to read GitHub workflow jobs.");
  const jobs = (await jobsResponse.json()) as { jobs: Array<{ id: number }> };
  const job = jobs.jobs[0];
  const fallback =
    "Workflow was accepted. Waiting for the GitHub runner to publish setup output…";
  if (!job)
    return {
      status: statusFromGitHub(run.status, run.conclusion),
      logText: fallback,
    };

  const logResponse = await fetch(
    `https://api.github.com/repos/${repository}/actions/jobs/${job.id}/logs`,
    {
      headers: headers(token),
    },
  );
  const logText = logResponse.ok ? await logResponse.text() : fallback;
  return {
    status: statusFromGitHub(run.status, run.conclusion),
    logText,
    sshxUrl: logText.match(/https:\/\/sshx\.io\/[A-Za-z0-9_./?=&%-]+/i)?.[0],
  };
}
