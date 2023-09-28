import { CommondHeader } from "@/components/Header";
import useHeader from "@/hooks/useHeader";
import type { StrictOmit } from "@/utils";
import { api, type RouterInputs } from "@/utils/api";
import { useImmer } from "@/utils/immer";
import * as Select from "@radix-ui/react-select";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import LucidePen from "~icons/custom/pen.jsx";
import SwapIcon from "~icons/iconamoon/swap-thin.jsx";

export default function Profile() {
  const { data, status } = useSession();
  useHeader(() => <CommondHeader title="Profile" />, []);

  if (status !== "authenticated") return "Loading";

  return (
    <div className="flex w-full flex-col gap-2 p-2">
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

type SearchOptions = StrictOmit<RouterInputs["review"]["getUserReviewSummaries"], "cursor">;
const ratings = [1, 2, 3, 4, 5];
const orderOptions = ["rating", "updatedAt", "barcode", "name"] satisfies Array<
  NonNullable<SearchOptions["sort"]>["by"]
>;
function Reviews() {
  const [options, setOptions] = useImmer<SearchOptions>({
    limit: 20,
    sort: {
      by: "updatedAt",
      desc: true,
    },
  });

  const summaryQuery = api.review.getUserReviewSummaries.useInfiniteQuery(options, {
    keepPreviousData: true,
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialCursor: 0,
  });
  const countQuery = api.review.getReviewCount.useQuery();

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

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl">Reviews {countQuery.isSuccess ? `(${countQuery.data})` : ""}</h1>
      <div className="flex gap-1">
        <Select.Root
          value={options.sort?.by}
          onValueChange={(value: (typeof orderOptions)[number]) => {
            setOptions((d) => {
              d.sort.by = value;
            });
          }}
        >
          <Select.Trigger
            aria-label="sort by"
            className="flex"
          >
            <Select.Value placeholder="order by" />
            <Select.Icon>
              <SwapIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              side="right"
              className="rounded-xl bg-white p-2"
            >
              <Select.Viewport>
                {orderOptions.map((name) => (
                  <Select.Item
                    key={name}
                    value={name}
                    className="cursor-pointer rounded-md outline-none current:bg-neutral-200"
                  >
                    <Select.ItemText>{name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <label>
          Descending order:
          <input
            type="checkbox"
            checked={options.sort?.desc}
            onChange={(e) => {
              setOptions((d) => {
                d.sort.desc = e.target.checked;
              });
            }}
          />
        </label>
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
                className="flex  flex-col gap-1"
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
