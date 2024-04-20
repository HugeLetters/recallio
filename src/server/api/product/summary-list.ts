import { protectedProcedure } from "@/server/api/trpc";
import { cachify } from "@/server/api/utils/cache";
import type { Paginated } from "@/server/api/utils/pagination";
import { createPagination } from "@/server/api/utils/pagination";
import { db } from "@/server/database/client/serverless";
import { query } from "@/server/database/query/aggregate";
import { productMeta, review } from "@/server/database/schema/product";
import { averageProductRating } from "@/server/database/schema/product/sql";
import { createBarcodeSchema } from "@/server/product/validation";
import { getFileUrl } from "@/server/uploadthing";
import { mostCommon } from "@/utils/array";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gt, like, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

const pagination = createPagination({
  cursor: z.object({
    barcode: createBarcodeSchema(),
    sorted: z.number(),
  }),
  sortBy: ["reviews", "rating"],
});

export const getSummaryList = protectedProcedure
  .input(z.object({ filter: z.string().optional() }).merge(pagination.schema))
  .query(({ input: { limit, cursor, sort, filter } }) => {
    function getSortByColumn(): SQL<number> {
      switch (sort.by) {
        case "reviews":
          return sql`${reviewCol}`;
        case "rating":
          return ratingCol;
        default:
          return sort.by satisfies never;
      }
    }

    const matchedSq = db
      .select({
        barcode: review.barcode,
        name: query.min(review.name).as("matched-name"),
      })
      .from(review)
      .where(and(eq(review.isPrivate, false), filter ? like(review.name, `${filter}%`) : undefined))
      .groupBy(review.barcode)
      .as("matched");

    const reviewCol = productMeta.publicReviewCount;
    const ratingCol = averageProductRating;
    const sortBy = getSortByColumn();

    const direction = sort.desc ? desc : asc;
    const compare = sort.desc ? lt : gt;
    const cursorClause = cursor
      ? or(
          compare(sortBy, cursor.sorted),
          and(gt(productMeta.barcode, cursor.barcode), eq(sortBy, cursor.sorted)),
        )
      : undefined;

    return db
      .select({
        barcode: productMeta.barcode,
        matchedName: matchedSq.name,
        names: query.aggregate(review.name, mostCommon(4)),
        averageRating: ratingCol,
        reviewCount: reviewCol,
        image: query.map(query.min(review.imageKey), getFileUrl),
      })
      .from(productMeta)
      .where(cursorClause)
      .innerJoin(review, and(eq(productMeta.barcode, review.barcode), eq(review.isPrivate, false)))
      .innerJoin(matchedSq, and(eq(productMeta.barcode, matchedSq.barcode)))
      .groupBy(productMeta.barcode)
      .orderBy(direction(sortBy), asc(productMeta.barcode))
      .limit(limit)
      .then((page): Paginated<typeof page> => {
        if (!page.length) return { page };
        const lastPage = page.at(-1);
        if (!lastPage) return { page };

        return {
          page,
          cursor: pagination.encode({
            barcode: lastPage.barcode,
            sorted: sort.by === "rating" ? lastPage.averageRating : lastPage.reviewCount,
          }),
        };
      })
      .then(cacheControl);
  });

const cacheControl = cachify({
  type: "public",
  maxAge: 60,
  swr: 60 * 60 * 6, // 6 hours
});
