import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { MySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { db } from "..";

export function aggregateArrayColumn<T>(column: MySqlColumn) {
  return sql<T[] | [null]>`JSON_ARRAYAGG(${column})`;
}

export function countCol<T extends MySqlColumn>(column?: T) {
  return sql`count(${column ?? "*"})`.mapWith((x) => +x);
}

export function findFirst<T extends MySqlTable>(table: T, where: SQL | undefined) {
  return db.select().from(table).where(where).limit(1);
}

export function count<T extends MySqlTable>(table: T, where: SQL | undefined) {
  return db.select({ count: countCol() }).from(table).where(where).limit(1);
}

export function nullableMap<I, R>(f: (v: I) => R): (v: I) => R | null {
  return f;
}

export function removeNullishArray<T>(arr: T[] | [null]): T[] {
  if (arr.length === 1 && arr[0] === null) return [];

  return arr as T[];
}