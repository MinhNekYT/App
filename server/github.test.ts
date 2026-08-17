import { describe, expect, it } from "vitest";
import {
  buildWorkflowDispatchRequest,
  findSshxUrl,
  validateLinuxHostname,
} from "./github";

describe("GitHub Actions VPS safeguards", () => {
  it("keeps the GitHub token out of the workflow payload", () => {
    const request = buildWorkflowDispatchRequest({
      owner: "MinhNekYT",
      repo: "WindowsGHCS",
      workflowFile: "frierencloud-vm.yml",
      ref: "main",
      hostname: "frieren-edge-01",
      callbackUrl: "https://cloud.example/api/vm-logs/9?sig=abc",
      token: "ghp_sensitive_token",
    });

    expect(JSON.stringify(request.body)).not.toContain("ghp_sensitive_token");
    expect(request.headers.Authorization).toBe("Bearer ghp_sensitive_token");
  });

  it("only accepts safe Linux hostname input", () => {
    expect(validateLinuxHostname("frieren-edge-01")).toBe("frieren-edge-01");
    expect(() => validateLinuxHostname("bad; hostname")).toThrow();
  });

  it("extracts SSHX URLs only from actual output lines", () => {
    expect(findSshxUrl("Session started: https://sshx.io/s/demo-session")).toBe("https://sshx.io/s/demo-session");
    expect(findSshxUrl("SSHX is still connecting")).toBeNull();
  });
});

