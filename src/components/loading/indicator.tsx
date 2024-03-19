import { Transition } from "@/animation/transition";
import { useClient } from "@/browser";
import { useStore } from "@/state/store";
import { TrackerStore } from "@/state/store/tracker";
import type { PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./spinner";

export const loadingTracker = new TrackerStore();

export function LoadingProvider({ children }: PropsWithChildren) {
  const show = useStore(loadingTracker);
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
