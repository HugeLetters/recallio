import { getSignInPath } from "@/auth/url";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // todo - redirect if no cookie
  const { cookies, nextUrl } = request;
  const token = cookies.get("next-auth.session-token");
  const session = cookies.get("session-data");
  console.log(session);
  // todo - get pages which don't require auth and check them here
  if (nextUrl.pathname !== "/auth/signin") {
    if (!token) {
      return NextResponse.redirect(new URL(getSignInPath(nextUrl.href), nextUrl.href), request);
    }
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)?",
};
