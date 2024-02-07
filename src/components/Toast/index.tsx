import * as Toast from "@radix-ui/react-toast";
import { useSyncExternalStore, type PropsWithChildren, type ReactNode } from "react";
import { Flipper } from "react-flip-toolkit";
import { Flipped } from "../Animation";

export function ToastProvider({ children }: PropsWithChildren) {
  const toasts = useSyncExternalStore(
    toastStackStore.subscribe,
    toastStackStore.getSnapshot,
    toastStackStore.getSnapshot,
  );

  console.log(toasts);
  return (
    <Toast.Provider duration={Infinity}>
      {children}
      <Flipper
        flipKey={toasts}
        spring={{}}
        className="contents"
      >
        <Toast.Viewport className="fixed right-2 top-2 z-50 flex flex-col gap-2">
          {toasts.map((toast) => {
            return (
              <Flipped
                flipId={toast.id}
                className="animate-scale-in"
                key={toast.id}
              >
                <Toast.Root
                  open={true}
                  onOpenChange={(open) => {
                    if (open) return;
                    toastStackStore.removeToast(toast.id);
                  }}
                >
                  <Toast.Close>{toast.content}</Toast.Close>
                </Toast.Root>
              </Flipped>
            );
          })}
        </Toast.Viewport>
      </Flipper>
    </Toast.Provider>
  );
}

type Toast = { id: string; content: ReactNode };
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

  addToast(toast: ReactNode) {
    const id = `${Math.random()}`;
    this.toastStack = [...this.toastStack, { content: toast, id }];
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

export function errorToast(error: string) {
  toastStackStore.addToast(<div className="whitespace-pre-wrap text-app-red-500">{error}</div>);
}

export function closeToast(id: Toast["id"]) {
  toastStackStore.removeToast(id);
}
