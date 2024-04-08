import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/database/client/serverless";
import { review } from "@/server/database/schema/product";
import { and, eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { uploadthing } from "./api";
import { fileDeleteQueueInsert } from "./delete-queue";

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
  .onUploadComplete(({ file, metadata: { barcode, userId, oldImageKey } }): Promise<boolean> => {
    return Promise.resolve()
      .then<unknown>(() => {
        const updateReview = db
          .update(review)
          .set({ imageKey: file.key, updatedAt: new Date() })
          .where(and(eq(review.userId, userId), eq(review.barcode, barcode)));
        if (!oldImageKey) return updateReview;

        const imageDelete = fileDeleteQueueInsert(db, [{ fileKey: oldImageKey }]);
        return db.batch([updateReview, imageDelete]);
      })
      .then(() => true)
      .catch((e) => {
        console.error(e);
        return fileDeleteQueueInsert(db, [{ fileKey: file.key }])
          .catch(console.error)
          .then(() => false);
      });
  });
