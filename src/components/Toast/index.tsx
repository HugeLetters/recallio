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
// todo - how to deal with error disappearing when stack is closed?
function ToastContainer() {
  const toasts = useSyncExternalStore(
    toastStackStore.subscribe,
    toastStackStore.getSnapshot,
    toastStackStore.getSnapshot,
  );

  const [isStackOpen, setIsStackOpen] = useState(false);
  const hasMouse = useHasMouse();
  const toastViewportHandlers: ComponentPropsWithoutRef<"ol"> = hasMouse
    ? {
        onMouseEnter: () => setIsStackOpen(true),
        onMouseLeave: ({ currentTarget }) => {
          if (currentTarget.contains(document.activeElement)) return;
          setIsStackOpen(false);
        },
        onFocusCapture: () => setIsStackOpen(true),
        onBlur: hasFocusWithin(setIsStackOpen),
      }
    : {};

  const flipKey = useMemo(() => ({ isOpen: isStackOpen, toasts }), [isStackOpen, toasts]);
  return (
    <Flipper
      flipKey={flipKey}
      className="contents"
    >
      <Toast.Viewport
        className={tw(
          "fixed right-2 top-2 z-10 w-72 before:absolute before:-inset-2",
          isStackOpen && "flex flex-col-reverse items-end gap-2",
        )}
        {...toastViewportHandlers}
      >
        {toasts.map(({ content, id, className, duration }, index) => {
          const isLastThree = toasts.length - index <= 3;
          const isLast = toasts.length - 1 === index;
          return (
            <Flipped
              flipId={id}
              key={id}
              className="animate-slide-left animate-function-ease-out"
              scale
              translate
            >
              {/* todo - tabindex on mobile, only the last toast should be focusable */}
              <Toast.Root
                onOpenChange={(isToastOpen) => {
                  if (isToastOpen) return;
                  toastStackStore.removeToast(id);
                }}
                onSwipeMove={({ currentTarget, detail: { delta } }) => {
                  const newOpacity = `${1 - delta.x / (swipeThreshold * 1.3)}`;
                  currentTarget.style.setProperty("--opacity", newOpacity);
                }}
                onSwipeCancel={({ currentTarget }) => {
                  currentTarget.style.setProperty("--opacity", null);

                  currentTarget.classList.add("data-[swipe=cancel]:transition");
                  currentTarget.addEventListener(
                    "transitionend",
                    () => {
                      currentTarget.classList.remove("data-[swipe=cancel]:transition");
                    },
                    { once: true },
                  );
                }}
                style={
                  {
                    "--offset": !isStackOpen ? `${(toasts.length - 1 - index) / 2}rem` : undefined,
                  } as CSSProperties
                }
                className={tw(
                  className,
                  "h-fit w-full transition-opacity shadow-around sa-o-10 sa-r-0.5",
                  "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:opacity-[var(--opacity)] data-[swipe=move]:transition-none",
                  "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:opacity-[var(--opacity)]",
                  !isStackOpen && "-bottom-[var(--offset)] -left-[var(--offset)]",
                  // todo - these appear over the last toast when removing themselves automatically
                  !isStackOpen && !isLast && "pointer-events-none absolute h-full",
                  !isStackOpen && !isLastThree && "opacity-0",
                )}
                duration={duration}
              >
                <div
                  className={tw(
                    "h-full w-full overflow-hidden transition-opacity",
                    !isStackOpen && !isLast && "opacity-0",
                  )}
                >
                  <Flipped
                    inverseFlipId={id}
                    scale
                  >
                    {content}
                  </Flipped>
                </div>
                {/* todo - progress bar */}
              </Toast.Root>
            </Flipped>
          );
        })}
      </Toast.Viewport>
    </Flipper>
  );
}

type ToastOptions = { className?: string; duration?: number };
type Toast = { id: string; content: ReactNode } & ToastOptions;
type Subscription = () => void;
type Unsubscribe = () => void;
type Subscribe = (subscription: Subscription) => Unsubscribe;
class ToastStackStore {
  private toastStack: Toast[] = [];
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
  removeToast(id: Toast["id"]) {
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

// todo - test other toast styles and how they fit together
export function errorToast(error: ReactNode) {
  return toastStackStore.addToast(
    <Toast.Close
      aria-label="Close notification"
      className="w-full break-words p-4 text-app-red-550"
    >
      <Toast.Description>{error}</Toast.Description>
    </Toast.Close>,
    { className: "bg-app-red-100 rounded-xl" },
  );
}

export function closeToast(id: Toast["id"]) {
  toastStackStore.removeToast(id);
}
