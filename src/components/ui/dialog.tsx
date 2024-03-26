import { lato } from "@/styles/font";
import { tw } from "@/styles/tw";
import { Overlay } from "@radix-ui/react-dialog";
import type { ComponentPropsWithRef, PropsWithChildren } from "react";
import { forwardRef } from "react";

interface DialogOverlayProps extends PropsWithChildren, ComponentPropsWithRef<typeof Overlay> {}
export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(function _(
  { children, className, ...props },
  ref,
) {
  return (
    <Overlay
      ref={ref}
      {...props}
      className={tw(
        "fixed inset-0 z-10 animate-fade-in bg-black/40 font-lato data-[state=closed]:animate-fade-in-reverse",
        className,
        lato.variable,
      )}
    >
      {children}
    </Overlay>
  );
});
