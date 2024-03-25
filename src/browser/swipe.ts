import type { PointerEventHandler } from "react";
import { useEffect, useRef } from "react";

type Movement = { dx: number; dy: number };
interface onSwipeStartData {
  target: HTMLElement;
}
interface onSwipeEndData extends onSwipeStartData {
  movement: Movement;
}
interface onSwipeData extends onSwipeStartData {
  movement: Movement;
}
type UseSwipeOptions = {
  onSwipe?: (data: onSwipeData) => void;
  onSwipeStart?: (data: onSwipeStartData) => void;
  onSwipeEnd?: (data: onSwipeEndData) => void;
};
/**
 * @returns handler for `pointerdown` events
 */
export function useSwipe({
  onSwipe,
  onSwipeStart,
  onSwipeEnd,
}: UseSwipeOptions = {}): PointerEventHandler<HTMLElement> {
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return function (e) {
    if (!e.isPrimary) return;
    const target = e.currentTarget;

    const origin: Movement = { dx: 0, dy: 0 };
    function onPointerMove(e: PointerEvent) {
      e.preventDefault();
      if (!e.isPrimary) return;
      if (!onSwipe) return;

      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onSwipe({ movement: { dx, dy }, target });
    }

    function onPointerUp(e: PointerEvent) {
      cleanup();
      if (!onSwipeEnd) return;

      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onSwipeEnd({ movement: { dx, dy }, target });
    }
    const onPointerCancel = onPointerUp;

    function cleanup() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    }
    cleanupRef.current = cleanup;

    origin.dx = e.clientX;
    origin.dy = e.clientY;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerCancel, { once: true });

    onSwipeStart?.({ target });
  };
}
