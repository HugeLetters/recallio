import { Error } from "@/interface/error";
import type { NextPageWithLayout } from "@/layout";
import Head from "next/head";

const Page: NextPageWithLayout = function () {
  return (
    <>
      <Head>
        <title>not found</title>
      </Head>
      <Error message="Page not found" />;
    </>
  );
};

Page.isPublic = true;

export default Page;
