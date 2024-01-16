import type { NextPageWithLayout } from "@/utils/type";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  return <div>{router.query.id}</div>;
};

export default Page;
