import type { ReactNode } from "react";
import { useRequiredSession } from "./session";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data } = useRequiredSession();

  if (!data) {
    return <div className="flex size-full items-center justify-center text-8xl"> Loading...</div>;
  }

  return children;
}
