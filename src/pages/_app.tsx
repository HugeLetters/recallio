import Auth from "@/components/auth";
import NavBar from "@/components/navbar";
import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { api } from "@/utils/api";
import setupInterceptor from "@/utils/interceptor";
import { type Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import Head from "next/head";
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
    <SessionProvider session={session}>
      <ToastContainer />
      <Head>
        <title>recallio</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <div className="grid min-h-screen grid-rows-[auto_1fr_auto] place-items-center gap-2  bg-gradient-to-br from-teal-600 to-green-400 py-2">
        <header className=" w-full max-w-md rounded-lg bg-background p-2">header</header>
        <main className="h-full w-full max-w-md">
          <AuthProtection>
            <Component {...pageProps} />
          </AuthProtection>
        </main>
        <footer>
          <Auth />
          <NavBar />
        </footer>
      </div>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);

function AuthProtection({ children }: { children: ReactNode }) {
  const { status } = useSession();
  // todo - proper loading state
  if (status !== "authenticated") {
    return null;
  }
  return <>{children}</>;
}
