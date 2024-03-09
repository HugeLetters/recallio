import { db } from "@/server/database";
import { count, query } from "@/server/database/query/utils";
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

// todo - return new data from mutations to cache on client

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

      function getCategoriesBatch() {
        if (!categories) return [];

        const batch = db
          .delete(reviewsToCategories)
          .where(
            and(
              eq(reviewsToCategories.userId, reviewData.userId),
              eq(reviewsToCategories.barcode, reviewData.barcode),
            ),
          );
        const categoryValues = categories.filter(Boolean).map((category) => ({ name: category }));
        if (!nonEmptyArray(categoryValues)) return [batch] satisfies [unknown];

        return [
          batch,
          db.insert(category).values(categoryValues).onConflictDoNothing(),
          db
            .insert(reviewsToCategories)
            .values(
              categories.map((category) => ({
                barcode: reviewData.barcode,
                userId: reviewData.userId,
                category,
              })),
            )
            .onConflictDoNothing(),
        ] satisfies [unknown, unknown, unknown];
      }

      return db
        .batch([
          db
            .insert(review)
            .values(reviewData)
            .onConflictDoUpdate({ target: [review.userId, review.barcode], set: reviewData }),
          ...getCategoriesBatch(),
        ])
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
          // todo - 1) put this into transaction 2) add file key to pending delete, delete files in cron
          return void utapi.deleteFiles(review.imageKey);
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
      const userId = ctx.session.user.id;
      const filter = and(eq(review.userId, userId), eq(review.barcode, barcode));

      return db
        .batch([
          db.select({ imageKey: review.imageKey }).from(review).where(filter),
          db.update(review).set({ imageKey: null }).where(filter),
        ])
        .then(([[review]]) => {
          if (!review) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Couldn't find your review for barcode ${barcode}.`,
            });
          }

          if (!review.imageKey) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `No image attached to your review for barcode ${barcode}.`,
            });
          }

          // todo - 1) put this into transaction 2) add file key to pending delete, delete files in cron
          return void utapi.deleteFiles(review.imageKey);
        })
        .catch((e) => throwDefaultError(e, "Failed to delete image"));
    }),
});
