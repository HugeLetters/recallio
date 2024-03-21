import { setSessionDataCookie } from "@/auth/session";
import { getSignInPath } from "@/auth/url";
import { signOut as signOutBase } from "next-auth/react";
import router from "next/router";

export function signOut() {
  return signOutBase({ redirect: false }).then(({ url: urlString }) => {
    const url = new URL(urlString);
    setSessionDataCookie(null);
    if (url.pathname === "/auth/signin") return;
    return signIn(url.href);
  });
}

export function signIn(url = location.href) {
  return router.push(getSignInPath(url));
}
