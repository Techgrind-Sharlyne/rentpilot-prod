import fs from "node:fs";
import path from "node:path";
import type { Storage } from "./index";

const baseDir = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve("uploads");

export const localStorage: Storage = {
  async put(objectKey, bytes, contentType) {
    const fullPath = path.join(baseDir, objectKey.replace(/^\/+/, ""));
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, bytes);
    // contentType is ignored locally; Express serves static files
    const base =
      (process.env.APP_BASE_URL?.replace(/\/+$/, "") ||
       `http://${process.env.HOST || (process.platform === "win32" ? "127.0.0.1" : "0.0.0.0")}:${process.env.PORT || 5000}`);
    // local files live under /uploads
    return `${base}/uploads/${objectKey}`;
  }
};
