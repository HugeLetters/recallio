import { tw } from "@/styles/tw";
import type { UseQueryResult } from "@tanstack/react-query";
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
    <div className={tw("rounded-xl blur-sm", className, rootStyle, error && errorStyle)}>
      <div className="opacity-0">{children}</div>
    </div>
  );
}

type QueryViewProps = {
  query: Pick<UseQueryResult, "isLoading" | "isError">;
  className?: string;
};
export function QueryView({ query, className, children }: PropsWithChildren<QueryViewProps>) {
  return (
    <Skeleton
      isLoading={query.isLoading || query.isLoading}
      error={query.isError}
      className={className}
    >
      {children}
    </Skeleton>
  );
}
