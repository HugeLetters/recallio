import type { FileRouter } from "uploadthing/next-legacy";
import { reviewImageUploader } from "./review";
import { userImageUploader } from "./user";

export const appFileRouter = {
  reviewImage: reviewImageUploader,
  userImage: userImageUploader,
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;

export function getFileUrl(fileKey: string) {
  return `https://utfs.io/f/${fileKey}`;
}
