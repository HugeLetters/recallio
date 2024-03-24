import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/database/client/serverless";
import { review } from "@/server/database/schema/product";
import { ignore } from "@/utils";
import { and, eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { uploadthing } from "./api";
import { createDeleteQueueQuery } from "./delete-queue";

export const reviewImageUploader = uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
  .input(z.object({ barcode: z.string() }))
  .middleware(async ({ req, res, input: { barcode } }) => {
    if (!barcode) {
      throw new UploadThingError("No barcode provided");
    }

    const session = await getServerAuthSession({ req, res });
    if (!session) {
      throw new UploadThingError("Unauthorized");
    }

    const reviewData = await db
      .select({ image: review.imageKey })
      .from(review)
      .where(and(eq(review.userId, session.user.id), eq(review.barcode, barcode)))
      .get();

    if (!reviewData) {
      throw new UploadThingError("Can't upload image without a corresponding review");
    }

    return { userId: session.user.id, barcode, oldImageKey: reviewData.image };
  })
  .onUploadError(({ error }) => {
    console.error(error);
  })
  .onUploadComplete(({ file, metadata: { barcode, userId, oldImageKey } }) => {
    return db
      .batch([
        db
          .update(review)
          .set({ imageKey: file.key, updatedAt: new Date() })
          .where(and(eq(review.userId, userId), eq(review.barcode, barcode))),
        ...(oldImageKey ? createDeleteQueueQuery(db, [{ fileKey: oldImageKey }]) : []),
      ])
      .catch((e) => {
        console.error(e);
        return createDeleteQueueQuery(db, [{ fileKey: file.key }]);
      })
      .then(ignore)
      .catch(console.error);
  });
