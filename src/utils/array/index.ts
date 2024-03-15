export type NonEmptyArray<T> = [T, ...Array<T>];
export type Entries<O, $Keys extends keyof O = keyof O> = NonEmptyArray<
  $Keys extends $Keys ? [$Keys, O[$Keys]] : never
>;

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

export function mostCommon(count: number) {
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
