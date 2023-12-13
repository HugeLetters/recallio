import { db } from "@/database";
import { aggregateArrayColumn } from "@/database/query/utils";
import { category, review } from "@/database/schema/product";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cacheProductNames, getProductNames } from "@/server/redis";
import { mapUtKeysToUrls } from "@/server/utils";
import getScrapedProducts from "@/server/utils/scrapers";
import { getTopQuadruplet } from "@/utils";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, like, lt, or, sql, type SQL } from "drizzle-orm";
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
        .catch((e) => {
          console.error(e);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }),
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
      }),
    )
    .query(({ input: { limit, cursor, sort, filter } }) => {
      // todo - optimize this shit...
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

      const reviewCol = sql`count(*)`.mapWith((x) => +x).as("review-count");
      const ratingCol = sql`sum(${review.rating})/count(*)`.mapWith((x) => +x).as("average-rating");
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
            (sort.desc ? lt : gt)(sortBy, cursor.value),
            and(gt(review.barcode, cursor.barcode), eq(sortBy, cursor.value)),
          )
        : undefined;

      return db
        .select({
          barcode: review.barcode,
          matchedName: sql<string>`min(${review.name})`,
          names: sq.names,
          averageRating: sq.averageRating,
          reviewCount: sq.reviewCount,
          imageKey: sq.image,
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
        })
        .catch((e) => {
          console.error(e);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        });
    }),
});
