import { HeaderSearchBar, SEARCH_QUERY_KEY } from "@/components/HeaderSearchBar";
import { HeaderLink, Layout } from "@/components/Layout";
import { Clickable, Star, UserPic } from "@/components/UI";
import { getQueryParam, includes, minutesToMs, setQueryParam } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import { useEffect, useRef, type RefObject } from "react";
import { Flipped, Flipper } from "react-flip-toolkit";
import EggBasketIcon from "~icons/custom/egg-basket.jsx";
import GroceriesIcon from "~icons/custom/groceries.jsx";
import MilkIcon from "~icons/custom/milk.jsx";
import SwapIcon from "~icons/iconamoon/swap.jsx";
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
        <SortDialog />
      </div>
      {/* That way we fetch ReviewCards w/o waiting for countQuery to settle */}
      {!countQuery.isSuccess || !!countQuery.data ? <ReviewCards /> : <NoReviews />}
    </div>
  );
}

const sortOptionList = ["recent", "earliest", "rating"] as const;
type SortOption = (typeof sortOptionList)[number];
const sortKey = "sort";
function useParseSort(router: NextRouter) {
  const query = getQueryParam(router.query[sortKey]);

  if (query && includes(sortOptionList, query)) return query;

  if (query !== undefined) setQueryParam(router, sortKey, null);
  return sortOptionList[0];
}

function SortDialog() {
  const router = useRouter();
  const sortBy = useParseSort(router);

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex items-center gap-2 text-sm">
        <SwapIcon className="h-8 w-8" />
        <span className="capitalize">{sortBy}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 animate-fade-in bg-black/50" />
        <Dialog.Content className="fixed bottom-0 left-0 z-10 flex w-full justify-center text-black/50 drop-shadow-top duration-150 motion-safe:animate-slide-up">
          <div className="w-full max-w-app rounded-t-xl bg-white p-5 text-lime-950">
            <Dialog.Title className="mb-6 text-xl font-medium">Sort By</Dialog.Title>
            <Flipper
              flipKey={sortBy}
              spring={{ stiffness: 700, overshootClamping: true }}
            >
              <RadioGroup.Root
                value={sortBy}
                onValueChange={(value) => {
                  setQueryParam(router, sortKey, value);
                }}
                className="flex flex-col gap-7"
              >
                {sortOptionList.map((option) => (
                  <RadioGroup.Item
                    value={option}
                    key={option}
                    className="group flex items-center gap-2"
                  >
                    <div className="flex aspect-square w-6 items-center justify-center rounded-full border-2 border-neutral-400 bg-white group-data-[state=checked]:border-app-green">
                      <Flipped
                        flipId={`${option === sortBy}`}
                        key={`${option === sortBy}`}
                      >
                        <RadioGroup.Indicator className="block aspect-square w-4 rounded-full bg-app-green" />
                      </Flipped>
                    </div>
                    <span className="capitalize">{option}</span>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            </Flipper>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type SortQuery = RouterInputs["review"]["getUserReviewSummaryList"]["sort"];
function parseSortParam(param: SortOption): SortQuery {
  switch (param) {
    case "recent":
      return { by: "updatedAt", desc: true };
    case "earliest":
      return { by: "updatedAt", desc: false };
    case "rating":
      return { by: "rating", desc: true };
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
  const sortParam = useParseSort(router);
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
  const lastPage = reviewCardsQuery.data?.pages.at(-1);

  const lastElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!lastElement.current) return;

    const observer = new IntersectionObserver((events) => {
      events.forEach((event) => {
        if (!(event.target === lastElement.current && event.isIntersecting)) return;
        reviewCardsQuery.fetchNextPage().catch(console.error);
      });
    });
    observer.observe(lastElement.current);

    return () => {
      observer.disconnect();
    };
  }, [reviewCardsQuery]);

  return (
    <div
      className={`flex grow flex-col gap-2 ${reviewCardsQuery.isPreviousData ? "opacity-50" : ""}`}
    >
      {reviewCardsQuery.isSuccess ? (
        !!reviewCardsQuery.data.pages[0]?.page.length ? (
          reviewCardsQuery.data.pages.map((data) => {
            const isLastPage = data === lastPage;
            const triggerSummary = data.page.at(-limit / 2) ?? data.page[0];

            return data.page.map((summary) => {
              const isTriggerCard = isLastPage && summary === triggerSummary;

              return (
                <ReviewCard
                  key={summary.barcode}
                  review={summary}
                  cardRef={isTriggerCard ? lastElement : null}
                />
              );
            });
          })
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
type ReviewCardProps = { review: ReviewSummary; cardRef: RefObject<HTMLDivElement> | null };
function ReviewCard({ review, cardRef }: ReviewCardProps) {
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
      <div
        className="flex h-full min-w-0 flex-col items-start gap-1"
        ref={cardRef}
      >
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
