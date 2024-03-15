import type { NonEmptyArray } from "@/utils/array";
import type { Option } from "@/utils/option";
import { isSome } from "@/utils/option";
import { z } from "zod";

const limitBaseSchema = z.number().int().min(1).max(100);
const cursorBaseSchema = z
  .string({ invalid_type_error: "Pagination cursor has to be a string" })
  .transform(base64ToJson)
  .refine(isSome, "Supplied string is an invalid base64 encoded json")
  .transform((option) => option.value);

export function createPagination<Z extends Zod.Schema, S extends string>(
  cursor: Z,
  sortCols: NonEmptyArray<S>,
) {
  return {
    schema: z.object({
      cursor: cursorBaseSchema.pipe(cursor).optional(),
      limit: limitBaseSchema,
      sort: z.object({
        by: z.enum(sortCols),
        desc: z.boolean(),
      }),
    }),
    encode: jsonToBase64<z.infer<Z>>,
  };
}

export type Paginated<P> = {
  page: P;
  cursor?: string;
};

function jsonToBase64<V>(value: V) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

function base64ToJson(value: string): Option<unknown> {
  try {
    return { ok: true, value: JSON.parse(Buffer.from(value, "base64").toString()) };
  } catch (e) {
    return { ok: false };
  }
}
