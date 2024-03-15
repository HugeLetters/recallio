import { Link as RadixLink } from "@radix-ui/react-toolbar";
import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ToolbarLinkProps = ComponentPropsWithoutRef<typeof NextLink>;
export function ToolbarLink({ href, children, ...props }: ToolbarLinkProps) {
  return (
    <NextLink
      passHref
      legacyBehavior
      href={href}
    >
      <RadixLink {...props}>{children}</RadixLink>
    </NextLink>
  );
}
