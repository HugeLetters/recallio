import type { DatabaseClient } from "@/server/database/client";
import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { SQLLike, SQLType } from "./type";

export function count<T extends SQLiteTable>(
  client: DatabaseClient,
  table: T,
  where: SQL | undefined,
) {
  return client
    .select({ count: query.count() })
    .from(table)
    .where(where)
    .limit(1)
    .get()
    .then((x) => x?.count ?? 0);
}

export const query = {
  aggregate: aggregateArray,
  map: function <C extends SQLLike, R>(
    col: C,
    map: (value: Exclude<SQLType<C>, null>) => R,
  ): SQL<R | (null & SQLType<C>)> {
    return sql`${col}`.mapWith(map);
  },
  count: function (column?: SQLLike): SQL<number> {
    return column ? sql`count(${column})` : sql`count(*)`;
  },
  min: function <C extends SQLLike>(col: C) {
    return sql<SQLType<C>>`min(${col})`;
  },
  avg: function <C extends SQLLike>(col: C) {
    return sql<number | (null & SQLType<C>)>`avg(${col})`;
  },
};

function aggregateArray<C extends SQLLike>(column: C): SQL<Array<SQLType<C>>>;
function aggregateArray<C extends SQLLike, R>(
  column: C,
  transform: (value: Array<SQLType<C>>) => R,
): SQL<R>;
function aggregateArray<C extends SQLLike, R>(
  column: C,
  transform?: (value: Array<SQLType<C>>) => R,
) {
  const col = sql`json_group_array(${column})`.mapWith((str: string) => {
    const arr = filterNullArray(JSON.parse(str) as Array<SQLType<C>> | [null]);
    return transform ? transform(arr) : arr;
  });
  col.mapWith = () => {
    throw Error("Don't call `mapWith` on aggregated columns - use `transform` parameter instead");
  };
  return col;
}

function filterNullArray<T>(arr: T[] | [null]): T[] {
  if (arr.length === 1 && arr[0] === null) return [];

  return arr as T[];
}
