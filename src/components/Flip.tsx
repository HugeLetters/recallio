import { useMemo, type ComponentPropsWithoutRef } from "react";
import { Flipped as NativeFlipped, Flipper as NativeFlipper } from "react-flip-toolkit";

export type FlippedProps = ComponentPropsWithoutRef<typeof NativeFlipped> & {
  /** Put your animation class here */
  className?: string;
};
export function Flipped({ children, className, onAppear, onExit, ...props }: FlippedProps) {
  const classList = useMemo(() => className?.split(" "), [className]);
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
          element.classList.add(...classList, "animation-reverse");
          element.addEventListener("animationend", remove, { once: true });
        }
        onExit?.(element, index, remove, decisionData);
      }}
      {...props}
    >
      {children}
    </NativeFlipped>
  );
}

// export type FlipperProps = ComponentPropsWithoutRef<typeof NativeFlipper>;
// export function Flipper({ children, flipKey, ...props }: FlipperProps) {
//   return (
//     <NativeFlipper
//       flipKey={flipKey as unknown}
//       {...props}
//     >
//       {children}
//     </NativeFlipper>
//   );
// }
