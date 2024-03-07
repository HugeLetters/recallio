import { throwDefaultError } from "@/server/api/utils";
import type { GetColumnData, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "..";

export function findFirst<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db.select().from(table).where(where).limit(1).get();
}

export function count<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db
    .select({ count: query.count() })
    .from(table)
    .where(where)
    .limit(1)
    .get()
    .then((x) => x?.count);
}

type ColumnLike = SQLiteColumn | SQL.Aliased | SQL;
type ColumnType<C extends ColumnLike> = C extends SQLiteColumn
  ? GetColumnData<C>
  : C extends SQL | SQL.Aliased
    ? C["_"]["type"]
    : never;
function aggregateArray<C extends ColumnLike>(column: C): SQL<ColumnType<C>[]>;
function aggregateArray<C extends ColumnLike, R>(
  column: C,
  transform: (value: ColumnType<C>[]) => R,
): SQL<R>;
function aggregateArray<C extends ColumnLike, R>(
  column: C,
  transform?: (value: ColumnType<C>[]) => R,
) {
  const col = sql`json_group_array(${column})`.mapWith((str: string) => {
    const arr = filterNullArray(JSON.parse(str) as ColumnType<C>[] | [null]);
    return transform ? transform(arr) : arr;
  });
  col.mapWith = () => {
    throwDefaultError(
      new Error("Don't call `mapWith` on aggregated columns - use `transform` parameter instead"),
    );
  };
  return col;
}

export const query = {
  aggregate: aggregateArray,
  map: function <C extends ColumnLike, R>(
    col: C,
    map: (value: Exclude<ColumnType<C>, null>) => R,
  ): SQL<R | (null & ColumnType<C>)> {
    return sql`${col}`.mapWith(map);
  },
  count: function <T extends ColumnLike>(column?: T): SQL<number> {
    return column ? sql`count(${column})` : sql`count(*)`;
  },
  min: function <C extends ColumnLike>(col: C) {
    return sql<ColumnType<C>>`min(${col})`;
  },
  avg: function <C extends ColumnLike>(col: C) {
    return sql<number | (null & ColumnType<C>)>`avg(${col})`;
  },
};

function filterNullArray<T>(arr: T[] | [null]): T[] {
  if (arr.length === 1 && arr[0] === null) return [];

  return arr as T[];
}
