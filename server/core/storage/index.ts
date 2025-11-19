export interface Storage {
  put(objectKey: string, bytes: Buffer, contentType: string): Promise<string>; // returns public URL
}

async function getStorage(): Promise<Storage> {
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (driver === "s3") {
    const mod = await import("./s3");
    return mod.s3Storage;
  }
  const mod = await import("./local");
  return mod.localStorage;
}

export const storagePromise = getStorage();
