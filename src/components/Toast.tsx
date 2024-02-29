import { hasFocusWithin, useHasMouse } from "@/hooks";
import { tw } from "@/utils";
import { Store, useStore } from "@/utils/store";
import type { StrictOmit } from "@/utils/type";
import * as Toast from "@radix-ui/react-toast";
import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Flipper } from "react-flip-toolkit";
import { Flipped } from "./animation/flip";
import { onSelfTransitionEnd } from "./animation/utils";

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

type ToastOptions = { id?: string; className?: string; duration?: number };
type ToastData = { id: string; content: ReactNode } & ToastOptions;
class ToastStackStore extends Store<ToastData[]> {
  private addNewToast(toast: ToastData) {
    this.updateState((state) => [...state, toast]);
  }
  private updateActiveToast(toast: ToastData) {
    const state = this.getSnapshot();
    if (toast.id === state.at(-1)?.id) {
      this.resetToast(toast);
    } else {
      this.moveToEnd(toast);
    }
  }
  private resetToast(toast: ToastData) {
    const duration = toast.duration;
    flushSync(() => {
      toast.duration = Infinity;
      this.updateState((state) => [...state]);
    });
    toast.duration = duration;
    this.updateState((state) => [...state]);
  }
  private moveToEnd(toast: ToastData) {
    flushSync(() => this.removeToast(toast.id));
    this.addNewToast(toast);
  }

  addToast(
    toast: ReactNode,
    { duration = 5000, id = `${Math.random()}`, ...options }: ToastOptions,
  ) {
    id = id.replaceAll(/\s+/g, "");
    const state = this.getSnapshot();
    const activeToast = state.find((toast) => toast.id === id);
    if (activeToast) {
      this.updateActiveToast(activeToast);
    } else {
      this.addNewToast({ content: toast, duration, ...options, id });
    }

    return id;
  }
  removeToast(id: ToastData["id"]) {
    this.updateState((state) => state.filter((toast) => toast.id !== id));
  }
}
const toastStackStore = new ToastStackStore([]);

type ToastCloseProps = ComponentPropsWithoutRef<typeof Toast.Close>;
const ToastClose = forwardRef<HTMLButtonElement, ToastCloseProps>(function _(
  { children, className, ...props },
  ref,
) {
  return (
    <Toast.Close
      ref={ref}
      aria-label="Close notification"
      className={tw(className, "w-full whitespace-pre-wrap break-words p-4 outline-none")}
      {...props}
    >
      {children}
    </Toast.Close>
  );
});

type PublicToastOptions = StrictOmit<ToastOptions, "className">;
export const toast = {
  info(message: ReactNode, options?: PublicToastOptions) {
    return toastStackStore.addToast(
      <ToastClose>
        <Toast.Description>{message}</Toast.Description>
      </ToastClose>,
      { className: "bg-white focus-visible-within:ring-2 ring-app-green-500", ...options },
    );
  },
  error(error: ReactNode, options?: PublicToastOptions) {
    return toastStackStore.addToast(
      <ToastClose className="text-app-red-550">
        <Toast.Description>{error}</Toast.Description>
      </ToastClose>,
      { className: "bg-app-red-100 focus-visible-within:ring-2 ring-app-red-500", ...options },
    );
  },
  remove(id: ToastData["id"]) {
    toastStackStore.removeToast(id);
  },
};

export function logToastError(message: ReactNode) {
  return function (error: unknown) {
    console.error(error);
    toast.error(message);
  };
}
