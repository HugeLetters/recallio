import { getQueryParam } from "@/browser/query";
import { Redirect, asRoute } from "@/components/redirect";
import { ButtonLike } from "@/components/ui";
import type { NextPageWithLayout } from "@/layout";
import Link from "next/link";
import { useRouter } from "next/router";
import OfflineIcon from "~icons/carbon/cloud-offline";

const Page: NextPageWithLayout = function () {
  const router = useRouter();
  const redirect = asRoute(getQueryParam(router.query.redirect)) ?? "/scan";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col items-center justify-center gap-3 p-4 text-center">
      <Redirect to={redirect} />
      <OfflineIcon className="size-full px-10 text-neutral-400" />
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
