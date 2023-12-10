import { Layout } from "@/components/Layout";
import { DialogOverlay, Star } from "@/components/UI";
import { getQueryParam, type StrictPick } from "@/utils";
import { api, type RouterOutputs } from "@/utils/api";
import * as Dialog from "@radix-ui/react-dialog";
import * as Separator from "@radix-ui/react-separator";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import MilkIcon from "~icons/custom/milk";
import RightIcon from "~icons/formkit/right";
import PlusIcon from "~icons/material-symbols/add-rounded";
import MinusIcon from "~icons/material-symbols/remove-rounded";

// todo - find which components can be reused between this and edit page
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
      <AttachedImage
        barcode={barcode}
        image={review.image}
        name={review.name}
      />
      <div className="flex flex-col gap-1 text-xs">
        <div>Category</div>
        <div className="flex flex-wrap gap-2">
          {review.categories.map((label) => (
            <div
              className="btn flex items-center gap-1 rounded-xl bg-neutral-400/10 p-3 capitalize text-neutral-400 outline-neutral-300"
              key={label}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      <Rating value={review.rating} />
      <ProsConsComment review={review} />
      {/* todo - need design for this element */}
      <div>This review is {review.isPrivate ? "" : "not"} private</div>
      <Link
        href={{ pathname: "/review/[id]/edit", query: { id: barcode } }}
        className="btn ghost flex items-center justify-center"
      >
        Update review
      </Link>
      {/* forces extra gap at the bottom */}
      <div className="pb-px" />
    </div>
  );
}

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;
type AttachedImageProps = { barcode: string } & StrictPick<ReviewData, "image" | "name">;
function AttachedImage({ image, name, barcode }: AttachedImageProps) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
        {image ? (
          <Dialog.Root>
            <Dialog.Trigger className="h-full w-full">
              {/* todo - resize on click */}
              <Image
                alt="Review image"
                src={image}
                width={144}
                height={144}
                sizes="144px"
                className="h-full w-full object-cover"
              />
            </Dialog.Trigger>
            <Dialog.Portal>
              <DialogOverlay className="items-center">
                <Dialog.Content className="max-h-screen max-w-app overflow-y-auto">
                  <Dialog.Close
                    className="flex"
                    aria-label="Close full image view"
                  >
                    <Image
                      alt="Review image full-size"
                      src={image}
                      width={999999}
                      height={999999}
                      quality={100}
                      sizes="99999px"
                      className="h-full w-full object-contain"
                    />
                  </Dialog.Close>
                </Dialog.Content>
              </DialogOverlay>
            </Dialog.Portal>
          </Dialog.Root>
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-400 p-2 text-white">
            <MilkIcon className="h-full w-full" />
          </div>
        )}
      </div>
      <Link
        href={{ pathname: "/product/[id]", query: { id: barcode } }}
        aria-label="Open product page for this barcode"
        className="flex grow items-center justify-between"
      >
        <div className="text-xl">{name}</div>
        <RightIcon className="h-7 w-7 text-neutral-400" />
      </Link>
    </div>
  );
}

const ratingList = [1, 2, 3, 4, 5] as const;
type RatingProps = { value: number };
function Rating({ value }: RatingProps) {
  return (
    <div className="flex justify-between gap-4 text-6xl">
      {ratingList.map((x) => (
        <div key={x}>
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
      <MinusIcon className="h-fit w-full text-app-red" />
      <div className="whitespace-pre-wrap pt-1.5">{review.cons}</div>
      <Separator.Root className="col-span-2 h-px bg-neutral-400/20" />
      <div className="col-span-2 min-h-[2.5rem] whitespace-pre-wrap pt-1.5">{review.comment}</div>
    </div>
  );
}
