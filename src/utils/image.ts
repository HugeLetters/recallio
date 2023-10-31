import { browser } from ".";

export async function compressImage(file: File, targetBytes: number): Promise<File | null> {
  if (!browser) throw Error("This function is browser only");

  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (file.size < targetBytes) {
    return drawImage(image, 1, ctx, canvas).then((blob) =>
      blob ? blobToFile(blob, file.name) : null
    );
  }

  const checkedSizeSet = new Set([file.size]);
  let bestImage: Blob | null = null;

  for (let currentImage: Blob | null = file, i = 0; currentImage && i < 15; i++) {
    currentImage = await drawImage(image, getScale(currentImage.size, targetBytes), ctx, canvas);
    if (!currentImage || checkedSizeSet.has(currentImage.size)) break;
    checkedSizeSet.add(currentImage.size);

    if (currentImage.size < targetBytes && (!bestImage || currentImage.size > bestImage.size)) {
      bestImage = currentImage;
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
  image: ImageBitmap,
  scale: number,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width /= scale;
  canvas.height /= scale;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp");
  });
}
