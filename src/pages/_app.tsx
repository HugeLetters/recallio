import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { api } from "@/utils/api";
import setupInterceptor from "@/utils/interceptor";
import { Provider as JotaiProvider } from "jotai";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  useEffect(() => {
    if (env.NEXT_PUBLIC_NODE_ENV == "production") return;

    const worker = setupInterceptor();
    return () => worker?.stop();
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
      <div className="grid h-screen w-full grid-rows-[auto_1fr_auto] bg-white">
        <Header />
        <main className="flex w-full max-w-md justify-center justify-self-center overflow-y-scroll">
          <AuthProtection>
            <Component {...pageProps} />
          </AuthProtection>
        </main>
        <Footer />
      </div>
    </Providers>
  );
};
export default api.withTRPC(MyApp);

function AuthProtection({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  // todo - proper loading state
  if (router.pathname !== "/profile" && status !== "authenticated") {
    return <Link href="/profile">Go to login page</Link>;
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
