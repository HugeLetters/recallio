import type { Nullish } from "@/utils/type";
import { useEffect, useState } from "react";

type ScrollDownOptions = {
  downThreshold: number;
  target: Nullish<HTMLElement>;
};
export function useScrollUp({ target, downThreshold }: ScrollDownOptions) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!target) {
      return;
    }

    let lastPos = target.scrollTop;
    const scrollHandler = function () {
      const scroll = target.scrollTop;

      if (lastPos > scroll) {
        setIsActive(scroll > downThreshold);
      } else {
        setIsActive(false);
      }

      lastPos = scroll;
    };
    scrollHandler();
    target.addEventListener("scroll", scrollHandler);

    return () => {
      target.removeEventListener("scroll", scrollHandler);
      setIsActive(false);
    };
  }, [target, downThreshold]);

  return isActive;
}
