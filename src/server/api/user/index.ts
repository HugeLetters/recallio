import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database/client/serverless";
import { nonNullableSQL } from "@/server/database/query";
import { review } from "@/server/database/schema/product";
import { user, verificationToken } from "@/server/database/schema/user";
import { ExpectedError, throwExpectedError } from "@/server/error/trpc";
import { createDeleteQueueQuery } from "@/server/uploadthing/delete-queue";
import { createMaxMessage, createMinMessage, stringLikeSchema } from "@/server/validation/string";
import { usernameMaxLength, usernameMinLength } from "@/user/validation";
import { ignore } from "@/utils";
import { filterOut } from "@/utils/array/filter";
import { and, eq, isNotNull } from "drizzle-orm";
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
      .catch((e) => throwExpectedError(e, "Failed to update your username."))
      .then((query) => {
        if (!query.rowsAffected) {
          throw new ExpectedError({ code: "NOT_FOUND", message: "User not found" });
        }
      });
  });

const deleteImage = protectedProcedure.mutation(({ ctx: { session } }) => {
  const userId = session.user.id;
  const filter = and(eq(user.id, userId), isNotNull(user.image));

  return db
    .select({ fileKey: nonNullableSQL(user.image) })
    .from(user)
    .where(filter)
    .then((images) => {
      if (!images.length) {
        throw new ExpectedError({
          code: "PRECONDITION_FAILED",
          message: "No image attached to the user",
        });
      }

      return db.batch([
        db.update(user).set({ image: null }).where(filter),
        ...createDeleteQueueQuery(
          db,
          filterOut(images, (image, bad) => (URL.canParse(image.fileKey) ? bad : image)),
        ),
      ]);
    })
    .then(ignore)
    .catch((e) => throwExpectedError(e, "Failed to delete image"));
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
      reviewImages.push(...userImages.filter(({ image }) => !URL.canParse(image)));
      const images = [...new Set(reviewImages.map(({ image }) => image))];
      return db.batch([
        db.delete(user).where(eq(user.id, userId)),
        ...(email
          ? [db.delete(verificationToken).where(eq(verificationToken.identifier, email))]
          : []),
        ...createDeleteQueueQuery(
          db,
          images.map((image) => ({ fileKey: image })),
        ),
      ]);
    })
    .then(ignore)
    .catch((e) => throwExpectedError(e, "Failed to delete your account"));
});

export const userRouter = createTRPCRouter({
  setName,
  deleteImage,
  deleteUser,
  account: accountRouter,
  review: reviewRouter,
});
