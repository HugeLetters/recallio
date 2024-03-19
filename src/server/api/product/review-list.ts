import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database";
import { query } from "@/server/database/query/aggregate";
import { review } from "@/server/database/schema/product";
import { throwExpectedError } from "@/server/error/trpc";
import { getFileUrl } from "@/server/uploadthing";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import { z } from "zod";
import { user } from "../../database/schema/user";
import { createBarcodeSchema } from "../../product/validation";
import type { Paginated } from "../utils/pagination";
import { createPagination } from "../utils/pagination";

const pagination = createPagination({
  cursor: z.object({
    author: z.string(),
    sorted: z.number().or(z.coerce.date()),
  }),
  sortBy: ["date", "rating"],
});

export const getReviewList = protectedProcedure
  .input(
    z
      .object({
        barcode: createBarcodeSchema("Barcode is required to get review list for a product"),
      })
      .merge(pagination.schema),
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
        authorAvatar: query.map(user.image, (imageKey) => {
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
          cursor: pagination.encode({
            author: lastProduct.authorId,
            sorted: sort.by === "rating" ? lastProduct.rating : lastProduct.updatedAt,
          }),
        };
      })
      .catch(throwExpectedError);
  });
