import { TRPCError } from "@trpc/server";

type TRPCErrorOptions = ConstructorParameters<typeof TRPCError>[0];

const defaultErrorMessage = "An unexpected error has occured.\nPlease try again later.";
export class ExpectedError extends TRPCError {
  constructor({
    code = "INTERNAL_SERVER_ERROR",
    message = defaultErrorMessage,
    cause,
  }: Partial<TRPCErrorOptions> = {}) {
    super({ code, message, cause });
  }
}

export function throwExpectedError(error: unknown, message?: string): never {
  console.error(error);
  throw coalesceExpectedError(error, message);
}

export function coalesceExpectedError(error: unknown, message?: string): ExpectedError {
  if (error instanceof ExpectedError) return error;
  return new ExpectedError({ message, cause: error });
}
