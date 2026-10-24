// Wedding photo wall — Cloudflare Worker
// Guests upload photos, a slideshow shows them live. Photos are stored in R2.
//
// Routes (static pages in /public are served automatically before this runs):
//   GET    /api/config          title/subtitle for the pages
//   POST   /api/upload          raw image body, headers: content-type, x-event-code, x-guest-name
//   GET    /api/photos          list of photos (needs event code)
//   DELETE /api/photos/:id      remove a photo (needs admin key)
//   GET    /api/admin/info      event code + links (needs admin key)
//   GET    /photo/:id?c=CODE    the image itself
//   GET    /qr.svg?c=CODE       QR code that points guests to the upload page

import qrcode from "qrcode-generator";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 25 * 1024 * 1024;
const ID_RE = /^\d{13}-[0-9a-f]{8}\.(jpg|png|webp|gif)$/;
const PREFIX = "photos/";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === "/api/config" && req.method === "GET") {
        return json({
          title: env.TITLE || "Our Wedding",
          subtitle: env.SUBTITLE || "",
          requireCode: Boolean(env.EVENT_CODE),
        });
      }

      if (path === "/api/upload" && req.method === "POST") {
        if (!codeOk(req, url, env)) return json({ error: "bad_code" }, 401);
        return upload(req, env);
      }

      if (path === "/api/photos" && req.method === "GET") {
        if (!codeOk(req, url, env)) return json({ error: "bad_code" }, 401);
        return list(env);
      }

      if (path.startsWith("/api/photos/") && req.method === "DELETE") {
        if (!adminOk(req, env)) return json({ error: "bad_admin_key" }, 401);
        const id = decodeURIComponent(path.slice("/api/photos/".length));
        if (!ID_RE.test(id)) return json({ error: "bad_id" }, 400);
        await env.BUCKET.delete(PREFIX + id);
        return json({ ok: true });
      }

      if (path === "/api/admin/info" && req.method === "GET") {
        if (!adminOk(req, env)) return json({ error: "bad_admin_key" }, 401);
        return json({ code: env.EVENT_CODE || "" });
      }

      if (path.startsWith("/photo/") && req.method === "GET") {
        if (!codeOk(req, url, env)) return text("Not allowed", 401);
        return servePhoto(env, decodeURIComponent(path.slice("/photo/".length)), req);
      }

      if (path === "/qr.svg" && req.method === "GET") {
        if (!codeOk(req, url, env)) return text("Not allowed", 401);
        const code = url.searchParams.get("c") || "";
        const target = `${url.origin}/${code ? `?c=${encodeURIComponent(code)}` : ""}`;
        return new Response(qrSvg(target), {
          headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" },
        });
      }

      return text("Not found", 404);
    } catch (err) {
      console.error(err);
      return json({ error: "server_error" }, 500);
    }
  },
};

function codeOk(req, url, env) {
  if (!env.EVENT_CODE) return true;
  if (adminOk(req, env)) return true;
  const given = req.headers.get("x-event-code") || url.searchParams.get("c") || "";
  return safeEqual(given, env.EVENT_CODE);
}

function adminOk(req, env) {
  if (!env.ADMIN_KEY) return false;
  return safeEqual(req.headers.get("x-admin-key") || "", env.ADMIN_KEY);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function upload(req, env) {
  const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json({ error: "unsupported_type" }, 415);

  const length = Number(req.headers.get("content-length") || 0);
  if (!length) return json({ error: "length_required" }, 411);
  if (length > MAX_BYTES) return json({ error: "too_large" }, 413);

  let name = "";
  try {
    name = decodeURIComponent(req.headers.get("x-guest-name") || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
  } catch {
    name = "";
  }

  const rand = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const id = `${String(Date.now()).padStart(13, "0")}-${rand}.${ext}`;

  await env.BUCKET.put(PREFIX + id, req.body, {
    httpMetadata: { contentType: type },
    customMetadata: name ? { name } : {},
  });
  return json({ id }, 201);
}

async function list(env) {
  const photos = [];
  let cursor;
  do {
    const page = await env.BUCKET.list({ prefix: PREFIX, cursor, limit: 1000, include: ["customMetadata"] });
    for (const obj of page.objects) {
      const id = obj.key.slice(PREFIX.length);
      if (!ID_RE.test(id)) continue;
      photos.push({ id, t: Number(id.slice(0, 13)), name: obj.customMetadata?.name || "" });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return json({ photos });
}

async function servePhoto(env, id, req) {
  if (!ID_RE.test(id)) return text("Not found", 404);
  const obj = await env.BUCKET.get(PREFIX + id, { onlyIf: req.headers });
  if (!obj) return text("Not found", 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "private, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}

function qrSvg(data) {
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();
  const n = qr.getModuleCount();
  const margin = 2;
  const size = n + margin * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function text(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
