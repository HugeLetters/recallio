import { Error } from "@/interface/error";
import type { NextPageWithLayout } from "@/layout";
import Head from "next/head";

const Page: NextPageWithLayout = function () {
  return (
    <>
      <Head>
        <title>unexpected error</title>
      </Head>
      <Error message="Something went wrong" />
    </>
  );
};

Page.isPublic = true;

export default Page;
