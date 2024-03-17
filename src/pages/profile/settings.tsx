import { signOut } from "@/auth";
import { providerIcons } from "@/auth/provider";
import { loadingTracker } from "@/components/loading/indicator";
import { logToastError, toast } from "@/components/toast";
import { Button, Input, WithLabel } from "@/components/ui";
import { DialogOverlay, useUrlDialog } from "@/components/ui/dialog";
import { LabeledSwitch } from "@/components/ui/switch";
import { UserPic } from "@/components/ui/user-pic";
import { compressImage } from "@/image/compress";
import { ImagePickerButton } from "@/image/image-picker";
import { Layout } from "@/layout";
import type { BooleanSettingStore } from "@/settings/boolean";
import { reviewPrivateDefaultStore, scrollUpButtonEnabledStore } from "@/settings/boolean";
import { useOptimistic } from "@/state/optimistic";
import { useStore } from "@/state/store";
import { useTracker } from "@/state/store/tracker/hooks";
import { trpc } from "@/trpc";
import { useUploadThing } from "@/uploadthing";
import type { NextPageWithLayout } from "@/utils/type";
import * as Dialog from "@radix-ui/react-dialog";
import { Toolbar, ToolbarButton } from "@radix-ui/react-toolbar";
import type { Session } from "next-auth";
import { signIn, useSession } from "next-auth/react";
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
          signOut().catch(logToastError("Error while trying to sign out.\nPlease try again."));
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
  const { value: optimisticImage, isUpdating, setOptimistic, reset } = useOptimistic(user.image);
  const optimisticUser = { ...user, image: optimisticImage };

  function updateUserImage(image: File | null) {
    if (!image) {
      setOptimistic(image, remove);
      return;
    }

    setOptimistic(URL.createObjectURL(image), () => {
      compressImage(image, 511 * 1024)
        .then((compressedImage) => startUpload([compressedImage ?? image]))
        .catch(logToastError("Couldn't upload the image.\nPlease try again."));
    });
  }

  function syncUserImage() {
    update()
      .catch(logToastError("Couldn't update data from the server.\nReloading the page is advised."))
      .finally(() => {
        if (optimisticImage) {
          URL.revokeObjectURL(optimisticImage);
        }
        reset();
      });
  }

  const { startUpload, isUploading } = useUploadThing("userImage", {
    onClientUploadComplete: syncUserImage,
    onUploadError(e) {
      toast.error(`Couldn't upload the image: ${e.message}`);
      syncUserImage();
    },
  });

  const { mutate: remove, isLoading } = trpc.user.deleteImage.useMutation({
    onError: (error) => toast.error(`Couldn't delete profile picture: ${error.message}`),
    onSettled: syncUserImage,
  });
  useTracker(loadingTracker, isUpdating || isUploading || isLoading, 300);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-16">
        <UserPic
          className="text-2xl"
          user={optimisticUser}
        />
        {!!optimisticUser.image && (
          <button
            type="button"
            onClick={() => updateUserImage(null)}
            aria-label="Delete avatar"
            className="absolute right-0 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 text-rose-700"
          >
            <DeleteIcon />
          </button>
        )}
      </div>
      <ImagePickerButton
        isImageSet={!!optimisticImage && isUpdating}
        onChange={(e) => {
          const file = e.target.files?.item(0);
          if (!file) return;
          updateUserImage(file);
        }}
      >
        {!!optimisticUser.image ? "Change avatar" : "Upload avatar"}
      </ImagePickerButton>
    </div>
  );
}

type UserNameProps = { username: string };
const USERNAME_MIN_LENGTH = 4;
function UserName({ username }: UserNameProps) {
  const { update } = useSession();
  const [value, setValue] = useState(username);
  const { mutate, isLoading } = trpc.user.setName.useMutation({
    onSettled() {
      update()
        .then((session) => {
          if (!session) return;
          setValue(session.user.name);
        })
        .catch(
          logToastError("Couldn't update data from the server.\nReloading the page is advised."),
        );
    },
    onError(e) {
      toast.error(`Couldn't update username: ${e.message}`);
    },
  });
  useTracker(loadingTracker, isLoading, 300);

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
  const trpcUtils = trpc.useUtils();
  const { data: accounts } = trpc.user.account.getProviders.useQuery();
  const { mutate: deleteAccount, isLoading } = trpc.user.account.deleteAccount.useMutation({
    onMutate({ provider }) {
      // optimistic update
      const prevProviders = trpcUtils.user.account.getProviders.getData();

      trpcUtils.user.account.getProviders.setData(undefined, (providers) =>
        providers?.filter((name) => name !== provider),
      );

      return prevProviders;
    },
    onError(e, __, prevProviders) {
      toast.error(`Couldn't unlink account: ${e.message}`);
      trpcUtils.user.account.getProviders.setData(undefined, prevProviders);
    },
    onSettled() {
      trpcUtils.user.account.getProviders.invalidate().catch(console.error);
    },
  });
  useTracker(loadingTracker, isLoading, 300);

  return (
    <section>
      <h2 className="p-2 text-sm">Linked accounts</h2>
      <Toolbar
        orientation="vertical"
        className="grid auto-rows-fr divide-y-2 divide-neutral-400/15 overflow-hidden rounded-lg bg-neutral-100"
      >
        {providerIcons.map(([provider, Icon]) => {
          const isLinked = accounts?.includes(provider);
          return (
            // extra div prevents dividers from being rounded
            <div key={provider}>
              <ToolbarButton asChild>
                <LabeledSwitch
                  className="capitalize"
                  aria-label={`${isLinked ? "unlink" : "link"} ${provider} account`}
                  checked={isLinked}
                  onCheckedChange={(value) => {
                    if (value) {
                      // optimistic update
                      trpcUtils.user.account.getProviders.setData(undefined, (providers) => {
                        return [...(providers ?? []), provider];
                      });
                      signIn(provider).catch(
                        logToastError("Couldn't link account.\nPlease try again."),
                      );
                    } else {
                      deleteAccount({ provider });
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-full w-7" />
                    <span>{provider}</span>
                  </div>
                </LabeledSwitch>
              </ToolbarButton>
            </div>
          );
        })}
      </Toolbar>
    </section>
  );
}

function AppSettings() {
  return (
    <section>
      <h2 className="p-2 text-sm">App settings</h2>
      <Toolbar
        orientation="vertical"
        className="grid auto-rows-fr divide-y-2 divide-app-green-400/25 overflow-hidden rounded-lg bg-app-green-100"
      >
        <SettingToggle
          label="Reviews are private by default"
          store={reviewPrivateDefaultStore}
        />
        <SettingToggle
          label="Scroll-up button enabled"
          store={scrollUpButtonEnabledStore}
        />
      </Toolbar>
    </section>
  );
}

type SettingToggleProps = { label: string; store: BooleanSettingStore };
function SettingToggle({ label, store }: SettingToggleProps) {
  const value = useStore(store);
  return (
    // extra div prevents dividers from being rounded
    <div>
      <ToolbarButton asChild>
        <LabeledSwitch
          className="bg-app-green-100"
          checked={value}
          onCheckedChange={store.setValue}
        >
          {label}
        </LabeledSwitch>
      </ToolbarButton>
    </div>
  );
}

type DeleteProfileProps = { username: string };
function DeleteProfile({ username }: DeleteProfileProps) {
  const { isOpen, setIsOpen } = useUrlDialog("delete-dialog");
  const { mutate, isLoading } = trpc.user.deleteUser.useMutation({
    onSuccess() {
      setIsOpen(false);
      reviewPrivateDefaultStore.setValue(true);
      signOut().catch(console.error);
    },
    onError(e) {
      toast.error(`Couldn't delete your profile: ${e.message}`);
    },
  });
  useTracker(loadingTracker, isLoading);

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
