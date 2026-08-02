import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

export interface StorageProvider {
  save(relativeDir: string, fileName: string, data: Buffer): Promise<string>;
  read(storedPath: string): Promise<Buffer>;
  delete(storedPath: string): Promise<void>;
}

class LocalFsStorageProvider implements StorageProvider {
  async save(relativeDir: string, fileName: string, data: Buffer): Promise<string> {
    const dir = path.join(STORAGE_ROOT, relativeDir);
    await mkdir(dir, { recursive: true });
    const uniqueName = `${randomUUID()}-${sanitizeFileName(fileName)}`;
    const fullPath = path.join(dir, uniqueName);
    await writeFile(fullPath, data);
    return path.join(relativeDir, uniqueName);
  }

  async read(storedPath: string): Promise<Buffer> {
    return readFile(path.join(STORAGE_ROOT, storedPath));
  }

  async delete(storedPath: string): Promise<void> {
    await unlink(path.join(STORAGE_ROOT, storedPath));
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
}

export const storage: StorageProvider = new LocalFsStorageProvider();

export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
