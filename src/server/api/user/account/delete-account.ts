import { providers } from "@/auth/provider";
import { protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/database";
import { account } from "@/server/database/schema/user";
import { ExpectedError, throwExpectedError } from "@/server/error/trpc";
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
      .catch((e) => throwExpectedError(e, `Failed to unlink ${provider} account.`))
      .then((query) => {
        if (!query.rowsAffected) {
          throw new ExpectedError({
            code: "NOT_FOUND",
            message: `We couldn't find a ${provider} account linked to your profile`,
          });
        }
      });
  });
