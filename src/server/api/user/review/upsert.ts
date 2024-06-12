import {
  CATEGORY_COUNT_MAX,
  CATEGORY_LENGTH_MAX,
  CATEGORY_LENGTH_MIN,
  PRODUCT_COMMENT_LENGTH_MAX,
  PRODUCT_NAME_LENGTH_MAX,
  PRODUCT_NAME_LENGTH_MIN,
  PRODUCT_RATING_MAX,
} from "@/product/validation";
import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client/serverless";
import type { ReviewInsert } from "@/server/database/schema/product";
import { category, review, reviewsToCategories } from "@/server/database/schema/product";
import { throwExpectedError } from "@/server/error/trpc";
import { createBarcodeSchema } from "@/server/product/validation";
import {
  createLongTextSchema,
  createMaxMessage,
  createMinMessage,
  stringLikeSchema,
} from "@/server/validation/string";
import { ignore } from "@/utils";
import { nonEmptyArray } from "@/utils/array";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const upsertSchema = z
  .object({
    barcode: createBarcodeSchema("Barcode is required to create a review"),
    name: stringLikeSchema({
      required_error: "Product name is required to create a review",
    })
      .min(PRODUCT_NAME_LENGTH_MIN, createMinMessage("Product name", PRODUCT_NAME_LENGTH_MIN))
      .max(PRODUCT_NAME_LENGTH_MAX, createMaxMessage("Product name", PRODUCT_NAME_LENGTH_MAX)),
    rating: z
      .number()
      .int("Rating has to be an integer")
      .min(0, "Rating can't be less than 0")
      .max(PRODUCT_RATING_MAX, `Rating can't be greater than ${PRODUCT_RATING_MAX}`),
    pros: createLongTextSchema("Pros", PRODUCT_COMMENT_LENGTH_MAX).nullish(),
    cons: createLongTextSchema("Cons", PRODUCT_COMMENT_LENGTH_MAX).nullish(),
    comment: createLongTextSchema("Comment", PRODUCT_COMMENT_LENGTH_MAX).nullish(),
    isPrivate: z.boolean(),
    categories: z
      .array(
        z
          .string()
          .min(CATEGORY_LENGTH_MIN, createMinMessage("A single category", CATEGORY_LENGTH_MIN))
          .max(CATEGORY_LENGTH_MAX, createMaxMessage("A single category", CATEGORY_LENGTH_MAX)),
      )
      .max(CATEGORY_COUNT_MAX, `Review can't have more than ${CATEGORY_COUNT_MAX} categories`)
      .optional(),
  })
  // enforce default behaviour - we don't wanna update imageKey here
  .strip();

export const upsert = protectedProcedure.input(upsertSchema).mutation(async ({ input, ctx }) => {
  const { categories, ...value } = input;
  const reviewData: ReviewInsert = {
    ...value,
    userId: ctx.session.user.id,
    // override updatedAt value with current time
    updatedAt: new Date(),
    isPrivate: ctx.session.user.isBanned || value.isPrivate,
  };

  return db
    .batch([
      db
        .insert(review)
        .values(reviewData)
        .onConflictDoUpdate({ target: [review.userId, review.barcode], set: reviewData }),
      ...getCategoriesBatch(reviewData, categories),
    ])
    .then(ignore)
    .catch(throwExpectedError("Failed to post the review"));
});

function getCategoriesBatch(reviewData: ReviewInsert, categories: string[] | undefined) {
  if (!categories) return [] satisfies [];

  const batch = db
    .delete(reviewsToCategories)
    .where(
      and(
        eq(reviewsToCategories.userId, reviewData.userId),
        eq(reviewsToCategories.barcode, reviewData.barcode),
      ),
    );
  const categoryValues = categories.filter(Boolean).map((category) => ({ name: category }));
  if (!nonEmptyArray(categoryValues)) return [batch] satisfies [unknown];

  return [
    batch,
    db.insert(category).values(categoryValues).onConflictDoNothing(),
    db
      .insert(reviewsToCategories)
      .values(
        categories.map((category) => ({
          barcode: reviewData.barcode,
          userId: reviewData.userId,
          category,
        })),
      )
      .onConflictDoNothing(),
  ] satisfies [unknown, unknown, unknown];
}
