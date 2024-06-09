import { TrackedScrollUpButton } from "@/browser/scroll-up";
import { tw } from "@/styles/tw";
import type { NextPage } from "next";
import type { PropsWithChildren, ReactNode } from "react";
import { useRef } from "react";
import { Footer } from "./footer";
import type { HeaderProps } from "./header";
import { Header } from "./header";
import { layoutScrollUpTracker } from "./scroll-up-tracker";
import { layoutRootStore } from "./store";

type LayoutProps = {
  header?: HeaderProps;
  full?: boolean;
};
export function Layout({ header, full = false, children }: PropsWithChildren<LayoutProps>) {
  const main = useRef<HTMLElement>(null);

  return (
    <div
      ref={layoutRootStore.setRef}
      className="flex h-dvh flex-col bg-white"
    >
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main
        ref={main}
        className="scrollbar-gutter w-full max-w-app grow self-center overflow-y-auto"
      >
        <div className={tw("flex min-h-full *:min-w-0", !full && "p-4 pb-5")}>{children}</div>
        <TrackedScrollUpButton
          tracker={layoutScrollUpTracker}
          targetRef={main}
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
