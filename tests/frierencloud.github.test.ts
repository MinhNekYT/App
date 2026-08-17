import { describe, expect, it } from "vitest";

import { isValidHostname, isValidRepository } from "../lib/frierencloud/github";

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
});
