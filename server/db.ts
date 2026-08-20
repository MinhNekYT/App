import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  userGithubSettings,
  userCoinBalances,
  coinTransactions,
  botSettings,
  botUserAccess,
  coinClaimLinks,
  dailyClaimUsage,
  users,
  vmInstances,
  vmLogs,
  type VmInstance,
  type UserGithubSettings,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

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

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
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
  ubuntuVersion?: "22.04" | "24.04" | "26.04";
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

async function ensureCoinBalance(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(userCoinBalances).values({ userId, balance: 0 }).onDuplicateKeyUpdate({ set: { balance: sql`${userCoinBalances.balance}` } });
}

export async function getCoinBalance(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(userId);
  const result = await db.select().from(userCoinBalances).where(eq(userCoinBalances.userId, userId)).limit(1);
  return result[0]?.balance ?? 0;
}

function affectedRows(result: unknown) {
  const first = Array.isArray(result) ? result[0] : result;
  return Number((first as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}

export async function addCoins(input: { userId: number; actorUserId: number | null; amount: number; reason: string; instanceId?: number }) {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new Error("Coin amount must be a non-zero integer.");
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(input.userId);
  await db.transaction(async tx => {
    await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + ${input.amount}` }).where(eq(userCoinBalances.userId, input.userId));
    await tx.insert(coinTransactions).values({ userId: input.userId, actorUserId: input.actorUserId, amount: input.amount, reason: input.reason, instanceId: input.instanceId });
  });
  return getCoinBalance(input.userId);
}

export async function reserveCoinsForVps(input: { userId: number; cost: number; instanceId?: number }) {
  if (!Number.isInteger(input.cost) || input.cost < 1) throw new Error("Coin cost must be a positive integer.");
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(input.userId);
  const result = await db.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} - ${input.cost}` }).where(and(eq(userCoinBalances.userId, input.userId), sql`${userCoinBalances.balance} >= ${input.cost}`));
  if (affectedRows(result) !== 1) return false;
  await db.insert(coinTransactions).values({ userId: input.userId, actorUserId: input.userId, amount: -input.cost, reason: "vps_create", instanceId: input.instanceId });
  return true;
}

export async function setBotSetting(settingKey: string, settingValue: string) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(botSettings).values({ settingKey, settingValue }).onDuplicateKeyUpdate({ set: { settingValue, updatedAt: new Date() } });
}

export async function getBotSetting(settingKey: string) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(botSettings).where(eq(botSettings.settingKey, settingKey)).limit(1);
  return result[0]?.settingValue;
}

async function ensureAccess(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(botUserAccess).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
}

export async function getBotAccess(userId: number) {
  const db = await getDb();
  requireDatabase(db);
  await ensureAccess(userId);
  const result = await db.select().from(botUserAccess).where(eq(botUserAccess.userId, userId)).limit(1);
  return result[0]!;
}

export async function setBotAccess(userId: number, values: Partial<{ isAdmin: boolean; isBanned: boolean; isPartner: boolean }>) {
  const db = await getDb();
  requireDatabase(db);
  await ensureAccess(userId);
  await db.update(botUserAccess).set({ ...values, updatedAt: new Date() }).where(eq(botUserAccess.userId, userId));
  return getBotAccess(userId);
}

export async function createCoinClaimLink(input: { userId: number; discordName: string; avatarUrl?: string | null }) {
  const db = await getDb();
  requireDatabase(db);
  const id = nanoid(32);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(coinClaimLinks).values({ id, userId: input.userId, discordName: input.discordName.slice(0, 100), avatarUrl: input.avatarUrl ?? null, expiresAt });
  return { id, expiresAt };
}

export async function getCoinClaimLink(id: string) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(coinClaimLinks).where(eq(coinClaimLinks.id, id)).limit(1);
  return result[0];
}

export async function getDailyClaimLimit() {
  const stored = await getBotSetting("daily_claim_limit");
  const parsed = Number(stored ?? 1);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : 1;
}

export async function setDailyClaimLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Daily claim limit must be an integer from 1 to 100.");
  await setBotSetting("daily_claim_limit", String(limit));
}

export async function redeemCoinClaimLink(id: string, reward = 1) {
  const db = await getDb();
  requireDatabase(db);
  const link = await getCoinClaimLink(id);
  if (!link || link.usedAt || link.expiresAt.getTime() < Date.now()) throw new Error("This claim link is invalid, expired, or already used.");
  const access = await getBotAccess(link.userId);
  if (access.isBanned) throw new Error("Banned users cannot claim coins.");
  const claimDate = new Date().toISOString().slice(0, 10);
  const limit = await getDailyClaimLimit();
  await db.transaction(async tx => {
    const locked = await tx.update(coinClaimLinks).set({ usedAt: new Date() }).where(and(eq(coinClaimLinks.id, id), sql`${coinClaimLinks.usedAt} IS NULL`));
    if (affectedRows(locked) !== 1) throw new Error("This claim link has already been used.");
    await tx.insert(dailyClaimUsage).values({ userId: link.userId, claimDate, count: 0 }).onDuplicateKeyUpdate({ set: { count: sql`${dailyClaimUsage.count}` } });
    const usage = await tx.update(dailyClaimUsage).set({ count: sql`${dailyClaimUsage.count} + 1` }).where(and(eq(dailyClaimUsage.userId, link.userId), eq(dailyClaimUsage.claimDate, claimDate), sql`${dailyClaimUsage.count} < ${limit}`));
    if (affectedRows(usage) !== 1) throw new Error(`Daily claim limit reached (${limit}).`);
    await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + ${reward}` }).where(eq(userCoinBalances.userId, link.userId));
    await tx.insert(coinTransactions).values({ userId: link.userId, actorUserId: null, amount: reward, reason: "daily_claim" });
  });
  return getCoinBalance(link.userId);
}

export async function awardDuePartnerRewards() {
  const db = await getDb();
  requireDatabase(db);
  const month = new Date().toISOString().slice(0, 7);
  const partners = await db.select().from(botUserAccess).where(and(eq(botUserAccess.isPartner, true), sql`(${botUserAccess.lastPartnerRewardMonth} IS NULL OR ${botUserAccess.lastPartnerRewardMonth} <> ${month})`));
  for (const partner of partners) {
    await db.transaction(async tx => {
      await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + 50` }).where(eq(userCoinBalances.userId, partner.userId));
      await tx.update(botUserAccess).set({ lastPartnerRewardMonth: month }).where(eq(botUserAccess.userId, partner.userId));
      await tx.insert(coinTransactions).values({ userId: partner.userId, actorUserId: null, amount: 50, reason: "partner_monthly_reward" });
    });
  }
  return partners.length;
}
