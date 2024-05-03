import type { ExtendPropety } from "@/utils/object";
import { hasTruthyProperty } from "@/utils/object";
import type { Nullish } from "@/utils/type";
import NextImage from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";

type NextImageProps = ComponentPropsWithoutRef<typeof NextImage>;
type ImageProps = ExtendPropety<NextImageProps, "src", Nullish>;
/**
 * `children` props acts as a fallback when image couldn't be loaded
 */
// todo - check fallback on where its used
export function Image({ children, onLoad, onError, ...props }: ImageProps) {
  const [forceFallback, setForceFallback] = useState(false);

  return hasTruthyProperty(props, "src") && !forceFallback ? (
    <NextImage
      onLoad={(e) => {
        setForceFallback(false);
        onLoad?.(e);
      }}
      onError={(e) => {
        setForceFallback(true);
        onError?.(e);
      }}
      {...props}
    />
  ) : (
    children
  );
}
