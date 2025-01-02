export function createDrawingContext() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw Error("Couldn't get canvas 2D context");
  }

  return {
    canvas,
    ctx,
  };
}

export function canvasToWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp");
  });
}
