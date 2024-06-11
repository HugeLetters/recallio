export type Some<T> = {
  readonly ok: true;
  readonly value: T;
};
export type None = {
  readonly ok: false;
};
export type Option<T> = Some<T> | None;

export const none: None = Object.freeze({ ok: false });
export function some<T>(value: T): Some<T> {
  return { ok: true, value };
}

export function isSome<O extends Option<unknown>>(option: O): option is Extract<O, Some<unknown>> {
  return option.ok;
}
