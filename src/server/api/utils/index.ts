import { TRPCError } from "@trpc/server";

export function throwDefaultError(
  error: unknown,
  message = "An unexpected error has occured.\nPlease try again later.",
): never {
  console.error(error);
  // todo - test this
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}
