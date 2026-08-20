import { boolean, int, mysqlEnum, mysqlTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const vmStatusValues = ["queued", "running", "failed", "completed"] as const;

export const vmInstances = mysqlTable("vmInstances", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vmLogs = mysqlTable("vmLogs", {
  id: int("id").autoincrement().primaryKey(),
  instanceId: int("instanceId").notNull().references(() => vmInstances.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userGithubSettings = mysqlTable("userGithubSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  githubOwner: varchar("githubOwner", { length: 100 }).notNull(),
  githubRepo: varchar("githubRepo", { length: 100 }).notNull(),
  workflowFile: varchar("workflowFile", { length: 255 }).notNull().default("frierencloud-vm.yml"),
  ref: varchar("ref", { length: 100 }).notNull().default("main"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userCoinBalances = mysqlTable("userCoinBalances", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balance: int("balance").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const coinTransactions = mysqlTable("coinTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  amount: int("amount").notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  instanceId: int("instanceId").references(() => vmInstances.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const botSettings = mysqlTable("botSettings", {
  settingKey: varchar("settingKey", { length: 80 }).primaryKey(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const botUserAccess = mysqlTable("botUserAccess", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  isAdmin: boolean("isAdmin").notNull().default(false),
  isBanned: boolean("isBanned").notNull().default(false),
  isPartner: boolean("isPartner").notNull().default(false),
  lastPartnerRewardMonth: varchar("lastPartnerRewardMonth", { length: 7 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const coinClaimLinks = mysqlTable("coinClaimLinks", {
  id: varchar("id", { length: 48 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  discordName: varchar("discordName", { length: 100 }).notNull(),
  avatarUrl: text("avatarUrl"),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const dailyClaimUsage = mysqlTable("dailyClaimUsage", {
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  claimDate: varchar("claimDate", { length: 10 }).notNull(),
  count: int("count").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ pk: primaryKey({ columns: [table.userId, table.claimDate] }) }));

export type VmInstance = typeof vmInstances.$inferSelect;
export type VmLog = typeof vmLogs.$inferSelect;
export type UserGithubSettings = typeof userGithubSettings.$inferSelect;
export type UserCoinBalance = typeof userCoinBalances.$inferSelect;
