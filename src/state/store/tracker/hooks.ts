import { useEffect, useId, useRef } from "react";
import type { TrackerStore } from ".";

export function useTrackerController(store: TrackerStore) {
  const id = useId();
  return { enable: () => store.add(id), disable: () => store.remove(id) };
}

export function useTracker(store: TrackerStore, enable: boolean, delay = 0) {
  const timeout = useRef<number>();
  const id = useId();

  useEffect(() => {
    if (!enable) {
      store.remove(id);
      return;
    }

    if (delay) {
      timeout.current = window.setTimeout(() => store.add(id), delay);
    } else {
      store.add(id);
    }

    return () => {
      clearTimeout(timeout.current);
      store.remove(id);
    };
  }, [store, id, enable, delay]);
}
