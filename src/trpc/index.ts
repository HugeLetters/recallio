import { signOut } from "@/auth";
import { getBaseUrl } from "@/browser";
import { FAILED_TO_FETCH_MESSAGE, getErrorMessage } from "@/error";
import { toast } from "@/interface/toast";
import { getSafeId } from "@/interface/toast/id";
import type { ApiRouter } from "@/server/api/router";
import type { ExpectedError } from "@/server/error/trpc";
import { isDev } from "@/utils";
import { hasProperty, isObject } from "@/utils/object";
import { MutationCache, QueryCache } from "@tanstack/react-query";
import {
  TRPCClientError,
  createTRPCProxyClient,
  httpBatchLink,
  loggerLink,
  type CreateTRPCProxyClient,
} from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

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
          onError(error) {
            console.error(error);
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
