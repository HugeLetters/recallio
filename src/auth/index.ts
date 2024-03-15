import { signOut as signOutBase } from "next-auth/react";
import router from "next/router";

export function signOut() {
  return signOutBase({ redirect: false }).then(({ url }) =>
    router.push(`/auth/signin?callbackUrl=${url}`),
  );
}
