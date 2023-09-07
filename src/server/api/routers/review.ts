import { reviewRepository } from "@/database/repository/product";
import type { AsyncResult } from "@/utils/api";
import { utapi } from "uploadthing/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const reviewRouter = createTRPCRouter({
  createReview: protectedProcedure
    .input(
      z
        .object({
          barcode: z.string(),
          name: z.string(),
          rating: z.number(),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
          comment: z.string().nullish(),
          categories: z.array(z.string()).optional(),
        })
        // enforce default behaviour - we don't wanna update imageKey here
        .strip()
    )
    .mutation(async ({ input, ctx }): AsyncResult<void, string> => {
      const { categories, cons, pros, ...value } = input;
      return reviewRepository
        .createWithCategories(
          {
            ...value,
            // filter out empty strings from array and coerce to null empty arrays
            cons: cons.filter(Boolean).join("\n") || null,
            pros: pros.filter(Boolean).join("\n") || null,
            userId: ctx.session.user.id,
          },
          categories?.filter(Boolean)
        )
        .then(() => {
          return { ok: true as const, data: undefined };
        })
        .catch((e) => {
          console.error(e);
          return { ok: false, error: "Couldn't post the review" };
        });
    }),
  getUserReview: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(({ ctx, input: { barcode } }) => {
      return reviewRepository
        .findFirstWithCategories((table, { and, eq }) =>
          and(eq(table.userId, ctx.session.user.id), eq(table.barcode, barcode))
        )
        .then((data) => data ?? null);
    }),
  getReviewImage: protectedProcedure
    .input(z.object({ imageKey: z.string() }))
    .query(({ input: { imageKey } }) => {
      return utapi.getFileUrls(imageKey).then((x) => x[0]?.url ?? null);
    }),
  deleteReviewImage: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input: { barcode } }): AsyncResult<void, string> => {
      const review = await reviewRepository.findFirst((table, { and, eq }) =>
        and(eq(table.userId, ctx.session.user.id), eq(table.barcode, barcode))
      );
      if (!review) return { ok: true, data: undefined };

      const oldKey = review.imageKey;

      return reviewRepository
        .update({ imageKey: null }, (table, { and, eq }) =>
          and(eq(table.userId, ctx.session.user.id), eq(table.barcode, barcode))
        )
        .then(() => {
          if (oldKey) {
            utapi.deleteFiles(oldKey).catch(console.error);
          }
          return { ok: true as const, data: undefined };
        })
        .catch((err) => {
          console.error(err);
          return { ok: false, error: "Couldn't delete image" };
        });
    }),
});
