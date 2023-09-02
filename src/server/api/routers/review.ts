import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { reviewRepository } from "@/database/repository/product";
import { utapi } from "uploadthing/server";

export const reviewRouter = createTRPCRouter({
  createReview: protectedProcedure
    .input(
      z.object({
        barcode: z.string(),
        name: z.string(),
        rating: z.number(),
        pros: z.array(z.string().optional()).nullish(),
        cons: z.array(z.string().optional()).nullish(),
        comment: z.string().nullish(),
        categories: z.array(z.string()).optional(),
        imageKey: z.string().nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.imageKey) {
        const image = await utapi.getFileUrls(input.imageKey);
        if (!image.length) throw Error("Inavlid image upload key");
      }

      const { categories, cons, pros, ...value } = input;
      return reviewRepository
        .createWithCategories(
          {
            ...value,
            cons: cons?.filter(Boolean).join("\n"),
            pros: pros?.filter(Boolean).join("\n"),
            userId: ctx.session.user.id,
          },
          categories
        )
        .then(() => void 0)
        .catch((e) => {
          console.error(e);
          if (input.imageKey) {
            utapi.deleteFiles(input.imageKey).catch(console.error);
          }
          throw Error("Couldn't post the review");
        });
    }),
  getUserReview: protectedProcedure.input(z.string()).query(({ input, ctx }) => {
    return reviewRepository
      .findFirstWithCategories((table, { and, eq }) =>
        and(eq(table.barcode, input), eq(table.userId, ctx.session.user.id))
      )
      .then((data) => data);
  }),
  getReviewImage: protectedProcedure.input(z.string()).query(({ input }) => {
    return utapi.getFileUrls(input).then((x) => x[0]?.url);
  }),
});
