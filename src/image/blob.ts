import { useEffect, useMemo, useRef } from "react";

export function blobToFile(blob: Blob, name: string) {
  const fileExt = blob.type.match(/.+\/(.+$)/)?.at(1) ?? "webp";
  const newFileName = name.includes(".")
    ? name.replace(/(.+\.).+$/, `$1${fileExt}`)
    : `${name}.${fileExt}`;
  return new File([blob], newFileName, { type: "image/" });
}

export function useBlobUrl<B extends Blob | null | undefined>(blob: B) {
  const url = useMemo(
    () => (typeof blob === "undefined" || blob === null ? blob : URL.createObjectURL(blob)),
    [blob],
  );
  const oldUrl = useRef(url);

  useEffect(() => {
    if (oldUrl.current) {
      // timeout so that on unmount it doesn't revoke it before a new element renders
      setTimeout((url) => URL.revokeObjectURL(url), 1000, oldUrl.current);
    }
    oldUrl.current = url;
  }, [url]);

  return url;
}
