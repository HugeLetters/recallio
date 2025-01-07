import { QueryErrorHandler } from "@/error/query";
import { blobToFile, useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import { crop as cropImage } from "@/image/utils";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
import { asyncStateOptions } from "@/state/async";
import { tw } from "@/styles/tw";
import { clamp } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducer, useState } from "react";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import CropIcon from "~icons/ph/crop-bold";
import type { ReviewForm } from ".";

export enum ImageAction {
  KEEP = "KEEP",
  DELETE = "DELETE",
}

export type ImageState = File | ImageAction;

interface AttachedImageProps {
  value: ImageState;
  image: File | null;
  setImage: (value: File) => void;
  deleteImage: () => void;
  resetImage: () => void;
  crop: CropModel;
  savedImage: ReviewForm["image"];
  rawImage: File | null;
}
export function AttachedImage(p: AttachedImageProps) {
  const isDeleting = p.value === ImageAction.DELETE;

  const rawImageSrc = useBlobUrl(p.rawImage ?? undefined) ?? (!isDeleting ? p.savedImage : null);
  const imageSrc = useBlobUrl(p.image ?? undefined) ?? rawImageSrc;

  const isImagePicked = p.value instanceof File;

  const isImageSet: boolean = !isDeleting && (!!p.image || !!p.savedImage);
  const canReset: boolean = isDeleting && !!p.savedImage;
  const canDelete: boolean = isImageSet;
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
              "absolute -right-3 top-0 size-6 rounded-full bg-neutral-100 p-1.5 shadow-around sa-o-20 sa-r-1",
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
            {canDelete ? <DeleteIcon className="size-full" /> : <ResetIcon className="size-full" />}
          </button>
        )}

        {isImageSet && (
          <Dialog.Root>
            <Dialog.Trigger
              className="absolute -right-3 bottom-0 size-6 rounded-full bg-neutral-100 p-1 text-neutral-950 shadow-around sa-o-20 sa-r-1"
              aria-label="Crop image"
            >
              <CropIcon className="size-full" />
            </Dialog.Trigger>
          </Dialog.Root>
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
export function useReviewImage(source: ReviewForm["image"]) {
  const client = useQueryClient();

  const [rawValue, setRawValue] = useState<ImageState>(ImageAction.KEEP);

  const { data: sourceImage } = useQuery(
    asyncStateOptions({
      client,
      domain: "review_image",
      dependencies: source,
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
        return sourceImage ?? null;
      case ImageAction.DELETE:
        return null;
      default:
        return rawValue satisfies File;
    }
  }
  const rawImage = getRawImage();

  const [cropArea, dispatchCropArea] = useReducer(cropAreaReducer, null);
  const imageQuery = useQuery({
    ...asyncStateOptions({
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
          const bitmap = await createImageBitmap(source);

          const widthRatio = crop.right - crop.left;
          const heightRatio = crop.bottom - crop.top;

          output = await cropImage({
            image: bitmap,
            width: widthRatio * bitmap.width,
            height: heightRatio * bitmap.height,
            left: crop.left * bitmap.width,
            top: crop.top * bitmap.height,
          }).then((blob) => blobToFile(blob, source.name));
        }

        return output;
      },
    }),
    meta: {
      error: new QueryErrorHandler(() => {
        toast.error("Failed to update image");
      }),
    },
  });
  const image: File | null = imageQuery.data ?? rawImage;

  function getValue(): ImageState {
    switch (rawValue) {
      case ImageAction.KEEP:
      case ImageAction.DELETE:
        return rawValue;
      default: {
        if (image === sourceImage) {
          return ImageAction.KEEP;
        }

        rawValue satisfies File;
        return image ?? ImageAction.KEEP;
      }
    }
  }
  const value = getValue();

  function reset() {
    setRawValue(ImageAction.KEEP);
    dispatchCropArea({ type: "RESET" });
  }

  return {
    value,
    rawImage,
    image,
    setImage(this: void, image: File) {
      setRawValue(image);
      dispatchCropArea({ type: "RESET" });
    },
    delete(this: void) {
      if (source === null) {
        setRawValue(ImageAction.KEEP);
      } else {
        setRawValue(ImageAction.DELETE);
      }
      dispatchCropArea({ type: "RESET" });
    },
    reset,
    effects: {
      /** Values between `0` and `1` */
      crop: {
        value: cropArea,
        dispatch(action: CropAction) {
          dispatchCropArea(action);

          if (rawImage !== null) {
            setRawValue(rawImage);
          }
        },
      },
    },
  };
}

type CropResizeDirection = "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
type CropResizeAction = {
  type: "RESIZE";
  direction: CropResizeDirection;
  /** Absolute coordinate of the edge from `0` to `1` */
  value: number;
};
type CropMoveDirection = "VERTICAL" | "HORIZONTAL";
type CropMoveAction = {
  type: "MOVE";
  direction: CropMoveDirection;
  /** Absolute coordinate of the center from `0` to `1` */
  value: number;
};
type CropResetAction = {
  type: "RESET";
};
type CropAction = CropResizeAction | CropMoveAction | CropResetAction;

type CropCoordinates = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
type CropArea = CropCoordinates | null;
export type CropModel = ReturnType<typeof useReviewImage>["effects"]["crop"];

const CROP_AREA_THRESHOLD = 0.1;
const DEFAULT_CROP_AREA: CropCoordinates = {
  left: 0,
  right: 1,
  top: 0,
  bottom: 1,
};

function cropAreaReducer(current: CropArea, action: CropAction): CropArea {
  switch (action.type) {
    case "RESET":
      return null;
    case "RESIZE": {
      const result = cropAreaResizeReducer(current ?? DEFAULT_CROP_AREA, action);

      if (result.left <= 0 && result.top <= 0 && result.right >= 1 && result.bottom >= 1) {
        return null;
      }

      return result;
    }
    case "MOVE": {
      if (current === null) {
        return null;
      }

      return cropAreaMoveReducer(current, action);
    }
    default:
      return current;
  }
}

function cropAreaResizeReducer(
  current: CropCoordinates,
  action: CropResizeAction,
): CropCoordinates {
  switch (action.direction) {
    case "LEFT": {
      const left = clamp(0, action.value, current.right - CROP_AREA_THRESHOLD);
      return { ...current, left };
    }
    case "RIGHT": {
      const right = clamp(current.left + CROP_AREA_THRESHOLD, action.value, 1);
      return { ...current, right };
    }
    case "TOP": {
      const top = clamp(0, action.value, current.bottom - CROP_AREA_THRESHOLD);
      return { ...current, top };
    }
    case "BOTTOM": {
      const bottom = clamp(current.top + CROP_AREA_THRESHOLD, action.value, 1);
      return { ...current, bottom };
    }
    default:
      return current;
  }
}

function cropAreaMoveReducer(current: CropCoordinates, action: CropMoveAction): CropCoordinates {
  switch (action.direction) {
    case "HORIZONTAL": {
      const center = (current.right + current.left) / 2;
      const movemenet = action.value - center;

      const left = current.left + movemenet;
      if (left < 0) {
        return { ...current, left: 0, right: current.right - current.left };
      }

      const right = current.right + movemenet;
      if (right > 1) {
        return { ...current, right: 1, left: 1 + current.left - current.right };
      }

      return { ...current, left, right };
    }
    case "VERTICAL": {
      const center = (current.top + current.bottom) / 2;
      const movemenet = action.value - center;

      const top = current.top + movemenet;
      if (top < 0) {
        return { ...current, top: 0, bottom: current.bottom - current.top };
      }

      const bottom = current.bottom + movemenet;
      if (bottom > 1) {
        return { ...current, bottom: 1, top: 1 + current.top - current.bottom };
      }

      return { ...current, top, bottom };
    }
    default:
      return current;
  }
}

function hashFile(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}
