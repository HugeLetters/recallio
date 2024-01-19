import { Layout } from "@/components/Layout";
import { InfiniteScroll } from "@/components/List";
import { SortDialog, useParseSort } from "@/components/Search";
import { Star, UserPic } from "@/components/UI";
import {
  CategoryButton,
  ConsIcon,
  ImagePreview,
  ImagePreviewWrapper,
  NoImagePreview,
  ProsConsCommentWrapper,
  ProsIcon,
} from "@/components/page/Review";
import { fetchNextPage, getQueryParam } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import type { NextPageWithLayout } from "@/utils/type";
import { useRouter } from "next/router";

// todo - show my review if exists - allow to go to it

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const barcode = getQueryParam(query.id);

  return !!barcode ? <ProductPage barcode={barcode} /> : "Loading...";
};

Page.getLayout = (page) => {
  return <Layout header={{ title: "Product page" }}>{page}</Layout>;
};

type ProductPageProps = { barcode: string };
function ProductPage({ barcode }: ProductPageProps) {
  const router = useRouter();

  const summaryQuery = api.product.getProductSummary.useQuery(
    { barcode },
    {
      select(data) {
        if (!data) {
          void router.push({ pathname: "/review/[id]/edit", query: { id: barcode } });
          throw Error(`No data for product with barcode ${barcode} exists.`);
        }
        return data;
      },
    },
  );

  return (
    <div className="w-full overflow-x-hidden p-4 pb-5">
      {summaryQuery.isSuccess ? (
        <Summary
          barcode={barcode}
          summary={summaryQuery.data}
        />
      ) : (
        "Loading..."
      )}
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
  summary: NonNullable<RouterOutputs["product"]["getProductSummary"]>;
};
function Summary({
  barcode,
  summary: { categories, image, name, rating, reviewCount },
}: SummaryProps) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex h-16 gap-3">
        <ImagePreviewWrapper>
          {image ? <ImagePreview src={image} /> : <NoImagePreview />}
        </ImagePreviewWrapper>
        <div className="flex flex-col justify-between py-0.5">
          <h2 className="pl-1.5 text-xl capitalize">{name}</h2>
          <div className="flex h-6 min-h-0 w-fit items-center gap-0.5">
            <Star highlight />
            <span>{rating.toFixed(1)}</span>
            <span className="text-sm text-neutral-400">({reviewCount})</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs">Barcode</span>
        <span className="text-neutral-400">{barcode}</span>
      </div>
      {!!categories?.length && (
        <div className="flex flex-col gap-2 text-xs">
          <span>Category</span>
          <div className="flex gap-3">
            {categories.map((category) => (
              <CategoryButton
                disabled
                className="disabled"
                role="generic"
                key={category}
              >
                {category}
              </CategoryButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const sortByOptions = ["recent", "earliest", "best rated", "worst rated"] as const;
type SortyByOption = (typeof sortByOptions)[number];
function parseSortByOption(
  option: SortyByOption,
): RouterInputs["product"]["getProductReviews"]["sort"] {
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
      const x: never = option;
      return x;
  }
}
type ReviewsProps = {
  barcode: string;
  reviewCount: number | undefined;
};
function Reviews({ barcode, reviewCount }: ReviewsProps) {
  const sortParam = useParseSort(sortByOptions);
  const reviewsQuery = api.product.getProductReviews.useInfiniteQuery(
    {
      barcode,
      limit: 10,
      sort: parseSortByOption(sortParam),
    },
    {
      getNextPageParam(page) {
        return page.cursor;
      },
    },
  );

  return (
    <div>
      <div className="flex justify-between py-4">
        <span className="font-semibold">
          Reviews {reviewCount !== undefined ? `(${reviewCount})` : ""}
        </span>
        <SortDialog optionList={sortByOptions} />
      </div>
      <div className="flex flex-col gap-5">
        {reviewsQuery.isSuccess ? (
          <InfiniteScroll
            pages={reviewsQuery.data.pages}
            getPageValues={({ page }) => page}
            getKey={(review) => review.authorId}
            getNextPage={fetchNextPage(reviewsQuery)}
          >
            {(review) => <ReviewCard review={review} />}
          </InfiniteScroll>
        ) : (
          "Loading..."
        )}
      </div>
    </div>
  );
}

type Review = RouterOutputs["product"]["getProductReviews"]["page"][number];
type ReviewCardProps = {
  review: Review;
};
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
          <UserPic
            className="text-xs"
            user={{ name: authorName, image: authorAvatar }}
          />
        </div>
        <span>{authorName}</span>
        <span className="ml-auto">{dateFormatter.format(new Date(updatedAt))}</span>
      </div>
      <Rating value={rating} />
      <ProsConsComment
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

type ProsConsCommentProps = Pick<Review, "pros" | "cons" | "comment">;
function ProsConsComment({ comment, cons, pros }: ProsConsCommentProps) {
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
