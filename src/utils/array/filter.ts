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

export function mapFilter<A, B, C extends B>(
  array: A[],
  transform: (value: A) => B,
  filter: Filter<B, C>,
): C[] {
  return array.reduce<C[]>((acc, el) => {
    const mapped = transform(el);
    const result = filter(mapped, filterSymbol);
    if (isNotFiltered(result)) {
      acc.push(result);
    }
    return acc;
  }, []);
}
