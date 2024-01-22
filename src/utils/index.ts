import type { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";
import type { NextRouter } from "next/router";
import type { Query } from "nextjs-routes";

export const browser = typeof window !== "undefined";

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

export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function nonEmptyArray<T>(array: T[]): array is [T, ...T[]] {
  return !!array.length;
}

/** Checks if element is an array - narrows the type of checked element */
export function includes<T>(array: readonly T[], element: unknown): element is T {
  return array.includes(element as T);
}

export function indexOf(array: readonly unknown[], value: unknown) {
  const index = array.indexOf(value);
  if (index === -1) return null;
  return index;
}

export function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}

export function isUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return !!value && typeof value === "string";
}

export function mostCommonItems(count: number) {
  return function <T>(arr: T[]): NonNullable<T>[] {
    const counter = new Map<NonNullable<T>, number>();
    for (const element of arr) {
      if (element == null) continue;

      const count = counter.get(element) ?? 0;
      counter.set(element, count + 1);
    }

    return Array.from(counter)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([v]) => v);
  };
}

export function fetchNextPage<Q extends UseTRPCInfiniteQueryResult<unknown, unknown>>({
  isFetching,
  hasNextPage,
  fetchNextPage,
}: Q) {
  return function () {
    if (isFetching || !hasNextPage) return;
    fetchNextPage().catch(console.error);
  };
}

export function setIntersection<T>(a: Set<T>, b: Set<T>) {
  const intersection = new Set<T>();
  for (const value of a) {
    if (b.has(value)) intersection.add(value);
  }
  return intersection;
}

export function isSetEqual<T>(a: Set<T>, b: Set<T>) {
  const intersection = setIntersection(a, b);
  return intersection.size === a.size && intersection.size === b.size;
}
