import { db } from "@/database";
import { user } from "@/database/schema/auth";
import { review } from "@/database/schema/product";
import { isValidUrlString } from "@/utils";
import { and, eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { utapi } from "uploadthing/server";
import { z } from "zod";
import { getServerAuthSession } from "./auth";
import { findFirst } from "@/database/query/utils";

const uploadthing = createUploadthing();

export const appFileRouter = {
  reviewImageUploader: uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    .input(z.object({ barcode: z.string() }))
    .middleware(async ({ req, res, input: { barcode } }) => {
      if (!barcode) throw Error("No barcode provided");

      const session = await getServerAuthSession({ req, res });
      if (!session) throw Error("Unauthorized");

      const [reviewData] = await findFirst(
        review,
        and(eq(review.userId, session.user.id), eq(review.barcode, barcode))
      );
      if (!reviewData) throw Error("Can't upload image without a corresponding review");

      return { userId: session.user.id, barcode, oldImageKey: reviewData.imageKey };
    })
    .onUploadError(({ error }) => {
      console.log(error);
    })
    .onUploadComplete(({ file, metadata: { barcode, userId, oldImageKey } }) => {
      db.update(review)
        .set({ imageKey: file.key })
        .where(and(eq(review.userId, userId), eq(review.barcode, barcode)))
        .then((query) => {
          if (!query.rowsAffected || !oldImageKey) return;

          utapi.deleteFiles(oldImageKey).catch(console.error);
        })
        .catch((err) => {
          console.error(err);
          utapi.deleteFiles(file.key).catch(console.error);
        });
    }),
  userImageUploader: uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    .middleware(async ({ req, res }) => {
      const session = await getServerAuthSession({ req, res });
      if (!session) throw Error("Unauthorized");

      const [userData] = await findFirst(user, eq(user.id, session.user.id));
      if (!userData) throw Error("User not found");

      return {
        userId: session.user.id,
        userImageKey: userData.image && !isValidUrlString(userData.image) ? userData.image : null,
      };
    })
    .onUploadError(({ error }) => {
      console.log(error);
    })
    .onUploadComplete(({ file, metadata: { userId, userImageKey } }) => {
      db.update(user)
        .set({ image: file.key })
        .where(eq(user.id, userId))
        .then((query) => {
          if (!query.rowsAffected || !userImageKey) return;
          utapi.deleteFiles(userImageKey).catch(console.error);
        })
        .catch((err) => {
          console.error(err);
          utapi.deleteFiles(file.key).catch(console.error);
        });
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
