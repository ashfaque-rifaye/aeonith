import { createHash, randomUUID } from "node:crypto";
import { offlineDirectory } from "./agents/directory.js";
import { decideOffer } from "./agents/providers.js";
import type { Agent } from "./ai/agent.js";
import { clear, clearCatalog, fmt, toCents } from "./core/clearing.js";
import { commitmentHash, newSalt, verifyReveal } from "./core/commit.js";
import { capturePerUnit, enforce, holdPerUnit, PolicyViolation, priceFor } from "./core/policy.js";
import { codeChecks, inspectImage, newChallengeCode, verdict } from "./core/proof.js";
import type { Autopilot, BuyerHold, CallLog, CatalogItem, Commitment, Consent, JobRequest, Offer, Provider } from "./domain/types.js";
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
    flow?: "quotes" | "funded";
    catalog?: { seller: string; items: CatalogItem[] };
    itemId?: string;
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
    if (input.flow === "quotes" && input.mode === "solo" && !input.depositDollars) r.flow = "quotes";
    if (input.catalog?.items.length) {
      r.catalog = { seller: input.catalog.seller.slice(0, 80), items: input.catalog.items.slice(0, 12) };
      if (input.itemId && !r.catalog.items.some((i) => i.id === input.itemId)) throw new HttpError(400, "Unknown item for this pool");
    }
    const b = newBuyer(input.buyerName || "You", limitCents, Math.max(1, Math.min(input.units || 1, 20)));
    if (r.catalog) b.itemId = input.itemId ?? r.catalog.items[0].id;
    r.buyers.push(b);
    this.store.requests.set(r.id, r);
    this.log(`buyer:${b.id}`, "request.created", { mode: r.mode, title: r.title, units: b.units }, r.id);
    this.store.save();
    return { request: r, buyer: b };
  }

  join(rid: unknown, input: { name: string; limitDollars: number; units: number; soloBestDollars?: number; itemId?: string }) {
    const r = this.req(rid);
    if (r.mode !== "together") throw new HttpError(400, "Only group requests can be joined");
    if (!["open", "bidding"].includes(r.status)) throw new HttpError(409, `Request is ${r.status}`);
    const b = newBuyer(input.name || "Neighbour", toCents(input.limitDollars), Math.max(1, Math.min(input.units || 1, 5)),
      input.soloBestDollars ? toCents(input.soloBestDollars) : undefined);
    if (r.catalog) {
      b.itemId = input.itemId ?? r.catalog.items[0].id;
      if (!r.catalog.items.some((i) => i.id === b.itemId)) throw new HttpError(400, "Unknown item for this pool");
    }
    r.buyers.push(b);
    this.log(`buyer:${b.id}`, "request.joined", { units: b.units, ...(b.itemId ? { item: r.catalog!.items.find((i) => i.id === b.itemId)!.name } : {}) }, r.id);
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
      description: r.depositPerUnitCents ? `Aeonith refundable deposit: ${r.title} (released unless delivered)` : r.flow === "quotes" ? `Aeonith booking: ${r.award?.providerName} for ${r.title} (paid only on proof)` : `Aeonith hold: ${r.title} (released unless the job is done)`,
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
    if (r.status === "open" && r.mode === "solo" && r.flow !== "quotes") r.status = "bidding";
    if (r.flow === "quotes" && r.status === "awarded") r.bookedAt = new Date().toISOString();
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
    if (r.flow !== "quotes" && !r.buyers.some((b) => b.status === "held")) throw new HttpError(409, "No funded requests yet: approve at least one PayPal hold first");
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
    // Quote-first: nobody is held yet; the buyer's private max decides feasibility, the hold follows at booking.
    const pool = r.flow === "quotes" ? r.buyers.map((b) => (b.status === "pending" ? { ...b, status: "held" as const } : b)) : r.buyers;
    const award = r.catalog ? clearCatalog(pool, r.catalog.items, candidates, r.requirements) : clear(pool, candidates, r.requirements);
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
    if (r.autopilotId && !r.bookedAt) throw new HttpError(409, "Autopilot job: the buyer approves the booking on the Voice Agent call first");
    if (r.flow === "quotes" && !r.buyers.some((b) => b.status === "held")) throw new HttpError(409, "Book the winner with PayPal first");
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
      const amount = capturePerUnit(r, priceFor(r, b)) * b.units;
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
    const provider = this.d.providers.find((p) => p.id === award.providerId) ?? r.recruited?.find((p) => p.id === award.providerId);
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
      ? r.buyers.filter((b) => award.buyersIn.includes(b.id) && b.status === "captured").reduce((s, b) => s + (priceFor(r, b) - (b.capturedCents ?? 0) / b.units) * b.units, 0)
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


  // =====================================================================================================
  // Autopilot: a home sensor files AND funds the job on the buyer's vaulted PayPal (merchant-initiated).
  // =====================================================================================================

  async startAutopilot(input: { buyerName: string; zip: string; capDollars: number; categories: string[] }) {
    const capCents = toCents(input.capDollars);
    if (capCents <= 0 || capCents > this.d.maxAuthCents) throw new HttpError(400, `Autopilot budget must be between $1 and $${fmt(this.d.maxAuthCents)}`);
    const a: Autopilot = {
      id: `ap_${randomUUID().slice(0, 8)}`,
      buyerName: input.buyerName.slice(0, 60) || "You",
      zip: input.zip.slice(0, 10),
      capCents,
      categories: input.categories.length ? input.categories : ["plumbing"],
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const st = await this.d.paypal.createVaultSetupToken({
      description: `Aeonith Autopilot: emergency jobs up to $${fmt(capCents)}, held not paid`,
      returnUrl: `${this.d.appBaseUrl}/paypal/vault-return`,
      cancelUrl: `${this.d.appBaseUrl}/paypal/cancel`,
      requestId: `setup-${a.id}`,
    });
    a.setupTokenId = st.id;
    this.store.autopilots.set(a.id, a);
    this.log(`buyer:${a.id}`, "autopilot.requested", { cap: fmt(capCents), categories: a.categories, setupTokenId: st.id }, undefined);
    this.store.save();
    return { autopilot: a, approveUrl: st.approveUrl };
  }

  /** Buyer approved the vault at PayPal: exchange the setup token for a reusable payment token. */
  async completeAutopilot(setupTokenId: string) {
    const a = [...this.store.autopilots.values()].find((x) => x.setupTokenId === setupTokenId);
    if (!a) throw new HttpError(404, "Unknown Autopilot approval");
    if (a.status === "active") return a;
    const pt = await this.d.paypal.createPaymentToken(setupTokenId, `pt-${a.id}`);
    a.vaultId = pt.vaultId;
    a.customerId = pt.customerId;
    a.status = "active";
    a.activatedAt = new Date().toISOString();
    this.log("paypal", "vault.payment_token_created", { autopilotId: a.id, vaultId: pt.vaultId, customerId: pt.customerId }, undefined);
    this.store.save();
    return a;
  }

  revokeAutopilot(id: string) {
    const a = this.store.autopilots.get(id);
    if (!a) throw new HttpError(404, "Unknown Autopilot");
    a.status = "revoked";
    this.log(`buyer:${a.id}`, "autopilot.revoked", {}, undefined);
    this.store.save();
    return a;
  }

  /**
   * A sensor reports a problem. Within the buyer's pre-approved budget, Aeonith files the job, places a PayPal hold on
   * the vaulted wallet (no redirect, buyer asleep), and runs the sealed competition. Booking still waits for the buyer:
   * the Voice Agent calls them to approve before any pro is dispatched.
   */
  async sensorAlert(input: { autopilotId: string; device: string; location: string; reading: string }) {
    const a = this.store.autopilots.get(input.autopilotId);
    if (!a || a.status !== "active") throw new HttpError(409, "Autopilot isn't active: approve it in PayPal first");
    const plumbing = /leak|water|pipe|heater|flood/i.test(`${input.device} ${input.reading}`);
    const category = plumbing ? "plumbing" : /furnace|hvac|temperature|thermostat/i.test(`${input.device} ${input.reading}`) ? "hvac" : "electrical";
    const inDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
    const r = newRequest({
      mode: "solo",
      title: plumbing ? `Water leak: ${input.location}` : `${input.device}: ${input.location}`,
      category,
      description: `Filed automatically by ${input.device} (${input.reading}) at ${input.location}. ZIP ${a.zip}. Emergency: stop the leak and repair.`,
      zip: a.zip,
      requirements: { licensed: true, minWarrantyMonths: 6, completeBy: inDays(2) },
      closesInHours: 2,
    });
    r.autopilotId = a.id;
    r.trigger = { device: input.device.slice(0, 60), location: input.location.slice(0, 60), reading: input.reading.slice(0, 80), at: new Date().toISOString() };
    const b = newBuyer(a.buyerName, a.capCents, 1);
    b.consentAt = a.activatedAt!; // the standing Autopilot approval is the consent for this hold
    r.buyers.push(b);
    const amountCents = holdPerUnit(r, b) * b.units;
    // Gate first: a blocked alert must not leave a job behind.
    this.gate({ kind: "HOLD", request: r, buyer: b, amountCents, maxAuthCents: this.d.maxAuthCents, autopilot: a }, r.id);
    this.store.requests.set(r.id, r);
    this.log(`device:${input.device}`, "sensor.alert", { location: r.trigger.location, reading: r.trigger.reading }, r.id);
    this.log("engine", "request.created", { mode: "solo", title: r.title, by: "autopilot" }, r.id);
    const auth = await this.d.paypal.authorizeWithVault({
      vaultId: a.vaultId!,
      amount: fmt(amountCents),
      currency: this.d.currency,
      description: `Aeonith Autopilot hold: ${r.title} (released unless the job is done)`,
      customId: `${r.id}:${b.id}`,
      requestId: `vauth-${r.id}-${b.id}`,
    });
    if (toCents(auth.amount) !== amountCents) {
      await this.d.paypal.voidAuthorization(auth.authorizationId, `void-mismatch-${auth.authorizationId}`).catch(() => {});
      throw new HttpError(409, "Vaulted hold amount mismatch: released");
    }
    b.status = "held";
    b.orderId = auth.orderId;
    b.authorizationId = auth.authorizationId;
    b.authorizedCents = amountCents;
    b.authorizedAt = new Date().toISOString();
    r.status = "bidding";
    this.log("paypal", "hold.authorized", { buyerId: b.id, orderId: auth.orderId, authorizationId: auth.authorizationId, amount: auth.amount, status: auth.status, via: "vault (merchant-initiated)" }, r.id);
    this.store.save();
    await this.runSimulatedProviders(r.id);
    this.closeBidding(r.id);
    await this.award(r.id);
    return r;
  }

  // =====================================================================================================
  // Voice Agent: the agent calls the buyer at the two money moments; consent is fingerprinted into the audit chain.
  // =====================================================================================================

  /** Deterministic call script: every number comes from PayPal state and the clearing result, never from the model. */
  callScript(rid: unknown, intent: "book" | "release" | "overcharge") {
    const r = this.req(rid);
    const b = r.buyers.find((x) => r.award?.buyersIn.includes(x.id)) ?? r.buyers[0];
    const a = r.award;
    if (!a) throw new HttpError(409, "No winner yet: nothing to call about");
    const held = b?.authorizedCents ?? 0;
    const charge = capturePerUnit(r, b ? priceFor(r, b) : a.priceCents) * (b?.units ?? 1);
    const pr = r.paymentRequest;
    const name = (b?.name ?? "there").split(" ")[0];
    const promises = r.reveals.find((v) => v.offer.providerId === a.providerId)?.offer.promises;
    const lines: string[] = [];
    if (intent === "book") {
      lines.push(r.trigger
        ? `Hi ${name}, it's your Aeonith agent. Your ${r.trigger.device.toLowerCase()} reported ${r.trigger.reading.toLowerCase()} at your ${r.trigger.location.toLowerCase()}.`
        : `Hi ${name}, it's your Aeonith agent with the result for "${r.title}".`);
      lines.push(`PayPal is holding $${fmt(held)} on your account. Nothing has been paid.`);
      lines.push(`${r.commitments.length} pros sealed their bids. ${a.providerName} won at $${fmt(a.priceCents)}${promises ? `, licensed, with a ${promises.warrantyMonths}-month warranty` : ""}.`);
      lines.push(`Say "approve" and I'll book them. You'll only be charged after photo proof.`);
    } else if (intent === "overcharge") {
      lines.push(`Hi ${name}. ${a.providerName} finished, and the video proof passed.`);
      lines.push(`They asked for $${fmt(pr?.amountCents ?? 0)}, but you booked them at $${fmt(charge)}. I blocked the extra $${fmt(pr?.overchargeCents ?? 0)}.`);
      lines.push(`Say "pay the agreed price", and PayPal captures $${fmt(charge)}.`);
    } else {
      lines.push(`Hi ${name}, it's your Aeonith agent. ${a.providerName} says the job is done and asked to be paid.`);
      lines.push(r.proof?.verdict === "pass" ? `I checked their video: it was recorded live, and the work matches your job.` : `The proof needs your eyes: ${r.proof?.aiSummary ?? "please check the video"}.`);
      lines.push(`If you approve, PayPal captures $${fmt(charge)}${held > charge ? ` from your $${fmt(held)} hold and releases the other $${fmt(held - charge)}` : `, exactly the sealed price you booked`}.`);
      lines.push(`Say "release payment" to pay ${a.providerName}, or "stop" to keep the money on hold.`);
    }
    return { intent, lines, providerName: a.providerName, heldCents: held, chargeCents: charge };
  }

  /** The buyer's answer on the call. Approval is decided by deterministic phrase matching, not by AI. */
  async voiceConsent(rid: unknown, input: { intent: "book" | "release" | "overcharge"; transcript: string; method: "voice" | "tap" }) {
    const r = this.req(rid);
    const transcript = input.transcript.trim().slice(0, 300);
    const neg = /\b(no|stop|don'?t|cancel|wait|hold off|decline|reject)\b/i.test(transcript);
    const pos = input.intent === "book" ? /\b(approve|approved|yes|book|go ahead|do it|confirm)\b/i.test(transcript) : /\b(release|approve|approved|yes|pay|go ahead|confirm)\b/i.test(transcript);
    const approved = pos && !neg;
    const at = new Date().toISOString();
    const sha256 = createHash("sha256").update(`${r.id}|${input.intent}|${transcript}|${at}`).digest("hex");
    const consent: Consent = { intent: input.intent, method: input.method, transcript, approved, at, sha256 };
    const script = this.callScript(r.id, input.intent);
    (r.calls ??= []).push({
      id: `call_${randomUUID().slice(0, 6)}`, kind: "consent", at, party: r.buyers[0]?.name ?? "Buyer",
      lines: [...script.lines.map((text) => ({ who: "agent" as const, text })), { who: "buyer", text: transcript }],
      outcome: approved ? (input.intent === "book" ? "Booked" : input.intent === "overcharge" ? "Paid the agreed price · overcharge refused" : "Payment released") : "Declined: nothing moved",
    });
    (r.consents ??= []).push(consent);
    this.log("buyer", "consent.voice", { intent: input.intent, method: input.method, approved, sha256 }, r.id);
    if (input.intent === "book") {
      if (r.status !== "awarded") throw new HttpError(409, "Nothing to book right now");
      if (approved) { r.bookedAt = at; this.store.save(); this.issueChallenge(r.id); }
      else { this.store.save(); await this.releaseAll(r.id, "Buyer declined the booking on the call"); }
      return { consent, request: this.req(r.id) };
    }
    if (r.status !== "proving") throw new HttpError(409, "Release is approved after proof is submitted");
    if (!approved) { this.store.save(); return { consent, request: r }; }
    if (input.intent === "overcharge" && r.paymentRequest && r.award) {
      r.paymentRequest.resolution = `Buyer approved the sealed $${fmt(r.award.priceCents)} only; $${fmt(r.paymentRequest.overchargeCents)} extra refused`;
      (r.flags ??= []).push({ providerId: r.award.providerId, providerName: r.award.providerName, reason: `Asked $${fmt(r.paymentRequest.amountCents)} vs sealed $${fmt(r.award.priceCents)}`, at });
      this.log("policy", "provider.flagged", { provider: r.award.providerName, asked: fmt(r.paymentRequest.amountCents), sealed: fmt(r.award.priceCents) }, r.id);
    }
    if (r.proof?.verdict !== "pass") this.confirmDone(r.id);
    const settled = await this.settle(r.id, "buyer");
    return { consent, request: settled };
  }

  // =====================================================================================================
  // Live Proof: the code exists only after the camera session starts and expires in two minutes.
  // =====================================================================================================

  liveStart(rid: unknown) {
    const r = this.req(rid);
    if (r.status !== "awarded") throw new HttpError(409, "Live Proof starts after the pro is booked");
    if (r.autopilotId && !r.bookedAt) throw new HttpError(409, "Autopilot job: waiting for the buyer's booking approval");
    if (r.flow === "quotes" && !r.buyers.some((b) => b.status === "held")) throw new HttpError(409, "Book the winner with PayPal first");
    const code = newChallengeCode();
    const now = Date.now();
    r.live = { code, startedAt: new Date(now).toISOString(), expiresAt: new Date(now + 120_000).toISOString(), frames: [] };
    r.proof = { code, issuedAt: r.live.startedAt, checks: [] };
    this.log("engine", "proof.live_started", { code, expiresAt: r.live.expiresAt }, r.id);
    this.store.save();
    return r.live;
  }

  async liveFrame(rid: unknown, imageBase64: string) {
    const r = this.req(rid);
    const live = r.live;
    if (!live || live.finishedAt || r.status !== "awarded") throw new HttpError(409, "No live session running");
    if (Date.now() > Date.parse(live.expiresAt)) throw new HttpError(409, "Live session expired: start a new one (new code)");
    if (live.frames.length >= 8) throw new HttpError(429, "Frame limit reached for this session");
    if (r.flow === "quotes" && !r.buyers.some((b) => b.status === "held")) throw new HttpError(409, "Book the winner with PayPal first");
    const buf = Buffer.from(imageBase64, "base64");
    const facts = inspectImage(buf);
    if (!["image/jpeg", "image/png", "image/webp"].includes(facts.mime)) throw new HttpError(400, "Frames must be JPEG, PNG or WebP");
    const winner = r.reveals.find((v) => v.offer.providerId === r.award?.providerId);
    const ai = await this.d.agent.checkCompletion({ jobTitle: r.title, jobDescription: r.description, code: live.code, note: `Live camera frame from ${r.award?.providerName ?? "the provider"}. Their sealed offer: ${winner?.pitch ?? ""}`.slice(0, 500), imageBase64, mime: facts.mime });
    const extra = ai as { observations?: string[]; concerns?: string[]; confidence?: number };
    const frame = { at: new Date().toISOString(), sha256: facts.sha256, codeVisible: ai.codeVisible, matchesJob: ai.matchesJob, summary: ai.summary, observations: extra.observations, concerns: extra.concerns, confidence: extra.confidence };
    live.frames.push(frame);
    this.log(`provider:${r.award!.providerId}`, "proof.live_frame", { n: live.frames.length, codeVisible: ai.codeVisible, matchesJob: ai.matchesJob }, r.id);
    this.store.save();
    return { frame, done: ai.matchesJob === true };
  }

  liveFinish(rid: unknown) {
    const r = this.req(rid);
    const live = r.live;
    if (!live || r.status !== "awarded") throw new HttpError(409, "No live session running");
    if (!live.frames.length) throw new HttpError(409, "No frames analysed yet");
    const best = live.frames.find((f) => f.matchesJob === true) ?? live.frames[live.frames.length - 1];
    const inWindow = Date.parse(best.at) <= Date.parse(live.expiresAt);
    const reused = live.frames.some((f) => this.store.photoHashes.has(f.sha256));
    const checks = [
      { name: "Captured live, stamped by Aeonith", ok: true, detail: `Session ${live.code} stamped every frame (time + job); ${live.frames.length} frame${live.frames.length === 1 ? "" : "s"}, each fingerprinted (SHA-256)`, by: "code" as const },
      { name: "Fresh, not a reused photo", ok: inWindow && !reused, detail: reused ? "A frame matches an earlier upload" : inWindow ? `Recorded ${new Date(best.at).toISOString().slice(11, 19)} UTC, inside the session window` : "Frame arrived after the session expired", by: "code" as const },
      { name: "Work matches the job", ok: best.matchesJob, detail: `${best.summary}${best.confidence != null ? ` (${best.confidence}% confident)` : ""}`, by: "ai" as const },
    ];
    live.finishedAt = new Date().toISOString();
    for (const f of live.frames) this.store.photoHashes.add(f.sha256);
    r.proof = { code: live.code, issuedAt: live.startedAt, submittedAt: live.finishedAt, photoSha256: best.sha256, note: "Live Proof session", checks, aiSummary: best.summary, verdict: verdict(checks) };
    r.status = "proving";
    this.log(`provider:${r.award!.providerId}`, "proof.submitted", { sha256: best.sha256, verdict: r.proof.verdict, live: true }, r.id);
    this.store.save();
    return r.proof;
  }

  // =====================================================================================================
  // Payment request: after proof, the pro asks to be paid. Anything above the sealed price is an overcharge:
  // the policy gate refuses it, and the buyer's agent calls them before anything moves.
  // =====================================================================================================

  requestPayment(rid: unknown, input: { amountDollars: number; note: string }) {
    const r = this.req(rid);
    if (r.status !== "proving" || !r.award) throw new HttpError(409, "Request payment after the proof is in");
    if (r.paymentRequest) throw new HttpError(409, "Payment already requested");
    if (r.proof?.verdict === "fail") throw new HttpError(409, "Proof failed: record a new proof before asking to be paid");
    const amountCents = toCents(input.amountDollars);
    if (amountCents <= 0) throw new HttpError(400, "Amount must be positive");
    const b = r.buyers.find((x) => r.award!.buyersIn.includes(x.id))!;
    const agreed = capturePerUnit(r, priceFor(r, b)) * b.units;
    const over = Math.max(0, amountCents - agreed);
    r.paymentRequest = { amountCents, note: input.note.slice(0, 200), at: new Date().toISOString(), overchargeCents: over };
    this.log(`provider:${r.award.providerId}`, "payment.requested", { amount: fmt(amountCents), sealed: fmt(agreed) }, r.id);
    if (over > 0) {
      // Prove it: the same CAPTURE the pro asked for is run through the gate and refused.
      try { this.gate({ kind: "CAPTURE", request: r, buyer: b, amountCents, approvedBy: null }, r.id); } catch { /* logged as blocked */ }
      this.log("agent", "overcharge.detected", { asked: fmt(amountCents), sealed: fmt(agreed), extra: fmt(over) }, r.id);
    }
    this.store.save();
    return r;
  }

  // =====================================================================================================
  // Recruiting calls: the agent phones offline pros about an already-funded job.
  // =====================================================================================================

  async recruit(rid: unknown) {
    const r = this.req(rid);
    if (r.status === "open" && r.flow === "quotes") this.openBidding(r.id);
    if (!["bidding"].includes(r.status)) throw new HttpError(409, "Recruit while bidding is open");
    const held = r.buyers.filter((b) => b.status === "held");
    if (!held.length && r.flow !== "quotes") throw new HttpError(409, "Only funded jobs are pitched to pros");
    const heldTotal = held.reduce((s, b) => s + (b.authorizedCents ?? 0), 0);
    const auth = held[0]?.authorizationId ?? "";
    const pool = offlineDirectory(this.d.providers[0]?.payoutEmail ?? "").filter((p) => p.categories.includes(r.category) && !(r.recruited ?? []).some((x) => x.id === p.id));
    if (!pool.length) throw new HttpError(409, "No offline pros in the directory for this trade");
    const signal = demandSignal(r);
    const out: CallLog[] = [];
    for (const p of pool.slice(0, 2)) {
      const offer = decideOffer(p, signal);
      const lines: CallLog["lines"] = [
        { who: "agent", text: `Hi, this is the Aeonith agent calling for a homeowner in ${r.zip || "your area"}. Do you have a minute for a paid ${r.category} job?` },
        { who: "pro", text: "Sure, what is it?" },
        { who: "agent", text: held.length ? `"${r.title}". The money is already reserved: PayPal is holding $${fmt(heldTotal)} on the buyer's account (authorization ${auth.slice(0, 14)}). I can't tell you their limit.` : `"${r.title}". The buyer books through PayPal: the winning price is held in PayPal before you start, so you're never chasing payment. I can't tell you their budget.` },
        { who: "agent", text: `You'd submit one sealed bid. If you win, you're paid by PayPal Payouts the moment photo proof passes: no invoices, no chasing, and you don't need a PayPal account first.` },
      ];
      const ok = !!offer && (!r.requirements.licensed || p.licensed);
      lines.push(ok ? { who: "pro", text: `Sounds good. I can be there ${new Date(offer!.promises.startAt).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", hour: "numeric" })}. Send it over.` }
        : { who: "pro", text: "Not licensed for that one, sorry." });
      if (ok) {
        lines.push({ who: "agent", text: `Done. I've texted your secure bid link to ${p.phone}. Your payout will go to the email you confirm there.` });
        (r.recruited ??= []).push(p);
        const salt = newSalt();
        const pitch = await this.d.agent.providerPitch(p, signal, offer!);
        this.providerVault.set(`${r.id}:${p.id}`, { offer: offer!, salt, pitch });
        this.commit(r.id, { providerId: p.id, providerName: p.name, hash: commitmentHash(offer!, salt) });
      }
      const call: CallLog = { id: `call_${randomUUID().slice(0, 6)}`, kind: "recruit", at: new Date().toISOString(), party: p.name, phone: p.phone, lines, outcome: ok ? "Joined: sealed bid submitted" : "Declined" };
      (r.calls ??= []).push(call);
      out.push(call);
      this.log("agent", "recruit.call", { pro: p.name, phone: p.phone, outcome: call.outcome }, r.id);
    }
    this.store.save();
    return out;
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
