/**
 * Registers (or finds) the sandbox webhook for this app and prints the webhook ID to put in PAYPAL_WEBHOOK_ID.
 * Needs a public HTTPS APP_BASE_URL (e.g. the Render URL or an ngrok tunnel).
 * Usage: APP_BASE_URL=https://aeonith.onrender.com npm run webhook:register
 */
import { loadConfig } from "../src/config.js";

const cfg = loadConfig();
if (cfg.paypalMode !== "sandbox") throw new Error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET first");
const url = `${cfg.APP_BASE_URL.replace(/\/$/, "")}/api/webhooks/paypal`;
if (!url.startsWith("https://")) throw new Error(`PayPal needs a public HTTPS URL; got ${url}`);

const basic = Buffer.from(`${cfg.PAYPAL_CLIENT_ID}:${cfg.PAYPAL_CLIENT_SECRET}`).toString("base64");
const tok = await fetch(`${cfg.PAYPAL_BASE_URL}/v1/oauth2/token`, {
  method: "POST",
  headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
}).then((r) => r.json() as Promise<{ access_token: string }>);
const auth = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };

const existing = (await fetch(`${cfg.PAYPAL_BASE_URL}/v1/notifications/webhooks`, { headers: auth }).then((r) => r.json())) as {
  webhooks?: { id: string; url: string }[];
};
const found = existing.webhooks?.find((w) => w.url === url);
if (found) {
  console.log(`Webhook already registered.\nPAYPAL_WEBHOOK_ID=${found.id}`);
  process.exit(0);
}
const events = [
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.AUTHORIZATION.CREATED",
  "PAYMENT.AUTHORIZATION.VOIDED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.PAYOUTSBATCH.SUCCESS",
  "PAYMENT.PAYOUTSBATCH.DENIED",
  "CUSTOMER.DISPUTE.CREATED",
].map((name) => ({ name }));
const res = await fetch(`${cfg.PAYPAL_BASE_URL}/v1/notifications/webhooks`, { method: "POST", headers: auth, body: JSON.stringify({ url, event_types: events }) });
const body = (await res.json()) as { id?: string; message?: string };
if (!res.ok || !body.id) throw new Error(`Webhook registration failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
console.log(`Registered ${url}\nPAYPAL_WEBHOOK_ID=${body.id}`);
