export type NonEmptyArray<T> = [T, ...Array<T>];
export type TupleIndex<T extends ReadonlyArray<unknown>> = keyof T &
  `${number}` extends `${infer N extends number}`
  ? N
  : never;

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function nonEmptyArray<T>(array: T[]): array is NonEmptyArray<T> {
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

function baseSortFn<T>(a: NonNullable<T>, b: NonNullable<T>) {
  return a.toString() > b.toString() ? 1 : -1;
}

export function mostCommon(count: number) {
  return function <T>(arr: T[], sortFn = baseSortFn<T>): NonNullable<T>[] {
    const counter = new Map<NonNullable<T>, number>();
    for (const element of arr) {
      if (element == null) continue;

      const count = counter.get(element) ?? 0;
      counter.set(element, count + 1);
    }

    return Array.from(counter)
      .sort(([x, a], [y, b]) => {
        if (a === b) return sortFn(x, y);
        return b - a;
      })
      .slice(0, count)
      .map(([v]) => v);
  };
}
