import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database";
import { query } from "@/server/database/query/aggregate";
import { review } from "@/server/database/schema/product";
import { getFileUrl } from "@/server/uploadthing";
import { mostCommon } from "@/utils/array";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { z } from "zod";
import { createBarcodeSchema } from "../../product/schema";
import { throwDefaultError } from "../utils/error";
import type { Paginated } from "../utils/pagination";
import { createPagination } from "../utils/pagination";

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
          const x: never = sort.by;
          return x;
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
      .catch(throwDefaultError);
  });
