import { ButtonLike } from "@/interface/button";
import type { NextPageWithLayout } from "@/layout";
import { Redirect, useRedirectQuery } from "@/navigation/redirect";
import Head from "next/head";
import Link from "next/link";
import OfflineIcon from "~icons/carbon/cloud-offline";

const Page: NextPageWithLayout = function () {
  const redirect = useRedirectQuery("redirect", "/scan");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center gap-3 p-4 text-center">
      <Head>
        <title>offline</title>
      </Head>
      <Redirect to={redirect} />
      <OfflineIcon className="size-full px-10 text-neutral-300" />
      <div className="space-y-2 py-4">
        <p className="text-xl">This is an offline fallback page</p>
        <p className="">You should be redirected to another page shortly</p>
      </div>
      <ButtonLike>
        <Link
          href="/profile"
          className="primary mt-3 w-2/5"
        >
          Go to homepage
        </Link>
      </ButtonLike>
    </div>
  );
};

Page.isPublic = true;
export default Page;
