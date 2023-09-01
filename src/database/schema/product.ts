import { mysqlTable, primaryKey, varchar } from "drizzle-orm/mysql-core";

export const product = mysqlTable("product", {
  barcode: varchar("barcode", { length: 55 }).primaryKey(),
});

export const productName = mysqlTable(
  "product-name",
  {
    barcode: varchar("barcode", { length: 55 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.barcode, table.name) })
);

export const productCategory = mysqlTable("product-category", {
  name: varchar("name", { length: 31 }).primaryKey(),
});

export const productsToCategories = mysqlTable(
  "products-to-categories",
  {
    productBarcode: varchar("product-barcode", { length: 55 }).notNull(),
    categoryName: varchar("category-name", { length: 31 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.productBarcode, table.categoryName) })
);
