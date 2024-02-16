import { createNextApiHandler } from "@trpc/server/adapters/next";
import { env } from "@/env.mjs";
import { appRouter } from "@/server/api";
import { createTRPCContext } from "@/server/api/trpc";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  // todo - should I toast smth here?
  onError:
    env.NEXT_PUBLIC_NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
        }
      : undefined,
});
