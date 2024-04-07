import type { SQLWrapper } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { int } from "drizzle-orm/sqlite-core";

export function timestampColumn<N extends string>(name: N) {
  return int(name, { mode: "timestamp" }).default(sql`(unixepoch())`);
}

export const space = sql` `;
export function caseWhen(condition: SQLWrapper, then: SQLWrapper, orElse: SQLWrapper) {
  return sql.join([sql`CASE WHEN`, condition, sql`THEN`, then, sql`ELSE`, orElse, sql`END`], space);
}
