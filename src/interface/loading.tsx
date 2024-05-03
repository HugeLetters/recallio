import { tw } from "@/styles/tw";
import type { UseQueryResult } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import style from "./loading.module.scss";

const rootStyle = style.root!;
const errorStyle = style.error!;

// todo - transition out?
type SkeletonProps = { error?: boolean };
export function Skeleton({ error, children }: PropsWithChildren<SkeletonProps>) {
  return (
    <div className={tw("size-full rounded-xl blur-sm", rootStyle, error && errorStyle)}>
      {children}
    </div>
  );
}

type QueryViewProps = { query: Pick<UseQueryResult, "isLoading" | "isError"> };
export function QueryView({ query, children }: PropsWithChildren<QueryViewProps>) {
  if (query.isLoading) return <Skeleton />;
  if (query.isError) return <Skeleton error />;
  return children;
}
