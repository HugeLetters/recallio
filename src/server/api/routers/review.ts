import { db } from "@/server/database";
import { count, findFirst, query } from "@/server/database/query/utils";
import type { ReviewInsert } from "@/server/database/schema/product";
import { category, review, reviewsToCategories } from "@/server/database/schema/product";
import { getFileUrl, utapi } from "@/server/uploadthing";
import { nonEmptyArray } from "@/utils/array";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, like, lt, or } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { throwDefaultError } from "../utils";
import type { Paginated } from "../utils/pagination";
import { createPagination } from "../utils/pagination";
import {
  coercedStringSchema,
  createBarcodeSchema,
  createLongTextSchema,
  createMaxLengthMessage,
  createMinLengthMessage,
} from "../utils/zod";

const reviewSummaryPagination = createPagination(
  z.object({
    barcode: createBarcodeSchema(undefined),
    sorted: z.number().or(z.coerce.date()),
  }),
  ["date", "rating"],
);
const userReviewSummaryListQuery = protectedProcedure
  .input(
    z
      .object({
        /** Filter by name or category */
        filter: z.string().optional(),
      })
      .merge(reviewSummaryPagination.schema),
  )
  .query(async ({ input: { cursor, limit, sort, filter }, ctx: { session } }) => {
    function getSortByColumn() {
      switch (sort.by) {
        case "date":
          return review.updatedAt;
        case "rating":
          return review.rating;
        default:
          const x: never = sort.by;
          return x;
      }
    }

    const direction = sort.desc ? desc : asc;
    const sortBy = getSortByColumn();
    const cursorClause = cursor
      ? or(
          (sort.desc ? lt : gt)(sortBy, cursor.sorted),
          and(gt(review.barcode, cursor.barcode), eq(sortBy, cursor.sorted)),
        )
      : undefined;
    const filterClause = filter
      ? or(
          like(review.name, `${filter}%`),
          inArray(
            review.barcode,
            db
              .select({ barcode: reviewsToCategories.barcode })
              .from(reviewsToCategories)
              .where(
                and(
                  eq(reviewsToCategories.userId, session.user.id),
                  like(reviewsToCategories.category, `${filter}%`),
                ),
              ),
          ),
        )
      : undefined;

    return db
      .select({
        barcode: review.barcode,
        name: review.name,
        image: query.map(review.imageKey, getFileUrl),
        rating: review.rating,
        updatedAt: review.updatedAt,
        categories: query.aggregate(reviewsToCategories.category),
      })
      .from(review)
      .where(and(eq(review.userId, session.user.id), filterClause, cursorClause))
      .leftJoin(
        reviewsToCategories,
        and(
          eq(review.userId, reviewsToCategories.userId),
          eq(review.barcode, reviewsToCategories.barcode),
        ),
      )
      .groupBy(review.userId, review.barcode)
      .limit(limit)
      .orderBy(direction(sortBy), asc(review.barcode))
      .then((page): Paginated<typeof page> => {
        if (!page.length) return { page };
        const lastReview = page.at(-1);
        if (!lastReview) return { page };
        return {
          // this does result in an extra request if the last page is exactly the size of a limit but that's a low cost imo
          cursor: reviewSummaryPagination.encode({
            barcode: lastReview.barcode,
            sorted: sort.by === "date" ? lastReview.updatedAt : lastReview.rating,
          }),
          page,
        };
      })
      .catch(throwDefaultError);
  });

export const reviewRouter = createTRPCRouter({
  upsertReview: protectedProcedure
    .input(
      z
        .object({
          barcode: createBarcodeSchema("Barcode is required to create a review"),
          name: coercedStringSchema({
            required_error: "Product name is required to create a review",
          })
            .min(6, createMinLengthMessage("Product name", 6))
            .max(60, createMaxLengthMessage("Product name", 60)),
          rating: z
            .number()
            .int("Rating has to be an integer")
            .min(0, "Rating can't be less than 0")
            .max(5, "Rating can't be greater than 5"),
          pros: createLongTextSchema("Pros", 4095).nullish(),
          cons: createLongTextSchema("Cons", 4095).nullish(),
          comment: createLongTextSchema("Comment", 2047).nullish(),
          isPrivate: z.boolean(),
          categories: z
            .array(
              z
                .string()
                .min(1, createMinLengthMessage("A single category", 1))
                .max(25, createMaxLengthMessage("A single category", 25)),
            )
            .max(25, "Review can't have more than 25 categories")
            .optional(),
        })
        // enforce default behaviour - we don't wanna update imageKey here
        .strip(),
    )
    .mutation(async ({ input, ctx }) => {
      const { categories, ...value } = input;
      const reviewData: ReviewInsert = {
        ...value,
        userId: ctx.session.user.id,
        // override updatedAt value with current time
        updatedAt: new Date(),
      };

      // todo - check libsql/turso batching
      return db
        .transaction(async (tx) => {
          await tx
            .insert(review)
            .values(reviewData)
            .onConflictDoUpdate({ target: [review.userId, review.barcode], set: reviewData });
          if (!categories) return;

          await tx
            .delete(reviewsToCategories)
            .where(
              and(
                eq(reviewsToCategories.userId, reviewData.userId),
                eq(reviewsToCategories.barcode, reviewData.barcode),
              ),
            );
          const categoryValues = categories.filter(Boolean).map((category) => ({ name: category }));
          if (!nonEmptyArray(categoryValues)) return;

          await tx.insert(category).values(categoryValues).onConflictDoNothing();

          await tx
            .insert(reviewsToCategories)
            .values(
              categories.map((category) => ({
                barcode: reviewData.barcode,
                userId: reviewData.userId,
                category,
              })),
            )
            .onConflictDoNothing();
        })
        .catch((e) => throwDefaultError(e, "Failed to post the review"));
    }),
  getUserReview: protectedProcedure
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
    }),
  getUserReviewSummaryList: userReviewSummaryListQuery,
  getReviewCount: protectedProcedure.query(({ ctx: { session } }) => {
    return count(review, eq(review.userId, session.user.id));
  }),
  deleteReview: protectedProcedure
    .input(z.object({ barcode: createBarcodeSchema("Barcode is required to delete a review") }))
    .mutation(async ({ ctx, input: { barcode } }) => {
      const { imageKey } = await findReviewImageKey(ctx.session.user.id, barcode);
      // todo - check batching
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
        .catch((e) => throwDefaultError(e, `Failed to delete your review for barcode ${barcode}.`));
    }),
  deleteReviewImage: protectedProcedure
    .input(
      z.object({
        barcode: createBarcodeSchema("Barcode is required to delete an image from a review"),
      }),
    )
    .mutation(async ({ ctx, input: { barcode } }) => {
      const { imageKey } = await findReviewImageKey(ctx.session.user.id, barcode);

      return db
        .update(review)
        .set({ imageKey: null })
        .where(and(eq(review.userId, ctx.session.user.id), eq(review.barcode, barcode)))
        .returning()
        .get()
        .then((review) => {
          // todo - check if this can be one single query with returing
          console.log(review.imageKey);
          if (!imageKey) return;

          utapi.deleteFiles(imageKey).catch(console.error);
        })
        .catch((e) => throwDefaultError(e, "Failed to delete image"));
    }),
});

function findReviewImageKey(userId: string, barcode: string) {
  return findFirst(review, and(eq(review.userId, userId), eq(review.barcode, barcode)))
    .catch(throwDefaultError)
    .then((reviewData) => {
      if (!reviewData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Couldn't find your review for barcode ${barcode}.`,
        });
      }

      return reviewData;
    });
}
