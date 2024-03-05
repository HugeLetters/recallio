import type { PropsWithChildren } from "react";
import { Footer } from "./footer";
import type { HeaderProps } from "./header";
import { Header } from "./header";

// todo - https://twitter.com/_jessicasachs/status/1764499060801536006?t=iKBcC7m_7PPtLheC0JEnyg&s=19
type LayoutProps = {
  header?: HeaderProps;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="grid h-dvh w-full grid-rows-[auto_1fr_auto] bg-white">
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      {/* todo - radix scoll area. somewhere else too? */}
      <main className="scrollbar-gutter flex w-full max-w-app justify-center justify-self-center overflow-y-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}
