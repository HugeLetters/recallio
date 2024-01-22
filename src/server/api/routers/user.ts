import { providers } from "@/components/UI";
import { db } from "@/database";
import { findFirst } from "@/database/query/utils";
import { account, user } from "@/database/schema/auth";
import { utapi } from "@/server/uploadthing";
import { isUrl } from "@/utils";
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
  getAccountProviders: protectedProcedure.query(
    ({
      ctx: {
        session: { user },
      },
    }) =>
      db
        .select()
        .from(account)
        .where(eq(account.userId, user.id))
        .then((accounts) => accounts.map((account) => account.provider)),
  ),
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
    .mutation(
      ({
        ctx: {
          session: { user },
        },
        input: { provider },
      }) =>
        db
          .delete(account)
          .where(and(eq(account.userId, user.id), eq(account.provider, provider)))
          .catch((e) =>
            throwDefaultError(e, `Error while trying to unlink your ${provider} account`),
          )
          .then((query) => {
            if (!query.rowsAffected) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `We couldn't find a ${provider} account linked to your profile`,
              });
            }
          }),
    ),
});
