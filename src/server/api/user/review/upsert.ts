import {
  categoryCountMax,
  categoryLengthMax,
  categoryLengthMin,
  productCommentLengthMax,
  productNameLengthMax,
  productNameLengthMin,
  productRatingMax,
} from "@/product/validation";
import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database";
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
import { nonEmptyArray } from "@/utils/array";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const upsertSchema = z
  .object({
    barcode: createBarcodeSchema("Barcode is required to create a review"),
    name: stringLikeSchema({
      required_error: "Product name is required to create a review",
    })
      .min(productNameLengthMin, createMinMessage("Product name", productNameLengthMin))
      .max(productNameLengthMax, createMaxMessage("Product name", productNameLengthMax)),
    rating: z
      .number()
      .int("Rating has to be an integer")
      .min(0, "Rating can't be less than 0")
      .max(productRatingMax, `Rating can't be greater than ${productRatingMax}`),
    pros: createLongTextSchema("Pros", productCommentLengthMax).nullish(),
    cons: createLongTextSchema("Cons", productCommentLengthMax).nullish(),
    comment: createLongTextSchema("Comment", productCommentLengthMax).nullish(),
    isPrivate: z.boolean(),
    categories: z
      .array(
        z
          .string()
          .min(categoryLengthMin, createMinMessage("A single category", categoryLengthMin))
          .max(categoryLengthMax, createMaxMessage("A single category", categoryLengthMax)),
      )
      .max(categoryCountMax, `Review can't have more than ${categoryCountMax} categories`)
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
  };

  return db
    .batch([
      db
        .insert(review)
        .values(reviewData)
        .onConflictDoUpdate({ target: [review.userId, review.barcode], set: reviewData }),
      ...getCategoriesBatch(reviewData, categories),
    ])
    .catch((e) => throwExpectedError(e, "Failed to post the review"));
});

function getCategoriesBatch(reviewData: ReviewInsert, categories: string[] | undefined) {
  if (!categories) return [];

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
