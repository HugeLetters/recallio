import type { NextRouter } from "next/router";
import type { Query } from "nextjs-routes";
import type IconFC from "~icons/";

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

export type Icon = typeof IconFC;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type StrictPick<T, K extends keyof T> = Pick<T, K>;
export type ModelProps<T> = { value: T; setValue: (value: T) => void };
export type DiscriminatedUnion<
  V extends Record<string, unknown>,
  U extends Record<string, unknown>
> =
  | (V & { [K in Exclude<keyof U, keyof V>]?: never })
  | (U & { [K in Exclude<keyof V, keyof U>]?: never });
