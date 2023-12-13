import { Error } from "@/components/Error";
import { getQueryParam } from "@/utils";
import { useRouter } from "next/router";

Page.noAuth = true;
export default function Page() {
  const { query } = useRouter();
  const error = getErrorMessage(getQueryParam(query.error));

  return <Error errorMessage={error ?? "Authentication error"} />;
}

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
