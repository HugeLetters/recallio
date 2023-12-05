import { browser } from ".";

export async function compressImage(file: File, targetBytes: number): Promise<File | null> {
  if (!browser) throw Error("This function is browser only");

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (file.size < targetBytes) {
    return drawImage(bitmap, 1, ctx, canvas).then((blob) =>
      blob ? blobToFile(blob, file.name) : null,
    );
  }

  const checkedSizeSet = new Set<number>();
  let bestImage: Blob | null = null;

  for (let image: Blob | null = file, i = 0; image && i < 15; i++) {
    image = await drawImage(bitmap, getScale(image.size, targetBytes), ctx, canvas);
    if (!image || checkedSizeSet.has(image.size)) break;
    checkedSizeSet.add(image.size);

    if (image.size < targetBytes && (!bestImage || image.size > bestImage.size)) {
      bestImage = image;
    }

    if (bestImage && bestImage.size > targetBytes * 0.95 && bestImage.size < targetBytes) {
      break;
    }
  }

  return bestImage ? blobToFile(bestImage, file.name) : bestImage;
}

function getScale(value: number, target: number) {
  return Math.sqrt(value / target);
}

function blobToFile(blob: Blob, name: string) {
  const fileExt = blob.type.split("/").at(-1) ?? "webp";
  return new File([blob], name.split(".").slice(0, -1).concat(fileExt).join("."), {
    type: "image/",
  });
}

function drawImage(
  bitmap: ImageBitmap,
  scale: number,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width /= scale;
  canvas.height /= scale;

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp");
  });
}
