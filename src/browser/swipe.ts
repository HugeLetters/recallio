import { useSyncedRef } from "@/state/ref";
import type { RefObject } from "react";
import { useEffect } from "react";

type Movement = { dx: number; dy: number };
type UseSwipeOptions = {
  onSwipeStart?: () => void;
  onSwipeEnd?: (movement: Movement) => void;
  onSwipe?: (movement: Movement) => void;
};
export function useSwipe(
  ref: RefObject<HTMLElement>,
  { onSwipe: onSwipe, onSwipeStart, onSwipeEnd }: UseSwipeOptions = {},
) {
  const onSwipeStartSynced = useSyncedRef(onSwipeStart);
  const onSwipeEndSynced = useSyncedRef(onSwipeEnd);
  const onSwipeSynced = useSyncedRef(onSwipe);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const origin: Movement = { dx: 0, dy: 0 };
    function onPointerDown(e: PointerEvent) {
      if (!e.isPrimary) return;
      cleanup();
      origin.dx = e.clientX;
      origin.dy = e.clientY;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
      window.addEventListener("pointercancel", onPointerCancel, { once: true });
      onSwipeStartSynced.current?.();
    }
    target.addEventListener("pointerdown", onPointerDown);

    function onPointerMove(e: PointerEvent) {
      e.preventDefault();
      if (!e.isPrimary) return;
      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onSwipeSynced.current?.({ dx, dy });
    }

    function onPointerUp(e: PointerEvent) {
      cleanup();
      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onSwipeEndSynced.current?.({ dx, dy });
    }
    const onPointerCancel = onPointerUp;

    function cleanup() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    }

    return () => {
      cleanup();
      target.removeEventListener("pointerdown", onPointerDown);
    };
  }, [ref, onSwipeStartSynced, onSwipeEndSynced, onSwipeSynced]);
}
