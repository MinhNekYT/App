import type { Express, Request, Response } from "express";
import * as db from "./db";
import { findSshxUrl, isValidVmLogSignature } from "./github";

const VALID_STATUSES = new Set(["queued", "running", "failed", "completed"]);

type CallbackNotification = (instance: Awaited<ReturnType<typeof db.getVmById>>) => Promise<void> | void;

export function registerVmCallbackRoute(app: Express, onSshxReady?: CallbackNotification) {
  app.post("/api/vm-logs/:instanceId", async (req: Request, res: Response) => {
    const instanceId = Number(req.params.instanceId);
    const signature = typeof req.query.sig === "string" ? req.query.sig : "";
    const rawMessage = typeof req.body?.message === "string" ? req.body.message : "";
    const runId = typeof req.body?.runId === "string" ? req.body.runId.slice(0, 64) : undefined;
    const status = typeof req.body?.status === "string" ? req.body.status : undefined;

    if (!Number.isInteger(instanceId) || instanceId < 1 || !isValidVmLogSignature(instanceId, signature)) {
      res.status(403).json({ error: "invalid log signature" });
      return;
    }
    if (!rawMessage.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const instance = await db.getVmById(instanceId);
    if (!instance) {
      res.status(404).json({ error: "instance not found" });
      return;
    }

    const message = rawMessage.slice(0, 2_000);
    const sshxUrl = findSshxUrl(message);
    await db.appendVmLog(instanceId, message);
    await db.updateVmFromCallback(instanceId, {
      workflowRunId: runId,
      status: VALID_STATUSES.has(status ?? "") ? (status as "queued" | "running" | "failed" | "completed") : "running",
      sshxUrl,
    });

    if (sshxUrl && onSshxReady) await onSshxReady(await db.getVmById(instanceId));

    res.status(204).end();
  });
}
