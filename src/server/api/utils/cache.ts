import type { inferRouterError } from "@trpc/server";
import type { TRPCResponse } from "@trpc/server/rpc";
import type { ApiRouter } from "../router";

type TRPCData = TRPCResponse<unknown, inferRouterError<ApiRouter>>;

type CacheControl = {
  type: "private" | "public";
  maxAge?: number;
  noStore?: boolean;
  swr?: number;
};

const cacheControlSymbol = Symbol("cache-control");
/** This function tags the value with cache control value.
 *
 *  It will convert primitive values to the their respectful boxed values(eg: `number` to `Number`).
 *
 *  `undefined` or `null` will **NOT** be tagged.
 */
export function cachify(options: CacheControl) {
  return function <T>(value: T): T {
    if (value == null) return value;
    return Object.assign(value, { [cacheControlSymbol]: options });
  };
}
function hasCacheControl(value: unknown): value is Record<typeof cacheControlSymbol, CacheControl> {
  return !!value && typeof value === "object" && cacheControlSymbol in value;
}

type OptionResolver<TOption> = (a: TOption, b: TOption) => TOption;
type CacheControlResolver = { [K in keyof CacheControl]-?: OptionResolver<CacheControl[K]> };
const cacheControlResolver: CacheControlResolver = {
  // private takes precedence
  type(a, b) {
    if (a === "private") return a;
    return b;
  },
  // smaller max-age takes precedence
  maxAge(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    return Math.min(a, b);
  },
  // no-store should be always respected
  noStore(a, b) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return a || b;
  },
  // disabled swr takes precedence
  swr(a, b) {
    if (a === undefined || b === undefined) return undefined;
    return Math.min(a, b);
  },
};

export function mergeCacheControl(data: TRPCData[]) {
  let result: CacheControl | null = null;

  for (const response of data) {
    if (!("result" in response)) {
      return null;
    }

    const { data } = response.result;
    if (!hasCacheControl(data)) {
      return null;
    }

    const cacheControl = data[cacheControlSymbol];
    if (!result) {
      result = cacheControl;
      continue;
    }

    result.type = cacheControlResolver.type(cacheControl.type, result.type);
    result.maxAge = cacheControlResolver.maxAge(cacheControl.maxAge, result.maxAge);
    result.noStore = cacheControlResolver.noStore(cacheControl.noStore, result.noStore);
    result.swr = cacheControlResolver.swr(cacheControl.swr, result.swr);
  }

  return result ? createCacheControlHeader(result) : result;
}

function createCacheControlHeader(cacheControl: CacheControl) {
  return [
    cacheControl.type,
    createCacheControlChunk("no-store", cacheControl.noStore),
    createCacheControlChunk("max-age", cacheControl.maxAge),
    createCacheControlChunk("stale-while-revalidate", cacheControl.swr),
  ]
    .filter(Boolean)
    .join(",");
}

function createCacheControlChunk(name: string, value: CacheControl[keyof CacheControl]): string {
  if (value === undefined || value === false) return "";
  if (value === true) return name;
  return `${name}=${value}`;
}
