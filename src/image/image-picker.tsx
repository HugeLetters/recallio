import { tw } from "@/styles/tw";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useEffect, useRef } from "react";

type ImageInputProps = ComponentPropsWithoutRef<"input"> & { isImageSet: boolean };
export const ImagePicker = forwardRef<HTMLInputElement, ImageInputProps>(function _(
  { children, className, isImageSet, ...inputAttributes },
  outerRef,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const ref = outerRef ?? innerRef;
  useEffect(() => {
    if (!("current" in ref) || !ref.current || isImageSet) return;
    ref.current.value = "";
  }, [isImageSet, ref]);

  return (
    <label className={tw("cursor-pointer", className)}>
      {children}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        {...inputAttributes}
      />
    </label>
  );
});
