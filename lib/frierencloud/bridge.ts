import type { VMInstance } from "./types";

const bridgeUrl = process.env.EXPO_PUBLIC_BRIDGE_URL?.replace(/\/$/, "");
export const isBridgeConfigured = Boolean(bridgeUrl);

async function request<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  if (!bridgeUrl)
    throw new Error(
      "The shared API bridge has not been configured for this build.",
    );
  const response = await fetch(`${bridgeUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error ?? "Shared API request failed.");
  return payload as T;
}

export async function listSharedInstances(accessToken: string) {
  return (
    await request<{ instances: VMInstance[] }>("/api/v1/instances", accessToken)
  ).instances;
}

export async function createSharedInstance(
  accessToken: string,
  input: { hostname: string; repository: string; secondaryGithubToken: string },
) {
  return (
    await request<{ instance: VMInstance }>("/api/v1/instances", accessToken, {
      method: "POST",
      body: JSON.stringify({ ...input, consent: true }),
    })
  ).instance;
}

export async function refreshSharedInstance(accessToken: string, id: string) {
  return (
    await request<{ instance: VMInstance }>(
      `/api/v1/instances/${id}/refresh`,
      accessToken,
      { method: "POST", body: "{}" },
    )
  ).instance;
}
