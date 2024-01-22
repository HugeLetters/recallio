import type { NextPage } from "next";
import { type ReactNode } from "react";
import type IconFC from "~icons/";

export type Icon = typeof IconFC;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type TransformType<O, K extends keyof O, T> = Omit<StrictOmit<O, K> & Record<K, T>, never>;
export type ModelProps<T> = { value: T; setValue: (value: T) => void };
export type DiscriminatedUnion<
  V extends Record<string, unknown>,
  U extends Record<string, unknown>,
> =
  | (V & { [K in Exclude<keyof U, keyof V>]?: never })
  | (U & { [K in Exclude<keyof V, keyof U>]?: never });

export type MaybePromise<T> = T | Promise<T>;
export type Nullish<T> = T | null | undefined;

export type Some<T> = { ok: true; value: T };
export type None = { ok: false };
export type Option<T> = Some<T> | None;
export type SomeOfOption<O extends Option<unknown>> = Extract<O, Some<unknown>>;

export type NextPageWithLayout<P = unknown, IP = P> = NextPage<P, IP> & {
  noAuth?: boolean;
  getLayout?: (page: ReactNode) => ReactNode;
};

export type NonEmptyArray<T> = [T, ...Array<T>];

export type Entries<O, $Keys extends keyof O = keyof O> = NonEmptyArray<
  $Keys extends $Keys ? [$Keys, O[$Keys]] : never
>;
