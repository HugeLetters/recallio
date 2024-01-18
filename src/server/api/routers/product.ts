import { db } from "@/database";
import { aggregateArrayColumn, countCol, nullableMap } from "@/database/query/utils";
import { user } from "@/database/schema/auth";
import { category, review, reviewsToCategories } from "@/database/schema/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cacheProductNames, getProductNames } from "@/server/redis";
import { getFileUrl } from "@/server/uploadthing";
import getScrapedProducts from "@/server/utils/scrapers";
import { getTopQuadruplet } from "@/utils";
import { and, asc, desc, eq, gt, like, lt, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { throwDefaultError } from "../utils";
import { createPaginationCursor, type Paginated } from "../utils/pagination";

const productSummaryListCursorSchema = z.object({
  barcode: z.string(),
  sorted: z.number(),
});
type ProductSummaryListCursor = z.infer<typeof productSummaryListCursorSchema>;
const productSummaryListQuery = protectedProcedure
  .input(
    z
      .object({ filter: z.string().optional() })
      .merge(createPaginationCursor(productSummaryListCursorSchema, ["reviews", "rating"])),
  )
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
        names: aggregateArrayColumn<string>(review.name)
          .mapWith(getTopQuadruplet<string>)
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
      .then((page): Paginated<typeof page, ProductSummaryListCursor> => {
        if (!page.length) return { page, cursor: null };
        const lastPage = page.at(-1);
        if (!lastPage) return { page, cursor: null };

        return {
          page,
          cursor: {
            barcode: lastPage.barcode,
            sorted: sort.by === "rating" ? lastPage.averageRating : lastPage.reviewCount,
          },
        };
      })
      .catch(throwDefaultError);
  });

const productReviewsCursorSchema = z.object({
  author: z.string(),
  sorted: z.number().or(z.coerce.date()),
});
type ProductReviewsCursor = z.infer<typeof productReviewsCursorSchema>;
const productReviewsQuery = protectedProcedure
  .input(
    z
      .object({ barcode: z.string() })
      .merge(createPaginationCursor(productReviewsCursorSchema, ["date", "rating"])),
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
        authorAvatar: sql`${user.image}`.mapWith(nullableMap(getFileUrl)),
      })
      .from(review)
      .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false), cursorClause))
      .innerJoin(user, eq(user.id, review.userId))
      .limit(limit)
      .orderBy(direction(sortBy), asc(review.userId))
      .then((page): Paginated<typeof page, ProductReviewsCursor> => {
        if (!page.length) return { page, cursor: null };
        const lastPage = page.at(-1);
        if (!lastPage) return { page, cursor: null };

        return {
          page,
          cursor: {
            author: lastPage.authorId,
            sorted: sort.by === "rating" ? lastPage.rating : lastPage.updatedAt,
          },
        };
      })
      .catch(throwDefaultError);
  });

export const productRouter = createTRPCRouter({
  getProductNames: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ input: { barcode } }): Promise<string[]> => {
      const cachedProducts = await getProductNames(barcode);
      if (cachedProducts) return cachedProducts;

      const scrapedProducts = await getScrapedProducts(barcode);
      cacheProductNames(barcode, scrapedProducts).catch(console.error);

      return scrapedProducts;
    }),
  getCategories: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        filter: z.string(),
        limit: z.number(),
      }),
    )
    .query(({ input: { filter, cursor, limit } }) =>
      db
        .select()
        .from(category)
        .where(
          and(like(category.name, `${filter}%`), cursor ? gt(category.name, cursor) : undefined),
        )
        .limit(limit)
        .orderBy(category.name)
        .then((data) => data.map((x) => x.name))
        .catch(throwDefaultError),
    ),
  getProductSummaryList: productSummaryListQuery,
  getProductReviews: productReviewsQuery,
  getProductSummary: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(({ input: { barcode } }) => {
      return db
        .select({
          averageRating: sql`avg(${review.rating})`.mapWith((x) => +x),
          reviewCount: countCol(),
          imageKey: sql`min(${review.imageKey})`.mapWith(nullableMap(getFileUrl)),
          categories: aggregateArrayColumn(reviewsToCategories.category).mapWith(
            getTopQuadruplet<string>,
          ),
        })
        .from(review)
        .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false)))
        .leftJoin(
          reviewsToCategories,
          and(
            eq(reviewsToCategories.userId, review.userId),
            eq(reviewsToCategories.barcode, review.barcode),
          ),
        )
        .groupBy(review.barcode)
        .limit(1)
        .then(([x]) => x)
        .catch(throwDefaultError);
    }),
});
