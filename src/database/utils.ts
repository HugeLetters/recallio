import { sql } from "drizzle-orm";
import type { MySqlColumn } from "drizzle-orm/mysql-core";

export function aggregateArrayColumn<T>(column: MySqlColumn) {
  return sql`JSON_ARRAYAGG(${column})`.mapWith((array: T[] | [null]) => {
    if (array.length === 1 && array[0] === null) return [];

    return array as T[];
  });
}
