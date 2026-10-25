import { list } from "@vercel/blob";
import { settings, json } from "../lib/common.js";

// Open /api/health in a browser to check the setup. Shows no secrets.
export async function GET() {
  const s = settings();
  const report = {
    blobStoreConnected: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    eventCodeSet: Boolean(s.eventCode),
    adminKeySet: Boolean(s.adminKey),
    title: s.title,
    blobWorks: false,
    problems: [],
  };
  if (!report.blobStoreConnected) {
    report.problems.push("No Blob store connected: Storage -> Create -> Blob, connect it to this project, then redeploy.");
  } else {
    try {
      await list({ limit: 1 });
      report.blobWorks = true;
    } catch (err) {
      report.problems.push(`Blob store error: ${String(err?.message || err)}`);
    }
  }
  if (!report.eventCodeSet) report.problems.push("EVENT_CODE not set: anyone with the address can upload. Add it under Settings -> Environment Variables, then redeploy.");
  if (!report.adminKeySet) report.problems.push("ADMIN_KEY not set: /admin won't work. Add it under Settings -> Environment Variables, then redeploy.");
  report.ok = report.blobWorks;
  return json(report, report.ok ? 200 : 500);
}
