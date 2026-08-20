import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ENV } from "./_core/env";

export const githubTokenSettingKey = "github_dispatch_token_v1";

function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required before saving a GitHub token.");
  return createHash("sha256").update(ENV.cookieSecret).digest();
}

export function encryptGithubToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptGithubToken(payload: string) {
  const bytes = Buffer.from(payload, "base64url");
  if (bytes.length < 29) throw new Error("Stored GitHub token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}
