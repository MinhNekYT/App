import { describe, expect, it } from "vitest";

import { validateHostname, validateRepository } from "../src/lib/github";

describe("FrierenCloud GitHub session validation", () => {
  it("accepts a valid lowercase Linux hostname", () => {
    expect(validateHostname("frieren-dev-01")).toBe(true);
  });

  it("rejects unsafe hostname characters and uppercase letters", () => {
    expect(validateHostname("Frieren Dev")).toBe(false);
    expect(validateHostname("$(hostname)")).toBe(false);
  });

  it("requires a repository route in owner/repository format", () => {
    expect(validateRepository("MinhNekYT/App")).toBe(true);
    expect(validateRepository("https://github.com/MinhNekYT/App")).toBe(false);
  });

  it("documents all build-time Supabase Repository Secrets", async () => {
    const securityPolicy = await import("node:fs/promises").then((fs) => fs.readFile("SECURITY.md", "utf8"));
    expect(securityPolicy).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(securityPolicy).toContain("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(securityPolicy).toContain("EXPO_TOKEN");
  });
});
