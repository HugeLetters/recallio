import { Error } from "@/components/error";
import type { NextPageWithLayout } from "@/utils/type";

const Page: NextPageWithLayout = function () {
  return <Error message="Page not found" />;
};

Page.noAuth = true;

export default Page;
