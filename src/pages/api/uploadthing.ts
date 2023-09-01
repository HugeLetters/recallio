import { appFileRouter } from "@/server/uploadthing";
import { createNextPageApiHandler } from "uploadthing/next-legacy";

const handler = createNextPageApiHandler({
  router: appFileRouter,
});

export default handler;
