import { tw } from "@/styles/tw";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";

export const ButtonLike = forwardRef<HTMLElement, PropsWithChildren<ButtonProps>>(function _(
  { children, className, ...props },
  ref,
) {
  return (
    <Slot
      ref={ref}
      className={tw("clickable rounded-xl px-2.5 py-3.5", className)}
      {...props}
    >
      {children}
    </Slot>
  );
});

type ButtonProps = ComponentPropsWithoutRef<"button">;
export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(function _(
  { type, ...restProps },
  ref,
) {
  return (
    <ButtonLike>
      <button
        ref={ref}
        type={type ?? "button"}
        {...restProps}
      />
    </ButtonLike>
  );
});
