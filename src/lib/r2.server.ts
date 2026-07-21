// Server-only R2 client. Do NOT import from client code.
import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    const missing = [
      !accountId && "R2_ACCOUNT_ID",
      !accessKeyId && "R2_ACCESS_KEY_ID",
      !secretAccessKey && "R2_SECRET_ACCESS_KEY",
    ].filter(Boolean);
    throw new Error(`Missing R2 env vars: ${missing.join(", ")}`);
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function getR2Config() {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) {
    throw new Error("Missing R2_BUCKET or R2_PUBLIC_URL");
  }
  return { bucket, publicUrl: publicUrl.replace(/\/$/, "") };
}

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function safeFolder(folder: string): string {
  // alphanumeric, dash, underscore, slash only; no leading/trailing slash
  const cleaned = folder.replace(/[^a-zA-Z0-9_\-/]/g, "").replace(/^\/+|\/+$/g, "");
  return cleaned || "uploads";
}

export function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}
