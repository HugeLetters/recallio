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

export class SelectList<const T> {
  #currentIndex: number;
  #indexOf(values: typeof this.values, value: T) {
    const index = values.indexOf(value);
    return index !== -1 ? index : null;
  }
  #setIndex(index: number) {
    this.#currentIndex = clamp(0, index, this.values.length - 1);
  }
  #raise(value: T): never {
    throw Error(`Provided value ${JSON.stringify(value)} is not in the list`);
  }

  constructor(public values: readonly [T, ...T[]], initial = values[0]) {
    this.#currentIndex = this.#indexOf(values, initial) ?? this.#raise(initial);
  }

  previous(): T {
    this.#setIndex(this.#currentIndex - 1);
    return this.values[this.#currentIndex] ?? this.values[0];
  }
  next(): T {
    this.#setIndex(this.#currentIndex + 1);
    return this.values[this.#currentIndex] ?? this.values[this.values.length - 1] ?? this.values[0];
  }
  set(value: T): T {
    this.#currentIndex = this.#indexOf(this.values, value) ?? this.#raise(value);
    return this.values[this.#currentIndex] ?? this.values[0];
  }
  get(): T {
    return this.values[this.#currentIndex] ?? this.values[0];
  }
}
