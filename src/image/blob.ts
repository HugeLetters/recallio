import { useEffect, useMemo } from "react";

export function blobToFile(blob: Blob, name: string) {
  const fileExt = blob.type.match(/.+\/(.+$)/)?.at(1) ?? "webp";
  const newFileName = name.includes(".")
    ? name.replace(/(.+\.).+$/, `$1${fileExt}`)
    : `${name}.${fileExt}`;
  return new File([blob], newFileName, { type: "image/" });
}

export function useBlobUrl<B extends Blob | null | undefined>(blob: B) {
  const url = useMemo(() => {
    return typeof blob === "undefined" || blob === null ? blob : URL.createObjectURL(blob);
  }, [blob]);

  useEffect(() => {
    return () => {
      if (!url) return;
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
