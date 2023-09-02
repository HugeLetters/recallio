import { useImmer, type Drafter } from "@/hooks/useImmer";
import { getQueryParam } from "@/utils";
import { api } from "@/utils/api";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import { produce } from "immer";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Review = {
  productName: string;
  rating: number;
  pros: Array<string | null>;
  cons: Review["pros"];
  comment: string;
  categories: string[];
  image?: File;
};

export default function ReviewPage() {
  const [review, updateReview] = useImmer<Review>(() => ({
    productName: "",
    rating: 0,
    pros: [],
    cons: [],
    comment: "",
    categories: [],
  }));
  const [imagePreview, setImagePreview] = useState<string>();

  return (
    <form
      className="m-4 flex h-full max-w-md flex-col items-center justify-center gap-1 rounded-lg bg-emerald-400 p-4 "
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <NameSelect
        name={review.productName}
        setName={(name) =>
          updateReview((draft) => {
            draft.productName = name;
          })
        }
      />
      <Rating
        rating={review.rating}
        setRating={(rating) => {
          updateReview((draft) => {
            draft.rating = rating;
          });
        }}
      />
      <fieldset className="flex flex-col gap-1">
        <div>
          Pros
          <Points
            points={review.pros}
            setPoints={(a) => {
              updateReview((draft) => {
                draft.pros = produce(review.pros, a);
              });
            }}
          />
        </div>
        <div>
          Cons
          <Points
            points={review.cons}
            setPoints={(a) => {
              updateReview((draft) => {
                draft.cons = produce(review.cons, a);
              });
            }}
          />
        </div>
        <label>
          Comments
          <div>
            <input
              className="rounded-md px-2"
              value={review.comment}
              onChange={(e) =>
                updateReview((draft) => {
                  draft.comment = e.target.value;
                })
              }
            />
          </div>
        </label>
      </fieldset>
      <fieldset className="flex flex-col items-center">
        <legend>Categories</legend>
        {review.categories.map((category, i) => (
          <Category
            key={i}
            category={category}
            setCategory={(category) => {
              updateReview((draft) => {
                if (category === null) {
                  draft.categories.splice(i, 1);
                  return;
                }
                draft.categories[i] = category;
              });
            }}
          />
        ))}
        <button
          className="rounded-md bg-teal-400 p-2 drop-shadow-md"
          type="button"
          onClick={() => {
            updateReview((draft) => {
              draft.categories.push("");
            });
          }}
        >
          add category
        </button>
      </fieldset>
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const image = e.target.files?.item(0);
            if (!image) return;

            updateReview((draft) => {
              draft.image = image;
            });

            const fr = new FileReader();
            fr.readAsDataURL(image);
            fr.addEventListener("load", () => {
              if (typeof fr.result !== "string") return;
              setImagePreview(fr.result);
            });
          }}
        />
      </div>
      <div className="relative aspect-square w-24 overflow-hidden rounded-lg">
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="your uploaded image"
            fill
            className="object-fill"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-tr from-purple-400 via-red-400 to-yellow-400" />
        )}
      </div>
      <div className="w-full break-words">
        REVIEW DATA -{" "}
        {JSON.stringify(review, (key, value: (typeof review)[keyof typeof review]) => {
          if (key === "image") return;
          return value;
        })}
      </div>
      <button className="rounded-md bg-teal-400 p-4 drop-shadow-md">Add Review</button>
    </form>
  );
}
type NameSelectProps = {
  setName: (name: Review["productName"]) => void;
  name: Review["productName"];
};
function NameSelect({ name, setName }: NameSelectProps) {
  const router = useRouter();
  const { data, isSuccess } = api.product.getProductNames.useQuery(
    getQueryParam(router.query.id)!,
    {
      enabled: !!router.query.id,
      staleTime: Infinity, // no need to refetch this data
    }
  );

  useEffect(() => {
    if (!data?.[0] || name) return;
    setName(data[0]);
    // we run this once when data is fetched for the first time and if input hasn't been modified already
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="flex gap-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Select.Root onValueChange={setName}>
        <Select.Trigger
          className={`bg-teal-500  ${!isSuccess ? "grayscale" : "outline outline-1"}`}
          disabled={!isSuccess}
        >
          <Select.Icon />
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            className="bg-teal-500"
            position="popper"
          >
            <Select.Viewport>
              {isSuccess &&
                data.map((product) => (
                  <Select.Item
                    key={product}
                    value={product}
                  >
                    <Select.ItemText>{product}</Select.ItemText>
                    <Select.ItemIndicator>{"<--"}</Select.ItemIndicator>
                  </Select.Item>
                ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

type RatingProps = {
  setRating: (rating: Review["rating"]) => void;
  rating: Review["rating"];
};
function Rating({ rating, setRating }: RatingProps) {
  return (
    <RadioGroup.Root
      className="flex gap-1 text-5xl"
      value={rating.toString()}
      onValueChange={(value) => {
        setRating(+value);
      }}
    >
      {[rating === 1 ? 0 : 1, 2, 3, 4, 5].map((r) => (
        <RadioGroup.Item
          key={r}
          value={r.toString()}
          className={`${r <= rating ? "text-yellow-400 drop-shadow-md " : ""}`}
        >
          ★
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

type PointsProps = {
  setPoints: (draft: Drafter<Review["pros"]>) => void;
  points: Review["pros"];
};
function Points({ points, setPoints }: PointsProps) {
  return (
    <div className="flex flex-col gap-1">
      {[...points, ""].map((point, i) => (
        <div key={i}>
          <label>
            <input
              className={`${!!point ? "rounded-l-md" : "rounded-md"} px-2`}
              value={point ?? ""}
              onChange={(e) => {
                setPoints((draft) => {
                  draft[i] = e.target.value || null;
                });
              }}
            />
          </label>
          {i !== points.length && (
            <button
              onClick={() => {
                setPoints((draft) => {
                  draft.splice(i, 1);
                });
              }}
              type="button"
              className="rounded-r-md bg-red-600 px-2"
            >
              del
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

type CategoryProps = {
  setCategory: (category: Review["categories"][number] | null) => void;
  category: Review["categories"][number];
};
function Category({ category, setCategory }: CategoryProps) {
  const { data } = api.product.getCategories.useQuery(category, { staleTime: Infinity });

  return (
    <div className="m-1 flex flex-col gap-1">
      <div>
        <input
          type="text"
          className="rounded-l-md px-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <button
          className="rounded-r-md bg-red-500 px-2"
          type="button"
          onClick={() => setCategory(null)}
        >
          del
        </button>
      </div>
      <div className="flex h-8 gap-1">
        {data?.map((category) => (
          <button
            key={category.name}
            className="rounded-md bg-teal-300 p-1"
            onClick={() => setCategory(category.name)}
          >
            {category.name}
          </button>
        )) ?? "Loading..."}
      </div>
    </div>
  );
}
