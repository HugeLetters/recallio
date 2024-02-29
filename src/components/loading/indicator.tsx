import { useClient } from "@/hooks/client";
import { Store, useStore } from "@/utils/store";
import type { PropsWithChildren } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Transition } from "../animation/transition";
import { Spinner } from "./spinner";

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
  const isClient = useClient();

  return (
    <>
      {children}
      {isClient
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
