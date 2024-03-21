import { tw } from "@/styles/tw";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";

export const ButtonLike = forwardRef<HTMLElement, PropsWithChildren<ButtonProps>>(function _(
  { children, ...props },
  ref,
) {
  return (
    <Slot
      ref={ref}
      className="clickable rounded-xl px-2.5 py-3.5"
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

type InputProps = ComponentPropsWithoutRef<"input">;
export const Input = forwardRef<HTMLInputElement, InputProps>(function _(
  { className, ...inputProps },
  ref,
) {
  return (
    <input
      ref={ref}
      className={tw(
        "rounded-lg p-3 outline outline-1 outline-offset-0 outline-app-green-500 focus-within:outline-2",
        className,
      )}
      {...inputProps}
    />
  );
});

interface AutoresizableInputProps extends ComponentPropsWithoutRef<"textarea"> {
  initialContent: string;
  rootClassName?: string;
}
export const AutoresizableInput = forwardRef<HTMLTextAreaElement, AutoresizableInputProps>(
  function _({ initialContent, rootClassName, className, onChange, children, ...props }, ref) {
    return (
      <div className={tw("overflow-hidden", rootClassName)}>
        <div
          className="relative flex after:invisible after:h-full after:w-full after:whitespace-pre-wrap after:break-words after:content-[attr(data-input)]"
          data-input={initialContent + "\n"}
        >
          <textarea
            ref={ref}
            className={tw(
              "absolute inset-0 size-full resize-none overflow-hidden break-words outline-none",
              className,
            )}
            {...props}
            onChange={(e) => {
              onChange?.(e);

              const parent = e.target.parentElement;
              if (!parent) return;

              parent.dataset.input = e.target.value + "\n";
            }}
          >
            {children}
          </textarea>
        </div>
      </div>
    );
  },
);

type WithLabelProps = { label: string; className?: string };
export function WithLabel({ children, label, className }: PropsWithChildren<WithLabelProps>) {
  return (
    <label className={tw("flex flex-col", className)}>
      <p className="p-2 text-sm">{label}</p>
      {children}
    </label>
  );
}
