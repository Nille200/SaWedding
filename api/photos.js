import { list, del } from "@vercel/blob";
import { PREFIX, ID_RE, codeOk, adminOk, nameFromId, json } from "../lib/common.js";

// GET  /api/photos?c=CODE     -> { photos: [{ id, url, t, name }] } oldest first
// DELETE /api/photos?url=...  -> remove one photo (admin key required)
export async function GET(req) {
  if (!codeOk(req)) return json({ error: "bad_code" }, 401);
  try {
    const photos = [];
    let cursor;
    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
      for (const b of page.blobs) {
        const id = b.pathname.slice(PREFIX.length);
        if (!ID_RE.test(id)) continue;
        photos.push({ id, url: b.url, t: Number(id.slice(0, 13)), name: nameFromId(id) });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    photos.sort((a, b) => a.t - b.t);
    return json({ photos });
  } catch (err) {
    console.error("blob list failed", err);
    return json({ error: "storage_failed", detail: String(err?.message || err) }, 500);
  }
}

export async function DELETE(req) {
  if (!adminOk(req)) return json({ error: "bad_admin_key" }, 401);
  const target = new URL(req.url).searchParams.get("url") || "";
  let u;
  try {
    u = new URL(target);
  } catch {
    return json({ error: "bad_url" }, 400);
  }
  const id = decodeURIComponent(u.pathname.replace(/^\//, "")).slice(PREFIX.length);
  if (!u.hostname.endsWith(".blob.vercel-storage.com") || !ID_RE.test(id)) {
    return json({ error: "bad_url" }, 400);
  }
  await del(u.toString());
  return json({ ok: true });
}
