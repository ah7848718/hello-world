const API_URL = "/api/rpc";

function base64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const base64 = await base64FromBlob(file);
  const mime = file.type || "application/octet-stream";

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fn: "cloudinaryUpload",
      data: { base64, mime, folder },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return { secure_url: json.secure_url, public_id: json.public_id };
}
