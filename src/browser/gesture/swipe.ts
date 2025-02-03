import type { PointerEventHandler, RefObject } from "react";
import { useRef } from "react";
import { useDrag } from "./drag";

type Movement = { dx: number; dy: number };
interface OnSwipeEndData {
  movement: Movement;
}
interface OnSwipeData {
  movement: Movement;
}
type UseSwipeOptions = {
  onSwipe?: (data: OnSwipeData) => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: (data: OnSwipeEndData) => void;
  ignore?: RefObject<Element>;
};
/**
 * @returns handler for `pointerdown` events
 */
export function useSwipe({
  onSwipe,
  onSwipeStart,
  onSwipeEnd,
  ignore,
}: UseSwipeOptions): PointerEventHandler<HTMLElement> {
  const origin = useRef<Movement | null>(null);

  return useDrag({
    ignore,
    onDrag(e) {
      if (!onSwipe) {
        return;
      }

      origin.current ??= { dx: 0, dy: 0 };
      const dx = e.clientX - origin.current.dx;
      const dy = e.clientY - origin.current.dy;

      onSwipe({ movement: { dx, dy } });
    },
    onDragStart(e) {
      origin.current = {
        dx: e.clientX,
        dy: e.clientY,
      };

      onSwipeStart?.();
    },
    onDragEnd(e) {
      if (!onSwipeEnd) {
        return;
      }

      origin.current ??= { dx: 0, dy: 0 };
      const dx = e.clientX - origin.current.dx;
      const dy = e.clientY - origin.current.dy;

      onSwipeEnd({ movement: { dx, dy } });
    },
  });
}
