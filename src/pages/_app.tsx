import { AuthGuard } from "@/auth/guard";
import { LoadingProvider } from "@/components/loading/indicator";
import { ToastProvider } from "@/components/toast/provider";
import type { GetLayout, NextPageWithLayout } from "@/layout";
import { lato } from "@/styles/font";
import "@/styles/globals.css";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import type { ReactNode } from "react";

const defaultGetLayout: GetLayout = ({ children }) => children;

type AppPropsWithLayout = AppProps<{ session: Session | null }> & { Component: NextPageWithLayout };
const MyApp = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) => {
  const Layout = Component.getLayout ?? defaultGetLayout;
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
        </Head>
        <Layout>{!Component.noAuth ? <AuthGuard>{Page}</AuthGuard> : Page}</Layout>
      </Providers>
    </div>
  );
};
export default trpc.withTRPC(MyApp);

function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <LoadingProvider>{children}</LoadingProvider>
      </ToastProvider>
    </SessionProvider>
  );
}

declare module "react" {
  // Allow CSS vars in style declarations
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CSSProperties extends Record<`--${string}`, string | undefined | number> {}
}
