import { useMemo, useRef } from "react";

export function useSyncedRef<V>(value: V) {
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
