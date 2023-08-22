import { mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

export const product = mysqlTable(
  "product",
  {
    barcode: varchar("barcode", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.barcode, table.name) })
);
