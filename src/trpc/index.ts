import { signOut } from "@/auth";
import { getBaseUrl } from "@/browser";
import { toast } from "@/components/toast";
import { FAILED_TO_FETCH_MESSAGE } from "@/error";
import type { ApiRouter } from "@/server/api/router";
import type { ExpectedError } from "@/server/error/trpc";
import { isDev } from "@/utils";
import { hasProperty, isObject } from "@/utils/object";
import { MutationCache, QueryCache } from "@tanstack/react-query";
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
            if (message === FAILED_TO_FETCH_MESSAGE) return;

            toast.error(`Error while trying to retrieve data: ${message}`, { id: message });
            signOutOnUnauthorizedError(error);
          },
        }),
        mutationCache: new MutationCache({
          onError(error) {
            console.error(error);
            signOutOnUnauthorizedError(error);
          },
        }),
      },
    };
  },
  ssr: false,
});

const UNATHORIZED_CODE: ExpectedError["code"] = "UNAUTHORIZED";
function signOutOnUnauthorizedError(error: unknown) {
  if (error instanceof TRPCClientError) {
    const data: unknown = error.data;
    if (isObject(data) && hasProperty(data, "code") && data.code === UNATHORIZED_CODE) {
      signOut().catch(console.error);
    }
  }
}

export type RouterInputs = inferRouterInputs<ApiRouter>;

export type RouterOutputs = inferRouterOutputs<ApiRouter>;
