import { hasFocusWithin } from "@/browser/focus";
import { getQueryParam, setQueryParam } from "@/browser/query";
import type { Model } from "@/state/type";
import { useRouter } from "next/router";
import type { FormEvent, MutableRefObject, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SearchIcon from "~icons/iconamoon/search-light";
import ResetIcon from "~icons/radix-icons/cross-1";

type HeaderSearchBarProps = { right?: ReactNode; title: string };
export function HeaderSearchBar({ right, title }: HeaderSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useRef<number>();

  const searchParam: string = useSearchQuery() ?? "";
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

type DebouncedSearchProps = Model<string> & {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  debounceRef: MutableRefObject<number | undefined>;
};
export function DebouncedSearch({
  value,
  setValue,
  debounceRef,
  onReset,
  onSubmit = function (event) {
    event.preventDefault();
  },
}: DebouncedSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setSearchQuery = useSetSearchQuery();

  return (
    <form
      className="contents"
      onSubmit={onSubmit}
    >
      <input
        autoFocus
        ref={inputRef}
        className="h-full min-w-0 grow p-1 caret-app-green-500 outline-none placeholder:p-1"
        placeholder="Search"
        value={value}
        onChange={(e) => {
          const { value: newValue } = e.target;
          setValue(newValue);

          window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            setSearchQuery(newValue);
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
          setSearchQuery(null);
          inputRef.current?.focus();
        }}
      >
        <ResetIcon className="size-7" />
      </button>
    </form>
  );
}

const SEARCH_QUERY_KEY = "search";
export function useSearchQuery() {
  const { query } = useRouter();
  return getQueryParam(query[SEARCH_QUERY_KEY]);
}

export function useSetSearchQuery() {
  const router = useRouter();
  return (value: string | null) => setQueryParam({ key: SEARCH_QUERY_KEY, router, value });
}
