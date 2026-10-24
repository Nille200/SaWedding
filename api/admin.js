import { settings, adminOk, json } from "../lib/common.js";

export function GET(req) {
  if (!adminOk(req)) return json({ error: "bad_admin_key" }, 401);
  return json({ code: settings().eventCode });
}
