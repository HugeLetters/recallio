import { Layout } from "@/components/Layout";
import { InfiniteScroll } from "@/components/List";
import { Spinner, useLoadingIndicator } from "@/components/Loading";
import { DebouncedSearch, SEARCH_QUERY_KEY } from "@/components/Search";
import { logToastError, toast } from "@/components/Toast";
import {
  AutoresizableInput,
  Button,
  DialogOverlay,
  ImageInput,
  LabeledSwitch,
  Star,
  useUrlDialog,
} from "@/components/UI";
import {
  BarcodeTitle,
  CategoryButton,
  ConsIcon,
  ImagePreview,
  NoImagePreview,
  ProsConsCommentWrapper,
  ProsIcon,
} from "@/components/page/Review";
import { useReviewPrivateDefault, useUploadThing } from "@/hooks";
import { fetchNextPage, isSetEqual, mergeInto, minutesToMs, tw } from "@/utils";
import { api } from "@/utils/api";
import type { RouterOutputs } from "@/utils/api";
import { compressImage, useBlobUrl } from "@/utils/image";
import { getQueryParam, setQueryParam } from "@/utils/query";
import type {
  ModelProps,
  NextPageWithLayout,
  Nullish,
  StrictOmit,
  TransformType,
} from "@/utils/type";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as Radio from "@radix-ui/react-radio-group";
import * as Toolbar from "@radix-ui/react-toolbar";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useRef, useState } from "react";
import type { FormEvent, MutableRefObject } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import type { Control, UseFormRegisterReturn } from "react-hook-form";
import Checkmark from "~icons/custom/checkmark";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import CircledPlusIcon from "~icons/fluent/add-circle-28-regular";
import SearchIcon from "~icons/iconamoon/search-light";
import PlusIcon from "~icons/material-symbols/add-rounded";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);

  return !!barcode ? <ReviewWrapper barcode={barcode} /> : "Loading...";
};

Page.getLayout = (page) => <Layout header={{ title: <BarcodeTitle /> }}>{page}</Layout>;
export default Page;

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;
type ReviewForm = TransformType<ReviewData, "categories", Array<{ name: string }>>;
function transformReview(data: ReviewData | null): ReviewForm | null {
  if (!data) return data;
  return mergeInto(data, { categories: data.categories.map((x) => ({ name: x })) });
}

type ReviewWrapperProps = { barcode: string };
function ReviewWrapper({ barcode }: ReviewWrapperProps) {
  const reviewQuery = api.review.getUserReview.useQuery(
    { barcode },
    { staleTime: Infinity, select: transformReview },
  );
  const [isPrivate] = useReviewPrivateDefault();

  if (!reviewQuery.isSuccess) return <>Loading...</>;

  return (
    <Review
      barcode={barcode}
      review={
        reviewQuery.data ?? {
          name: "",
          rating: 5,
          pros: null,
          cons: null,
          comment: null,
          categories: [],
          image: null,
          isPrivate,
        }
      }
      hasReview={!!reviewQuery.data}
    />
  );
}

type ReviewProps = {
  review: ReviewForm;
  hasReview: boolean;
  barcode: string;
};
function Review({ barcode, review, hasReview }: ReviewProps) {
  const { register, control, handleSubmit, formState } = useForm({ defaultValues: review });

  function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit((data) => {
      const { categories: categoriesField, image: _, ...restData } = data;
      const newCategories = categoriesField.map(({ name }) => name);

      const optimisticReview = { ...restData, barcode, categories: newCategories };
      if (!formState.isDirty && hasReview) {
        return onReviewSave(optimisticReview);
      }

      const reviewCategories = review.categories.map(({ name }) => name);
      const areCategoriesUnchanged = isSetEqual(new Set(newCategories), new Set(reviewCategories));
      const categories = areCategoriesUnchanged ? undefined : newCategories;
      const updatedReview = { ...optimisticReview, categories };
      saveReview(updatedReview, {
        onSuccess: () => onReviewSave(optimisticReview),
      });
    })(e).catch(logToastError("Error while trying to submit the review.\nPlease try again."));
  }

  function onReviewSave(review: StrictOmit<ReviewData, "image">) {
    if (!image) {
      setOptimisticReview(review, image);
    }
    if (image === undefined) return invalidateReviewData();
    if (image === null) return deleteImage({ barcode });

    setOptimisticReview(review, URL.createObjectURL(image));

    compressImage(image, 511 * 1024)
      .then((compressedImage) => startUpload([compressedImage ?? image], { barcode }))
      .catch(logToastError("Couldn't upload the image.\nPlease try again."));
  }

  const apiUtils = api.useUtils();
  function invalidateReviewData() {
    const optimisticImage = apiUtils.review.getUserReview.getData({ barcode })?.image;
    Promise.all([
      apiUtils.review.getUserReview.invalidate({ barcode }, { refetchType: "all" }).finally(() => {
        if (!optimisticImage) return;
        URL.revokeObjectURL(optimisticImage);
      }),
      apiUtils.review.getUserReviewSummaryList.invalidate(undefined, { refetchType: "all" }),
      apiUtils.review.getReviewCount.invalidate(undefined, { refetchType: "all" }),
    ]).catch(
      logToastError("Couldn't update data from the server.\nReloading the page is advised."),
    );
  }

  const router = useRouter();
  function setOptimisticReview(review: StrictOmit<ReviewData, "image">, image: Nullish<string>) {
    apiUtils.review.getUserReview.setData({ barcode }, (cache) => {
      if (!cache) {
        return { ...review, image: image ?? null };
      }
      if (image === undefined) {
        return { ...cache, ...review };
      }
      return { ...cache, ...review, image };
    });

    router.push({ pathname: "/review/[id]", query: { id: barcode } }).catch(console.error);
  }

  const [image, setImage] = useState<File | null>();
  const { mutate: deleteImage } = api.review.deleteReviewImage.useMutation({
    onSettled: invalidateReviewData,
    onError(e) {
      toast.error(`Couldn't delete image from review: ${e.message}`);
    },
  });
  const { startUpload } = useUploadThing("reviewImageUploader", {
    // hope 1.5s is enough for the update to catch up...
    onClientUploadComplete: () => setTimeout(invalidateReviewData, 1500),
    onUploadError(e) {
      toast.error(`Couldn't upload the image: ${e.message}`);
      invalidateReviewData();
    },
  });
  const { mutate: saveReview, isLoading } = api.review.upsertReview.useMutation({
    onError(e) {
      toast.error(`Error while trying to save the review: ${e.message}`);
      invalidateReviewData();
    },
  });
  useLoadingIndicator(isLoading);

  return (
    <form
      className="flex w-full flex-col gap-4 p-4"
      onSubmit={submitReview}
    >
      <AttachedImage
        key={review.image}
        savedImage={review.image}
        value={image}
        setValue={setImage}
      />
      <Name
        barcode={barcode}
        register={register("name", { required: true })}
      />
      <CategoryList control={control} />
      <Controller
        control={control}
        name="rating"
        render={({ field: { value, onChange } }) => (
          <Rating
            value={value}
            setValue={(value) => {
              onChange(value);
            }}
          />
        )}
      />
      <ProsConsComment
        registerPros={register("pros")}
        registerCons={register("cons")}
        registerComment={register("comment")}
        review={review}
      />
      <Controller
        control={control}
        name="isPrivate"
        render={({ field: { value, onChange } }) => (
          <Private
            value={value}
            setValue={onChange}
          />
        )}
      />
      <Button
        type="submit"
        className="primary"
      >
        {hasReview ? "Update" : "Save"}
      </Button>
      {hasReview && (
        <Link
          href={{ pathname: "/review/[id]", query: { id: barcode } }}
          className="btn ghost text-center"
        >
          Cancel
        </Link>
      )}
      {/* forces extra gap at the bottom */}
      <div className="pb-2" />
    </form>
  );
}

type NameProps = {
  barcode: string;
  register: UseFormRegisterReturn;
};
function Name({ barcode, register }: NameProps) {
  const { data } = api.product.getProductNames.useQuery({ barcode }, { staleTime: Infinity });
  const listId = "product-names";
  return (
    <label className="flex flex-col">
      <span className="p-2 text-sm">Name</span>
      <div className="flex rounded-lg p-3 outline outline-1 outline-app-green-500 focus-within:outline-2">
        <input
          {...register}
          required
          minLength={6}
          maxLength={60}
          placeholder={data?.[0] ?? "Name"}
          autoComplete="off"
          className="grow outline-none"
          aria-label="Product name"
          list={listId}
        />
        <datalist id={listId}>{data?.map((name) => <option key={name}>{name}</option>)}</datalist>
      </div>
    </label>
  );
}

const ratingList = [1, 2, 3, 4, 5] as const;
function Rating({ value, setValue }: ModelProps<number>) {
  return (
    <Radio.Root
      value={value.toString()}
      onValueChange={(val) => {
        setValue(+val);
      }}
      className="flex justify-between gap-4 text-6xl"
    >
      <Radio.Item
        value="0"
        className="sr-only"
      >
        <Star />
      </Radio.Item>
      {ratingList.map((x) => (
        <Radio.Item
          key={x}
          value={x.toString()}
          onClick={() => {
            if (x !== value) return;
            setValue(0);
          }}
          className="outline-none transition sa-o-30 sa-r-0.5 focus-within:shadow-around"
        >
          <Star highlight={x <= value} />
        </Radio.Item>
      ))}
    </Radio.Root>
  );
}

type ProsConsCommentProps = {
  registerPros: UseFormRegisterReturn;
  registerCons: UseFormRegisterReturn;
  registerComment: UseFormRegisterReturn;
  review: Pick<ReviewForm, "pros" | "cons" | "comment">;
};
function ProsConsComment({
  registerPros,
  registerCons,
  registerComment,
  review,
}: ProsConsCommentProps) {
  return (
    <ProsConsCommentWrapper>
      <>
        <ProsIcon />
        <AutoresizableInput
          rootClassName="pt-1.5"
          initialContent={review.pros ?? ""}
          {...registerPros}
          placeholder="Pros"
          minLength={1}
          maxLength={4095}
        />
      </>
      <>
        <ConsIcon />
        <AutoresizableInput
          rootClassName="pt-1.5"
          initialContent={review.cons ?? ""}
          {...registerCons}
          placeholder="Cons"
          minLength={1}
          maxLength={4095}
        />
      </>
      <AutoresizableInput
        rootClassName="col-span-2 pt-1.5"
        initialContent={review.comment ?? ""}
        {...registerComment}
        placeholder="Comment"
        minLength={1}
        maxLength={2047}
      />
    </ProsConsCommentWrapper>
  );
}

function Private({ value, setValue }: ModelProps<boolean>) {
  return (
    <LabeledSwitch
      label="Private review"
      className={tw(
        "transition-colors duration-300",
        value ? "bg-app-green-100" : "bg-neutral-200",
      )}
      checked={value}
      onCheckedChange={setValue}
    />
  );
}

type AttachedImageProps = { savedImage: string | null } & ModelProps<Nullish<File>>; // null - delete, undefined - keep as is
function AttachedImage({ savedImage, value, setValue }: AttachedImageProps) {
  const base64Image = useBlobUrl(value);
  const src = value === null ? null : base64Image ?? savedImage;
  const isImagePresent = !!src || !!savedImage;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-16">
        {src ? <ImagePreview src={src} /> : <NoImagePreview />}
        {isImagePresent && (
          <Button
            className={tw(
              "absolute -right-2 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5",
              src ? "text-app-red-500" : "text-neutral-950",
            )}
            onClick={() => {
              setValue(src ? null : undefined);
            }}
            aria-label={src ? "Delete image" : "Reset image"}
          >
            {src ? <DeleteIcon /> : <ResetIcon />}
          </Button>
        )}
      </div>
      <ImageInput
        isImageSet={!!value}
        onChange={(e) => {
          setValue(e.target.files?.item(0));
        }}
        className="btn ghost rounded-lg px-4 py-0 outline-1 focus-within:outline-app-green-500"
      >
        {src ? "Change image" : "Upload image"}
      </ImageInput>
    </div>
  );
}

const categoryLimit = 25;
function categoryLimitErrorToast() {
  return toast.error(`You can't add more than ${categoryLimit} categories.`, {
    id: "review-edit-category-limit",
  });
}
type CategoryListProps = {
  control: Control<ReviewForm>;
};
function CategoryList({ control }: CategoryListProps) {
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

  const { isOpen, setIsOpen } = useUrlDialog("category-modal");
  function open() {
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    window.clearTimeout(debouncedQuery.current);
    setQueryParam({ router, key: SEARCH_QUERY_KEY, value: null });
  }
  const router = useRouter();
  const debouncedQuery = useRef<number>();
  const isAtCategoryLimit = categories.length >= categoryLimit;

  return (
    <div>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) return close();
          if (isAtCategoryLimit) {
            categoryLimitErrorToast();
            return;
          }
          open();
        }}
      >
        <Toolbar.Root className="flex flex-wrap gap-2 text-xs">
          <Toolbar.Button asChild>
            <Dialog.Trigger
              asChild
              aria-disabled={isAtCategoryLimit}
            >
              <CategoryButton className={tw(isAtCategoryLimit && "opacity-60")}>
                <PlusIcon className="size-6" />
                <span className="whitespace-nowrap py-2">Add category</span>
              </CategoryButton>
            </Dialog.Trigger>
          </Toolbar.Button>
          {categories.map(({ name }) => (
            <Toolbar.Button
              key={name}
              asChild
            >
              <CategoryButton
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
              </CategoryButton>
            </Toolbar.Button>
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
                close={close}
                debounceRef={debouncedQuery}
              />
            </Dialog.Content>
          </DialogOverlay>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

type CategorySearchProps = {
  enabled: boolean;
  canAddCategories: boolean;
  append: (value: string) => void;
  remove: (value: string) => void;
  includes: (value: string) => boolean;
  close: () => void;
  debounceRef: MutableRefObject<number | undefined>;
};
function CategorySearch({
  enabled,
  canAddCategories,
  append,
  remove,
  includes,
  close,
  debounceRef,
}: CategorySearchProps) {
  const router = useRouter();
  const searchParam: string = getQueryParam(router.query[SEARCH_QUERY_KEY]) ?? "";
  const [search, setSearch] = useState(searchParam);
  const lowercaseSearch = search.toLowerCase();
  const categoriesQuery = api.product.getCategories.useInfiniteQuery(
    { filter: searchParam, limit: 30 },
    {
      enabled,
      getNextPageParam(page) {
        return page.at(-1);
      },
      staleTime: minutesToMs(5),
    },
  );

  const minLength = 4;
  const maxLength = 25;
  const isSearchValid = search.length >= minLength && search.length <= maxLength;
  // since it's displayed only at the top anyway it's enough to check only the first page for that match
  const isSearchAdded = includes(lowercaseSearch);
  const canAddSearch = canAddCategories && isSearchValid && !isSearchAdded;

  function addCustomCategory() {
    if (!isSearchValid) {
      return toast.error(
        `Category must be between ${minLength} and ${maxLength} characters long.`,
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

  return (
    <div className="flex h-full flex-col bg-white shadow-around sa-o-20 sa-r-2.5">
      <div className="flex h-14 w-full items-center bg-white px-2 text-xl shadow-around sa-o-15 sa-r-2">
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
        loop={false}
        orientation="vertical"
        className="flex basis-full flex-col gap-6 overflow-y-auto px-7 pt-5"
      >
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

        {categoriesQuery.isSuccess ? (
          <InfiniteScroll
            pages={categoriesQuery.data.pages}
            getPageValues={(page) => page}
            getKey={(category) => category}
            getNextPage={fetchNextPage(categoriesQuery)}
            spinner={categoriesQuery.isFetching ? <Spinner className="h-16" /> : null}
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
                        "focus-within:border-app-green-500 aria-disabled:border-neutral-200 focus-within:aria-disabled:border-app-green-300 data-[state=checked]:border-app-green-500 data-[state=checked]:focus-within:border-lime-950",
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
        ) : (
          "Loading..."
        )}
      </Toolbar.Root>
      <Button
        className="primary mx-5 mb-5 shadow-around sa-o-30 sa-r-2"
        onClick={close}
      >
        OK
      </Button>
    </div>
  );
}
