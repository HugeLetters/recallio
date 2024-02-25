import { Link as RadixLink } from "@radix-ui/react-toolbar";
import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ToolBarLinkProps = ComponentPropsWithoutRef<typeof NextLink>;
export function ToolBarLink({ href, children, ...props }: ToolBarLinkProps) {
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
