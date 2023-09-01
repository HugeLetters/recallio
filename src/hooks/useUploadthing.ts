import type { AppFileRouter } from "@/server/uploadthing";
import { generateReactHelpers } from "@uploadthing/react/hooks";

const { useUploadThing: _useUploadThing } = generateReactHelpers<AppFileRouter>();

export const useUploadThing = _useUploadThing.bind(undefined, "imageUploader");
