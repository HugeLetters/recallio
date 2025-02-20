import { Transition } from "@/animation/transition";
import { useClient } from "@/browser";
import { layoutRootStore } from "@/layout/store";
import { getQueryParam, setQueryParam } from "@/navigation/query";
import type { Model } from "@/state";
import { useStore } from "@/state/store";
import { tw } from "@/styles/tw";
import { useRouter } from "next/router";
import type { ComponentPropsWithoutRef, FormEvent, MutableRefObject, ReactNode } from "react";
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
  const overlayTarget = useStore(layoutRootStore);

  return (
    <div
      className="flex h-full items-center gap-2 px-2 text-xl"
      onKeyDown={(e) => {
        if (e.code === "Escape") setIsOpen(false);
      }}
    >
      <Overlay
        show={isOpen}
        onClick={() => setIsOpen(false)}
        target={overlayTarget ?? undefined}
      />
      {isOpen ? (
        <>
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
            onClick={() => setIsOpen(true)}
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

interface DebouncedSearchProps extends Model<string> {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  debounceRef: MutableRefObject<number | undefined>;
}
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

interface OverlayProps extends ComponentPropsWithoutRef<"div"> {
  target?: HTMLElement;
  show: boolean;
}
function Overlay({ target, className, show, ...props }: OverlayProps) {
  const client = useClient();

  if (!client) return null;
  return createPortal(
    <Transition
      inClassName="animate-fade-in"
      outClassName="animate-fade-in-reverse"
    >
      {show && (
        <div
          className={tw("fixed inset-0 bg-black/50", className)}
          {...props}
        />
      )}
    </Transition>,
    target ?? document.body,
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
