import { TrackedScrollUpButton } from "@/browser/scroll-up";
import type { NextPage } from "next";
import type { PropsWithChildren, ReactNode } from "react";
import { Footer } from "./footer";
import type { HeaderProps } from "./header";
import { Header } from "./header";
import { layoutScrollUpTracker } from "./scroll-up-tracker";

type LayoutProps = {
  header?: HeaderProps;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="flex h-dvh flex-col bg-white">
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main className="scrollbar-gutter flex w-full max-w-app grow self-center overflow-y-auto">
        {children}
        <TrackedScrollUpButton tracker={layoutScrollUpTracker} />
      </main>
      <Footer />
    </div>
  );
}

type GetLayout = ({ children }: PropsWithChildren) => ReactNode;
export type NextPageWithLayout<Props = unknown, InitialProps = Props> = NextPage<
  Props,
  InitialProps
> & {
  noAuth?: boolean;
  getLayout?: GetLayout;
};

export const defaultGetLayout: GetLayout = ({ children }) => children;
