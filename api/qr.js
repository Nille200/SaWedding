import qrcode from "qrcode-generator";
import { codeOk } from "../lib/common.js";

// QR code pointing guests to the upload page. Served at /qr.svg?c=CODE (see vercel.json).
export function GET(req) {
  if (!codeOk(req)) return new Response("Not allowed", { status: 401 });
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const code = url.searchParams.get("c") || "";
  const target = `${proto}://${host}/${code ? `?c=${encodeURIComponent(code)}` : ""}`;

  const qr = qrcode(0, "M");
  qr.addData(target);
  qr.make();
  const n = qr.getModuleCount();
  const m = 2;
  const size = n + m * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=600" } });
}
