import { tw } from "@/styles/tw";
import type { ExtendPropety } from "@/utils/object";
import { hasTruthyProperty } from "@/utils/object";
import { useDelayed } from "@/utils/time";
import type { Nullish } from "@/utils/type";
import NextImage from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";

type NextImageProps = ComponentPropsWithoutRef<typeof NextImage>;
type ImageProps = ExtendPropety<NextImageProps, "src", Nullish>;
/**
 * `children` props acts as a fallback when image couldn't be loaded or src is not present
 */
export function Image({ children, ...props }: ImageProps) {
  if (!hasTruthyProperty(props, "src")) return children;
  return <ImageWithSrc {...props}>{children}</ImageWithSrc>;
}

type ImageWithSrcProps = NextImageProps;
function ImageWithSrc({ children, className, onLoad, ...props }: ImageWithSrcProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const isDelayDone = useDelayed(50);
  const showFallback = isDelayDone && !hasLoaded;

  return (
    <>
      {showFallback && children}
      <NextImage
        {...props}
        onLoad={(e) => {
          setHasLoaded(true);
          onLoad?.(e);
        }}
        className={tw(showFallback ? "invisible absolute size-0" : className)}
      />
    </>
  );
}
