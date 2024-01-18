import { Layout } from "@/components/Layout";
import { HeaderWithBarcodeTitle } from "@/components/page/Review";
import type { NextPageWithLayout } from "@/utils/type";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  return <div>{router.query.id}</div>;
};

Page.getLayout = (page) => {
  return <Layout header={<HeaderWithBarcodeTitle />}>{page}</Layout>;
};

export default Page;
