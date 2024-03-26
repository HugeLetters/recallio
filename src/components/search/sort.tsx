import { Flipped } from "@/animation/flip";
import { getQueryParam, setQueryParam } from "@/browser/query";
import { useQueryToggleState } from "@/browser/query/hooks";
import { useSwipe } from "@/browser/swipe";
import { DialogOverlay } from "@/components/ui/dialog";
import { rootStore } from "@/layout/root";
import { useStore } from "@/state/store";
import { clamp } from "@/utils";
import { includes } from "@/utils/array";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { Flipper } from "react-flip-toolkit";
import SwapIcon from "~icons/iconamoon/swap-light";
import style from "./sort.module.css";

const overDragLimit = 20;
const closeDragLimit = 75;
const maxDragRatio = 1 + overDragLimit / closeDragLimit;

type SortDialogProps = { optionList: OptionList };
export function SortDialog({ optionList }: SortDialogProps) {
  const router = useRouter();
  const sortBy = useSortQuery(optionList);
  const dialogRef = useRef<HTMLDivElement>(null);
  const main = useStore(rootStore);
  const [isOpen, setIsOpen] = useQueryToggleState("sort-drawer");
  const swipeHandler = useSwipe({
    onSwipe({ movement: { dy } }) {
      const dialog = dialogRef.current;
      if (dialog) {
        const boundedOffset = Math.max(-overDragLimit, dy);
        dialog.style.setProperty("--drawer-offset", `${boundedOffset}px`);
      }

      if (main) {
        const progress = clamp(0, 1 - dy / closeDragLimit, maxDragRatio);
        main.style.setProperty("--drawer-progress", `${progress}`);
      }
    },
    onSwipeStart() {
      main?.style.setProperty("--drawer-duration", "0ms");

      const dialog = dialogRef.current;
      if (dialog) {
        dialog.style.transitionDuration = "0ms";
      }
    },
    onSwipeEnd({ movement: { dy } }) {
      main?.style.removeProperty("--drawer-duration");

      if (dy > closeDragLimit) {
        setIsOpen(false);
        return;
      }

      main?.style.setProperty("--drawer-progress", "1");
      const dialog = dialogRef.current;
      if (dialog) {
        dialog.style.removeProperty("--drawer-offset");
        dialog.style.transitionDuration = "";
      }
    },
  });

  useEffect(() => {
    if (!main) return;

    main.style.setProperty("--drawer-progress", isOpen ? "1" : "0");
    return () => {
      main.style.removeProperty("--drawer-progress");
    };
  }, [main, isOpen]);

  useEffect(() => {
    if (!main) return;

    const { transition } = main.style;
    const addedTransition = "scale var(--drawer-duration), border-radius var(--drawer-duration)";
    main.style.transition = transition ? `${transition}, ${addedTransition}` : addedTransition;
    // css modules ts plugin only works for LSP, not when running tsc - which given an error w/o non-null assertion
    const contentClass = style.content!;
    main.classList.add(contentClass);

    return () => {
      main.style.transition = transition;
      main.classList.remove(contentClass);
    };
  }, [main]);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Dialog.Trigger className="flex items-center gap-1 p-1 text-sm">
        <SwapIcon className="size-6" />
        {/* keeps trigger always the same size */}
        <div className="relative">
          <span className="invisible whitespace-nowrap capitalize">
            {optionList.toSorted((a, b) => b.length - a.length)[0]}
          </span>
          <span className="absolute left-0 w-full text-left capitalize">{sortBy}</span>
        </div>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="flex items-end justify-center">
          {/* main content zoom out idea taken from here - https://www.vaul-svelte.com/ */}
          <Dialog.Content
            ref={dialogRef}
            style={{ "--translate": `calc(var(--drawer-offset, 0px) + ${overDragLimit}px)` }}
            className="max-w-app grow translate-y-[var(--translate)] rounded-t-xl bg-white p-5 pb-10 transition-transform shadow-around sa-o-20 sa-r-2.5 motion-safe:animate-slide-up data-[state=closed]:motion-safe:animate-slide-up-reverse"
          >
            <button
              type="button"
              aria-label="drag down to close"
              onPointerDown={swipeHandler}
              className="relative mx-auto block h-2 w-20 rounded-full bg-neutral-200 outline-neutral-400 after:absolute after:-inset-2"
            />
            <Dialog.Title className="mb-6 text-xl font-semibold">Sort By</Dialog.Title>
            <Flipper
              flipKey={sortBy}
              spring={{ stiffness: 700, overshootClamping: true }}
              className="contents"
            >
              <RadioGroup.Root
                value={sortBy}
                onValueChange={(value) => {
                  setQueryParam({ router, key: SORT_QUERY_KEY, value });
                }}
                className="flex flex-col gap-2"
              >
                {optionList.map((option) => (
                  <RadioGroup.Item
                    autoFocus={option === sortBy}
                    value={option}
                    key={option}
                    className="group flex items-center gap-2 rounded-lg px-1 py-2 outline-none"
                  >
                    <div className="flex aspect-square w-6 items-center justify-center rounded-full border-2 border-neutral-400 bg-white group-data-[state=checked]:border-app-green-500">
                      <Flipped
                        flipId={`${option === sortBy}`}
                        key={`${option === sortBy}`}
                      >
                        <RadioGroup.Indicator className="block aspect-square w-4 rounded-full bg-app-green-500" />
                      </Flipped>
                    </div>
                    <span className="capitalize">{option}</span>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            </Flipper>
          </Dialog.Content>
        </DialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const SORT_QUERY_KEY = "sort";
type OptionList = readonly [string, ...string[]];
export function useSortQuery<const T extends OptionList>(optionList: T): T[number] {
  const router = useRouter();
  const query = getQueryParam(router.query[SORT_QUERY_KEY]);

  if (query && includes(optionList, query)) return query;

  if (query !== undefined) {
    setQueryParam({ router, key: SORT_QUERY_KEY, value: null });
  }
  return optionList[0];
}
