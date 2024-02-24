import { browser, tw } from "@/utils";
import { Store, useStore } from "@/utils/store";
import type { PropsWithChildren } from "react";
import { useEffect, useId, useRef } from "react";
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
          className={tw("origin-center", i % 2 ? "fill-app-green-500" : "fill-app-green-500/30")}
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

class LoadingStore extends Store<boolean> {
  private stack: string[] = [];
  private computeState() {
    this.setState(!!this.stack.length);
  }
  add(value: string) {
    this.stack.push(value);
    this.computeState();
  }
  remove(value: string) {
    this.stack = this.stack.filter((frame) => frame !== value);
    this.computeState();
  }
}

const loadingStore = new LoadingStore(false);
export function LoadingIndicatorProvider({ children }: PropsWithChildren) {
  const show = useStore(loadingStore);

  return (
    <>
      {children}
      {browser
        ? createPortal(
            <Transition outClassName="animate-fade-in-reverse">
              {show && (
                <Spinner className="pointer-events-none absolute bottom-2 right-2 z-20 h-10 animate-fade-in rounded-full bg-neutral-400/25 p-1 contrast-200" />
              )}
            </Transition>,
            document.body,
          )
        : null}
    </>
  );
}

export function useSetLoadingIndicator() {
  const id = useId();
  return { enable: () => loadingStore.add(id), disable: () => loadingStore.remove(id) };
}

export function useLoadingIndicator(show: boolean, delay = 0) {
  const timeout = useRef<number>();
  const id = useId();

  useEffect(() => {
    if (!show) {
      loadingStore.remove(id);
      return;
    }

    timeout.current = window.setTimeout(() => loadingStore.add(id), delay);
    return () => {
      clearTimeout(timeout.current);
      loadingStore.remove(id);
    };
  }, [id, show, delay]);
}
