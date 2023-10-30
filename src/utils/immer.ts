import { freeze, produce, type Draft } from "immer";
import { atomWithReducer } from "jotai/utils";
import { useCallback, useState } from "react";

type Drafter<T> = (draft: Draft<T>) => void;
type Updater<T> = (arg: T | Drafter<T>) => void;

export function immerAtom<T>(initialValue: T) {
  return atomWithReducer<T, Drafter<T> | T>(initialValue, (state, action) => {
    return typeof action === "function" ? produce(state, action as Drafter<T>) : action ?? state;
  });
}

/**
 * Returned setter callback is stable.
 */
export function useImmer<T>(initValue: T | (() => T)): [T, Updater<T>] {
  const [value, setValue] = useState(
    freeze(typeof initValue === "function" ? (initValue as () => T)() : initValue)
  );

  return [
    value,
    useCallback(
      (updater) =>
        setValue(typeof updater === "function" ? produce(updater as Drafter<T>) : updater),
      []
    ),
  ];
}
