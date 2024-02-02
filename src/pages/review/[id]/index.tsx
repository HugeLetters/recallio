import { Layout } from "@/components/Layout";
import { useSetLoadingIndicator } from "@/components/Loading";
import { Button, DialogOverlay, Star, UrlDialogRoot } from "@/components/UI";
import {
  BarcodeTitle,
  CategoryButton,
  ConsIcon,
  ImagePreview,
  NoImagePreview,
  ProsConsCommentWrapper,
  ProsIcon,
} from "@/components/page/Review";
import { api, type RouterOutputs } from "@/utils/api";
import { getQueryParam } from "@/utils/query";
import { type NextPageWithLayout } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState, type CSSProperties } from "react";
import RightIcon from "~icons/formkit/right";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);

  return !!barcode ? <Review barcode={barcode} /> : "Loading...";
};

Page.getLayout = (page) => <Layout header={{ title: <BarcodeTitle /> }}>{page}</Layout>;
export default Page;

type ReviewProps = { barcode: string };
function Review({ barcode }: ReviewProps) {
  const router = useRouter();
  const reviewQuery = api.review.getUserReview.useQuery(
    { barcode },
    {
      select(data) {
        if (!data) {
          void router.replace({ pathname: "/review/[id]/edit", query: { id: barcode } });
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
      <div className="flex items-stretch gap-4">
        <AttachedImage image={review.image} />
        <Name
          barcode={barcode}
          name={review.name}
        />
      </div>
      {!!review.categories.length && (
        <div className="flex flex-col gap-1 text-xs">
          <div>Category</div>
          <div className="flex flex-wrap gap-2">
            {review.categories.map((label) => (
              <CategoryButton
                disabled
                className="disabled"
                role="generic"
                key={label}
              >
                {label}
              </CategoryButton>
            ))}
          </div>
        </div>
      )}
      <Rating value={review.rating} />
      <ProsConsComment review={review} />
      <div
        className={`rounded-lg px-4 py-4 ${
          review.isPrivate ? "bg-app-green/20" : "bg-neutral-200"
        }`}
      >
        {review.isPrivate ? "Private" : "Public"} review
      </div>
      <Link
        href={{ pathname: "/review/[id]/edit", query: { id: barcode } }}
        className="btn ghost flex items-center justify-center"
      >
        Update review
      </Link>
      <DeleteButton barcode={barcode} />
      {/* forces extra gap at the bottom */}
      <div className="pb-2" />
    </div>
  );
}

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;
type AttachedImageProps = Pick<ReviewData, "image">;
function AttachedImage({ image }: AttachedImageProps) {
  return (
    <div className="size-16 shrink-0">
      {image ? (
        <UrlDialogRoot dialogQueryKey="attached-image-dialog">
          <Dialog.Trigger
            className="size-full rounded-full outline-app-green"
            aria-label="Open full image view"
          >
            <ImagePreview src={image} />
          </Dialog.Trigger>
          <Dialog.Portal>
            <DialogOverlay className="flex items-center justify-center">
              <Dialog.Content className="max-h-screen max-w-app animate-fade-in overflow-y-auto data-[state=closed]:animate-fade-out">
                <Dialog.Close
                  className="flex"
                  aria-label="Close full image view"
                >
                  <Image
                    alt="Full-size review image"
                    src={image}
                    width={999999}
                    height={999999}
                    quality={100}
                    sizes="99999px"
                    className="size-full object-contain"
                  />
                </Dialog.Close>
              </Dialog.Content>
            </DialogOverlay>
          </Dialog.Portal>
        </UrlDialogRoot>
      ) : (
        <NoImagePreview />
      )}
    </div>
  );
}

type NameProps = { barcode: string; name: string };
function Name({ barcode, name }: NameProps) {
  const { data } = api.product.getProductSummary.useQuery({ barcode });

  const nameDiv = (
    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xl">{name}</div>
  );

  if (!data) return <div className="flex min-w-0 items-center">{nameDiv}</div>;

  return (
    <Link
      href={{ pathname: "/product/[id]", query: { id: barcode } }}
      aria-label={`Open product page for barcode ${barcode}`}
      className="flex min-w-0 grow items-center justify-between"
    >
      {nameDiv}
      <RightIcon className="size-7 animate-scale-in text-neutral-400" />
    </Link>
  );
}

const ratingList = [1, 2, 3, 4, 5];
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
  review: Pick<ReviewData, "pros" | "cons" | "comment">;
};
function ProsConsComment({ review: { comment, cons, pros } }: ProsConsCommentProps) {
  if (!pros && !cons && !comment) return null;

  return (
    <ProsConsCommentWrapper>
      {!!pros && (
        <>
          <ProsIcon />
          <div className="whitespace-pre-wrap pt-1.5">{pros}</div>
        </>
      )}
      {!!cons && (
        <>
          <ConsIcon />
          <div className="whitespace-pre-wrap pt-1.5">{cons}</div>
        </>
      )}
      {!!comment && <div className="col-span-2 whitespace-pre-wrap pt-1.5">{comment}</div>}
    </ProsConsCommentWrapper>
  );
}

type DeleteButtonProps = { barcode: string };
const deleteTimeout = 700;
function DeleteButton({ barcode }: DeleteButtonProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const setLoading = useSetLoadingIndicator();
  const { mutate } = api.review.deleteReview.useMutation({
    onMutate() {
      setLoading(true);
      router.push("/profile").catch(console.error);
    },
    onSuccess() {
      void apiUtils.review.getUserReviewSummaryList.invalidate();
      void apiUtils.review.getReviewCount.invalidate();
      void apiUtils.product.getProductSummaryList.invalidate();
    },
    onSettled() {
      setLoading(false);
    },
  });
  const [enabled, setEnabled] = useState(false);
  const timeoutRef = useRef<number>();

  return (
    <UrlDialogRoot
      dialogQueryKey="delete-dialog"
      onOpenChange={(open) => {
        clearTimeout(timeoutRef.current);
        if (!open) {
          setEnabled(false);
          return;
        }
        timeoutRef.current = window.setTimeout(() => setEnabled(true), deleteTimeout);
      }}
    >
      <Dialog.Trigger asChild>
        <Button className="destructive w-full">Delete review</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="flex items-center justify-center backdrop-blur-sm">
          <div className="w-full max-w-app p-4">
            <Dialog.Content className="flex flex-col gap-4 rounded-3xl bg-white p-5 data-[state=closed]:animate-fade-out motion-safe:animate-scale-in">
              <Dialog.Title className="text-center text-2xl font-semibold">
                Delete Review?
              </Dialog.Title>
              <Dialog.Description className="basis-full text-balance text-center text-xl text-neutral-400">
                Are you sure you want to delete this review? Once deleted, this action cannot be
                undone.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button
                  aria-disabled={!enabled}
                  aria-label={
                    enabled
                      ? "Delete review"
                      : `Delete review. The button will be enabled in ${(deleteTimeout / 1000).toFixed(0)} seconds to prevent accidental delete.`
                  }
                  onClick={(e) => {
                    if (!enabled) {
                      e.preventDefault();
                      return;
                    }
                    mutate({ barcode });
                  }}
                  style={{ "--duration": `${deleteTimeout}ms` } as CSSProperties}
                  className={`relative overflow-hidden bg-app-red font-semibold text-white after:absolute after:inset-0 after:animate-slide-left after:bg-white/50 after:animate-reverse after:animate-duration-[var(--duration)] ${enabled ? "after:content-none" : "disabled"}`}
                >
                  Delete
                </Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button className="ghost font-semibold ">Cancel</Button>
              </Dialog.Close>
            </Dialog.Content>
          </div>
        </DialogOverlay>
      </Dialog.Portal>
    </UrlDialogRoot>
  );
}
