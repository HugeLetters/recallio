import { userRepository } from "@/database/repository/auth";
import { reviewRepository } from "@/database/repository/product";
import { isValidUrlString } from "@/utils";
import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { utapi } from "uploadthing/server";
import { z } from "zod";
import { getServerAuthSession } from "./auth";

const uploadthing = createUploadthing();

export const appFileRouter = {
  reviewImageUploader: uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    .input(z.object({ barcode: z.string() }))
    .middleware(async ({ req, res, input: { barcode } }) => {
      if (!barcode) throw Error("No barcode provided");

      const session = await getServerAuthSession({ req, res });
      if (!session) throw Error("Unauthorized");

      const review = await reviewRepository.findFirst((table, { and, eq }) =>
        and(eq(table.userId, session.user.id), eq(table.barcode, barcode))
      );
      if (!review) throw Error("Can't upload image without a corresponding review");

      return { userId: session.user.id, barcode, oldImageKey: review.imageKey };
    })
    .onUploadError(({ error }) => {
      console.log(error);
    })
    .onUploadComplete(({ file, metadata: { barcode, userId, oldImageKey } }) => {
      reviewRepository
        .update({ imageKey: file.key }, (table, { and, eq }) =>
          and(eq(table.userId, userId), eq(table.barcode, barcode))
        )
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

      const user = await userRepository.findFirst((table, { eq }) => eq(table.id, session.user.id));
      if (!user) throw Error("User not found");

      return {
        userId: session.user.id,
        userImageKey: user.image && !isValidUrlString(user.image) ? user.image : null,
      };
    })
    .onUploadError(({ error }) => {
      console.log(error);
    })
    .onUploadComplete(({ file, metadata: { userId, userImageKey } }) => {
      userRepository
        .update({ image: file.key }, (table, { eq }) => eq(table.id, userId))
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
