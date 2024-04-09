import { sql } from "drizzle-orm";
import type { SQLLike, SQLType } from "./type";

export function nonNullableSQL<S extends SQLLike>(column: S) {
  return sql<Exclude<SQLType<S>, null>>`${column}`;
}
