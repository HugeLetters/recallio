import type { Nullish } from "@/utils/type";
import { useEffect, useState } from "react";

type ScrollDownOptions = {
  downThreshold: number;
  target: Nullish<HTMLElement>;
  resetOnUp?: boolean;
};
export function useScrollDown({ target, downThreshold, resetOnUp = false }: ScrollDownOptions) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!target) {
      return;
    }

    let lastPos = target.scrollTop;
    const scrollHandler = function () {
      const scroll = target.scrollTop;
      if (resetOnUp && lastPos > scroll) {
        setIsActive(false);
      } else {
        setIsActive(scroll > downThreshold);
      }
      lastPos = scroll;
    };
    scrollHandler();
    target.addEventListener("scroll", scrollHandler);

    return () => {
      target.removeEventListener("scroll", scrollHandler);
      setIsActive(false);
    };
  }, [target, downThreshold, resetOnUp]);

  return isActive;
}
