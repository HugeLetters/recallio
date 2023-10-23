import { atomWithReducer } from "jotai/utils";
import { clamp } from ".";

class SelectList<const T> {
  constructor(public values: [T, ...T[]], public value = values[0]) {}

  #clampIndex = (index: number) => clamp(0, index, this.values.length - 1);
  #getIndex(value: T) {
    const index = this.values.indexOf(value);
    if (index === -1) return null;
    return index;
  }

  prev(): T {
    const index = this.#getIndex(this.value) ?? 0;
    this.value = this.values[this.#clampIndex(index - 1)] ?? this.values[0];
    return this.value;
  }
  next(): T {
    const index = this.#getIndex(this.value) ?? this.values.length - 1;
    this.value = this.values[this.#clampIndex(index + 1)] ?? this.values.at(-1) ?? this.values[0];
    return this.value;
  }
  set(value: T): T {
    this.value = value;
    return this.value;
  }
}
const selection = new SelectList(["upload", "scan", "input"], "scan");
type SelectionAtomEvent =
  | { action: "next" | "prev"; activateUpload: () => void }
  | { action: "set"; value: typeof selection.value };
export const selectionAtom = atomWithReducer(
  selection.value,
  (prevValue, payload: SelectionAtomEvent) => {
    function getNewValue() {
      switch (payload.action) {
        case "next":
          return selection.next();
        case "prev":
          return selection.prev();
        case "set":
          return selection.set(payload.value);
        default:
          const x: never = payload;
          return x;
      }
    }
    const newValue = getNewValue();

    if (payload.action !== "set" && newValue === "upload" && newValue !== prevValue) {
      payload.activateUpload();
    }

    return newValue;
  }
);
