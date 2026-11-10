import { decideOffer } from "./agents/providers.js";
import type { Agent } from "./ai/agent.js";
import { clear, fmt, toCents } from "./core/clearing.js";
import { commitmentHash, newSalt, verifyReveal } from "./core/commit.js";
import { capturePerUnit, enforce, holdPerUnit, PolicyViolation } from "./core/policy.js";
import { codeChecks, inspectImage, newChallengeCode, verdict } from "./core/proof.js";
import type { BuyerHold, Commitment, JobRequest, Offer, Provider } from "./domain/types.js";
import type { PaymentRail } from "./paypal/rail.js";
import { demandSignal, OfferSchema } from "./protocol/schema.js";
import { newBuyer, newRequest, type Store } from "./store.js";

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface Deps {
  store: Store;
  paypal: PaymentRail;
  agent: Agent;
  providers: Provider[];
  currency: string;
  appBaseUrl: string;
  maxAuthCents: number;
  platformFeePct: number;
}

/**
 * Orchestrates the market loop: funded request → sealed competition → award → proof → settle.
 * Every money movement goes through `enforce` (policy gate) and is written to the hash-chained audit log.
 */
export class Aeonith {
  /** Simulated providers' private salts/offers (their side of commit–reveal). Not visible via any API. */
  private providerVault = new Map<string, { offer: Offer; salt: string; pitch: string }>();

  constructor(private readonly d: Deps) {}

  private get store() {
    return this.d.store;
  }
  private log(actor: string, action: string, data: Record<string, unknown>, rid?: string) {
    this.store.audit.append(actor, action, data, rid);
  }

  req(id: unknown): JobRequest {
    const r = this.store.get(String(id));
    if (!r) throw new HttpError(404, "Request not found");
    return r;
  }

  // ---------- intake ----------

  async createRequest(input: {
    mode: "solo" | "together";
    title: string;
    category: string;
    description: string;
    zip: string;
    licensed: boolean;
    minWarrantyMonths: number;
    completeBy: string;
    buyerName: string;
    limitDollars: number;
    units: number;
    depositDollars?: number;
    closesInHours?: number;
  }) {
    const limitCents = toCents(input.limitDollars);
    if (limitCents <= 0) throw new HttpError(400, "Tell us the most you'd pay per job");
    const r = newRequest({
      mode: input.mode,
      title: input.title.slice(0, 90),
      category: input.category,
      description: input.description.slice(0, 600),
      zip: input.zip.slice(0, 10),
      requirements: { licensed: input.licensed, minWarrantyMonths: input.minWarrantyMonths, completeBy: input.completeBy },
      closesInHours: input.closesInHours ?? (input.mode === "solo" ? 24 : 48),
    });
    if (input.depositDollars) {
      const dep = toCents(input.depositDollars);
      if (dep <= 0 || dep > limitCents) throw new HttpError(400, "Deposit must be positive and no more than your limit");
      r.depositPerUnitCents = dep;
    }
    const b = newBuyer(input.buyerName || "You", limitCents, Math.max(1, Math.min(input.units || 1, 20)));
    r.buyers.push(b);
    this.store.requests.set(r.id, r);
    this.log(`buyer:${b.id}`, "request.created", { mode: r.mode, title: r.title, units: b.units }, r.id);
    this.store.save();
    return { request: r, buyer: b };
  }

  join(rid: unknown, input: { name: string; limitDollars: number; units: number; soloBestDollars?: number }) {
    const r = this.req(rid);
    if (r.mode !== "together") throw new HttpError(400, "Only group requests can be joined");
    if (!["open", "bidding"].includes(r.status)) throw new HttpError(409, `Request is ${r.status}`);
    const b = newBuyer(input.name || "Neighbour", toCents(input.limitDollars), Math.max(1, Math.min(input.units || 1, 5)),
      input.soloBestDollars ? toCents(input.soloBestDollars) : undefined);
    r.buyers.push(b);
    this.log(`buyer:${b.id}`, "request.joined", { units: b.units }, r.id);
    this.store.save();
    return b;
  }

  // ---------- PayPal hold (authorize) ----------

  async startHold(rid: unknown, bid: unknown) {
    const r = this.req(rid);
    const b = r.buyers.find((x) => x.id === String(bid));
    if (!b) throw new HttpError(404, "Buyer not found");
    if (b.status === "held") throw new HttpError(409, "Already held");
    const amountCents = holdPerUnit(r, b) * b.units;
    this.gate({ kind: "HOLD", request: r, buyer: b, amountCents, maxAuthCents: this.d.maxAuthCents }, r.id);
    const order = await this.d.paypal.createAuthorizeOrder({
      amount: fmt(amountCents),
      currency: this.d.currency,
      description: r.depositPerUnitCents ? `Aeonith refundable deposit: ${r.title} (released unless delivered)` : `Aeonith hold: ${r.title} (released unless the job is done)`,
      customId: `${r.id}:${b.id}`,
      returnUrl: `${this.d.appBaseUrl}/paypal/return`,
      cancelUrl: `${this.d.appBaseUrl}/paypal/cancel`,
      requestId: `order-${r.id}-${b.id}-${amountCents}`,
    });
    b.orderId = order.id;
    this.log("paypal", "order.created", { buyerId: b.id, orderId: order.id, amount: fmt(amountCents), intent: "AUTHORIZE" }, r.id);
    this.store.save();
    return order;
  }

  async completeHold(orderId: string) {
    const found = this.store.findBuyerByOrder(orderId);
    if (!found) throw new HttpError(404, "Unknown order");
    const { request: r, buyer: b } = found;
    if (b.status === "held") return { request: r, buyer: b };
    const auth = await this.d.paypal.authorizeOrder(orderId);
    const expected = holdPerUnit(r, b) * b.units;
    const got = toCents(auth.amount);
    if (got !== expected || auth.currency !== this.d.currency) {
      // Never trust an amount we didn't set: release it.
      await this.d.paypal.voidAuthorization(auth.authorizationId, `void-mismatch-${auth.authorizationId}`).catch(() => {});
      b.status = "failed";
      b.note = "Held amount didn't match: released";
      this.log("policy", "hold.rejected", { buyerId: b.id, expected: fmt(expected), got: auth.amount }, r.id);
      this.store.save();
      throw new HttpError(409, "Held amount did not match the request; the hold was released");
    }
    b.status = "held";
    b.authorizationId = auth.authorizationId;
    b.authorizedCents = got;
    b.authorizedAt = new Date().toISOString();
    if (r.status === "open" && r.mode === "solo") r.status = "bidding";
    this.log("paypal", "hold.authorized", { buyerId: b.id, authorizationId: auth.authorizationId, amount: auth.amount, status: auth.status }, r.id);
    this.store.save();
    return { request: r, buyer: b };
  }

  async cancelHold(rid: unknown, bid: unknown) {
    const r = this.req(rid);
    const b = r.buyers.find((x) => x.id === String(bid));
    if (!b) throw new HttpError(404, "Buyer not found");
    if (!["open", "bidding"].includes(r.status)) throw new HttpError(409, "Bidding has closed; ask the admin to release");
    await this.voidOne(r, b, "Buyer cancelled before close");
    this.store.save();
  }

  // ---------- sealed competition ----------

  openBidding(rid: unknown) {
    const r = this.req(rid);
    if (!["open", "bidding"].includes(r.status)) throw new HttpError(409, `Request is ${r.status}`);
    if (!r.buyers.some((b) => b.status === "held")) throw new HttpError(409, "No funded requests yet: approve at least one PayPal hold first");
    r.status = "bidding";
    this.log("engine", "bidding.opened", { signal: demandSignal(r) }, r.id);
    this.store.save();
    return demandSignal(r);
  }

  /** Protocol: a provider commits H(offer|salt). Only the hash is stored. */
  commit(rid: unknown, c: { providerId: string; providerName: string; hash: string }): Commitment {
    const r = this.req(rid);
    if (r.status !== "bidding") throw new HttpError(409, "Not accepting sealed bids right now");
    if (r.commitments.some((x) => x.providerId === c.providerId)) throw new HttpError(409, "This provider already committed");
    // Sybil check: same display name under a different id is suspicious.
    const dupName = r.commitments.find((x) => x.providerName.trim().toLowerCase() === c.providerName.trim().toLowerCase());
    if (dupName) throw new HttpError(409, `Duplicate provider identity: "${c.providerName}" already bid`);
    const commitment = { ...c, hash: c.hash.toLowerCase(), committedAt: new Date().toISOString() };
    r.commitments.push(commitment);
    this.log(`provider:${c.providerId}`, "bid.committed", { hash: commitment.hash }, r.id);
    this.store.save();
    return commitment;
  }

  /** Run the simulated provider agents: each decides privately, keeps its salt, and commits only the hash. */
  async runSimulatedProviders(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "bidding") this.openBidding(rid);
    const signal = demandSignal(r);
    const out: { provider: string; hash: string }[] = [];
    for (const p of this.d.providers) {
      if (r.commitments.some((c) => c.providerId === p.id)) continue;
      const offer = decideOffer(p, signal);
      if (!offer) continue;
      const salt = newSalt();
      const pitch = await this.d.agent.providerPitch(p, signal, offer);
      this.providerVault.set(`${r.id}:${p.id}`, { offer, salt, pitch });
      const c = this.commit(r.id, { providerId: p.id, providerName: p.name, hash: commitmentHash(offer, salt) });
      out.push({ provider: p.name, hash: c.hash });
    }
    return out;
  }

  closeBidding(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "bidding") throw new HttpError(409, `Request is ${r.status}`);
    if (r.commitments.length === 0) throw new HttpError(409, "No sealed bids yet");
    r.status = "revealing";
    this.log("engine", "bidding.closed", { commitments: r.commitments.length }, r.id);
    // Simulated agents reveal now; external agents reveal via the protocol.
    for (const c of r.commitments) {
      const v = this.providerVault.get(`${r.id}:${c.providerId}`);
      if (v) this.reveal(r.id, v);
    }
    this.store.save();
    return r;
  }

  /** Protocol: reveal (offer, salt). Accepted only if it hashes to the earlier commitment. */
  reveal(rid: unknown, body: { offer: Offer; salt: string; pitch: string }) {
    const r = this.req(rid);
    if (r.status !== "revealing") throw new HttpError(409, "Reveals are only accepted after bidding closes");
    const offer = OfferSchema.parse(body.offer);
    if (offer.requestId !== r.id) throw new HttpError(400, "Offer is for a different request");
    const c = r.commitments.find((x) => x.providerId === offer.providerId);
    if (!c) throw new HttpError(409, "No commitment from this provider");
    if (r.reveals.some((x) => x.offer.providerId === offer.providerId)) throw new HttpError(409, "Already revealed");
    const valid = verifyReveal(c.hash, offer, body.salt);
    r.reveals.push({
      offer,
      salt: body.salt,
      pitch: (body.pitch ?? "").slice(0, 600),
      revealedAt: new Date().toISOString(),
      valid,
      rejectReason: valid ? undefined : "Revealed offer does not match the sealed commitment",
    });
    this.log(`provider:${offer.providerId}`, valid ? "bid.revealed" : "bid.reveal_rejected", { priceCents: offer.priceCents, minUnits: offer.minUnits, valid }, r.id);
    this.store.save();
    return valid;
  }

  /** Deterministic clearing + advisory AI review of the winner's promises. */
  async award(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "revealing") throw new HttpError(409, `Request is ${r.status}`);
    const candidates = r.reveals
      .filter((v) => v.valid)
      .map((v) => ({
        offer: v.offer,
        providerName: r.commitments.find((c) => c.providerId === v.offer.providerId)!.providerName,
        committedAt: r.commitments.find((c) => c.providerId === v.offer.providerId)!.committedAt,
      }));
    const award = clear(r.buyers, candidates, r.requirements);
    if (!award) {
      this.log("engine", "award.none", { reason: "No offer met the requirements within buyers' limits" }, r.id);
      await this.releaseAll(r.id, "No offer met the requirements within your limit");
      return r;
    }
    r.award = award;
    r.status = "awarded";
    const winner = r.reveals.find((v) => v.offer.providerId === award.providerId)!;
    r.aiOfferReview = await this.d.agent.reviewOffer(demandSignal(r), winner.offer.promises, winner.pitch);
    this.log("engine", "award.made", { providerId: award.providerId, priceCents: award.priceCents, buyersIn: award.buyersIn.length, buyersOut: award.buyersOut.length }, r.id);
    this.log("ai", "offer.reviewed", { ok: r.aiOfferReview.ok, flags: r.aiOfferReview.flags }, r.id);
    // Buyers below the final price are released immediately: nobody's money stays tied up for nothing.
    for (const o of award.buyersOut) {
      const b = r.buyers.find((x) => x.id === o.buyerId)!;
      if (b.status === "held") await this.voidOne(r, b, o.reason);
    }
    this.store.save();
    return r;
  }

  // ---------- proof of completion ----------

  issueChallenge(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "awarded") throw new HttpError(409, "Challenge is issued after the award");
    r.proof = { code: newChallengeCode(), issuedAt: new Date().toISOString(), checks: [] };
    this.log("engine", "proof.challenge_issued", { code: r.proof.code }, r.id);
    this.store.save();
    return r.proof;
  }

  async submitProof(rid: unknown, input: { imageBase64: string; note: string; skipVision?: boolean }) {
    const r = this.req(rid);
    if (!r.proof || !["awarded", "proving"].includes(r.status)) throw new HttpError(409, "No open proof challenge");
    const buf = Buffer.from(input.imageBase64, "base64");
    if (buf.length < 100) throw new HttpError(400, "Upload a photo of the finished job");
    const facts = inspectImage(buf);
    const checks = codeChecks(facts, r.proof.issuedAt, this.store.photoHashes);
    // Admin-only (checked in the route): synthetic demo photos skip AI vision so they don't spend AI credits;
    // the verdict then needs the buyer's confirmation, exactly as when AI is offline.
    const ai = input.skipVision
      ? { codeVisible: null, matchesJob: null, summary: "Synthetic demo photo: AI vision skipped by admin, buyer confirms.", codeSeen: "" }
      : await this.d.agent.checkCompletion({
      jobTitle: r.title,
      jobDescription: r.description,
      code: r.proof.code,
      note: input.note.slice(0, 500),
      imageBase64: input.imageBase64,
      mime: facts.mime,
    });
    checks.push({ name: "One-time code visible", ok: ai.codeVisible, detail: ai.codeVisible === null ? "Not verified by AI: homeowner checks" : ai.codeVisible ? `Read "${ai.codeSeen}"` : `Expected ${r.proof.code}, saw "${ai.codeSeen || "nothing"}"`, by: "ai" });
    checks.push({ name: "Work matches the job", ok: ai.matchesJob, detail: ai.summary, by: "ai" });
    this.store.photoHashes.add(facts.sha256);
    r.proof = { ...r.proof, submittedAt: new Date().toISOString(), photoSha256: facts.sha256, note: input.note.slice(0, 500), checks, aiSummary: ai.summary, verdict: verdict(checks) };
    r.status = "proving";
    this.log("provider:" + r.award!.providerId, "proof.submitted", { sha256: facts.sha256, verdict: r.proof.verdict, ...(input.skipVision ? { aiVision: "skipped by admin" } : {}) }, r.id);
    this.store.save();
    return r.proof;
  }

  /** Homeowner taps "Confirm job done". Required when the automated proof isn't a clean pass. */
  confirmDone(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "proving") throw new HttpError(409, "Nothing to confirm yet");
    if (r.proof?.verdict === "fail") throw new HttpError(409, "Proof failed: the job can't be confirmed; release or ask for a new proof");
    r.buyerConfirmedAt = new Date().toISOString();
    this.log("buyer", "job.confirmed", {}, r.id);
    this.store.save();
  }

  // ---------- settlement ----------

  async settle(rid: unknown, approvedBy: "buyer" | "admin") {
    const r = this.req(rid);
    if (r.status !== "proving") throw new HttpError(409, "Settle after proof is submitted");
    const award = r.award!;
    const captures: NonNullable<JobRequest["settlement"]>["captures"] = [];
    const voids: NonNullable<JobRequest["settlement"]>["voids"] = [];
    for (const b of r.buyers) {
      if (b.status !== "held") continue;
      if (!award.buyersIn.includes(b.id)) {
        await this.voidOne(r, b, "Not in the winning deal");
        voids.push({ buyerId: b.id, reason: "Not in the winning deal" });
        continue;
      }
      const amount = capturePerUnit(r, award.priceCents) * b.units;
      this.gate({ kind: "CAPTURE", request: r, buyer: b, amountCents: amount, approvedBy }, r.id);
      await this.refreshHoldIfStale(r, b);
      const cap = await this.d.paypal.captureAuthorization(b.authorizationId!, fmt(amount), this.d.currency, `cap-${b.authorizationId}`);
      b.status = "captured";
      b.captureId = cap.id;
      b.capturedCents = amount;
      captures.push({ buyerId: b.id, amountCents: amount, captureId: cap.id });
      this.log("paypal", "hold.captured", { buyerId: b.id, captureId: cap.id, amount: fmt(amount), held: fmt(b.authorizedCents ?? 0), released: fmt((b.authorizedCents ?? 0) - amount), status: cap.status }, r.id);
    }
    const capturedTotal = captures.reduce((s, c) => s + c.amountCents, 0);
    const fee = Math.round((capturedTotal * this.d.platformFeePct) / 100);
    const provider = this.d.providers.find((p) => p.id === award.providerId);
    const receiver = provider?.payoutEmail ?? "";
    let payout: NonNullable<JobRequest["settlement"]>["payout"];
    if (capturedTotal > 0) {
      this.gate({ kind: "PAYOUT", request: r, amountCents: capturedTotal - fee, receiver, expectedReceiver: receiver, capturedTotalCents: capturedTotal }, r.id);
      const p = await this.d.paypal.createPayout({
        receiver,
        amount: fmt(capturedTotal - fee),
        currency: this.d.currency,
        note: r.depositPerUnitCents ? `Aeonith: deposits for delivered "${r.title}" (${captures.length} unit${captures.length === 1 ? "" : "s"})` : `Aeonith: verified job "${r.title}" (${captures.length} home${captures.length === 1 ? "" : "s"})`,
        senderBatchId: `payout-${r.id}`,
      });
      payout = { batchId: p.batchId, amountCents: capturedTotal - fee, feeCents: fee, receiver, status: p.status };
      this.log("paypal", "payout.created", { batchId: p.batchId, amount: fmt(capturedTotal - fee), fee: fmt(fee), receiver }, r.id);
    }
    const balanceDueCents = r.depositPerUnitCents
      ? r.buyers.filter((b) => award.buyersIn.includes(b.id) && b.status === "captured").reduce((s, b) => s + (award.priceCents - (b.capturedCents ?? 0) / b.units) * b.units, 0)
      : undefined;
    if (balanceDueCents) this.log("engine", "balance.due_at_handover", { balance: fmt(balanceDueCents), seller: award.providerName }, r.id);
    r.settlement = { at: new Date().toISOString(), captures, voids, payout, balanceDueCents };
    r.status = "settled";
    this.log(approvedBy, "settlement.approved", { captured: fmt(capturedTotal) }, r.id);
    this.store.save();
    return r;
  }

  async releaseAll(rid: unknown, reason: string) {
    const r = this.req(rid);
    if (r.status === "settled") throw new HttpError(409, "Already settled; use a refund instead");
    for (const b of r.buyers) if (b.status === "held") await this.voidOne(r, b, reason);
    r.status = "released";
    this.log("engine", "request.released", { reason }, r.id);
    this.store.save();
    return r;
  }

  /**
   * PayPal guarantees funds for a 3-day honor period (authorization valid 29 days). If a hold is older than
   * that when the job is proven, reauthorize first so the capture is backed by a fresh guarantee.
   */
  private async refreshHoldIfStale(r: JobRequest, b: BuyerHold, honorMs = 3 * 86400_000) {
    if (!b.authorizationId || !b.authorizedAt || Date.now() - Date.parse(b.authorizedAt) < honorMs) return;
    const re = await this.d.paypal.reauthorize(b.authorizationId, `reauth-${b.authorizationId}`);
    this.log("paypal", "hold.reauthorized", { buyerId: b.id, from: b.authorizationId, to: re.id, status: re.status }, r.id);
    b.authorizationId = re.id;
    b.authorizedAt = new Date().toISOString();
  }

  private async voidOne(r: JobRequest, b: BuyerHold, reason: string) {
    this.gate({ kind: "VOID", request: r, buyer: b }, r.id);
    await this.d.paypal.voidAuthorization(b.authorizationId!, `void-${b.authorizationId}`);
    b.status = "voided";
    b.note = reason;
    this.log("paypal", "hold.voided", { buyerId: b.id, authorizationId: b.authorizationId, reason }, r.id);
  }

  private gate(action: Parameters<typeof enforce>[0], rid: string) {
    try {
      enforce(action);
    } catch (e) {
      if (e instanceof PolicyViolation) {
        this.log("policy", "blocked", { action: action.kind, rule: e.rule, message: e.message }, rid);
        this.store.save();
        throw new HttpError(403, e.message);
      }
      throw e;
    }
  }

  /** Demo of the gate: an "AI" tries to capture more than the hold. The gate blocks it and logs why. */
  tryOvercharge(rid: unknown) {
    const r = this.req(rid);
    const b = r.buyers.find((x) => x.status === "held") ?? r.buyers[0];
    try {
      this.gate({ kind: "CAPTURE", request: r, buyer: b, amountCents: (b.authorizedCents ?? b.limitCents) + 5000, approvedBy: null }, r.id);
      return { blocked: false };
    } catch (e) {
      return { blocked: true, message: (e as Error).message };
    }
  }

  /** Webhook reconciliation: keep our state in line with PayPal's. */
  onWebhook(event: { event_type?: string; resource?: { id?: string } }) {
    const id = event.resource?.id;
    if (!id) return;
    const found = this.store.findBuyerByAuthorization(id);
    if (!found) return;
    const { request: r, buyer: b } = found;
    if (event.event_type === "PAYMENT.AUTHORIZATION.VOIDED" && b.status === "held") {
      b.status = "voided";
      b.note = "Voided at PayPal";
    }
    this.log("paypal", "webhook", { type: event.event_type, authorizationId: id }, r.id);
    this.store.save();
  }
}
