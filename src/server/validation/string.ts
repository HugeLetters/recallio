import { z } from "zod";

export const stringLikeSchema = z.coerce.string;

export function createMinMessage(name: string, length: number) {
  return `${name} has to be at least ${length} characters long`;
}

export function createMaxMessage(name: string, length: number) {
  return `${name} can't be longer than ${length} characters`;
}

export const trimmedSchema = z.string().transform((string) => {
  const trimmed = string.trim();
  if (trimmed.length) return trimmed;
  return null;
});

export function createLongTextSchema(name: string, maxLength: number) {
  return trimmedSchema.refine(
    (value) => !value || (value.length >= 1 && value.length <= maxLength),
    `${name} has to be between 1 and ${maxLength} characters long`,
  );
}
