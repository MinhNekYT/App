import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const [, , buildJsonPath, outputPath] = process.argv;
if (!buildJsonPath || !outputPath) {
  console.error(
    "Usage: node scripts/download-eas-artifact.mjs <eas-json> <output-file>",
  );
  process.exit(2);
}

const payload = JSON.parse(await readFile(buildJsonPath, "utf8"));
const builds = Array.isArray(payload) ? payload : (payload.builds ?? [payload]);
const build = builds.find(
  (item) => item?.artifacts?.buildUrl || item?.artifacts?.applicationArchiveUrl,
);
const url =
  build?.artifacts?.buildUrl ?? build?.artifacts?.applicationArchiveUrl;
if (!url) {
  console.error("EAS did not return an application artifact URL.");
  process.exit(1);
}

const response = await fetch(url);
if (!response.ok || !response.body) {
  console.error(`Artifact download failed with HTTP ${response.status}.`);
  process.exit(1);
}

const data = Buffer.from(await response.arrayBuffer());
const resolvedOutputPath = resolve(outputPath);
await mkdir(dirname(resolvedOutputPath), { recursive: true });
await writeFile(resolvedOutputPath, data);
console.log(`Downloaded ${data.length} bytes to ${resolvedOutputPath}`);
