import { LoadingIndicatorProvider } from "@/components/Loading";
import { ToastProvider } from "@/components/Toast";
import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { browser, tw } from "@/utils";
import { api } from "@/utils/api";
import type { NextPageWithLayout } from "@/utils/type";
import { Provider as JotaiProvider } from "jotai";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import type { AppProps } from "next/app";
import { Lato } from "next/font/google";
import Head from "next/head";
import { useEffect, type ReactNode } from "react";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["100", "300", "400", "700", "900"],
});

type AppPropsWithLayout = AppProps<{ session: Session | null }> & { Component: NextPageWithLayout };
const MyApp = ({ Component, pageProps: { session, ...pageProps } }: AppPropsWithLayout) => {
  useEffect(() => {
    if (env.NEXT_PUBLIC_NODE_ENV == "production" || !browser) return;

    const worker = import("@/utils/interceptor")
      .then((module) => module.default)
      .then((setupInterceptor) => setupInterceptor())
      .catch(console.error);

    return () => {
      worker.then((w) => w?.stop()).catch(console.error);
    };
  }, []);

  const getLayout = Component.getLayout ?? ((x) => x);
  const page = getLayout(<Component {...pageProps} />);

  return (
    <Providers session={session}>
      <Head>
        <title>recallio</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <div className={tw("contents font-lato", lato.variable)}>
        {!Component.noAuth ? <AuthProtection>{page}</AuthProtection> : page}
      </div>
    </Providers>
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
