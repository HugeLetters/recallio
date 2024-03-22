import { useRequiredSession } from "@/auth/session";
import { setSessionDataCookie } from "@/auth/session-cookie";
import type { ReactNode } from "react";
import { useEffect } from "react";

// todo - how should this be structured?
// ? Should session data always be set in all routes?
// ? Should this guard block render? I don't think so
// ? Do I even need it? Maybe just use required session where I need to?
export function AuthGuard({ children }: { children: ReactNode }) {
  const { data } = useRequiredSession();
  useEffect(() => {
    if (!data) return;
    setSessionDataCookie(data);
  }, [data]);

  return children;
}
