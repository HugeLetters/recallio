export function merge<T extends BaseObject, O>(
  target: T,
  object: O,
): Prettify<Omit<T, keyof O> & O> {
  return { ...target, ...object };
}

export function isObject(value: unknown): value is BaseObject {
  return !!value && typeof value === "object";
}

export function hasTruthyProperty<O, K extends keyof O>(
  object: O,
  key: K,
): object is O & Record<K, NonNullable<O[K]>> {
  return !!object[key];
}

export function hasProperty<K extends PropertyKey>(
  value: BaseObject,
  key: K,
): value is Record<K, unknown> {
  return key in value;
}

export type BaseObject = Record<never, unknown>;
export type Prettify<T> = { [K in keyof T]: T[K] } & NonNullable<unknown>;
export type DistributedRecord<K extends PropertyKey, V> = K extends K ? Record<K, V> : never;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type TransformProperty<O, K extends keyof O, T> = Prettify<StrictOmit<O, K> & Record<K, T>>;
export type ExtendPropety<O, K extends keyof O, E> = TransformProperty<O, K, O[K] | E>;
export type DiscriminatedUnion<V, U> =
  | Prettify<V & { [K in Exclude<keyof U, keyof V>]?: never }>
  | Prettify<U & { [K in Exclude<keyof V, keyof U>]?: never }>;
