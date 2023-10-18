import { UserPic } from "@/components/UI";
import useHeader from "@/hooks/useHeader";
import { useQuery } from "@tanstack/react-query";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";

export default function ProfileEdit() {
  useHeader(
    () => ({
      title: "Settings",
      right: "confirm?????",
    }),
    []
  );

  const providersQuery = useQuery({
    queryKey: ["auth providers"],
    queryFn() {
      return getProviders();
    },
  });
  const { status, data } = useSession();
  if (status !== "authenticated") return "Loading";

  return (
    <div className="flex w-full flex-col items-center gap-3 p-4">
      <div className="relative h-16 w-16">
        <UserPic
          user={data.user}
          className="drop-shadow-md"
        />
        <button className="absolute right-0 top-0 flex aspect-square h-6 w-6 items-center justify-center rounded-full bg-neutral-100 p-1.5 text-rose-700">
          <DeleteIcon />
        </button>
      </div>
      <button className="rounded-lg border border-neutral-400/10 bg-neutral-100 px-4 font-semibold">
        Change avatar
      </button>
      <label className="flex w-full flex-col">
        <span>Name:</span>
        <input className="w-full rounded-lg p-3 outline outline-app-green" />
      </label>
      <div>
        <div>Accounts</div>
        <div className="flex flex-col gap-1">
          {Object.entries(providersQuery.data ?? {})
            .filter(([name]) => name !== "email")
            .map(([name, provider]) => (
              <button
                key={name}
                className="bg-neutral-300 "
                onClick={() => {
                  void signIn(provider.name.toLowerCase());
                }}
              >
                {name}
              </button>
            ))}
        </div>
      </div>
      <div>
        <div>App settings</div>
        <label>
          Mark reviews as private by default
          <input
            type="checkbox"
            onChange={(e) => {
              localStorage.setItem("review-private-default", `${e.target.checked}`);
            }}
          />
        </label>
      </div>
      <button
        onClick={() => {
          void signOut({ redirect: false });
        }}
      >
        sign out
      </button>
    </div>
  );
}
