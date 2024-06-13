export async function createDrawingContext(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw Error("Couldn't get canvas 2D context");
  }

  return {
    bitmap,
    canvas,
    ctx,
  };
}

export function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp");
  });
}
