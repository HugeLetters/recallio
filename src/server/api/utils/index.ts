import { TRPCError } from "@trpc/server";

export function throwDefaultError(error: unknown, message?: string): never {
  console.error(error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}
