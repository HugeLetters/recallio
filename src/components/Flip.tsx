import { type ComponentPropsWithoutRef } from "react";
import { Flipped as NativeFlipped } from "react-flip-toolkit";

export type FlippedProps = ComponentPropsWithoutRef<typeof NativeFlipped> & {
  /** Put your animation class here */
  className?: string;
};
export function Flipped({ children, className, onAppear, onExit, ...props }: FlippedProps) {
  const classList = className?.split(" ");
  return (
    <NativeFlipped
      onAppear={(element, index, decisionData) => {
        if (classList) {
          element.classList.add(...classList);
          element.style.opacity = "1";
        }
        onAppear?.(element, index, decisionData);
      }}
      onExit={(element, index, remove, decisionData) => {
        if (classList) {
          element.classList.add(...classList, "animate-reverse");
          element.addEventListener("animationend", remove, { once: true });
          element.style.pointerEvents = "none";
        }
        onExit?.(element, index, remove, decisionData);
      }}
      {...props}
    >
      {children}
    </NativeFlipped>
  );
}
