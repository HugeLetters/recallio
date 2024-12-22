import { ScrollUpButton } from "@/browser/scroll-up";
import { Button } from "@/interface/button";
import { DialogOverlay } from "@/interface/dialog";
import { InfiniteScroll } from "@/interface/list/infinite-scroll";
import { InfiniteQueryView } from "@/interface/loading";
import { Spinner } from "@/interface/loading/spinner";
import { DebouncedSearch, useSearchQuery, useSetSearchQuery } from "@/interface/search/search";
import { toast } from "@/interface/toast";
import { useQueryToggleState } from "@/navigation/query/hooks";
import { CategoryCard } from "@/product/components";
import { CATEGORY_COUNT_MAX, CATEGORY_LENGTH_MAX, CATEGORY_LENGTH_MIN } from "@/product/validation";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import { fetchNextPage } from "@/trpc/infinite-query";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toolbar from "@radix-ui/react-toolbar";
import type { MutableRefObject } from "react";
import { useMemo, useRef, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import Checkmark from "~icons/custom/checkmark";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import CircledPlusIcon from "~icons/fluent/add-circle-28-regular";
import SearchIcon from "~icons/iconamoon/search-light";
import PlusIcon from "~icons/material-symbols/add-rounded";
import type { ReviewForm } from ".";

type CategoryListProps = {
  control: Control<ReviewForm>;
};
export function CategoryList({ control }: CategoryListProps) {
  const { replace, fields: categories } = useFieldArray({ control, name: "categories" });
  const categorySet = useMemo<Set<string>>(
    () => new Set(categories.map((x) => x.name)),
    [categories],
  );

  function remove(value: string) {
    replace(categories.filter((category) => category.name !== value));
  }
  function add(value: string) {
    if (categorySet.has(value)) return;

    const newCategories = [...categories, { name: value.toLowerCase() }];
    replace(newCategories.sort((a, b) => (a.name > b.name ? 1 : -1)));
  }

  const [isOpen, setIsOpen] = useQueryToggleState("category-modal");
  const setSearchQuery = useSetSearchQuery();
  const debouncedQuery = useRef<number>();
  const isAtCategoryLimit = categories.length >= CATEGORY_COUNT_MAX;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsOpen(false);
          window.clearTimeout(debouncedQuery.current);
          setSearchQuery(null);
          return;
        }

        if (isAtCategoryLimit) {
          categoryLimitErrorToast();
          return;
        }

        setIsOpen(true);
      }}
    >
      <Toolbar.Root
        className="flex flex-wrap gap-2 text-xs"
        aria-label="Review categories"
      >
        <CategoryCard>
          <Toolbar.Button asChild>
            <Dialog.Trigger
              aria-disabled={isAtCategoryLimit}
              className="clickable aria-disabled:opacity-60"
            >
              <PlusIcon className="size-6" />
              <span className="whitespace-nowrap py-2">Add category</span>
            </Dialog.Trigger>
          </Toolbar.Button>
        </CategoryCard>
        {categories.map(({ name }) => (
          <CategoryCard key={name}>
            <Toolbar.Button
              className="clickable"
              aria-label={`Delete category ${name}`}
              onClick={(e) => {
                remove(name);

                // switch focus to next button
                const next = e.currentTarget.nextSibling ?? e.currentTarget.previousSibling;
                if (next instanceof HTMLElement) {
                  next?.focus();
                }
              }}
            >
              <span>{name}</span>
              <div className="flex h-6 items-center">
                <DeleteIcon className="size-3" />
              </div>
            </Toolbar.Button>
          </CategoryCard>
        ))}
      </Toolbar.Root>
      <Dialog.Portal>
        <DialogOverlay className="flex justify-center">
          <Dialog.Content className="w-full max-w-app animate-fade-in data-[state=closed]:animate-fade-in-reverse">
            <CategorySearch
              enabled={isOpen}
              canAddCategories={!isAtCategoryLimit}
              append={add}
              remove={remove}
              includes={(value) => categorySet.has(value.toLowerCase())}
              debounceRef={debouncedQuery}
            />
          </Dialog.Content>
        </DialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type CategorySearchProps = {
  enabled: boolean;
  canAddCategories: boolean;
  append: (value: string) => void;
  remove: (value: string) => void;
  includes: (value: string) => boolean;
  debounceRef: MutableRefObject<number | undefined>;
};
function CategorySearch({
  enabled,
  canAddCategories,
  append,
  remove,
  includes,
  debounceRef,
}: CategorySearchProps) {
  const searchParam: string = useSearchQuery() ?? "";
  const [search, setSearch] = useState(searchParam);
  const lowercaseSearch = search.toLowerCase();
  const categoriesQuery = trpc.product.getCategoryList.useInfiniteQuery(
    { filter: searchParam, limit: 30 },
    {
      getNextPageParam(page) {
        return page.at(-1);
      },
      enabled,
      staleTime: Infinity,
    },
  );

  const isSearchValid =
    search.length >= CATEGORY_LENGTH_MIN && search.length <= CATEGORY_LENGTH_MAX;
  // since it's displayed only at the top anyway it's enough to check only the first page for that match
  const isSearchAdded = includes(lowercaseSearch);
  const canAddSearch = canAddCategories && isSearchValid && !isSearchAdded;

  function addCustomCategory() {
    if (!isSearchValid) {
      return toast.error(
        `Category must be between ${CATEGORY_LENGTH_MIN} and ${CATEGORY_LENGTH_MAX} characters long.`,
        { id: "review-edit-category-length" },
      );
    }
    if (isSearchAdded) {
      return toast.error("This category has already been added.", {
        id: "review-edit-category-duplicate",
      });
    }
    if (!canAddCategories) {
      return categoryLimitErrorToast();
    }

    append(lowercaseSearch);
  }
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);

  return (
    <div className="flex h-full flex-col bg-white shadow-around sa-o-20 sa-r-2.5">
      <div className="flex w-full shrink-0 basis-14 items-center bg-white px-2 text-xl shadow-around sa-o-15 sa-r-2">
        <SearchIcon className="size-7 shrink-0" />
        <DebouncedSearch
          value={search}
          setValue={setSearch}
          onSubmit={(e) => {
            e.preventDefault();
            // since this component is portalled submit event will propagate to the main form on this page
            e.stopPropagation();
            addCustomCategory();
          }}
          debounceRef={debounceRef}
        />
      </div>
      <Toolbar.Root
        ref={setToolbar}
        loop={false}
        orientation="vertical"
        className="scrollbar-gutter flex grow flex-col gap-4 overflow-y-auto px-7 py-5"
      >
        <ScrollUpButton
          target={toolbar}
          show
          className="z-10 size-9 -translate-y-1"
        />
        {!!search && (
          <label
            className={tw(
              "group flex cursor-pointer items-center justify-between py-1 text-left italic transition-opacity",
              !canAddSearch && "opacity-30",
            )}
          >
            <span className="shrink-0">
              Add <span className="capitalize">{`"${lowercaseSearch}"`}</span>...
            </span>
            <Toolbar.Button
              onClick={addCustomCategory}
              aria-label={`Add ${lowercaseSearch} category`}
              aria-disabled={!canAddSearch}
            >
              <CircledPlusIcon className="size-6 scale-125 text-neutral-400 transition-colors group-active:text-app-green-500" />
            </Toolbar.Button>
          </label>
        )}
        <InfiniteQueryView
          query={categoriesQuery}
          className="grow"
        >
          {categoriesQuery.data && (
            <InfiniteScroll
              pages={categoriesQuery.data.pages}
              getPageValues={(page) => page}
              getKey={(category) => category}
              getNextPage={fetchNextPage(categoriesQuery)}
            >
              {(category) => {
                if (category === lowercaseSearch) return;
                return (
                  <label className="flex w-full cursor-pointer justify-between capitalize">
                    <span className="overflow-hidden text-ellipsis">{category}</span>
                    <Toolbar.Button asChild>
                      <Checkbox.Root
                        className={tw(
                          "group flex size-6 shrink-0 items-center justify-center rounded-sm border-2 border-neutral-400 bg-white outline-none",
                          "focus-within:border-app-green-500 aria-disabled:border-neutral-200 focus-within:aria-disabled:border-app-green-300 data-[state=checked]:border-app-green-500 data-[state=checked]:focus-within:border-app-green-900",
                          "transition-colors data-[state=checked]:bg-app-green-500",
                        )}
                        aria-disabled={!canAddCategories}
                        checked={includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked !== true) return remove(category);
                          if (!canAddCategories) {
                            return categoryLimitErrorToast();
                          }
                          append(category);
                        }}
                      >
                        <Checkbox.Indicator
                          forceMount
                          className="p-1 text-white group-data-[state=unchecked]:scale-0 group-data-[state=checked]:transition-transform"
                        >
                          <Checkmark className="size-full" />
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                    </Toolbar.Button>
                  </label>
                );
              }}
            </InfiniteScroll>
          )}
          {categoriesQuery.isFetching ? <Spinner className="h-8 shrink-0" /> : null}
        </InfiniteQueryView>
      </Toolbar.Root>
      <Dialog.Close asChild>
        <Button
          className="primary mx-5 mb-5 shadow-around sa-o-30 sa-r-2"
          aria-label="Close"
        >
          OK
        </Button>
      </Dialog.Close>
    </div>
  );
}

function categoryLimitErrorToast() {
  return toast.error(`You can't add more than ${CATEGORY_COUNT_MAX} categories.`, {
    id: "review-edit-category-limit",
  });
}
