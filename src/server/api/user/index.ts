import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client/serverless";
import { nonNullableSQL } from "@/server/database/query";
import { review } from "@/server/database/schema/product";
import { user, verificationToken } from "@/server/database/schema/user";
import { ExpectedError, throwExpectedError } from "@/server/error/trpc";
import { fileDeleteQueueInsert } from "@/server/uploadthing/delete-queue";
import { createMaxMessage, createMinMessage, stringLikeSchema } from "@/server/validation/string";
import { usernameMaxLength, usernameMinLength } from "@/user/validation";
import { ignore } from "@/utils";
import type { NonEmptyArray } from "@/utils/array";
import { and, eq, isNotNull } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { accountRouter } from "./account";
import { reviewRouter } from "./review";

const setName = protectedProcedure
  .input(
    stringLikeSchema({ required_error: "Username was not provided" })
      .min(usernameMinLength, createMinMessage("Username", usernameMinLength))
      .max(usernameMaxLength, createMaxMessage("Username", usernameMaxLength)),
  )
  .mutation(({ input, ctx: { session } }) => {
    return db
      .update(user)
      .set({ name: input })
      .where(eq(user.id, session.user.id))
      .returning({ name: user.name })
      .get()
      .catch(throwExpectedError("Failed to update your username."))
      .then((result) => {
        if (!result) {
          throw new ExpectedError({ code: "NOT_FOUND", message: "User not found" });
        }
        return result.name;
      });
  });

const deleteImage = protectedProcedure.mutation(({ ctx: { session } }) => {
  const userId = session.user.id;
  const filter = and(eq(user.id, userId), isNotNull(user.image));

  return db
    .select({ fileKey: nonNullableSQL(user.image) })
    .from(user)
    .where(filter)
    .then<unknown>((images) => {
      if (!images.length) {
        throw new ExpectedError({
          code: "PRECONDITION_FAILED",
          message: "No image attached to the user",
        });
      }

      const imageDelete = fileDeleteQueueInsert(
        db,
        images.filter(({ fileKey }) => !URL.canParse(fileKey)),
      );
      const userUpdate = db.update(user).set({ image: null }).where(filter);
      if (!imageDelete) return userUpdate;

      return db.batch([userUpdate, imageDelete]);
    })
    .then(ignore)
    .catch(throwExpectedError("Failed to delete image"));
});

const deleteUser = protectedProcedure.mutation(({ ctx }) => {
  const { id: userId, email } = ctx.session.user;
  return db
    .batch([
      db
        .select({ image: nonNullableSQL(review.imageKey) })
        .from(review)
        .where(and(eq(review.userId, userId), isNotNull(review.imageKey))),
      db
        .select({ image: nonNullableSQL(user.image) })
        .from(user)
        .where(and(eq(user.id, userId), isNotNull(user.image))),
    ])
    .then(([reviewImages, userImages]) => {
      const batch: NonEmptyArray<BatchItem<"sqlite">> = [
        db.delete(user).where(eq(user.id, userId)),
      ];

      if (email) {
        batch.push(db.delete(verificationToken).where(eq(verificationToken.identifier, email)));
      }

      reviewImages.push(...userImages.filter(({ image }) => !URL.canParse(image)));
      const imagesDelete = fileDeleteQueueInsert(
        db,
        reviewImages.map(({ image }) => ({ fileKey: image })),
      );
      if (imagesDelete) {
        batch.push(imagesDelete);
      }

      return db.batch(batch);
    })
    .then(ignore)
    .catch(throwExpectedError("Failed to delete your account"));
});

export const userRouter = createTRPCRouter({
  setName,
  deleteImage,
  deleteUser,
  account: accountRouter,
  review: reviewRouter,
});
