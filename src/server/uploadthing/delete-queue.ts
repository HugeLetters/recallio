import { db } from "../database";
import { fileDeleteQueue } from "../database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
export function createDeleteQueueQuery(values: Array<PendingFile>) {
  if (!values.length) return [] satisfies [];
  return [db.insert(fileDeleteQueue).values(values).onConflictDoNothing()] satisfies [unknown];
}
