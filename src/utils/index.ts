import type { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";
import { filterMap } from "./array";
import type { Option, Prettify, Some } from "./type";

export const browser = typeof window !== "undefined";

export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
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

type Falsy = undefined | null | false;
type ClassGroup = Falsy | string | Array<ClassGroup>;
export function tw(...classGroup: ClassGroup[]): string {
  return filterMap(
    classGroup,
    (x): x is Exclude<ClassGroup, Falsy> => !!x,
    (classGroup) => (Array.isArray(classGroup) ? tw(...classGroup) : classGroup),
  ).join(" ");
}

export function mergeInto<T extends Record<never, unknown>, O>(
  target: T,
  object: O,
): Prettify<Omit<T, keyof O> & O> {
  return Object.assign(target, object);
}
