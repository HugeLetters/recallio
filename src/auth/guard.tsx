import { setSessionDataCookie } from "@/auth/session/cookie";
import { useRequiredSession } from "@/auth/session/hooks";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data } = useRequiredSession();
  useEffect(() => {
    if (!data) return;
    setSessionDataCookie(data);
  }, [data]);

  return children;
}
