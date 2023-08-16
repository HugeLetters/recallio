import { mysqlTable, serial, varchar } from "drizzle-orm/mysql-core";

export const testTable = mysqlTable("test-table", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
});
