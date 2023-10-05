import useHeader from "@/hooks/useHeader";
import { signIn, signOut, useSession } from "next-auth/react";

export default function ProfileEdit() {
  useHeader(() => ({ title: "Settings" }), []);

  const { status } = useSession();
  if (status !== "authenticated") return "Loading";

  return (
    <div>
      <Btns authed={status === "authenticated"} />
    </div>
  );
}

type BtnsProps = { authed: boolean };
function Btns({ authed }: BtnsProps) {
  return (
    <div className="flex gap-2">
      <button onClick={() => void signIn()}>{authed ? "LINK NEW PROFILE" : "SIGN IN"}</button>
      {authed && <button onClick={() => void signOut({ redirect: false })}>SIGN OUT</button>}
    </div>
  );
}
