import { Layout } from "@/components/Layout";
import { Button, DialogOverlay, Star, UrlDialogRoot } from "@/components/UI";
import {
  BarcodeTitle,
  CategoryButton,
  ConsIcon,
  ImagePreview,
  ImagePreviewWrapper,
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
      <AttachedImage
        barcode={barcode}
        image={review.image}
        name={review.name}
      />
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
      <div className="pb-px" />
    </div>
  );
}

type ReviewData = NonNullable<RouterOutputs["review"]["getUserReview"]>;
type AttachedImageProps = { barcode: string } & Pick<ReviewData, "image" | "name">;
function AttachedImage({ image, name, barcode }: AttachedImageProps) {
  return (
    <div className="flex items-stretch gap-4">
      <ImagePreviewWrapper className="shrink-0">
        {image ? (
          <UrlDialogRoot dialogQueryKey="attached-image-dialog">
            <Dialog.Trigger
              className="h-full w-full"
              aria-label="Open full image view"
            >
              <ImagePreview src={image} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <DialogOverlay className="items-center">
                <Dialog.Content className="max-h-screen max-w-app overflow-y-auto">
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
                      className="h-full w-full object-contain"
                    />
                  </Dialog.Close>
                </Dialog.Content>
              </DialogOverlay>
            </Dialog.Portal>
          </UrlDialogRoot>
        ) : (
          <NoImagePreview />
        )}
      </ImagePreviewWrapper>
      <Link
        href={{ pathname: "/product/[id]", query: { id: barcode } }}
        aria-label="Open product page for this barcode"
        className="flex min-w-0 grow items-center justify-between"
      >
        <div className="overflow-hidden text-ellipsis text-xl">{name}</div>
        <RightIcon className="h-7 w-7 text-neutral-400" />
      </Link>
    </div>
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
function DeleteButton({ barcode }: DeleteButtonProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const { mutate } = api.review.deleteReview.useMutation({
    onMutate() {
      router.push("/profile").catch(console.error);
    },
    onSuccess() {
      void apiUtils.review.getUserReviewSummaryList.invalidate();
      void apiUtils.review.getReviewCount.invalidate();
      void apiUtils.product.getProductSummaryList.invalidate();
    },
  });

  return (
    <UrlDialogRoot dialogQueryKey="delete-dialog">
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
                asChild
                onClick={() => mutate({ barcode })}
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
    </UrlDialogRoot>
  );
}
