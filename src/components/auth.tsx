import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function Auth() {
  const { data, status } = useSession();
  return (
    <div className="m-4 flex flex-col gap-3 rounded-lg bg-teal-400 p-4">
      <button onClick={() => void signIn()}>
        {status === "authenticated" ? "LINK NEW PROFILE" : "SIGN IN"}
      </button>
      {status === "authenticated" && (
        <button onClick={() => void signOut({ redirect: false })}>SIGN OUT</button>
      )}
      {status === "authenticated" && (
        <div>
          <span>YOU ARE LOGGED IN AS {data.user.name}</span>
          {data.user.image && (
            <Image
              src={data.user.image}
              alt={`Profile image of ${data.user.name}`}
              width={100}
              height={100}
            />
          )}
        </div>
      )}
    </div>
  );
}
