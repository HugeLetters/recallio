import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user, userIdLength } from "./user";
import { timestampColumn } from "./utils";

export const logMaxLength = 512;
export const log = sqliteTable("log", {
  log: text("log", { length: logMaxLength }).notNull(),
  type: text("type", { length: 15 }).notNull().$type<"error">(),
  user: text("user_id", { length: userIdLength })
    .notNull()
    .references(() => user.id),
  createdAt: timestampColumn("created_at").notNull(),
});
