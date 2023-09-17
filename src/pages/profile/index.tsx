import { CommondHeader } from "@/components/Header";
import useHeader from "@/hooks/useHeader";
import { api, type RouterInputs } from "@/utils/api";
import { useImmer } from "@/utils/immer";
import * as Select from "@radix-ui/react-select";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import SwapIcon from "~icons/iconamoon/swap-thin";
import LucidePen from "~icons/lucide/pen";

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
          <div className="flex h-full w-full items-center justify-center rounded-full bg-green-500 text-white">
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

type ReviewSummaryInput = RouterInputs["review"]["getUserReviewSummaries"];
const ratings = [1, 2, 3, 4, 5];
const orderOptions = ["rating", "updatedAt", "barcode", "name"] satisfies Array<
  NonNullable<ReviewSummaryInput["sort"]>["by"]
>;
function Reviews() {
  const [searchOptions, setSearchOptions] = useImmer<ReviewSummaryInput>({
    page: {
      index: 1,
      // todo - this should be in user settings
      size: 2,
    },
    sort: {
      by: "updatedAt",
      desc: true,
    },
  });
  const summaryQuery = api.review.getUserReviewSummaries.useQuery(searchOptions, {
    keepPreviousData: true,
  });
  const countQuery = api.review.getReviewCount.useQuery();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl">Reviews {countQuery.isSuccess ? `(${countQuery.data})` : ""}</h1>
      <div className="flex gap-1">
        <label>
          Page:
          <input
            type="number"
            min={1}
            max={Math.ceil((countQuery.data ?? 1) / searchOptions.page.size)}
            step={1}
            value={searchOptions.page.index}
            onChange={(e) => {
              setSearchOptions((d) => {
                d.page.index = +e.target.value;
              });
            }}
          />
        </label>
        <Select.Root
          value={searchOptions.sort?.by}
          onValueChange={(value: (typeof orderOptions)[number]) => {
            setSearchOptions((d) => {
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
            checked={searchOptions.sort?.desc}
            onChange={(e) => {
              setSearchOptions((d) => {
                d.sort.desc = e.target.checked;
              });
            }}
          />
        </label>
      </div>
      <div className={`flex flex-col gap-2 ${summaryQuery.isPreviousData ? "opacity-50" : ""}`}>
        {summaryQuery.data?.map((summary) => (
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
            <div className="flex  flex-col gap-1">
              <span className="text-sm">{summary.name}</span>
              <span className="text-xs text-neutral-400">
                {summary.categories.slice(0, 3).join(", ")}
              </span>
            </div>
            <div className="ml-auto text-lg">
              {ratings.map((x) => (
                <span
                  key={x}
                  className={`${x <= summary.rating ? "text-yellow-400" : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
