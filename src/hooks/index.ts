import type { AppFileRouter } from "@/server/uploadthing";
import { browser } from "@/utils";
import { generateReactHelpers } from "@uploadthing/react/hooks";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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
    setOptimistic: (value: T) => {
      setOptimistic({ value, isActive: true });
    },
    queueUpdate: (callback: () => void) => {
      if (optimistic.isActive) {
        queuedAction.current = callback;
      } else {
        callback();
      }
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

export function useAsyncComputed<T, R>(state: T, transform: (draft: T) => Promise<R>) {
  const [computed, setComputed] = useState<R>();
  useEffect(() => {
    transform(state).then(setComputed).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return computed;
}
