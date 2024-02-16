import { hasFocusWithin } from "@/hooks";
import { includes } from "@/utils/array";
import { getQueryParam, setQueryParam } from "@/utils/query";
import type { ModelProps } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Flipper } from "react-flip-toolkit";
import SearchIcon from "~icons/iconamoon/search-light";
import SwapIcon from "~icons/iconamoon/swap-light";
import ResetIcon from "~icons/radix-icons/cross-1";
import { Flipped } from "./Animation";
import { DialogOverlay, UrlDialogRoot } from "./UI";

export const SEARCH_QUERY_KEY = "search";
type HeaderSearchBarProps = { right?: ReactNode; title: string };
export function HeaderSearchBar({ right, title }: HeaderSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useRef<number>();

  const router = useRouter();
  const searchParam: string = getQueryParam(router.query[SEARCH_QUERY_KEY]) ?? "";
  const [search, setSearch] = useState(searchParam);

  const searchIcon = <SearchIcon className="size-7 shrink-0" />;

  // keeps filter in sync on back/forward
  useEffect(() => {
    setSearch(searchParam);
  }, [searchParam]);

  return (
    <div
      className="flex h-full items-center gap-2 px-2 text-xl"
      onBlur={hasFocusWithin((hasFocus) => {
        if (!isOpen) return;
        setIsOpen(hasFocus);
      })}
      onKeyDown={(e) => {
        if (e.code === "Escape") setIsOpen(false);
      }}
    >
      {isOpen ? (
        <>
          {/* todo - maybe this can be animated out. 
          This should probably be postponed until https://github.com/HugeLetters/recallio/issues/104 */}
          {createPortal(
            <div className="absolute inset-0 z-0 animate-fade-in bg-black/50" />,
            document.body,
          )}
          {searchIcon}
          <DebouncedSearch
            value={search}
            setValue={setSearch}
            debounceRef={debouncedQuery}
            onReset={() => setIsOpen(false)}
          />
        </>
      ) : (
        <>
          <button
            aria-label="Start search"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            {searchIcon}
          </button>
          <div className="grow text-center">{title}</div>
          {right ?? <div className="size-7" />}
        </>
      )}
    </div>
  );
}

type DebouncedSearchProps = ModelProps<string> & {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  debounceRef: MutableRefObject<number | undefined>;
};
export function DebouncedSearch({
  value,
  setValue,
  onReset,
  onSubmit = function (event) {
    event.preventDefault();
  },
  debounceRef,
}: DebouncedSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="contents"
      onSubmit={onSubmit}
    >
      <input
        autoFocus
        ref={inputRef}
        className="h-full min-w-0 grow p-1 caret-app-green outline-none placeholder:p-1"
        placeholder="Search"
        value={value}
        onChange={(e) => {
          const { value: newValue } = e.target;
          setValue(newValue);

          window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            setQueryParam({ router, key: SEARCH_QUERY_KEY, value: newValue });
          }, 300);
        }}
      />
      <button
        type="reset"
        aria-label="Reset search filter"
        className="ml-1"
        onClick={() => {
          onReset?.();
          setValue("");
          window.clearTimeout(debounceRef.current);
          setQueryParam({ router, key: SEARCH_QUERY_KEY, value: null });
          inputRef.current?.focus();
        }}
      >
        <ResetIcon className="size-7" />
      </button>
    </form>
  );
}

export const SORT_QUERY_KEY = "sort";
type OptionList = readonly [string, ...string[]];
export function useParseSort<const T extends OptionList>(optionList: T): T[number] {
  const router = useRouter();
  const query = getQueryParam(router.query[SORT_QUERY_KEY]);

  if (query && includes(optionList, query)) return query;

  if (query !== undefined) setQueryParam({ router, key: SORT_QUERY_KEY, value: null });
  return optionList[0];
}
type SortDialogProps = { optionList: OptionList };
export function SortDialog({ optionList }: SortDialogProps) {
  const router = useRouter();
  const sortBy = useParseSort(optionList);

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
                    value={option}
                    key={option}
                    className="group flex items-center gap-2 rounded-lg px-1 py-2 outline-none transition-colors duration-300 focus-visible:bg-neutral-400/20"
                  >
                    <div className="flex aspect-square w-6 items-center justify-center rounded-full border-2 border-neutral-400 bg-white group-data-[state=checked]:border-app-green">
                      <Flipped
                        flipId={`${option === sortBy}`}
                        key={`${option === sortBy}`}
                      >
                        <RadioGroup.Indicator className="block aspect-square w-4 rounded-full bg-app-green" />
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
