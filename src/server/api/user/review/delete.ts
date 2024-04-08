import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client/serverless";
import { nonNullableSQL } from "@/server/database/query";
import { review } from "@/server/database/schema/product";
import { throwExpectedError } from "@/server/error/trpc";
import { createBarcodeSchema } from "@/server/product/validation";
import { fileDeleteQueueQuery } from "@/server/uploadthing/delete-queue";
import { ignore } from "@/utils";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

export const deleteReview = protectedProcedure
  .input(z.object({ barcode: createBarcodeSchema("Barcode is required to delete a review") }))
  .mutation(async ({ ctx, input: { barcode } }) => {
    const userId = ctx.session.user.id;
    const filter = and(eq(review.userId, userId), eq(review.barcode, barcode));

    return db
      .select({ fileKey: nonNullableSQL(review.imageKey) })
      .from(review)
      .where(and(filter, isNotNull(review.imageKey)))
      .then<unknown>((files) => {
        const deleteReview = db.delete(review).where(filter);
        const deleteFiles = fileDeleteQueueQuery(db, files);

        if (!deleteFiles) return deleteReview;

        return db.batch([deleteReview, deleteFiles]);
      })
      .then(ignore)
      .catch(throwExpectedError(`Failed to delete your review for barcode ${barcode}.`));
  });
