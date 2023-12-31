import { sql, type SQL } from "drizzle-orm";
import type { MySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { db } from "..";

export function aggregateArrayColumn<T>(column: MySqlColumn) {
  return sql`JSON_ARRAYAGG(${column})`.mapWith((array: T[] | [null]) => {
    if (array.length === 1 && array[0] === null) return [];

    return array as T[];
  });
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
