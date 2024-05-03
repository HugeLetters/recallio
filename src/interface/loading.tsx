import { tw } from "@/styles/tw";
import type { UseQueryResult } from "@tanstack/react-query";
import style from "./loading.module.scss";
import type { PropsWithChildren } from "react";

const rootStyle = style.root!;
const errorStyle = style.error!;

// todo - transition out?
type SkeletonProps = { error?: boolean };
export function Skeleton({ error }: SkeletonProps) {
  return <div className={tw("size-full rounded-xl blur-sm", rootStyle, error && errorStyle)} />;
}

type QueryViewProps = { query: Pick<UseQueryResult, "isLoading" | "isError"> };
export function QueryView({ query, children }: PropsWithChildren<QueryViewProps>) {
  if (query.isLoading) return <Skeleton />;
  if (query.isError) return <Skeleton error />;
  return children;
}
