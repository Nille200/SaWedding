import { settings, json } from "../lib/common.js";

export function GET() {
  const s = settings();
  return json({ title: s.title, subtitle: s.subtitle, requireCode: Boolean(s.eventCode) });
}
