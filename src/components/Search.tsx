import { hasFocusWithin } from "@/hooks";
import { getQueryParam, includes, setQueryParam } from "@/utils";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flipped, Flipper } from "react-flip-toolkit";
import SearchIcon from "~icons/iconamoon/search-light";
import SwapIcon from "~icons/iconamoon/swap-light";
import ResetIcon from "~icons/radix-icons/cross-1";

export const SEARCH_QUERY_KEY = "search";
type HeaderSearchBarProps = { right?: ReactNode; title: string };
export function HeaderSearchBar({ right, title }: HeaderSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimeoutRef = useRef<number>();

  const router = useRouter();
  const searchParam: string = getQueryParam(router.query[SEARCH_QUERY_KEY]) ?? "";
  const [search, setSearch] = useState(searchParam);

  const searchIcon = <SearchIcon className="h-7 w-7" />;

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
            document.body
          )}
          {searchIcon}
          <input
            // key helps refocus input when clear button is pressed
            key={`${!!search}`}
            autoFocus
            className="h-full grow p-1 caret-app-green outline-none placeholder:p-1"
            placeholder="Search"
            value={search}
            onChange={(e) => {
              const { value } = e.target;
              setSearch(value);

              window.clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = window.setTimeout(() => {
                setQueryParam(router, SEARCH_QUERY_KEY, value);
              }, 500);
            }}
          />
          <button
            aria-label="Reset search filter"
            className="ml-1"
            onClick={() => {
              setSearch("");
              setIsOpen(false);

              window.clearTimeout(debounceTimeoutRef.current);
              setQueryParam(router, SEARCH_QUERY_KEY, null);
            }}
          >
            <ResetIcon className="h-7 w-7" />
          </button>
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
      <Dialog.Trigger className="flex items-center text-sm">
        <SwapIcon className="h-8 w-8 p-1" />
        <span className="capitalize">{sortBy}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 flex animate-fade-in items-end justify-center bg-black/40">
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
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
