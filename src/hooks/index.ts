import type { AppFileRouter } from "@/server/uploadthing";
import { browser } from "@/utils";
import { generateReactHelpers } from "@uploadthing/react/hooks";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

export const { useUploadThing } = generateReactHelpers<AppFileRouter>();

/**
 * @param callback this will be invoked with an boolean argument if this element contains focused element or not
 * @returns function which you need to pass to your onBlur handler
 */
export function hasFocusWithin(callback: (hasFocusWithin: boolean) => void) {
  return function (e: React.FocusEvent) {
    const root = e.currentTarget;
    // setTimeout is needed because when focus changes focus first moves to document.body and only then to a newly focused element.
    // by checking activeElement asynchronously we check for the actual focsed element
    setTimeout(() => {
      callback(root.contains(document.activeElement));
    });
  };
}

const reviewPrivateDefaultKey = "review-private-default";
export function useReviewPrivateDefault() {
  const [value, setStateValue] = useState(() =>
    browser ? localStorage.getItem(reviewPrivateDefaultKey) !== "false" : true,
  );

  function setValue(value: boolean) {
    setStateValue(value);
    localStorage.setItem(reviewPrivateDefaultKey, `${value}`);
  }

  return [value, useCallback(setValue, [])] as const;
}

type OptmicticValue<T> = { value: T; isActive: true } | { value?: never; isActive: false };
export function useOptimistic<T>() {
  const [optimistic, setOptimistic] = useState<OptmicticValue<T>>({ isActive: false });
  const queuedAction = useRef<() => void>();

  return {
    optimistic,
    queueUpdate: (value: T, callback: () => void) => {
      if (optimistic.isActive) {
        queuedAction.current = callback;
      } else {
        callback();
      }
      setOptimistic({ value, isActive: true });
    },
    onUpdateEnd: () => {
      if (!queuedAction.current) {
        setOptimistic({ isActive: false });
        return;
      }
      queuedAction.current();
      queuedAction.current = undefined;
    },
  };
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export function useHasMouse() {
  return useRef(browser ? matchMedia("(pointer:fine)").matches : false).current;
}

export function useSyncedRef<V>(value: V) {
  const synced = useRef(value);
  synced.current = value;
  return useMemo(
    () =>
      Object.freeze({
        get current() {
          return synced.current;
        },
      }),
    [],
  );
}

// todo - test on mobile
// todo - try to ignore taps
type Movement = { dx: number; dy: number };
type UseDragOptions = {
  onDragStart?: () => void;
  onDragEnd?: (movement: Movement) => void;
  onDrag?: (movement: Movement) => void;
};
export function useSwipe(
  { current: target }: RefObject<HTMLElement>,
  { onDrag, onDragStart, onDragEnd }: UseDragOptions = {},
) {
  const onDragStartSynced = useSyncedRef(onDragStart);
  const onDragEndSynced = useSyncedRef(onDragEnd);
  const onDragSynced = useSyncedRef(onDrag);

  useEffect(() => {
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
      onDragStartSynced.current?.();
    }
    target.addEventListener("pointerdown", onPointerDown);

    function onPointerMove(e: PointerEvent) {
      e.preventDefault();
      if (!e.isPrimary) return;
      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onDragSynced.current?.({ dx, dy });
    }

    function onPointerUp(e: PointerEvent) {
      cleanup();
      const dx = e.clientX - origin.dx;
      const dy = e.clientY - origin.dy;
      onDragEndSynced.current?.({ dx, dy });
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
  }, [target, onDragStartSynced, onDragEndSynced, onDragSynced]);
}
