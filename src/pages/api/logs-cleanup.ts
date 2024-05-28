import { createCronHandler } from "@/server/cron";
import { db } from "@/server/database/client";
import { logTable } from "@/server/database/schema/logs";
import { throwExpectedError } from "@/server/error/trpc";
import { desc, lt } from "drizzle-orm";

export const config = { api: { bodyParser: false } };
export default createCronHandler((_, res) => {
  return deleteExpiredLogs()
    .then(() => {
      res.status(200).json(null);
    })
    .catch(throwExpectedError(undefined));
});

function deleteExpiredLogs() {
  return db.transaction(async (tx) => {
    const cutoffLog = await tx
      .select({ cutoffDate: logTable.createdAt })
      .from(logTable)
      .orderBy(desc(logTable.createdAt))
      .offset(500)
      .limit(1)
      .get();
    if (!cutoffLog) return;

    await tx.delete(logTable).where(lt(logTable.createdAt, cutoffLog.cutoffDate));
  });
}
