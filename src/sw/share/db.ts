import { blobToDataUrl } from "@/image/blob";
import { ignore } from "@/utils";
import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";

type DefineDbSchema<Schema extends DBSchema> = Schema;
type ShareFileDBSchema = DefineDbSchema<{ "share-file": { value: string; key: string } }>;
export function getDB() {
  return openDB("share-file", 1, {
    upgrade(db: IDBPDatabase<ShareFileDBSchema>) {
      if (db.objectStoreNames.contains("share-file")) {
        db.deleteObjectStore("share-file");
      }
      db.createObjectStore("share-file");
    },
  });
}

const SHARE_FILE_KEY = "share-file";
export function updateShareTarget(image: Blob) {
  return Promise.all([getDB(), blobToDataUrl(image)]).then(([db, dataUrl]) => {
    return db.put("share-file", dataUrl, SHARE_FILE_KEY).then(ignore);
  });
}

export function consumeShareTarget() {
  return getDB().then(async (db) => {
    const tx = db.transaction("share-file", "readwrite", { durability: "relaxed" });
    const shareTarget = await tx.db.get("share-file", SHARE_FILE_KEY);
    await tx.db.delete("share-file", SHARE_FILE_KEY);
    await tx.done;
    return shareTarget;
  });
}
