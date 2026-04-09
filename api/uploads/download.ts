const ALLOWED_UPLOAD_HOSTS = new Set([
  "i.ibb.co",
  "ibb.co",
  "iili.io",
  "files.catbox.moe",
  "0x0.st",
]);

function sanitizeDownloadFilename(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "download-file";
}

function parseAndValidateRemoteUrl(urlValue: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new Error("Invalid download URL");
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Only HTTP(S) download URLs are allowed");
  }

  if (!ALLOWED_UPLOAD_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Download host is not allowed");
  }

  return parsed;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const rawUrl = String(req.query?.url || "").trim();
    const fileName = sanitizeDownloadFilename(String(req.query?.filename || "download-file"));
    if (!rawUrl) {
      res.status(400).send("Missing 'url' query parameter");
      return;
    }

    const parsedUrl = parseAndValidateRemoteUrl(rawUrl);
    const upstream = await fetch(parsedUrl.toString());
    if (!upstream.ok) {
      res.status(502).send("Failed to fetch remote file");
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const data = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.status(200).send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    res.status(400).send(message);
  }
}
