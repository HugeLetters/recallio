import { db } from "@/database";
import { upsertReview } from "@/database/query/review";
import { aggregateArrayColumn, count, findFirst, nullableMap } from "@/database/query/utils";
import { review, reviewsToCategories } from "@/database/schema/product";
import { getFileUrl, utapi } from "@/server/uploadthing";
import type { NonEmptyArray, StrictOmit } from "@/utils/type";
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
  sql,
  type InferColumnsDataTypes,
} from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { throwDefaultError } from "../utils";
import { createPaginationCursor } from "../utils/pagination";

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
        .catch((e) => throwDefaultError(e, "Couldn't post the review"));
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
      z
        .object({
          /** Filter by name or category */
          filter: z.string().optional(),
        })
        .merge(
          createPaginationCursor(z.number().int().min(0), [
            "updatedAt",
            "rating",
          ] satisfies NonEmptyArray<ReviewColumns>),
        ),
    )
    .query(
      async ({
        input: { cursor, limit, sort, filter },
        ctx,
      }): Promise<{ cursor: number | undefined; page: ReviewSummary[] }> => {
        cursor ??= 0;
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
          .orderBy(direction(review[sort.by]), review.barcode);

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
      ).then(([reviewData]) => {
        if (!reviewData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Couldn't find your review for barcode ${barcode}.`,
          });
        }

        return reviewData;
      }, throwDefaultError);

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
        .catch((e) => throwDefaultError(e, `Couldn't delete your review for barcode ${barcode}.`));
    }),
  deleteReviewImage: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input: { barcode } }) => {
      const { imageKey } = await findFirst(
        review,
        and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)),
      ).then(([reviewData]) => {
        if (!reviewData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Couldn't find your review for barcode ${barcode}.`,
          });
        }

        return reviewData;
      }, throwDefaultError);

      return db
        .update(review)
        .set({ imageKey: null })
        .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)))
        .then(() => {
          if (!imageKey) return;

          utapi.deleteFiles(imageKey).catch(console.error);
        })
        .catch((e) => throwDefaultError(e, "Couldn't delete image"));
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
  image: sql`${review.imageKey}`.mapWith(nullableMap(getFileUrl)),
  rating: review.rating,
  categories: aggregateArrayColumn<string>(reviewsToCategories.category),
};
type ReviewSummary = InferColumnsDataTypes<
  StrictOmit<typeof reviewSummaryCols, "categories" | "image">
> & {
  categories: string[];
  image: string | null;
};
