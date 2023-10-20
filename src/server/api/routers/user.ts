import { accountRepository } from "@/database/repository/auth";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import type { AsyncResult } from "@/utils/api";

export const userRouter = createTRPCRouter({
  getAccountProviders: protectedProcedure.query(
    ({
      ctx: {
        session: { user },
      },
    }) =>
      accountRepository
        .findMany((table, { eq }) => eq(table.userId, user.id))
        .then((accounts) => accounts.map((account) => account.provider))
  ),
  deleteAccount: protectedProcedure.input(z.object({ provider: z.string() })).mutation(
    ({
      ctx: {
        session: { user },
      },
      input: { provider },
    }): AsyncResult<void, string> =>
      accountRepository
        .delete((table, { and, eq }) =>
          and(eq(table.userId, user.id), eq(table.provider, provider))
        )
        .then((query) => {
          if (!query.rowsAffected) {
            return {
              ok: false as const,
              error: `We couldn't find a ${provider} account linked to your profile`,
            };
          }
          return { ok: true as const, data: undefined };
        })
        .catch((e) => {
          console.error(e);
          return { ok: false, error: `Error while trying to unlink your ${provider} account` };
        })
  ),
});
