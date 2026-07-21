import { createServerFn } from "@tanstack/react-start";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import {
  ALLOWED_MIME,
  MAX_BYTES,
  extFromMime,
  getR2Client,
  getR2Config,
  safeFolder,
} from "./r2.server";

const InputSchema = z.object({
  folder: z.string().min(1).max(80),
  prefix: z.string().min(0).max(40).regex(/^[a-zA-Z0-9_\-]*$/).optional(),
});

export const uploadToR2 = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    const parsed = InputSchema.parse({
      folder: data.get("folder")?.toString() ?? "",
      prefix: data.get("prefix")?.toString() ?? undefined,
    });
    return { file, folder: parsed.folder, prefix: parsed.prefix };
  })
  .handler(async ({ data }) => {
    const { file, folder, prefix } = data;

    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
      throw new Error(`نوع الملف غير مسموح: ${file.type}`);
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`الحجم أكبر من ${MAX_BYTES / (1024 * 1024)}MB`);
    }

    const client = getR2Client();
    const { bucket, publicUrl } = getR2Config();

    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    const ext = extFromMime(file.type);
    const safePrefix = prefix ? `${prefix}-` : "";
    const key = `${safeFolder(folder)}/${safePrefix}${ts}-${rand}.${ext}`;

    const buf = new Uint8Array(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return { key, url: `${publicUrl}/${key}` };
  });
