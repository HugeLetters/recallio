import { Error } from "@/components/error";
import type { NextPageWithLayout } from "@/layout";

const Page: NextPageWithLayout = function () {
  return <Error message="Page not found" />;
};

Page.isPublic = true;

export default Page;
