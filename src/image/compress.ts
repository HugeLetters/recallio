import { browser } from "@/browser";
import { blobToFile } from "./blob";
import { createDrawingContext } from "./canvas";

type CompressionOptions = { targetBytes: number; maxResolution?: number };
export async function compressImage(
  file: File,
  { targetBytes, maxResolution }: CompressionOptions,
): Promise<File | null> {
  if (!browser) throw Error("This function is browser-only");

  const drawImage = await createImageDrawer(file, maxResolution);
  const webpImage = await drawImage(1);
  if (!webpImage) return null;
  if (webpImage.size <= targetBytes) {
    return blobToFile(webpImage, file.name);
  }

  let bestFit: Blob | null = null;
  for (let i = 2, scale = 0.5; i <= 11; i++) {
    const image = await drawImage(scale);
    if (!image) break;

    const step = 0.5 ** i;
    if (image.size > targetBytes) {
      scale -= step;
      continue;
    }
    scale += step;

    if (!bestFit) {
      bestFit = image;
      continue;
    }

    if (image.size <= bestFit.size) continue;

    bestFit = image;
    if (bestFit.size >= targetBytes * 0.95) break;
  }

  if (!bestFit) return null;
  return blobToFile(bestFit, file.name);
}

async function createImageDrawer(file: File, maxResolution?: number) {
  const { bitmap, canvas, ctx } = await createDrawingContext(file);
  const baseScale = maxResolution
    ? Math.min(maxResolution / Math.max(bitmap.width, bitmap.height), 1)
    : 1;
  return function (scale: number) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = bitmap.width * baseScale * scale;
    canvas.height = bitmap.height * baseScale * scale;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp");
    });
  };
}
