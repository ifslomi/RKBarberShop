import { uploadToFreeHost, type ImageUploadPayload } from "../_imageUpload.js";

function isValidPayload(payload: any): payload is ImageUploadPayload {
  const folderOk = !payload?.folder || ["gcash", "proofs", "barbers"].includes(String(payload.folder));
  return (
    payload &&
    typeof payload.dataUrl === "string" &&
    payload.dataUrl.length > 0 &&
    folderOk &&
    (payload.filename === undefined || typeof payload.filename === "string")
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const payload = req.body || {};
    if (!isValidPayload(payload)) {
      res.status(400).json({ message: "Invalid upload payload" });
      return;
    }

    const url = await uploadToFreeHost(payload);
    res.status(200).json({ url });
  } catch (error) {
    console.error("image upload failed", error);
    const message = error instanceof Error ? error.message : "Image upload failed";
    res.status(502).json({ message });
  }
}
