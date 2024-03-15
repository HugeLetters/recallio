import { db } from "@/server/database";
import type { ReviewInsert } from "@/server/database/schema/product";
import { category, review, reviewsToCategories } from "@/server/database/schema/product";
import { createBarcodeSchema } from "@/server/product/schema";
import {
  createLongTextSchema,
  createMaxMessage,
  createMinMessage,
  stringLikeSchema,
} from "@/server/validation/string";
import { nonEmptyArray } from "@/utils/array";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { throwDefaultError } from "../../utils/error";

const upsertSchema = z
  .object({
    barcode: createBarcodeSchema("Barcode is required to create a review"),
    name: stringLikeSchema({
      required_error: "Product name is required to create a review",
    })
      .min(6, createMinMessage("Product name", 6))
      .max(60, createMaxMessage("Product name", 60)),
    rating: z
      .number()
      .int("Rating has to be an integer")
      .min(0, "Rating can't be less than 0")
      .max(5, "Rating can't be greater than 5"),
    pros: createLongTextSchema("Pros", 4095).nullish(),
    cons: createLongTextSchema("Cons", 4095).nullish(),
    comment: createLongTextSchema("Comment", 2047).nullish(),
    isPrivate: z.boolean(),
    categories: z
      .array(
        z
          .string()
          .min(1, createMinMessage("A single category", 1))
          .max(25, createMaxMessage("A single category", 25)),
      )
      .max(25, "Review can't have more than 25 categories")
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
    .catch((e) => throwDefaultError(e, "Failed to post the review"));
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
