export type Language = "en" | "vi";

export type InstanceStatus =
  | "queued"
  | "provisioning"
  | "ready"
  | "failed"
  | "stopped";

export type VMInstance = {
  id: string;
  name: string;
  repository: string;
  createdAt: string;
  status: InstanceStatus;
  runId?: number;
  logText: string;
  sshxUrl?: string;
};
