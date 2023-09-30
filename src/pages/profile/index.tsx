import { HeaderLink } from "@/components/Header";
import { Star } from "@/components/Star";
import useHeader from "@/hooks/useHeader";
import { minutesToMs, type StrictOmit } from "@/utils";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/api";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Flipped, Flipper } from "react-flip-toolkit";
import MilkIcon from "~icons/custom/milk.jsx";
import SearchIcon from "~icons/iconamoon/search.jsx";
import SwapIcon from "~icons/iconamoon/swap.jsx";
import SettingsIcon from "~icons/solar/settings-linear";

export default function Profile() {
  const { data, status } = useSession();
  useHeader(
    () => ({
      title: "Profile",
      right: (
        <HeaderLink
          Icon={SettingsIcon}
          href={"/profile/settings"}
        />
      ),
    }),
    []
  );

  if (status !== "authenticated") return "Loading";

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <ProfileInfo user={data.user} />
      <Reviews />
    </div>
  );
}

function getInitials(name: string) {
  const [first, second] = name.split(/[\s_+.-]/);
  return (first && second ? `${first.at(0)}${second.at(0)}` : name.slice(0, 2)).toUpperCase();
}

type ProfileInfoProps = {
  user: NonNullable<ReturnType<typeof useSession>["data"]>["user"];
};
function ProfileInfo({ user }: ProfileInfoProps) {
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
            {getInitials(user.name)}
          </div>
        )}
      </div>
      <span className="text-2xl font-bold">{user.name}</span>
    </div>
  );
}

type SortOptions = RouterInputs["review"]["getUserReviewSummaryList"]["sort"];
const sortByOptions = ["recent", "earliest", "rating"] as const;
type SortBy = (typeof sortByOptions)[number];
function Reviews() {
  const countQuery = api.review.getReviewCount.useQuery(undefined, {
    staleTime: minutesToMs(5),
  });

  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const sort: SortOptions =
    sortBy === "recent"
      ? { by: "updatedAt", desc: true }
      : sortBy === "earliest"
      ? { by: "updatedAt", desc: false }
      : { by: "rating", desc: true };

  const [filterBy, setFilterBy] = useState("");

  return (
    <div className="flex flex-col gap-3 pb-3">
      <h1 className="text-xl">Reviews {countQuery.isSuccess ? `(${countQuery.data})` : ""}</h1>
      <div className="flex items-center justify-between">
        <FilterInput
          value={filterBy}
          setValue={setFilterBy}
        />
        <SortDialog
          title="Sort By"
          options={sortByOptions}
          setValue={setSortBy}
          value={sortBy}
        />
      </div>
      <ReviewCards query={{ limit: 20, sort, filter: filterBy }} />
    </div>
  );
}

type FilterInputProps = { value: string; setValue: (value: string) => void };
function FilterInput({ value, setValue }: FilterInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimeoutRef = useRef<number>();

  return (
    <Flipper
      flipKey={isOpen}
      spring={{ damping: 50, stiffness: 400, overshootClamping: true }}
    >
      <div>
        {isOpen ? (
          <label className="flex rounded-xl p-3 outline outline-app-green">
            <input
              autoFocus
              className="outline-transparent"
              onBlur={() => setIsOpen(false)}
              defaultValue={value}
              onChange={(e) => {
                window.clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = window.setTimeout(() => {
                  setValue(e.target.value);
                }, 1000);
              }}
            />
            <Flipped flipId="search icon">
              <SearchIcon className="h-7 w-7 text-app-green" />
            </Flipped>
          </label>
        ) : (
          <button
            aria-label="Start review search"
            className="py-3"
            onClick={() => setIsOpen(true)}
          >
            <Flipped flipId="search icon">
              <SearchIcon className="h-7 w-7 text-app-green" />
            </Flipped>
          </button>
        )}
      </div>
    </Flipper>
  );
}

type SortDialogProps<T> = {
  title: string;
  value: T;
  setValue: (value: T) => void;
  options: readonly T[];
};
function SortDialog<T extends string>({ title, value, setValue, options }: SortDialogProps<T>) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex items-center gap-2 text-sm">
        <SwapIcon className="h-8 w-8" />
        <span className="capitalize">{value}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 animate-fade-in bg-black/50" />
        <Dialog.Content className="fixed bottom-0 left-0 flex w-full justify-center text-black/50 drop-shadow-top duration-150 motion-safe:animate-slide-up">
          <div className="w-full max-w-md rounded-t-xl bg-white p-5 text-lime-950">
            <Dialog.Title className="mb-6 text-xl font-medium">{title}</Dialog.Title>
            <Flipper
              flipKey={value}
              spring={{ stiffness: 700, overshootClamping: true }}
            >
              <RadioGroup.Root
                value={value}
                onValueChange={(value: T) => {
                  setValue(value);
                }}
                className="flex flex-col gap-7"
              >
                {options.map((option) => (
                  <RadioGroup.Item
                    value={option}
                    key={option}
                    className="group flex items-center gap-2"
                  >
                    <div className="flex aspect-square w-6 items-center justify-center rounded-full border-2 border-neutral-400 bg-white group-data-[state=checked]:border-app-green">
                      <Flipped
                        flipId={`${option === value}`}
                        key={`${option === value}`}
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

type ReviewCardsProps = {
  query: StrictOmit<RouterInputs["review"]["getUserReviewSummaryList"], "cursor">;
};
function ReviewCards({ query }: ReviewCardsProps) {
  const reviewCardsQuery = api.review.getUserReviewSummaryList.useInfiniteQuery(query, {
    keepPreviousData: true,
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialCursor: 0,
    staleTime: minutesToMs(5),
  });
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
    <div className={`flex flex-col gap-2 ${reviewCardsQuery.isPreviousData ? "opacity-50" : ""}`}>
      {reviewCardsQuery.isSuccess ? (
        reviewCardsQuery.data.pages.some((data) => !!data.page.length) ? (
          reviewCardsQuery.data.pages.map((data) => {
            const isLastPage = data === lastPage;
            const triggerSummary = data.page.at(-10) ?? data.page[0];

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
          <NoReviews />
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
      key={review.barcode}
      href={{ pathname: "/review/[id]", query: { id: review.barcode } }}
      className="flex items-center gap-3 rounded-xl bg-neutral-100 p-4"
    >
      {review.image ? (
        <Image
          src={review.image}
          alt={`review image for product ${review.barcode}`}
          width={50}
          height={50}
          className="aspect-square h-9 w-9 rounded-full bg-white object-cover"
        />
      ) : (
        <div className="flex aspect-square h-9 w-9 items-center justify-center rounded-full bg-neutral-400 p-1">
          <MilkIcon className="h-full w-full text-white" />
        </div>
      )}
      <div
        className="flex h-full flex-col items-start gap-1"
        ref={cardRef}
      >
        <span className="text-sm">{review.name}</span>
        {!!review.categories.length && (
          <span className="text-xs text-neutral-400">
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
  return <div className="h-full w-full bg-red-500">you have no reviews loser</div>;
}
