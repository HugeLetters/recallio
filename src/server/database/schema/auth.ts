import type { AdapterAccount } from "@auth/core/adapters";
import { relations, sql } from "drizzle-orm";
import { index, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { review } from "./product";

export const user = sqliteTable("user", {
  id: text("id", { length: 255 }).notNull().primaryKey(),
  name: text("name", { length: 255 }).notNull(),
  email: text("email", { length: 255 }).notNull().unique(),
  emailVerified: int("email_verified", { mode: "timestamp" }).default(sql`current_timestamp`),
  /** Stored either as URL or an UploadThing key */
  image: text("image", { length: 255 }),
});
export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  reviews: many(review),
}));

export const account = sqliteTable(
  "account",
  {
    userId: text("user_id", { length: 255 }).notNull(),
    type: text("type", { length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider", { length: 255 }).notNull(),
    providerAccountId: text("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token", { length: 255 }),
    // LinkedIn token can be quite long
    access_token: text("access_token", { length: 511 }),
    expires_at: int("expires_at"),
    token_type: text("token_type", { length: 255 }),
    scope: text("scope", { length: 255 }),
    // Google id token can be quite long
    id_token: text("id_token", { length: 2047 }),
    session_state: text("session_state", { length: 255 }),
    // For GitHub
    refresh_token_expires_in: int("refresh_token_expires_in"),
  },
  (table) => ({
    compoundKey: primaryKey(table.provider, table.providerAccountId),
    userIdIndex: index("account_user_id_index").on(table.userId),
  }),
);
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const session = sqliteTable(
  "session",
  {
    sessionToken: text("session_token", { length: 255 }).notNull().primaryKey(),
    userId: text("user_id", { length: 255 }).notNull(),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIndex: index("session_user_id_index").on(table.userId),
    expiresIndex: index("session_expires_index").on(table.expires),
  }),
);
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const verificationToken = sqliteTable(
  "verification_token",
  {
    identifier: text("identifier", { length: 255 }).notNull(),
    token: text("token", { length: 255 }).notNull(),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey(table.identifier, table.token),
    expiresIndex: index("verification_token_expires_index").on(table.expires),
  }),
);
