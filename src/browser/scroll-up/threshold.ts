import type { Nullish } from "@/utils/type";
import { useEffect, useState } from "react";

type ScrollThresholdOptions = {
  threshold: number;
  target: Nullish<HTMLElement>;
  resetOnUp?: boolean;
};
export function useScrollThreshold({
  target,
  threshold,
  resetOnUp = false,
}: ScrollThresholdOptions) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!target) return;

    let lastPos = target.scrollTop;
    const scrollHandler = function () {
      const scroll = target.scrollTop;
      if (resetOnUp && lastPos > scroll) {
        setIsActive(false);
      } else {
        setIsActive(scroll > threshold);
      }
      lastPos = scroll;
    };
    scrollHandler();
    target.addEventListener("scroll", scrollHandler);

    return () => {
      target.removeEventListener("scroll", scrollHandler);
    };
  }, [threshold, target, resetOnUp]);

  return isActive;
}
