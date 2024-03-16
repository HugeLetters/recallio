import { ScrollUpButton } from "@/browser/scroll-up";
import type { PropsWithChildren } from "react";
import { Footer } from "./footer";
import type { HeaderProps } from "./header";
import { Header } from "./header";

type LayoutProps = {
  header?: HeaderProps;
};
export function Layout({ children, header }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr_auto] bg-white">
      <Header {...(header ?? { title: "Recallio", left: null, right: null })} />
      <main className="scrollbar-gutter flex w-full max-w-app justify-self-center overflow-y-auto">
        {children}
        <ScrollUpButton />
      </main>
      <Footer />
    </div>
  );
}
