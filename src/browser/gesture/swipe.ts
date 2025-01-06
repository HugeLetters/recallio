import type { PointerEventHandler, RefObject } from "react";
import { useRef } from "react";
import { useDrag } from "./drag";

type Movement = { dx: number; dy: number };
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface OnSwipeStartData {}
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

      onSwipeStart?.({});
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
