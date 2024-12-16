import { compressImage } from "@/image/compress";
import { Button, ButtonLike } from "@/interface/button";
import { QueryView } from "@/interface/loading";
import { loadingTracker } from "@/interface/loading/indicator";
import type { ReviewForm } from "@/interface/review/edit";
import { CommentSection, Name, Private, Rating, transformReview } from "@/interface/review/edit";
import { CategoryList } from "@/interface/review/edit/category";
import { AttachedImage, ImageAction, useReviewImage } from "@/interface/review/edit/image";
import { logToastError, toast } from "@/interface/toast";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { logger } from "@/logger";
import { getQueryParam } from "@/navigation/query";
import { BarcodeTitle } from "@/product/components";
import type { ReviewData } from "@/product/type";
import { reviewPrivateDefaultStore } from "@/settings/boolean";
import { useStore } from "@/state/store";
import { useTracker } from "@/state/store/tracker/hooks";
import { trpc } from "@/trpc";
import { useUploadThing } from "@/uploadthing";
import { useInvalidateReviewData } from "@/user/review";
import type { StrictOmit } from "@/utils/object";
import { isSetEqual } from "@/utils/set";
import type { Nullish } from "@/utils/type";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { FormEvent } from "react";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);
  const reviewQuery = trpc.user.review.getOne.useQuery(
    { barcode: barcode ?? "" },
    {
      enabled: !!barcode,
      staleTime: Infinity,
      select: transformReview,
    },
  );
  const isPrivate = useStore(reviewPrivateDefaultStore);
  if (!barcode || !reviewQuery.isSuccess) {
    return (
      <QueryView
        query={reviewQuery}
        className="grow"
      />
    );
  }

  return (
    <>
      <Head>{reviewQuery.data && <title>edit - {reviewQuery.data.name}</title>}</Head>
      <Review
        barcode={barcode}
        review={
          reviewQuery.data ?? {
            name: "",
            rating: 5,
            pros: null,
            cons: null,
            comment: null,
            categories: [],
            image: null,
            isPrivate,
          }
        }
        hasReview={!!reviewQuery.data}
      />
    </>
  );
};
Page.getLayout = (children) => (
  <Layout header={{ title: <BarcodeTitle /> }}>
    <Head>
      <title>edit</title>
    </Head>
    {children}
  </Layout>
);

export default Page;

type ReviewProps = {
  review: ReviewForm;
  hasReview: boolean;
  barcode: string;
};
function Review({ barcode, review, hasReview }: ReviewProps) {
  const {
    register,
    control,
    handleSubmit,
    // isDirty has to be destructured so that we subscribe to its value
    formState: { isDirty },
  } = useForm({ defaultValues: review });

  const setOptimisticReview = useSetOptimisticReview(barcode);
  const onReviewUpdateSuccess = useRef((): void => undefined);
  function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit((data) => {
      const newCategories = data.categories.map(({ name }) => name);
      const optimistic = { ...data, categories: newCategories };
      if (!isDirty && hasReview) {
        return onReviewSave(optimistic);
      }

      const currentCategories = review.categories.map(({ name }) => name);
      const didCategoriesChange = !isSetEqual(new Set(newCategories), new Set(currentCategories));
      const categories = didCategoriesChange ? newCategories : undefined;
      const updatedReview = { ...data, categories, barcode };
      onReviewUpdateSuccess.current = () => onReviewSave(optimistic);
      saveReview(updatedReview);
    })(e).catch(logToastError("Error while trying to submit the review.\nPlease try again."));

    function onReviewSave(optimisticReview: StrictOmit<ReviewData, "image">) {
      const image = reviewImage.state;
      if (!(image instanceof File)) {
        setOptimisticReview(optimisticReview, image === ImageAction.KEEP ? undefined : null);

        if (image === ImageAction.KEEP) {
          return invalidate();
        }

        return deleteImage({ barcode });
      }

      setOptimisticReview(optimisticReview, URL.createObjectURL(image));
      compressImage(image, { targetBytes: 63 * 1024, maxResolution: 512 })
        .then((compressedImage) => startUpload([compressedImage ?? image], { barcode }))
        .catch((e) => {
          logToastError("Failed to upload the image.\nPlease try again.")(e);
          setOptimisticReview(optimisticReview, review.image);
        });
    }
  }
  const invalidate = useInvalidateReview(barcode);
  const { mutate: deleteImage } = trpc.user.review.deleteImage.useMutation({
    onSettled: invalidate,
    onError(e) {
      toast.error(`Failed to delete image from review: ${e.message}`);
    },
  });
  const { startUpload } = useUploadThing("reviewImage", {
    onClientUploadComplete(result) {
      if (result.some((x) => !x.serverData)) {
        toast.error("Failed to upload the image");
      }
      invalidate();
    },
    onUploadError(e) {
      toast.error(`Failed to upload the image: ${e.message}`);
      invalidate();
    },
  });
  const { mutate: saveReview, isLoading } = trpc.user.review.upsert.useMutation({
    onSuccess: () => onReviewUpdateSuccess.current(),
    onError(e) {
      toast.error(`Error while trying to save the review: ${e.message}`);
      invalidate();
    },
  });
  useTracker(loadingTracker, isLoading);

  const reviewImage = useReviewImage(review.image);

  return (
    <form
      className="flex grow flex-col gap-4"
      onSubmit={submitReview}
    >
      <AttachedImage
        image={reviewImage.image}
        rawImage={reviewImage.rawImage}
        savedImage={review.image}
        setImage={reviewImage.setImage}
        deleteImage={reviewImage.delete}
        resetImage={reviewImage.reset}
        crop={{
          value: reviewImage.effects.crop.value,
          setValue: reviewImage.effects.crop.set,
        }}
        state={reviewImage.state}
      />
      <Name
        barcode={barcode}
        register={register("name", { required: true })}
      />
      <CategoryList control={control} />
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
      <CommentSection
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
        <ButtonLike>
          <Link
            href={{ pathname: "/review/[id]", query: { id: barcode } }}
            className="ghost text-center"
          >
            Cancel
          </Link>
        </ButtonLike>
      )}
    </form>
  );
}

function useSetOptimisticReview(barcode: string) {
  const router = useRouter();
  const utils = trpc.useUtils();
  return function (review: StrictOmit<ReviewData, "image">, image: Nullish<string>) {
    utils.user.review.getOne.setData({ barcode }, (cache) => {
      if (!cache) {
        return { ...review, image: image ?? null };
      }
      if (image === undefined) {
        return { ...cache, ...review };
      }
      return { ...cache, ...review, image };
    });

    if (location.pathname !== encodeURI(`/review/${barcode}/edit`)) {
      return;
    }
    router.push({ pathname: "/review/[id]", query: { id: barcode } }).catch(logger.error);
  };
}

function useInvalidateReview(barcode: string) {
  const utils = trpc.useUtils();
  const invalidateReviewData = useInvalidateReviewData(barcode);

  return function () {
    const optimisticImage = utils.user.review.getOne.getData({ barcode })?.image;

    utils.user.review.getOne
      .invalidate({ barcode })
      .catch(
        logToastError("Failed to update data from the server.\nReloading the page is advised."),
      )
      .finally(() => {
        if (!optimisticImage) {
          return;
        }

        URL.revokeObjectURL(optimisticImage);
      });

    invalidateReviewData();
  };
}
