import { env } from "@/env.mjs";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

function productNameKey(barcode: string) {
  return `product-name:${barcode}`;
}
export function cacheProductNames(barcode: string, names: string[]) {
  return redis.set(productNameKey(barcode), names, { px: 1000 * 60 * 60 * 24 * 30 * 6 });
}
export function getProductNames(barcode: string) {
  return redis.get<string[]>(productNameKey(barcode));
}
