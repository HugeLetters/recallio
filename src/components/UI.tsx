import Link from "next/link";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

type ClickableProps<T extends boolean> = { asLink?: T } & ComponentPropsWithoutRef<
  T extends true ? typeof Link : "button"
>;
export function PrimaryButton<T extends boolean = false>({
  asLink,
  className,
  children,
  ...restProps
}: PropsWithChildren<ClickableProps<T>>) {
  const Component = asLink ? Link : "button";

  return (
    // @ts-expect-error TYPESCRIPT SHUT UP, YOU DONT KNOW WHAT ARE YOU TALKING ABOUT
    <Component
      type={!asLink ? "button" : undefined}
      {...restProps}
      className={`rounded-xl bg-app-green px-2.5 py-3.5 text-white ${className}`}
    >
      {children}
    </Component>
  );
}
