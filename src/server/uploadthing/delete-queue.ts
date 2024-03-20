import { db } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
export function createDeleteQueueQuery(values: Array<PendingFile>) {
  if (!values.length) return [] satisfies [];
  return [db.insert(fileDeleteQueue).values(values).onConflictDoNothing()] satisfies [unknown];
}
