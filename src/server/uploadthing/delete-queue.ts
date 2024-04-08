import type { DatabaseClient } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
export function createFileDeleteQueueQuery(client: DatabaseClient, files: Array<PendingFile>) {
  if (!files.length) return [] satisfies [];
  return [client.insert(fileDeleteQueue).values(files).onConflictDoNothing()] satisfies [unknown];
}
