export type Some<T> = { ok: true; value: T };
export type None = { ok: false };
export type Option<T> = Some<T> | None;

export function isSome<O extends Option<unknown>>(option: O): option is Extract<O, Some<unknown>> {
  return option.ok;
}
