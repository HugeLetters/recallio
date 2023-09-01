import { relations } from "drizzle-orm";
import { index, mysqlTable, primaryKey, tinyint, varchar } from "drizzle-orm/mysql-core";

export const productName = mysqlTable(
  "product-name",
  {
    barcode: varchar("barcode", { length: 55 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.barcode, table.name) })
);

export const category = mysqlTable("category", {
  name: varchar("name", { length: 31 }).primaryKey(),
});
export const categoryRelations = relations(category, ({ many }) => ({
  reviews: many(reviewsToCategories),
}));

export const review = mysqlTable(
  "review",
  {
    barcode: varchar("barcode", { length: 55 }).notNull(),
    userId: varchar("user-id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rating: tinyint("rating"),
    pros: varchar("pros", { length: 4095 }),
    cons: varchar("cons", { length: 4095 }),
    comment: varchar("comment", { length: 2047 }),
    image: varchar("image", { length: 255 }),
  },
  (table) => ({
    compoundKey: primaryKey(table.userId, table.barcode),
    barcodeIndex: index("barcode-index").on(table.barcode),
  })
);
export const reviewRelations = relations(review, ({ many }) => ({
  categories: many(reviewsToCategories),
}));

export const reviewsToCategories = mysqlTable(
  "reviews-to-categories",
  {
    barcode: varchar("user-id", { length: 255 }).notNull(),
    userId: varchar("barcode", { length: 55 }).notNull(),
    category: varchar("category", { length: 31 }).notNull(),
  },
  (table) => ({ compoundKey: primaryKey(table.userId, table.barcode, table.category) })
);
export const reviewsToCategoriesRelations = relations(reviewsToCategories, ({ one }) => ({
  review: one(review, {
    fields: [reviewsToCategories.barcode, reviewsToCategories.userId],
    references: [review.barcode, review.userId],
  }),
  category: one(category, {
    fields: [reviewsToCategories.category],
    references: [category.name],
  }),
}));
