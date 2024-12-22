import { useRef } from "react";

export type StableValue<V> = { readonly current: V };
export function useStableValue<V>(value: V): StableValue<V> {
  const synced = useRef(value);
  // eslint-disable-next-line react-compiler/react-compiler
  synced.current = value;
  return synced;
}
