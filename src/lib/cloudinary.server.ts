import { createHash } from "crypto";

const CLOUD_NAME = () => process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = () => process.env.CLOUDINARY_API_KEY;
const API_SECRET = () => process.env.CLOUDINARY_API_SECRET;

export function getCloudinaryConfig() {
  const cloud_name = CLOUD_NAME();
  const api_key = API_KEY();
  const api_secret = API_SECRET();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Missing CLOUDINARY env vars");
  }
  return { cloud_name, api_key, api_secret };
}

function sign(params: Record<string, string>, api_secret: string): string {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(sorted + api_secret).digest("hex");
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
}

export async function uploadToCloudinary(
  base64Data: string,
  mime: string,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const { cloud_name, api_key, api_secret } = getCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);

  const params: Record<string, string> = {
    timestamp: String(timestamp),
    folder,
  };
  const signature = sign(params, api_secret);

  const form = new FormData();
  form.append("file", `data:${mime};base64,${base64Data}`);
  form.append("api_key", api_key);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
    { method: "POST", body: form },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Cloudinary error: ${data.error.message}`);
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    format: data.format,
    resource_type: data.resource_type,
  };
}

export function getCloudinaryUrl(publicId: string): string {
  const { cloud_name } = getCloudinaryConfig();
  return `https://res.cloudinary.com/${cloud_name}/auto/upload/${publicId}`;
}
