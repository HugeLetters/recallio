import { freeze, produce, type Draft } from "immer";
import { atom } from "jotai";
import { useCallback, useState } from "react";

type Drafter<T> = (draft: Draft<T>) => void;
type Updater<T> = (arg: T | Drafter<T>) => void;

export function immerAtom<T>(initialValue: T) {
  const createdAtom = atom(initialValue, (get, set, updater: T | Drafter<T>) => {
    set(
      createdAtom,
      produce<T>(typeof updater === "function" ? (updater as Drafter<T>) : () => updater)(
        get(createdAtom)
      )
    );
  });
  return createdAtom;
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
