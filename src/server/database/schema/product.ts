import { relations, sql } from "drizzle-orm";
import { index, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const category = sqliteTable("category", {
  name: text("name", { length: 31 }).primaryKey(),
});
export const categoryRelations = relations(category, ({ many }) => ({
  reviews: many(reviewsToCategories),
}));

export const review = sqliteTable(
  "review",
  {
    userId: text("user_id", { length: 255 }).notNull(),
    barcode: text("barcode", { length: 55 }).notNull(),
    name: text("name", { length: 255 }).notNull(),
    rating: int("rating").notNull(),
    pros: text("pros", { length: 4095 }),
    cons: text("cons", { length: 4095 }),
    comment: text("comment", { length: 2047 }),
    imageKey: text("image_key", { length: 255 }),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`current_timestamp`),
    isPrivate: int("is_private", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    compoundKey: primaryKey(table.userId, table.barcode),
    barcodeIndex: index("review_barcode_index").on(table.barcode),
    nameIndex: index("review_name_index").on(table.name),
    ratingIndex: index("review_rating_index").on(table.rating),
    updatedAtIndex: index("review_updated_at_index").on(table.updatedAt),
    isPrivateIndex: index("review_is_private_index").on(table.isPrivate),
  }),
);
export const reviewRelations = relations(review, ({ many, one }) => ({
  categories: many(reviewsToCategories),
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
}));
export type ReviewInsert = typeof review.$inferInsert;

export const reviewsToCategories = sqliteTable(
  "reviews_to_categories",
  {
    userId: text("user_id", { length: 255 }).notNull(),
    barcode: text("barcode", { length: 55 }).notNull(),
    category: text("category", { length: 31 }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey(table.userId, table.barcode, table.category),
    barcodeIndex: index("reviews_to_categories_barcode_index").on(table.barcode),
    categoryIndex: index("reviews_to_categories_category_index").on(table.category),
  }),
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
