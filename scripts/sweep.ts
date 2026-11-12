/**
 * Scheduled PayPal hold maintenance. Runs as a Render cron job (render.yaml: aeonith-hold-sweeper):
 * reauthorizes live holds past PayPal's 3-day honor period and releases holds on requests that closed with no winner.
 *
 *   AEONITH_URL=https://aeonith.onrender.com ADMIN_TOKEN=… npx tsx scripts/sweep.ts
 */
const base = process.env.AEONITH_URL ?? (process.env.AEONITH_HOSTPORT ? `http://${process.env.AEONITH_HOSTPORT}` : "http://localhost:3000");
const res = await fetch(`${base}/api/admin/sweep`, { method: "POST", headers: { "x-admin-token": process.env.ADMIN_TOKEN ?? "" } });
const body = await res.text();
console.log(new Date().toISOString(), res.status, body);
if (!res.ok) process.exit(1);
