import { Layout } from "@/components/Layout";
import { useLoadingIndicator } from "@/components/Loading";
import { toast, toastthree } from "@/components/Toast";
import {
  Button,
  DialogOverlay,
  ImageInput,
  Input,
  LabeledSwitch,
  UserPic,
  WithLabel,
  useUrlDialog,
} from "@/components/UI";
import { useOptimistic, useReviewPrivateDefault, useUploadThing } from "@/hooks";
import { api } from "@/utils/api";
import { compressImage } from "@/utils/image";
import { providerIcons } from "@/utils/providers";
import type { NextPageWithLayout } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import type { Session } from "next-auth";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";

const Page: NextPageWithLayout = function () {
  const { data } = useSession();
  // Can't rely on status since during session refetches it reports loading
  return !!data ? (
    <div className="flex w-full flex-col items-stretch gap-3 p-4">
      <UserImage user={data.user} />
      <UserName username={data.user.name} />
      <LinkedAccounts />
      <AppSettings />
      <Button
        className="ghost mt-2"
        onClick={() => {
          void signOut({ redirect: false });
        }}
      >
        Sign Out
      </Button>
      <DeleteProfile username={data.user.name} />
      {/* forces a padding at the bottom */}
      <div className="pb-2" />
    </div>
  ) : (
    "Loading"
  );
};
Page.getLayout = (page) => <Layout header={{ title: "Settings" }}>{page}</Layout>;

export default Page;

type UserImageProps = { user: Session["user"] };
function UserImage({ user }: UserImageProps) {
  const { update } = useSession();
  const { optimistic, queueUpdate, onUpdateEnd } = useOptimistic<string | null>();
  const optimisticUser = optimistic.isActive ? { ...user, image: optimistic.value } : user;

  function updateUserImage(image: File | null) {
    if (!image) {
      queueUpdate(image, remove);
      return;
    }

    compressImage(image, 511 * 1024)
      .then((compressedImage) => {
        const resultImage = compressedImage ?? image;
        queueUpdate(URL.createObjectURL(resultImage), () => {
          startUpload([resultImage]).catch(console.error);
        });
      })
      .catch(console.error);
  }

  function syncUserImage() {
    setTimeout(() => {
      update()
        .catch(console.error)
        .finally(() => {
          if (optimistic.value) {
            URL.revokeObjectURL(optimistic.value);
          }
          onUpdateEnd();
        });
    }, 1000);
  }

  const { startUpload, isUploading } = useUploadThing("userImageUploader", {
    onClientUploadComplete: syncUserImage,
    onUploadError: syncUserImage,
  });

  const { mutate: remove, isLoading } = api.user.deleteImage.useMutation({
    onError: (error) => toast.error(error.message),
    onSettled: syncUserImage,
  });
  useLoadingIndicator(isUploading || isLoading, 300);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-16">
        <UserPic
          className="text-2xl"
          user={optimisticUser}
        />
        {!!optimisticUser.image && (
          <button
            className="absolute right-0 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 text-rose-700"
            onClick={() => updateUserImage(null)}
            aria-label="Delete avatar"
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <ImageInput
        isImageSet={!!optimistic.value && optimistic.isActive}
        className="btn ghost rounded-lg px-4 py-0 outline-1 focus-within:outline-app-green"
        onChange={(e) => {
          const file = e.target.files?.item(0);
          if (!file) return;
          updateUserImage(file);
        }}
      >
        {!!optimisticUser.image ? "Change avatar" : "Upload avatar"}
      </ImageInput>
    </div>
  );
}

type UserNameProps = { username: string };
const USERNAME_MIN_LENGTH = 4;
function UserName({ username }: UserNameProps) {
  const { update } = useSession();
  const [value, setValue] = useState(username);
  const { mutate, isLoading } = api.user.setName.useMutation({
    onSettled() {
      update()
        .then((session) => {
          if (!session) return;
          setValue(session.user.name);
        })
        .catch(console.error);
    },
  });
  useLoadingIndicator(isLoading, 300);

  function saveName(value: string) {
    if (value === username || value.length < USERNAME_MIN_LENGTH) return;
    mutate(value);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveName(value);
      }}
    >
      <WithLabel label="Name">
        <Input
          value={value}
          name="username"
          required
          minLength={USERNAME_MIN_LENGTH}
          maxLength={30}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onBlur={() => saveName(value)}
          className="invalid:outline-app-red-500"
        />
      </WithLabel>
    </form>
  );
}

function LinkedAccounts() {
  const trpcUtils = api.useUtils();
  const { data: accounts } = api.user.getAccountProviders.useQuery();
  const { mutate: deleteAccount, isLoading } = api.user.deleteAccount.useMutation({
    onMutate({ provider }) {
      // optimistic update
      const prevProviders = trpcUtils.user.getAccountProviders.getData();

      trpcUtils.user.getAccountProviders.setData(undefined, (providers) =>
        providers?.filter((name) => name !== provider),
      );

      return prevProviders;
    },
    onError(_, __, prevProviders) {
      trpcUtils.user.getAccountProviders.setData(undefined, prevProviders);
    },
    onSettled() {
      void trpcUtils.user.getAccountProviders.invalidate();
    },
  });
  useLoadingIndicator(isLoading, 300);

  return (
    <div>
      <p className="p-2 text-sm">Linked accounts</p>
      <div className="flex flex-col divide-y-2 divide-neutral-400/15 overflow-hidden rounded-lg bg-neutral-100">
        {providerIcons.map(([provider, Icon]) => {
          const isLinked = accounts?.includes(provider);
          return (
            <div key={provider}>
              <LabeledSwitch
                className="capitalize"
                label={
                  <div className="flex items-center gap-2">
                    <Icon className="h-full w-7" />
                    <span>{provider}</span>
                  </div>
                }
                aria-label={`${isLinked ? "unlink" : "link"} ${provider} account`}
                checked={isLinked}
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
          );
        })}
      </div>
    </div>
  );
}

function AppSettings() {
  const [reviewPrivateDefault, setReviewPrivateDefault] = useReviewPrivateDefault();

  return (
    <div>
      <p className="p-2 text-sm">App settings</p>
      <LabeledSwitch
        label="Reviews are private by default"
        className="bg-app-green/20"
        checked={reviewPrivateDefault}
        onCheckedChange={setReviewPrivateDefault}
      />
    </div>
  );
}

type DeleteProfileProps = { username: string };
function DeleteProfile({ username }: DeleteProfileProps) {
  const [, setValue] = useReviewPrivateDefault();
  const { isOpen, setIsOpen } = useUrlDialog("delete-dialog");
  const { mutate, isLoading } = api.user.deleteUser.useMutation({
    onSuccess() {
      setIsOpen(false);
      setValue(true);
      void signOut({ redirect: false });
    },
  });
  useLoadingIndicator(isLoading);

  const confirmationPromp = `delete ${username}`;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Dialog.Trigger asChild>
        <Button className="destructive w-full">Delete profile</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogOverlay className="flex items-center justify-center backdrop-blur-sm">
          <div className="w-full max-w-app p-4">
            <Dialog.Content
              className="flex flex-col gap-4 rounded-3xl bg-white p-5 data-[state=closed]:animate-fade-in-reverse motion-safe:animate-scale-in"
              asChild
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLoading) return;
                  mutate();
                }}
                className="group"
              >
                <Dialog.Title className="text-center text-2xl font-semibold">
                  Delete Profile?
                </Dialog.Title>
                <Dialog.Description className="basis-full text-balance text-center text-xl text-neutral-400">
                  Are you sure you want to delete your profile? Once deleted, this action cannot be
                  undone.
                </Dialog.Description>
                <WithLabel label={`Type in "${confirmationPromp}" to delete your profile.`}>
                  <Input
                    name="confirmation"
                    pattern={confirmationPromp}
                    required
                    autoComplete="off"
                  />
                </WithLabel>
                <Button
                  aria-disabled={isLoading}
                  type="submit"
                  className="bg-app-red-500 font-semibold text-white group-invalid:disabled group-invalid:bg-app-red-350"
                >
                  Delete profile
                </Button>
                <Dialog.Close asChild>
                  <Button
                    className="ghost font-semibold"
                    autoFocus
                  >
                    Cancel
                  </Button>
                </Dialog.Close>
              </form>
            </Dialog.Content>
          </div>
        </DialogOverlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
