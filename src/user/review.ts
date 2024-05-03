import { logToastError } from "@/interface/toast";
import { trpc } from "@/trpc";

export function useInvalidateReviewAdjacentData(barcode: string) {
  const utils = trpc.useUtils();

  return function () {
    Promise.all([
      utils.user.review.getSummaryList.invalidate(),
      utils.user.review.getCount.invalidate(),

      utils.product.getReviewList.invalidate({ barcode }),
      utils.product.getSummary.invalidate({ barcode }),
      utils.product.getSummaryList.invalidate(),
    ]).catch(
      logToastError("Failed to update data from the server.\nReloading the page is advised."),
    );
  };
}
