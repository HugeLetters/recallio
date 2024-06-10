import { useCachedSession } from "@/auth/session/hooks";
import { placeholderSession } from "@/auth/session/placeholder";
import { ButtonLike } from "@/interface/button";
import { InfiniteScroll } from "@/interface/list/infinite-scroll";
import { Card, NoResults } from "@/interface/list/product";
import { InfiniteQueryView, Skeleton } from "@/interface/loading";
import { Spinner } from "@/interface/loading/spinner";
import { HeaderSearchBar, useSearchQuery } from "@/interface/search/search";
import { SortDialog, useSortQuery } from "@/interface/search/sort";
import { Star } from "@/interface/star";
import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import { HeaderLink } from "@/layout/header";
import { layoutLongScrollTracker } from "@/layout/long-scroll-tracker";
import { useTracker } from "@/state/store/tracker/hooks";
import type { RouterInputs, RouterOutputs } from "@/trpc";
import { trpc } from "@/trpc";
import { fetchNextPage } from "@/trpc/infinite-query";
import { UserPicture } from "@/user/picture";
import { minutesToMs } from "@/utils";
import { Toolbar } from "@radix-ui/react-toolbar";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import GroceriesIcon from "~icons/custom/groceries";
import SettingsIcon from "~icons/solar/settings-linear";

const Page: NextPageWithLayout = function () {
  return (
    <div className="flex grow flex-col gap-6">
      <ProfileInfo />
      <Reviews />
    </div>
  );
};

Page.getLayout = (children) => {
  const right = (
    <HeaderLink
      Icon={SettingsIcon}
      aria-label="settings"
      href="/profile/settings"
      className="transition-transform delay-300 active:rotate-45 active:delay-0"
    />
  );
  const header = (
    <HeaderSearchBar
      right={right}
      title="Profile"
    />
  );
  return (
    <Layout header={{ header }}>
      <Head>
        <title>profile</title>
      </Head>
      {children}
    </Layout>
  );
};

export default Page;

function ProfileInfo() {
  const { data } = useCachedSession();

  const session = data ?? placeholderSession;
  return (
    <Skeleton isLoading={!data}>
      <div className="flex h-16 w-full items-center gap-3">
        <div className="h-full">
          <UserPicture
            user={session.user}
            priority
          />
        </div>
        <span className="overflow-hidden text-ellipsis text-2xl font-bold">
          {session.user.name}
        </span>
      </div>
    </Skeleton>
  );
}

const sortOptionList = ["recent", "earliest", "best rated", "worst rated"] as const;
function Reviews() {
  const countQuery = trpc.user.review.getCount.useQuery(undefined, {
    staleTime: minutesToMs(5),
  });

  return (
    <div className="flex grow flex-col gap-3">
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
type SortQuery = RouterInputs["user"]["review"]["getSummaryList"]["sort"];
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
      return param satisfies never;
  }
}

function ReviewCards() {
  const router = useRouter();
  const sortParam = useSortQuery(sortOptionList);
  const filter = useSearchQuery();
  useTracker(layoutLongScrollTracker, true);

  const reviewCardsQuery = trpc.user.review.getSummaryList.useInfiniteQuery(
    {
      limit: 20,
      filter,
      sort: parseSortParam(sortParam),
    },
    {
      getNextPageParam: (lastPage) => lastPage.cursor,
      staleTime: minutesToMs(5),
      enabled: router.isReady,
    },
  );

  return (
    <>
      <Head>{filter && <title>profile - {filter}</title>}</Head>
      <InfiniteQueryView
        query={reviewCardsQuery}
        className="size-full"
      >
        {reviewCardsQuery.data && (
          <Toolbar
            loop={false}
            orientation="vertical"
            className="flex grow flex-col gap-2"
          >
            <InfiniteScroll
              pages={reviewCardsQuery.data.pages}
              getPageValues={(page) => page.page}
              getKey={(value) => value.barcode}
              getNextPage={fetchNextPage(reviewCardsQuery)}
              fallback={<NoResults />}
            >
              {(value) => <ReviewCard review={value} />}
            </InfiniteScroll>
            {reviewCardsQuery.isFetching && <Spinner className="h-8" />}
          </Toolbar>
        )}
      </InfiniteQueryView>
    </>
  );
}

const ratings = [1, 2, 3, 4, 5] as const;
type ReviewSummary = RouterOutputs["user"]["review"]["getSummaryList"]["page"][number];
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
      <ButtonLike>
        <Link
          href="/scan"
          className="primary"
        >
          Scan for the first time
        </Link>
      </ButtonLike>
    </div>
  );
}
