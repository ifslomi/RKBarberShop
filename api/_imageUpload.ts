const MAX_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;

type UploadFolder = "gcash" | "proofs" | "barbers";

export type ImageUploadPayload = {
  dataUrl: string;
  folder?: UploadFolder;
  filename?: string;
};

function sanitizeUploadFilename(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; base64: string; mimeType: "image/png" | "image/jpeg" | "image/webp" } {
  const m = String(dataUrl).match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) {
    throw new Error("Invalid image format. Use PNG, JPG, or WebP");
  }

  const mimeType = m[1].toLowerCase() as "image/png" | "image/jpeg" | "image/webp";
  const base64 = m[2].replace(/\s+/g, "");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new Error("Uploaded image is empty");
  }
  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Image must be 3MB or smaller");
  }

  return { buffer, base64, mimeType };
}

async function uploadViaImgBB(base64: string, fileName: string): Promise<string> {
  const apiKey = String(process.env.IMGBB_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("IMGBB_API_KEY is not configured");
  }

  const body = new URLSearchParams();
  body.set("image", base64);
  body.set("name", sanitizeUploadFilename(fileName).replace(/\.[a-z0-9]+$/i, ""));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => null) as
    | { data?: { url?: string; display_url?: string }; success?: boolean; error?: { message?: string } }
    | null;
  const url = String(payload?.data?.url || payload?.data?.display_url || "").trim();
  if (!response.ok || !payload?.success || !/^https?:\/\//i.test(url)) {
    throw new Error(payload?.error?.message || "imgbb upload failed");
  }

  return url;
}

async function uploadVia0x0(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), fileName);

  const response = await fetch("https://0x0.st", { method: "POST", body: form });
  const text = (await response.text()).trim();
  if (!response.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(text || "0x0.st upload failed");
  }

  return text;
}

async function uploadViaCatbox(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", new Blob([buffer], { type: mimeType }), fileName);

  const response = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
  const text = (await response.text()).trim();
  if (!response.ok || !/^https?:\/\//i.test(text)) {
    throw new Error(text || "catbox upload failed");
  }

  return text;
}

export async function uploadToFreeHost(payload: ImageUploadPayload): Promise<string> {
  const { buffer, base64, mimeType } = parseImageDataUrl(payload.dataUrl);
  const ext = extensionFromMime(mimeType);
  const baseName = sanitizeUploadFilename(payload.filename || `image-${Date.now()}.${ext}`);
  const fileName = `${payload.folder || "proofs"}-${Date.now()}-${baseName}`;

  const errors: string[] = [];

  try {
    return await uploadViaImgBB(base64, fileName);
  } catch (error) {
    errors.push(`imgbb: ${error instanceof Error ? error.message : "failed"}`);
  }

  try {
    return await uploadViaCatbox(buffer, mimeType, fileName);
  } catch (error) {
    errors.push(`catbox: ${error instanceof Error ? error.message : "failed"}`);
  }

  try {
    return await uploadVia0x0(buffer, mimeType, fileName);
  } catch (error) {
    errors.push(`0x0.st: ${error instanceof Error ? error.message : "failed"}`);
  }

  throw new Error(`All upload providers failed (${errors.join(" | ")})`);
}
