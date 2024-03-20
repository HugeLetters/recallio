import { db } from "@/server/database/client";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { SQLLike, SQLType } from "./type";

export function findFirst<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db.select().from(table).where(where).limit(1).get();
}

export function nonNullableSQL<S extends SQLLike>(column: S) {
  return sql<Exclude<SQLType<S>, null>>`${column}`;
}
