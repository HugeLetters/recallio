import { relations, sql } from "drizzle-orm";
import {
  boolean,
  datetime,
  index,
  mysqlTable,
  primaryKey,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const category = mysqlTable("category", {
  name: varchar("name", { length: 31 }).primaryKey(),
});
export const categoryRelations = relations(category, ({ many }) => ({
  reviews: many(reviewsToCategories),
}));

export const review = mysqlTable(
  "review",
  {
    userId: varchar("user-id", { length: 255 }).notNull(),
    barcode: varchar("barcode", { length: 55 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rating: tinyint("rating").notNull(),
    pros: varchar("pros", { length: 4095 }),
    cons: varchar("cons", { length: 4095 }),
    comment: varchar("comment", { length: 2047 }),
    imageKey: varchar("image-key", { length: 255 }),
    updatedAt: datetime("updated-at")
      .notNull()
      .default(sql`NOW()`),
    isPrivate: boolean("is-private").notNull().default(true),
  },
  (table) => ({
    compoundKey: primaryKey(table.userId, table.barcode),
    barcodeIndex: index("barcode-index").on(table.barcode),
    nameIndex: index("name-index").on(table.name),
    ratingIndex: index("rating-index").on(table.rating),
    updatedAtIndex: index("updated-at-index").on(table.updatedAt),
    isPrivateIndex: index("is-private-index").on(table.isPrivate),
  }),
);
export const reviewRelations = relations(review, ({ many, one }) => ({
  categories: many(reviewsToCategories),
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
}));

export const reviewsToCategories = mysqlTable(
  "reviews-to-categories",
  {
    userId: varchar("user-id", { length: 255 }).notNull(),
    barcode: varchar("barcode", { length: 55 }).notNull(),
    category: varchar("category", { length: 31 }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey(table.userId, table.barcode, table.category),
    barcodeIndex: index("barcode-index").on(table.barcode),
    categoryIndex: index("category-index").on(table.category),
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
