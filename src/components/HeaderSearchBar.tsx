import { hasFocusWithin } from "@/hooks";
import { getQueryParam, setQueryParam } from "@/utils";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import SearchIcon from "~icons/iconamoon/search.jsx";
import ResetIcon from "~icons/radix-icons/cross-1";

export const SEARCH_QUERY_KEY = "search";
type HeaderSearchBarProps = { right: ReactNode; title: string };
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
      className="flex h-full items-center gap-2 text-xl"
      onBlur={hasFocusWithin((hasFocus) => {
        if (!isOpen) return;
        setIsOpen(hasFocus);
      })}
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
              }, 1000);
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
          {right}
        </>
      )}
    </div>
  );
}
