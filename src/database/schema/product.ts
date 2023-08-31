import { mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

export const productName = mysqlTable(
  "product-name",
  {
    barcode: varchar("barcode", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.barcode, table.name) })
);
