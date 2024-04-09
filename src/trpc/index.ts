import { signOut } from "@/auth";
import { getBaseUrl } from "@/browser";
import { toast } from "@/components/toast";
import type { ApiRouter } from "@/server/api/router";
import { isDev } from "@/utils";
import { hasProperty, isObject } from "@/utils/object";
import { QueryCache } from "@tanstack/react-query";
import { TRPCClientError, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export const trpc = createTRPCNext<ApiRouter>({
  config() {
    return {
      links: [
        loggerLink({
          enabled: (opts) => isDev || (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            retry: 1,
          },
        },
        queryCache: new QueryCache({
          onError(error) {
            console.error(error);
            const message = error instanceof Error ? error.message : String(error);
            toast.error(`Error while trying to retrieve data: ${message}`, { id: message });
            if (error instanceof TRPCClientError) {
              const data: unknown = error.data;
              if (isObject(data) && hasProperty(data, "code") && data.code === "UNAUTHORIZED") {
                signOut().catch(console.error);
              }
            }
          },
        }),
      },
    };
  },
  ssr: false,
});

export type RouterInputs = inferRouterInputs<ApiRouter>;

export type RouterOutputs = inferRouterOutputs<ApiRouter>;
