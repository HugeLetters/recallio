import type { PointerEventHandler, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";

type UseDragOptions = {
  onDrag?: (e: PointerEvent) => void;
  onDragStart?: (e: ReactPointerEvent<HTMLElement>) => void;
  onDragEnd?: (e: PointerEvent) => void;
  ignore?: RefObject<Element>;
};
/**
 * @returns handler for `pointerdown` events
 */
export function useDrag({
  onDrag,
  onDragStart,
  onDragEnd,
  ignore,
}: UseDragOptions): PointerEventHandler<HTMLElement> {
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return function (e) {
    if (!e.isPrimary) {
      return;
    }

    const { target } = e;
    if (ignore && target instanceof Element && ignore.current?.contains(target)) {
      return;
    }

    function onPointerMove(e: PointerEvent) {
      e.preventDefault();

      if (!e.isPrimary) {
        return;
      }

      if (!onDrag) {
        return;
      }

      onDrag(e);
    }

    function onPointerUp(e: PointerEvent) {
      cleanup();
      if (!onDragEnd) {
        return;
      }

      onDragEnd(e);
    }
    const onPointerCancel = onPointerUp;

    function cleanup() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    }
    cleanupRef.current = cleanup;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerCancel, { once: true });

    onDragStart?.(e);
  };
}
