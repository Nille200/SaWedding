import { put } from "@vercel/blob";
import { TYPES, MAX_BYTES, PREFIX, codeOk, encodeName, json } from "../lib/common.js";
import { randomBytes } from "node:crypto";

// Body is the raw image. Headers: content-type, x-event-code, x-guest-name (URI-encoded).
export async function POST(req) {
  if (!codeOk(req)) return json({ error: "bad_code" }, 401);

  const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json({ error: "unsupported_type" }, 415);

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return json({ error: "too_large" }, 413);

  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length) return json({ error: "empty" }, 400);
  if (body.length > MAX_BYTES) return json({ error: "too_large" }, 413);

  let name = "";
  try {
    name = decodeURIComponent(req.headers.get("x-guest-name") || "")
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 40);
  } catch {
    name = "";
  }

  const stamp = String(Date.now()).padStart(13, "0");
  const rand = randomBytes(4).toString("hex");
  const tag = encodeName(name);
  const id = `${stamp}-${rand}${tag ? `-${tag}` : ""}.${ext}`;

  try {
    const blob = await put(PREFIX + id, body, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return json({ id, url: blob.url }, 201);
  } catch (err) {
    console.error("blob put failed", err);
    return json({ error: "storage_failed", detail: String(err?.message || err) }, 500);
  }
}
