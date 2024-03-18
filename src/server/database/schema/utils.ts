import { sql } from "drizzle-orm";
import { int } from "drizzle-orm/sqlite-core";

export function timestampColumn<N extends string>(name: N) {
  return int(name, { mode: "timestamp" }).default(sql`(unixepoch())`);
}
