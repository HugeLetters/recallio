import { useDrag } from "@/browser/gesture/drag";
import { QueryErrorHandler } from "@/error/query";
import { Image } from "@/image";
import { blobToFile, useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import { crop as cropImage } from "@/image/utils";
import { Button } from "@/interface/button";
import { DialogOverlay } from "@/interface/dialog";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
import { asyncStateOptions } from "@/state/async";
import { tw } from "@/styles/tw";
import { clamp } from "@/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangeEvent,
  Dispatch,
  PointerEventHandler,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useReducer, useRef, useState } from "react";
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
  const canEdit: boolean = isImageSet;
  const canDelete: boolean = isImageSet;
  const isActionAvailable = canReset || canDelete;

  function setImage(e: ChangeEvent<HTMLInputElement>) {
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
  }

  const [tempCrop, dispatchTempCrop] = useReducer(cropAreaReducer, p.crop.value);
  const tempCropCoordinates: CropCoordinates = tempCrop ?? DEFAULT_CROP_AREA;

  useEffect(() => {
    cropAreaSetter(dispatchTempCrop, p.crop.value);
  }, [p.crop.value]);

  function commitCrop() {
    cropAreaSetter(p.crop.dispatch, tempCrop);
  }

  function syncTempCrop() {
    cropAreaSetter(dispatchTempCrop, p.crop.value);
  }

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

        <Dialog.Root
          onOpenChange={(open) => {
            if (!open) {
              syncTempCrop();
            }
          }}
        >
          {canEdit && (
            <Dialog.Trigger
              className="absolute -right-3 bottom-0 size-6 rounded-full bg-neutral-100 p-1 text-neutral-950 shadow-around sa-o-20 sa-r-1"
              aria-label="Crop image"
            >
              <CropIcon className="size-full" />
            </Dialog.Trigger>
          )}

          <Dialog.Portal>
            <DialogOverlay className="flex items-center justify-center backdrop-blur-sm">
              <Dialog.Content className="flex w-full max-w-app animate-fade-in flex-col gap-4 rounded-3xl bg-white p-5 data-[state=closed]:animate-fade-in-reverse">
                {rawImageSrc && (
                  <CropPreview
                    imageSrc={rawImageSrc}
                    crop={tempCropCoordinates}
                    dispatchCrop={dispatchTempCrop}
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Dialog.Close asChild>
                    <Button className="ghost">Cancel</Button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button
                      className="primary"
                      onClick={commitCrop}
                    >
                      Crop
                    </Button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </DialogOverlay>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <ImagePickerButton
        isImageSet={isImagePicked}
        onChange={setImage}
      >
        {imageSrc ? "Change image" : "Upload image"}
      </ImagePickerButton>
    </div>
  );
}

type DragStart = {
  x: number;
  y: number;
};
type CropPreviewProps = {
  imageSrc: string;
  crop: CropCoordinates;
  dispatchCrop: Dispatch<CropAction>;
};
function CropPreview(p: CropPreviewProps) {
  const dragStartRef = useRef<DragStart | null>(null);
  function getDragStart(): DragStart {
    const value = dragStartRef.current;
    if (value !== null) {
      return value;
    }

    const freshValue = { x: 0, y: 0 };
    dragStartRef.current = freshValue;
    return freshValue;
  }

  function setDragOffset(e: ReactPointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    dragStartRef.current = { x, y };
  }

  const cropContainer = useRef<HTMLDivElement>(null);
  function crateDragCropHandler(cb: (x: number, y: number) => void) {
    return function (e: PointerEvent) {
      const container = cropContainer.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const dragStart = getDragStart();
      const x = (e.clientX - rect.x - dragStart.x) / rect.width;
      const y = (e.clientY - rect.y - dragStart.y) / rect.height;
      return cb(x, y);
    };
  }

  const topLeftDrag = useDrag({
    onDragStart: setDragOffset,
    onDrag: crateDragCropHandler((x, y) => {
      p.dispatchCrop({ type: "RESIZE", direction: "LEFT", value: x });
      p.dispatchCrop({ type: "RESIZE", direction: "TOP", value: y });
    }),
  });
  const topRightDrag = useDrag({
    onDragStart: setDragOffset,
    onDrag: crateDragCropHandler((x, y) => {
      p.dispatchCrop({ type: "RESIZE", direction: "RIGHT", value: x });
      p.dispatchCrop({ type: "RESIZE", direction: "TOP", value: y });
    }),
  });
  const bottomLeftDrag = useDrag({
    onDragStart: setDragOffset,
    onDrag: crateDragCropHandler((x, y) => {
      p.dispatchCrop({ type: "RESIZE", direction: "LEFT", value: x });
      p.dispatchCrop({ type: "RESIZE", direction: "BOTTOM", value: y });
    }),
  });
  const bottomRightDrag = useDrag({
    onDragStart: setDragOffset,
    onDrag: crateDragCropHandler((x, y) => {
      p.dispatchCrop({ type: "RESIZE", direction: "RIGHT", value: x });
      p.dispatchCrop({ type: "RESIZE", direction: "BOTTOM", value: y });
    }),
  });

  const moveDrag = useDrag({
    onDragStart: setDragOffset,
    onDrag: crateDragCropHandler((x, y) => {
      p.dispatchCrop({ type: "MOVE", direction: "HORIZONTAL", value: x });
      p.dispatchCrop({ type: "MOVE", direction: "VERTICAL", value: y });
    }),
  });

  // todo - fix tall images
  return (
    <div className="grid select-none place-items-center">
      <div
        className="relative"
        ref={cropContainer}
      >
        <Image
          src={p.imageSrc}
          width={99999}
          height={99999}
          quality={100}
          priority
          alt=""
          className="object-contain"
        />

        <div
          style={{
            "--l": `${p.crop.left * 100}%`,
            "--t": `${p.crop.top * 100}%`,
            "--r": `${(1 - p.crop.right) * 100}%`,
            "--b": `${(1 - p.crop.bottom) * 100}%`,
          }}
          className="pointer-events-none absolute inset-0 active:pointer-events-auto active:cursor-grabbing"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              style={{
                "--shadow": "0 0 0 9999px rgba(0, 0, 0, 0.4)",
              }}
              className="absolute bottom-[--b] left-[--l] right-[--r] top-[--t] shadow-[shadow:--shadow]"
            />
          </div>

          <div className="absolute bottom-[--b] left-[--l] right-[--r] top-[--t] grid ring-1 ring-black/80 ring-offset-1 ring-offset-white/60">
            <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
              <CropHandle onDrag={topLeftDrag} />
            </div>
            <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2">
              <CropHandle onDrag={topRightDrag} />
            </div>
            <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2">
              <CropHandle onDrag={bottomLeftDrag} />
            </div>
            <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2">
              <CropHandle onDrag={bottomRightDrag} />
            </div>

            <div className="absolute place-self-center">
              <CropHandle onDrag={moveDrag} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type CropCornerProps = {
  onDrag: PointerEventHandler;
};
function CropHandle(p: CropCornerProps) {
  return (
    <button
      tabIndex={-1}
      type="button"
      onPointerDown={p.onDrag}
      className="pointer-events-auto block size-3 cursor-grab outline-none ring-1 ring-black/80 ring-offset-1 ring-offset-white/60 active:cursor-grabbing"
    />
  );
}

// todo - cleanup
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
        dispatch(this: void, action: CropAction) {
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

function cropAreaSetter(dispatch: Dispatch<CropAction>, value: CropArea) {
  if (!value) {
    dispatch({ type: "RESET" });
    return;
  }

  dispatch({ type: "RESIZE", direction: "LEFT", value: value.left });
  dispatch({ type: "RESIZE", direction: "RIGHT", value: value.right });
  dispatch({ type: "RESIZE", direction: "TOP", value: value.top });
  dispatch({ type: "RESIZE", direction: "BOTTOM", value: value.bottom });
}

function hashFile(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}
