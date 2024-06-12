import { signOut } from "@/auth";
import { logger } from "@/logger";
import type { ExpectedError } from "@/server/error/trpc";
import { hasProperty, isObject } from "@/utils/object";
import { TRPCClientError } from "@trpc/client";

export const UNAUTHORIZED_CODE: ExpectedError["code"] = "UNAUTHORIZED";
export const UNAUTHORIZED_MESSAGE = "User is not authenticated";
export function signOutOnUnauthorizedError(error: unknown) {
  if (error instanceof TRPCClientError) {
    const data: unknown = error.data;
    if (
      isObject(data) &&
      hasProperty(data, "code") &&
      data.code === UNAUTHORIZED_CODE &&
      hasProperty(data, "message") &&
      data.message === UNAUTHORIZED_MESSAGE
    ) {
      signOut().catch(logger.error);
    }
  }
}
