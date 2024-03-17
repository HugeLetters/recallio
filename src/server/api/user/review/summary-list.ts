import { db } from "@/server/database";
import { query } from "@/server/database/query/aggregate";
import { review, reviewsToCategories } from "@/server/database/schema/product";
import { createBarcodeSchema } from "@/server/product/schema";
import { getFileUrl } from "@/server/uploadthing";
import { and, asc, desc, eq, gt, inArray, like, lt, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { throwDefaultError } from "../../utils/error";
import type { Paginated } from "../../utils/pagination";
import { createPagination } from "../../utils/pagination";

const pagination = createPagination({
  cursor: z.object({
    barcode: createBarcodeSchema(),
    sorted: z.number().or(z.coerce.date()),
  }),
  sortBy: ["date", "rating"],
});

export const getSummaryList = protectedProcedure
  .input(
    z
      .object({
        /** Filter by name or category */
        filter: z.string().optional(),
      })
      .merge(pagination.schema),
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
          cursor: pagination.encode({
            barcode: lastReview.barcode,
            sorted: sort.by === "date" ? lastReview.updatedAt : lastReview.rating,
          }),
          page,
        };
      })
      .catch(throwDefaultError);
  });
