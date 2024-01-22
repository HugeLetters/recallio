import { HeaderLink, Layout } from "@/components/Layout";
import { Card, InfiniteScroll, NoResults } from "@/components/List";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Star, UserPic } from "@/components/UI";
import { fetchNextPage, minutesToMs } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import { getQueryParam } from "@/utils/query";
import type { NextPageWithLayout } from "@/utils/type";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode } from "react";
import GroceriesIcon from "~icons/custom/groceries";
import SettingsIcon from "~icons/solar/settings-linear";

const Page: NextPageWithLayout = function () {
  const { data, status } = useSession();

  return status === "authenticated" ? (
    <div className="flex w-full flex-col gap-6 p-4">
      <ProfileInfo user={data.user} />
      <Reviews />
    </div>
  ) : (
    "Loading"
  );
};

Page.getLayout = (page: ReactNode) => {
  const right = (
    <HeaderLink
      Icon={SettingsIcon}
      href="/profile/settings"
    />
  );
  const header = (
    <HeaderSearchBar
      right={right}
      title="Profile"
    />
  );
  return <Layout header={{ header }}>{page}</Layout>;
};

export default Page;

type ProfileInfoProps = {
  user: Session["user"];
};
function ProfileInfo({ user }: ProfileInfoProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-16 w-16">
        <UserPic
          className="text-2xl"
          user={user}
        />
      </div>
      <span className="text-2xl font-bold">{user.name}</span>
    </div>
  );
}

const sortOptionList = ["recent", "earliest", "best rated", "worst rated"] as const;
function Reviews() {
  const countQuery = api.review.getReviewCount.useQuery(undefined, {
    staleTime: minutesToMs(5),
  });

  return (
    <div className="flex grow flex-col gap-3 pb-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <h1 className="text-lg font-semibold">
          My reviews
          {countQuery.isSuccess && <span> ({countQuery.data})</span>}
        </h1>
        <SortDialog optionList={sortOptionList} />
      </div>
      {/* That way we fetch ReviewCards w/o waiting for countQuery to settle */}
      {countQuery.isSuccess && !countQuery.data ? <NoReviews /> : <ReviewCards />}
    </div>
  );
}

type SortOption = (typeof sortOptionList)[number];
type SortQuery = RouterInputs["review"]["getUserReviewSummaryList"]["sort"];
function parseSortParam(param: SortOption): SortQuery {
  switch (param) {
    case "recent":
      return { by: "date", desc: true };
    case "earliest":
      return { by: "date", desc: false };
    case "best rated":
      return { by: "rating", desc: true };
    case "worst rated":
      return { by: "rating", desc: false };
    default:
      const x: never = param;
      return x;
  }
}

function ReviewCards() {
  const router = useRouter();
  const sortParam = useParseSort(sortOptionList);

  const reviewCardsQuery = api.review.getUserReviewSummaryList.useInfiniteQuery(
    {
      limit: 20,
      filter: getQueryParam(router.query[SEARCH_QUERY_KEY]),
      sort: parseSortParam(sortParam),
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor,
      staleTime: minutesToMs(5),
      enabled: router.isReady,
    },
  );

  return (
    <div className="flex grow flex-col gap-2">
      {reviewCardsQuery.isSuccess ? (
        <InfiniteScroll
          pages={reviewCardsQuery.data.pages}
          getPageValues={(page) => page.page}
          getKey={(value) => value.barcode}
          getNextPage={fetchNextPage(reviewCardsQuery)}
          fallback={<NoResults />}
        >
          {(value) => <ReviewCard review={value} />}
        </InfiniteScroll>
      ) : (
        "Loading..."
      )}
    </div>
  );
}

const ratings = [1, 2, 3, 4, 5] as const;
type ReviewSummary = RouterOutputs["review"]["getUserReviewSummaryList"]["page"][number];
type ReviewCardProps = { review: ReviewSummary };
function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card
      href={{ pathname: "/review/[id]", query: { id: review.barcode } }}
      aria-label={`Open your review for barcode ${review.barcode}`}
      label={review.name}
      subtext={review.categories.slice(0, 3)}
      image={review.image}
    >
      {ratings.map((index) => (
        <Star
          key={index}
          highlight={index <= review.rating}
        />
      ))}
    </Card>
  );
}

function NoReviews() {
  return (
    <div className="flex w-full grow flex-col items-center justify-center px-12">
      <GroceriesIcon className="h-auto w-full" />
      <span className="pt-4 text-xl">Your review list is empty</span>
      <span className="pb-10 text-sm">All your scanned goods will be kept here</span>
      <Link
        href="/scan"
        className="btn primary"
      >
        Scan for the first time
      </Link>
    </div>
  );
}
