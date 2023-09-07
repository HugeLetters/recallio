import { produce, type Draft, freeze } from "immer";
import { useCallback, useState } from "react";

// undefined enforces we don't return anything in the same drafter
// Immer allows returning values in drafter if you didn't also mutate it but I don't need that feature
export type Drafter<T> = (draft: Draft<T>) => undefined;
export type Updater<T> = (arg: T | Drafter<T>) => void;

/**
 * Retunred setter callback is stable.
 */
export function useImmer<T>(initValue: T | (() => T)): [T, Updater<T>] {
  const [val, setVal] = useState(
    freeze(typeof initValue === "function" ? (initValue as () => T)() : initValue)
  );

  return [
    val,
    useCallback(
      (updater) => setVal(typeof updater === "function" ? produce(updater as Drafter<T>) : updater),
      []
    ),
  ];
}
