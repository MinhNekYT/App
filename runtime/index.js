// bot/index.ts
import express2 from "express";
import path from "node:path";

// bot/service.ts
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits } from "discord.js";
import { randomUUID } from "node:crypto";

// server/db.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var vmStatusValues = ["queued", "running", "failed", "completed"];
var vmInstances = mysqlTable("vmInstances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  hostname: varchar("hostname", { length: 63 }).notNull(),
  status: mysqlEnum("status", vmStatusValues).default("queued").notNull(),
  githubOwner: varchar("githubOwner", { length: 100 }).notNull(),
  githubRepo: varchar("githubRepo", { length: 100 }).notNull(),
  workflowFile: varchar("workflowFile", { length: 255 }).notNull(),
  workflowRunId: varchar("workflowRunId", { length: 64 }),
  ubuntuVersion: varchar("ubuntuVersion", { length: 8 }).notNull().default("24.04"),
  sshxUrl: text("sshxUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vmLogs = mysqlTable("vmLogs", {
  id: int("id").autoincrement().primaryKey(),
  instanceId: int("instanceId").notNull().references(() => vmInstances.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var userGithubSettings = mysqlTable("userGithubSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  githubOwner: varchar("githubOwner", { length: 100 }).notNull(),
  githubRepo: varchar("githubRepo", { length: 100 }).notNull(),
  workflowFile: varchar("workflowFile", { length: 255 }).notNull().default("frierencloud-vm.yml"),
  ref: varchar("ref", { length: 100 }).notNull().default("main"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userCoinBalances = mysqlTable("userCoinBalances", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: int("balance").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var coinTransactions = mysqlTable("coinTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  amount: int("amount").notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  instanceId: int("instanceId").references(() => vmInstances.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var botSettings = mysqlTable("botSettings", {
  settingKey: varchar("settingKey", { length: 80 }).primaryKey(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var botUserAccess = mysqlTable("botUserAccess", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  isAdmin: boolean("isAdmin").notNull().default(false),
  isBanned: boolean("isBanned").notNull().default(false),
  isPartner: boolean("isPartner").notNull().default(false),
  lastPartnerRewardMonth: varchar("lastPartnerRewardMonth", { length: 7 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userPreferences = mysqlTable("userPreferences", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  locale: mysqlEnum("locale", ["en", "vi"]).notNull().default("en"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userContributionTokens = mysqlTable("userContributionTokens", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  encryptedToken: text("encryptedToken").notNull(),
  confirmedAt: timestamp("confirmedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var coinClaimLinks = mysqlTable("coinClaimLinks", {
  id: varchar("id", { length: 48 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  discordName: varchar("discordName", { length: 100 }).notNull(),
  avatarUrl: text("avatarUrl"),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var dailyClaimUsage = mysqlTable("dailyClaimUsage", {
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimDate: varchar("claimDate", { length: 10 }).notNull(),
  count: int("count").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => ({ pk: primaryKey({ columns: [table.userId, table.claimDate] }) }));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  discordClientId: process.env.DISCORD_CLIENT_ID ?? "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI ?? ""
};

// server/db.ts
import { nanoid } from "nanoid";

// server/language.ts
function normalizeLocale(value) {
  return value === "vi" ? "vi" : "en";
}
var copy = {
  en: {
    banned: "ERROR: You have been banned by an admin. If you think this is a misunderstanding, please contact any admin via DMS.",
    notAdmin: "ERROR: You cannot use this command because you are not an administrator.",
    tokenStored: "GitHub token stored securely.",
    contributionStored: "Your contribution token was stored securely. An administrator can credit contribution coins after review.",
    languageSaved: "Language saved. FrierenCloud bot and web now use English for your account.",
    noContribution: "Confirm a contribution token first with `/token contribute`."
  },
  vi: {
    banned: "L\u1ED6I: B\u1EA1n \u0111\xE3 b\u1ECB admin c\u1EA5m. N\u1EBFu cho r\u1EB1ng \u0111\xE2y l\xE0 nh\u1EA7m l\u1EABn, h\xE3y li\xEAn h\u1EC7 admin qua DM.",
    notAdmin: "L\u1ED6I: B\u1EA1n kh\xF4ng th\u1EC3 d\xF9ng l\u1EC7nh n\xE0y v\xEC kh\xF4ng ph\u1EA3i qu\u1EA3n tr\u1ECB vi\xEAn.",
    tokenStored: "GitHub token \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u an to\xE0n.",
    contributionStored: "Contribution token c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u an to\xE0n. Admin c\xF3 th\u1EC3 c\u1ED9ng xu \u0111\xF3ng g\xF3p sau khi x\xE9t duy\u1EC7t.",
    languageSaved: "\u0110\xE3 l\u01B0u ng\xF4n ng\u1EEF. Bot v\xE0 web FrierenCloud hi\u1EC7n d\xF9ng ti\u1EBFng Vi\u1EC7t cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.",
    noContribution: "H\xE3y x\xE1c nh\u1EADn contribution token tr\u01B0\u1EDBc b\u1EB1ng `/token contribute`."
  }
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserById(userId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}
function requireDatabase(db) {
  if (!db) throw new Error("C\u01A1 s\u1EDF d\u1EEF li\u1EC7u ch\u01B0a s\u1EB5n s\xE0ng.");
}
async function listVmInstances(userId) {
  const db = await getDb();
  requireDatabase(db);
  return db.select().from(vmInstances).where(eq(vmInstances.userId, userId)).orderBy(desc(vmInstances.updatedAt));
}
async function getVmForUser(instanceId, userId) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(vmInstances).where(and(eq(vmInstances.id, instanceId), eq(vmInstances.userId, userId))).limit(1);
  return result[0];
}
async function getVmById(instanceId) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(vmInstances).where(eq(vmInstances.id, instanceId)).limit(1);
  return result[0];
}
async function getVmLogs(instanceId) {
  const db = await getDb();
  requireDatabase(db);
  return db.select().from(vmLogs).where(eq(vmLogs.instanceId, instanceId)).orderBy(vmLogs.id);
}
async function createVmInstance(input) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.insert(vmInstances).values(input);
  const instanceId = Number(result[0].insertId);
  const instance = await getVmById(instanceId);
  if (!instance) throw new Error("Kh\xF4ng th\u1EC3 t\u1EA1o VM instance.");
  return instance;
}
async function appendVmLog(instanceId, message) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(vmLogs).values({ instanceId, message });
}
async function updateVmFromCallback(instanceId, values) {
  const db = await getDb();
  requireDatabase(db);
  const updateSet = { updatedAt: /* @__PURE__ */ new Date() };
  if (values.workflowRunId) updateSet.workflowRunId = values.workflowRunId;
  if (values.status) updateSet.status = values.status;
  if (values.sshxUrl) updateSet.sshxUrl = values.sshxUrl;
  await db.update(vmInstances).set(updateSet).where(eq(vmInstances.id, instanceId));
}
async function ensureCoinBalance(userId) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(userCoinBalances).values({ userId, balance: 0 }).onDuplicateKeyUpdate({ set: { balance: sql`${userCoinBalances.balance}` } });
}
async function getCoinBalance(userId) {
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(userId);
  const result = await db.select().from(userCoinBalances).where(eq(userCoinBalances.userId, userId)).limit(1);
  return result[0]?.balance ?? 0;
}
function affectedRows(result) {
  const first = Array.isArray(result) ? result[0] : result;
  return Number(first?.affectedRows ?? 0);
}
async function addCoins(input) {
  if (!Number.isInteger(input.amount) || input.amount === 0) throw new Error("Coin amount must be a non-zero integer.");
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(input.userId);
  await db.transaction(async (tx) => {
    await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + ${input.amount}` }).where(eq(userCoinBalances.userId, input.userId));
    await tx.insert(coinTransactions).values({ userId: input.userId, actorUserId: input.actorUserId, amount: input.amount, reason: input.reason, instanceId: input.instanceId });
  });
  return getCoinBalance(input.userId);
}
async function forfeitCoinsForViolation(input) {
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(input.userId);
  let forfeited = 0;
  await db.transaction(async (tx) => {
    const result = await tx.select().from(userCoinBalances).where(eq(userCoinBalances.userId, input.userId)).limit(1);
    forfeited = result[0]?.balance ?? 0;
    if (forfeited <= 0) return;
    await tx.update(userCoinBalances).set({ balance: 0 }).where(eq(userCoinBalances.userId, input.userId));
    await tx.insert(coinTransactions).values({ userId: input.userId, actorUserId: null, amount: -forfeited, reason: "antimining_forfeit", instanceId: input.instanceId });
  });
  return forfeited;
}
async function reserveCoinsForVps(input) {
  if (!Number.isInteger(input.cost) || input.cost < 1) throw new Error("Coin cost must be a positive integer.");
  const db = await getDb();
  requireDatabase(db);
  await ensureCoinBalance(input.userId);
  const result = await db.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} - ${input.cost}` }).where(and(eq(userCoinBalances.userId, input.userId), sql`${userCoinBalances.balance} >= ${input.cost}`));
  if (affectedRows(result) !== 1) return false;
  await db.insert(coinTransactions).values({ userId: input.userId, actorUserId: input.userId, amount: -input.cost, reason: "vps_create", instanceId: input.instanceId });
  return true;
}
async function setBotSetting(settingKey, settingValue) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(botSettings).values({ settingKey, settingValue }).onDuplicateKeyUpdate({ set: { settingValue, updatedAt: /* @__PURE__ */ new Date() } });
}
async function getBotSetting(settingKey) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(botSettings).where(eq(botSettings.settingKey, settingKey)).limit(1);
  return result[0]?.settingValue;
}
async function ensureAccess(userId) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(botUserAccess).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
}
async function getBotAccess(userId) {
  const db = await getDb();
  requireDatabase(db);
  await ensureAccess(userId);
  const result = await db.select().from(botUserAccess).where(eq(botUserAccess.userId, userId)).limit(1);
  return result[0];
}
async function setBotAccess(userId, values) {
  const db = await getDb();
  requireDatabase(db);
  await ensureAccess(userId);
  await db.update(botUserAccess).set({ ...values, updatedAt: /* @__PURE__ */ new Date() }).where(eq(botUserAccess.userId, userId));
  return getBotAccess(userId);
}
async function getUserLocale(userId) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return normalizeLocale(result[0]?.locale);
}
async function setUserLocale(userId, locale) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(userPreferences).values({ userId, locale }).onDuplicateKeyUpdate({ set: { locale, updatedAt: /* @__PURE__ */ new Date() } });
  return locale;
}
async function saveContributionToken(userId, encryptedToken) {
  const db = await getDb();
  requireDatabase(db);
  await db.insert(userContributionTokens).values({ userId, encryptedToken, confirmedAt: /* @__PURE__ */ new Date() }).onDuplicateKeyUpdate({ set: { encryptedToken, confirmedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() } });
}
async function hasContributionToken(userId) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select({ userId: userContributionTokens.userId }).from(userContributionTokens).where(eq(userContributionTokens.userId, userId)).limit(1);
  return Boolean(result[0]);
}
async function createCoinClaimLink(input) {
  const db = await getDb();
  requireDatabase(db);
  const id = nanoid(32);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
  await db.insert(coinClaimLinks).values({ id, userId: input.userId, discordName: input.discordName.slice(0, 100), avatarUrl: input.avatarUrl ?? null, expiresAt });
  return { id, expiresAt };
}
async function getCoinClaimLink(id) {
  const db = await getDb();
  requireDatabase(db);
  const result = await db.select().from(coinClaimLinks).where(eq(coinClaimLinks.id, id)).limit(1);
  return result[0];
}
async function getDailyClaimLimit() {
  const stored = await getBotSetting("daily_claim_limit");
  const parsed = Number(stored ?? 1);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : 1;
}
async function setDailyClaimLimit(limit) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Daily claim limit must be an integer from 1 to 100.");
  await setBotSetting("daily_claim_limit", String(limit));
}
async function redeemCoinClaimLink(id, reward = 1) {
  const db = await getDb();
  requireDatabase(db);
  const link = await getCoinClaimLink(id);
  if (!link || link.usedAt || link.expiresAt.getTime() < Date.now()) throw new Error("This claim link is invalid, expired, or already used.");
  const access = await getBotAccess(link.userId);
  if (access.isBanned) throw new Error("Banned users cannot claim coins.");
  const claimDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const limit = await getDailyClaimLimit();
  await db.transaction(async (tx) => {
    const locked = await tx.update(coinClaimLinks).set({ usedAt: /* @__PURE__ */ new Date() }).where(and(eq(coinClaimLinks.id, id), sql`${coinClaimLinks.usedAt} IS NULL`));
    if (affectedRows(locked) !== 1) throw new Error("This claim link has already been used.");
    await tx.insert(dailyClaimUsage).values({ userId: link.userId, claimDate, count: 0 }).onDuplicateKeyUpdate({ set: { count: sql`${dailyClaimUsage.count}` } });
    const usage = await tx.update(dailyClaimUsage).set({ count: sql`${dailyClaimUsage.count} + 1` }).where(and(eq(dailyClaimUsage.userId, link.userId), eq(dailyClaimUsage.claimDate, claimDate), sql`${dailyClaimUsage.count} < ${limit}`));
    if (affectedRows(usage) !== 1) throw new Error(`Daily claim limit reached (${limit}).`);
    await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + ${reward}` }).where(eq(userCoinBalances.userId, link.userId));
    await tx.insert(coinTransactions).values({ userId: link.userId, actorUserId: null, amount: reward, reason: "daily_claim" });
  });
  return getCoinBalance(link.userId);
}
async function getDailyClaimUsageToday(userId) {
  const db = await getDb();
  requireDatabase(db);
  const claimDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = await db.select().from(dailyClaimUsage).where(and(eq(dailyClaimUsage.userId, userId), eq(dailyClaimUsage.claimDate, claimDate))).limit(1);
  return result[0]?.count ?? 0;
}
async function awardDuePartnerRewards() {
  const db = await getDb();
  requireDatabase(db);
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const partners = await db.select().from(botUserAccess).where(and(eq(botUserAccess.isPartner, true), sql`(${botUserAccess.lastPartnerRewardMonth} IS NULL OR ${botUserAccess.lastPartnerRewardMonth} <> ${month})`));
  for (const partner of partners) {
    await db.transaction(async (tx) => {
      await tx.update(userCoinBalances).set({ balance: sql`${userCoinBalances.balance} + 50` }).where(eq(userCoinBalances.userId, partner.userId));
      await tx.update(botUserAccess).set({ lastPartnerRewardMonth: month }).where(eq(botUserAccess.userId, partner.userId));
      await tx.insert(coinTransactions).values({ userId: partner.userId, actorUserId: null, amount: 50, reason: "partner_monthly_reward" });
    });
  }
  return partners.length;
}

// server/github.ts
import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
var HOSTNAME_PATTERN = /^(?=.{1,63}$)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
var SSHX_URL_PATTERN = /https:\/\/sshx\.io\/[A-Za-z0-9_~\-./?=&%#]+/i;
var GITHUB_ACCOUNT_ACCESS_ERROR = "ERROR: Unable to create VPS because account access is unavailable.";
function validateLinuxHostname(value) {
  const hostname = value.trim();
  if (!HOSTNAME_PATTERN.test(hostname)) {
    throw new Error("T\xEAn m\xE1y ch\u1EC9 g\u1ED3m ch\u1EEF c\xE1i, s\u1ED1 ho\u1EB7c d\u1EA5u g\u1EA1ch ngang; \u0111\u1ED9 d\xE0i 1\u201363 k\xFD t\u1EF1.");
  }
  return hostname;
}
function findSshxUrl(output) {
  const match = output.match(SSHX_URL_PATTERN);
  return match?.[0] ?? null;
}
function createVmLogSignature(instanceId) {
  return createHmac("sha256", ENV.cookieSecret).update(`frierencloud-vm-log:${instanceId}`).digest("hex");
}
function isValidVmLogSignature(instanceId, signature) {
  const expected = createVmLogSignature(instanceId);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function buildWorkflowDispatchRequest(input) {
  return {
    url: `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(input.workflowFile)}/dispatches`,
    body: {
      ref: input.ref,
      inputs: {
        hostname: input.hostname,
        callback_url: input.callbackUrl,
        antimining_url: input.antiminingUrl ?? "",
        ubuntu_version: input.ubuntuVersion ?? "24.04"
      }
    },
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${input.token}`,
      "X-GitHub-Api-Version": "2026-03-10"
    }
  };
}
async function dispatchWorkflow(input) {
  const request = buildWorkflowDispatchRequest(input);
  try {
    const response = await axios.post(request.url, request.body, {
      headers: request.headers,
      timeout: 2e4
    });
    const payload = response.data;
    return {
      runId: payload?.workflow_run?.id ?? payload?.id ?? null
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403 || status === 404) throw new Error(GITHUB_ACCOUNT_ACCESS_ERROR);
      throw new Error("GitHub could not dispatch the workflow. Please try again later.");
    }
    throw error;
  }
}

// server/githubToken.ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
var githubTokenSettingKey = "github_dispatch_token_v1";
function encryptionKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required before saving a GitHub token.");
  return createHash("sha256").update(ENV.cookieSecret).digest();
}
function encryptGithubToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function decryptGithubToken(payload) {
  const bytes = Buffer.from(payload, "base64url");
  if (bytes.length < 29) throw new Error("Stored GitHub token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}

// server/claimSignature.ts
import { createHmac as createHmac2, timingSafeEqual as timingSafeEqual2 } from "crypto";
function createClaimSignature(id) {
  return createHmac2("sha256", ENV.cookieSecret).update(`frierencloud-claim:${id}`).digest("hex");
}
function isValidClaimSignature(id, signature) {
  const expected = createClaimSignature(id);
  return signature.length === expected.length && timingSafeEqual2(Buffer.from(signature), Buffer.from(expected));
}

// server/antimining.ts
import axios2 from "axios";
var antiminingWebhookSettingKey = "antimining_discord_webhook";
function isValidAntiminingEvent(event, message) {
  return ["installed", "heartbeat", "terminated", "alert", "violation"].includes(String(event)) && typeof message === "string" && message.length > 0 && message.length <= 1e3;
}
function validateDiscordWebhookUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || !["discord.com", "discordapp.com"].includes(url.hostname) || !url.pathname.startsWith("/api/webhooks/")) {
    throw new Error("Webhook URL must be a valid HTTPS Discord webhook URL.");
  }
  return url.toString();
}
async function setAntiminingWebhook(url) {
  await setBotSetting(antiminingWebhookSettingKey, encryptGithubToken(validateDiscordWebhookUrl(url)));
}
async function sendAntiminingWebhook(input) {
  const encrypted = await getBotSetting(antiminingWebhookSettingKey);
  if (!encrypted) return false;
  try {
    await axios2.post(decryptGithubToken(encrypted), { username: "FrierenCloud Antimining", embeds: [{ color: input.event === "terminated" ? 15680580 : 2282478, title: `Antimining \xB7 ${input.event}`, description: input.message.slice(0, 1e3), fields: [{ name: "VPS", value: `#${input.instanceId} \xB7 ${input.hostname}` }] }] }, { timeout: 8e3 });
    return true;
  } catch {
    return false;
  }
}

// server/audit.ts
var auditLogChannelSettingKey = "discord_audit_log_channel";
var SECRET_OPTION_NAMES = /* @__PURE__ */ new Set(["github_token", "webhook_url", "sig", "signature", "token", "password"]);
function redactCommandOptions(options) {
  return options.map((option) => ({
    name: option.name,
    value: SECRET_OPTION_NAMES.has(option.name) ? "[redacted]" : option.value === void 0 ? void 0 : String(option.value).slice(0, 120),
    options: option.options ? redactCommandOptions(option.options) : void 0
  }));
}
function formatAuditCommand(input) {
  const serialized = redactCommandOptions(input.options).map((option) => {
    const child = option.options?.map((nested) => `${nested.name}=${nested.value ?? ""}`).join(" ");
    return `${option.name}${option.value !== void 0 ? `=${option.value}` : ""}${child ? ` ${child}` : ""}`;
  }).join(" ");
  return `Command audit \xB7 <@${input.userId}> (${input.userTag}) ran /${input.commandName}${serialized ? ` ${serialized}` : ""}`;
}

// bot/config.ts
import "dotenv/config";

// bot/avatar.ts
var FRIERENCLOUD_AVATAR_URL = "/manus-storage/frierencloud-bot-avatar_d0bb8fd1.png";

// bot/config.ts
function optional(name) {
  const value = process.env[name]?.trim();
  return value || void 0;
}
function list(name) {
  return (process.env[name] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}
var botConfig = {
  token: optional("DISCORD_BOT_TOKEN"),
  applicationId: optional("DISCORD_APPLICATION_ID"),
  guildId: optional("DISCORD_GUILD_ID"),
  ownerId: optional("OWNER_ID"),
  adminIds: list("ADMIN_IDS"),
  publicBaseUrl: (optional("BASE_URL") ?? optional("BOT_PUBLIC_URL"))?.replace(/\/+$/, ""),
  avatarUrl: optional("BOT_AVATAR_URL") ?? FRIERENCLOUD_AVATAR_URL,
  defaultRunner: {
    githubOwner: optional("GITHUB_RUNNER_OWNER"),
    githubRepo: optional("GITHUB_RUNNER_REPO"),
    workflowFile: optional("GITHUB_WORKFLOW_FILE") ?? "frierencloud-vm.yml",
    ref: optional("GITHUB_WORKFLOW_REF") ?? "main"
  }
};
function requireBotRuntimeConfig() {
  const missing = [["DISCORD_BOT_TOKEN", botConfig.token], ["DISCORD_APPLICATION_ID", botConfig.applicationId], ["OWNER_ID", botConfig.ownerId], ["BASE_URL", botConfig.publicBaseUrl]].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required bot configuration: ${missing.join(", ")}`);
}

// server/provisioning.ts
var VPS_COST = 2;
function runner() {
  const value = botConfig.defaultRunner;
  if (!value.githubOwner || !value.githubRepo) throw new Error("GitHub runner is not configured.");
  return value;
}
async function dispatchToken() {
  const stored = await getBotSetting(githubTokenSettingKey);
  if (!stored) throw new Error(GITHUB_ACCOUNT_ACCESS_ERROR);
  try {
    return decryptGithubToken(stored);
  } catch {
    throw new Error(GITHUB_ACCOUNT_ACCESS_ERROR);
  }
}
async function provisionVps(input) {
  const hostname = validateLinuxHostname(input.hostname?.trim() || "frierencloud");
  if (!await reserveCoinsForVps({ userId: input.userId, cost: VPS_COST })) throw new Error(`You need ${VPS_COST} coins to create a VPS.`);
  try {
    const configuredRunner = runner();
    const vm = await createVmInstance({ userId: input.userId, hostname, ubuntuVersion: input.ubuntuVersion, githubOwner: configuredRunner.githubOwner, githubRepo: configuredRunner.githubRepo, workflowFile: configuredRunner.workflowFile });
    await appendVmLog(vm.id, `Provisioning requested for hostname ${hostname}.`);
    const callbackUrl = `${botConfig.publicBaseUrl}/api/vm-logs/${vm.id}?sig=${createVmLogSignature(vm.id)}`;
    const antiminingUrl = `${botConfig.publicBaseUrl}/api/antimining/${vm.id}?sig=${createVmLogSignature(vm.id)}`;
    const run = await dispatchWorkflow({ owner: configuredRunner.githubOwner, repo: configuredRunner.githubRepo, workflowFile: configuredRunner.workflowFile, ref: configuredRunner.ref, hostname, ubuntuVersion: input.ubuntuVersion, callbackUrl, antiminingUrl, token: await dispatchToken() });
    await updateVmFromCallback(vm.id, { workflowRunId: String(run.runId ?? ""), status: "running" });
    await appendVmLog(vm.id, "GitHub Actions workflow dispatched successfully.");
    return { ...await getVmById(vm.id), refunded: false };
  } catch (error) {
    await addCoins({ userId: input.userId, actorUserId: input.userId, amount: VPS_COST, reason: "vps_create_refund" });
    throw error;
  }
}

// bot/access.ts
function hasOwnerAccess(discordUserId, ownerId) {
  const configuredOwnerId = ownerId?.trim();
  return Boolean(configuredOwnerId) && discordUserId === configuredOwnerId;
}
function hasAdminAccess(discordUserId, ownerId, adminIds) {
  return hasOwnerAccess(discordUserId, ownerId) || adminIds.includes(discordUserId);
}

// bot/service.ts
var CONTRIBUTION_WARNING = 'ARE YOU SURE THIS IS THE TOKEN FOR THE GITHUB SECONDARY ACCOUNT? THIS ACTION MAY RESULT IN THE ACCOUNT BEING BANNED. IF YOU AGREE, CLICK THE "Confirm" BUTTON BELOW.';
var pendingContributions = /* @__PURE__ */ new Map();
async function ensureUser(discordId, name) {
  const openId = `discord_${discordId}`;
  await upsertUser({ openId, name, loginMethod: "discord-bot", lastSignedIn: /* @__PURE__ */ new Date() });
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("FrierenCloud could not resolve your account.");
  return { id: user.id, discordId, name: user.name };
}
async function currentUser(i) {
  const user = await ensureUser(i.user.id, i.user.globalName || i.user.username);
  const locale = await getUserLocale(user.id);
  if ((await getBotAccess(user.id)).isBanned) {
    await i.reply({ content: copy[locale].banned, ephemeral: true });
    return null;
  }
  return { user, locale };
}
async function admin(i, user, locale) {
  const dynamic = (await getBotAccess(user.id)).isAdmin;
  if (!dynamic && !hasAdminAccess(i.user.id, botConfig.ownerId, botConfig.adminIds)) {
    await i.reply({ content: copy[locale].notAdmin, ephemeral: true });
    return false;
  }
  return true;
}
function card(v) {
  return new EmbedBuilder().setColor(9169405).setTitle(`Ubuntu ${v.ubuntuVersion} VPS #${v.id} \xB7 ${v.hostname}`).addFields({ name: "Status", value: v.status, inline: true }, { name: "SSHX", value: v.sshxUrl || "Waiting for real workflow output" });
}
function prunePendingContributions() {
  const now = Date.now();
  for (const [id, value] of pendingContributions) if (value.expiresAt <= now) pendingContributions.delete(id);
}
async function handleCommand(i) {
  const context = await currentUser(i);
  if (!context) return;
  const { user, locale } = context;
  if (i.commandName === "help") return i.reply({ content: locale === "vi" ? "`/coin daily` \xB7 `/balance` \xB7 `/create` \xB7 `/manage` \xB7 `/language` \xB7 `/token contribute`" : "`/coin daily` \xB7 `/balance` \xB7 `/create` \xB7 `/manage` \xB7 `/language` \xB7 `/token contribute`", ephemeral: true });
  if (i.commandName === "info") return i.reply({ content: `\u2139\uFE0F | FrierenCloud Info
\u{1F451} | Owner: <@${botConfig.ownerId ?? "1071750161488937060"}>
\u{1F4BF} | Version: 1.0
\u{1F916} | Ping: ${i.client.ws.ping}ms`, ephemeral: true });
  if (i.commandName === "balance") return i.reply({ content: locale === "vi" ? `S\u1ED1 d\u01B0 c\u1EE7a b\u1EA1n l\xE0 **${await getCoinBalance(user.id)} xu**.` : `Your balance is **${await getCoinBalance(user.id)} coins**.`, ephemeral: true });
  if (i.commandName === "language") {
    const saved = await setUserLocale(user.id, normalizeLocale(i.options.getString("language", true)));
    return i.reply({ content: copy[saved].languageSaved, ephemeral: true });
  }
  if (i.commandName === "coin") {
    const sub = i.options.getSubcommand();
    if (sub === "maximum-daily") {
      if (!await admin(i, user, locale)) return;
      const times = i.options.getInteger("times", true);
      await setDailyClaimLimit(times);
      return i.reply({ content: `Maximum daily claims set to **${times}**.`, ephemeral: true });
    }
    if (sub === "receive") {
      if (!await admin(i, user, locale)) return;
      const target = i.options.getUser("user", true);
      const recipient = await ensureUser(target.id, target.globalName || target.username);
      if (!await hasContributionToken(recipient.id)) return i.reply({ content: copy[locale].noContribution, ephemeral: true });
      const coins = i.options.getInteger("coins", true);
      const balance = await addCoins({ userId: recipient.id, actorUserId: user.id, amount: coins, reason: "contribution_review" });
      return i.reply({ content: `Contribution approved: **${coins} coins** credited to ${target}. New balance: **${balance}**.`, ephemeral: true });
    }
    const link = await createCoinClaimLink({ userId: user.id, discordName: i.user.globalName || i.user.username, avatarUrl: i.user.displayAvatarURL() });
    return i.reply({ content: `Claim link (expires in 15 minutes): ${botConfig.publicBaseUrl}/coin/${link.id}?sig=${createClaimSignature(link.id)}`, ephemeral: true });
  }
  if (i.commandName === "user") {
    if (!await admin(i, user, locale)) return;
    const id = i.options.getString("user_id", true);
    const target = await ensureUser(id, `Discord user ${id}`);
    const subcommand = i.options.getSubcommand();
    const sub = i.options.getSubcommandGroup(false) ? `add-${subcommand}` : subcommand;
    if (sub === "add-admin") await setBotAccess(target.id, { isAdmin: true });
    if (sub === "add-partner") await setBotAccess(target.id, { isPartner: true });
    if (sub === "ban") await setBotAccess(target.id, { isBanned: true });
    if (sub === "unban") await setBotAccess(target.id, { isBanned: false });
    return i.reply({ content: `User ${id} updated: ${sub}.`, ephemeral: true });
  }
  if (i.commandName === "token") {
    const sub = i.options.getSubcommand();
    if (sub === "github") {
      if (!await admin(i, user, locale)) return;
      await setBotSetting(githubTokenSettingKey, encryptGithubToken(i.options.getString("github_token", true)));
      return i.reply({ content: copy[locale].tokenStored, ephemeral: true });
    }
    prunePendingContributions();
    const id = randomUUID();
    pendingContributions.set(id, { discordId: i.user.id, token: i.options.getString("token", true), expiresAt: Date.now() + 5 * 60 * 1e3 });
    return i.reply({ content: CONTRIBUTION_WARNING, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`fc-contribute-confirm:${id}`).setLabel("Confirm").setStyle(ButtonStyle.Danger))], ephemeral: true });
  }
  if (i.commandName === "webhook") {
    if (!await admin(i, user, locale)) return;
    await setAntiminingWebhook(i.options.getString("webhook_url", true));
    return i.reply({ content: "FrierenCloud Antimining webhook configured securely.", ephemeral: true });
  }
  if (i.commandName === "logs") {
    if (!await admin(i, user, locale)) return;
    const channel = i.options.getChannel("channel", true);
    if (!channel.isTextBased?.() || !("send" in channel)) return i.reply({ content: "Please choose a text-based channel.", ephemeral: true });
    await setBotSetting(auditLogChannelSettingKey, channel.id);
    return i.reply({ content: `Command audit logging enabled for <#${channel.id}>.`, ephemeral: true });
  }
  if (i.commandName === "give") {
    if (!await admin(i, user, locale)) return;
    const target = i.options.getUser("user", true);
    const coins = i.options.getInteger("coins", true);
    const recipient = await ensureUser(target.id, target.globalName || target.username);
    const balance = await addCoins({ userId: recipient.id, actorUserId: user.id, amount: coins, reason: "admin_grant" });
    return i.reply({ content: `Gave **${coins} coins** to ${target}. New balance: **${balance}**.`, ephemeral: true });
  }
  if (i.commandName === "manage") {
    const list2 = await listVmInstances(user.id);
    return i.reply({ embeds: list2.length ? list2.slice(0, 10).map(card) : [new EmbedBuilder().setDescription("No VPS sessions yet.")], ephemeral: true });
  }
  if (i.commandName === "create") {
    await i.deferReply({ ephemeral: true });
    try {
      const vm = await provisionVps({ userId: user.id, hostname: i.options.getString("hostname", false), ubuntuVersion: i.options.getString("ubuntu", true) });
      return i.editReply({ embeds: [card(vm)] });
    } catch (error) {
      if (error instanceof Error && error.message === GITHUB_ACCOUNT_ACCESS_ERROR) return i.editReply(GITHUB_ACCOUNT_ACCESS_ERROR);
      return i.editReply(`Provisioning failed and your ${VPS_COST} coins were refunded when applicable. ${error instanceof Error ? error.message : ""}`);
    }
  }
  if (i.commandName === "status") return i.reply({ content: "FrierenCloud is online.", ephemeral: true });
}
async function handleContributionConfirmation(i) {
  if (!i.customId.startsWith("fc-contribute-confirm:")) return;
  const id = i.customId.slice("fc-contribute-confirm:".length);
  const pending = pendingContributions.get(id);
  if (!pending || pending.expiresAt <= Date.now() || pending.discordId !== i.user.id) return i.reply({ content: "This contribution confirmation is invalid or expired.", ephemeral: true });
  pendingContributions.delete(id);
  const user = await ensureUser(i.user.id, i.user.globalName || i.user.username);
  const locale = await getUserLocale(user.id);
  await saveContributionToken(user.id, encryptGithubToken(pending.token));
  return i.update({ content: copy[locale].contributionStored, components: [] });
}
async function sendAuditLog(client, input) {
  const channelId = await getBotSetting(auditLogChannelSettingKey);
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased() && "send" in channel) await channel.send({ content: formatAuditCommand({ ...input, options: input.options }), allowedMentions: { users: [input.userId] } });
  } catch (error) {
    console.warn("[FrierenCloud] Audit log delivery failed", error);
  }
}
function createDiscordBot() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once(Events.ClientReady, async (ready) => {
    await awardDuePartnerRewards();
    console.info(`[FrierenCloud] Logged in as ${ready.user.tag}`);
    ready.user.setActivity("/help \xB7 Ubuntu VPS control");
  });
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await sendAuditLog(client, { userId: interaction.user.id, userTag: interaction.user.tag, commandName: interaction.commandName, options: interaction.options.data });
        await handleCommand(interaction);
      } else if (interaction.isButton()) await handleContributionConfirmation(interaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected command error.";
      if (interaction.isChatInputCommand() && (interaction.deferred || interaction.replied)) await interaction.editReply(`Command failed: ${message}`);
      else if (interaction.isRepliable()) await interaction.reply({ content: `Command failed: ${message}`, ephemeral: true });
    }
  });
  return client;
}
async function notifyVpsCompletion(client, instance) {
  if (!instance?.sshxUrl) return;
  const owner = await getUserById(instance.userId);
  const id = owner?.openId.startsWith("discord_") ? owner.openId.slice(8) : void 0;
  if (!id) return;
  try {
    await (await client.users.fetch(id)).send({ content: "Your Ubuntu VPS is ready.", embeds: [card(instance)] });
  } catch {
  }
}
async function notifyAntiminingViolation(client, instance, evidence) {
  if (!instance) return;
  const forfeited = await forfeitCoinsForViolation({ userId: instance.userId, instanceId: instance.id });
  await setBotAccess(instance.userId, { isBanned: true });
  const owner = await getUserById(instance.userId);
  const id = owner?.openId.startsWith("discord_") ? owner.openId.slice(8) : void 0;
  if (!id) return;
  try {
    await (await client.users.fetch(id)).send({ content: `FrierenCloud Antimining detected a policy violation on VPS #${instance.id}. The VPS is being shut down, your account has been banned, and ${forfeited} coins were forfeited. Evidence: ${evidence.slice(0, 700)}` });
  } catch {
  }
}

// server/vmCallback.ts
var VALID_STATUSES = /* @__PURE__ */ new Set(["queued", "running", "failed", "completed"]);
function registerVmCallbackRoute(app, onSshxReady) {
  app.post("/api/vm-logs/:instanceId", async (req, res) => {
    const instanceId = Number(req.params.instanceId);
    const signature = typeof req.query.sig === "string" ? req.query.sig : "";
    const rawMessage = typeof req.body?.message === "string" ? req.body.message : "";
    const runId = typeof req.body?.runId === "string" ? req.body.runId.slice(0, 64) : void 0;
    const status = typeof req.body?.status === "string" ? req.body.status : void 0;
    if (!Number.isInteger(instanceId) || instanceId < 1 || !isValidVmLogSignature(instanceId, signature)) {
      res.status(403).json({ error: "invalid log signature" });
      return;
    }
    if (!rawMessage.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    const instance = await getVmById(instanceId);
    if (!instance) {
      res.status(404).json({ error: "instance not found" });
      return;
    }
    const message = rawMessage.slice(0, 2e3);
    const sshxUrl = findSshxUrl(message);
    await appendVmLog(instanceId, message);
    await updateVmFromCallback(instanceId, {
      workflowRunId: runId,
      status: VALID_STATUSES.has(status ?? "") ? status : "running",
      sshxUrl
    });
    if (sshxUrl && onSshxReady) await onSshxReady(await getVmById(instanceId));
    res.status(204).end();
  });
}

// server/webAuth.ts
import axios3 from "axios";
import { createHmac as createHmac3, randomUUID as randomUUID2, timingSafeEqual as timingSafeEqual3 } from "node:crypto";
import express from "express";
var SESSION_COOKIE = "frierencloud_web_session";
var STATE_COOKIE = "frierencloud_oauth_state";
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}
function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}
function signingSecret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) throw new Error("JWT_SECRET is required for FrierenCloud web sessions.");
  return value;
}
function sign(value, secret = signingSecret()) {
  return createHmac3("sha256", secret).update(value).digest("base64url");
}
function createWebSession(session, secret) {
  const payload = base64Url(JSON.stringify(session));
  return `${payload}.${sign(payload, secret)}`;
}
function parseWebSession(value, secret) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !timingSafeEqual3(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(fromBase64Url(payload));
    if (!Number.isInteger(session.userId) || !session.discordId || !session.name || !session.avatarUrl || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
function readCookie(req, name) {
  const entries = (req.headers.cookie ?? "").split(";").map((value) => value.trim());
  const match = entries.find((value) => value.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : void 0;
}
function cookieOptions(req, maxAge) {
  const forwarded = req.header("x-forwarded-proto");
  const secure = forwarded === "https" || req.protocol === "https";
  return { httpOnly: true, sameSite: "lax", secure, maxAge, path: "/" };
}
function publicBaseUrl() {
  return (process.env.BASE_URL ?? process.env.BOT_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
}
function oauthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const redirectUri = process.env.DISCORD_REDIRECT_URI?.trim() || (publicBaseUrl() ? `${publicBaseUrl()}/auth/discord/callback` : "");
  return { clientId, clientSecret, redirectUri };
}
function discordAvatar(profile) {
  if (profile.avatar) return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number(profile.id) % 5}.png`;
}
function readSession(req) {
  return parseWebSession(readCookie(req, SESSION_COOKIE));
}
function unauthorized(res) {
  return res.status(401).json({ error: "authentication_required" });
}
function registerWebAuthRoutes(app) {
  app.get("/auth/discord", (req, res) => {
    const { clientId, redirectUri } = oauthConfig();
    if (!clientId || !redirectUri) return res.status(503).type("html").send("Discord OAuth2 is not configured. Add DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI to .env.");
    const state = randomUUID2();
    res.cookie(STATE_COOKIE, state, cookieOptions(req, 10 * 60 * 1e3));
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });
  app.get("/auth/discord/callback", async (req, res) => {
    const { clientId, clientSecret, redirectUri } = oauthConfig();
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const storedState = readCookie(req, STATE_COOKIE);
    if (!clientId || !clientSecret || !redirectUri || !code || !storedState || state !== storedState) return res.status(400).type("html").send("Discord login could not be verified. Please return and try again.");
    try {
      const tokenResponse = await axios3.post("https://discord.com/api/oauth2/token", new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri }), { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15e3 });
      const accessToken = String(tokenResponse.data?.access_token ?? "");
      if (!accessToken) throw new Error("Missing Discord access token");
      const profileResponse = await axios3.get("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15e3 });
      const profile = profileResponse.data;
      const name = profile.global_name?.trim() || profile.username;
      await upsertUser({ openId: `discord_${profile.id}`, name, email: profile.email ?? null, loginMethod: "discord-oauth", lastSignedIn: /* @__PURE__ */ new Date() });
      const user = await getUserByOpenId(`discord_${profile.id}`);
      if (!user) throw new Error("FrierenCloud user record was unavailable");
      const session = { userId: user.id, discordId: profile.id, name, avatarUrl: discordAvatar(profile), expiresAt: Date.now() + SESSION_TTL_MS };
      res.clearCookie(STATE_COOKIE, cookieOptions(req, -1));
      res.cookie(SESSION_COOKIE, createWebSession(session), cookieOptions(req, SESSION_TTL_MS));
      res.redirect("/dashboard");
    } catch (error) {
      console.error("[FrierenCloud] Discord OAuth callback failed", error);
      res.status(502).type("html").send("FrierenCloud could not complete Discord sign-in. Please try again later.");
    }
  });
  app.post("/auth/logout", (req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req, -1));
    res.json({ ok: true });
  });
  app.get("/api/web/session", (req, res) => {
    const session = readSession(req);
    if (!session) return res.json({ authenticated: false });
    res.json({ authenticated: true, user: session });
  });
  app.get("/api/web/dashboard", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const [coins, instances, locale, dailyLimit, dailyUsage, contributionConfigured] = await Promise.all([getCoinBalance(session.userId), listVmInstances(session.userId), getUserLocale(session.userId), getDailyClaimLimit(), getDailyClaimUsageToday(session.userId), hasContributionToken(session.userId)]);
    res.json({ user: session, coins, locale, daily: { limit: dailyLimit, used: dailyUsage }, contributionConfigured, instances: instances.map((instance) => ({ id: instance.id, hostname: instance.hostname, ubuntuVersion: instance.ubuntuVersion, status: instance.status, sshxUrl: instance.sshxUrl, createdAt: instance.createdAt })) });
  });
  app.post("/api/web/language", express.json(), async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const locale = await setUserLocale(session.userId, normalizeLocale(req.body?.locale));
    res.json({ locale });
  });
  app.post("/api/web/coin/daily", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const link = await createCoinClaimLink({ userId: session.userId, discordName: session.name, avatarUrl: session.avatarUrl });
    res.json({ url: `${publicBaseUrl()}/coin/${link.id}?sig=${createClaimSignature(link.id)}`, expiresAt: link.expiresAt });
  });
  app.post("/api/web/vms", express.json(), async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    if ((await getBotAccess(session.userId)).isBanned) return res.status(403).json({ error: "account_banned" });
    const ubuntuVersion = req.body?.ubuntuVersion === "22.04" ? "22.04" : "24.04";
    try {
      const instance = await provisionVps({ userId: session.userId, hostname: typeof req.body?.hostname === "string" ? req.body.hostname : "", ubuntuVersion });
      res.status(201).json({ instance });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create VPS.";
      res.status(message.includes("need") ? 400 : 500).json({ error: message });
    }
  });
  app.get("/api/web/vms/:instanceId", async (req, res) => {
    const session = readSession(req);
    if (!session) return unauthorized(res);
    const instanceId = Number(req.params.instanceId);
    if (!Number.isInteger(instanceId) || instanceId < 1) return res.status(400).json({ error: "invalid_instance" });
    const instance = await getVmForUser(instanceId, session.userId);
    if (!instance) return res.status(404).json({ error: "not_found" });
    res.json({ instance, logs: await getVmLogs(instanceId) });
  });
}

// bot/index.ts
function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function claimPage(link, notice) {
  const avatar = link.avatarUrl ? `<img src="${escapeHtml(link.avatarUrl)}" alt="Discord avatar"/>` : "<div class=avatar>FC</div>";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>FrierenCloud Daily Coins</title><style>body{margin:0;display:grid;min-height:100vh;place-items:center;background:#061a60;color:#fff;font-family:system-ui}.card{width:min(420px,calc(100% - 32px);padding:32px;text-align:center;border:1px solid #8be9fd55;background:#071d67;box-shadow:10px 10px #020a34}.avatar,img{width:84px;height:84px;border-radius:50%;object-fit:cover;margin:auto;background:#8be9fd;color:#061a60;display:grid;place-items:center;font-weight:800}button{margin-top:24px;border:0;background:#8be9fd;color:#061a60;padding:14px 20px;font-weight:800;font-size:16px;cursor:pointer}.note{color:#ccecff}</style></head><body><main class=card>${avatar}<p class=note>Daily coin claim</p><h1>${escapeHtml(link.discordName)}</h1><p>Claim your FrierenCloud daily coins.</p>${notice ? `<p class=note>${escapeHtml(notice)}</p>` : `<form method="post" action="/coin/${link.id}/claim"><button>Get coins here</button></form>`}</main></body></html>`;
}
async function main() {
  requireBotRuntimeConfig();
  const bot = createDiscordBot();
  const app = express2();
  app.use(express2.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => res.status(200).json({ service: "frierencloud-bot", status: "ok" }));
  app.get("/coin/:id", async (req, res) => {
    const sig = String(req.query.sig ?? "");
    const link = await getCoinClaimLink(req.params.id);
    if (!isValidClaimSignature(req.params.id, sig) || !link || link.usedAt || link.expiresAt.getTime() < Date.now()) return res.status(404).send("Claim link is invalid, expired, or already used.");
    res.type("html").send(claimPage(link));
  });
  app.post("/coin/:id/claim", async (req, res) => {
    const sig = String(req.query.sig ?? "");
    const link = await getCoinClaimLink(req.params.id);
    if (!isValidClaimSignature(req.params.id, sig) || !link) return res.status(404).send("Claim link is invalid.");
    try {
      const balance = await redeemCoinClaimLink(link.id);
      res.type("html").send(claimPage(link, `Coins claimed successfully. Your balance is now ${balance}.`));
    } catch (error) {
      res.type("html").send(claimPage(link, error instanceof Error ? error.message : "Claim failed."));
    }
  });
  app.post("/api/scheduled/partner-rewards", async (req, res) => {
    if (!process.env.PARTNER_REWARD_CRON_SECRET || req.header("x-cron-secret") !== process.env.PARTNER_REWARD_CRON_SECRET) return res.status(403).json({ error: "cron-only" });
    try {
      res.json({ ok: true, rewarded: await awardDuePartnerRewards() });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Partner reward failure" });
    }
  });
  app.post("/api/antimining/:instanceId", async (req, res) => {
    const instanceId = Number(req.params.instanceId);
    const sig = String(req.query.sig ?? "");
    const event = req.body?.event;
    const message = req.body?.message;
    if (!Number.isInteger(instanceId) || !isValidVmLogSignature(instanceId, sig) || !isValidAntiminingEvent(event, message)) return res.status(400).json({ error: "invalid-antimining-event" });
    const instance = await getVmById(instanceId);
    if (!instance) return res.status(404).json({ error: "instance-not-found" });
    console.info("[Antimining]", { instanceId, event, message });
    await appendVmLog(instanceId, `[Antimining:${event}] ${message}`);
    if (event === "violation") {
      await updateVmFromCallback(instanceId, { status: "failed" });
      await notifyAntiminingViolation(bot, instance, message);
    }
    await sendAntiminingWebhook({ instanceId, hostname: instance.hostname, event, message });
    res.json({ ok: true });
  });
  registerVmCallbackRoute(app, (instance) => notifyVpsCompletion(bot, instance));
  registerWebAuthRoutes(app);
  const webRoot = path.join(process.cwd(), "runtime", "public");
  app.use(express2.static(webRoot));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/coin/")) return next();
    res.sendFile(path.join(webRoot, "index.html"), (error) => {
      if (error) next();
    });
  });
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The hosting provider must supply a valid PORT.");
  app.listen(port, () => console.info("[FrierenCloud] Callback service is listening."));
  await bot.login(botConfig.token);
}
main().catch((error) => {
  console.error("[FrierenCloud] Startup failed", error);
  process.exit(1);
});
