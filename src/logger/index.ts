import { FAILED_TO_FETCH_MESSAGE, getErrorMessage } from "@/error";
import { trpcLazy } from "@/trpc";

export const logger = {
  error: (error: unknown) => {
    console.error(error);
    if (process.env.NODE_ENV !== "production") return;

    const message = getErrorMessage(error);
    if (message === FAILED_TO_FETCH_MESSAGE) return;

    trpcLazy.client.logs.error.reportClientError
      .mutate({
        message,
        stack: error instanceof Error ? error.stack : undefined,
      })
      .catch(console.error);
  },
};
