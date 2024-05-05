import { tw } from "@/styles/tw";
import type { UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import style from "./loading.module.scss";

const rootStyle = style.root!;
const errorStyle = style.error!;

type SkeletonProps = {
  isLoading: boolean;
  error?: boolean;
  className?: string;
};
export function Skeleton({
  isLoading,
  className,
  error,
  children,
}: PropsWithChildren<SkeletonProps>) {
  if (!isLoading) return children;

  return (
    <div className={tw("rounded-xl", className, rootStyle, error && errorStyle)}>
      <div className="invisible">{children}</div>
    </div>
  );
}

type QueryViewProps = {
  query: Pick<UseQueryResult, "isLoading" | "isError">;
  className?: string;
};
export function QueryView({ query, className, children }: PropsWithChildren<QueryViewProps>) {
  // todo - display error message :thinking:
  return (
    <Skeleton
      isLoading={query.isLoading || query.isError}
      error={query.isError}
      className={className}
    >
      {children}
    </Skeleton>
  );
}

type InfiniteQueryViewProps = {
  query: Pick<UseInfiniteQueryResult, "isLoading" | "isError" | "data">;
  className?: string;
};
export function InfiniteQueryView({
  query,
  className,
  children,
}: PropsWithChildren<InfiniteQueryViewProps>) {
  if (!query.data) {
    return (
      <QueryView
        query={query}
        className={className}
      />
    );
  }

  return (
    <>
      {children}
      {query.isError && (
        <Skeleton
          isLoading
          error
        />
      )}
    </>
  );
}
