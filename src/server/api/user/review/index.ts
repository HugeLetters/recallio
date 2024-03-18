import { db } from "@/server/database";
import { nonNullableSQL } from "@/server/database/query";
import { count, query } from "@/server/database/query/aggregate";
import { review, reviewsToCategories } from "@/server/database/schema/product";
import { createBarcodeSchema } from "@/server/product/validation";
import { getFileUrl } from "@/server/uploadthing";
import { createDeleteQueueQuery } from "@/server/uploadthing/delete-queue";
import { ignore } from "@/utils";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { throwDefaultError } from "../../utils/error";
import { deleteReview } from "./delete";
import { getSummaryList } from "./summary-list";
import { upsert } from "./upsert";

const getOne = protectedProcedure
  .input(z.object({ barcode: createBarcodeSchema("Barcode is required to get review data") }))
  .query(async ({ ctx, input: { barcode } }) => {
    return db
      .select({
        name: review.name,
        rating: review.rating,
        comment: review.comment,
        pros: review.pros,
        cons: review.cons,
        isPrivate: review.isPrivate,
        image: query.map(review.imageKey, getFileUrl),
        categories: query.aggregate(reviewsToCategories.category),
      })
      .from(review)
      .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)))
      .leftJoin(
        reviewsToCategories,
        and(
          eq(review.userId, reviewsToCategories.userId),
          eq(review.barcode, reviewsToCategories.barcode),
        ),
      )
      .groupBy(review.barcode, review.userId)
      .limit(1)
      .then(([data]) => data ?? null)
      .catch(throwDefaultError);
  });

const deleteImage = protectedProcedure
  .input(
    z.object({
      barcode: createBarcodeSchema("Barcode is required to delete an image from a review"),
    }),
  )
  .mutation(async ({ ctx, input: { barcode } }) => {
    const userId = ctx.session.user.id;
    const filter = and(eq(review.userId, userId), eq(review.barcode, barcode));

    return db
      .select({ fileKey: nonNullableSQL(review.imageKey) })
      .from(review)
      .where(and(filter, isNotNull(review.imageKey)))
      .then((fileKeys) => {
        if (!fileKeys.length) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `No image attached to your review for barcode ${barcode}.`,
          });
        }

        return db.batch([
          db.update(review).set({ imageKey: null }).where(filter),
          ...createDeleteQueueQuery(fileKeys),
        ]);
      })
      .then(ignore)
      .catch((e) => throwDefaultError(e, "Failed to delete image"));
  });

export const reviewRouter = createTRPCRouter({
  upsert,
  getOne,
  getSummaryList,
  deleteReview,
  deleteImage,
  getCount: protectedProcedure.query(({ ctx: { session } }) => {
    return count(review, eq(review.userId, session.user.id));
  }),
});
