import { canvasToWebp, createDrawingContext } from "./canvas";

export type CropDimensions = {
  left: number;
  top: number;
  width: number;
  height: number;
};

interface CropOptions extends CropDimensions {
  image: ImageBitmap;
}

export async function crop({ image, left, top, width, height }: CropOptions) {
  const { canvas, ctx } = createDrawingContext();
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, -left, -top, image.width, image.height);

  const blob = await canvasToWebp(canvas);
  if (!blob) {
    throw new Error("Failed to generate blob");
  }

  return blob;
}
