import { createElasticStretchFunction } from "@/animation/elastic";
import { Flipped } from "@/animation/flip";
import { useSwipe } from "@/browser/swipe";
import { DialogOverlay } from "@/interface/dialog";
import { rootStore } from "@/layout/root";
import { getQueryParam, setQueryParam } from "@/navigation/query";
import { useQueryToggleState } from "@/navigation/query/hooks";
import { useStore } from "@/state/store";
import { includes } from "@/utils/array";
import type { Nullish } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { Flipper } from "react-flip-toolkit";
import SwapIcon from "~icons/iconamoon/swap-light";
import style from "./sort.module.css";

// css modules ts plugin only works for LSP, not when running tsc - which given an error w/o non-null assertion
const rootClass = style.root!;

const overDragLimit = 20;
const closeDragLimit = 75;
const elastic = createElasticStretchFunction({
  stretch: overDragLimit,
  coefficient: 1.5,
  cutoff: 0,
});

const progressCssVar = "--drawer-progress";
const durationCssVar = "--drawer-duration";

function updateRootProgress(root: Nullish<HTMLElement>, progress: number) {
  root?.style.setProperty(progressCssVar, `${progress.toFixed(2)}`);
}

type SortDialogProps = { optionList: OptionList };
export function SortDialog({ optionList }: SortDialogProps) {
  const router = useRouter();
  const sortBy = useSortQuery(optionList);
  const dialogRef = useRef<HTMLDivElement>(null);
  const root = useStore(rootStore);
  const [isOpen, setIsOpen] = useQueryToggleState("sort-drawer");
  const swipeHandler = useSwipe({
    onSwipe({ movement: { dy } }) {
      const dialog = dialogRef.current;

      const elasticDy = -elastic(-dy);
      if (dialog) {
        dialog.style.setProperty("--offset", `${elasticDy.toFixed(2)}px`);
      }

      const progress = Math.max(0, 1 - elasticDy / closeDragLimit);
      updateRootProgress(root, progress);
    },
    onSwipeStart() {
      root?.style.setProperty(durationCssVar, "0ms");

      const dialog = dialogRef.current;
      if (dialog) {
        dialog.style.transitionDuration = "0ms";
      }
    },
    onSwipeEnd({ movement: { dy } }) {
      root?.style.removeProperty(durationCssVar);

      if (dy > closeDragLimit) {
        setIsOpen(false);
        return;
      }

      updateRootProgress(root, 1);
      const dialog = dialogRef.current;
      if (dialog) {
        dialog.style.removeProperty("--offset");
        dialog.style.transitionDuration = "";
      }
    },
  });

  useEffect(() => {
    updateRootProgress(root, isOpen ? 1 : 0);
  }, [root, isOpen]);

  useEffect(() => {
    if (!root) return;

    const { transition } = getComputedStyle(root);
    const addedTransition = ["scale", "border-radius"]
      .map((property) => `${property} var(${durationCssVar})`)
      .join(", ");
    root.style.transition = transition ? `${transition}, ${addedTransition}` : addedTransition;

    root.classList.add(rootClass);

    return () => {
      root.style.transition = transition;
      root.classList.remove(rootClass);
      root.style.removeProperty(progressCssVar);
      root.style.removeProperty(durationCssVar);
    };
  }, [root]);

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
            {[...optionList].sort((a, b) => b.length - a.length)[0]}
          </span>
          <span className="absolute left-0 w-full text-left capitalize">{sortBy}</span>
        </div>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="flex items-end justify-center">
          {/* main content zoom out idea taken from here - https://www.vaul-svelte.com/ */}
          <Dialog.Content
            ref={dialogRef}
            style={{ "--translate": `calc(var(--offset, 0px) + ${overDragLimit}px)` }}
            className="max-w-app grow translate-y-[var(--translate)] transition-transform motion-safe:animate-slide-up data-[state=closed]:motion-safe:animate-slide-up-reverse"
          >
            <div
              // this prevents reflow on children when css vars are changed on dialog content
              style={{ "--translate": 1, "--offset": 1 }}
              className="rounded-t-xl bg-white p-5 pb-10"
            >
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onPointerDown={swipeHandler}
                className="relative mx-auto block h-2 w-20 rounded-full bg-neutral-200 after:absolute after:-inset-2"
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
            </div>
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
