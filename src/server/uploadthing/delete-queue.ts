import type { DatabaseClient } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
/**
 * @returns `null` if `files` list is empty. Returns `INSERT` statement otherwise.
 */
export function fileDeleteQueueInsert(client: DatabaseClient, files: Array<PendingFile>) {
  if (!files.length) return null;
  return client.insert(fileDeleteQueue).values(files).onConflictDoNothing();
}
