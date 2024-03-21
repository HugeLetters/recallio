import { setSessionDataCookie, useRequiredSession } from "@/auth/session";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data } = useRequiredSession();
  useEffect(() => {
    if (!data) return;
    setSessionDataCookie(data);
  }, [data]);

  if (!data) {
    return <div className="flex size-full items-center justify-center text-8xl"> Loading...</div>;
  }

  return children;
}
