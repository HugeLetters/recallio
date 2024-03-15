import { signOut as signOutBase } from "next-auth/react";
import router from "next/router";

export function signOut() {
  return signOutBase({ redirect: false }).then(({ url: urlString }) => {
    const url = new URL(urlString);
    if (url.pathname === "/auth/signin") return;
    return router.push(`/auth/signin?callbackUrl=${encodeURIComponent(url.href)}`);
  });
}