import { barcodeLengthMax, barcodeLengthMin } from "@/product/validation";
import { createMaxMessage, createMinMessage, stringLikeSchema } from "@/server/validation/string";

export function createBarcodeSchema(requiredError?: string) {
  return stringLikeSchema({ required_error: requiredError })
    .min(barcodeLengthMin, createMinMessage("Barcode", barcodeLengthMin))
    .max(barcodeLengthMax, createMaxMessage("Barcode", barcodeLengthMax));
}
