import { nonEmptyArray, type StrictPick } from "@/utils";
import { and, eq, sql, type InferInsertModel } from "drizzle-orm";
import { db } from "..";
import { category, review, reviewsToCategories } from "../schema/product";

export async function createReview(
  reviewValue: InferInsertModel<typeof review>,
  categories: Array<InferInsertModel<typeof category>["name"]> | undefined
) {
  return db
    .transaction(async (tx) => {
      // override updatedAt value with current time
      Object.assign(reviewValue, { updatedAt: new Date() } satisfies StrictPick<
        typeof reviewValue,
        "updatedAt"
      >);

      const reviewQuery = await tx
        .insert(review)
        .values(reviewValue)
        .onDuplicateKeyUpdate({ set: reviewValue })
        .catch((e) => {
          console.error(e);
          throw Error("Error saving the review");
        });
      if (!categories) return reviewQuery;

      const categoryValues = categories.map((category) => ({ name: category }));
      if (!nonEmptyArray(categoryValues)) return reviewQuery;

      await tx
        .insert(category)
        .values(categoryValues)
        .onDuplicateKeyUpdate({ set: { name: sql`${category.name}` } })
        .catch((e) => {
          console.error(e);
          throw Error("Error saving categories for review");
        });

      await tx
        .delete(reviewsToCategories)
        .where(
          and(
            eq(reviewsToCategories.userId, reviewValue.userId),
            eq(reviewsToCategories.barcode, reviewValue.barcode)
          )
        );

      const categoriesForReview = categories.map((category) => ({
        barcode: reviewValue.barcode,
        userId: reviewValue.userId,
        category,
      }));
      await tx
        .insert(reviewsToCategories)
        .values(categoriesForReview)
        .onDuplicateKeyUpdate({
          set: {
            barcode: sql`${reviewsToCategories.barcode}`,
            category: sql`${reviewsToCategories.category}`,
            userId: sql`${reviewsToCategories.userId}`,
          },
        })
        .catch((e) => {
          console.error(e);
          throw Error("Error linking categories for review");
        });

      return reviewQuery;
    })
    .catch((e: Error) => {
      console.error(e);
      throw e;
    });
}
