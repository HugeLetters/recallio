import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestampColumn } from "./utils";

export const fileDeleteQueue = sqliteTable("file-delete-queue", {
  fileKey: text("file_key", { length: 255 }).notNull().primaryKey(),
  createdAt: timestampColumn("created_at").notNull(),
});
