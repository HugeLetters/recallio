import { logger } from "@/logger";
import { isArray } from "@/utils/array";
import type { NextRouter } from "next/router";
import type { Query } from "nextjs-routes";

export function getQueryParam(query: Query[string]) {
  if (query === undefined) return undefined;
  return isArray(query) ? query.at(-1) : query;
}

type SetQueryParamOptions = {
  router: NextRouter;
  key: string;
  value?: string | null;
  push?: boolean;
};

/** Deletes falsy values */
export function setQueryParam({ key, router, push, value }: SetQueryParamOptions) {
  if (!value) {
    delete router.query[key];
  } else {
    router.query[key] = value;
  }

  if (push) {
    router.push({ query: router.query }, undefined, { shallow: true }).catch(logger.error);
  } else {
    router.replace({ query: router.query }, undefined, { shallow: true }).catch(logger.error);
  }
}
