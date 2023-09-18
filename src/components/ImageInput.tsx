import type { StrictOmit } from "@/utils";
import type { ChangeEventHandler, HTMLAttributes } from "react";

type ImageInputProps = StrictOmit<HTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange?: ChangeEventHandler<HTMLInputElement>;
  isImageSet: boolean;
};
export default function ImageInput({
  children,
  className,
  onChange,
  isImageSet,
  ...inputAttributes
}: ImageInputProps) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="absolute h-0 w-0 opacity-0"
        onChange={onChange}
        {...inputAttributes}
        value={isImageSet ? undefined : ""}
      />
    </label>
  );
}
