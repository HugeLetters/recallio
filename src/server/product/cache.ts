import { redis } from "@/server/redis";

function productNameKey(barcode: string) {
  return `product-name:${barcode}`;
}

export function cacheProductNames(barcode: string, names: string[]) {
  return redis.set(productNameKey(barcode), names, { px: productNameDuration });
}
export function getProductNames(barcode: string) {
  return redis.get<string[]>(productNameKey(barcode));
}

function daysToMilliseconds(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

const productNameDuration = daysToMilliseconds(30 * 6);

export function updateProductNameScrapperCounter(name: string) {
  return redis.incr(`scrapper-product:${name}`);
}
