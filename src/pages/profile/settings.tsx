import { ImageInput, Switch, UserPic } from "@/components/UI";
import { useUploadThing } from "@/hooks";
import useHeader from "@/hooks/useHeader";
import { browser } from "@/utils";
import { api } from "@/utils/api";
import type { Session } from "next-auth";
import type { OAuthProviderType } from "next-auth/providers";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import type Icon from "~icons/";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import DiscordIcon from "~icons/logos/discord-icon";
import GoogleIcon from "~icons/logos/google-icon";
import LinkedinIcon from "~icons/logos/linkedin-icon";
import GithubIcon from "~icons/mdi/github";

export default function Page() {
  useHeader(() => ({ title: "Settings" }), []);

  const { data } = useSession();
  // Can't rely on status since during session refetches it reports loading
  if (!data) return "Loading";

  return (
    <div className="flex w-full flex-col items-stretch gap-3 p-4">
      <UserImage user={data.user} />
      <UserName username={data.user.name} />
      <LinkedAccounts />
      <AppSettings />
      <button
        className="mt-2 rounded-lg bg-neutral-100 bg-pink-800/10 px-2 py-3.5 text-pink-800"
        onClick={() => {
          void signOut({ redirect: false });
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

type UserImageProps = { user: Session["user"] };
function UserImage({ user }: UserImageProps) {
  const { update } = useSession();
  const { startUpload } = useUploadThing("userImageUploader");
  const { mutate: remove } = api.user.deleteImage.useMutation({ onSettled: update });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-16 w-16">
        <UserPic user={user} />
        {!!user.image && (
          <button
            className="absolute right-0 top-0 flex aspect-square h-6 w-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 text-rose-700"
            onClick={() => {
              remove();
            }}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <ImageInput
        isImageSet={true}
        className="rounded-lg border border-neutral-400/10 bg-neutral-100 px-4"
        onChange={(e) => {
          const file = e.target.files?.item(0);
          if (!file) return;
          startUpload([file])
            .catch(console.error)
            .finally(() => {
              update().catch(console.error);
            });
        }}
      >
        {!!user.image ? "Change avatar" : "Upload avatar"}
      </ImageInput>
    </div>
  );
}

type UserNameProps = { username: string };
function UserName({ username }: UserNameProps) {
  const { update } = useSession();
  const [value, setValue] = useState(username);
  const setMutation = api.user.setName.useMutation({ onSettled: update });
  function saveName(value: string) {
    if (value === username || setMutation.isLoading) return;
    setMutation.mutate(value);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveName(value);
      }}
    >
      <label className="flex flex-col">
        <p className="p-2 text-sm">Name</p>
        <input
          className="rounded-lg p-3 outline outline-1 outline-app-green focus-within:outline-2"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={() => {
            saveName(value);
          }}
        />
      </label>
    </form>
  );
}

const providerRecord: Partial<Record<OAuthProviderType, typeof Icon>> = {
  discord: DiscordIcon,
  github: GithubIcon,
  google: GoogleIcon,
  linkedin: LinkedinIcon,
};
const providers = Object.entries(providerRecord);
function LinkedAccounts() {
  const trpcUtils = api.useContext();
  const { data: accounts } = api.user.getAccountProviders.useQuery();
  const { mutate: deleteAccount } = api.user.deleteAccount.useMutation({
    onMutate({ provider }) {
      // optimistic update
      const prevProviders = trpcUtils.user.getAccountProviders.getData();

      trpcUtils.user.getAccountProviders.setData(undefined, (providers) =>
        providers?.filter((name) => name !== provider)
      );

      return prevProviders;
    },
    onSettled(data, error, _, prevProviders) {
      if ((!!data && !data.ok) || !!error) {
        trpcUtils.user.getAccountProviders.setData(undefined, prevProviders);
      }
      void trpcUtils.user.getAccountProviders.invalidate();
    },
  });

  return (
    <div>
      <p className="p-2 text-sm">Linked accounts</p>
      <div className="flex flex-col overflow-hidden rounded-lg bg-neutral-100">
        {providers.map(([provider, Icon]) => (
          <div
            key={provider}
            className="flex items-center gap-2 px-4 py-2 capitalize not-[:first-child]:border-t-2 not-[:first-child]:border-t-neutral-400/10"
          >
            <Icon className="h-full w-7" />
            <span className="mr-auto">{provider}</span>
            <Switch
              checked={accounts?.includes(provider)}
              onCheckedChange={(value) => {
                if (value) {
                  // optimistic update
                  trpcUtils.user.getAccountProviders.setData(undefined, (providers) => {
                    return [...(providers ?? []), provider];
                  });
                  void signIn(provider);
                } else {
                  deleteAccount({ provider });
                }
              }}
            />
          </div>
        ))}
      </div>
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
function AppSettings() {
  const [reviewPrivateDefault, setReviewPrivateDefault] = useReviewPrivateDefault();

  return (
    <div>
      <p className="p-2 text-sm">App settings</p>
      <label className="flex items-center justify-between rounded-lg bg-app-green/20 px-4 py-2">
        Reviews are private by default
        <Switch
          checked={reviewPrivateDefault}
          onCheckedChange={setReviewPrivateDefault}
        />
      </label>
    </div>
  );
}
