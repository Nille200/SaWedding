// Shared helpers for the API routes in /api.
// Settings come from Vercel environment variables:
//   TITLE, SUBTITLE        shown on every page
//   EVENT_CODE             goes in the QR link; without it nobody can upload or see photos
//   ADMIN_KEY              password for /admin
//   BLOB_READ_WRITE_TOKEN  added automatically when you connect a Blob store

export const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const MAX_BYTES = 4_400_000; // Vercel Functions accept request bodies up to 4.5 MB
export const PREFIX = "photos/";
// photos/<13-digit ms timestamp>-<8 hex>[-<base64url guest name>].<ext>
export const ID_RE = /^\d{13}-[0-9a-f]{8}(?:-[A-Za-z0-9_-]{1,220})?\.(jpg|png|webp|gif)$/;

const env = (k) => (process.env[k] || "").trim();

export function settings() {
  return {
    title: env("TITLE") || "Our Wedding",
    subtitle: env("SUBTITLE"),
    eventCode: env("EVENT_CODE"),
    adminKey: env("ADMIN_KEY"),
  };
}

export function adminOk(req) {
  const { adminKey } = settings();
  if (!adminKey) return false;
  return safeEqual(req.headers.get("x-admin-key") || "", adminKey);
}

export function codeOk(req) {
  const { eventCode } = settings();
  if (!eventCode) return true;
  if (adminOk(req)) return true;
  const given = req.headers.get("x-event-code") || new URL(req.url).searchParams.get("c") || "";
  return safeEqual(given, eventCode);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function encodeName(name) {
  return name ? Buffer.from(name, "utf8").toString("base64url") : "";
}

export function nameFromId(id) {
  const m = id.match(/^\d{13}-[0-9a-f]{8}-([A-Za-z0-9_-]+)\./);
  if (!m) return "";
  try {
    return Buffer.from(m[1], "base64url").toString("utf8");
  } catch {
    return "";
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
