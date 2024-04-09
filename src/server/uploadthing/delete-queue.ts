import type { DatabaseClient } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";
import type { NonEmptyArray } from "@/utils/array";
import { nonEmptyArray } from "@/utils/array";

type PendingFile = typeof fileDeleteQueue.$inferInsert;
/**
 * @returns `null` if `files` list is empty. Returns `INSERT` statement otherwise.
 */
export function fileDeleteQueueInsert<const TFiles extends Array<PendingFile>>(
  client: DatabaseClient,
  files: TFiles,
) {
  if (!nonEmptyArray(files)) {
    return null as TFiles extends NonEmptyArray<PendingFile> ? never : null;
  }
  return client.insert(fileDeleteQueue).values(files).onConflictDoNothing();
}
