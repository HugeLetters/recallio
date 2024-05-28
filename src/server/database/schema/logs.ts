import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user, userIdLength } from "./user";
import { timestampColumn } from "./utils";

export const logMaxLength = 512;
export const logTable = sqliteTable(
  "log",
  {
    log: text("log", { length: logMaxLength }).notNull(),
    type: text("type", { length: 15 }).notNull().$type<"error">(),
    user: text("user_id", { length: userIdLength }).references(() => user.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestampColumn("created_at").notNull(),
  },
  (table) => ({ createdAtIndex: index("log_created_at_index").on(table.createdAt) }),
);
