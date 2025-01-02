import { env } from "@/server/env/index.mjs";
import { verifySignature } from "@upstash/qstash/dist/nextjs";
import type { NextApiHandler } from "next";

export function createCronHandler<T = unknown>(innerHandler: NextApiHandler<T>) {
  if (env.NEXT_PUBLIC_NODE_ENV === "development") return innerHandler;

  return verifySignature(innerHandler, {
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
}
