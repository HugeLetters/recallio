import type { NextPageWithLayout } from "@/layout";
import { Layout } from "@/layout";
import Head from "next/head";

// todo - loading indicator
// todo - how to use scanner
// todo - made by
// ? todo - offline indicator

const Page: NextPageWithLayout = () => <div>about</div>;

Page.getLayout = (children) => (
  <Layout header={{ title: "About" }}>
    <Head>
      <title>about</title>
    </Head>
    {children}
  </Layout>
);

export default Page;
