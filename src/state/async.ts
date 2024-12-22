import type { QueryClient, UseQueryOptions } from "@tanstack/react-query";

type AsyncStateOptions<TDeps, TOutput> = {
  domain: string;
  dependencies: TDeps;
  queryFn: (input: TDeps) => TOutput | Promise<TOutput>;
  client: QueryClient;
};
export function asyncStateOptions<TInput, TOutput>({
  domain,
  dependencies,
  queryFn,
  client,
}: AsyncStateOptions<TInput, TOutput>): UseQueryOptions<TOutput, unknown, TOutput, typeof key> {
  const key = ["__client", domain, dependencies] as const;
  return {
    queryKey: key,
    async queryFn({ queryKey: [_, __, deps] }) {
      const result = await queryFn(deps);
      setTimeout(() => {
        client.removeQueries({ exact: false, queryKey: ["__client", domain], type: "inactive" });
      }, 500);

      return result;
    },
    staleTime: Infinity,
    networkMode: "always",
    structuralSharing: false,
    keepPreviousData: true,
    retry: 3,
    retryDelay: 0,
  };
}
