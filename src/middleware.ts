import { sessionDataCookieName } from "@/auth/session/cookie/name";
import { getSignInPath } from "@/auth/url";
import { getRouteInfo } from "@/server/router/check";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)?",
};

export function middleware(request: NextRequest): NextResponse | void {
  const { cookies, nextUrl } = request;
  if (isValidUserSession(cookies, nextUrl.protocol === "https:")) {
    return;
  }

  const routePublicity = getRouteInfo(nextUrl.pathname);
  const next = NextResponse.next();
  next.cookies.delete(sessionDataCookieName);
  switch (routePublicity) {
    case "public": {
      return next;
    }
    case "private": {
      const signinUrl = new URL(getSignInPath(nextUrl.href), nextUrl.href);
      return NextResponse.redirect(signinUrl, { headers: next.headers });
    }
    default:
      return routePublicity satisfies never;
  }
}

const baseTokenCookieName = "next-auth.session-token";
function isValidUserSession(cookies: NextRequest["cookies"], secure: boolean): boolean {
  const sessionTokenName = secure ? `__Secure-${baseTokenCookieName}` : baseTokenCookieName;
  return !!cookies.get(sessionTokenName);

  // For now lets just check for existence of session token - using checks below results in problems on initial sign in since session data is still not set yet even though user is authed already
  // const sessionToken = cookies.get("next-auth.session-token");
  // if (!sessionToken) return false;

  // const sessionData = cookies.get(sessionDataCookieName);
  // if (!sessionData) return false;

  // const sessionOption = decodeJSON(sessionData.value);
  // if (!isSome(sessionOption)) return false;

  // const session = parseWithExpires(sessionOption.value);
  // return !!session && new Date() <= new Date(session.expires);
}
