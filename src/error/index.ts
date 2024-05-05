export const FAILED_TO_FETCH_MESSAGE = "Failed to fetch";

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
