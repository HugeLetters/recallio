import { db } from "@/server/database";
import { user } from "@/server/database/schema/user";
import { eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";
import { getServerAuthSession } from "../auth";
import { uploadthing, utapi } from "./api";

export const userImageUploader = uploadthing({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
  .middleware(async ({ req, res }) => {
    const session = await getServerAuthSession({ req, res });
    if (!session) {
      throw new UploadThingError("Unauthorized");
    }
    const userData = await db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, session.user.id))
      .get();

    if (!userData) {
      throw new UploadThingError("User not found");
    }

    return {
      userId: session.user.id,
      userImageKey: userData.image && !URL.canParse(userData.image) ? userData.image : null,
    };
  })
  .onUploadError(({ error }) => {
    console.error(error);
  })
  .onUploadComplete(({ file, metadata: { userId, userImageKey } }) => {
    return db
      .update(user)
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
  });
