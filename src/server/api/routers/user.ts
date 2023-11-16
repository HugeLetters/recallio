import { db } from "@/database";
import { account, user } from "@/database/schema/auth";
import { isValidUrlString } from "@/utils";
import type { AsyncResult } from "@/utils/api";
import { and, eq } from "drizzle-orm";
import { utapi } from "uploadthing/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { findFirst } from "@/database/query/utils";

export const userRouter = createTRPCRouter({
  setName: protectedProcedure
    .input(z.string())
    .mutation(({ input, ctx: { session } }): AsyncResult<void, string> => {
      return db
        .update(user)
        .set({ name: input })
        .where(eq(user.id, session.user.id))
        .then((query) => {
          if (!query.rowsAffected) {
            return {
              ok: false as const,
              error: "User not found",
            };
          }
          return { ok: true as const, data: undefined };
        })
        .catch((e) => {
          console.error(e);
          return { ok: false, error: "Error while trying to update username" };
        });
    }),
  deleteImage: protectedProcedure.mutation(({ ctx: { session } }): AsyncResult<void, string> => {
    return findFirst(user, eq(user.id, session.user.id)).then(([data]) => {
      if (!data) return { ok: false, error: "User not found" };
      const { image } = data;
      if (!image) return { ok: false, error: "No image attached to the user" };

      return db
        .update(user)
        .set({ image: null })
        .where(eq(user.id, session.user.id))
        .then((query) => {
          if (!query.rowsAffected) return { ok: false as const, error: "User not found" };

          if (!isValidUrlString(image)) {
            utapi.deleteFiles([image]).catch(console.error);
          }
          return { ok: true as const, data: undefined };
        })
        .catch((e) => {
          console.error(e);
          return { ok: false, error: "Error while trying to update your avatar" };
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
        .then((accounts) => accounts.map((account) => account.provider))
  ),
  deleteAccount: protectedProcedure.input(z.object({ provider: z.string() })).mutation(
    ({
      ctx: {
        session: { user },
      },
      input: { provider },
    }): AsyncResult<void, string> =>
      db
        .delete(account)
        .where(and(eq(account.userId, user.id), eq(account.provider, provider)))
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
