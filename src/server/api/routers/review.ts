import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { reviewRepository } from "@/database/repository/product";

export const reviewRouter = createTRPCRouter({
  createReview: protectedProcedure
    .input(
      z.object({
        barcode: z.string(),
        name: z.string(),
        rating: z.number(),
        pros: z.array(z.string().optional()).optional(),
        cons: z.array(z.string().optional()).optional(),
        comment: z.string().optional(),
        categories: z.array(z.string()).optional(),
        image: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const { categories, cons, pros, ...value } = input;
      reviewRepository
        .create({
          barcode: value.barcode,
          name: value.name,
          comment: value.comment,
          rating: value.rating,
          cons: cons?.filter(Boolean).join("\n"),
          image: "", // do image upload
          pros: pros?.filter(Boolean).join("\n"),
          userId: ctx.session.user.id,
        })
        .catch(console.error);
    }),
});
