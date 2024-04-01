import { getServerAuthSession } from "@/server/auth";
import { env } from "@/server/env/index.mjs";
import { ExpectedError, defaultErrorMessage } from "@/server/error/trpc";
import { initTRPC } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { Session } from "next-auth";
import { ZodError } from "zod";

interface CreateContextOptions {
  session: Session | null;
}

function createInnerTRPCContext({ session }: CreateContextOptions) {
  return { session };
}

export async function createTRPCContext({ req, res }: CreateNextContextOptions) {
  const session = await getServerAuthSession({ req, res });
  return createInnerTRPCContext({ session });
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    const message =
      cause instanceof ZodError
        ? `${cause.errors[0]?.message}`
        : error instanceof ExpectedError
          ? error.message
          : defaultErrorMessage;

    return {
      message,
      data:
        env.NEXT_PUBLIC_NODE_ENV === "development"
          ? shape.data
          : ({} as Partial<typeof shape.data>),
      code: shape.code,
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new ExpectedError({ code: "UNAUTHORIZED", message: "User is not authenticated" });
  }

  return next({ ctx: { session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(authMiddleware);
