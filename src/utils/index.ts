import type { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";
import type { Option, Some } from "./type";

export const browser = typeof window !== "undefined";

export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

export function isSome<O extends Option<unknown>>(option: O): option is Extract<O, Some<unknown>> {
  return option.ok;
}
