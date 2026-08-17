export function isValidHostname(value) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
}

export function isValidRepository(value) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

export function sshxUrlFromLog(value) {
  return value.match(/https:\/\/sshx\.io\/[A-Za-z0-9_./?=&%-]+/i)?.[0] ?? null;
}

export function statusFromRun(status, conclusion) {
  if (["queued", "requested", "waiting"].includes(status)) return "queued";
  if (status === "in_progress") return "provisioning";
  if (conclusion === "success") return "ready";
  if (["cancelled", "skipped"].includes(conclusion)) return "stopped";
  return "failed";
}
