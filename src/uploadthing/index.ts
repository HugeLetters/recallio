import type { AppFileRouter } from "@/server/uploadthing";
import { generateReactHelpers } from "@uploadthing/react/hooks";

// todo - this can be made leaner by creating own util
export const { useUploadThing } = generateReactHelpers<AppFileRouter>();
