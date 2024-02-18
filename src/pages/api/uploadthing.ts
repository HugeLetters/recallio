import { appFileRouter } from "@/server/uploadthing";
import { createRouteHandler } from "uploadthing/next-legacy";

const handler = createRouteHandler({ router: appFileRouter });
export default handler;
