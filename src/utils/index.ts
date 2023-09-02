import type { Query } from "nextjs-routes";

export function getQueryParam(query: Query[string]) {
  if (!query) return undefined;
  return Array.isArray(query) ? query.at(-1) : query;
}

export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
