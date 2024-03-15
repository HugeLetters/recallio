import type { NextPage } from "next";
import type { ReactNode } from "react";

export type NextPageWithLayout<Props = unknown, InitialProps = Props> = NextPage<
  Props,
  InitialProps
> & {
  noAuth?: boolean;
  getLayout?: (page: ReactNode) => ReactNode;
};

export type Nullish<T> = T | null | undefined;
