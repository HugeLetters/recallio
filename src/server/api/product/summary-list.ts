import { protectedProcedure } from "@/server/api/trpc";
import type { Paginated } from "@/server/api/utils/pagination";
import { createPagination } from "@/server/api/utils/pagination";
import { db } from "@/server/database/client";
import { query } from "@/server/database/query/aggregate";
import { review } from "@/server/database/schema/product";
import { throwExpectedError } from "@/server/error/trpc";
import { createBarcodeSchema } from "@/server/product/validation";
import { getFileUrl } from "@/server/uploadthing";
import { mostCommon } from "@/utils/array";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
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
    function getSortByColumn(): SQL.Aliased<number> {
      switch (sort.by) {
        case "reviews":
          return reviewCol;
        case "rating":
          return ratingCol;
        default:
          return sort.by satisfies never;
      }
    }

    const reviewCol = query.count().as("review-count");
    const ratingCol = query.avg(review.rating).as("average-rating");
    const direction = sort.desc ? desc : asc;

    const sortBy = getSortByColumn();
    const sq = db
      .select({
        barcode: review.barcode,
        names: query.aggregate(review.name, mostCommon(4)).as("names"),
        averageRating: ratingCol,
        reviewCount: reviewCol,
        image: query.min(review.imageKey).as("image"),
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
        matchedName: query.min(review.name),
        names: sq.names,
        averageRating: sq.averageRating,
        reviewCount: sq.reviewCount,
        image: query.map(sq.image, getFileUrl),
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
          cursor: pagination.encode({
            barcode: lastPage.barcode,
            sorted: sort.by === "rating" ? lastPage.averageRating : lastPage.reviewCount,
          }),
        };
      })
      .catch(throwExpectedError);
  });
