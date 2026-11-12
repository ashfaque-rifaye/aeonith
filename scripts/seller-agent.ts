/**
 * An independent seller agent that lives OUTSIDE Aeonith and bids through the APIMatic-generated SDK.
 * It watches open demand, seals a bid for jobs it can do (commit = SHA-256 hash only), and reveals after bidding closes.
 *
 *   AEONITH_URL=http://localhost:3000 npx tsx scripts/seller-agent.ts
 *   AEONITH_URL=https://aeonith.onrender.com npx tsx scripts/seller-agent.ts
 */
import { SellerAgent } from "../src/agents/sellerSdk.js";
import type { Offer } from "../src/domain/types.js";

const ID = process.env.PROVIDER_ID ?? "sdk-hill-country";
const NAME = process.env.PROVIDER_NAME ?? "Hill Country Plumbing";
const agent = new SellerAgent(ID, NAME);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** Its own pricing: a licensed plumber with a 12-month warranty; fleet dealers quote a discount instead. */
function price(d: Awaited<ReturnType<SellerAgent["openDemand"]>>[number]): Offer | null {
  const start = new Date(Date.now() + 26 * 3600_000);
  start.setUTCHours(14, 0, 0, 0); // 8 AM Central
  const promises = { licensed: true, licenseNo: "M-52210", warrantyMonths: 12, startAt: start.toISOString(), endAt: new Date(start.getTime() + 6 * 3600_000).toISOString() };
  if (d.catalog?.items?.length) return null; // this agent is a plumber, not a dealer
  if (!["plumbing"].includes(String(d.category))) return null;
  return { requestId: d.requestId, providerId: ID, priceCents: 34900, minUnits: 1, promises };
}

const seen = new Set<string>(), revealed = new Set<string>();
log(`${NAME} is watching Aeonith demand via the APIMatic SDK`);
for (;;) {
  try {
    for (const d of await agent.openDemand()) {
      if (d.status === "bidding" && !seen.has(d.requestId)) {
        seen.add(d.requestId);
        const offer = price(d);
        if (!offer) continue;
        const c = await agent.commit(offer, "Licensed master plumber, 12-month warranty, can start tomorrow 8 AM.");
        log(`sealed a bid on "${d.title}" · hash ${c.hash?.slice(0, 16)}…`);
      }
      if (d.status === "revealing" && agent.hasSealed(d.requestId) && !revealed.has(d.requestId)) {
        revealed.add(d.requestId);
        const ok = await agent.reveal(d.requestId);
        log(`revealed on "${d.title}": ${ok ? "matches its hash" : "rejected"}`);
      }
    }
  } catch (e) {
    log("error:", (e as Error).message);
  }
  await new Promise((r) => setTimeout(r, 250));
}
