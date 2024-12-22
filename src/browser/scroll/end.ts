import type { Nullish } from "@/utils/type";
import { useEffect, useState } from "react";

export function useScrollEnd(target: Nullish<HTMLElement>) {
  const [isEnd, setIsEnd] = useState(false);

  useEffect(() => {
    if (!target) {
      return;
    }

    const scrollHandler = function () {
      setIsEnd(target.offsetHeight + target.scrollTop >= target.scrollHeight - 1);
    };

    target.addEventListener("scroll", scrollHandler);
    return () => {
      target.removeEventListener("scroll", scrollHandler);
    };
  }, [target]);

  return isEnd;
}
