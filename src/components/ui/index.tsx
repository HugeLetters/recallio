import { tw } from "@/utils";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { forwardRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button">;
export const Button = forwardRef<HTMLButtonElement, PropsWithChildren<ButtonProps>>(function _(
  { className, type, children, ...restProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={tw("btn", className)}
      {...restProps}
    >
      {children}
    </button>
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
        "rounded-lg p-3 outline outline-1 outline-app-green-500 focus-within:outline-2",
        className,
      )}
      {...inputProps}
    />
  );
});

type AutoresizableInputProps = {
  initialContent: string;
  rootClassName?: string;
} & ComponentPropsWithoutRef<"textarea">;
export const AutoresizableInput = forwardRef<HTMLTextAreaElement, AutoresizableInputProps>(
  function _({ initialContent, rootClassName, className, onChange, ...props }, ref) {
    return (
      <div className={tw("overflow-hidden", rootClassName)}>
        <div
          className="relative flex after:invisible after:h-full after:w-full after:whitespace-pre-wrap after:break-words after:content-[attr(data-input)]"
          data-input={initialContent + "\n"}
        >
          <textarea
            ref={ref}
            className={tw(
              "absolute inset-0 size-full resize-none break-words outline-none",
              className,
            )}
            {...props}
            onChange={(e) => {
              onChange?.(e);

              const parent = e.target.parentElement;
              if (!parent) return;

              parent.dataset.input = e.target.value + "\n";
            }}
          />
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
