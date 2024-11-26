import { canvasToWebp, createDrawingContext } from "./canvas";

export type CropDimensions = {
  left: number;
  top: number;
  width: number;
  height: number;
};

interface CropOptions extends CropDimensions {
  image: Blob;
}

export async function crop({ image, left, top, width, height }: CropOptions) {
  const { bitmap, canvas, ctx } = await createDrawingContext(image);
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(bitmap, -left, -top, bitmap.width, bitmap.height);

  const blob = await canvasToWebp(canvas);
  if (!blob) {
    throw new Error("Failed to generate blob");
  }

  return blob;
}
