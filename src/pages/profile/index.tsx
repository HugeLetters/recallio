import { HeaderLink, Layout } from "@/components/Layout";
import { Card, InfiniteScroll, NoResults } from "@/components/List";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Clickable, Star, UserPic } from "@/components/UI";
import { getQueryParam, minutesToMs } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import GroceriesIcon from "~icons/custom/groceries";
import SettingsIcon from "~icons/solar/settings-linear";

export default function Page() {
  const { data, status } = useSession();

  return (
    <Layout
      header={{
        header: (
          <HeaderSearchBar
            right={
              <HeaderLink
                Icon={SettingsIcon}
                href="/profile/settings"
              />
            }
            title="Profile"
          />
        ),
      }}
    >
      {status === "authenticated" ? (
        <div className="flex w-full flex-col gap-6 p-4">
          <ProfileInfo user={data.user} />
          <Reviews />
        </div>
      ) : (
        "Loading"
      )}
    </Layout>
  );
}

type ProfileInfoProps = {
  user: Session["user"];
};
function ProfileInfo({ user }: ProfileInfoProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-16 w-16">
        <UserPic user={user} />
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
      {!countQuery.isSuccess || !!countQuery.data ? <ReviewCards /> : <NoReviews />}
    </div>
  );
}

type SortOption = (typeof sortOptionList)[number];
type SortQuery = RouterInputs["review"]["getUserReviewSummaryList"]["sort"];
function parseSortParam(param: SortOption): SortQuery {
  switch (param) {
    case "recent":
      return { by: "updatedAt", desc: true };
    case "earliest":
      return { by: "updatedAt", desc: false };
    case "best rated":
      return { by: "rating", desc: true };
    case "worst rated":
      return { by: "rating", desc: false };
    default:
      const x: never = param;
      return x;
  }
}
// just a magic number which seems to work well
const limit = 20;
function ReviewCards() {
  const router = useRouter();
  const filter = getQueryParam(router.query[SEARCH_QUERY_KEY]);
  const sortParam = useParseSort(sortOptionList);
  const sort = parseSortParam(sortParam);

  const reviewCardsQuery = api.review.getUserReviewSummaryList.useInfiniteQuery(
    { limit, filter, sort },
    {
      getNextPageParam: (lastPage) => lastPage.cursor,
      initialCursor: 0,
      staleTime: minutesToMs(5),
    }
  );

  return (
    <div className="flex grow flex-col gap-2">
      {reviewCardsQuery.isSuccess ? (
        !!reviewCardsQuery.data.pages[0]?.page.length ? (
          <InfiniteScroll
            pages={reviewCardsQuery.data.pages}
            getPageValues={(page) => page.page}
            getKey={(value) => value.barcode}
            getNextPage={() => {
              !reviewCardsQuery.isFetching && reviewCardsQuery.fetchNextPage().catch(console.error);
            }}
          >
            {(value) => <ReviewCard review={value} />}
          </InfiniteScroll>
        ) : (
          <NoResults />
        )
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
      <Clickable
        variant="primary"
        asLink
        href="/scan"
      >
        Scan for the first time
      </Clickable>
    </div>
  );
}
