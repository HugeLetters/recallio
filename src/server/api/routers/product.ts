import { db } from "@/database";
import { aggregateArrayColumn } from "@/database/query/utils";
import { category, review } from "@/database/schema/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cacheProductNames, getProductNames } from "@/server/redis";
import { mapUtKeysToUrls } from "@/server/utils";
import getScrapedProducts from "@/server/utils/scrapers";
import { getTopQuadruplet } from "@/utils";
import { and, asc, desc, eq, gt, inArray, like, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { z } from "zod";

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
  getCategories: protectedProcedure.input(z.string()).query(({ input }) =>
    db
      .select()
      .from(category)
      .where(like(category.name, `${input}%`))
      .limit(10)
      .then((data) => data.map((x) => x.name))
  ),
  getProductSummaryList: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100),
        /** last barcode from previous page */
        cursor: z
          .object({
            barcode: z.string(),
            value: z.number(),
          })
          .optional(),
        sort: z.object({
          by: z.enum(["reviews", "rating"]),
          desc: z.boolean(),
        }),
        /** Filter by name */
        filter: z.string().optional(),
      })
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

      const reviewCol = sql`count(*)`.mapWith((x) => +x).as("reviewCount");
      const ratingCol = sql`sum(${review.rating})/count(*)`.mapWith((x) => +x).as("averageRating");
      const direction = sort.desc ? desc : asc;
      const sortBy = getSortByColumn();

      const product = alias(review, "in-array-subquery");
      const inArrayClause = filter
        ? inArray(
            review.barcode,
            db
              .select({ barcode: product.barcode })
              .from(product)
              .where(and(like(product.name, `${filter}%`), eq(product.isPrivate, false)))
          )
        : undefined;
      const sq = db
        .select({
          barcode: review.barcode,
          names: aggregateArrayColumn<string>(review.name)
            .mapWith(getTopQuadruplet<string>)
            .as("barcode-name-list"),
          averageRating: ratingCol,
          reviewCount: reviewCol,
          image: sql<string>`MIN(${review.imageKey})`.as("min-image-key"),
        })
        .from(review)
        .where(and(inArrayClause, eq(review.isPrivate, false)))
        .groupBy(review.barcode)
        .as("join-subquery");

      const cursorClause = cursor
        ? or(
            (sort.desc ? lt : gt)(sortBy, cursor.value),
            and(gt(review.barcode, cursor.barcode), eq(sortBy, cursor.value))
          )
        : undefined;
      return db
        .select({
          barcode: review.barcode,
          matchedName: sql<string>`MIN(${review.name})`,
          name: sq.names,
          imageKey: sq.image,
          averageRating: sq.averageRating,
          reviewCount: sq.reviewCount,
        })
        .from(review)
        .where(
          and(
            filter ? like(review.name, `${filter}%`) : undefined,
            eq(review.isPrivate, false),
            cursorClause
          )
        )
        .leftJoin(sq, and(eq(sq.barcode, review.barcode)))
        .limit(limit)
        .groupBy(review.barcode)
        .orderBy(direction(sortBy), asc(review.barcode))
        .then((summaryList) => mapUtKeysToUrls(summaryList, "imageKey", "image"))
        .then((page) => {
          return {
            // this does result in an extra request if the last page is exactly the size of a limit but that's a low cost imo
            cursor:
              page.length === limit
                ? {
                    barcode: page.at(-1)?.barcode,
                    value:
                      sort.by === "rating" ? page.at(-1)?.averageRating : page.at(-1)?.reviewCount,
                  }
                : undefined,
            page,
          };
        });
    }),
});
