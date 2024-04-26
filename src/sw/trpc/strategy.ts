import { FAILED_TO_FETCH_MESSAGE } from "@/error";
import type { ApiRouter } from "@/server/api/router";
import type { NonEmptyArray } from "@/utils/array";
import { includes, isArray } from "@/utils/array";
import { hasProperty, isObject } from "@/utils/object";
import type { Option } from "@/utils/option";
import { isSome } from "@/utils/option";
import type { TRPCErrorResponse } from "@trpc/server/rpc";
import serialize from "fast-json-stable-stringify";
import type { SerwistPlugin, StrategyHandler } from "serwist";
import { Strategy } from "serwist";
import type { QueryPath } from "./type";

export class TrpcStrategy extends Strategy {
  constructor(private paths: NonEmptyArray<QueryPath>) {
    super({
      cacheName: `trpc-cache:${paths.join(",")}`,
      plugins: [trpcStrategyPlugin],
    });
  }

  protected _handle(request: Request, handler: StrategyHandler): Promise<Response | undefined> {
    const { url } = handler;
    const resource = handler.fetch(request);
    if (!url) return resource;

    const route = getRoute(url);
    if (!route) return resource;

    const inputOption = parseInput(url);
    if (!isSome(inputOption)) return resource;

    if (isBatchRequest(url)) {
      return this.handleBatchRequest(resource, route, inputOption.value, handler);
    }

    return this.handleRegularRequest(resource, route, inputOption.value, handler);
  }

  private handleBatchRequest(
    resource: Promise<Response>,
    route: string,
    input: unknown,
    handler: StrategyHandler,
  ) {
    const batchKeys = this.getBatchKeys(route, input);
    return resource
      .then((res) => {
        const resData = res.clone().json();
        const cacheUpdate = resData.then((batch) => {
          if (!isArray(batch)) return;

          const updates = batch.map((data, i) => {
            const key = batchKeys[i];
            if (!key) return;
            if (!isSuccessfulResponse(data)) return;

            return handler.cachePut(key, Response.json(data));
          });
          return Promise.allSettled(updates);
        });
        handler.waitUntil(cacheUpdate).catch(console.error);

        return res;
      })
      .catch(() => {
        const cacheData = batchKeys.map((key) => {
          if (!key) return offlineErrorResponse;

          return handler.cacheMatch(key).then((res) => {
            if (!res) return offlineErrorResponse;

            return res.json();
          });
        });

        return Promise.all(cacheData).then((data) => {
          const isWholeBatch = data.every(isSuccessfulResponse);

          return Response.json(data, {
            status: isWholeBatch ? 200 : 207,
          });
        });
      });
  }

  private getBatchKeys(route: string, rawInput: unknown) {
    const procedureNames = route.split(",");
    const batchInput = isObject(rawInput) ? rawInput : null;
    return procedureNames.map((name, i) => {
      if (!includes(this.paths, name)) return null;

      if (!batchInput || !hasProperty(batchInput, i)) {
        return name;
      }

      return createKey(name, batchInput[i]);
    });
  }

  handleRegularRequest(
    resource: Promise<Response>,
    route: string,
    input: unknown,
    handler: StrategyHandler,
  ) {
    const key = createKey(route, input);
    return resource
      .then((res) => {
        handler.waitUntil(handler.cachePut(key, res.clone())).catch(console.error);
        return res;
      })
      .catch(() => {
        return handler.cacheMatch(key).then((res) => res ?? Response.error());
      });
  }
}

const trpcStrategyPlugin: SerwistPlugin = {
  cacheWillUpdate({ response }) {
    if (response.status !== 200 && response.status !== 207) {
      return null;
    }
    return response;
  },
};

function isBatchRequest(url: URL) {
  return url.searchParams.has("batch");
}

function getRoute(url: URL) {
  const match = url.pathname.match(/(?<=\/api\/trpc\/).+/);
  if (!match) return null;
  return match[0];
}

function parseInput(url: URL): Option<unknown> {
  const input = url.searchParams.get("input");
  if (!input) return { ok: true, value: undefined };
  try {
    const value: unknown = JSON.parse(input);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function createKey(procedure: string, input: unknown) {
  if (input === undefined) return procedure;
  return `${procedure}-${serialize(input)}`;
}

function isSuccessfulResponse(value: unknown): value is Record<"result", unknown> {
  return isObject(value) && hasProperty(value, "result");
}

type OfflineErrorResponse = TRPCErrorResponse<ApiRouter["_def"]["_config"]["$types"]["errorShape"]>;
const offlineErrorResponse: OfflineErrorResponse = {
  error: {
    code: -32008,
    message: FAILED_TO_FETCH_MESSAGE,
    data: { code: "TIMEOUT", httpStatus: 408 },
  },
};
