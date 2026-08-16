export type AppRoute = "splash" | "auth" | "language" | "main" | "create" | "logs";

export type InstanceStatus = "queued" | "provisioning" | "ready" | "failed" | "stopped";

export type VMInstance = {
  id: string;
  name: string;
  createdAt: string;
  status: InstanceStatus;
  repository: string;
  runId?: number;
  logText: string;
  sshxUrl?: string;
};
