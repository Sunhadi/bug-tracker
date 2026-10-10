import { put, del, head } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export class FileUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileUploadError";
  }
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Object storage belum dikonfigurasi. Set BLOB_READ_WRITE_TOKEN di environment variable."
    );
    this.name = "StorageNotConfiguredError";
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Upload lampiran ke Vercel Blob.
 * Jangan simpan di filesystem lokal: filesystem Vercel tidak permanen.
 */
export async function uploadAttachment(
  file: File,
  bugId: number
): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}> {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new FileUploadError("Ukuran file melebihi batas 5 MB.");
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new FileUploadError(
      "Tipe file tidak diizinkan. Hanya gambar (PNG, JPG, GIF, WebP) dan PDF."
    );
  }

  // Bersihkan nama file dari karakter yang tidak aman untuk path
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `bugs/${bugId}/${Date.now()}-${safeName}`;

  await put(storageKey, file, {
    access: "public",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageKey,
  };
}

export async function deleteAttachment(storageKey: string): Promise<void> {
  if (!isStorageConfigured()) {
    throw new StorageNotConfiguredError();
  }
  await del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
}

/**
 * Ambil URL public dari storage key untuk ditampilkan di UI.
 * Return null kalau storage belum dikonfigurasi atau key tidak ada.
 */
export async function getAttachmentUrl(
  storageKey: string
): Promise<string | null> {
  if (!isStorageConfigured()) return null;
  try {
    const info = await head(storageKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return info.url;
  } catch {
    return null;
  }
}

export { MAX_FILE_SIZE, ALLOWED_TYPES };