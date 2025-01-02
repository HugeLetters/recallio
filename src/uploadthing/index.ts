import type { AppFileRouter } from "@/server/uploadthing";
import { generateReactHelpers } from "@uploadthing/react";

export const { useUploadThing } = generateReactHelpers<AppFileRouter>();
