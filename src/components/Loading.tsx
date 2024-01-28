import { useMounted } from "@/hooks";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useId, type PropsWithChildren } from "react";
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

const loadingStackAtom = atom<string[]>([]);
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

export function useLoadingIndicator(show: boolean) {
  const setStack = useSetAtom(loadingStackAtom);
  const id = useId();

  useEffect(() => {
    setStack((stack) => (show ? [...stack, id] : stack.filter((el) => el !== id)));
    return () => {
      setStack((stack) => stack.filter((el) => el !== id));
    };
  }, [id, setStack, show]);
}
