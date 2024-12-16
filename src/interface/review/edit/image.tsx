import { blobToFile, useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import type { CropDimensions } from "@/image/utils";
import { crop as cropImage } from "@/image/utils";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
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
  const rawImageSrc = useBlobUrl(p.rawImage ?? undefined) ?? p.savedImage;
  const imageSrc = useBlobUrl(p.image ?? undefined) ?? rawImageSrc;

  const isImagePicked = p.state instanceof File;
  const isImagePresent = !!imageSrc || !!p.savedImage;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <ImagePreview
          src={imageSrc}
          size="md"
        />
        {isImagePresent && (
          <button
            type="button"
            className={tw(
              "absolute -right-2 top-0 flex aspect-square size-6 items-center justify-center rounded-full bg-neutral-100 p-1.5",
              imageSrc ? "text-app-red-500" : "text-neutral-950",
            )}
            onClick={() => {
              if (imageSrc) {
                p.deleteImage();
              } else {
                p.resetImage();
              }
            }}
            aria-label={imageSrc ? "Delete image" : "Reset image"}
          >
            {imageSrc ? <DeleteIcon /> : <ResetIcon />}
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
export function useReviewImage(src: ReviewForm["image"]) {
  const [rawValue, setRawValue] = useState<ImageState>(ImageAction.KEEP);
  const [cropArea, setCropArea] = useState<CropDimensions | null>(null);

  const { data: rawImageQueryData } = useAsyncState({
    domain: "review_image",
    dependencies: src,
    queryFn(src) {
      if (src === null) {
        return null;
      }

      return fetch(src)
        .then((res) => res.blob())
        .then((blob) => blobToFile(blob, src));
    },
  });
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

  const imageQuery = useAsyncState({
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
  });
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

type AsyncStateOptions<TDeps, TOutput> = {
  domain: string;
  dependencies: TDeps;
  queryFn: (input: TDeps) => TOutput | Promise<TOutput>;
};

function useAsyncState<TInput, TOutput>({
  domain,
  dependencies,
  queryFn,
}: AsyncStateOptions<TInput, TOutput>) {
  const client = useQueryClient();

  return useQuery({
    queryKey: ["__client", domain, dependencies] as const,
    async queryFn({ queryKey: [_, __, deps] }) {
      const result = await queryFn(deps);
      setTimeout(() => {
        client.removeQueries({ exact: false, queryKey: ["__client", domain], type: "inactive" });
      }, 500);

      return result;
    },
    staleTime: Infinity,
    networkMode: "always",
    structuralSharing: false,
    keepPreviousData: true,
    retry: 3,
    retryDelay: 0,
  });
}

function hashFile(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}
