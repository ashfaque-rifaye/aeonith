import type { Award, BuyerHold, CatalogItem, Cents, Offer, Requirements } from "../domain/types.js";

/**
 * Deterministic clearing. No AI here.
 *
 * One rule for both modes (solo is a group of one):
 *  1. Drop offers that don't meet the requirements (licence, warranty, timing).
 *  2. For each remaining offer (price p, minimum units q), the buyers "in" are those with a live hold whose
 *     private limit >= p and who don't already have a better solo quote (best-of guarantee).
 *     The offer is feasible if their units >= q.
 *  3. Pick the feasible offer that maximises total buyer surplus Σ (limit - p) × units.
 *     Ties: more units served, then lower price, then earlier commitment.
 *  4. Everyone in pays the same price p (uniform price). Everyone else is released, never charged.
 *
 * A buyer's limit decides only WHETHER they are in, never WHAT they pay, so there's no reason to under-state it.
 */

export interface CandidateOffer {
  offer: Offer;
  providerName: string;
  committedAt: string;
}

export function meetsRequirements(offer: Offer, req: Requirements): string | null {
  if (req.licensed && !offer.promises.licensed) return "not licensed (licence required)";
  if (offer.promises.warrantyMonths < req.minWarrantyMonths)
    return `warranty ${offer.promises.warrantyMonths} mo < required ${req.minWarrantyMonths} mo`;
  if (req.completeBy && Date.parse(offer.promises.startAt) > Date.parse(req.completeBy)) return "can't start before the deadline";
  if (!(offer.priceCents > 0) || !Number.isInteger(offer.priceCents)) return "invalid price";
  if (!(offer.minUnits >= 1) || !Number.isInteger(offer.minUnits)) return "invalid minimum units";
  return null;
}

/** A buyer's price under a fleet discount: their own model's MSRP minus the sealed discount, whole dollars. */
export function discounted(msrpCents: Cents, bps: number): Cents {
  return Math.round((msrpCents * (10000 - bps)) / 10000 / 100) * 100;
}

/**
 * Catalog pools (several models from one seller): each offer is one sealed discount off MSRP for the whole group.
 * A buyer is in if their own model's discounted price is within their private max. Pick the offer with the most
 * total saving below buyers' limits; ties as above. Same rules otherwise: limits decide only whether you're in.
 */
export function clearCatalog(buyers: BuyerHold[], items: CatalogItem[], candidates: CandidateOffer[], req: Requirements): Award | null {
  const live = buyers.filter((b) => b.status === "held");
  const msrp = (b: BuyerHold) => items.find((i) => i.id === b.itemId)?.msrpCents ?? 0;
  const table: Award["table"] = [];
  let best: { c: CandidateOffer; inIds: string[]; units: number; surplus: Cents; prices: Record<string, Cents> } | null = null;
  for (const c of candidates) {
    const bps = c.offer.discountBps ?? 0;
    const row = { providerId: c.offer.providerId, providerName: c.providerName, priceCents: c.offer.priceCents, minUnits: c.offer.minUnits, eligibleUnits: 0, feasible: false, note: "", surplusCents: 0 };
    const fail = meetsRequirements(c.offer, req);
    if (fail) { row.note = `Filtered: ${fail}`; table.push(row); continue; }
    const prices: Record<string, Cents> = {};
    const inBuyers = live.filter((b) => { const p = discounted(msrp(b), bps); prices[b.id] = p; return msrp(b) > 0 && p <= b.limitCents; });
    const units = inBuyers.reduce((s, b) => s + b.units, 0);
    const surplus = inBuyers.reduce((s, b) => s + (b.limitCents - prices[b.id]) * b.units, 0);
    row.eligibleUnits = units;
    row.surplusCents = surplus;
    row.feasible = units >= c.offer.minUnits && units > 0;
    row.note = row.feasible ? `Feasible: ${(bps / 100).toFixed(1)}% off every model` : `Needs ${c.offer.minUnits} buyers, only ${units} fit their max at ${(bps / 100).toFixed(1)}% off`;
    table.push(row);
    if (!row.feasible) continue;
    const cand = { c, inIds: inBuyers.map((b) => b.id), units, surplus, prices };
    if (!best || better(cand, best)) best = cand;
  }
  if (!best) return null;
  const bps = best.c.offer.discountBps ?? 0;
  const unitPrices = Object.fromEntries(best.inIds.map((id) => [id, best!.prices[id]]));
  const avg = Math.round(best.inIds.reduce((s, id) => s + unitPrices[id], 0) / best.inIds.length);
  const winnerRow = table.find((r) => r.providerId === best!.c.offer.providerId);
  if (winnerRow) winnerRow.note = "Winner";
  const msrpSaving = best.inIds.reduce((s, id) => { const b = live.find((x) => x.id === id)!; return s + (msrp(b) - unitPrices[id]) * b.units; }, 0);
  return {
    providerId: best.c.offer.providerId,
    providerName: best.c.providerName,
    priceCents: avg,
    discountBps: bps,
    unitPrices,
    buyersIn: best.inIds,
    buyersOut: buyers.filter((b) => !best!.inIds.includes(b.id)).map((b) => ({ buyerId: b.id, reason: b.status !== "held" ? "No active PayPal hold" : `Max $${fmt(b.limitCents)} is below $${fmt(best!.prices[b.id] ?? 0)} for their model: released, not charged` })),
    unitsServed: best.units,
    buyerSavingCents: best.surplus,
    reason: `${best.c.providerName} wins with a sealed fleet discount of ${(bps / 100).toFixed(1)}% off MSRP on every model: ${best.units} buyers save $${fmt(msrpSaving)} off sticker in total, each at their own model's price.`,
    table,
  };
}

export function clear(buyers: BuyerHold[], candidates: CandidateOffer[], req: Requirements): Award | null {
  const live = buyers.filter((b) => b.status === "held");
  const table: Award["table"] = [];
  let best: { c: CandidateOffer; inIds: string[]; units: number; surplus: Cents } | null = null;

  for (const c of candidates) {
    const { offer } = c;
    const row = {
      providerId: offer.providerId,
      providerName: c.providerName,
      priceCents: offer.priceCents,
      minUnits: offer.minUnits,
      eligibleUnits: 0,
      feasible: false,
      note: "",
      surplusCents: 0,
    };
    const fail = meetsRequirements(offer, req);
    if (fail) {
      row.note = `Filtered: ${fail}`;
      table.push(row);
      continue;
    }
    const inBuyers = live.filter((b) => eligible(b, offer.priceCents));
    const units = inBuyers.reduce((s, b) => s + b.units, 0);
    const surplus = inBuyers.reduce((s, b) => s + (b.limitCents - offer.priceCents) * b.units, 0);
    row.eligibleUnits = units;
    row.surplusCents = surplus;
    row.feasible = units >= offer.minUnits && units > 0;
    row.note = row.feasible ? "Feasible" : `Needs ${offer.minUnits} units, only ${units} can afford it`;
    table.push(row);
    if (!row.feasible) continue;
    if (!best || better({ c, units, surplus }, best)) best = { c, inIds: inBuyers.map((b) => b.id), units, surplus };
  }

  if (!best) return null;
  const p = best.c.offer.priceCents;
  const winnerRow = table.find((r) => r.providerId === best!.c.offer.providerId);
  if (winnerRow) winnerRow.note = "Winner";
  const buyersOut = buyers
    .filter((b) => !best!.inIds.includes(b.id))
    .map((b) => ({ buyerId: b.id, reason: outReason(b, p) }));
  return {
    providerId: best.c.offer.providerId,
    providerName: best.c.providerName,
    priceCents: p,
    buyersIn: best.inIds,
    buyersOut,
    unitsServed: best.units,
    buyerSavingCents: best.surplus,
    reason:
      `${best.c.providerName} wins at $${fmt(p)} per job: it meets every requirement and gives buyers the most total saving ` +
      `($${fmt(best.surplus)} below their limits) across ${best.units} job${best.units === 1 ? "" : "s"}.`,
    table,
  };
}

function eligible(b: BuyerHold, price: Cents): boolean {
  if (b.limitCents < price) return false;
  if (b.soloBestCents !== undefined && b.soloBestCents < price) return false; // best-of guarantee
  return true;
}

function outReason(b: BuyerHold, price: Cents): string {
  if (b.status !== "held") return "No active PayPal hold";
  if (b.limitCents < price) return `Limit $${fmt(b.limitCents)} is below the final price $${fmt(price)}: released, not charged`;
  if (b.soloBestCents !== undefined && b.soloBestCents < price)
    return `Your solo quote ($${fmt(b.soloBestCents)}) beats the group price: released, keep your solo deal`;
  return "Not included";
}

function better(a: { c: CandidateOffer; units: number; surplus: Cents }, b: { c: CandidateOffer; units: number; surplus: Cents }) {
  if (a.surplus !== b.surplus) return a.surplus > b.surplus;
  if (a.units !== b.units) return a.units > b.units;
  if (a.c.offer.priceCents !== b.c.offer.priceCents) return a.c.offer.priceCents < b.c.offer.priceCents;
  return Date.parse(a.c.committedAt) < Date.parse(b.c.committedAt);
}

export function fmt(c: Cents): string {
  return (c / 100).toFixed(2);
}

export function toCents(dollars: number | string): Cents {
  const n = typeof dollars === "string" ? Number(dollars.replace(/[$,\s]/g, "")) : dollars;
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid amount: ${dollars}`);
  return Math.round(n * 100);
}
