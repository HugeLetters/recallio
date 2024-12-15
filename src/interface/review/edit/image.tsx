import { blobToFile, useBlobUrl } from "@/image/blob";
import { ImagePickerButton } from "@/image/image-picker";
import type { CropDimensions } from "@/image/utils";
import { crop as cropImage } from "@/image/utils";
import { toast } from "@/interface/toast";
import { ImagePreview } from "@/product/components";
import type { Model } from "@/state/type";
import { tw } from "@/styles/tw";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ResetIcon from "~icons/custom/reset";
import DeleteIcon from "~icons/fluent-emoji-high-contrast/cross-mark";
import type { ReviewForm } from ".";

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

// todo - cleanup
export function useReviewImage(src: ReviewForm["image"]) {
  const [rawValue, setRawValue] = useState<ImageState>(ImageAction.KEEP);
  const [cropArea, setCropArea] = useState<CropDimensions | null>(null);

  useEffect(() => {
    reset();
  }, [src]);

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
    dependencies: { image: rawImage, crop: cropArea },
    async queryFn({ image, crop }) {
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
  const key = ["__client", domain, dependencies] as const;
  const client = useQueryClient();

  return useQuery({
    queryKey: key,
    queryFn({ queryKey: [_, __, deps] }) {
      client.removeQueries({ exact: true, queryKey: key });
      return queryFn(deps);
    },
    staleTime: Infinity,
    networkMode: "always",
    structuralSharing: false,
    keepPreviousData: true,
    retry: 3,
    retryDelay: 0,
  });
}
