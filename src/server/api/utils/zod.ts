import { z } from "zod";

export const coercedStringSchema = z.coerce.string;

export function createMinLengthMessage(name: string, length: number) {
  return `${name} has to be at least ${length} characters long`;
}

export function createMaxLengthMessage(name: string, length: number) {
  return `${name} can't be longer than ${length} characters`;
}

export const trimmedStringSchema = z.string().transform((string) => string.trim());

export function createLongTextSchema(name: string, maxLength: number) {
  return trimmedStringSchema.refine(
    (value) => value.length >= 1 && value.length <= maxLength,
    `${name} has to be between 1 and ${maxLength} characters long`,
  );
}
