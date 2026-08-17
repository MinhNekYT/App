import { describe, expect, it } from "vitest";

import {
  isValidHostname,
  isValidRepository,
  sshxUrlFromLog,
  statusFromRun,
} from "../server/bridge/core.mjs";

describe("FrierenCloud API bridge core", () => {
  it("accepts a safe hostname and rejects command-shaped input", () => {
    expect(isValidHostname("frieren-vm-01")).toBe(true);
    expect(isValidHostname("$(hostname)")).toBe(false);
  });

  it("requires owner/repository GitHub routes", () => {
    expect(isValidRepository("MinhNekYT/App")).toBe(true);
    expect(isValidRepository("https://github.com/MinhNekYT/App")).toBe(false);
  });

  it("extracts the first SSHX URL and normalizes GitHub states", () => {
    expect(sshxUrlFromLog("Ready at https://sshx.io/blue-sky")).toBe(
      "https://sshx.io/blue-sky",
    );
    expect(statusFromRun("in_progress", null)).toBe("provisioning");
    expect(statusFromRun("completed", "success")).toBe("ready");
  });
});
