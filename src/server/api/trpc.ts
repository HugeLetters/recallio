import { getServerAuthSession } from "@/server/auth";
import { ExpectedError, defaultErrorMessage } from "@/server/error/trpc";
import { UNAUTHORIZED_CODE, UNAUTHORIZED_MESSAGE } from "@/trpc/auth";
import type { TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { ZodError } from "zod";

export async function createTRPCContext({ req, res }: CreateNextContextOptions) {
  const session = await getServerAuthSession({ req, res });
  return { session };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    const message = getErrorMessage(error);
    return { message, data: shape.data, code: shape.code };
  },
});

function getErrorMessage(error: TRPCError) {
  const cause = error.cause;
  if (cause instanceof ZodError) return `${cause.errors[0]?.message}`;
  if (error instanceof ExpectedError) return error.message;
  return defaultErrorMessage;
}

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new ExpectedError({ code: UNAUTHORIZED_CODE, message: UNAUTHORIZED_MESSAGE });
  }

  return next({ ctx: { session: ctx.session } });
});

