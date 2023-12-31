import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { browser } from "@/utils";
import { api } from "@/utils/api";
import { Provider as JotaiProvider } from "jotai";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import { Lato } from "next/font/google";
import Head from "next/head";
import { useEffect, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["100", "300", "400", "700", "900"],
});

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
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

  return (
    <Providers session={session}>
      <ToastContainer />
      <Head>
        <title>recallio</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <div className={`contents font-lato ${lato.variable}`}>
        {!Component.noAuth ? (
          <AuthProtection>
            <Component {...pageProps} />
          </AuthProtection>
        ) : (
          <Component {...pageProps} />
        )}
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
      <JotaiProvider>{children}</JotaiProvider>
    </SessionProvider>
  );
}
