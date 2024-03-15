import { db } from "@/server/database";
import { review } from "@/server/database/schema/product";
import { createBarcodeSchema } from "@/server/product/schema";
import { utapi } from "@/server/uploadthing/api";
import { ignore } from "@/utils";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { throwDefaultError } from "../../utils/error";

export const deleteReview = protectedProcedure
  .input(z.object({ barcode: createBarcodeSchema("Barcode is required to delete a review") }))
  .mutation(async ({ ctx, input: { barcode } }) => {
    const userId = ctx.session.user.id;
    const filter = and(eq(review.userId, userId), eq(review.barcode, barcode));

    return db
      .batch([
        db.select({ imageKey: review.imageKey }).from(review).where(filter),
        db.delete(review).where(filter),
      ])
      .then(([[review]]) => {
        if (!review) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Couldn't find your review for barcode ${barcode}.`,
          });
        }

        if (!review.imageKey) return;
        return utapi.deleteFiles(review.imageKey).then(ignore);
      })
      .catch((e) => throwDefaultError(e, `Failed to delete your review for barcode ${barcode}.`));
  });
