import { db } from "@/database";
import { findFirst } from "@/database/query/utils";
import { user } from "@/database/schema/auth";
import { review } from "@/database/schema/product";
import { env } from "@/env.mjs";
import { and, eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { UTApi, UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getServerAuthSession } from "./auth";

const uploadthing = createUploadthing();

export const utapi = new UTApi({ apiKey: env.UPLOADTHING_SECRET });

export const appFileRouter = {
  reviewImageUploader: uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    .input(z.object({ barcode: z.string() }))
    .middleware(async ({ req, res, input: { barcode } }) => {
      if (!barcode) {
        throw new UploadThingError("No barcode provided");
      }

      const session = await getServerAuthSession({ req, res });
      if (!session) {
        throw new UploadThingError("Unauthorized");
      }

      const [reviewData] = await findFirst(
        review,
        and(eq(review.userId, session.user.id), eq(review.barcode, barcode)),
      );
      if (!reviewData) {
        throw new UploadThingError("Can't upload image without a corresponding review");
      }
      return { userId: session.user.id, barcode, oldImageKey: reviewData.imageKey };
    })
    .onUploadError(({ error }) => {
      console.log(error);
    })
    .onUploadComplete(({ file, metadata: { barcode, userId, oldImageKey } }) => {
      db.update(review)
        .set({ imageKey: file.key, updatedAt: new Date() })
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
      if (!session) {
        throw new UploadThingError("Unauthorized");
      }
      const [userData] = await findFirst(user, eq(user.id, session.user.id));
      if (!userData) {
        throw new UploadThingError("User not found");
      }

      return {
        userId: session.user.id,
        userImageKey: userData.image && !URL.canParse(userData.image) ? userData.image : null,
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

export function getFileUrl(fileKey: string) {
  return `https://utfs.io/f/${fileKey}`;
}
