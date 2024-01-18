import { z } from "zod";

export function createPaginationCursor<Z extends Zod.Schema, S extends string>(
  cursor: Z,
  sortCols: [S, ...S[]],
) {
  return z.object({
    cursor: cursor.optional(),
    limit: z.number().int().min(1).max(100),
    sort: z.object({
      by: z.enum(sortCols),
      desc: z.boolean(),
    }),
  });
}

export type Paginated<P, C> = {
  page: P;
  cursor: C | null;
};
