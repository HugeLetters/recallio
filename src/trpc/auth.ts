import { signOut } from "@/auth";
import { logger } from "@/logger";
import type { ExpectedError } from "@/server/error/trpc";
import { hasProperty, isObject } from "@/utils/object";
import { TRPCClientError } from "@trpc/client";

export const UNAUTHORIZED_CODE: ExpectedError["code"] = "UNAUTHORIZED";
export function signOutOnUnauthorizedError(error: unknown) {
  if (!(error instanceof TRPCClientError)) {
    return;
  }

  const data: unknown = error.data;
  if (!isObject(data)) {
    return;
  }

  if (!hasProperty(data, "code")) {
    return;
  }

  if (data.code !== UNAUTHORIZED_CODE) {
    return;
  }

  signOut().catch(logger.error);
}
