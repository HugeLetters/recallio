import { tw } from "@/styles/tw";
import type { StrictOmit } from "@/utils/object";
import * as Toast from "@radix-ui/react-toast";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";
import type { ToastData, ToastOptions } from "./_store";
import { toastStackStore } from "./_store";

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
