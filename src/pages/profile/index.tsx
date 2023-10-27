import { HeaderLink, Layout } from "@/components/Layout";
import { HeaderSearchBar, SEARCH_QUERY_KEY, SortDialog, useParseSort } from "@/components/Search";
import { Clickable, InfiniteScroll, Star, UserPic } from "@/components/UI";
import { getQueryParam, minutesToMs } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import EggBasketIcon from "~icons/custom/egg-basket.jsx";
import GroceriesIcon from "~icons/custom/groceries.jsx";
import MilkIcon from "~icons/custom/milk.jsx";
import SettingsIcon from "~icons/solar/settings-linear";

// todo fix deisgn
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
        <div className="flex w-full flex-col gap-2 p-4">
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-semibold">
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
      keepPreviousData: true,
      getNextPageParam: (lastPage) => lastPage.cursor,
      initialCursor: 0,
      staleTime: minutesToMs(5),
    }
  );

  return (
    <div
      className={`flex grow flex-col gap-2 ${reviewCardsQuery.isPreviousData ? "opacity-50" : ""}`}
    >
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
    <Link
      href={{ pathname: "/review/[id]", query: { id: review.barcode } }}
      className="flex items-center gap-3 rounded-xl bg-neutral-100 p-4"
    >
      {review.image ? (
        <Image
          src={review.image}
          alt={`review image for product ${review.barcode}`}
          width={50}
          height={50}
          className="aspect-square h-9 w-9 rounded-full bg-white object-cover !text-black/10 drop-shadow-around"
        />
      ) : (
        <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-full bg-neutral-400 p-1">
          <MilkIcon className="h-full w-full text-white" />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-col items-start gap-1">
        <span className="text-sm capitalize">{review.name}</span>
        {!!review.categories.length && (
          <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs capitalize text-neutral-400">
            {review.categories.slice(0, 3).join(", ")}
          </span>
        )}
      </div>
      <div className="ml-auto flex text-lg">
        {ratings.map((index) => (
          <Star
            key={index}
            highlight={index <= review.rating}
          />
        ))}
      </div>
    </Link>
  );
}

function NoReviews() {
  return (
    <div className="flex w-full grow flex-col items-center justify-center px-12">
      <GroceriesIcon className="h-auto w-full" />
      <span className="pt-4 text-xl">Your review list is empty</span>
      <span className="pb-4 text-sm">All your scanned goods will be kept here</span>
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

function NoResults() {
  return (
    <div className="flex w-full grow flex-col items-center justify-center px-12">
      <EggBasketIcon className="h-auto w-full" />
      <span className="pt-4 text-xl">No results found</span>
      <span className="text-sm">Try using different keywords</span>
    </div>
  );
}
