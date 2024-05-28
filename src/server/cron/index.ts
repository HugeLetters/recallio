import { env } from "@/server/env/index.mjs";
import { verifySignature } from "@upstash/qstash/dist/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

export function createCronHandler(
  innerHandler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>,
) {
  if (env.NEXT_PUBLIC_NODE_ENV === "development") return innerHandler;

  return verifySignature(innerHandler, {
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
}
