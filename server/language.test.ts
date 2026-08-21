import { describe, expect, it } from "vitest";
import { normalizeLocale } from "./language";

describe("language preference", () => {
  it("keeps Vietnamese and safely defaults unknown values to English", () => {
    expect(normalizeLocale("vi")).toBe("vi");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("other")).toBe("en");
  });
});
