import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { z } from "zod";
import { getServerAuthSession } from "./auth";
import { reviewRepository } from "@/database/repository/product";
import { utapi } from "uploadthing/server";

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
          if (!(query.rowsAffected && oldImageKey)) return;

          utapi.deleteFiles(oldImageKey).catch(console.error);
        })
        .catch((err) => {
          console.error(err);
          utapi.deleteFiles(file.key).catch(console.error);
        });
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
