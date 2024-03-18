import { env } from "@/env/index.mjs";
import { throwDefaultError } from "@/server/api/utils/error";
import { db } from "@/server/database";
import { fileDeleteQueue } from "@/server/database/schema/file";
import { utapi } from "@/server/uploadthing/api";
import { ignore } from "@/utils";
import { verifySignature } from "@upstash/qstash/dist/nextjs";
import { lte } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: false } };

function innerHandler(_: NextApiRequest, res: NextApiResponse) {
  return deletePendingFiles()
    .then(() => {
      res.status(200).json(null);
    })
    .catch(throwDefaultError);
}

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

const handler =
  env.NEXT_PUBLIC_NODE_ENV === "production"
    ? verifySignature(innerHandler, {
        currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
      })
    : innerHandler;

export default handler;
