import { useHasMouse } from "@/browser";
import { hasFocusWithin } from "@/browser/focus";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import * as Toast from "@radix-ui/react-toast";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flipper } from "react-flip-toolkit";
import { Flipped } from "../../animation/flip";
import { onSelfTransitionEnd } from "../../animation/utils";
import type { ToastData } from "./_store";
import { toastStackStore } from "./_store";

const swipeThreshold = 70;
export function ToastProvider({ children }: PropsWithChildren) {
  return (
    <Toast.Provider swipeThreshold={swipeThreshold}>
      {children}
      <ToastContainer />
    </Toast.Provider>
  );
}

function ToastContainer() {
  const toasts = useStore(toastStackStore);
  const [isStacked, setIsStacked] = useState(true);
  const hasMouse = useHasMouse();
  const toastViewportHandlers: ComponentPropsWithoutRef<"ol"> = hasMouse
    ? {
        onMouseEnter: () => setIsStacked(false),
        onMouseLeave: ({ currentTarget }) => {
          if (currentTarget.contains(document.activeElement)) return;
          setIsStacked(true);
        },
        onFocusCapture: () => setIsStacked(false),
        onBlur: hasFocusWithin((focused) => setIsStacked(!focused)),
      }
    : {};

  const flipKey = useMemo(() => ({ isStacked, toasts }), [isStacked, toasts]);
  return (
    <Flipper
      flipKey={flipKey}
      className="contents"
    >
      <Toast.Viewport
        className={tw(
          "fixed right-2 top-2 z-50 w-72 outline-none before:absolute before:-inset-2",
          !isStacked && "flex flex-col-reverse items-end gap-2",
        )}
        {...toastViewportHandlers}
      >
        {toasts.map((toast, index) => {
          return (
            <ToastSlot
              key={toast.id}
              toast={toast}
              isStacked={isStacked}
              toastCount={toasts.length}
              toastIndex={index}
            />
          );
        })}
      </Toast.Viewport>
    </Flipper>
  );
}

type ToastSlotProps = {
  toast: ToastData;
  isStacked: boolean;
  toastCount: number;
  toastIndex: number;
};
function ToastSlot({
  toast: { content, id, className, duration },
  isStacked,
  toastCount,
  toastIndex,
}: ToastSlotProps) {
  const isLastThree = toastCount - toastIndex <= 3;
  const isLast = toastCount - 1 === toastIndex;
  const toastOffset = isStacked ? `${(toastCount - toastIndex - 1) / 2}rem` : undefined;

  function setSwipeOpacity(e: Toast.SwipeEvent) {
    const newOpacity = `${1 - e.detail.delta.x / (swipeThreshold * 1.3)}`;
    e.currentTarget.style.setProperty("--opacity", newOpacity);
  }
  function resetSwipeOpacity({ currentTarget }: Toast.SwipeEvent) {
    currentTarget.style.setProperty("--opacity", null);

    currentTarget.classList.add("data-[swipe=cancel]:transition");
    onSelfTransitionEnd(currentTarget, () => {
      currentTarget.classList.remove("data-[swipe=cancel]:transition");
    });
  }

  const divRef = useRef<HTMLLIElement>(null);
  useEffect(
    function setIsInert() {
      if (!divRef.current) return;
      divRef.current.inert = isStacked && !isLast;
    },
    [isStacked, isLast],
  );

  return (
    <Flipped
      flipId={id}
      key={id}
      scale
      translate
      className={tw(
        "animate-slide-left animate-function-ease-out",
        !isLast && "data-[transition=out]:animate-duration-0",
      )}
    >
      <Toast.Root
        ref={divRef}
        tabIndex={undefined}
        duration={!isStacked || isLast ? duration : Infinity}
        onOpenChange={(isToastOpen) => {
          if (isToastOpen) return;
          toastStackStore.removeToast(id);
        }}
        onSwipeMove={setSwipeOpacity}
        onSwipeCancel={resetSwipeOpacity}
        style={{ "--offset": toastOffset }}
        className={tw(
          className,
          "group h-fit w-full overflow-hidden rounded-xl shadow-around sa-o-15 sa-r-1",
          "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:opacity-[var(--opacity)] data-[swipe=move]:transition-none",
          "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:opacity-[var(--opacity)]",
          isStacked && "-bottom-[var(--offset)] -left-[var(--offset)]",
          isStacked && !isLast && "pointer-events-none absolute h-full",
          isStacked && !isLastThree && "opacity-0",
          !isLastThree && "transition-opacity duration-300",
        )}
      >
        <div
          className={tw(
            "relative w-full grow overflow-hidden transition-opacity",
            isStacked && !isLast && "opacity-0",
          )}
        >
          <Flipped
            inverseFlipId={id}
            scale
          >
            {/* this is to prevent "infetterence", I don’t even think that’s a word */}
            {/* Actually this is so that inverse scaling works correctly */}
            <div>{content}</div>
          </Flipped>
          {isLast && duration && duration !== Infinity && (
            <div
              style={{ "--duration": `${duration}ms` }}
              className={tw(
                "absolute bottom-0 h-1 w-full origin-left bg-black/10",
                "animate-expand-x-reverse animate-duration-[var(--duration)] animate-function-linear animation-fill-mode-forward",
                "transition-opacity duration-300 group-data-[state=closed]:opacity-0",
                !isStacked && "opacity-0",
                "animation-play-state-pause group-data-[timer=play]:animation-play-state-play",
              )}
            />
          )}
        </div>
      </Toast.Root>
    </Flipped>
  );
}
