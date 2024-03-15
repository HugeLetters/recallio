import type { SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "..";

export function findFirst<T extends SQLiteTable>(table: T, where: SQL | undefined) {
  return db.select().from(table).where(where).limit(1).get();
}
