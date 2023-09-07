import { useUploadThing } from "@/hooks/useUploadthing";
import { getQueryParam, type ModelProps, type StrictPick } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import * as Radio from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import * as Switch from "@radix-ui/react-switch";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { toast } from "react-toastify";
import IcBaselineRemoveCircle from "~icons/ic/baseline-remove-circle";
import LucidePen from "~icons/lucide/pen";
import MaterialSymbolsAddPhotoAlternateOutline from "~icons/material-symbols/add-photo-alternate-outline";
import MaterialSymbolsAddRounded from "~icons/material-symbols/add-rounded";
import MaterialSymbolsRemoveRounded from "~icons/material-symbols/remove-rounded";

export default function Page() {
  const router = useRouter();
  const barcode = getQueryParam(router.query.id);

  return (
    <div className=" my-4 h-full rounded-xl bg-background p-4">
      {barcode ? <ReviewBlock barcode={barcode} /> : "loading..."}
    </div>
  );
}

type ReviewBlockProps = { barcode: string };
function ReviewBlock({ barcode }: ReviewBlockProps) {
  const { data, isSuccess, refetch } = api.review.getUserReview.useQuery(
    { barcode },
    {
      select: transformReview,
      staleTime: Infinity,
    }
  );

  if (!isSuccess) return <>loading...</>;

  return (
    <ReviewForm
      barcode={barcode}
      data={
        data ?? {
          name: "",
          rating: 0,
          pros: [],
          cons: [],
          comment: null,
          categories: [],
          imageKey: null,
        }
      }
      getServerValue={(callback) => {
        refetch()
          .then(({ data }) => {
            if (!data) return;
            callback(data);
          })
          .catch(console.error);
      }}
    />
  );
}

type ReviewFormProps<T> = {
  data: T;
  getServerValue: (callback: (value: T) => void) => void;
  barcode: string;
};
function ReviewForm({ data, getServerValue, barcode }: ReviewFormProps<Review>) {
  const { mutate: updateReview } = api.review.createReview.useMutation();
  const { mutate: deleteImage } = api.review.deleteReviewImage.useMutation();
  const { startUpload } = useUploadThing("reviewImageUploader", {
    onUploadError(e) {
      console.error(e);
      toast.error(`Error while uploading image - ${e.message || e.code}`);
    },
  });
  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submit = handleSubmit((data) => {
      const { cons, pros, categories, ...value } = data;
      updateReview(
        {
          ...value,
          barcode,
          cons: cons.map((x) => x.name),
          pros: pros.map((x) => x.name),
          categories: categories.map((x) => x.name),
        },
        {
          async onSuccess(data) {
            if (!data.ok) toast.error(data.error);
            // ! todo - image key is not properly synced due to race condition
            // ! whether onUpload hook on server finishes before sync on the client or not
            else if (!!image) {
              await startUpload([image], { barcode }).catch((err) => {
                console.error(err);
                toast.error("Error while uploading image");
              });
            } else if (image === null) {
              await new Promise((resolve) => {
                deleteImage(
                  { barcode },
                  {
                    onSettled: () => resolve(void 0),
                    onError(error) {
                      console.error(error);
                      toast.error(`Erorr while deleting image - ${error.data?.code}`);
                    },
                    onSuccess(data) {
                      if (!data.ok) toast.error(data.error);
                    },
                  }
                );
              });
            }

            syncWithServer();
          },
          onError(error) {
            toast.error(error.data?.code);
            syncWithServer();
          },
        }
      );
    });

    submit(event).catch(console.error);
  }

  function syncWithServer() {
    getServerValue((value) => {
      reset(value);
      updateImage(undefined);
      /**
       * setTimeout because due to strange issue where reset keeps
       * array length with old values if new array value is different from previous one and it happens in the same tick
       */
      setTimeout(() => {
        replacePros(value.pros);
        replaceCons(value.cons);
      });
    });
  }

  const { register, control, reset, handleSubmit } = useForm({ defaultValues: data });
  const { replace: replacePros } = useFieldArray({ control, name: "pros" });
  const { replace: replaceCons } = useFieldArray({ control, name: "cons" });

  const fileInput = useRef<HTMLInputElement>(null);
  const fileReader = useRef(new FileReader());
  function readeImageFile() {
    if (typeof fileReader.current.result !== "string") return;
    setLocalImageSrc(fileReader.current.result);
  }
  useEffect(() => {
    const fr = fileReader.current;
    fr.addEventListener("load", readeImageFile);
    return () => fr.removeEventListener("load", readeImageFile);
  }, []);
  // null - delete, undefined - keep as is
  const [image, setImage] = useState<File | null>();
  function updateImage(file: typeof image) {
    setImage(file);

    if (!file) {
      setLocalImageSrc(undefined);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return;
    }

    fileReader.current.readAsDataURL(file);
  }
  const [localImageSrc, setLocalImageSrc] = useState<string>();
  const { data: serverImageSrc } = api.review.getReviewImage.useQuery(
    { imageKey: data.imageKey ?? "" },
    {
      enabled: !!data.imageKey,
      staleTime: Infinity,
    }
  );
  const imageSrc = image === null ? null : localImageSrc ?? serverImageSrc;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={submitReview}
    >
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange } }) => (
          <NameSelect
            value={value}
            setValue={onChange}
            barcode={barcode}
          />
        )}
      />
      <Categories
        control={control}
        name="categories"
      />
      <Controller
        control={control}
        name="rating"
        render={({ field: { value, onChange } }) => (
          <Rating
            value={value}
            setValue={onChange}
          />
        )}
      />
      <div className="flex flex-col gap-2 rounded-xl p-4 outline outline-1 outline-accent-green">
        <Features
          name="pros"
          register={register}
          control={control}
        />
        <Separator.Root className="h-0.5 bg-neutral-400/10" />
        <Features
          name="cons"
          register={register}
          control={control}
        />
        <Separator.Root className="h-0.5 bg-neutral-400/10" />
        <input
          {...register("comment")}
          placeholder="Comments..."
        />
      </div>
      <div className="flex gap-3">
        <label className="relative aspect-square w-20 cursor-pointer overflow-hidden rounded-md">
          {imageSrc ? (
            <Image
              alt="your attachment"
              src={imageSrc}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-text-gray text-background">
              <MaterialSymbolsAddPhotoAlternateOutline className="text-xl" />
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={(e) => updateImage(e.target.files?.[0])}
            className="hidden"
            aria-label="add review image"
          />
        </label>
        <div className="flex flex-col justify-center gap-2">
          <button
            type="button"
            onClick={() => updateImage(null)}
          >
            Delete image
          </button>
          <button
            type="button"
            onClick={() => updateImage(undefined)}
          >
            Reset image
          </button>
        </div>
      </div>
      <label className="flex items-center justify-between  rounded-2xl bg-neutral-100 px-3 py-4 font-bold ">
        Private review
        <Switch.Root
          defaultChecked
          className="group flex w-14 rounded-full bg-zinc-500/20 p-1 transition-colors data-[state=checked]:bg-green-500"
        >
          <div className="transition-[flex-grow] group-data-[state=checked]:grow" />
          <Switch.Thumb className="block aspect-square h-7 rounded-full bg-background drop-shadow-md" />
        </Switch.Root>
      </label>
      <button
        onClick={syncWithServer}
        type="button"
        className="rounded-lg bg-neutral-300 p-1"
      >
        CANCEL CHANGES
      </button>
      <button className="rounded-lg bg-accent-green px-3 py-4 text-background">SUBMIT</button>
    </form>
  );
}

function NameSelect({ value, setValue, barcode }: ModelProps<string> & { barcode: string }) {
  const { data } = api.product.getProductNames.useQuery({ barcode }, { staleTime: Infinity });

  useEffect(() => {
    if (!data?.[0] || value) return;

    setValue(data[0]);
    // todo - maybe replace if with skeleton until data loads?
    // update input once data has loaded if user didn't input something already
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        aria-label="product name"
        className="w-80 text-ellipsis"
      />

      <Select.Root
        onValueChange={(value) => {
          setValue(value);
        }}
      >
        <Select.Trigger aria-label="product name">
          <Select.Value>
            <LucidePen />
          </Select.Value>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            side="right"
            className="rounded-xl bg-background p-2"
          >
            <Select.Viewport>
              {data?.map((name) => (
                <Select.Item
                  key={name}
                  value={name}
                  className="cursor-pointer rounded-md outline-none current:bg-neutral-200"
                >
                  <Select.ItemText>{name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

type CategoriesProps = Required<
  StrictPick<Parameters<typeof useFieldArray<Review>>[0], "control" | "name">
>;
function Categories({ control, name }: CategoriesProps) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const fieldNames = fields.map((value) => value.name);
  const [inputCategory, setInputCategory] = useState("");
  const {
    data: categories,
    isSuccess,
    isPreviousData,
  } = api.product.getCategories.useQuery(inputCategory, {
    enabled: !!inputCategory,
    keepPreviousData: true,
    staleTime: Infinity,
  });

  const [isEditing, setIsEditing] = useState(false);
  const rootDiv = useRef<HTMLDivElement>(null);

  return isEditing ? (
    <div
      onBlur={() => {
        // when focus switches on the children on the first tick focus is set on body and on the next set on the new element
        // so we use setTimeout to check on the next tick
        setTimeout(() => {
          setIsEditing(rootDiv.current?.contains(document.activeElement) ?? false);
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsEditing(false);
      }}
      ref={rootDiv}
      className="flex flex-col gap-2"
    >
      <input
        value={inputCategory}
        onChange={(e) => setInputCategory(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            append({ name: inputCategory });
          }
        }}
        className="rounded-xl p-3 outline outline-1 outline-accent-green focus:outline-2"
      />
      <div
        className={`${
          isPreviousData && inputCategory ? "opacity-50" : ""
        } flex flex-wrap gap-2 rounded-xl p-3 outline`}
      >
        {inputCategory
          ? isSuccess
            ? categories.length
              ? categories.map((category) => {
                  const selected = fieldNames.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`${
                        selected
                          ? "text-accent-green outline-accent-green"
                          : "text-text-gray outline-text-gray"
                      } rounded-xl p-1.5 capitalize outline outline-1 current:outline-dashed`}
                      onClick={() => {
                        if (!selected) return append({ name: category });

                        const index = fields.findIndex((field) => field.name === category);
                        if (index < 0) return;

                        remove(index);
                      }}
                      aria-label={!selected ? "add" : "remove"}
                    >
                      {category}
                    </button>
                  );
                })
              : "No suggestions"
            : "Loading..."
          : "Start typing to see suggestions"}
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {fields.map(({ name, id }, i) => (
        <button
          key={id}
          type="button"
          aria-label="remove"
          onClick={() => remove(i)}
          className="rounded-xl p-1.5 capitalize text-text-gray outline outline-1 outline-text-gray current:outline-dashed"
        >
          {name}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-xl p-1.5 font-bold capitalize text-accent-green outline outline-1 outline-accent-green current:outline-dashed"
      >
        Add
      </button>
    </div>
  );
}

function Rating({ value, setValue }: ModelProps<number>) {
  return (
    <Radio.Root
      value={value.toString()}
      onValueChange={(val) => {
        setValue(+val);
      }}
      className="flex gap-4"
    >
      {[0, 1, 2, 3, 4, 5].map((x) => (
        <Radio.Item
          key={x}
          value={x.toString()}
          className={`${x <= value ? "text-yellow-400" : ""} ${
            x === 0 ? "pointer-events-none h-0 w-0 opacity-0" : ""
          } text-6xl`}
          onClick={() => {
            if (x === value) setValue(0);
          }}
        >
          ★
        </Radio.Item>
      ))}
    </Radio.Root>
  );
}

type FeaturesProps = Required<
  StrictPick<Parameters<typeof useFieldArray<Review>>[0], "control" | "name">
> & {
  register: UseFormRegister<Review>;
};
function Features({ control, name, register }: FeaturesProps) {
  const { fields, append, remove, insert } = useFieldArray({ control, name });
  return (
    <div className="flex">
      {name === "pros" ? (
        <MaterialSymbolsAddRounded className="text-4xl text-accent-green" />
      ) : (
        <MaterialSymbolsRemoveRounded className="text-4xl text-red-600" />
      )}
      <div className="mt-2 flex flex-col items-start gap-1">
        {fields.map((field, i) => (
          <div
            key={field.id}
            className="flex items-center"
          >
            <input
              {...register(`${name}.${i}.name`)}
              placeholder="Comment"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insert(i + 1, { name: "" });
                }
              }}
            />
            <button
              onClick={() => remove(i)}
              type="button"
            >
              <IcBaselineRemoveCircle className="text-red-600" />
            </button>
          </div>
        ))}
        <input
          value=""
          placeholder="New comment"
          onChange={(e) => {
            append({ name: e.target.value });
          }}
        />
      </div>
    </div>
  );
}

function transformReview(data: RouterOutputs["review"]["getUserReview"]) {
  if (!data) return data;
  const { pros, cons, categories, ...rest } = data;

  return Object.assign(rest, {
    pros: pros?.split("\n").map((x) => ({ name: x })) ?? [],
    cons: cons?.split("\n").map((x) => ({ name: x })) ?? [],
    categories: categories.map((x) => ({ name: x })),
  });
}

type Review = NonNullable<ReturnType<typeof transformReview>>;
