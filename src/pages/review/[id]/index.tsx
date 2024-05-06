import { Image } from "@/image";
import { Button, ButtonLike } from "@/interface/button";
import { DialogOverlay } from "@/interface/dialog";
import { QueryView } from "@/interface/loading";
import { loadingTracker } from "@/interface/loading/indicator";
import { Star } from "@/interface/star";
import { toast } from "@/interface/toast";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { getQueryParam } from "@/navigation/query";
import { useQueryToggleState } from "@/navigation/query/hooks";
import { Redirect } from "@/navigation/redirect";
import { BarcodeTitle, CategoryCard, CommentSection, ImagePreview } from "@/product/components";
import type { ReviewData } from "@/product/type";
import { useTrackerController } from "@/state/store/tracker/hooks";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import { useInvalidateReviewAdjacentData } from "@/user/review";
import { minutesToMs } from "@/utils";
import * as Dialog from "@radix-ui/react-dialog";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import RightIcon from "~icons/formkit/right";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);
  const reviewQuery = trpc.user.review.getOne.useQuery(
    { barcode: barcode ?? "" },
    {
      enabled: !!barcode,
      staleTime: minutesToMs(5),
    },
  );

  if (!barcode || !reviewQuery.isSuccess) {
    return (
      <QueryView
        query={reviewQuery}
        className="grow"
      />
    );
  }

  const review = reviewQuery.data;
  if (!review) return <Redirect to={{ pathname: "/review/[id]/edit", query: { id: barcode } }} />;

  return (
    <div className="flex w-full flex-col gap-4">
      <Head>
        <title>review - {review.name}</title>
      </Head>
      <div className="flex items-stretch gap-4">
        <AttachedImage image={review.image} />
        <Name
          barcode={barcode}
          name={review.name}
        />
      </div>
      {!!review.categories.length && (
        <section className="flex flex-col gap-1 text-xs">
          <h2>Category</h2>
          <ul className="flex flex-wrap gap-2">
            {review.categories.map((label) => (
              <CategoryCard key={label}>
                <li>{label}</li>
              </CategoryCard>
            ))}
          </ul>
        </section>
      )}
      <Rating value={review.rating} />
      <CommentSection
        pros={review.pros}
        cons={review.cons}
        comment={review.comment}
      />
      <div
        className={tw(
          "rounded-lg px-4 py-4",
          review.isPrivate ? "bg-app-green-100" : "bg-neutral-200",
        )}
      >
        {review.isPrivate ? "Private" : "Public"} review
      </div>
      <ButtonLike>
        <Link
          href={{ pathname: "/review/[id]/edit", query: { id: barcode } }}
          className="ghost flex items-center justify-center"
        >
          Update review
        </Link>
      </ButtonLike>
      <DeleteButton barcode={barcode} />
    </div>
  );
};

Page.getLayout = (children) => (
  <Layout header={{ title: <BarcodeTitle /> }}>
    <Head>
      <title>review</title>
    </Head>
    {children}
  </Layout>
);
export default Page;

type AttachedImageProps = Pick<ReviewData, "image">;
function AttachedImage({ image }: AttachedImageProps) {
  const [isOpen, setIsOpen] = useQueryToggleState("attached-image-dialog");
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Dialog.Trigger
        className="rounded-full outline-app-green-500"
        aria-label={
          image
            ? "Open full image view"
            : "Cannot open full image view if not image attached to review"
        }
        disabled={!image}
      >
        <ImagePreview
          src={image}
          size="md"
        />
      </Dialog.Trigger>
      {image && (
        <Dialog.Portal>
          <DialogOverlay className="flex items-center justify-center">
            <Dialog.Content className="max-h-dvh max-w-app animate-fade-in overflow-y-auto data-[state=closed]:animate-fade-in-reverse">
              <Dialog.Close
                className="flex"
                aria-label="Close full image view"
              >
                <Image
                  alt="Full-size review image"
                  src={image}
                  width={99999}
                  height={99999}
                  quality={100}
                  className="size-full object-contain"
                />
              </Dialog.Close>
            </Dialog.Content>
          </DialogOverlay>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}

type NameProps = { barcode: string; name: string };
function Name({ barcode, name }: NameProps) {
  const { data } = trpc.product.getSummary.useQuery({ barcode }, { staleTime: minutesToMs(5) });

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

type DeleteButtonProps = { barcode: string };
const deleteTimeout = 700;
function DeleteButton({ barcode }: DeleteButtonProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const invalidateReviewData = useInvalidateReviewAdjacentData(barcode);
  const loading = useTrackerController(loadingTracker);
  const { mutate } = trpc.user.review.deleteReview.useMutation({
    onMutate() {
      loading.enable();
      return router.push("/profile").catch(console.error);
    },
    onError(e) {
      toast.error(`Couldn't delete the review: ${e.message}`);
    },
    onSuccess() {
      utils.user.review.getOne.setData({ barcode }, null);
      invalidateReviewData();
    },
    onSettled() {
      loading.disable();
    },
  });
  const [enabled, setEnabled] = useState(false);
  const timeoutRef = useRef<number>();
  const [isOpen, setIsOpen] = useQueryToggleState("delete-dialog");

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

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
            <Dialog.Content className="group flex flex-col gap-4 rounded-3xl bg-white p-5 data-[state=closed]:animate-fade-in-reverse motion-safe:animate-scale-in">
              <Dialog.Title className="text-center text-2xl font-semibold">
                Delete Review?
              </Dialog.Title>
              <Dialog.Description className="basis-full text-balance text-center text-xl text-neutral-500">
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
                  style={{ "--duration": `${deleteTimeout}ms` }}
                  className={tw(
                    "relative overflow-hidden bg-app-red-500 font-semibold text-white",
                    "after:absolute after:inset-0 after:origin-right after:animate-expand-x-reverse after:bg-white/50 after:animate-duration-[var(--duration)] group-data-[state=closed]:after:content-none",
                    enabled ? "after:content-none" : "disabled",
                  )}
                >
                  Delete
                </Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button
                  autoFocus
                  className="ghost font-semibold"
                >
                  Cancel
                </Button>
              </Dialog.Close>
            </Dialog.Content>
          </div>
        </DialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
