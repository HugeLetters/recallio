import type { StrictOmit } from "@/utils";
import { forwardRef, type ChangeEventHandler, type HTMLAttributes } from "react";

type ImageInputProps = StrictOmit<HTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange?: ChangeEventHandler<HTMLInputElement>;
  isImageSet: boolean;
};
export default forwardRef<HTMLInputElement, ImageInputProps>(function ImageInput(
  { children, className, onChange, isImageSet, ...inputAttributes },
  ref
) {
  return (
    <label className={`${className} focus-within:outline`}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onChange}
        {...inputAttributes}
        value={isImageSet ? undefined : ""}
        ref={ref}
      />
    </label>
  );
});
