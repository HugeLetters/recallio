/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */
import { signOut } from "@/auth";
import { browser } from "@/browser";
import { toast } from "@/components/toast";
import type { ApiRouter } from "@/server/api/router";
import { hasProperty } from "@/utils/object";
import { QueryCache } from "@tanstack/react-query";
import { TRPCClientError, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// todo - https://responsively.app/

function getBaseUrl() {
  if (browser) return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 1853}`; // dev SSR should use localhost
}

export const trpc = createTRPCNext<ApiRouter>({
  config() {
    return {
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnMount: false,
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
              if (hasProperty(data, "code") && data.code === "UNAUTHORIZED") {
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
