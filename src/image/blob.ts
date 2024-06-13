import { useEffect, useState } from "react";

export function blobToFile(blob: Blob, name: string) {
  const fileExt = blob.type.match(/.+\/(.+$)/)?.at(1) ?? "webp";
  const newFileName = name.includes(".")
    ? name.replace(/(.+\.).+$/, `$1${fileExt}`)
    : `${name}.${fileExt}`;
  return new File([blob], newFileName, { type: "image/" });
}

function getBlobUrl<B extends Blob | undefined>(blob: B) {
  if (blob === undefined) {
    return blob as B & undefined;
  }

  return URL.createObjectURL(blob) as B extends Blob ? string : never;
}

export function useBlobUrl<B extends Blob | undefined>(blob: B) {
  const [url, setUrl] = useState(() => getBlobUrl(blob));

  useEffect(() => {
    const url = getBlobUrl(blob);
    setUrl(url);

    return () => {
      if (!url) {
        return;
      }

      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return url;
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    reader.addEventListener("load", () => {
      const { result } = reader;
      if (typeof result !== "string") {
        return reject(new Error("Reader result is not a data url"));
      }
      resolve(result);
    });

    reader.addEventListener("error", () => {
      reject(new Error("Couldn't read blob"));
    });
  });
}
