import { describe, expect, it } from "vitest";
process.env.JWT_SECRET = "claim-signature-test-secret";
const { createClaimSignature, isValidClaimSignature } = await import("./claimSignature");
describe("daily claim signatures", () => {
  it("accepts only the matching claim identifier and signature", () => {
    const sig = createClaimSignature("claim-123");
    expect(isValidClaimSignature("claim-123", sig)).toBe(true);
    expect(isValidClaimSignature("claim-456", sig)).toBe(false);
  });
});
