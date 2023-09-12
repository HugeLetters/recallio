import useHeader from "@/hooks/useHeader";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function Profile() {
  const { data, status } = useSession();
  useHeader("Profile");

  return (
    <div className="bg-background m-4 flex flex-col gap-3 rounded-lg p-4">
      {status !== "loading" ? (
        <>
          <button onClick={() => void signIn()}>
            {status === "authenticated" ? "LINK NEW PROFILE" : "SIGN IN"}
          </button>
          {status === "authenticated" && (
            <button onClick={() => void signOut({ redirect: false })}>SIGN OUT</button>
          )}
          {status === "authenticated" && (
            <div>
              {data.user.image && (
                <Image
                  src={data.user.image}
                  alt="your profile pic"
                  width={100}
                  height={100}
                />
              )}
              <span>YOU ARE LOGGED IN AS {data.user.name}</span>
            </div>
          )}
        </>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
