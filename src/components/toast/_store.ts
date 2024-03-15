import { Store } from "@/state/store";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

export type ToastOptions = { id?: string; className?: string; duration?: number };
export type ToastData = { id: string; content: ReactNode } & ToastOptions;

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

export const toastStackStore = new ToastStackStore([]);
