import { tw } from "@/utils";
import { lato } from "@/utils/font";
import { getQueryParam, setQueryParam } from "@/utils/query";
import { Overlay, Root } from "@radix-ui/react-dialog";
import { useRouter } from "next/router";
import type { ComponentPropsWithRef, PropsWithChildren } from "react";
import { forwardRef, useEffect } from "react";

export function useUrlDialog(queryKey: string) {
  const router = useRouter();
  const isOpen = getQueryParam(router.query[queryKey]);

  // persist query params on navigating back/forward
  useEffect(() => {
    function handler() {
      if (!isOpen) return;
      setQueryParam({ router, key: queryKey, value: null });
    }

    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, [isOpen, queryKey, router]);

  return {
    isOpen: !!isOpen,
    setIsOpen(this: void, open: boolean) {
      setQueryParam({ router, key: queryKey, value: open ? "true" : null, push: true });
    },
  };
}

type UrlDialogRootProps = { dialogQueryKey: string; onOpenChange?: (open: boolean) => void };
export function UrlDialogRoot({
  children,
  dialogQueryKey,
  onOpenChange,
}: PropsWithChildren<UrlDialogRootProps>) {
  const { isOpen, setIsOpen } = useUrlDialog(dialogQueryKey);
  return (
    <Root
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange?.(open);
        setIsOpen(open);
      }}
    >
      {children}
    </Root>
  );
}

export const DialogOverlay = forwardRef<
  HTMLDivElement,
  PropsWithChildren & ComponentPropsWithRef<typeof Overlay>
>(function _({ children, className, ...props }, ref) {
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