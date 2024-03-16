import RightIcon from "~icons/formkit/right";
import { Transition } from "@/animation/transition";
import { tw } from "@/styles/tw";
import { useEffect, useRef, useState } from "react";

type ScrollUpButtonProps = {
  threshold?: number;
  className?: string;
  hide?: boolean;
};
export function ScrollUpButton({ threshold = 500, hide, className }: ScrollUpButtonProps) {
  const root = useRef<HTMLDivElement>(null);
  const [isThershold, setIsThershold] = useState(false);

  useEffect(() => {
    const container = root.current?.parentElement;
    if (!container) return;

    const position = container.style.position;
    container.style.position = "relative";

    setIsThershold(container.scrollTop > threshold);
    const scrollHandler = function () {
      setIsThershold(container.scrollTop > threshold);
    };
    container.addEventListener("scroll", scrollHandler);

    return () => {
      container.removeEventListener("scroll", scrollHandler);
      container.style.position = position;
    };
  }, [threshold]);

  return (
    <div
      className="absolute bottom-2 right-2"
      ref={root}
    >
      <Transition
        inClassName="animate-slide-up"
        outClassName="animate-slide-up-reverse"
      >
        {!hide && isThershold && (
          <div className={tw("fixed z-10", className)}>
            <div className="-translate-x-full -translate-y-full">
              <button
                type="button"
                aria-label="Scroll to top of the section"
                onClick={() => {
                  const container = root.current?.parentElement;
                  if (!container) return;
                  container.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group clickable flex aspect-square items-center rounded-full bg-app-green-500 p-1 text-white ring-1 ring-white shadow-around sa-o-25 sa-r-1"
              >
                <RightIcon className="size-8 -rotate-90 transition-transform duration-200 group-active:-translate-y-0.5" />
              </button>
            </div>
          </div>
        )}
      </Transition>
    </div>
  );
}

// todo - add profile setting to disable scroll up button
// todo - scroll-up button hide/show should be controlled by a stack store
