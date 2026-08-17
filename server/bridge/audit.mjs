import { appendFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const logDirectory = join(process.cwd(), "api", "logs");

function maskedUserId(value) {
  return value
    ? createHash("sha256").update(value).digest("hex").slice(0, 16)
    : null;
}

export async function audit({ event, method, path, status, userId = null }) {
  await mkdir(logDirectory, { recursive: true });
  const entry = JSON.stringify({
    at: new Date().toISOString(),
    event,
    method,
    path,
    status,
    user: maskedUserId(userId),
  });
  await appendFile(join(logDirectory, "activity.ndjson"), `${entry}\n`, "utf8");
}
