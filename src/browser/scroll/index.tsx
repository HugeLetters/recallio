import { Transition } from "@/animation/transition";
import { scrollUpButtonEnabledStore } from "@/settings/boolean";
import { useStore } from "@/state/store";
import type { TrackerStore } from "@/state/store/tracker";
import { tw } from "@/styles/tw";
import type { Nullish } from "@/utils/type";
import { useEffect } from "react";
import ArrowIcon from "~icons/formkit/right";
import { useScrollUp } from "./up";

type ScrollUpProps = {
  threshold?: number;
  target: Nullish<HTMLElement>;
  className?: string;
};

interface ScrollUpButtonProps extends ScrollUpProps {
  show: boolean;
}

function ScrollUpButtonImpl({ show, threshold = 500, target, className }: ScrollUpButtonProps) {
  const isScrollActive = useScrollUp({ target, downThreshold: threshold });

  useEffect(() => {
    if (!target) return;

    const position = target.style.position;
    target.style.setProperty("position", "relative");
    return () => {
      target.style.setProperty("position", position);
    };
  }, [target]);

  return (
    <div className="absolute bottom-2 right-2">
      <Transition
        inClassName="animate-slide-up"
        outClassName="animate-slide-up-reverse"
      >
        {show && isScrollActive && (
          <div className={tw("fixed", className)}>
            <div className="-translate-x-full -translate-y-full">
              <button
                type="button"
                aria-label="Scroll to top of the section"
                onClick={() => {
                  target?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group clickable primary flex aspect-square size-full items-center justify-center rounded-full ring-1 ring-white shadow-around sa-o-25 sa-r-1"
              >
                <ArrowIcon className="size-5/6 -rotate-90 transition-transform duration-200 group-active:-translate-y-0.5" />
              </button>
            </div>
          </div>
        )}
      </Transition>
    </div>
  );
}

export function ScrollUpButton(props: ScrollUpButtonProps) {
  const enabled = useStore(scrollUpButtonEnabledStore);
  if (!enabled) return null;
  return <ScrollUpButtonImpl {...props} />;
}

interface TrackedScrollUpButtonProps extends ScrollUpProps {
  tracker: TrackerStore;
}
export function TrackedScrollUpButton({ tracker, ...props }: TrackedScrollUpButtonProps) {
  const show = useStore(tracker);
  return (
    <ScrollUpButton
      show={show}
      {...props}
    />
  );
}
