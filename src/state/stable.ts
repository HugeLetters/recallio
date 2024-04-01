import { useMemo, useRef } from "react";

export type StableValue<V> = { readonly current: V };
export function useStableValue<V>(value: V): StableValue<V> {
  const synced = useRef(value);
  synced.current = value;
  return useMemo(
    () =>
      Object.freeze({
        get current() {
          return synced.current;
        },
      }),
    [],
  );
}
