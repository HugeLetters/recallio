import { isNonEmptyString, type MaybePromise } from "@/utils";
import { getFileUrl } from "../uploadthing";

export function mapUtKeysToUrls<
  T,
  P extends keyof T,
  K extends PropertyKey,
  Image extends Record<K, string | null>
>(
  list: T[],
  imageKeyProp: P,
  imageProp: Exclude<K, keyof T>
): MaybePromise<Array<Omit<T, P> & Image>> {
  return list.map((el) => {
    const { [imageKeyProp]: imageKey, ...summary } = el;

    const result = Object.assign(summary, { [imageProp]: null } as Image);
    if (!isNonEmptyString(imageKey)) return result;

    // @ts-expect-error Typescript knows the type of this prop is null|string yet refuses to let me assign to it :|
    result[imageProp] = getFileUrl(imageKey);
    return result;
  });
}
