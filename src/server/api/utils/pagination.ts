import { decodeJSON, encodeJSON } from "@/server/encode/json";
import type { NonEmptyArray } from "@/utils/array";
import { isSome } from "@/utils/option";
import { z } from "zod";

const limitBaseSchema = z.number().int().min(1).max(100);
const cursorBaseSchema = z
  .string({ invalid_type_error: "Pagination cursor has to be a string" })
  .transform(decodeJSON)
  .refine(isSome, "Supplied cursor value is an invalid base64 encoded json")
  .transform(({ value }) => value);

type PaginationOptions<Z extends Zod.Schema, S extends string> = {
  cursor: Z;
  sortBy: NonEmptyArray<S>;
};
export function createPagination<Z extends Zod.Schema, S extends string>({
  cursor,
  sortBy,
}: PaginationOptions<Z, S>) {
  return {
    schema: z.object({
      cursor: cursorBaseSchema.pipe(cursor).optional(),
      limit: limitBaseSchema,
      sort: z.object({
        by: z.enum(sortBy),
        desc: z.boolean(),
      }),
    }),
    encode(value: z.infer<Z>) {
      return encodeJSON(value);
    },
  };
}

export type Paginated<P> = {
  page: P;
  cursor?: string;
};
