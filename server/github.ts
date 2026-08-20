import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./_core/env";

const HOSTNAME_PATTERN = /^(?=.{1,63}$)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const SSHX_URL_PATTERN = /https:\/\/sshx\.io\/[A-Za-z0-9_~\-./?=&%#]+/i;

export function validateLinuxHostname(value: string): string {
  const hostname = value.trim();
  if (!HOSTNAME_PATTERN.test(hostname)) {
    throw new Error("Tên máy chỉ gồm chữ cái, số hoặc dấu gạch ngang; độ dài 1–63 ký tự.");
  }
  return hostname;
}

export function findSshxUrl(output: string): string | null {
  const match = output.match(SSHX_URL_PATTERN);
  return match?.[0] ?? null;
}

export function createVmLogSignature(instanceId: number): string {
  return createHmac("sha256", ENV.cookieSecret)
    .update(`frierencloud-vm-log:${instanceId}`)
    .digest("hex");
}

export function isValidVmLogSignature(instanceId: number, signature: string): boolean {
  const expected = createVmLogSignature(instanceId);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function buildWorkflowDispatchRequest(input: {
  owner: string;
  repo: string;
  workflowFile: string;
  ref: string;
  hostname: string;
  callbackUrl: string;
  antiminingUrl?: string;
  ubuntuVersion?: "22.04" | "24.04" | "26.04";
  token: string;
}) {
  return {
    url: `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(input.workflowFile)}/dispatches`,
    body: {
      ref: input.ref,
      inputs: {
        hostname: input.hostname,
        callback_url: input.callbackUrl,
        antimining_url: input.antiminingUrl ?? "",
        ubuntu_version: input.ubuntuVersion ?? "24.04",
      },
    },
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${input.token}`,
      "X-GitHub-Api-Version": "2026-03-10",
    },
  };
}

export async function dispatchWorkflow(input: {
  owner: string;
  repo: string;
  workflowFile: string;
  ref: string;
  hostname: string;
  callbackUrl: string;
  antiminingUrl?: string;
  ubuntuVersion?: "22.04" | "24.04" | "26.04";
  token: string;
}) {
  const request = buildWorkflowDispatchRequest(input);
  try {
    const response = await axios.post(request.url, request.body, {
      headers: request.headers,
      timeout: 20_000,
    });
    const payload = response.data as { id?: number; workflow_run?: { id?: number } } | undefined;
    return {
      runId: payload?.workflow_run?.id ?? payload?.id ?? null,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error("GitHub không thể kích hoạt workflow. Hãy kiểm tra repository, workflow, quyền Actions: write và token vừa nhập.");
    }
    throw error;
  }
}

export function getRequestOrigin(headers: Record<string, string | string[] | undefined>): string {
  const forwardedHost = headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : forwardedHost || headers.host;
  const forwardedProto = headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || "https";
  return `${proto}://${host}`;
}
