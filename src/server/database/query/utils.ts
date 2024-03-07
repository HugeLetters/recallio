import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "..";

export function aggregateArrayColumn<T>(column: SQLiteColumn) {
  // todo - this might break after sqlite migration
  return sql<T[] | [null]>`JSON_ARRAYAGG(${column})`;
}

export function countCol<T extends SQLiteColumn>(column?: T) {
  return sql`count(${column ?? "*"})`.mapWith((x) => +x);
}

export function findFirst<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db.select().from(table).where(where).limit(1).get();
}

export function count<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db.select({ count: countCol() }).from(table).where(where).limit(1);
}

export function nullableMap<I, R>(f: (v: I) => R): (v: I) => R | null {
  return f;
}

export function removeNullishArray<T>(arr: T[] | [null]): T[] {
  if (arr.length === 1 && arr[0] === null) return [];

  return arr as T[];
}
