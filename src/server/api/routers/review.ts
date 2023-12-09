import { db } from "@/database";
import { upsertReview } from "@/database/query/review";
import { aggregateArrayColumn, count, findFirst } from "@/database/query/utils";
import { review, reviewsToCategories } from "@/database/schema/product";
import { getFileUrl, utapi } from "@/server/uploadthing";
import { mapUtKeysToUrls } from "@/server/utils";
import type { StrictOmit } from "@/utils";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  like,
  or,
  type InferColumnsDataTypes,
} from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const trimmedStringSchema = z.string().transform((string) => string.trim());
export const reviewRouter = createTRPCRouter({
  upsertReview: protectedProcedure
    .input(
      z
        .object({
          barcode: z.string(),
          name: z.string(),
          rating: z.number(),
          pros: trimmedStringSchema.nullish(),
          cons: trimmedStringSchema.nullish(),
          comment: trimmedStringSchema.nullish(),
          isPrivate: z.boolean(),
          categories: z.array(z.string().min(1).max(25)).optional(),
        })
        // enforce default behaviour - we don't wanna update imageKey here
        .strip(),
    )
    .mutation(async ({ input, ctx }) => {
      const { categories, ...value } = input;
      return upsertReview({ ...value, userId: ctx.session.user.id }, categories?.filter(Boolean))
        .then(() => void 0)
        .catch((e) => {
          console.error(e);
          throw new TRPCError({
            message: "Couldn't post the review",
            code: "INTERNAL_SERVER_ERROR",
          });
        });
    }),
  getUserReview: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ ctx, input: { barcode } }): Promise<UserReview> => {
      const data = await db
        .select({
          ...userReviewCols,
          categories: aggregateArrayColumn<string>(reviewsToCategories.category),
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
        .then(([data]) => data);

      if (!data) return null;

      const { imageKey, ...reviewData } = data;
      return Object.assign(reviewData, { image: imageKey ? getFileUrl(imageKey) : null });
    }),
  getUserReviewSummaryList: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100),
        /** zero-based index */
        cursor: z.number().int().min(0),
        sort: z.object({
          by: z.enum(["updatedAt", "rating"] satisfies [ReviewColumns, ...ReviewColumns[]]),
          desc: z.boolean(),
        }),
        /** Filter by name or category */
        filter: z.string().optional(),
      }),
    )
    .query(
      async ({
        input: { cursor, limit, sort, filter },
        ctx,
      }): Promise<{ cursor: number | undefined; page: ReviewSummary[] }> => {
        const direction = sort.desc ? desc : asc;
        const page = await db
          .select(reviewSummaryCols)
          .from(review)
          .where(
            and(
              eq(review.userId, ctx.session.user.id),
              filter
                ? or(
                    like(review.name, `${filter}%`),
                    inArray(
                      review.barcode,
                      db
                        .select({ barcode: reviewsToCategories.barcode })
                        .from(reviewsToCategories)
                        .where(
                          and(
                            eq(reviewsToCategories.userId, ctx.session.user.id),
                            like(reviewsToCategories.category, `${filter}%`),
                          ),
                        ),
                    ),
                  )
                : undefined,
            ),
          )
          .leftJoin(
            reviewsToCategories,
            and(
              eq(review.userId, reviewsToCategories.userId),
              eq(review.barcode, reviewsToCategories.barcode),
            ),
          )
          .groupBy(review.barcode, review.userId)
          .limit(limit)
          .offset(cursor * limit)
          .orderBy(direction(review[sort.by]), review.barcode)
          .then((summaries) => mapUtKeysToUrls(summaries, "imageKey", "image"));

        return {
          // this does result in an extra request if the last page is exactly the size of a limit but that's a low cost imo
          cursor: page.length === limit ? cursor + 1 : undefined,
          page,
        };
      },
    ),
  getReviewCount: protectedProcedure.query(({ ctx }) =>
    count(review, eq(review.userId, ctx.session.user.id)).then(([data]) => data?.count),
  ),
  deleteReview: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input: { barcode } }) => {
      const { imageKey } = await findFirst(
        review,
        and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)),
      ).then(
        ([reviewData]) => {
          if (!reviewData) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Couldn't find your review for barcode ${barcode}.`,
            });
          }

          return reviewData;
        },
        (err) => {
          console.error(err);

          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        },
      );

      return db
        .transaction(async (tx) => {
          await tx
            .delete(reviewsToCategories)
            .where(
              and(
                eq(reviewsToCategories.userId, ctx.session.user.id),
                eq(reviewsToCategories.barcode, barcode),
              ),
            );

          await tx
            .delete(review)
            .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)));
        })
        .then(() => {
          if (!imageKey) return;

          utapi.deleteFiles(imageKey).catch(console.error);
        })
        .catch((err) => {
          console.error(err);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Couldn't delete your review for barcode ${barcode}.`,
          });
        });
    }),
  deleteReviewImage: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input: { barcode } }) => {
      const { imageKey } = await findFirst(
        review,
        and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)),
      ).then(
        ([reviewData]) => {
          if (!reviewData) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Couldn't find your review for barcode ${barcode}.`,
            });
          }

          return reviewData;
        },
        (err) => {
          console.error(err);

          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        },
      );

      return db
        .update(review)
        .set({ imageKey: null })
        .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)))
        .then(() => {
          if (!imageKey) return;

          utapi.deleteFiles(imageKey).catch(console.error);
        })
        .catch((err) => {
          console.error(err);

          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Couldn't delete image" });
        });
    }),
});

const { barcode: _, userId: __, ...userReviewCols } = getTableColumns(review);
type UserReview =
  | (StrictOmit<InferColumnsDataTypes<typeof userReviewCols>, "imageKey"> & {
      image: string | null;
      categories: string[];
    })
  | null;

type ReviewColumns = keyof ReturnType<typeof getTableColumns<typeof review>>;
const reviewSummaryCols = {
  barcode: review.barcode,
  name: review.name,
  imageKey: review.imageKey,
  rating: review.rating,
  categories: aggregateArrayColumn<string>(reviewsToCategories.category),
};
type ReviewSummary = StrictOmit<
  InferColumnsDataTypes<StrictOmit<typeof reviewSummaryCols, "categories">> & {
    categories: string[];
  },
  "imageKey"
> & { image: string | null };
