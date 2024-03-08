import { db } from "@/server/database";
import { account, user, verificationToken } from "@/server/database/schema/auth";
import { review } from "@/server/database/schema/product";
import { utapi } from "@/server/uploadthing";
import { ignore } from "@/utils";
import { mapFilter } from "@/utils/array";
import { providers } from "@/utils/providers";
import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { throwDefaultError } from "../utils";
import { coercedStringSchema, createMaxLengthMessage, createMinLengthMessage } from "../utils/zod";

const providerSchema = z.enum(providers, {
  errorMap(_, ctx) {
    return { message: ctx.defaultError.replace("Invalid enum value", "Invalid provider") };
  },
});
const deleteAccountProcedure = protectedProcedure
  .input(z.object({ provider: providerSchema }))
  .mutation(({ ctx: { session }, input: { provider } }) => {
    return db
      .delete(account)
      .where(and(eq(account.userId, session.user.id), eq(account.provider, provider)))
      .catch((e) => throwDefaultError(e, `Failed to unlink ${provider} account.`))
      .then((query) => {
        if (!query.rowsAffected) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `We couldn't find a ${provider} account linked to your profile`,
          });
        }
      });
  });

export const userRouter = createTRPCRouter({
  setName: protectedProcedure
    .input(
      coercedStringSchema({ required_error: "Username was not provided" })
        .min(4, createMinLengthMessage("Username", 4))
        .max(30, createMaxLengthMessage("Username", 30)),
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
    }),
  deleteImage: protectedProcedure.mutation(({ ctx: { session } }) => {
    const userId = session.user.id;
    const filter = eq(user.id, userId);

    return db
      .batch([
        db.select({ image: user.image }).from(user).where(filter).limit(1),
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
          // todo - 1) put this into transaction 2) add file key to pending delete, delete files in cron
          return utapi.deleteFiles([image]).then(ignore);
        }
      })
      .catch((e) => throwDefaultError(e, "Failed to delete image"));
  }),
  getAccountProviders: protectedProcedure.query(({ ctx: { session } }) => {
    return db
      .select({ provider: account.provider })
      .from(account)
      .where(eq(account.userId, session.user.id))
      .then((accounts) => accounts.map((account) => account.provider));
  }),
  deleteAccount: deleteAccountProcedure,
  deleteUser: protectedProcedure.mutation(({ ctx }) => {
    const { id: userId, email } = ctx.session.user;
    return db
      .batch([
        db
          .select({ image: review.imageKey })
          .from(review)
          .where(and(eq(review.userId, userId), isNotNull(review.imageKey))),
        db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1),
      ])
      .then(([reviewImages, profileImage]) => {
        return db
          .transaction(async (tx) => {
            await tx.delete(user).where(eq(user.id, userId));
            if (email) {
              await tx.delete(verificationToken).where(eq(verificationToken.identifier, email));
            }

            if (profileImage.length) {
              reviewImages.push(
                ...profileImage.filter(({ image }) => image && URL.canParse(image)),
              );
            }

            if (!reviewImages.length) return;
            // todo - add to pending delete table, delete files in cron
            await utapi.deleteFiles(
              mapFilter(
                reviewImages,
                (img) => img.image,
                (img, bad) => (img ? img : bad),
              ),
            );
          })
          .catch((e) => throwDefaultError(e, "Failed to delete your account"));
      });
  }),
});
