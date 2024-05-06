import { logToastError } from "@/interface/toast";
import type { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";

export function fetchNextPage<Q extends UseTRPCInfiniteQueryResult<unknown, unknown>>(
  { isFetching, hasNextPage, fetchNextPage }: Q,
  onError = logToastError("Failed to load more content."),
) {
  return function () {
    if (isFetching || !hasNextPage) return;
    fetchNextPage().catch(onError);
  };
}
