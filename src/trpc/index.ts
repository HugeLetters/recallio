import { getBaseUrl } from "@/browser";
import { FAILED_TO_FETCH_MESSAGE, getErrorMessage } from "@/error";
import { toast } from "@/interface/toast";
import { getSafeId } from "@/interface/toast/id";
import { logger } from "@/logger";
import type { ApiRouter } from "@/server/api/router";
import { isDev } from "@/utils";
import { MutationCache, QueryCache } from "@tanstack/react-query";
import type { CreateTRPCProxyClient } from "@trpc/client";
import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { signOutOnUnauthorizedError } from "./auth";
import { QueryErrorHandler } from "@/error/query";

export const trpc = createTRPCNext<ApiRouter>({
  config() {
    return {
      links: [
        loggerLink({
          enabled: (opts) => isDev || (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({ url: `${getBaseUrl()}/api/trpc` }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            retry: 1,
            networkMode: "offlineFirst",
          },
        },
        queryCache: new QueryCache({
          onError(error, query) {
            logger.error(error);
            if (query.meta?.error instanceof QueryErrorHandler) {
              query.meta.error.error(query);
              return;
            }

            const message = getErrorMessage(error);
            if (message !== FAILED_TO_FETCH_MESSAGE) {
              setTimeout(() => {
                const isErrorDisplayed = !!document.querySelector(
                  `div[data-error-id="${getSafeId(message)}"]`,
                );
                if (isErrorDisplayed) return;
                toast.error(`Error while trying to retrieve data: ${message}`, { id: message });
              });
            }

            signOutOnUnauthorizedError(error);
          },
        }),
        mutationCache: new MutationCache({
          onError(error) {
            logger.error(error);
            signOutOnUnauthorizedError(error);
          },
        }),
      },
    };
  },
  ssr: false,
});

export type RouterInputs = inferRouterInputs<ApiRouter>;
export type RouterOutputs = inferRouterOutputs<ApiRouter>;

class TrpcLazy {
  #client: CreateTRPCProxyClient<ApiRouter> | undefined;
  get client() {
    this.#client ??= createTRPCProxyClient<ApiRouter>({
      links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })],
    });

    return this.#client;
  }
}
export const trpcLazy = new TrpcLazy();
