import { blobToFile, useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import type { CropDimensions } from "@/image/utils";
import { crop as cropImage } from "@/image/utils";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
import { asyncStateOptions } from "@/state/async";
import type { Model } from "@/state/type";
import { tw } from "@/styles/tw";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import type { ReviewForm } from ".";

export enum ImageAction {
  KEEP = "KEEP",
  DELETE = "DELETE",
}

export type ImageState = File | ImageAction;

interface AttachedImageProps {
  state: ImageState;
  image: File | null;
  setImage: (value: File) => void;
  deleteImage: () => void;
  resetImage: () => void;
  crop: Model<CropDimensions | null>;
  savedImage: ReviewForm["image"];
  rawImage: File | null;
}
export function AttachedImage(p: AttachedImageProps) {
  const isDeleting = p.state === ImageAction.DELETE;

  const rawImageSrc = useBlobUrl(p.rawImage ?? undefined) ?? (!isDeleting ? p.savedImage : null);
  const imageSrc = useBlobUrl(p.image ?? undefined) ?? rawImageSrc;

  const isImagePicked = p.state instanceof File;

  const canReset: boolean = isDeleting && !!p.savedImage;
  const canDelete: boolean = !isDeleting && (!!p.image || !!p.savedImage);
  const isActionAvailable = canReset || canDelete;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ImagePreview
          src={imageSrc}
          size="md"
        />
        {isActionAvailable && (
          <button
            type="button"
            className={tw(
              "absolute -right-2 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5",
              canDelete ? "text-app-red-500" : "text-neutral-950",
            )}
            onClick={() => {
              if (canDelete) {
                p.deleteImage();
              } else {
                p.resetImage();
              }
            }}
            aria-label={canDelete ? "Delete image" : "Reset image"}
          >
            {canDelete ? <DeleteIcon /> : <ResetIcon />}
          </button>
        )}
      </div>
      <ImagePickerButton
        isImageSet={isImagePicked}
        onChange={(e) => {
          const file = e.target.files?.item(0) ?? null;

          if (!file) {
            p.resetImage();
            return;
          }

          if (!file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            e.target.value = "";
            p.resetImage();
            return;
          }

          p.setImage(file);
        }}
      >
        {imageSrc ? "Change image" : "Upload image"}
      </ImagePickerButton>
    </div>
  );
}

// todo - cleanup
// ? todo - handle src changes
export function useReviewImage(src: ReviewForm["image"]) {
  const [rawValue, setRawValue] = useState<ImageState>(ImageAction.KEEP);
  const [cropArea, setCropArea] = useState<CropDimensions | null>(null);

  const client = useQueryClient();
  const { data: rawImageQueryData } = useQuery(
    asyncStateOptions({
      client,
      domain: "review_image",
      dependencies: src,
      queryFn(src) {
        if (src === null) {
          return null;
        }

        const file = fetch(src)
          .then((res) => res.blob())
          .then((blob) => blobToFile(blob, src));
        return file;
      },
    }),
  );
  function getRawImage(): File | null {
    switch (rawValue) {
      case ImageAction.KEEP:
        return rawImageQueryData ?? null;
      case ImageAction.DELETE:
        return null;
      default:
        return rawValue satisfies File;
    }
  }
  const rawImage = getRawImage();

  const imageQuery = useQuery(
    asyncStateOptions({
      client,
      domain: "modified_review_image",
      dependencies: { image: rawImage ? hashFile(rawImage) : null, crop: cropArea },
      async queryFn({ crop }) {
        const image = rawImage;
        if (!image) {
          return null;
        }

        let output = image;

        if (crop) {
          const source = output;
          output = await cropImage({
            image: source,
            width: crop.width,
            height: crop.height,
            left: crop.left,
            top: crop.top,
          }).then((blob) => blobToFile(blob, source.name));
        }

        return output;
      },
    }),
  );
  const image: File | null = imageQuery.data ?? rawImage;

  function getValue(): ImageState {
    switch (rawValue) {
      case ImageAction.KEEP:
      case ImageAction.DELETE:
        return rawValue;
      default: {
        rawValue satisfies File;
        return image ?? ImageAction.KEEP;
      }
    }
  }
  const state = getValue();

  function reset() {
    setRawValue(ImageAction.KEEP);
    setCropArea(null);
  }

  return {
    state,
    rawImage,
    image,
    setImage(this: void, image: File) {
      setRawValue(image);
      setCropArea(null);
    },
    delete(this: void) {
      setRawValue(ImageAction.DELETE);
      setCropArea(null);
    },
    reset,
    effects: {
      crop: {
        value: cropArea,
        set(this: void, area: typeof cropArea) {
          setCropArea(area);

          if (area === null || rawImage === null) {
            return;
          }
          setRawValue(rawImage);
        },
      },
    },
  };
}

function hashFile(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}
