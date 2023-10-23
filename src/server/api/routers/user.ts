import { accountRepository, userRepository } from "@/database/repository/auth";
import { isValidUrlString } from "@/utils";
import type { AsyncResult } from "@/utils/api";
import { utapi } from "uploadthing/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  setName: protectedProcedure.input(z.string()).mutation(
    ({
      input,
      ctx: {
        session: { user },
      },
    }): AsyncResult<void, string> => {
      return userRepository
        .update({ name: input }, (table, { eq }) => eq(table.id, user.id))
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
    }
  ),
  deleteImage: protectedProcedure.mutation(({ ctx: { session } }): AsyncResult<void, string> => {
    return userRepository
      .findFirst((table, { eq }) => eq(table.id, session.user.id))
      .then((user) => {
        if (!user) return { ok: false, error: "User not found" };
        const { image } = user;
        if (!image) return { ok: false, error: "No image attached to the user" };

        return userRepository
          .update({ image: null }, (table, { eq }) => eq(table.id, session.user.id))
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
