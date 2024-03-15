import { browser } from "@/browser";
import { blobToFile } from "./blob";

export async function compressImage(file: File, targetBytes: number): Promise<File | null> {
  if (!browser) throw Error("This function is browser-only");

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Couldn't get canvas 2D context");

  const drawImage = function (scale: number) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp");
    });
  };

  const webpImage = await drawImage(1);
  if (!webpImage) return null;
  if (webpImage.size <= targetBytes) {
    return blobToFile(webpImage, file.name);
  }

  let bestFit: Blob | null = null;
  for (let i = 2, scale = 0.5; i <= 11; i++) {
    const image = await drawImage(scale);
    if (!image) break;

    if (image.size <= targetBytes) {
      const isBetterFit = !bestFit || image.size > bestFit.size;
      if (isBetterFit) {
        bestFit = image;

        const isAcceptable = bestFit.size <= targetBytes && bestFit.size >= targetBytes * 0.95;
        if (isAcceptable) break;
      }

      scale += 1 / 2 ** i;
    } else {
      scale -= 1 / 2 ** i;
    }
  }

  if (!bestFit) return null;
  return blobToFile(bestFit, file.name);
}
