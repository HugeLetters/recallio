import { barcodeMinLength } from "@/product/validation";
import { createMinMessage, stringLikeSchema } from "../validation/string";

export function createBarcodeSchema(requiredError: string | undefined) {
  return stringLikeSchema({ required_error: requiredError }).min(
    barcodeMinLength,
    createMinMessage("Barcode", barcodeMinLength),
  );
}
