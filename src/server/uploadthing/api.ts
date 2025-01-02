import { env } from "@/server/env/index.mjs";
import { createUploadthing } from "uploadthing/next-legacy";
import { UTApi } from "uploadthing/server";

export const uploadthing = createUploadthing();
export const utapi = new UTApi({ token: env.UPLOADTHING_TOKEN });
