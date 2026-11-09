/**
 * End-to-end demo driver. Runs every user flow through the public HTTP API (exactly what the UI calls),
 * checks each result, and leaves the app full of realistic Austin, TX jobs in every state:
 *   settled (solo, electrical) · settled (solo, HVAC, with a blocked overcharge attempt) · settled (group, gutters)
 *   released (no bid within the limit) · in progress (cleaning, pro booked) · fresh (Maria's water heater, for a live demo)
 *   item pools: five buyers, one car model, one dealership ($500 refundable deposits) · eight parents, one Chromebook order
 *
 * Works in both PayPal modes:
 *   - simulated: holds are approved automatically through the local stand-in.
 *   - sandbox:   prints each PayPal approval link and waits until you approve it as the sandbox buyer.
 *
 * Usage:  npm run dev   (in one terminal)      then      npm run demo
 */
import "dotenv/config";
import { deflateSync } from "node:zlib";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3000";
const ADMIN = process.env.ADMIN_TOKEN ?? "";
let failures = 0;

type Json = Record<string, any>;
async function api(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Json> {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${path} → ${res.status} ${data.error ?? text}`);
  return data;
}
function check(cond: unknown, msg: string) {
  if (cond) console.log(`   ✓ ${msg}`);
  else { failures++; console.log(`   ✗ ${msg}`); }
}
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A real (tiny) PNG with random pixels, so every proof photo has a unique SHA-256. */
function photo(): string {
  const w = 32, h = 24;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = (Math.random() * 255) | 0; }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}

async function hold(rid: string, bid: string, mode: string) {
  const order = await api(`/api/requests/${rid}/buyers/${bid}/hold`, {});
  if (mode === "simulated") {
    await fetch(`${BASE}/paypal/return?token=${order.id}`, { redirect: "manual" });
  } else {
    console.log(`   → Approve as the sandbox buyer: ${order.approveUrl}`);
    for (let i = 0; i < 120; i++) {
      await sleep(5000);
      const r = await api(`/api/requests/${rid}`);
      if (r.buyers.find((b: Json) => b.id === bid)?.status === "held") return;
    }
    throw new Error("Timed out waiting for PayPal approval");
  }
}

async function compete(rid: string) {
  const r0 = await api(`/api/requests/${rid}`);
  if (r0.status === "open") await api(`/api/requests/${rid}/open-bidding`, {});
  const bids = await api(`/api/requests/${rid}/run-providers`, {});
  await api(`/api/requests/${rid}/close-bidding`, {});
  const r = await api(`/api/requests/${rid}/award`, {});
  return { bids, r };
}

async function proveAndPay(rid: string) {
  const ch = await api(`/api/requests/${rid}/challenge`, {});
  const proof = await api(`/api/requests/${rid}/proof`, { imageBase64: photo(), note: `Work complete. Code ${ch.code} in frame.` });
  if (proof.verdict !== "pass") await api(`/api/requests/${rid}/confirm`, {});
  return { ch, proof, r: await api(`/api/requests/${rid}/settle`, { as: "buyer" }) };
}

async function solo(mode: string, s: { title: string; category: string; description: string; licensed: boolean; minWarrantyMonths: number; buyerName: string; limitDollars: number; completeInDays: number }) {
  const completeBy = new Date(Date.now() + s.completeInDays * 86400_000).toISOString().slice(0, 10);
  const { request, buyer } = await api("/api/requests", { mode: "solo", zip: "78704", units: 1, completeBy, ...s });
  await hold(request.id, buyer.id, mode);
  return request.id as string;
}

/** A Together pool: the first buyer creates it, the rest join, then everyone approves their own PayPal hold. */
async function pool(mode: string, s: { title: string; category: string; description: string; licensed: boolean; minWarrantyMonths: number; completeInDays: number; depositDollars?: number; buyers: [string, number, number?][] }) {
  const completeBy = new Date(Date.now() + s.completeInDays * 86400_000).toISOString().slice(0, 10);
  const [[firstName, firstLimit], ...rest] = s.buyers;
  const { request } = await api("/api/requests", { mode: "together", zip: "78704", units: 1, completeBy, title: s.title, category: s.category, description: s.description, licensed: s.licensed, minWarrantyMonths: s.minWarrantyMonths, buyerName: firstName, limitDollars: firstLimit, ...(s.depositDollars ? { depositDollars: s.depositDollars } : {}) });
  for (const [name, limitDollars, soloBestDollars] of rest) await api(`/api/requests/${request.id}/join`, { name, limitDollars, units: 1, ...(soloBestDollars ? { soloBestDollars } : {}) });
  const r = await api(`/api/requests/${request.id}`);
  for (const b of r.buyers) await hold(r.id, b.id, mode);
  return r.id as string;
}

async function main() {
  const health = await api("/api/health");
  console.log(`Aeonith @ ${BASE} · PayPal: ${health.paypal} · AI: ${health.ai}\n`);
  if (!ADMIN) throw new Error("ADMIN_TOKEN missing in .env");
  await api("/api/admin/reset", {}, { "x-admin-token": ADMIN });
  console.log("0. Reset demo data ✓\n");

  // 1. Solo electrical → settled
  console.log("1. Priya: two dead kitchen outlets (solo, electrical, licensed)");
  const e = await solo(health.paypal, { title: "Two kitchen outlets dead after a breaker trip", category: "electrical", description: "GFCI outlets by the sink have no power; breaker reset didn't help. Bouldin Creek, Austin TX 78704.", licensed: true, minWarrantyMonths: 6, buyerName: "Priya N.", limitDollars: 260, completeInDays: 3 });
  const ec = await compete(e);
  check(ec.bids.length === 2, `${ec.bids.length} licensed electricians sealed bids`);
  check(ec.r.award?.priceCents <= 26000, `winner ${ec.r.award?.providerName} at ${usd(ec.r.award?.priceCents)} (≤ $260 limit)`);
  const ep = await proveAndPay(e);
  check(ep.r.status === "settled" && ep.r.settlement.captures[0].amountCents === ec.r.award.priceCents, `captured ${usd(ep.r.settlement.captures[0].amountCents)}, returned ${usd(26000 - ep.r.settlement.captures[0].amountCents)}, payout ${usd(ep.r.settlement.payout.amountCents)}`);

  // 2. Solo HVAC → overcharge blocked → settled
  console.log("\n2. Daniel: furnace won't stay lit (solo, HVAC, 12-month warranty required)");
  const hv = await solo(health.paypal, { title: "Furnace won't stay lit", category: "hvac", description: "Gas furnace ignites then shuts off after ~30s. Probably flame sensor. Travis Heights, Austin TX 78704.", licensed: true, minWarrantyMonths: 12, buyerName: "Daniel R.", limitDollars: 320, completeInDays: 2 });
  const hc = await compete(hv);
  const filtered = hc.r.award?.table.filter((t: Json) => !t.feasible).map((t: Json) => `${t.providerName}: ${t.note}`) ?? [];
  check(hc.r.award?.providerName === "Lakeway Air & Heat", `winner ${hc.r.award?.providerName} at ${usd(hc.r.award?.priceCents)}`);
  check(filtered.length >= 1, `filtered out: ${filtered.join("; ") || "none"}`);
  const block = await api(`/api/requests/${hv}/try-overcharge`, {});
  check(block.blocked, `agent overcharge attempt blocked: ${block.message}`);
  const hp = await proveAndPay(hv);
  check(hp.r.status === "settled", `settled on proof, payout ${usd(hp.r.settlement.payout.amountCents)}`);

  // 3. Group gutters (seeded Maple St) → best-of + below-price release → settled
  console.log("\n3. Maple St: gutter cleaning for 6 homes (Together)");
  const all = await api("/api/requests");
  const g = all.find((r: Json) => r.mode === "together");
  for (const b of g.buyers) await hold(g.id, b.id, health.paypal);
  const gc = await compete(g.id);
  const a = gc.r.award;
  check(a && a.unitsServed >= 5, `group price ${usd(a?.priceCents)}/home for ${a?.unitsServed} homes (solo quote was $160)`);
  check(gc.r.buyers.find((b: Json) => b.name === "Sam W.")?.status === "voided", "Sam ($90 limit) released at award, never charged");
  const gp = await proveAndPay(g.id);
  const caps = gp.r.settlement.captures;
  check(caps.length === a.unitsServed && caps.every((c: Json) => c.amountCents === a.priceCents), `${caps.length} captures at the same price; payout ${usd(gp.r.settlement.payout.amountCents)}`);

  // 4. No feasible bid → everyone released
  console.log("\n4. Jordan: mount a TV for $60 (no bid within limit)");
  const tv = await solo(health.paypal, { title: "Mount a 65\" TV and fix a sticking door", category: "handyman", description: "Drywall mount, cable concealment, plus a bedroom door that sticks. Zilker, Austin TX 78704.", licensed: false, minWarrantyMonths: 0, buyerName: "Jordan T.", limitDollars: 60, completeInDays: 5 });
  const tc = await compete(tv);
  check(tc.r.status === "released" && tc.r.buyers[0].status === "voided", "no bid fit the limit → hold voided, $0 charged");

  // 5. Cleaning → booked, waiting on proof (live in-progress state)
  console.log("\n5. Aisha: move-out deep clean (in progress: pro booked, proof code issued)");
  const cl = await solo(health.paypal, { title: "Move-out deep clean, 2-bed apartment", category: "cleaning", description: "Kitchen, 2 baths, inside oven and fridge, baseboards. South Lamar, Austin TX 78704.", licensed: false, minWarrantyMonths: 0, buyerName: "Aisha K.", limitDollars: 250, completeInDays: 4 });
  const cc = await compete(cl);
  const code = await api(`/api/requests/${cl}/challenge`, {});
  check(cc.r.status === "awarded" && code.code, `booked ${cc.r.award?.providerName} at ${usd(cc.r.award?.priceCents)}; proof code ${code.code}`);

  // 6. Car pool from one dealership → $500 refundable deposits → deposit applied at delivery
  console.log("\n6. Five buyers, one car model, one dealership (item pool, $500 refundable deposits)");
  const car = await pool(health.paypal, {
    title: "5 × 2026 compact hybrid SUV, same trim", category: "vehicles", licensed: true, minWarrantyMonths: 36, completeInDays: 10, depositDollars: 500,
    description: "Same model, XLE-class trim, any colour. Out-the-door price per car incl. dealer fees, excl. tax/title. Austin TX 78704.",
    buyers: [["Ava M.", 33000], ["Ben O.", 32500, 32100], ["Cara L.", 32800], ["Dan V.", 32000], ["Eli S.", 31500]],
  });
  const carHeld = (await api(`/api/requests/${car}`)).buyers.map((b: Json) => b.authorizedCents);
  check(carHeld.every((c: number) => c === 50000), `each buyer holds only a $500 deposit (not a $33k car price)`);
  const vc = await compete(car);
  const carFiltered = vc.r.award?.table.filter((t: Json) => !t.feasible).map((t: Json) => `${t.providerName}: ${t.note}`) ?? [];
  check(vc.r.award?.providerName === "Capital Auto Group", `${vc.bids.length} dealer agents sealed bids; ${vc.r.award?.providerName} wins at ${usd(vc.r.award?.priceCents)}/car for ${vc.r.award?.unitsServed} cars`);
  check(carFiltered.length >= 1, `not chosen: ${carFiltered.join("; ")}`);
  check(vc.r.buyers.find((b: Json) => b.name === "Eli S.")?.status === "voided", "Eli ($31,500 max) released at award, deposit never charged");
  const vp = await proveAndPay(car);
  check(vp.r.settlement.captures.every((c: Json) => c.amountCents === 50000) && vp.r.settlement.balanceDueCents === vc.r.award.unitsServed * (vc.r.award.priceCents - 50000),
    `delivery proven (VIN + code): deposits captured, ${usd(vp.r.settlement.balanceDueCents)} balance due at handover; payout ${usd(vp.r.settlement.payout.amountCents)}`);

  // 7. Bulk items: one Chromebook order for eight parents
  console.log("\n7. Eight parents, one Chromebook order (item pool, full-price holds)");
  const cb = await pool(health.paypal, {
    title: "8 × school Chromebook (same model), delivered", category: "electronics", licensed: false, minWarrantyMonths: 12, completeInDays: 7,
    description: "Same 11.6\" education Chromebook for Grade 5, 12-month warranty, delivered to the PTA room. Austin TX 78704.",
    buyers: [["Nina P.", 300], ["Omar F.", 290], ["Priya N.", 280], ["Quinn J.", 275], ["Rosa D.", 299], ["Sid K.", 270], ["Tess W.", 268], ["Uma B.", 250]],
  });
  const ic = await compete(cb);
  check(ic.r.award?.providerName === "CampusTech Supply" && ic.r.award?.unitsServed === 7, `${ic.r.award?.providerName} wins at ${usd(ic.r.award?.priceCents)} per device for ${ic.r.award?.unitsServed} parents (retail ~$349)`);
  check(ic.r.buyers.find((b: Json) => b.name === "Uma B.")?.status === "voided", "Uma ($250 max) released, never charged");
  const ip = await proveAndPay(cb);
  check(ip.r.status === "settled", `delivery photo proven; ${ip.r.settlement.captures.length} captures, payout ${usd(ip.r.settlement.payout.amountCents)}`);

  // 8. Integrity
  console.log("\n8. Integrity");
  const audit = await api("/api/audit");
  check(audit.verify.ok, `audit chain intact (${audit.verify.length} signed events)`);
  const signals = await api("/protocol/v1/requests");
  check(!JSON.stringify(signals).match(/limit/i), "provider-facing protocol exposes no buyer limits");
  const fresh = (await api("/api/requests")).find((r: Json) => r.title === "Fix leaking water heater");
  check(fresh?.status === "open", "Maria's water heater left fresh for a live demo");

  console.log(`\n${failures ? `✗ ${failures} check(s) failed` : "✓ All flows passed"} · open ${BASE}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
