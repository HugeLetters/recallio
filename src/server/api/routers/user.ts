import { providers } from "@/components/UI";
import { db } from "@/database";
import { findFirst } from "@/database/query/utils";
import { account, session, user, verificationToken } from "@/database/schema/auth";
import { review, reviewsToCategories } from "@/database/schema/product";
import { utapi } from "@/server/uploadthing";
import { isUrl } from "@/utils";
import { mapFilter } from "@/utils/array";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { throwDefaultError } from "../utils";
import { coercedStringSchema, createMaxLengthMessage, createMinLengthMessage } from "../utils/zod";

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
        .catch((e) => throwDefaultError(e, "Error while trying to update username"))
        .then((query) => {
          if (!query.rowsAffected) {
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
          }
        });
    }),
  deleteImage: protectedProcedure.mutation(({ ctx: { session } }) => {
    return findFirst(user, eq(user.id, session.user.id)).then(([data]) => {
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const { image } = data;
      if (!image)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No image attached to the user",
        });

      return db
        .update(user)
        .set({ image: null })
        .where(eq(user.id, session.user.id))
        .catch((e) => throwDefaultError(e, "Error while trying to update your avatar"))
        .then((query) => {
          if (!query.rowsAffected) {
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
          }

          if (!isUrl(image)) {
            utapi.deleteFiles([image]).catch(console.error);
          }
        });
    });
  }),
  getAccountProviders: protectedProcedure.query(({ ctx: { session } }) => {
    return db
      .select()
      .from(account)
      .where(eq(account.userId, session.user.id))
      .then((accounts) => accounts.map((account) => account.provider));
  }),
  deleteAccount: protectedProcedure
    .input(
      z.object({
        provider: z.enum(providers, {
          errorMap(_, ctx) {
            return { message: ctx.defaultError.replace("Invalid enum value", "Invalid provider") };
          },
        }),
      }),
    )
    .mutation(({ ctx: { session }, input: { provider } }) =>
      db
        .delete(account)
        .where(and(eq(account.userId, session.user.id), eq(account.provider, provider)))
        .catch((e) => throwDefaultError(e, `Error while trying to unlink your ${provider} account`))
        .then((query) => {
          if (!query.rowsAffected) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `We couldn't find a ${provider} account linked to your profile`,
            });
          }
        }),
    ),
  deleteUser: protectedProcedure.mutation(({ ctx: { session: userSession } }) => {
    return db
      .transaction(async (tx) => {
        const userImages = await tx
          .select({ image: review.imageKey })
          .from(review)
          .where(eq(review.userId, userSession.user.id))
          .then((values) =>
            mapFilter(
              values,
              ({ image }) => image,
              (image): image is string => !!image,
            ),
          );
        const userAvatar = await tx
          .select({ image: user.image })
          .from(user)
          .where(eq(user.id, userSession.user.id))
          .limit(1)
          .then(([user]) => user?.image);

        await tx
          .delete(reviewsToCategories)
          .where(eq(reviewsToCategories.userId, userSession.user.id));
        await tx.delete(review).where(eq(review.userId, userSession.user.id));
        await tx.delete(session).where(eq(session.userId, userSession.user.id));
        if (userSession.user.email) {
          await tx
            .delete(verificationToken)
            .where(eq(verificationToken.identifier, userSession.user.email));
        }
        await tx.delete(account).where(eq(account.userId, userSession.user.id));
        await tx.delete(user).where(eq(user.id, userSession.user.id));

        if (userAvatar && !isUrl(userAvatar)) {
          userImages.push(userAvatar);
        }
        await utapi.deleteFiles(userImages);
      })
      .catch((e) => throwDefaultError(e, "Error while trying to delete your account"));
  }),
});
