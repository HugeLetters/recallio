import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/database/client/serverless";
import { user } from "@/server/database/schema/user";
import { eq } from "drizzle-orm";
import { UploadThingError } from "uploadthing/server";
import { uploadthing } from "./api";
import { createDeleteQueueQuery } from "./delete-queue";

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
  .onUploadError(({ error }) => console.error(error))
  .onUploadComplete(({ file, metadata: { userId, userImageKey } }) => {
    return db
      .batch([
        db.update(user).set({ image: file.key }).where(eq(user.id, userId)),
        ...(userImageKey ? createDeleteQueueQuery(db, [{ fileKey: userImageKey }]) : []),
      ])
      .then(() => true)
      .catch((e) => {
        console.error(e);
        return (
          createDeleteQueueQuery(db, [{ fileKey: file.key }])[0]
            ?.catch(console.error)
            .then(() => false) ?? false
        );
      });
  });
