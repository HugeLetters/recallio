import { useMounted } from "@/hooks";
import { useAtomValue, useSetAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { useEffect, useId, useRef, type PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { Transition } from "./Animation";

const DURATION = 1000;
const DOT_COUNT = 12;
const DOTS = Array.from({ length: DOT_COUNT });
type SpinnerProps = { className?: string };
export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
    >
      {DOTS.map((_, i) => (
        <circle
          key={i}
          cx="12"
          cy="2"
          r="0"
          transform={`rotate(${360 * (i / DOT_COUNT)})`}
          className={`origin-center ${i % 2 ? "fill-app-green" : "fill-app-green/30"}`}
        >
          <animate
            attributeName="r"
            dur={`${DURATION}ms`}
            begin={`${i * (DURATION / DOT_COUNT)}ms`}
            keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
            values="0;2;0;0"
            calcMode="spline"
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

function stackReducer<T>(draft: T[], action: { type: "ADD" | "REMOVE"; value: T }) {
  if (!action) return draft;
  switch (action.type) {
    case "ADD":
      return [...draft, action.value];
    case "REMOVE":
      return draft.filter((frame) => frame !== action.value);
  }
}

const loadingStackAtom = atomWithReducer([], stackReducer<string>);
export function LoadingIndicatorProvider({ children }: PropsWithChildren) {
  const stack = useAtomValue(loadingStackAtom);
  const show = !!stack.length;
  const mounted = useMounted();

  return (
    <>
      {children}
      {mounted
        ? createPortal(
            <Transition outClassName="animate-fade-out">
              {show ? (
                <Spinner className="pointer-events-none absolute bottom-2 right-2 z-20 h-10 animate-fade-in rounded-full bg-neutral-400/25 p-1 contrast-200" />
              ) : null}
            </Transition>,
            document.body,
          )
        : null}
    </>
  );
}

// todo - some imperative handle for page transitions
export function useLoadingIndicator(show: boolean, delay = 0) {
  const setStack = useSetAtom(loadingStackAtom);
  const timeout = useRef<number>();
  const id = useId();

  useEffect(() => {
    clearTimeout(timeout.current);
    if (!show) {
      setStack({ type: "REMOVE", value: id });
      return;
    }

    timeout.current = window.setTimeout(() => setStack({ type: "ADD", value: id }), delay);
    return () => {
      setStack({ type: "REMOVE", value: id });
    };
  }, [id, setStack, show, delay]);
}
