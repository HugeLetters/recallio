import type { AppFileRouter } from "@/server/uploadthing";
import { generateReactHelpers } from "@uploadthing/react/hooks";

// todo - upload progress
export const { useUploadThing } = generateReactHelpers<AppFileRouter>();
