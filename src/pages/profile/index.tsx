import { CommondHeader } from "@/components/Header";
import useHeader from "@/hooks/useHeader";
import { api, type RouterInputs } from "@/utils/api";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Flipped, Flipper } from "react-flip-toolkit";
import LucidePen from "~icons/custom/pen.jsx";
import SearchIcon from "~icons/iconamoon/search.jsx";
import SwapIcon from "~icons/iconamoon/swap.jsx";

export default function Profile() {
  const { data, status } = useSession();
  useHeader(() => <CommondHeader title="Profile" />, []);

  if (status !== "authenticated") return "Loading";

  return (
    <div className="relative flex w-full flex-col gap-2 p-4">
      <ProfileInfo user={data.user} />
      <Reviews />
    </div>
  );
}

type ProfileInfoProps = {
  user: NonNullable<ReturnType<typeof useSession>["data"]>["user"];
};
function ProfileInfo({ user }: ProfileInfoProps) {
  function getInitials() {
    const [first, second] = user.name.split("_");
    return (
      first && second ? `${first.at(0)}${second.at(0)}` : user.name.slice(0, 2)
    ).toUpperCase();
  }

  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-16 w-16">
        {user.image ? (
          <Image
            src={user.image}
            alt="your profile pic"
            width={64}
            height={64}
            className="h-full w-full rounded-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-app-green text-white">
            {getInitials()}
          </div>
        )}
      </div>
      <span className="text-2xl font-bold">{user.name}</span>
      <Link
        href="/profile/edit"
        className="ml-auto h-8"
      >
        <LucidePen className="h-full w-full p-1" />
      </Link>
    </div>
  );
}

type SortOptions = RouterInputs["review"]["getUserReviewSummaries"]["sort"];
const sortByOptions = ["recent", "earliest", "rating"] as const;
type SortBy = (typeof sortByOptions)[number];
const ratings = [1, 2, 3, 4, 5];
function Reviews() {
  const countQuery = api.review.getReviewCount.useQuery();

  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const sort: SortOptions =
    sortBy === "recent"
      ? { by: "updatedAt", desc: true }
      : sortBy === "earliest"
      ? { by: "updatedAt", desc: false }
      : { by: "rating", desc: true };

  const [filterBy, setFilterBy] = useState("");
  const debounceTimeoutRef = useRef<number>();

  const summaryQuery = api.review.getUserReviewSummaries.useInfiniteQuery(
    { limit: 20, sort, filter: filterBy },
    {
      keepPreviousData: true,
      getNextPageParam: (lastPage) => lastPage.cursor,
      initialCursor: 0,
    }
  );

  const lastElement = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!lastElement.current) return;

    const observer = new IntersectionObserver((events) => {
      events.forEach((event) => {
        if (!(event.target === lastElement.current && event.isIntersecting)) return;

        summaryQuery.fetchNextPage().catch(console.error);
      });
    });
    observer.observe(lastElement.current);

    return () => {
      observer.disconnect();
    };
  }, [summaryQuery]);

  const [isSearch, setIsSearch] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl">Reviews {countQuery.isSuccess ? `(${countQuery.data})` : ""}</h1>
      <div className="flex items-center justify-between">
        <Flipper
          flipKey={isSearch}
          spring={{ damping: 50, stiffness: 400, overshootClamping: true }}
        >
          <div>
            {isSearch ? (
              <label className="flex rounded-xl p-3 outline outline-app-green">
                <input
                  autoFocus
                  className="outline-transparent"
                  onBlur={() => setIsSearch(false)}
                  defaultValue={filterBy}
                  onChange={(e) => {
                    window.clearTimeout(debounceTimeoutRef.current);
                    debounceTimeoutRef.current = window.setTimeout(() => {
                      setFilterBy(e.target.value);
                    }, 1000);
                  }}
                />
                <Flipped flipId="search icon">
                  <SearchIcon className="h-7 w-7 text-app-green" />
                </Flipped>
              </label>
            ) : (
              <button
                aria-label="Start text search"
                className="py-3"
                onClick={() => setIsSearch(true)}
              >
                <Flipped flipId="search icon">
                  <SearchIcon className="h-7 w-7 text-app-green" />
                </Flipped>
              </button>
            )}
          </div>
        </Flipper>
        <Dialog.Root>
          <Dialog.Trigger className="flex items-center gap-2 text-sm">
            <SwapIcon className="h-8 w-8" />
            <span className="capitalize">{sortBy}</span>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="animate-in fade-in fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed bottom-0 left-0 flex w-full justify-center text-black/50 drop-shadow-top duration-150 motion-safe:animate-slide-up">
              <div className="w-full max-w-md rounded-t-xl bg-white p-5 text-lime-950">
                <Dialog.Title className="mb-6 text-xl font-medium">Sort by</Dialog.Title>
                <Flipper
                  flipKey={sortBy}
                  spring={{ stiffness: 700, overshootClamping: true }}
                >
                  <RadioGroup.Root
                    value={sortBy}
                    onValueChange={(value: SortBy) => {
                      setSortBy(value);
                    }}
                    className="flex flex-col gap-7"
                  >
                    {sortByOptions.map((option) => (
                      <RadioGroup.Item
                        value={option}
                        key={option}
                        className="group flex items-center gap-2"
                      >
                        <div className="flex aspect-square w-6 items-center justify-center rounded-full border-2 border-neutral-400 bg-white group-data-[state=checked]:border-app-green">
                          <Flipped
                            flipId={`sortyby - ${option === sortBy}`}
                            key={`sortby - ${option === sortBy}`}
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
      </div>

      <div className={`flex flex-col gap-2 ${summaryQuery.isPreviousData ? "opacity-50" : ""}`}>
        {summaryQuery.data?.pages.map((data) =>
          data.page.map((summary) => (
            <Link
              key={summary.barcode}
              href={{ pathname: "/review/[id]", query: { id: summary.barcode } }}
              className="flex items-center gap-3 rounded-xl bg-neutral-100 p-4"
            >
              {summary.image && (
                <Image
                  src={summary.image}
                  alt={`review image for product ${summary.barcode}`}
                  width={50}
                  height={50}
                  className="aspect-square h-9 w-9 rounded-full bg-white object-cover"
                />
              )}
              <div
                className="flex flex-col gap-1"
                ref={
                  data === summaryQuery.data.pages.at(-1) &&
                  summary === (data.page.at(-10) ?? data.page[0])
                    ? lastElement
                    : undefined
                }
              >
                <span className="text-sm">{summary.name}</span>
                <span className="text-xs text-neutral-400">
                  {summary.categories.slice(0, 3).join(", ")}
                </span>
              </div>
              <div className="ml-auto text-lg">
                {ratings.map((x) => (
                  <span
                    key={x}
                    className={`${x <= summary.rating ? "text-app-gold" : ""}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
