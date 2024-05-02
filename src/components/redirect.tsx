import type { Nullish } from "@/utils/type";
import type { LinkProps } from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

// todo - dont redirect to the same page!
type RedirectProps = { to: LinkProps["href"] };
export function Redirect({ to }: RedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    router.replace(to).catch(console.error);
  }, [router.isReady, router, to]);

  return null;
}

export function asRoute<T extends Nullish<string>>(to: T) {
  return to as Exclude<T, string> | Extract<LinkProps["href"], T>;
}
