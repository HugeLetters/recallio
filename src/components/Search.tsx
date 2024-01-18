import { hasFocusWithin } from "@/hooks";
import { getQueryParam, includes, setQueryParam } from "@/utils";
import type { ModelProps } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flipped, Flipper } from "react-flip-toolkit";
import SearchIcon from "~icons/iconamoon/search-light";
import SwapIcon from "~icons/iconamoon/swap-light";
import ResetIcon from "~icons/radix-icons/cross-1";
import { DialogOverlay } from "./UI";

export const SEARCH_QUERY_KEY = "search";
type HeaderSearchBarProps = { right?: ReactNode; title: string };
export function HeaderSearchBar({ right, title }: HeaderSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useRef<number>();

  const router = useRouter();
  const searchParam: string = getQueryParam(router.query[SEARCH_QUERY_KEY]) ?? "";
  const [search, setSearch] = useState(searchParam);

  const searchIcon = <SearchIcon className="h-7 w-7 shrink-0" />;

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
          {createPortal(
            <div className="absolute inset-0 z-0 animate-fade-in bg-black/50" />,
            document.body,
          )}
          {searchIcon}
          <HeaderSearchControls
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
          {right ?? <div className="h-7 w-7" />}
        </>
      )}
    </div>
  );
}

type HeaderSearchControlsProps = ModelProps<string> & {
  onReset?: () => void;
  debounceRef: MutableRefObject<number | undefined>;
};
export function HeaderSearchControls({
  value,
  setValue,
  onReset,
  debounceRef,
}: HeaderSearchControlsProps) {
  const router = useRouter();

  return (
    <>
      <input
        // key helps refocus input when clear button is pressed
        key={`${!!value}`}
        autoFocus
        className="h-full min-w-0 grow p-1 caret-app-green outline-none placeholder:p-1"
        placeholder="Search"
        value={value}
        onChange={(e) => {
          const { value: newValue } = e.target;
          setValue(newValue);

          window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            console.log(1);
            setQueryParam(router, SEARCH_QUERY_KEY, newValue);
          }, 300);
        }}
      />
      <button
        aria-label="Reset search filter"
        className="ml-1"
        onClick={() => {
          onReset?.();
          setValue("");

          window.clearTimeout(debounceRef.current);
          setQueryParam(router, SEARCH_QUERY_KEY, null);
        }}
      >
        <ResetIcon className="h-7 w-7" />
      </button>
    </>
  );
}

export const SORT_QUERY_KEY = "sort";
type OptionList = readonly [string, ...string[]];
export function useParseSort<const T extends OptionList>(optionList: T): T[number] {
  const router = useRouter();
  const query = getQueryParam(router.query[SORT_QUERY_KEY]);

  if (query && includes(optionList, query)) return query;

  if (query !== undefined) setQueryParam(router, SORT_QUERY_KEY, null);
  return optionList[0];
}
type SortDialogProps = { optionList: OptionList };
export function SortDialog({ optionList }: SortDialogProps) {
  const router = useRouter();
  const sortBy = useParseSort(optionList);

  return (
    <Dialog.Root>
      <Dialog.Trigger className="relative flex items-center gap-1 text-sm">
        <SwapIcon className="h-8 w-8 p-1" />
        {/* keep trigger always the same size */}
        <span className="invisible capitalize">
          {[...optionList].sort((a, b) => b.length - a.length)[0]}
        </span>
        <span className="absolute right-1 capitalize">{sortBy}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="items-end">
          <Dialog.Content className="max-w-app grow rounded-t-xl bg-white p-5 shadow-around sa-o-20 sa-r-2.5 motion-safe:animate-slide-up">
            <Dialog.Title className="mb-6 text-xl font-medium">Sort By</Dialog.Title>
            <Flipper
              flipKey={sortBy}
              spring={{ stiffness: 700, overshootClamping: true }}
            >
              <RadioGroup.Root
                value={sortBy}
                onValueChange={(value) => {
                  setQueryParam(router, SORT_QUERY_KEY, value);
                }}
                className="flex flex-col gap-7"
              >
                {optionList.map((option) => (
                  <RadioGroup.Item
                    value={option}
                    key={option}
                    className="group flex items-center gap-2"
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
    </Dialog.Root>
  );
}
