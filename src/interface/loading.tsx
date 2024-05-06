import { getErrorMessage } from "@/error";
import { tw } from "@/styles/tw";
import type { UseInfiniteQueryResult, UseQueryResult } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import style from "./loading.module.scss";

const rootStyle = style.root!;
const errorStyle = style.error!;

type SkeletonProps = {
  isLoading: boolean;
  error?: boolean;
  /** only takes effect if `SkeletonProps.error` is true */
  errorMessage?: string;
  className?: string;
};
export function Skeleton({
  isLoading,
  className,
  error,
  children,
  errorMessage,
}: PropsWithChildren<SkeletonProps>) {
  if (!isLoading) return children;

  return (
    <div className={tw("grid rounded-xl", className, rootStyle, error && errorStyle)}>
      <div className="invisible col-start-1 row-start-1">{children}</div>
      {/* todo - if yes, we shouldn't show the modal */}
      {error && errorMessage && (
        <div className="col-start-1 row-start-1 min-w-full break-words p-4 font-bold text-app-red-500">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

type QueryViewProps = PropsWithChildren<{
  query: Pick<UseQueryResult, "isLoading" | "isError" | "error">;
  className?: string;
}>;
export function QueryView({ query, className, children }: QueryViewProps) {
  const message = query.isError ? getErrorMessage(query.error) : undefined;
  return (
    <Skeleton
      isLoading={query.isLoading || query.isError}
      error={query.isError}
      errorMessage={message}
      className={className}
    >
      {children}
    </Skeleton>
  );
}

type InfiniteQueryViewProps = PropsWithChildren<{
  query: Pick<UseInfiniteQueryResult, "isLoading" | "isError" | "error" | "data">;
  className?: string;
}>;
export function InfiniteQueryView({ query, className, children }: InfiniteQueryViewProps) {
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
          errorMessage={getErrorMessage(query.error)}
        />
      )}
    </>
  );
}
