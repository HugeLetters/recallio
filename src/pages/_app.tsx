import { signOut } from "@/auth";
import { LoadingIndicatorProvider } from "@/components/loading/indicator";
import { logToastError } from "@/components/toast";
import { ToastProvider } from "@/components/toast/provider";
import { lato } from "@/styles/font";
import "@/styles/globals.css";
import { tw } from "@/styles/tw";
import { trpc } from "@/trpc";
import type { NextPageWithLayout } from "@/utils/type";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import type { AppProps } from "next/app";
import Head from "next/head";
import type { ReactNode } from "react";

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
export default trpc.withTRPC(MyApp);

function AuthProtection({ children }: { children: ReactNode }) {
  useSession({
    required: true,
    onUnauthenticated: () => {
      signOut().catch(logToastError("Authentication error.\nPlease reload the page."));
    },
  });

  return <>{children}</>;
}

function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <LoadingIndicatorProvider>{children}</LoadingIndicatorProvider>
      </ToastProvider>
    </SessionProvider>
  );
}

declare module "react" {
  // Allow CSS vars in style declarations
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface CSSProperties extends Record<`--${string}`, string | undefined | number> {}
}
