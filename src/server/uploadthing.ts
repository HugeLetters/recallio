import { createUploadthing, type FileRouter } from "uploadthing/next-legacy";
import { getServerAuthSession } from "./auth";

const uploadthing = createUploadthing();

export const appFileRouter = {
  imageUploader: uploadthing({ image: { maxFileSize: "512KB" } })
    .middleware(async ({ req, res }) => {
      const session = await getServerAuthSession({ req, res });
      if (!session) throw new Error("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadError((err) => {
      console.log(err);
    })
    .onUploadComplete(() => void 0),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
