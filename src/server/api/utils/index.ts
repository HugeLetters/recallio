import { TRPCError } from "@trpc/server";

export function throwDefaultError(
  error: unknown,
  message = "An error has occured.\nPlease try again later.",
): never {
  console.error(error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}
