import { AuthGuard } from "@/auth/guard";
import { ResizeProvider } from "@/browser/resize/provider";
import { LoadingProvider } from "@/interface/loading/indicator";
import { ToastProvider } from "@/interface/toast/provider";
import type { NextPageWithLayout } from "@/layout";
import { getBasicLayout } from "@/layout/basic";
import { useQueryTabSync } from "@/state/tab-sync";
import { lato } from "@/styles/font";
import "@/styles/globals.css";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import type { ReactNode } from "react";

interface AppPropsWithLayout extends AppProps<{ session: Session | null }> {
  Component: NextPageWithLayout;
}
const MyApp = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) => {
  const { getLayout = getBasicLayout } = Component;
  const Page = <Component {...pageProps} />;

  return (
    <div className={tw("contents font-lato", lato.variable)}>
      <Providers session={session}>
        <Head>
          <title>recallio</title>
          <link
            rel="icon"
            href="/favicon.ico"
          />
          <link
            rel="manifest"
            href="/manifest.webmanifest"
          />
        </Head>
        {getLayout(!Component.isPublic ? <AuthGuard>{Page}</AuthGuard> : Page)}
      </Providers>
    </div>
  );
};
export default trpc.withTRPC(MyApp);

function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  useQueryTabSync();

  return (
    <SessionProvider session={session}>
      <ToastProvider>{children}</ToastProvider>
      <LoadingProvider />
      <ResizeProvider />
    </SessionProvider>
  );
}

declare module "react" {
  // Allow CSS vars in style declarations
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CSSProperties extends Record<`--${string}`, string | undefined | number> {}
}
