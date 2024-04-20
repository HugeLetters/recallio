import { getServerAuthSession } from "@/server/auth";
import { env } from "@/server/env/index.mjs";
import { ExpectedError, defaultErrorMessage } from "@/server/error/trpc";
import type { DefaultErrorShape, TRPCError } from "@trpc/server";
import { initTRPC } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { ZodError } from "zod";

export async function createTRPCContext({ req, res }: CreateNextContextOptions) {
  const session = await getServerAuthSession({ req, res });
  return { session };
}

const defaultErrorData: Partial<DefaultErrorShape["data"]> = {};
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    const message = getErrorMessage(error);
    return {
      message,
      data: env.NEXT_PUBLIC_NODE_ENV === "development" ? shape.data : defaultErrorData,
      code: shape.code,
    };
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

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new ExpectedError({ code: "UNAUTHORIZED", message: "User is not authenticated" });
  }

  return next({ ctx: { session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(authMiddleware);
