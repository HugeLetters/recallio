import { tw } from "@/styles/tw";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useEffect, useRef } from "react";

interface ImageInputProps extends ComponentPropsWithoutRef<"input"> {
  isImageSet: boolean;
}
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
        // android chrome only allows using camera directly if you accept type other than image ¯\_(ツ)_/¯
        accept="image/*,y/y"
        className="sr-only"
        {...inputAttributes}
      />
    </label>
  );
});

export const ImagePickerButton = forwardRef<HTMLInputElement, ImageInputProps>(function _(
  { children, className, ...props },
  ref,
) {
  return (
    <ImagePicker
      ref={ref}
      className={tw(
        "clickable ghost rounded-lg px-4 py-0 text-center outline-1 focus-within:outline-app-green-500",
        className,
      )}
      {...props}
    >
      {children}
    </ImagePicker>
  );
});
