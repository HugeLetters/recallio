import { env } from "@/env.mjs";
import "@/styles/globals.css";
import { api } from "@/utils/api";
import setupInterceptor from "@/utils/interceptor";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  if (env.NEXT_PUBLIC_NODE_ENV !== "production") {
    setupInterceptor();
  }

  return (
    <SessionProvider session={session}>
      <ToastContainer />
      <Component {...pageProps} />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
