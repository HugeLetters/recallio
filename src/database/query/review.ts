import { throwDefaultError } from "@/server/api/utils";
import { nonEmptyArray } from "@/utils/array";
import { type StrictOmit } from "@/utils/type";
import { and, eq, sql } from "drizzle-orm";
import { db } from "..";
import { category, review, reviewsToCategories, type ReviewInsert } from "../schema/product";

export async function upsertReview(
  reviewValue: StrictOmit<ReviewInsert, "updatedAt" | "imageKey">,
  categories: Array<typeof category.$inferInsert.name> | undefined,
) {
  return db
    .transaction(async (tx) => {
      // override updatedAt value with current time
      Object.assign(reviewValue, { updatedAt: new Date() } satisfies Pick<
        ReviewInsert,
        "updatedAt"
      >);

      await tx.insert(review).values(reviewValue).onDuplicateKeyUpdate({ set: reviewValue });
      if (!categories) return;

      await tx
        .delete(reviewsToCategories)
        .where(
          and(
            eq(reviewsToCategories.userId, reviewValue.userId),
            eq(reviewsToCategories.barcode, reviewValue.barcode),
          ),
        );
      const categoryValues = categories.map((category) => ({ name: category }));
      if (!nonEmptyArray(categoryValues)) return;

      await tx
        .insert(category)
        .values(categoryValues)
        .onDuplicateKeyUpdate({ set: { name: sql`${category.name}` } });

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
        });
    })
    .catch(throwDefaultError);
}
