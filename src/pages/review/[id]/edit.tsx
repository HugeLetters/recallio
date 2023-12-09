import { Layout } from "@/components/Layout";
import { InfiniteScroll } from "@/components/List";
import { SEARCH_QUERY_KEY } from "@/components/Search";
import {
  AutoresizableInput,
  Button,
  DialogOverlay,
  ImageInput,
  LabeledSwitch,
  Star,
} from "@/components/UI";
import { useReviewPrivateDefault, useUploadThing } from "@/hooks";
import {
  backoffCallback,
  browser,
  getQueryParam,
  minutesToMs,
  setQueryParam,
  type ModelProps,
  type StrictOmit,
  type StrictPick,
} from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import { compressImage } from "@/utils/image";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as Radio from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import * as Toolbar from "@radix-ui/react-toolbar";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from "react-hook-form";
import Checkmark from "~icons/custom/checkmark";
import MilkIcon from "~icons/custom/milk";
import LucidePen from "~icons/custom/pen";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import CircledPlusIcon from "~icons/fluent/add-circle-28-regular";
import SearchIcon from "~icons/iconamoon/search-light";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";
import ResetInputIcon from "~icons/radix-icons/cross-1";

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;
type ReviewForm = Omit<
  StrictOmit<ReviewData, "updatedAt" | "categories"> & {
    [K in keyof StrictPick<ReviewData, "categories">]: Array<{ name: string }>;
  },
  never
>;
function transformReview(data: ReviewData | null): ReviewForm | null {
  if (!data) return data;
  const { categories, updatedAt: _, ...rest } = data;

  return Object.assign(rest, { categories: categories.map((x) => ({ name: x })) });
}

export default function Page() {
  const router = useRouter();
  const barcode = getQueryParam(router.query.id);

  const title = barcode ?? "Recallio";
  return (
    <Layout header={{ title }}>
      {!!barcode ? <ReviewWrapper barcode={barcode} /> : "Loading..."}
    </Layout>
  );
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
      refetchData={(callback) => {
        reviewQuery
          .refetch()
          .then(({ data }) => {
            if (!data) return;
            callback(data);
          })
          .catch(console.error);
      }}
      barcode={barcode}
      review={
        reviewQuery.data ?? {
          name: namesQuery.data[0] ?? "",
          rating: 0,
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
  refetchData: (callback: (data: ReviewForm) => void) => void;
  review: ReviewForm;
  hasReview: boolean;
  names: string[];
  barcode: string;
};
function Review({ refetchData, barcode, review, hasReview, names }: ReviewProps) {
  const { register, control, reset, handleSubmit, setValue, getValues } = useForm({
    defaultValues: review,
  });
  const {
    append: addCategory,
    replace: setCategories,
    fields: categories,
  } = useFieldArray({ control, name: "categories" });

  function sync(condition = () => true) {
    function _sync() {
      return new Promise<void>((resolve) => {
        refetchData((data) => {
          reset(data);
          resolve();
        });
      });
    }

    backoffCallback({
      callback: _sync,
      condition,
      baselineMs: 500,
      retries: 5,
    }).catch(console.error);
  }

  const [image, setImage] = useState<File | null>();
  const { mutate: saveReview } = api.review.upsertReview.useMutation({
    async onSuccess() {
      if (image === undefined) return sync();
      if (image === null) {
        deleteImage({ barcode });
        return;
      }

      const compressedImage = await compressImage(image, 511 * 1024).catch(console.error);
      startUpload([compressedImage ?? image], { barcode }).catch(console.error);
    },
  });

  const router = useRouter();
  const apiUtils = api.useUtils();
  const { mutate: deleteReview } = api.review.deleteReview.useMutation({
    onMutate() {
      router.push("/profile").catch(console.error);
    },
    onSuccess() {
      void apiUtils.review.getUserReviewSummaryList.invalidate();
      void apiUtils.review.getReviewCount.invalidate();
      void apiUtils.product.getProductSummaryList.invalidate();
    },
  });
  const { mutate: deleteImage } = api.review.deleteReviewImage.useMutation({ onSuccess: sync });
  const { startUpload } = useUploadThing("reviewImageUploader", {
    onClientUploadComplete() {
      const oldImage = review.image;
      sync(() => getValues("image") !== oldImage);
    },
  });

  return (
    <form
      className="flex w-full flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit((data) => {
          const { categories, image: _, ...review } = data;
          saveReview({
            ...review,
            barcode,
            categories: categories.map((category) => category.name),
          });
        })(e).catch(console.error);
      }}
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
      <CategoryList
        append={(value) => {
          addCategory({ name: value });
        }}
        remove={(value) => {
          setCategories(categories.filter((category) => category.name !== value));
        }}
        values={categories.map((x) => x.name)}
      />
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
        <DeleteButton
          deleteReview={() => {
            deleteReview({ barcode });
          }}
        />
      )}
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
          placeholder="name"
          autoComplete="off"
          className="grow outline-none"
          aria-label="Product name"
        />
        {/* todo - there's no design for this element yet */}
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
  review: StrictPick<ReviewForm, "pros" | "cons" | "comment">;
};
function ProsConsComment({
  registerPros,
  registerCons,
  registerComment,
  review,
}: ProsConsCommentProps) {
  return (
    <div className="grid grid-cols-[2.5rem_auto] gap-y-2 rounded-lg p-4 outline outline-1 outline-app-green focus-within:outline-2">
      <PlusIcon className="h-fit w-full text-app-green" />
      <AutoresizableInput
        rootClassName="pt-1.5"
        initialContent={review.pros ?? ""}
        {...registerPros}
        placeholder="Pros"
      />
      <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />
      <MinusIcon className="h-fit w-full text-app-red" />
      <AutoresizableInput
        rootClassName="pt-1.5"
        initialContent={review.cons ?? ""}
        {...registerCons}
        placeholder="Cons"
      />
      <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />
      <AutoresizableInput
        rootClassName="col-span-2 min-h-[2.5rem] pt-1.5"
        initialContent={review.comment ?? ""}
        {...registerComment}
        placeholder="Comment"
      />
    </div>
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

type AttachedImageProps = { savedImage: string | null } & ModelProps<File | null | undefined>; // null - delete, undefined - keep as is
const fileReader = browser ? new FileReader() : null;
function AttachedImage({ savedImage, value, setValue }: AttachedImageProps) {
  const [localSrc, setLocalSrc] = useState<string>();
  const src = value === null ? null : localSrc ?? savedImage;
  const noImage = !src && !savedImage;

  function updateImage(file: typeof value) {
    setValue(file);

    if (!file) {
      setLocalSrc(undefined);
      return;
    }

    if (!fileReader) return;
    fileReader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!fileReader) return;

    function readeImageFile() {
      if (!fileReader || typeof fileReader.result !== "string") return;

      setLocalSrc(fileReader.result);
    }

    fileReader.addEventListener("load", readeImageFile);
    return () => fileReader.removeEventListener("load", readeImageFile);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-16 w-16">
        <div className="h-full w-full overflow-hidden rounded-full">
          {src ? (
            <Image
              alt="your attachment"
              src={src}
              width={144}
              height={144}
              sizes="144px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-400 p-2 text-white">
              <MilkIcon className="h-full w-full" />
            </div>
          )}
        </div>
        {!noImage && (
          <Button
            className={`absolute -right-2 top-0 flex aspect-square h-6 w-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 ${
              src ? "text-app-red" : "text-neutral-950"
            }`}
            onClick={() => {
              updateImage(src ? null : undefined);
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
          updateImage(e.target.files?.item(0));
        }}
        className="btn ghost rounded-lg px-4 py-0 outline-1"
      >
        {src ? "Change image" : "Upload image"}
      </ImageInput>
    </div>
  );
}

type CategoryListProps = {
  append: (value: string) => void;
  remove: (value: string) => void;
  values: string[];
};
function CategoryList({ append, remove, values }: CategoryListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const debouncedQuery = useRef<number>();
  const categorySet = useMemo<Set<string>>(() => new Set(values), [values]);

  return (
    <div>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(isOpen) => {
          setIsOpen(isOpen);
          if (isOpen) return;

          window.clearTimeout(debouncedQuery.current);
          setQueryParam(router, SEARCH_QUERY_KEY, null);
        }}
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <Toolbar.Root className="flex flex-wrap gap-2 text-xs">
            <Toolbar.Button asChild>
              <Dialog.Trigger className="btn flex items-center gap-1 rounded-xl bg-neutral-400/10 px-3 py-1 text-neutral-400 outline-neutral-300">
                <PlusIcon className="h-6 w-6" />
                <span className="whitespace-nowrap py-2">Add category</span>
              </Dialog.Trigger>
            </Toolbar.Button>
            {values.map((value) => (
              <Toolbar.Button
                className="btn flex items-center gap-1 rounded-xl bg-neutral-400/10 p-3 capitalize text-neutral-400 outline-neutral-300"
                type="button"
                key={value}
                aria-label={`Delete label ${value}`}
                onClick={(e) => {
                  remove(value);

                  // switch focus to next button
                  const next = e.currentTarget.nextSibling ?? e.currentTarget.previousSibling;
                  if (next instanceof HTMLElement) {
                    next?.focus();
                  }
                }}
              >
                <span>{value}</span>
                <DeleteIcon className="h-3 w-3" />
              </Toolbar.Button>
            ))}
          </Toolbar.Root>
        </div>
        <Dialog.Portal>
          <DialogOverlay className="fixed inset-0 z-10 flex animate-fade-in justify-center bg-black/40">
            <Dialog.Content className="w-full max-w-app">
              <CategorySearch
                enabled={isOpen}
                append={(value) => append(value.toLowerCase())}
                remove={remove}
                includes={(value) => categorySet.has(value.toLowerCase())}
                close={() => setIsOpen(false)}
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
  append: (value: string) => void;
  remove: (value: string) => void;
  includes: (value: string) => boolean;
  close: () => void;
  debounceRef: MutableRefObject<number | undefined>;
};
function CategorySearch({
  enabled,
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

  // since it's displayed only at the top anyway it's enough to check only the first page for that match
  const isShowInputCategory =
    !!search &&
    !includes(search) &&
    !categoriesQuery.data?.pages[0]?.includes(search.toLowerCase());

  return (
    <div className="relative flex h-full flex-col bg-white shadow-around sa-o-20 sa-r-2.5 motion-safe:animate-slide-up">
      <div className="flex h-14 w-full items-center bg-white px-2 text-xl shadow-around sa-o-15 sa-r-2">
        <SearchIcon className="h-7 w-7 shrink-0" />
        <input
          // key helps refocus input when clear button is pressed
          key={`${!!search}`}
          autoFocus
          className="h-full min-w-0 grow p-1 caret-app-green outline-none placeholder:p-1"
          placeholder="Search"
          value={search}
          onChange={(e) => {
            const { value } = e.target;
            setSearch(value);

            window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
              setQueryParam(router, SEARCH_QUERY_KEY, value);
            }, 500);
          }}
        />
        <button
          aria-label="Reset search filter"
          className="ml-1"
          onClick={() => {
            setSearch("");

            window.clearTimeout(debounceRef.current);
            setQueryParam(router, SEARCH_QUERY_KEY, null);
          }}
        >
          <ResetInputIcon className="h-7 w-7" />
        </button>
      </div>
      <div className="flex basis-full flex-col gap-6 overflow-y-auto px-7 py-5">
        {isShowInputCategory && (
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
              <CircledPlusIcon className="h-6 w-6 scale-125 text-neutral-400 transition-colors duration-150 group-active:text-app-green" />
            </button>
          </label>
        )}
        {categoriesQuery.isSuccess ? (
          <InfiniteScroll
            pages={categoriesQuery.data.pages}
            getPageValues={(page) => page}
            getKey={(category) => category}
            getNextPage={() => {
              if (categoriesQuery.isFetching) return;

              categoriesQuery.fetchNextPage().catch(console.error);
            }}
          >
            {(category) => (
              <label
                key={category}
                className="flex w-full cursor-pointer justify-between capitalize"
              >
                <span>{category}</span>
                <Checkbox.Root
                  className="group flex h-6 w-6 items-center justify-center rounded-sm border-2 border-neutral-400 bg-white transition-colors focus-within:border-app-green data-[state=checked]:border-app-green data-[state=checked]:bg-app-green data-[state=unchecked]:outline-none"
                  checked={includes(category)}
                  onCheckedChange={(e) => {
                    const action = e === true ? append : remove;
                    action(category);
                  }}
                >
                  <Checkbox.Indicator className="h-full w-full p-1 text-white">
                    <Checkmark className="checkmark h-full w-full" />
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

type DeleteButtonProps = { deleteReview: () => void };
function DeleteButton({ deleteReview }: DeleteButtonProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button className="destructive w-full">Delete review</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="items-center backdrop-blur-sm">
          <div className="w-full max-w-app p-4">
            <Dialog.Content className="flex animate-scale-in flex-col gap-4 rounded-3xl bg-white p-5">
              <Dialog.Title className="text-center text-2xl font-semibold">
                Delete Review?
              </Dialog.Title>
              <Dialog.Description className="basis-full text-center text-xl text-neutral-400">
                Are you sure you want to delete this review? Once deleted, this action cannot be
                undone.
              </Dialog.Description>
              <Dialog.Close
                onClick={deleteReview}
                asChild
              >
                <Button className="bg-app-red font-semibold text-white">Delete</Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button className="ghost font-semibold ">Cancel</Button>
              </Dialog.Close>
            </Dialog.Content>
          </div>
        </DialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
