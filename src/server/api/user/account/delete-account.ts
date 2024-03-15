import { providers } from "@/auth/provider";
import { protectedProcedure } from "@/server/api/trpc";
import { throwDefaultError } from "@/server/api/utils/error";
import { db } from "@/server/database";
import { account } from "@/server/database/schema/user";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const providerSchema = z.enum(providers, {
  errorMap(_, ctx) {
    return { message: ctx.defaultError.replace("Invalid enum value", "Invalid provider") };
  },
});

export const deleteAccount = protectedProcedure
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
