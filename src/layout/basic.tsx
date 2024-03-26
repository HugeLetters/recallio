import type { PropsWithChildren } from "react";

export function BasicLayout({ children }: PropsWithChildren) {
  return <div className="bg-white">{children}</div>;
}
