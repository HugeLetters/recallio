import { tw } from "@/styles/tw";
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
export function Image({ children, className, onLoad, ...props }: ImageProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const showFallback = !props.src || !hasLoaded;

  return (
    <>
      {showFallback && children}
      {hasTruthyProperty(props, "src") && (
        <NextImage
          {...props}
          onLoad={(e) => {
            setHasLoaded(true);
            onLoad?.(e);
          }}
          className={tw(showFallback ? "invisible absolute size-0" : className)}
        />
      )}
    </>
  );
}
