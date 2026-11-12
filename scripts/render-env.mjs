// Copies the secret values from your local .env to the Render web service created by render.yaml, then deploys.
//   1. Render dashboard → Account Settings → API Keys → Create API key, and add it to .env as RENDER_API_KEY=…
//   2. node scripts/render-env.mjs            (add --dry-run to see what would be set, without values)
// Values go straight from .env to api.render.com over HTTPS; nothing is printed or written anywhere else.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const KEY = env.RENDER_API_KEY;
if (!KEY) { console.error("Add RENDER_API_KEY=… to .env first (Render → Account Settings → API Keys)."); process.exit(1); }
const dry = process.argv.includes("--dry-run");
const SERVICE = process.env.RENDER_SERVICE ?? "aeonith";
const SECRETS = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "ADMIN_TOKEN", "ANTHROPIC_API_KEY", "NVIDIA_API_KEY", "NVIDIA_CREDITS", "AG_GRID_LICENSE_KEY", "CHANNEL3_API_KEY", "BRYNTUM_LICENSE_KEY"];

async function render(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

const list = await render("GET", `/services?name=${encodeURIComponent(SERVICE)}&limit=20`);
const svc = list.map((x) => x.service).find((s) => s.name === SERVICE);
if (!svc) { console.error(`No Render service named "${SERVICE}". Found: ${list.map((x) => x.service.name).join(", ") || "none"}`); process.exit(1); }
const url = svc.serviceDetails?.url;
console.log(`service ${svc.name} (${svc.id}) ${url ?? ""}`);

const values = { ...Object.fromEntries(SECRETS.filter((k) => env[k]).map((k) => [k, env[k]])), ...(url ? { APP_BASE_URL: url } : {}) };
if (!values.NVIDIA_CREDITS && env.NVIDIA_API_KEY) {
  // Carry over the live credit balance the local server is metering, if it is running.
  try { const h = await (await fetch("http://localhost:3000/api/health")).json(); if (h.aiCreditsLeft != null) values.NVIDIA_CREDITS = String(h.aiCreditsLeft); } catch { /* optional */ }
}
for (const [k, v] of Object.entries(values)) {
  if (dry) { console.log(`would set ${k} (${v.length} chars)`); continue; }
  await render("PUT", `/services/${svc.id}/env-vars/${encodeURIComponent(k)}`, { value: v });
  console.log(`set ${k}`);
}
const missing = SECRETS.filter((k) => !values[k]);
if (missing.length) console.log(`not in .env (left unset): ${missing.join(", ")}`);
if (!dry) { const d = await render("POST", `/services/${svc.id}/deploys`, { clearCache: "do_not_clear" }); console.log(`deploy started: ${d.id ?? "ok"} → ${url}`); }
