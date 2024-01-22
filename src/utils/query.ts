import type { NextRouter } from "next/router";
import type { Query } from "nextjs-routes";

export function getQueryParam(query: Query[string]) {
  if (query === undefined) return undefined;
  return Array.isArray(query) ? query.at(-1) : query;
}

type SetQueryParamOptions = { push?: boolean };
/** Deletes falsy values */
export function setQueryParam(
  router: NextRouter,
  key: string,
  value?: string | null,
  options?: SetQueryParamOptions,
) {
  if (!value) {
    delete router.query[key];
  } else {
    router.query[key] = value;
  }

  if (options?.push) {
    void router.push({ query: router.query });
    return;
  }
  void router.replace({ query: router.query });
}
