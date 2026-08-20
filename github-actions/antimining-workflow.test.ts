import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const workflow = readFileSync(new URL("./frierencloud-vm.yml", import.meta.url), "utf8");
describe("Antimining workflow safety", () => {
  it("uses a named service and only powers off on watchdog failure", () => {
    expect(workflow).toContain("frierencloud-antimining.service");
    expect(workflow).toContain("OnFailure=poweroff.target");
    expect(workflow).toContain("existsSync");
    expect(workflow).not.toContain("curl | sh");
  });
});
