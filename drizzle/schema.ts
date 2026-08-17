import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export type VmInstance = typeof vmInstances.$inferSelect;
export type VmLog = typeof vmLogs.$inferSelect;
export type UserGithubSettings = typeof userGithubSettings.$inferSelect;
