import { Layout } from "@/components/Layout";
import { Button, ImageInput, Star, Switch } from "@/components/UI";
import { hasFocusWithin, useUploadThing } from "@/hooks";
import { browser, getQueryParam, type ModelProps, type StrictPick } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import { compressImage } from "@/utils/image";
import * as Radio from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { Controller, useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { toast } from "react-toastify";
import LucidePen from "~icons/custom/pen";
import IcBaselineRemoveCircle from "~icons/ic/baseline-remove-circle";
import MaterialSymbolsAddPhotoAlternateOutline from "~icons/material-symbols/add-photo-alternate-outline";
import MaterialSymbolsAddRounded from "~icons/material-symbols/add-rounded";
import MaterialSymbolsRemoveRounded from "~icons/material-symbols/remove-rounded";

export default function Page() {
  const router = useRouter();
  const barcode = getQueryParam(router.query.id);

  return (
    <Layout header={{ title: barcode ?? "Recallio" }}>
      {!!barcode ? <ReviewBlock barcode={barcode} /> : "loading..."}
    </Layout>
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
          image: null,
          isPrivate: true,
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

const fileReader = browser ? new FileReader() : null;
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
          async onSuccess() {
            if (!!image) {
              const compressedImage = await compressImage(image, 511 * 1024);
              await startUpload([compressedImage ?? image], { barcode }).catch((err) => {
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

  useEffect(() => {
    if (!fileReader) return;

    function readeImageFile() {
      if (!fileReader || typeof fileReader.result !== "string") return;

      setLocalImageSrc(fileReader.result);
    }

    fileReader.addEventListener("load", readeImageFile);
    return () => fileReader.removeEventListener("load", readeImageFile);
  }, []);
  // null - delete, undefined - keep as is
  const [image, setImage] = useState<File | null>();
  function updateImage(file: typeof image) {
    setImage(file);

    if (!file) {
      setLocalImageSrc(undefined);
      return;
    }

    if (!fileReader) return;
    fileReader.readAsDataURL(file);
  }
  const [localImageSrc, setLocalImageSrc] = useState<string>();
  const imageSrc = image === null ? null : localImageSrc ?? data.image;

  return (
    <form
      className="flex h-fit flex-col gap-2 py-2"
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
      <div className="flex flex-col gap-2 rounded-xl p-4 outline outline-1 outline-app-green">
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
        <ImageInput
          className="relative aspect-square w-20 overflow-hidden rounded-md"
          onChange={(e) => updateImage(e.target.files?.[0])}
          isImageSet={!!image}
          aria-label="add review image"
        >
          {imageSrc ? (
            <Image
              alt="your attachment"
              src={imageSrc}
              width={80}
              height={80}
              sizes="80px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-400 text-white">
              <MaterialSymbolsAddPhotoAlternateOutline className="text-xl" />
            </div>
          )}
        </ImageInput>
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
        <Switch defaultChecked />
      </label>
      <button
        onClick={syncWithServer}
        type="button"
        className="rounded-xl bg-neutral-300 p-1"
      >
        CANCEL CHANGES
      </button>
      <Button
        type="submit"
        className="primary"
      >
        SUBMIT
      </Button>
    </form>
  );
}

function NameSelect({ value, setValue, barcode }: ModelProps<string> & { barcode: string }) {
  const { data } = api.product.getProductNames.useQuery({ barcode }, { staleTime: Infinity });

  useEffect(() => {
    if (!data?.[0] || value) return;

    setValue(data[0]);
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
            className="rounded-xl bg-white p-2"
          >
            <Select.Viewport>
              {data?.map((name) => (
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
    </div>
  );
}

type CategoriesProps = Required<
  StrictPick<Parameters<typeof useFieldArray<Review>>[0], "control" | "name">
>;
function Categories({ control, name }: CategoriesProps) {
  const { fields, append, remove } = useFieldArray({ control, name });
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

  return isEditing ? (
    <div
      onBlur={hasFocusWithin(setIsEditing)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsEditing(false);
      }}
      className="grid grid-cols-5 gap-2 p-2"
    >
      <input
        autoFocus
        aria-label="add a category"
        value={inputCategory}
        onChange={(e) => setInputCategory(e.target.value)}
        className="col-span-4 rounded-xl p-3 outline outline-1 outline-app-green focus:outline-2"
      />
      <button
        type="button"
        onClick={() => {
          if (!inputCategory || !!fields.find((x) => x.name === inputCategory)) return;
          append({ name: inputCategory });
        }}
        className="rounded-xl px-4 outline outline-1"
      >
        Add
      </button>
      <div
        className={`${
          isPreviousData && inputCategory ? "opacity-50" : ""
        } col-span-full flex flex-wrap gap-2 rounded-xl p-3 outline`}
      >
        {inputCategory
          ? isSuccess
            ? categories.length
              ? categories.map((category) => {
                  const index = fields.findIndex((field) => field.name === category);
                  const selected = index >= 0;
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`${
                        selected
                          ? "text-app-green outline-app-green"
                          : "text-text-gray outline-text-gray"
                      } rounded-xl p-1.5 outline outline-1 selected:outline-dashed`}
                      onClick={() => {
                        selected ? remove(index) : append({ name: category });
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
          className="rounded-xl p-1.5 text-neutral-400 outline outline-1 outline-neutral-400 selected:outline-dashed"
        >
          {name}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="rounded-xl p-1.5 font-bold text-app-green outline outline-1 outline-app-green selected:outline-dashed"
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
      className="flex gap-4 text-6xl"
    >
      <Radio.Item
        value="0"
        className="sr-only"
      >
        <Star />
      </Radio.Item>
      {[1, 2, 3, 4, 5].map((x) => (
        <Radio.Item
          key={x}
          value={x.toString()}
          onClick={() => {
            if (x === value) setValue(0);
          }}
        >
          <Star highlight={x <= value} />
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
        <MaterialSymbolsAddRounded className="text-4xl text-app-green" />
      ) : (
        <MaterialSymbolsRemoveRounded className="text-4xl text-red-600" />
      )}
      <div className="mt-2.5 flex flex-col items-start gap-1">
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
  const { pros, cons, categories, updatedAt: _, ...rest } = data;

  return Object.assign(rest, {
    pros: pros?.split("\n").map((x) => ({ name: x })) ?? [],
    cons: cons?.split("\n").map((x) => ({ name: x })) ?? [],
    categories: categories.map((x) => ({ name: x })),
  });
}

type Review = NonNullable<ReturnType<typeof transformReview>>;
