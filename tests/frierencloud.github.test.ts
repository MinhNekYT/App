import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dispatchProvision,
  isValidHostname,
  isValidRepository,
} from "../lib/frierencloud/github";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FrierenCloud provisioning validation", () => {
  it("accepts a safe lowercase Linux hostname", () => {
    expect(isValidHostname("frieren-dev-01")).toBe(true);
  });

  it("rejects unsafe hostname values", () => {
    expect(isValidHostname("Frieren Dev")).toBe(false);
    expect(isValidHostname("$(hostname)")).toBe(false);
  });

  it("requires an owner/repository GitHub route", () => {
    expect(isValidRepository("MinhNekYT/App")).toBe(true);
    expect(isValidRepository("https://github.com/MinhNekYT/App")).toBe(false);
  });

  it("dispatches a workflow and finds its GitHub Actions run", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflow_runs: [{ id: 481516, created_at: new Date().toISOString() }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dispatchProvision({
        token: "secondary-token",
        repository: "MinhNekYT/App",
        hostname: "frieren-dev",
      }),
    ).resolves.toBe(481516);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
