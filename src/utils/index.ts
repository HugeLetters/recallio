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

export function isNonEmptyString(value: unknown): value is string {
  return !!value && typeof value === "string";
}

const indexList = [0, 1, 2, 3] as const;
type Quadruplet<T> = [T?, T?, T?, T?];
export function getTopQuadruplet<T>(arr: T[]) {
  const counter = new Map<T, number>();
  for (const element of arr) {
    const count = counter.get(element) ?? 0;
    counter.set(element, count + 1);
  }

  const quadruplet: Quadruplet<T> = [];
  function checkIndex(index: 0 | 1 | 2 | 3, count: number, element: T) {
    const value = quadruplet[index];
    if (value && count <= (counter.get(value) ?? -1)) return false;

    for (let i = 3; i > index; i--) {
      quadruplet[i] = quadruplet[i - 1];
    }
    quadruplet[index] = element;
    return true;
  }

  for (const [element, count] of counter) {
    indexList.some((index) => checkIndex(index, count, element));
  }
  return quadruplet;
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
export type MaybePromise<T> = T | Promise<T>;
