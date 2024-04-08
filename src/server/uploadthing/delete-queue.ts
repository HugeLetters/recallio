import type { DatabaseClient } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
export function fileDeleteQueueQuery(client: DatabaseClient, files: Array<PendingFile>) {
  if (!files.length) return null;
  return client.insert(fileDeleteQueue).values(files).onConflictDoNothing();
}
