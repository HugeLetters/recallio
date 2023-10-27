import { isNonEmptyString, type MaybePromise } from "@/utils";
import { utapi } from "uploadthing/server";

export function mapUtKeysToUrls<
  T,
  P extends keyof T,
  K extends PropertyKey,
  Image extends Record<K, string | null>
>(list: T[], imageKeyProp: P, imageProp: K): MaybePromise<Array<Omit<T, P> & Image>> {
  const keys = list.reduce<string[]>((acc, el) => {
    const imageKey = el[imageKeyProp];
    if (isNonEmptyString(imageKey)) acc.push(imageKey);
    return acc;
  }, []);

  if (!keys.length) {
    return list.map((element) => {
      const { [imageKeyProp]: _, ...rest } = element;
      return Object.assign(rest, { [imageProp]: null } as Image);
    });
  }

  return utapi.getFileUrls(keys).then((files) => {
    const fileMap = new Map<string, string>();
    for (const file of files) {
      fileMap.set(file.key, file.url);
    }

    return list.map((el) => {
      const { [imageKeyProp]: imageKey, ...summary } = el;
      const result = Object.assign(summary, { [imageProp]: null } as Image);
      if (!isNonEmptyString(imageKey)) return result;

      const image = fileMap.get(imageKey);
      if (!image) return result;

      // @ts-expect-error Typescript knows the type of this prop is null|string yet refuses to let me assign to it :|
      result[imageProp] = image;
      return result;
    });
  });
}
