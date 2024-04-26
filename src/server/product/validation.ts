import { BARCODE_LENGTH_MAX, BARCODE_LENGTH_MIN } from "@/product/validation";
import { createMaxMessage, createMinMessage, stringLikeSchema } from "@/server/validation/string";

export function createBarcodeSchema(requiredError?: string) {
  return stringLikeSchema({ required_error: requiredError })
    .min(BARCODE_LENGTH_MIN, createMinMessage("Barcode", BARCODE_LENGTH_MIN))
    .max(BARCODE_LENGTH_MAX, createMaxMessage("Barcode", BARCODE_LENGTH_MAX));
}
