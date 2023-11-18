import { db } from "@/database";
import { createReview } from "@/database/query/review";
import { aggregateArrayColumn, count, findFirst } from "@/database/query/utils";
import { review, reviewsToCategories } from "@/database/schema/product";
import { getFileUrl } from "@/server/uploadthing";
import { mapUtKeysToUrls } from "@/server/utils";
import type { StrictOmit } from "@/utils";
import type { AsyncResult } from "@/utils/api";
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
            eq(review.barcode, reviewsToCategories.barcode)
          )
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
      })
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
                            like(reviewsToCategories.category, `${filter}%`)
                          )
                        )
                    )
                  )
                : undefined
            )
          )
          .leftJoin(
            reviewsToCategories,
            and(
              eq(review.userId, reviewsToCategories.userId),
              eq(review.barcode, reviewsToCategories.barcode)
            )
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
      }
    ),
  getReviewCount: protectedProcedure.query(({ ctx }) =>
    count(review, eq(review.userId, ctx.session.user.id)).then(([data]) => data?.count)
  ),
  deleteReviewImage: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .mutation(async ({ ctx, input: { barcode } }) => {
      const [reviewData] = await findFirst(
        review,
        and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode))
      );
      if (!reviewData) return;

      const oldKey = reviewData.imageKey;

      return db
        .update(review)
        .set({ imageKey: null })
        .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)))
        .then(() => {
          if (!oldKey) return;

            utapi.deleteFiles(oldKey).catch(console.error);
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
type ReviewSummary =
  | StrictOmit<
      InferColumnsDataTypes<StrictOmit<typeof reviewSummaryCols, "categories">> & {
        categories: string[];
      },
      "imageKey"
    > & { image: string | null };
