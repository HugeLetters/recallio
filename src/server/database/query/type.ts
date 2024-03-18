import type { GetColumnData, SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export type SQLLike = SQLiteColumn | SQL.Aliased | SQL;
export type SQLType<C extends SQLLike> = C extends SQLiteColumn
  ? GetColumnData<C>
  : C extends SQL | SQL.Aliased
    ? C["_"]["type"]
    : never;
