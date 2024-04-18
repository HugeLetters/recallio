import { apiRouter } from "@/server/api/router";
import { createTRPCContext } from "@/server/api/trpc";
import { mergeCacheControl } from "@/server/api/utils/cache";
import { env } from "@/server/env/index.mjs";
import { createNextApiHandler } from "@trpc/server/adapters/next";

export default createNextApiHandler({
  router: apiRouter,
  createContext: createTRPCContext,
  onError:
    env.NEXT_PUBLIC_NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: [${error.code}] ${error.message}`,
          );
        }
      : undefined,
  responseMeta({ data }) {
    return {
      headers: {
        "Cache-Control": mergeCacheControl(data) ?? undefined,
      },
    };
  },
});
