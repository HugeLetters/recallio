import { Layout } from "@/components/Layout";
import { InfiniteScroll } from "@/components/List";
import { Spinner, useLoadingIndicator } from "@/components/Loading";
import { HeaderSearchControls, SEARCH_QUERY_KEY } from "@/components/Search";
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
import { fetchNextPage, isSetEqual, minutesToMs } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import { compressImage, useBlobUrl } from "@/utils/image";
import { getQueryParam, setQueryParam } from "@/utils/query";
import {
  type ModelProps,
  type NextPageWithLayout,
  type Nullish,
  type StrictOmit,
  type TransformType,
} from "@/utils/type";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as Radio from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import * as Toolbar from "@radix-ui/react-toolbar";
import { useRouter } from "next/router";
import { useMemo, useRef, useState, type FormEvent, type MutableRefObject } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type Control,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { toast } from "react-toastify";
import Checkmark from "~icons/custom/checkmark";
import LucidePen from "~icons/custom/pen";
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
  const { categories, ...rest } = data;

  return Object.assign(rest, { categories: categories.map((x) => ({ name: x })) });
}

type ReviewWrapperProps = { barcode: string };
function ReviewWrapper({ barcode }: ReviewWrapperProps) {
  const reviewQuery = api.review.getUserReview.useQuery(
    { barcode },
    { staleTime: Infinity, select: transformReview },
  );
  const namesQuery = api.product.getProductNames.useQuery({ barcode }, { staleTime: Infinity });
  const [isPrivate] = useReviewPrivateDefault();

  if (!reviewQuery.isSuccess || !namesQuery.isSuccess) return <>Loading...</>;

  return (
    <Review
      barcode={barcode}
      review={
        reviewQuery.data ?? {
          name: namesQuery.data[0] ?? "",
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
      names={namesQuery.data}
    />
  );
}

type ReviewProps = {
  review: ReviewForm;
  hasReview: boolean;
  names: string[];
  barcode: string;
};
function Review({ barcode, review, hasReview, names }: ReviewProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isDirty: isFormDirty },
  } = useForm({ defaultValues: review });

  function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit((data) => {
      const { categories: categoriesField, image: _, ...restData } = data;
      const newCategories = categoriesField.map(({ name }) => name);

      const optimisticReview = { ...restData, barcode, categories: newCategories };
      if (!isFormDirty && hasReview) {
        return onReviewSave(optimisticReview);
      }

      const reviewCategories = review.categories.map(({ name }) => name);
      const areCategoriesUnchanged = isSetEqual(new Set(newCategories), new Set(reviewCategories));
      const categories = areCategoriesUnchanged ? undefined : newCategories;
      const updatedReview = { ...optimisticReview, categories };
      saveReview(updatedReview, {
        onSuccess: () => onReviewSave(optimisticReview),
      });
    })(e).catch(console.error);
  }

  function onReviewSave(review: StrictOmit<ReviewData, "image">) {
    if (!image) {
      setOptimisticReview(review, image);
    }
    if (image === undefined) return invalidateReviewData();
    if (image === null) return deleteImage({ barcode });

    setOptimisticReview(review, URL.createObjectURL(image));

    compressImage(image, 511 * 1024)
      .then((compressedImage) => {
        startUpload([compressedImage ?? image], { barcode }).catch(console.error);
      })
      .catch(console.error);
  }

  const apiUtils = api.useUtils();
  function invalidateReviewData() {
    const optimisticImage = apiUtils.review.getUserReview.getData({ barcode })?.image;
    apiUtils.review.getUserReview
      .invalidate({ barcode }, { refetchType: "all" })
      .then(() => {
        if (!optimisticImage) return;
        URL.revokeObjectURL(optimisticImage);
      })
      .catch(console.error);
    apiUtils.review.getUserReviewSummaryList
      .invalidate(undefined, { refetchType: "all" })
      .catch(console.error);
    apiUtils.review.getReviewCount
      .invalidate(undefined, { refetchType: "all" })
      .catch(console.error);
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

    void router.push({ pathname: "/review/[id]", query: { id: barcode } });
  }

  const [image, setImage] = useState<File | null>();
  const { mutate: deleteImage } = api.review.deleteReviewImage.useMutation({
    onSettled: invalidateReviewData,
  });
  const { startUpload } = useUploadThing("reviewImageUploader", {
    // hope 1.5s is enough for the update to catch up...
    onClientUploadComplete: () => setTimeout(invalidateReviewData, 1500),
    onUploadError: invalidateReviewData,
  });
  const { mutate: saveReview, isLoading } = api.review.upsertReview.useMutation({
    onError: invalidateReviewData,
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
        names={names}
        register={register("name", { required: true })}
        setValue={(value) => {
          setValue("name", value);
        }}
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
      {/* forces extra gap at the bottom */}
      <div className="pb-px" />
    </form>
  );
}

type NameProps = {
  names: string[];
  register: UseFormRegisterReturn;
  setValue: (value: string) => void;
};
function Name({ names, register, setValue }: NameProps) {
  return (
    <label className="flex flex-col">
      <span className="p-2 text-sm">Name</span>
      <div className="flex rounded-lg p-3 outline outline-1 outline-app-green focus-within:outline-2">
        <input
          {...register}
          required
          minLength={6}
          maxLength={60}
          placeholder="Name"
          autoComplete="off"
          className="grow outline-none"
          aria-label="Product name"
        />
        {!!names.length && (
          <Select.Root
            onValueChange={setValue}
            // makes sure you can select the same option multiple times
            value=""
          >
            <Select.Trigger aria-label="product name">
              <Select.Value>
                <LucidePen />
              </Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                side="left"
                className="rounded-xl bg-white p-2 !outline !outline-2 !outline-neutral-200"
              >
                <Select.Viewport>
                  {names.map((name) => (
                    <Select.Item
                      key={name}
                      value={name}
                      className="cursor-pointer rounded-md outline-none selected:bg-neutral-200"
                    >
                      <Select.ItemText>{name}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        )}
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
            if (x === value) setValue(0);
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
      className={`transition-colors duration-300 ${value ? "bg-app-green/20" : "bg-neutral-200 "}`}
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
            className={`absolute -right-2 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 ${
              src ? "text-app-red" : "text-neutral-950"
            }`}
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
        className="btn ghost rounded-lg px-4 py-0 outline-1"
      >
        {src ? "Change image" : "Upload image"}
      </ImageInput>
    </div>
  );
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
    replace(
      [...categories, { name: value.toLowerCase() }].sort((a, b) => (a.name > b.name ? 1 : -1)),
    );
  }

  const { isOpen, setIsOpen } = useUrlDialog("category-modal");
  function open() {
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    window.clearTimeout(debouncedQuery.current);
    setQueryParam(router, SEARCH_QUERY_KEY, null);
  }
  const router = useRouter();
  const debouncedQuery = useRef<number>();
  const categoriesLimit = 25;
  const isAtCategoryLimit = categories.length >= categoriesLimit;

  return (
    <div>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) return close();
          if (isAtCategoryLimit) {
            return toast.error(`You can't add more than ${categoriesLimit} categories`);
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
              <CategoryButton className={`${isAtCategoryLimit ? "opacity-60" : ""}`}>
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
                aria-label={`Delete label ${name}`}
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
            <Dialog.Content className="w-full max-w-app animate-fade-in data-[state=closed]:animate-fade-out">
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

  const isSearchCategoryValid = search.length >= 4 && search.length <= 25;
  // since it's displayed only at the top anyway it's enough to check only the first page for that match
  const isSearchCategoryPresent =
    includes(search) || categoriesQuery.data?.pages[0]?.includes(search.toLowerCase());

  return (
    <div className="relative flex h-full flex-col bg-white shadow-around sa-o-20 sa-r-2.5">
      <div className="flex h-14 w-full items-center bg-white px-2 text-xl shadow-around sa-o-15 sa-r-2">
        <SearchIcon className="size-7 shrink-0" />
        <HeaderSearchControls
          value={search}
          setValue={setSearch}
          debounceRef={debounceRef}
        />
      </div>
      <div className="flex basis-full flex-col gap-6 overflow-y-auto px-7 pb-20 pt-5">
        {canAddCategories && isSearchCategoryValid && !isSearchCategoryPresent && (
          <label className="group flex cursor-pointer items-center justify-between py-1 text-left italic transition-colors active:text-app-green">
            <span className="shrink-0">
              Add <span className="capitalize">{`"${search}"`}</span>...
            </span>
            <button
              onClick={() => {
                setTimeout(() => {
                  append(search);
                }, 200);
              }}
              aria-label={`Add ${search} category`}
            >
              <CircledPlusIcon className="size-6 scale-125 text-neutral-400 transition-colors group-active:text-app-green" />
            </button>
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
            {(category) => (
              <label className="flex w-full cursor-pointer justify-between capitalize">
                <span>{category}</span>
                <Checkbox.Root
                  className="group flex size-6 items-center justify-center rounded-sm border-2 border-neutral-400 bg-white transition-colors aria-[disabled=false]:focus-within:border-app-green data-[state=checked]:border-app-green data-[state=checked]:bg-app-green data-[state=unchecked]:outline-none data-[state=unchecked]:aria-disabled:opacity-50"
                  aria-disabled={!canAddCategories}
                  checked={includes(category)}
                  onCheckedChange={(checked) => {
                    if (checked !== true) return remove(category);
                    if (!canAddCategories) return;
                    append(category);
                  }}
                >
                  <Checkbox.Indicator className="size-full p-1 text-white">
                    <Checkmark className="checkmark size-full" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
              </label>
            )}
          </InfiniteScroll>
        ) : (
          "Loading..."
        )}
      </div>
      <Button
        className="primary absolute inset-x-5 bottom-5"
        onClick={close}
      >
        OK
      </Button>
    </div>
  );
}
