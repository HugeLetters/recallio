import { db } from "@/server/database/client";
import { Trigger } from "@/server/database/schema/trigger";
import { caseWhen } from "@/server/database/schema/utils";
import { eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { productMeta, review } from ".";

const excluded = alias(productMeta, "excluded");

export const insertTrigger = new Trigger({
  name: "update_product_meta_on_new_review",
  type: "INSERT",
  on: review,
  when: ({ newRow }) => eq(newRow.isPrivate, false),
  do: ({ newRow }) =>
    db
      .insert(productMeta)
      .values({
        barcode: sql`${newRow.barcode}`,
        publicReviewCount: 1,
        publicTotalRating: sql`${newRow.rating}`,
      })
      .onConflictDoUpdate({
        target: productMeta.barcode,
        set: {
          publicReviewCount: sql`${productMeta.publicReviewCount} + 1`,
          publicTotalRating: sql`${productMeta.publicTotalRating} + ${excluded.publicTotalRating}`,
        },
      }),
});

export const deleteTrigger = new Trigger({
  name: "update_product_meta_on_delete_review",
  type: "DELETE",
  on: review,
  when: ({ oldRow }) => eq(oldRow.isPrivate, false),
  do: ({ oldRow }) =>
    db
      .update(productMeta)
      .set({
        publicReviewCount: sql`MAX(0, ${productMeta.publicReviewCount} - 1)`,
        publicTotalRating: sql`MAX(0, ${productMeta.publicTotalRating} - ${oldRow.rating})`,
      })
      .where(eq(productMeta.barcode, oldRow.barcode)),
});

export const updateTrigger = new Trigger({
  name: "update_product_meta_on_update_review",
  type: "UPDATE",
  on: review,
  of: review.isPrivate,
  when: ({ newRow, oldRow }) => ne(newRow.isPrivate, oldRow.isPrivate),
  do: ({ newRow }) =>
    db
      .update(productMeta)
      .set({
        publicReviewCount: caseWhen(
          eq(newRow.isPrivate, false),
          sql`${productMeta.publicReviewCount} + 1`,
          sql`MAX(0, ${productMeta.publicReviewCount} - 1)`,
        ),
        publicTotalRating: caseWhen(
          eq(newRow.isPrivate, false),
          sql`${productMeta.publicTotalRating} + ${newRow.rating}`,
          sql`MAX(0, ${productMeta.publicTotalRating} - ${newRow.rating})`,
        ),
      })
      .where(eq(productMeta.barcode, newRow.barcode)),
});
