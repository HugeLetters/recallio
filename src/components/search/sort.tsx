import { getQueryParam, setQueryParam } from "@/browser/query";
import { includes } from "@/utils/array";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import { Flipper } from "react-flip-toolkit";
import SwapIcon from "~icons/iconamoon/swap-light";
import { Flipped } from "../../animation/flip";
import { DialogOverlay, UrlDialogRoot } from "../ui/dialog";

type SortDialogProps = { optionList: OptionList };
export function SortDialog({ optionList }: SortDialogProps) {
  const router = useRouter();
  const sortBy = useSortQuery(optionList);

  return (
    <UrlDialogRoot dialogQueryKey="sort-drawer">
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
          <Dialog.Content className="max-w-app grow rounded-t-xl bg-white p-5 shadow-around sa-o-20 sa-r-2.5 motion-safe:animate-slide-up data-[state=closed]:motion-safe:animate-slide-up-reverse">
            <Dialog.Title className="mb-6 text-xl font-semibold">Sort By</Dialog.Title>
            <Flipper
              flipKey={sortBy}
              spring={{ stiffness: 700, overshootClamping: true }}
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
    </UrlDialogRoot>
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
