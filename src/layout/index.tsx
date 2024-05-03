import { TrackedScrollUpButton } from "@/browser/scroll-up";
import type { NextPage } from "next";
import type { PropsWithChildren, ReactNode } from "react";
import { Footer } from "./footer";
import type { HeaderProps } from "./header";
import { Header } from "./header";
import { rootStore } from "./root";
import { layoutScrollUpTracker } from "./scroll-up-tracker";

type LayoutProps = {
  header?: HeaderProps;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div
      ref={rootStore.setRoot}
      className="flex h-dvh flex-col bg-white"
    >
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main className="scrollbar-gutter w-full max-w-app grow self-center overflow-y-auto">
        <div className="flex min-h-full p-4 pb-5">{children}</div>
        <TrackedScrollUpButton
          tracker={layoutScrollUpTracker}
          className="size-10"
        />
      </main>
      <Footer />
    </div>
  );
}

export type GetLayout = (page: ReactNode) => ReactNode;
export type NextPageWithLayout<Props = unknown, InitialProps = Props> = NextPage<
  Props,
  InitialProps
> & {
  isPublic?: boolean;
  getLayout?: GetLayout;
};
