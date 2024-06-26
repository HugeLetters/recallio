import { Error } from "@/interface/error";
import type { NextPageWithLayout } from "@/layout";
import { getQueryParam } from "@/navigation/query";
import { useRouter } from "next/router";

const Page: NextPageWithLayout = function () {
  const { query } = useRouter();
  const error = getErrorMessage(getQueryParam(query.error));

  return <Error message={error ?? "Authentication error"} />;
};

type ErrorCode = "Configuration" | "AccessDenied" | "Verification" | "Default";
function getErrorMessage(
  errorCode: ErrorCode | (string & NonNullable<unknown>) | undefined,
): string | null {
  if (!errorCode) return null;

  switch (errorCode) {
    case "AccessDenied":
      return "You do not have access to this resource";
    case "Verification":
      return "Provided PIN has expired or was already used";
    case "Configuration":
    case "Default":
    default:
      return null;
  }
}
Page.isPublic = true;

export default Page;
