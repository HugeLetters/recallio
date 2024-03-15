import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { throwDefaultError } from "@/server/api/utils/error";
import { db } from "@/server/database";
import { query } from "@/server/database/query/aggregate";
import { review } from "@/server/database/schema/product";
import { user, verificationToken } from "@/server/database/schema/user";
import { utapi } from "@/server/uploadthing/api";
import { createMaxMessage, createMinMessage, stringLikeSchema } from "@/server/validation/string";
import { ignore } from "@/utils";
import { mapFilter } from "@/utils/array/filter";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { accountRouter } from "./account";
import { reviewRouter } from "./review";

const setName = protectedProcedure
  .input(
    stringLikeSchema({ required_error: "Username was not provided" })
      .min(4, createMinMessage("Username", 4))
      .max(30, createMaxMessage("Username", 30)),
  )
  .mutation(({ input, ctx: { session } }) => {
    return db
      .update(user)
      .set({ name: input })
      .where(eq(user.id, session.user.id))
      .catch((e) => throwDefaultError(e, "Failed to update your username."))
      .then((query) => {
        if (!query.rowsAffected) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
      });
  });

const deleteImage = protectedProcedure.mutation(({ ctx: { session } }) => {
  const userId = session.user.id;
  const filter = eq(user.id, userId);

  return db
    .batch([
      db.select({ image: user.image }).from(user).where(filter),
      db.update(user).set({ image: null }).where(filter),
    ])
    .then(([[user]]) => {
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { image } = user;
      if (!image) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No image attached to the user",
        });
      }

      if (!URL.canParse(image)) {
        return utapi.deleteFiles([image]).then(ignore);
      }
    })
    .catch((e) => throwDefaultError(e, "Failed to delete image"));
});

const deleteUser = protectedProcedure.mutation(({ ctx }) => {
  const { id: userId, email } = ctx.session.user;
  return db
    .batch([
      db
        .select({ image: review.imageKey })
        .from(review)
        .where(and(eq(review.userId, userId), isNotNull(review.imageKey))),
      db
        .select({ image: query.map(user.image, (key) => (URL.canParse(key) ? null : key)) })
        .from(user)
        .where(and(eq(user.id, userId), isNotNull(user.image))),
    ])
    .then(([reviewImages, userImages]) => {
      return db.transaction(async (tx) => {
        await tx.delete(user).where(eq(user.id, userId));
        if (email) {
          await tx.delete(verificationToken).where(eq(verificationToken.identifier, email));
        }

        reviewImages.push(...userImages);
        const images = [
          ...new Set(
            mapFilter(
              reviewImages,
              (img) => img.image,
              (img, bad) => (img ? img : bad),
            ),
          ),
        ];

        if (!images.length) return;
        return utapi.deleteFiles(images).then(ignore);
      });
    })
    .catch((e) => throwDefaultError(e, "Failed to delete your account"));
});

export const userRouter = createTRPCRouter({
  setName,
  deleteImage,
  deleteUser,
  account: accountRouter,
  review: reviewRouter,
});
