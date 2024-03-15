import { useRef, useState } from "react";

type OptmicticValue<T> = { value: T; isActive: true } | { value?: never; isActive: false };
export function useOptimistic<T>(value: T) {
  const [optimistic, setOptimistic] = useState<OptmicticValue<T>>({ isActive: false });
  const actionQueue = useRef<() => void>();

  return {
    isUpdating: optimistic.isActive,
    value: optimistic.isActive ? optimistic.value : value,
    setOptimistic: (value: T, action: () => void) => {
      if (optimistic.isActive) {
        actionQueue.current = action;
      } else {
        action();
      }
      setOptimistic({ value, isActive: true });
    },
    reset: () => {
      if (!actionQueue.current) {
        setOptimistic({ isActive: false });
        return;
      }
      actionQueue.current();
      actionQueue.current = undefined;
    },
  };
}
