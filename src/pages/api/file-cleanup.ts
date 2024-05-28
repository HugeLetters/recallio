import { createCronHandler } from "@/server/cron";
import { db } from "@/server/database/client";
import { fileDeleteQueue } from "@/server/database/schema/file";
import { throwExpectedError } from "@/server/error/trpc";
import { utapi } from "@/server/uploadthing/api";
import { ignore } from "@/utils";
import { lte } from "drizzle-orm";

export const config = { api: { bodyParser: false } };
export default createCronHandler((_, res) => {
  return deletePendingFiles()
    .then(() => {
      res.status(200).json(null);
    })
    .catch(throwExpectedError(undefined));
});

function deletePendingFiles() {
  return db.transaction(async (tx) => {
    const pendingFiles = await tx
      .select({ key: fileDeleteQueue.fileKey })
      .from(fileDeleteQueue)
      .orderBy(fileDeleteQueue.fileKey)
      .limit(1000);

    const lastFile = pendingFiles.at(-1);
    if (!lastFile) return;

    await tx.delete(fileDeleteQueue).where(lte(fileDeleteQueue.fileKey, lastFile.key));
    return await utapi.deleteFiles(pendingFiles.map((file) => file.key)).then(ignore);
  });
}
