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

const filterSymbol: unique symbol = Symbol("filter");
type Filtered = typeof filterSymbol;
type Filter<T, V extends T> = (value: T, removed: Filtered) => V | Filtered;
function isNotFiltered<V>(value: V | Filtered): value is V {
  return value !== filterSymbol;
}

export function filterOut<T, V extends T>(array: T[], predicate: Filter<T, V>): V[] {
  return array.filter((value): value is V => isNotFiltered(predicate(value, filterSymbol)));
}

export function filterMap<A, B extends A, C>(
  array: A[],
  filter: Filter<A, B>,
  transform: (value: B) => C,
): C[] {
  return array.reduce<C[]>((acc, el) => {
    const result = filter(el, filterSymbol);
    if (isNotFiltered(result)) {
      acc.push(transform(result));
    }
    return acc;
  }, []);
}
