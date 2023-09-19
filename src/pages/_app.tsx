import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { env } from "@/env.mjs";
import "@/styles/globals.css";
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
    if (env.NEXT_PUBLIC_NODE_ENV == "production") return;

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
      <div
        className={`${lato.variable} grid h-[100dvh] w-full grid-rows-[auto_1fr_auto] bg-white font-lato text-lime-950`}
      >
        <Header />
        <main className="flex w-full max-w-md justify-center justify-self-center overflow-y-auto">
          {/* @ts-expect-error - I use noAuth property to allow some pages to be acessed w/o login. It's too much of a bother to extend Next interfaces to have this property*/}
          {!Component.noAuth ? (
            <AuthProtection>
              <Component {...pageProps} />
            </AuthProtection>
          ) : (
            <Component {...pageProps} />
          )}
        </main>
        <Footer />
      </div>
    </Providers>
  );
};
export default api.withTRPC(MyApp);

function AuthProtection({ children }: { children: ReactNode }) {
  const { status } = useSession({ required: true });

  if (status !== "authenticated") {
    return <>Loading...</>;
  }

  return <>{children}</>;
}

function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <JotaiProvider>{children}</JotaiProvider>
    </SessionProvider>
  );
}
