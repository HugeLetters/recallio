import type { PointerEventHandler, RefObject } from "react";
import { useRef } from "react";
import { useDrag } from "./drag";

type Movement = { dx: number; dy: number };
interface OnSwipeStartData {
  swipeTarget: HTMLElement;
}
interface OnSwipeEndData extends OnSwipeStartData {
  movement: Movement;
}
interface OnSwipeData extends OnSwipeStartData {
  movement: Movement;
}
type UseSwipeOptions = {
  onSwipe?: (data: OnSwipeData) => void;
  onSwipeStart?: (data: OnSwipeStartData) => void;
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
  const swipeTarget = useRef<HTMLElement | null>(null);

  return useDrag({
    ignore,
    onDrag(e) {
      if (!onSwipe) {
        return;
      }
      if (!swipeTarget.current) {
        return;
      }

      origin.current ??= { dx: 0, dy: 0 };
      const dx = e.clientX - origin.current.dx;
      const dy = e.clientY - origin.current.dy;

      onSwipe({ movement: { dx, dy }, swipeTarget: swipeTarget.current });
    },
    onDragStart(e) {
      origin.current = {
        dx: e.clientX,
        dy: e.clientY,
      };

      swipeTarget.current = e.currentTarget;
      onSwipeStart?.({ swipeTarget: swipeTarget.current });
    },
    onDragEnd(e) {
      if (!onSwipeEnd) {
        return;
      }
      if (!swipeTarget.current) {
        return;
      }

      origin.current ??= { dx: 0, dy: 0 };
      const dx = e.clientX - origin.current.dx;
      const dy = e.clientY - origin.current.dy;

      onSwipeEnd({ movement: { dx, dy }, swipeTarget: swipeTarget.current });
    },
  });
}
