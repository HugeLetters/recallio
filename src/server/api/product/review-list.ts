import { publicProcedure } from "@/server/api/trpc";
import type { Paginated } from "@/server/api/utils/pagination";
import { createPagination } from "@/server/api/utils/pagination";
import { db } from "@/server/database/client/serverless";
import { query } from "@/server/database/query/aggregate";
import { review } from "@/server/database/schema/product";
import { user } from "@/server/database/schema/user";
import { createBarcodeSchema } from "@/server/product/validation";
import { getFileUrl } from "@/server/uploadthing";
import type { StrictExtract } from "@/utils/type";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import { z } from "zod";

const pagination = createPagination({
  cursor: z.object({
    id: z.string(),
    sorted: z.number().or(z.coerce.date()),
  }),
  sortBy: ["date", "rating"],
});

type SortColumns = StrictExtract<keyof typeof review._.columns, "updatedAt" | "rating">;
export const getReviewList = publicProcedure
  .input(
    z
      .object({
        barcode: createBarcodeSchema("Barcode is required to get review list for a product"),
      })
      .merge(pagination.schema),
  )
  .query(({ input: { barcode, limit, sort, cursor } }) => {
    function getSortByKey(): SortColumns {
      switch (sort.by) {
        case "date":
          return "updatedAt";
        case "rating":
          return "rating";
        default:
          return sort.by satisfies never;
      }
    }

    const sortBy = getSortByKey();
    const sortByCol = review[sortBy];

    const direction = sort.desc ? desc : asc;
    const compare = sort.desc ? lt : gt;
    const cursorClause = cursor
      ? or(
          compare(sortByCol, cursor.sorted),
          and(gt(review.id, cursor.id), eq(sortByCol, cursor.sorted)),
        )
      : undefined;

    return db
      .select({
        id: review.id,
        name: review.name,
        rating: review.rating,
        pros: review.pros,
        cons: review.cons,
        comment: review.comment,
        updatedAt: review.updatedAt,
        authorAvatar: query.map(user.image, (imageKey) => {
          return URL.canParse(imageKey) ? imageKey : getFileUrl(imageKey);
        }),
        authorName: user.name,
      })
      .from(review)
      .where(and(eq(review.barcode, barcode), eq(review.isPrivate, false), cursorClause))
      .innerJoin(user, eq(user.id, review.userId))
      .limit(limit)
      .orderBy(direction(sortByCol), asc(review.id))
      .then((page): Paginated<typeof page> => {
        if (!page.length) return { page };
        const lastProduct = page.at(-1);
        if (!lastProduct) return { page };
        return {
          page,
          cursor: pagination.encode({ id: lastProduct.id, sorted: lastProduct[sortBy] }),
        };
      });
  });
