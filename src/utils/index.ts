import type { Query } from "nextjs-routes";

export function getQueryParam(query: Query[string]) {
  if (!query) return undefined;
  return Array.isArray(query) ? query.at(-1) : query;
}

export const minutesToMs = (minutes: number) => minutes * 60 * 1000;
export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type StrictPick<T, K extends keyof T> = Pick<T, K>;
export type ModelProps<T> = { value: T; setValue: (value: T) => void };
export type DiscriminatedUnion<
  V extends Record<string, unknown>,
  U extends Record<string, unknown>
> =
  | (V & { [K in Exclude<keyof U, keyof V>]?: undefined })
  | (U & { [K in Exclude<keyof V, keyof U>]?: undefined });
