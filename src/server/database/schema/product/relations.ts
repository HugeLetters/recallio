import { user } from "@/server/database/schema/user";
import { relations } from "drizzle-orm";
import { category, review, reviewsToCategories } from ".";

export const reviewRelations = relations(review, ({ many, one }) => ({
  categories: many(reviewsToCategories),
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  reviews: many(reviewsToCategories),
}));

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
