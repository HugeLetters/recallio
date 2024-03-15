export function merge<T extends Record<never, unknown>, O>(
  target: T,
  object: O,
): Prettify<Omit<T, keyof O> & O> {
  return { ...target, ...object };
}

export function hasTruthyProperty<O, K extends keyof O>(
  object: O,
  key: K,
): object is O & Record<K, NonNullable<O[K]>> {
  return !!object[key];
}

export function hasProperty<O, K extends PropertyKey>(
  value: O,
  key: K,
): value is O & Record<K, unknown> {
  return value && typeof value === "object" && key in value;
}

export type Prettify<O> = { [K in keyof O]: O[K] } & NonNullable<unknown>;
export type DistributedRecord<K extends PropertyKey, V> = K extends K ? Record<K, V> : never;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type TransformType<O, K extends keyof O, T> = Omit<StrictOmit<O, K> & Record<K, T>, never>;
export type DiscriminatedUnion<
  V extends Record<string, unknown>,
  U extends Record<string, unknown>,
> =
  | Prettify<V & { [K in Exclude<keyof U, keyof V>]?: never }>
  | Prettify<U & { [K in Exclude<keyof V, keyof U>]?: never }>;
