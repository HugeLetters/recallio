import { env } from "@/env/index.mjs";
import { getServerAuthSession } from "@/server/auth";
import { TRPCError, initTRPC } from "@trpc/server";
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
    return {
      message: cause instanceof ZodError ? `${cause.errors[0]?.message}` : error.message,
      data:
        env.NEXT_PUBLIC_NODE_ENV === "production" ? ({} as Partial<typeof shape.data>) : shape.data,
      code: shape.code,
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { session: ctx.session } });
});

export const protectedProcedure = t.procedure.use(authMiddleware);
