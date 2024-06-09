import type { RefObject } from "react";
import { useEffect, useState } from "react";

type ScrollThresholdOptions = {
  threshold: number;
  target: RefObject<HTMLElement>;
};
export function useScrollThreshold({ target, threshold }: ScrollThresholdOptions) {
  const [isThershold, setIsThershold] = useState(false);

  useEffect(() => {
    const targetElement = target.current;
    if (!targetElement) return;

    const scrollHandler = function () {
      setIsThershold(targetElement.scrollTop > threshold);
    };
    scrollHandler();
    targetElement.addEventListener("scroll", scrollHandler);

    return () => {
      targetElement.removeEventListener("scroll", scrollHandler);
    };
  }, [threshold, target]);

  return isThershold;
}
