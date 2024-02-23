import { db } from "@/database";
import { aggregateArrayColumn, countCol, nullableMap } from "@/database/query/utils";
import { user } from "@/database/schema/auth";
import { category, review, reviewsToCategories } from "@/database/schema/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cacheProductNames, getProductNames } from "@/server/redis";
import { getFileUrl } from "@/server/uploadthing";
import getScrapedProducts from "@/server/utils/scrapers";
import { mostCommonItems } from "@/utils/array";
import { and, asc, desc, eq, exists, gt, like, lt, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";
import { throwDefaultError } from "../utils";
import { createPagination } from "../utils/pagination";
import type { Paginated } from "../utils/pagination";
import { createBarcodeSchema } from "../utils/zod";

const productSummaryListPagination = createPagination(
  z.object({
    barcode: createBarcodeSchema(undefined),
    sorted: z.number(),
  }),
  ["reviews", "rating"],
);
const productSummaryListQuery = protectedProcedure
  .input(z.object({ filter: z.string().optional() }).merge(productSummaryListPagination.schema))
  .query(({ input: { limit, cursor, sort, filter } }) => {
    function getSortByColumn(): SQL.Aliased<number> {
      switch (sort.by) {
        case "reviews":
          return reviewCol;
        case "rating":
          return ratingCol;
        default:
          const x: never = sort.by;
          return x;
      }
    }

    const reviewCol = countCol().as("review-count");
    const ratingCol = sql`avg(${review.rating})`.mapWith((x) => +x).as("average-rating");
    const direction = sort.desc ? desc : asc;

    const sortBy = getSortByColumn();
    const sq = db
      .select({
        barcode: review.barcode,
        names: aggregateArrayColumn(review.name)
          .mapWith(mostCommonItems(4)<string>)
          .as("names"),
        averageRating: ratingCol,
        reviewCount: reviewCol,
        image: sql<string>`min(${review.imageKey})`.as("image"),
      })
      .from(review)
      .where(eq(review.isPrivate, false))
      .groupBy(review.barcode)
      .as("names-subquery");

    const cursorClause = cursor
      ? or(
          (sort.desc ? lt : gt)(sortBy, cursor.sorted),
          and(gt(review.barcode, cursor.barcode), eq(sortBy, cursor.sorted)),
        )
      : undefined;

    return db
      .select({
        barcode: review.barcode,
        matchedName: sql<string>`min(${review.name})`,
        names: sq.names,
        averageRating: sq.averageRating,
        reviewCount: sq.reviewCount,
        image: sql`${sq.image}`.mapWith(nullableMap(getFileUrl)),
      })
      .from(review)
      .where(
        and(
          eq(review.isPrivate, false),
          filter ? like(review.name, `${filter}%`) : undefined,
          cursorClause,
        ),
      )
      .leftJoin(sq, eq(review.barcode, sq.barcode))
      .groupBy(review.barcode)
      .orderBy(direction(sortBy), asc(review.barcode))
      .limit(limit)
      .then((page): Paginated<typeof page> => {
        if (!page.length) return { page };
        const lastPage = page.at(-1);
        if (!lastPage) return { page };

        return {
          page,
          cursor: productSummaryListPagination.encode({
            barcode: lastPage.barcode,
            sorted: sort.by === "rating" ? lastPage.averageRating : lastPage.reviewCount,
          }),
        };
      })
      .catch(throwDefaultError);
  });

const productReviewsPagination = createPagination(
  z.object({
    author: z.string(),
    sorted: z.number().or(z.coerce.date()),
  }),
  ["date", "rating"],
);
const productReviewsQuery = protectedProcedure
  .input(
    z
      .object({
        barcode: createBarcodeSchema("Barcode is required to get review list for a product"),
      })
      .merge(productReviewsPagination.schema),
  )
  .query(({ input: { barcode, limit, sort, cursor } }) => {
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
          and(gt(review.userId, cursor.author), eq(sortBy, cursor.sorted)),
        )
      : undefined;

    return db
      .select({
        rating: review.rating,
        pros: review.pros,
        cons: review.cons,
        comment: review.comment,
        updatedAt: review.updatedAt,
        authorId: review.userId,
        authorAvatar: sql`${user.image}`.mapWith((imageKey: string | null) => {
          if (!imageKey) return null;
          return URL.canParse(imageKey) ? imageKey : getFileUrl(imageKey);
        }),
        authorName: user.name,
      })
      .from(review)
      .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false), cursorClause))
      .innerJoin(user, eq(user.id, review.userId))
      .limit(limit)
      .orderBy(direction(sortBy), asc(review.userId))
      .then((page): Paginated<typeof page> => {
        if (!page.length) return { page };
        const lastProduct = page.at(-1);
        if (!lastProduct) return { page };

        return {
          page,
          cursor: productReviewsPagination.encode({
            author: lastProduct.authorId,
            sorted: sort.by === "rating" ? lastProduct.rating : lastProduct.updatedAt,
          }),
        };
      })
      .catch(throwDefaultError);
  });

export const productRouter = createTRPCRouter({
  getProductNames: protectedProcedure
    .input(z.object({ barcode: createBarcodeSchema(undefined) }))
    .query(({ input: { barcode } }): Promise<string[]> => {
      return getProductNames(barcode)
        .then((cached) => {
          if (cached) return cached;

          return getScrapedProducts(barcode).then((products) => {
            cacheProductNames(barcode, products).catch(console.error);
            return products;
          });
        })
        .catch(throwDefaultError);
    }),
  getCategories: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        filter: z.string(),
        limit: z.number(),
      }),
    )
    .query(({ input: { filter, cursor, limit } }) => {
      return db
        .select()
        .from(category)
        .where(
          and(like(category.name, `${filter}%`), cursor ? gt(category.name, cursor) : undefined),
        )
        .limit(limit)
        .orderBy(category.name)
        .then((data) => data.map((x) => x.name))
        .catch(throwDefaultError);
    }),
  getProductSummaryList: productSummaryListQuery,
  getProductReviews: productReviewsQuery,
  getProductSummary: protectedProcedure
    .input(
      z.object({ barcode: createBarcodeSchema("Barcode is required to request product data") }),
    )
    .query(({ input: { barcode } }) => {
      const categorySq = db
        .select({
          barcode: reviewsToCategories.barcode,
          categories: aggregateArrayColumn(reviewsToCategories.category).as("categories"),
        })
        .from(reviewsToCategories)
        .where(
          and(
            eq(reviewsToCategories.barcode, barcode),
            exists(
              db
                .select()
                .from(review)
                .where(
                  and(eq(review.barcode, reviewsToCategories.barcode), eq(review.isPrivate, false)),
                ),
            ),
          ),
        )
        .groupBy(reviewsToCategories.barcode)
        .as("category-subquery");

      return db
        .select({
          name: aggregateArrayColumn(review.name).mapWith(
            (arr: string[]) => mostCommonItems(1)(arr)[0]!,
          ),
          rating: sql`avg(${review.rating})`.mapWith((x) => +x),
          reviewCount: countCol(),
          image: sql`min(${review.imageKey})`.mapWith(nullableMap(getFileUrl)),
          categories: sql`${categorySq.categories}`.mapWith(
            nullableMap(mostCommonItems(3)<string>),
          ),
        })
        .from(review)
        .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false)))
        .leftJoin(categorySq, eq(review.barcode, categorySq.barcode))
        .groupBy(review.barcode)
        .limit(1)
        .then(([x]) => x ?? null)
        .catch(throwDefaultError);
    }),
});
