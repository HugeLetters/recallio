import type { ComponentPropsWithoutRef } from "react";
import { Flipped as NativeFlipped } from "react-flip-toolkit";
import { getClassList, onSelfAnimationDone } from "./utils";

const dataTransitionName = "data-transition";
export interface FlippedProps extends ComponentPropsWithoutRef<typeof NativeFlipped> {
  /** These classes will be applied on in and out transitions. Out transition will also apply `animate-reverse` class */
  className?: string;
}
/**
 * You may detect if element is currently transitioning in or out with `data-transition` attribute with values `in | out`
 */
export function Flipped({ children, className, onAppear, onExit, ...props }: FlippedProps) {
  const classList = getClassList(className);
  return (
    <NativeFlipped
      onAppear={(element, index, decisionData) => {
        onAppear?.(element, index, decisionData);
        if (!classList) return;

        element.style.opacity = "";
        // we have to trigger a reflow here due to how flip library works with opacity
        element.offsetHeight;
        element.classList.add(...classList);
        element.setAttribute(dataTransitionName, "in");

        onSelfAnimationDone(element, () => {
          element.classList.remove(...classList);
          element.removeAttribute(dataTransitionName);
        });
      }}
      onExit={(element, index, remove, decisionData) => {
        onExit?.(element, index, remove, decisionData);
        if (!classList) return remove();

        element.classList.add(...classList, "animate-reverse");
        element.setAttribute(dataTransitionName, "out");
        onSelfAnimationDone(element, remove);
        element.style.pointerEvents = "none";
      }}
      {...props}
    >
      {children}
    </NativeFlipped>
  );
}
