import { useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
import type { Model } from "@/state/type";
import { tw } from "@/styles/tw";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";

// todo - allow to crop already saved images

export enum ImageAction {
  KEEP = "KEEP",
  DELETE = "DELETE",
}

export type ImageState = File | ImageAction;
type FileModel = Model<ImageState>;
interface AttachedImageProps extends FileModel {
  savedImage: string | null;
}
export function AttachedImage({ savedImage, value, setValue }: AttachedImageProps) {
  const isImagePicked = value instanceof File;

  const fileSrc = useBlobUrl(isImagePicked ? value : undefined);
  const src = value === ImageAction.DELETE ? null : fileSrc ?? savedImage;

  const isImagePresent = !!src || !!savedImage;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ImagePreview
          src={src}
          size="md"
        />
        {isImagePresent && (
          <button
            type="button"
            className={tw(
              "absolute -right-2 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5",
              src ? "text-app-red-500" : "text-neutral-950",
            )}
            onClick={() => {
              setValue(src ? ImageAction.DELETE : ImageAction.KEEP);
            }}
            aria-label={src ? "Delete image" : "Reset image"}
          >
            {src ? <DeleteIcon /> : <ResetIcon />}
          </button>
        )}
      </div>
      <ImagePickerButton
        isImageSet={isImagePicked}
        onChange={(e) => {
          const file = e.target.files?.item(0);

          if (file && !file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            e.target.value = "";
            setValue(ImageAction.KEEP);
            return;
          }

          setValue(file ?? ImageAction.KEEP);
        }}
      >
        {src ? "Change image" : "Upload image"}
      </ImagePickerButton>
    </div>
  );
}
