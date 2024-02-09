import { LoadingIndicatorProvider } from "@/components/Loading";
import { ToastProvider } from "@/components/Toast";
import "@/styles/globals.css";
import { tw } from "@/utils";
import { api } from "@/utils/api";
import { lato } from "@/utils/font";
import type { NextPageWithLayout } from "@/utils/type";
import { Provider as JotaiProvider } from "jotai";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { type ReactNode } from "react";

type AppPropsWithLayout = AppProps<{ session: Session | null }> & { Component: NextPageWithLayout };
const MyApp = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((x) => x);
  const page = getLayout(<Component {...pageProps} />);

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
        {!Component.noAuth ? <AuthProtection>{page}</AuthProtection> : page}
      </Providers>
    </div>
  );
};
export default api.withTRPC(MyApp);

function AuthProtection({ children }: { children: ReactNode }) {
  useSession({ required: true });
  return <>{children}</>;
}

function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <JotaiProvider>
        <ToastProvider>
          <LoadingIndicatorProvider>{children}</LoadingIndicatorProvider>
        </ToastProvider>
      </JotaiProvider>
    </SessionProvider>
  );
}
