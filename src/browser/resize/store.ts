import type { StableValue } from "@/state/stable";
import { useStableValue } from "@/state/stable";
import { useEffect } from "react";

type ResizeListener = () => void;
export const resizeListeners = new Set<StableValue<ResizeListener>>();

export function useResizeListener(listener: ResizeListener) {
  const stableListener = useStableValue(listener);

  useEffect(() => {
    resizeListeners.add(stableListener);
    return () => {
      resizeListeners.delete(stableListener);
    };
  }, [stableListener]);
}
