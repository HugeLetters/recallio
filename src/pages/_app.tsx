import Auth from "@/components/auth";
import NavBar from "@/components/navbar";
import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { api } from "@/utils/api";
import setupInterceptor from "@/utils/interceptor";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
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
    <SessionProvider session={session}>
      <ToastContainer />
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <Head>
          <title>recallio</title>
          <link
            rel="icon"
            href="/favicon.ico"
          />
        </Head>
        <main>
          <Component {...pageProps} />
        </main>
        <NavBar />
        <Auth />
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
