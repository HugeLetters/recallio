import { Layout } from "@/components/Layout";
import { Star } from "@/components/UI";
import { getQueryParam, type StrictPick } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import MilkIcon from "~icons/custom/milk";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;

export default function Page() {
  const router = useRouter();
  const barcode = getQueryParam(router.query.id);

  const title = barcode ?? "Recallio";
  return (
    <Layout header={{ title }}>{!!barcode ? <Review barcode={barcode} /> : "Loading..."}</Layout>
  );
}

type ReviewProps = { barcode: string };
function Review({ barcode }: ReviewProps) {
  const router = useRouter();
  const reviewQuery = api.review.getUserReview.useQuery(
    { barcode },
    {
      staleTime: Infinity,
      select(data) {
        if (!data) {
          void router.push({ pathname: "/review/[id]/edit", query: { id: barcode } });
          throw Error("No review found");
        }

        return data;
      },
    },
  );
  if (!reviewQuery.isSuccess) return <>Loading...</>;

  const review = reviewQuery.data;
  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="h-full w-full overflow-hidden rounded-full">
        {review.image ? (
          <Image
            alt="your attachment"
            src={review.image}
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
      <div>{review.name}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        {review.categories.map((label) => (
          <div
            className="btn flex items-center gap-1 rounded-xl bg-neutral-400/10 p-3 capitalize text-neutral-400 outline-neutral-300"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
      <Rating value={review.rating} />
      <ProsConsComment review={review} />
      <div>This review is {review.isPrivate ? "" : "not"} private</div>

      <Link
        href={{ pathname: "/review/[id]/edit", query: { id: barcode } }}
        className="btn primary flex items-center justify-center"
      >
        Edit
      </Link>
      {/* forces extra gap at the bottom */}
      <div className="pb-px" />
    </div>
  );
}

const ratingList = [1, 2, 3, 4, 5] as const;
type RatingProps = { value: number };
function Rating({ value }: RatingProps) {
  return (
    <div className="flex justify-between gap-4 text-6xl">
      {ratingList.map((x) => (
        <div
          key={x}
          className="outline-none transition sa-o-30 sa-r-0.5 focus-within:shadow-around"
        >
          <Star highlight={x <= value} />
        </div>
      ))}
    </div>
  );
}

type ProsConsCommentProps = {
  review: StrictPick<ReviewData, "pros" | "cons" | "comment">;
};
function ProsConsComment({ review }: ProsConsCommentProps) {
  return (
    <div className="grid grid-cols-[2.5rem_auto] gap-y-2 rounded-lg p-4 outline outline-1 outline-app-green focus-within:outline-2">
      <PlusIcon className="h-fit w-full text-app-green" />
      <div className="whitespace-pre-wrap pt-1.5">{review.pros}</div>
      <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />
      <MinusIcon className="h-fit w-full text-rose-700" />
      <div className="whitespace-pre-wrap pt-1.5">{review.cons}</div>
      <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />
      <div className="col-span-2 min-h-[2.5rem] whitespace-pre-wrap pt-1.5">{review.comment}</div>
    </div>
  );
}
