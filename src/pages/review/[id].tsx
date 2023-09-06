import { useUploadThing } from "@/hooks/useUploadthing";
import { getQueryParam, type ModelProps, type StrictPick } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import * as Label from "@radix-ui/react-label";
import * as Radio from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { toast } from "react-toastify";

export default function Page() {
  const router = useRouter();
  const barcode = getQueryParam(router.query.id);

  return <div>{barcode ? <ReviewBlock barcode={barcode} /> : "loading..."}</div>;
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
  const { fields: categories, append, remove } = useFieldArray({ control, name: "categories" });

  const fileInput = useRef<HTMLInputElement>(null);
  const fileReader = useRef(new FileReader());
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
    fileReader.current.addEventListener("load", () => {
      if (typeof fileReader.current.result !== "string") return;
      setLocalImageSrc(fileReader.current.result);
    });
  }
  const [localImageSrc, setLocalImageSrc] = useState<string>();
  const { data: serverImageSrc, isFetching: isImageFetching } = api.review.getReviewImage.useQuery(
    { imageKey: data.imageKey ?? "" },
    {
      enabled: !!data.imageKey,
      staleTime: Infinity,
    }
  );
  const imageSrc = image === null ? null : localImageSrc ?? serverImageSrc;

  return (
    <form
      className="flex flex-col items-start gap-2 "
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
      <Features
        name="pros"
        register={register}
        control={control}
      />
      <Features
        name="cons"
        register={register}
        control={control}
      />
      <label>
        Comment
        <input {...register("comment")} />
      </label>
      {categories.map((category, i) => (
        <Controller
          key={category.id}
          control={control}
          name={`categories.${i}.name`}
          render={({ field: { value, onChange } }) => (
            <Category
              value={value}
              setValue={onChange}
              remove={() => remove(i)}
            />
          )}
        />
      ))}
      <button
        className="flex gap-2 bg-teal-300 p-2"
        onClick={() => append({ name: "" })}
        type="button"
      >
        add category
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={(e) => updateImage(e.target.files?.[0])}
      />
      {imageSrc ? (
        <Image
          alt="your attachment"
          src={imageSrc}
          width={150}
          height={150}
        />
      ) : isImageFetching ? (
        "loading..."
      ) : (
        "no image attached"
      )}
      <button
        type="button"
        onClick={() => updateImage(null)}
      >
        delete image
      </button>
      <button
        type="button"
        onClick={() => updateImage(undefined)}
      >
        reset image
      </button>
      <div className="flex gap-2 bg-teal-300 p-2">
        <button
          onClick={syncWithServer}
          type="button"
          className="bg-teal-200 p-1"
        >
          RESET
        </button>
        <button className="bg-teal-200 p-1">SUBMIT</button>
      </div>
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
      <Label.Root>
        Product Name
        <input
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
        <Select.Root onValueChange={setValue}>
          <Select.Trigger aria-label="product name">
            <Select.Value>▼</Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              side="right"
              className="bg-teal-300 p-1"
            >
              <Select.Viewport>
                {data?.map((name) => (
                  <Select.Item
                    key={name}
                    value={name}
                    className="cursor-pointer hover:bg-teal-200"
                  >
                    <Select.ItemText>{name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </Label.Root>
    </div>
  );
}

function Rating({ value, setValue }: ModelProps<number>) {
  return (
    <Radio.Root
      value={value.toString()}
      onValueChange={(val) => setValue(+val)}
    >
      {[value === 1 ? 0 : 1, 2, 3, 4, 5].map((x) => (
        <Radio.Item
          key={x}
          value={x.toString()}
          className={`${x <= value ? "text-yellow-400" : ""} text-6xl`}
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
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div>
      <p>{name}</p>
      <div className="flex flex-col items-start gap-1">
        {fields.map((field, i) => (
          <div key={field.id}>
            <input {...register(`${name}.${i}.name`)} />
            <button
              onClick={() => remove(i)}
              type="button"
            >
              del
            </button>
          </div>
        ))}
        <input
          value=""
          onChange={(e) => {
            append({ name: e.target.value });
          }}
        />
      </div>
    </div>
  );
}

function Category({ value, setValue, remove }: ModelProps<string> & { remove: () => void }) {
  const { data, isSuccess } = api.product.getCategories.useQuery(value, {
    keepPreviousData: true,
    staleTime: Infinity,
  });

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        onClick={remove}
      >
        del
      </button>
      <div className="m-1 flex gap-1">
        {isSuccess
          ? data.map((category) => (
              <button
                key={category}
                onClick={() => setValue(category)}
                type="button"
                className="rounded-sm bg-teal-200 p-1"
              >
                {category}
              </button>
            ))
          : "Loading..."}
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
