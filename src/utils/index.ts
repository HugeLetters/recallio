import type { NextRouter } from "next/router";
import type { Query } from "nextjs-routes";

export const browser = typeof window !== "undefined";

export function getQueryParam(query: Query[string]) {
  if (query === undefined) return undefined;
  return Array.isArray(query) ? query.at(-1) : query;
}

/** Deletes falsy values */
export function setQueryParam(router: NextRouter, key: string, value?: string | null) {
  if (!value) delete router.query[key];
  else router.query[key] = value;

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

export function isValidUrlString(url: string) {
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
  return function <T>(arr: T[]): T[] {
    const counter = new Map<T, number>();
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
