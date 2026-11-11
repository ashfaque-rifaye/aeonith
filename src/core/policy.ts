import type { Autopilot, BuyerHold, Cents, JobRequest } from "../domain/types.js";

/**
 * The payment policy gate. EVERY PayPal money call goes through `enforce` first.
 * AI can suggest; only this gate (plus PayPal's own limits) decides whether money moves.
 */

export type MoneyAction =
  | { kind: "HOLD"; request: JobRequest; buyer: BuyerHold; amountCents: Cents; maxAuthCents: Cents; autopilot?: Autopilot }
  | { kind: "CAPTURE"; request: JobRequest; buyer: BuyerHold; amountCents: Cents; approvedBy: "buyer" | "admin" | null }
  | { kind: "VOID"; request: JobRequest; buyer: BuyerHold }
  | { kind: "PAYOUT"; request: JobRequest; amountCents: Cents; receiver: string; expectedReceiver: string; capturedTotalCents: Cents }
  | { kind: "REFUND"; request: JobRequest; buyer: BuyerHold; amountCents: Cents };

/** What one unit's PayPal hold must be: the deposit for item pools, otherwise the buyer's private limit. */
export const holdPerUnit = (r: JobRequest, b: BuyerHold): Cents =>
  r.flow === "quotes" && r.award ? (r.award.unitPrices?.[b.id] ?? r.award.priceCents) : (r.depositPerUnitCents ?? b.limitCents);
/** A buyer's own final unit price (catalog pools price each model separately). */
export const priceFor = (r: JobRequest, b: BuyerHold): Cents => r.award?.unitPrices?.[b.id] ?? r.award?.priceCents ?? 0;
/** What one unit's capture must be: the final price, or (deposit pools) the deposit applied to that price. */
export const capturePerUnit = (r: JobRequest, priceCents: Cents): Cents =>
  r.depositPerUnitCents ? Math.min(r.depositPerUnitCents, priceCents) : priceCents;

export class PolicyViolation extends Error {
  constructor(readonly rule: string, message: string) {
    super(`Policy gate blocked: ${message}`);
  }
}

export function enforce(a: MoneyAction): void {
  const deny = (rule: string, msg: string): never => {
    throw new PolicyViolation(rule, msg);
  };
  switch (a.kind) {
    case "HOLD": {
      if (!a.buyer.consentAt) deny("consent", "buyer has not consented to the hold");
      if (a.amountCents !== holdPerUnit(a.request, a.buyer) * a.buyer.units) deny("hold-amount", "hold must equal limit (or deposit) × units (server-computed)");
      if (a.amountCents <= 0) deny("hold-amount", "hold must be positive");
      if (a.amountCents > a.maxAuthCents) deny("max-hold", `hold exceeds the per-person cap`);
      const bookingWinner = a.request.flow === "quotes" && a.request.status === "awarded" && !!a.request.award;
      if (!["open", "bidding"].includes(a.request.status) && !bookingWinner) deny("state", `request is ${a.request.status}`);
      if (a.request.flow === "quotes" && !bookingWinner) deny("state", "quote-first requests are held only when the buyer books the winner");
      if (a.request.autopilotId) {
        // Merchant-initiated hold without the buyer present: only inside the budget and categories they approved.
        if (!a.autopilot || a.autopilot.id !== a.request.autopilotId || a.autopilot.status !== "active" || !a.autopilot.vaultId) deny("autopilot", "no active Autopilot approval for this buyer");
        if (a.amountCents > a.autopilot!.capCents) deny("autopilot-cap", "hold exceeds the buyer's Autopilot budget");
        if (!a.autopilot!.categories.includes(a.request.category)) deny("autopilot-scope", `Autopilot doesn't cover ${a.request.category}`);
      }
      return;
    }
    case "CAPTURE": {
      const award = a.request.award;
      if (!award) deny("award", "no award: nothing to pay for");
      if (!award!.buyersIn.includes(a.buyer.id)) deny("not-in-deal", "buyer is not part of the winning deal");
      if (a.buyer.status !== "held" || !a.buyer.authorizationId) deny("no-hold", "no live authorization");
      if (a.amountCents > (a.buyer.authorizedCents ?? 0)) deny("over-hold", "capture would exceed what the buyer approved");
      const unit = priceFor(a.request, a.buyer);
      if (a.amountCents !== capturePerUnit(a.request, unit) * a.buyer.units) deny("price", "capture must equal the final price (sealed, or the deposit) × units");
      if (unit > a.buyer.limitCents) deny("over-limit", "final price is above the buyer's private limit");
      if (a.request.proof?.verdict !== "pass" && !a.request.buyerConfirmedAt)
        deny("proof", "proof of completion has not passed and the buyer has not confirmed");
      if (!a.approvedBy) deny("approval", "no human approval");
      return;
    }
    case "VOID": {
      if (a.buyer.status !== "held" || !a.buyer.authorizationId) deny("no-hold", "nothing to release");
      return;
    }
    case "PAYOUT": {
      if (a.request.status !== "proving" && a.request.status !== "settled") deny("state", "payout only after capture");
      if (a.receiver !== a.expectedReceiver) deny("payee", "payout receiver is not the verified winning provider");
      if (a.amountCents <= 0 || a.amountCents > a.capturedTotalCents) deny("payout-amount", "payout must be ≤ money actually captured");
      return;
    }
    case "REFUND": {
      if (a.buyer.status !== "captured") deny("state", "nothing captured to refund");
      if (a.amountCents > (a.buyer.capturedCents ?? 0)) deny("over-refund", "refund exceeds captured amount");
      return;
    }
  }
}
