import type { DatabaseClient } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
export function createDeleteQueueQuery(client: DatabaseClient, values: Array<PendingFile>) {
  if (!values.length) return [] satisfies [];
  return [client.insert(fileDeleteQueue).values(values).onConflictDoNothing()] satisfies [unknown];
}
