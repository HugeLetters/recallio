import { includes } from "@/utils/array";
import type { OverridePropeties } from "@/utils/object";
import type { StrictExtract } from "@/utils/type";
import type { Query, QueryCacheNotifyEvent } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useQueryTabSync() {
  const queryClient = useQueryClient();

  // trycatch wrap in case broadcast channel is not supported
  useEffect(() => {
    try {
      const channel = createTypedBroadcastChannel<Message>("query-cache");
      const queryCache = queryClient.getQueryCache();
      const updateLocker = new UpdateLocker();

      const queryCacheUnsubscribe = queryCache.subscribe((ev) => {
        if (updateLocker.locked) return;

        const query = ev.query as Query;
        switch (ev.type) {
          case "updated": {
            const { type, action } = ev;
            if (!includes(trackedUpdateActions, action.type)) return;

            channel.postMessage({
              type,
              key: query.queryKey,
              hash: query.queryHash,
              data: query.state,
            });
            break;
          }
        }
      });

      channel.onmessage = ({ data }) => {
        updateLocker.runUpdate(() => {
          const query = queryCache.get(data.hash);
          switch (data.type) {
            case "updated": {
              if (!query) {
                queryCache.build(queryClient, { queryHash: data.hash }, data.data);
                return;
              }
              query.setState(data.data);
              return;
            }
            default: {
              return data.type satisfies never;
            }
          }
        });
      };
      return () => {
        queryCacheUnsubscribe();
        channel.close();
      };
    } catch (error) {
      console.error(error);
    }
  }, [queryClient]);
}

const trackedUpdateActions = ["success", "invalidate"] satisfies ReadonlyArray<
  StrictExtract<QueryCacheNotifyEvent, { type: "updated" }>["action"]["type"]
>;

type Message = {
  type: StrictExtract<QueryCacheNotifyEvent["type"], "updated">;
  hash: Query["queryHash"];
  key: Query["queryKey"];
  data: Query["state"];
};
type TypedBroadcastChannel<Message> = OverridePropeties<
  BroadcastChannel,
  {
    postMessage: (message: Message) => void;
    onmessage: ((event: MessageEvent<Message>) => void) | null;
  }
>;
function createTypedBroadcastChannel<Message>(name: string): TypedBroadcastChannel<Message> {
  return new BroadcastChannel(name);
}

class UpdateLocker {
  locked = false;
  runUpdate = (cb: () => void) => {
    this.locked = true;
    cb();
    this.locked = false;
  };
}
