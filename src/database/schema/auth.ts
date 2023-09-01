import type { AdapterAccount } from "@auth/core/adapters";
import { sql } from "drizzle-orm";
import { index, int, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
    fsp: 3,
  }).default(sql`(CURRENT_TIMESTAMP)`),
  image: varchar("image", { length: 255 }),
});

export const account = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: varchar("refresh_token", { length: 255 }),
    // LinkedIn token can be quite long
    access_token: varchar("access_token", { length: 511 }),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    // Google id token can be quite long
    id_token: varchar("id_token", { length: 2047 }),
    session_state: varchar("session_state", { length: 255 }),
    // For GitHub
    refresh_token_expires_in: int("refresh_token_expires_in"),
  },
  (table) => ({
    compoundKey: primaryKey(table.provider, table.providerAccountId),
    userIdIndex: index("user-id-index").on(table.userId),
  })
);

export const session = mysqlTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 255 }).notNull().primaryKey(),
    userId: varchar("userId", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    userIdIndex: index("user-id-index").on(table.userId),
  })
);

export const verificationToken = mysqlTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey(table.identifier, table.token),
  })
);
