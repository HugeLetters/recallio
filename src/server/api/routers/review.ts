import { reviewRepository } from "@/database/repository/product";
import type { StrictOmit } from "@/utils";
import type { AsyncResult } from "@/utils/api";
import { getTableColumns } from "drizzle-orm";
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
    .query(async ({ ctx, input: { barcode } }): Promise<UserReview> => {
      const data = await reviewRepository
        .findFirstWithCategories((table, { and, eq }) =>
          and(eq(table.userId, ctx.session.user.id), eq(table.barcode, barcode))
        )
        .then((data) => data ?? null);
      if (!data) return null;

      const { imageKey, ...review } = data;
      if (!imageKey) return Object.assign(review, { image: null });

      const image = await utapi.getFileUrls(imageKey).then((utFiles) => utFiles[0]?.url ?? null);
      return Object.assign(review, { image });
    }),
  getUserReviewSummaries: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1),
        /** zero-based index */
        cursor: z.number().int().min(0),
        sort: z.object({
          by: z.enum(
            Object.keys(getTableColumns(reviewRepository.table)) as [
              ReviewColumns,
              ...Array<ReviewColumns>
            ]
          ),
          desc: z.boolean(),
        }),
      })
    )
    .query(
      async ({
        input: { cursor, limit, sort },
        ctx,
      }): Promise<{ cursor: number | undefined; page: ReviewSummary[] }> => {
        const page = await Promise.all(
          await reviewRepository
            .findReviewSummaries((table, { eq }) => eq(table.userId, ctx.session.user.id), {
              page: { cursor, limit },
              sort,
            })
            .then((summaries) =>
              summaries.map(async (summary): Promise<ReviewSummary> => {
                const { imageKey, ...rest } = summary;
                const image = imageKey
                  ? await utapi.getFileUrls(imageKey).then((utFiles) => utFiles[0]?.url ?? null)
                  : null;
                return Object.assign(rest, { image });
              })
            )
        );

        return {
          // this does result in an extra request if the last page is exactly the size of a limit but that's a low cost imo
          cursor: page.length === limit ? cursor + 1 : undefined,
          page,
        };
      }
    ),
  getReviewCount: protectedProcedure.query(({ ctx }) => {
    return reviewRepository
      .count((table, { eq }) => eq(table.userId, ctx.session.user.id))
      .then((x) => x);
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

type UserReview =
  | (StrictOmit<
      NonNullable<Awaited<ReturnType<(typeof reviewRepository)["findFirstWithCategories"]>>>,
      "imageKey"
    > & { image: string | null })
  | null;
type ReviewSummary =
  | StrictOmit<
      NonNullable<Awaited<ReturnType<(typeof reviewRepository)["findReviewSummaries"]>>>[number],
      "imageKey"
    > & { image: string | null };
type ReviewColumns = keyof ReturnType<typeof getTableColumns<(typeof reviewRepository)["table"]>>;
