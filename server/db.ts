import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  userGithubSettings,
  users,
  vmInstances,
  vmLogs,
  type VmInstance,
  type UserGithubSettings,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function requireDatabase<T>(db: T): asserts db is NonNullable<T> {
  if (!db) throw new Error("Cơ sở dữ liệu chưa sẵn sàng.");
}

export async function listVmInstances(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  return db.select().from(vmInstances).where(eq(vmInstances.userId, userId)).orderBy(desc(vmInstances.updatedAt));
}

export async function getVmForUser(instanceId: number, userId: number) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(vmInstances).where(and(eq(vmInstances.id, instanceId), eq(vmInstances.userId, userId))).limit(1);
  return result[0];
}

export async function getVmById(instanceId: number) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(vmInstances).where(eq(vmInstances.id, instanceId)).limit(1);
  return result[0];
}

export async function getVmLogs(instanceId: number) {
  const db = await getDb();
  requireDatabase(db);
  return db.select().from(vmLogs).where(eq(vmLogs.instanceId, instanceId)).orderBy(vmLogs.id);
}

export async function createVmInstance(input: {
  userId: number;
  hostname: string;
  githubOwner: string;
  githubRepo: string;
  workflowFile: string;
}): Promise<VmInstance> {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.insert(vmInstances).values(input);
  const instanceId = Number(result[0].insertId);
  const instance = await getVmById(instanceId);
  if (!instance) throw new Error("Không thể tạo VM instance.");
  return instance;
}

export async function appendVmLog(instanceId: number, message: string) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(vmLogs).values({ instanceId, message });
}

export async function updateVmFromCallback(
  instanceId: number,
  values: { workflowRunId?: string; status?: "queued" | "running" | "failed" | "completed"; sshxUrl?: string | null }
) {
  const db = await getDb();
  requireDatabase(db);
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (values.workflowRunId) updateSet.workflowRunId = values.workflowRunId;
  if (values.status) updateSet.status = values.status;
  if (values.sshxUrl) updateSet.sshxUrl = values.sshxUrl;
  await db.update(vmInstances).set(updateSet).where(eq(vmInstances.id, instanceId));
}

export async function markVmDispatchFailed(instanceId: number, message: string) {
  await appendVmLog(instanceId, message);
  await updateVmFromCallback(instanceId, { status: "failed" });
}

export async function getUserGithubSettings(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(userGithubSettings).where(eq(userGithubSettings.userId, userId)).limit(1);
  return result[0];
}

export async function saveUserGithubSettings(
  userId: number,
  settings: Omit<UserGithubSettings, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(userGithubSettings).values({ userId, ...settings }).onDuplicateKeyUpdate({
    set: { ...settings, updatedAt: new Date() },
  });
  return getUserGithubSettings(userId);
}
