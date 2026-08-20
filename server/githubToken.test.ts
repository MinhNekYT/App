import { describe, expect, it } from "vitest";

process.env.JWT_SECRET = "frierencloud-test-signing-key";
const { decryptGithubToken, encryptGithubToken } = await import("./githubToken");

describe("GitHub token encryption", () => {
  it("round-trips token data without retaining readable plaintext", () => {
    const token = "github_pat_example_token_for_tests";
    const encrypted = encryptGithubToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptGithubToken(encrypted)).toBe(token);
  });
  it("rejects malformed encrypted values", () => expect(() => decryptGithubToken("invalid")).toThrow());
});
