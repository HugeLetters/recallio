import { Switch, UserPic } from "@/components/UI";
import useHeader from "@/hooks/useHeader";
import { browser } from "@/utils";
import { api } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import SaveIcon from "~icons/ic/round-save";

export default function Page() {
  useHeader(() => ({ title: "Settings" }), []);
  const { data, update } = useSession();

  // Can't rely on status since during session refetches it reports loading
  if (!data) return "Loading";

  return (
    <Settings
      user={data.user}
      refetchUser={() => void update()}
    />
  );
}

type SettingsProps = { user: Session["user"]; refetchUser: () => void };
function Settings({ user, refetchUser }: SettingsProps) {
  const providersQuery = useQuery({
    queryKey: ["auth providers"],
    queryFn() {
      return getProviders();
    },
  });

  const accountsQuery = api.user.getAccountProviders.useQuery();
  const accountsMutation = useDeleteAccountMutation();

  const [reviewPrivateDefault, setReviewPrivateDefault] = useReviewPrivateDefault();

  const [userName, setUserName] = useState(user.name);
  const userNameMutation = api.user.setName.useMutation({
    onSettled() {
      refetchUser();
    },
  });

  return (
    <div className="flex w-full flex-col items-center gap-3 p-4">
      <div className="relative h-16 w-16">
        <UserPic user={user} />
        {!!user.image && (
          <button className="absolute right-0 top-0 flex aspect-square h-6 w-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 text-rose-700">
            <DeleteIcon />
          </button>
        )}
      </div>
      {/* todo - avatar change */}
      <button className="rounded-lg border border-neutral-400/10 bg-neutral-100 px-4">
        {!!user.image ? "Change avatar" : "Upload avatar"}
      </button>
      <form
        className="w-full"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col">
          <span className="p-2 text-xs">Name:</span>
          <div
            className={`flex gap-2 rounded-lg p-1 text-sm outline outline-1 transition-[outline-color] focus-within:outline-2 ${
              userName === user.name ? "outline-app-green" : "outline-app-gold"
            }`}
          >
            <input
              className="m-2 grow outline-none"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
              }}
            />
            <button
              aria-label="save new username"
              className={`aspect-square h-9 shrink-0 rounded-lg bg-app-green p-1.5 text-white transition-transform motion-safe:active:scale-95`}
              onClick={() => {
                if (userName === user.name) return;
                userNameMutation.mutate(userName);
              }}
            >
              <SaveIcon className="h-full w-full" />
            </button>
          </div>
        </label>
      </form>

      <div className="w-full">
        <div>Linked accounts</div>
        <div className="flex w-full flex-col overflow-hidden rounded-lg bg-neutral-100">
          {Object.keys(providersQuery.data ?? {})
            .filter((name) => name !== "email")
            .map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between p-2 capitalize not-[:first-child]:border-t-2 not-[:first-child]:border-t-neutral-400/10"
              >
                {/* todo - icons */}
                {provider}
                <Switch
                  checked={accountsQuery.data?.includes(provider)}
                  onCheckedChange={(value) => {
                    if (value) {
                      void signIn(provider);
                    } else {
                      accountsMutation.mutate({ provider });
                    }
                  }}
                />
              </div>
            ))}
        </div>
      </div>
      <div className="w-full">
        <div>App settings</div>
        <label className="flex items-center justify-between rounded-lg bg-app-green/10 p-2">
          Mark reviews as private by default
          <Switch
            checked={reviewPrivateDefault}
            onCheckedChange={setReviewPrivateDefault}
          />
        </label>
      </div>
      <button
        className="w-full rounded-lg bg-neutral-100 px-2 py-3.5 text-left text-pink-800"
        onClick={() => {
          void signOut({ redirect: false });
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

const reviewPrivateDefaultKey = "review-private-default";
function useReviewPrivateDefault() {
  const [value, setStateValue] = useState(() =>
    browser ? localStorage.getItem(reviewPrivateDefaultKey) !== "false" : true
  );

  function setValue(value: boolean) {
    setStateValue(value);
    localStorage.setItem(reviewPrivateDefaultKey, `${value}`);
  }

  return [value, useCallback(setValue, [])] as const;
}

function useDeleteAccountMutation() {
  const utils = api.useContext();

  return api.user.deleteAccount.useMutation({
    onMutate({ provider }) {
      const prevProviders = utils.user.getAccountProviders.getData();

      utils.user.getAccountProviders.setData(undefined, (providers) =>
        providers?.filter((name) => name !== provider)
      );

      return prevProviders;
    },
    onSettled(data, error, _, prevProviders) {
      if ((!!data && !data.ok) || !!error) {
        utils.user.getAccountProviders.setData(undefined, prevProviders);
      }
      void utils.user.getAccountProviders.invalidate();
    },
  });
}
