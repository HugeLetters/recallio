import { InfiniteScroll } from "@/interface/list/infinite-scroll";
import { QueryView } from "@/interface/loading";
import { Spinner } from "@/interface/loading/spinner";
import { SortDialog, useSortQuery } from "@/interface/search/sort";
import { Star } from "@/interface/star";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { layoutScrollUpTracker } from "@/layout/scroll-up-tracker";
import { getQueryParam } from "@/navigation/query";
import { Redirect } from "@/navigation/redirect";
import { CategoryCard, CommentSection, ImagePreview } from "@/product/components";
import { useTracker } from "@/state/store/tracker/hooks";
import type { RouterInputs, RouterOutputs } from "@/trpc";
import { trpc } from "@/trpc";
import { fetchNextPage } from "@/trpc/infinite-query";
import { UserPicture } from "@/user/picture";
import { minutesToMs } from "@/utils";
import Link from "next/link";
import { useRouter } from "next/router";
import RightIcon from "~icons/formkit/right";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);

  return barcode ? <ProductPage barcode={barcode} /> : null;
};

Page.getLayout = (children) => {
  return <Layout header={{ title: "Product page" }}>{children}</Layout>;
};

type SummaryData = NonNullable<RouterOutputs["product"]["getSummary"]>;
const placeholderSummary: SummaryData = {
  name: "",
  rating: 5,
  image: null,
  reviewCount: 1,
  categories: [""],
};

type ProductPageProps = { barcode: string };
function ProductPage({ barcode }: ProductPageProps) {
  const summaryQuery = trpc.product.getSummary.useQuery({ barcode }, { staleTime: minutesToMs(5) });

  return (
    <div className="flex w-full flex-col">
      <QueryView query={summaryQuery}>
        {summaryQuery.isSuccess ? (
          summaryQuery.data ? (
            <Summary
              barcode={barcode}
              summary={summaryQuery.data}
            />
          ) : (
            <Redirect to={{ pathname: "/review/[id]", query: { id: barcode } }} />
          )
        ) : (
          <Summary
            barcode={barcode}
            summary={placeholderSummary}
          />
        )}
      </QueryView>
      <Reviews
        barcode={barcode}
        reviewCount={summaryQuery.data?.reviewCount}
      />
    </div>
  );
}

export default Page;

type SummaryProps = {
  barcode: string;
  summary: SummaryData;
};
function Summary({ barcode, summary }: SummaryProps) {
  const { categories, image, name, rating, reviewCount } = summary;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex gap-3">
        <ImagePreview
          src={image}
          size="md"
        />
        <ProductName
          barcode={barcode}
          name={name}
          rating={rating}
          reviewCount={reviewCount}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs">Barcode</span>
        <span className="text-neutral-400">{barcode}</span>
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

type ProductNameProps = { barcode: string; name: string; reviewCount: number; rating: number };
function ProductName({ barcode, name, rating, reviewCount }: ProductNameProps) {
  const { data, isSuccess } = trpc.user.review.getOne.useQuery(
    { barcode },
    { staleTime: Infinity },
  );

  return (
    <Link
      href={{
        pathname: isSuccess && !data ? "/review/[id]/edit" : "/review/[id]",
        query: { id: barcode },
      }}
      aria-label={
        data
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
          <span className="text-sm text-neutral-400">({reviewCount})</span>
        </div>
      </div>
      <RightIcon className="size-7 shrink-0 self-center text-neutral-400" />
    </Link>
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
  barcode: string;
  reviewCount: number | undefined;
};
function Reviews({ barcode, reviewCount }: ReviewsProps) {
  const sortParam = useSortQuery(sortByOptions);
  const reviewsQuery = trpc.product.getReviewList.useInfiniteQuery(
    {
      barcode,
      limit: 10,
      sort: parseSortByOption(sortParam),
    },
    {
      staleTime: minutesToMs(5),
      getNextPageParam(page) {
        return page.cursor;
      },
    },
  );
  useTracker(layoutScrollUpTracker, true);

  return (
    <>
      <div className="flex justify-between py-4">
        <span className="font-semibold">
          Reviews {reviewCount !== undefined ? `(${reviewCount})` : ""}
        </span>
        <SortDialog optionList={sortByOptions} />
      </div>
      <QueryView
        query={reviewsQuery}
        className="size-full"
      >
        {reviewsQuery.isSuccess && (
          <div className="flex flex-col gap-5">
            <InfiniteScroll
              pages={reviewsQuery.data.pages}
              getPageValues={({ page }) => page}
              getKey={(review) => review.id}
              getNextPage={fetchNextPage(reviewsQuery)}
            >
              {(review) => <ReviewCard review={review} />}
            </InfiniteScroll>
            {reviewsQuery.isFetching ? <Spinner className="h-8" /> : null}
          </div>
        )}
      </QueryView>
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
function ReviewCard({
  review: { authorAvatar, authorName, rating, pros, cons, comment, updatedAt },
}: ReviewCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-7">
          <UserPicture user={{ name: authorName, image: authorAvatar }} />
        </div>
        <span>{authorName}</span>
        <span className="ml-auto">{dateFormatter.format(new Date(updatedAt))}</span>
      </div>
      <Rating value={rating} />
      <CommentSection
        comment={comment}
        pros={pros}
        cons={cons}
      />
    </div>
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
