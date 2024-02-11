import { hasFocusWithin, useHasMouse } from "@/hooks";
import { tw } from "@/utils";
import * as Toast from "@radix-ui/react-toast";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Flipper } from "react-flip-toolkit";
import { Flipped } from "../Animation";

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
  const toasts = useToastStack();
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
          "fixed right-2 top-2 z-10 w-72 outline-none before:absolute before:-inset-2",
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
    currentTarget.addEventListener(
      "transitionend",
      () => {
        currentTarget.classList.remove("data-[swipe=cancel]:transition");
      },
      { once: true },
    );
  }

  return (
    <Flipped
      flipId={id}
      key={id}
      className="animate-slide-left animate-function-ease-out"
      scale
      translate
    >
      {/* todo - when stacked only last toast should be focusable */}
      {/* todo - maybe I could retain elapsed duration when a new toast is added? */}
      <Toast.Root
        duration={!isStacked || isLast ? duration : Infinity}
        onOpenChange={(isToastOpen) => {
          if (isToastOpen) return;
          toastStackStore.removeToast(id);
        }}
        onSwipeMove={setSwipeOpacity}
        onSwipeCancel={resetSwipeOpacity}
        style={{ "--offset": toastOffset } as CSSProperties}
        className={tw(
          className,
          "group h-fit w-full overflow-hidden transition-opacity duration-300 shadow-around sa-o-15 sa-r-1",
          "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:opacity-[var(--opacity)] data-[swipe=move]:transition-none",
          "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:opacity-[var(--opacity)]",
          isStacked && "-bottom-[var(--offset)] -left-[var(--offset)]",
          isStacked && !isLast && "pointer-events-none absolute h-full",
          isStacked && !isLastThree && "opacity-0",
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
            {content}
          </Flipped>
          {isLast && duration && duration !== Infinity && (
            <div
              style={{ "--duration": `${duration}ms` } as CSSProperties}
              className={tw(
                "absolute bottom-0 h-1 w-full origin-left bg-black/10",
                "animate-expand-x-reverse animate-duration-[var(--duration)] animate-function-linear animation-fill-mode-forward",
                "transition-opacity duration-300 group-data-[state=closed]:opacity-0",
                !isStacked && "opacity-0 animation-play-state-pause",
              )}
            />
          )}
        </div>
      </Toast.Root>
    </Flipped>
  );
}

type ToastOptions = { className?: string; duration?: number };
type ToastData = { id: string; content: ReactNode } & ToastOptions;
type Subscription = () => void;
type Unsubscribe = () => void;
type Subscribe = (subscription: Subscription) => Unsubscribe;
class ToastStackStore {
  private toastStack: ToastData[] = [];
  private subscriptions = new Set<Subscription>();
  private notify() {
    for (const subscription of this.subscriptions) {
      subscription();
    }
  }

  addToast(toast: ReactNode, { duration = 5000, ...options }: ToastOptions = {}) {
    const id = `${Math.random()}`;
    this.toastStack = [...this.toastStack, { content: toast, duration, ...options, id }];
    this.notify();

    return id;
  }
  removeToast(id: ToastData["id"]) {
    this.toastStack = this.toastStack.filter((toast) => toast.id !== id);
    this.notify();
  }

  subscribe: Subscribe = (onStoreChange) => {
    this.subscriptions.add(onStoreChange);
    return () => {
      this.subscriptions.delete(onStoreChange);
    };
  };
  getSnapshot = () => {
    return this.toastStack;
  };
}
const toastStackStore = new ToastStackStore();
function useToastStack() {
  return useSyncExternalStore(
    toastStackStore.subscribe,
    toastStackStore.getSnapshot,
    toastStackStore.getSnapshot,
  );
}

export const toast = {
  info(message: ReactNode) {
    return toastStackStore.addToast(
      <Toast.Close
        aria-label="Close notification"
        className="w-full p-4"
      >
        <Toast.Description>{message}</Toast.Description>
      </Toast.Close>,
      { className: "bg-white rounded-xl" },
    );
  },
  error(error: ReactNode) {
    return toastStackStore.addToast(
      <Toast.Close
        aria-label="Close notification"
        className="w-full break-words p-4 text-app-red-550"
      >
        <Toast.Description>{error}</Toast.Description>
      </Toast.Close>,
      { className: "bg-app-red-100 rounded-xl" },
    );
  },
  remove(id: ToastData["id"]) {
    toastStackStore.removeToast(id);
  },
};

}
