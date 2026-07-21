import { uploadToR2 } from "./r2-upload.functions";

export interface R2UploadResult {
  key: string;
  url: string;
}

/**
 * يرفع ملف على Cloudflare R2 عبر server function آمنة.
 * - folder: المجلد الهدف (مثلا "products", "receipts")
 * - prefix: prefix اختياري للملف (مثلا productId)
 */
export async function uploadFileToR2(
  file: File,
  folder: string,
  prefix?: string,
): Promise<R2UploadResult> {
  // فحص سريع client-side قبل ما نبعت
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("اختار صورة JPG أو PNG أو WebP");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("الحجم لازم يكون أقل من 5 ميجا");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  if (prefix) fd.append("prefix", prefix);

  return await uploadToR2({ data: fd });
}
