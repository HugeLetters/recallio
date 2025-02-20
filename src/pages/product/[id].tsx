import { useCachedSession } from "@/auth/session/hooks";
import { InfiniteScroll } from "@/interface/list/infinite-scroll";
import { InfiniteQueryView, QueryView } from "@/interface/loading";
import { Spinner } from "@/interface/loading/spinner";
import { SortDialog, useSortQuery } from "@/interface/search/sort";
import { Star } from "@/interface/star";
import { toast } from "@/interface/toast";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { layoutLongScrollTracker } from "@/layout/long-scroll-tracker";
import { getQueryParam } from "@/navigation/query";
import { Redirect } from "@/navigation/redirect";
import { CategoryCard, CommentSection, ImagePreview } from "@/product/components";
import { useTracker } from "@/state/store/tracker/hooks";
import { tw } from "@/styles/tw";
import type { RouterInputs, RouterOutputs } from "@/trpc";
import { trpc } from "@/trpc";
import { fetchNextPage } from "@/trpc/infinite-query";
import { UserPicture } from "@/user/picture";
import { minutesToMs } from "@/utils";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { PropsWithChildren } from "react";
import { useRef, useState } from "react";
import RightIcon from "~icons/formkit/right";

type SummaryData = NonNullable<RouterOutputs["product"]["getSummary"]>;
const placeholderSummary: SummaryData = {
  name: "_",
  rating: 5,
  image: null,
  reviewCount: 1,
  categories: ["_"],
};

const Page: NextPageWithLayout = function () {
  const barcode = useBarcode();
  const summaryQuery = trpc.product.getSummary.useQuery(
    { barcode: barcode ?? "" },
    { enabled: !!barcode, staleTime: minutesToMs(5) },
  );

  return (
    <div className="flex grow flex-col">
      <Head>{summaryQuery.data && <title>product - {summaryQuery.data.name}</title>}</Head>
      <QueryView query={summaryQuery}>
        {summaryQuery.isSuccess && barcode ? (
          summaryQuery.data ? (
            <Summary summary={summaryQuery.data} />
          ) : (
            <Redirect to={{ pathname: "/review/[id]", query: { id: barcode } }} />
          )
        ) : (
          <Summary summary={placeholderSummary} />
        )}
      </QueryView>
      <Reviews reviewCount={summaryQuery.data?.reviewCount} />
    </div>
  );
};

Page.getLayout = (children) => {
  return (
    <Layout header={{ title: "Product" }}>
      <Head>
        <title>product</title>
      </Head>
      {children}
    </Layout>
  );
};

Page.isPublic = true;

export default Page;

type SummaryProps = {
  summary: SummaryData;
};
function Summary({ summary }: SummaryProps) {
  const { categories, image, name, rating, reviewCount } = summary;

  const barcode = useBarcode();
  const { data: session } = useCachedSession();
  const shouldFetchUserReview = !!barcode && !!session;
  const reviewQuery = trpc.user.review.getOne.useQuery(
    { barcode: barcode ?? "" },
    { enabled: shouldFetchUserReview, staleTime: Infinity },
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex gap-3">
        <ImagePreview
          src={image}
          size="md"
        />
        <Link
          href={{
            pathname:
              reviewQuery.isSuccess && !reviewQuery.data ? "/review/[id]/edit" : "/review/[id]",
            query: { id: barcode ?? "" },
          }}
          aria-label={
            reviewQuery.data
              ? `Open personal review page for barcode ${barcode}`
              : `Create a review for barcode ${barcode}`
          }
          className="flex min-w-0 grow justify-between"
        >
          <div className="flex min-w-0 flex-col items-start justify-between py-0.5">
            <h2 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap pl-1.5 text-xl capitalize">
              {name}
            </h2>
            <div className="flex h-6 items-center gap-0.5">
              <Star highlight />
              <span>{rating.toFixed(1)}</span>
              <span className="text-sm text-neutral-500">({reviewCount})</span>
            </div>
          </div>
          <RightIcon className="size-7 shrink-0 self-center text-neutral-400" />
        </Link>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs">Barcode</span>
        <span className="h-6 text-neutral-500">{barcode}</span>
      </div>
      {!!categories?.length && (
        <section className="flex flex-col gap-2 text-xs">
          <h2>Category</h2>
          <ul className="flex gap-2">
            {categories.map((category) => (
              <CategoryCard key={category}>
                <li>{category}</li>
              </CategoryCard>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const sortByOptions = ["recent", "earliest", "best rated", "worst rated"] as const;
type SortyByOption = (typeof sortByOptions)[number];
function parseSortByOption(
  option: SortyByOption,
): RouterInputs["product"]["getReviewList"]["sort"] {
  switch (option) {
    case "recent":
      return { by: "date", desc: true };
    case "earliest":
      return { by: "date", desc: false };
    case "best rated":
      return { by: "rating", desc: true };
    case "worst rated":
      return { by: "rating", desc: false };
    default:
      return option satisfies never;
  }
}
type ReviewsProps = {
  reviewCount: number | undefined;
};
function Reviews({ reviewCount }: ReviewsProps) {
  const barcode = useBarcode();
  const sortParam = useSortQuery(sortByOptions);
  const reviewsQuery = trpc.product.getReviewList.useInfiniteQuery(
    {
      barcode: barcode ?? "",
      limit: 10,
      sort: parseSortByOption(sortParam),
    },
    {
      enabled: !!barcode,
      staleTime: minutesToMs(5),
      getNextPageParam(page) {
        return page.cursor;
      },
    },
  );
  useTracker(layoutLongScrollTracker, true);

  return (
    <>
      <div className="flex justify-between py-4">
        <span className="font-semibold">
          Reviews {reviewCount !== undefined ? `(${reviewCount})` : ""}
        </span>
        <SortDialog optionList={sortByOptions} />
      </div>
      <div className="flex grow flex-col gap-5">
        <InfiniteQueryView
          query={reviewsQuery}
          className="size-full"
        >
          {reviewsQuery.data && (
            <InfiniteScroll
              pages={reviewsQuery.data.pages}
              getPageValues={({ page }) => page}
              getKey={(review) => review.id}
              getNextPage={fetchNextPage(reviewsQuery)}
            >
              {(review) => <ReviewCard review={review} />}
            </InfiniteScroll>
          )}
          {reviewsQuery.isFetching ? <Spinner className="h-8" /> : null}
        </InfiniteQueryView>
      </div>
    </>
  );
}

type Review = RouterOutputs["product"]["getReviewList"]["page"][number];
type ReviewCardProps = { review: Review };
const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
function ReviewCard({ review }: ReviewCardProps) {
  const { name, authorAvatar, authorName, rating, pros, cons, comment, updatedAt, id } = review;
  const { data: session } = useCachedSession();

  const cardHeader = (
    <div className="flex items-center gap-2">
      <div className="h-7">
        <UserPicture user={{ name: authorName, image: authorAvatar }} />
      </div>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{authorName}</span>
      <span className="ml-auto shrink-0">{dateFormatter.format(new Date(updatedAt))}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {session?.user.role === "admin" ? (
        <ShadowBan
          username={authorName}
          reviewId={id}
        >
          {cardHeader}
        </ShadowBan>
      ) : (
        cardHeader
      )}
      <div className="flex items-center justify-between">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
        <div className="shrink-0">
          <Rating value={rating} />
        </div>
      </div>
      <CommentSection
        comment={comment}
        pros={pros}
        cons={cons}
      />
    </div>
  );
}

type ShadowBanProps = { reviewId: string; username: string };
function ShadowBan({ reviewId, username, children }: PropsWithChildren<ShadowBanProps>) {
  const [taps, setTaps] = useState(3);
  const timeoutRef = useRef(0);
  const trpcUtils = trpc.useUtils();
  const { mutate: banUser, isSuccess } = trpc.user.banUserByReview.useMutation({
    onError(error) {
      toast.error(error.message);
      setTaps(3);
    },
    onSettled() {
      trpcUtils.product.invalidate().catch(console.error);
    },
  });
  const isBanned = taps <= 0 && isSuccess;

  return (
    <button
      disabled={isBanned}
      onClick={() => {
        const updated = taps - 1;
        setTaps(updated);
        clearTimeout(timeoutRef.current);

        if (updated <= 0) {
          toast.info(`Banning user ${username}`);
          banUser({ review: reviewId });
          return;
        }

        toast.info(`${updated} more taps to ban ${username}`);
        timeoutRef.current = window.setTimeout(() => {
          setTaps(3);
        }, 2000);
      }}
      style={{ opacity: isBanned ? undefined : taps / 3 }}
      className={tw("transition-opacity", isBanned && "line-through")}
    >
      {children}
    </button>
  );
}

const ratingList = [1, 2, 3, 4, 5];
type RatingProps = { value: number };
function Rating({ value }: RatingProps) {
  return (
    <div className="flex text-3xl">
      {ratingList.map((x) => (
        <div key={x}>
          <Star highlight={x <= value} />
        </div>
      ))}
    </div>
  );
}

function useBarcode() {
  const { query } = useRouter();
  return getQueryParam(query.id);
}
