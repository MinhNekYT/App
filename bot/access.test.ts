import { describe, expect, it } from "vitest";
import { hasAdminAccess, hasOwnerAccess } from "./access";

describe("FrierenCloud administrator access", () => {
  it("matches only the configured owner ID", () => {
    expect(hasOwnerAccess("111", "111")).toBe(true);
    expect(hasOwnerAccess("111", "222")).toBe(false);
    expect(hasOwnerAccess("111", undefined)).toBe(false);
  });

  it("allows each configured administrator and rejects everyone else", () => {
    expect(hasAdminAccess("owner", "owner", ["admin-one", "admin-two"])).toBe(true);
    expect(hasAdminAccess("admin-two", "owner", ["admin-one", "admin-two"])).toBe(true);
    expect(hasAdminAccess("member", "owner", ["admin-one", "admin-two"])).toBe(false);
  });
});
