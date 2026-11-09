import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLog } from "../src/core/audit.js";
import { clear, type CandidateOffer } from "../src/core/clearing.js";
import { canonicalJson, commitmentHash, newSalt, verifyReveal } from "../src/core/commit.js";
import { enforce, PolicyViolation } from "../src/core/policy.js";
import { codeChecks, inspectImage, newChallengeCode, verdict } from "../src/core/proof.js";
import type { BuyerHold, JobRequest, Offer, Requirements } from "../src/domain/types.js";
import { demandSignal } from "../src/protocol/schema.js";

const req: Requirements = { licensed: false, minWarrantyMonths: 0, completeBy: "" };
const soon = new Date(Date.now() + 86400_000).toISOString();
const offer = (id: string, price: number, minUnits = 1, extra: Partial<Offer["promises"]> = {}): Offer => ({
  requestId: "r1",
  providerId: id,
  priceCents: price,
  minUnits,
  promises: { licensed: true, licenseNo: "M-1234", warrantyMonths: 12, startAt: soon, endAt: soon, ...extra },
});
const cand = (o: Offer, t = 0): CandidateOffer => ({ offer: o, providerName: o.providerId, committedAt: new Date(1000 + t).toISOString() });
const buyer = (id: string, limit: number, units = 1, soloBest?: number): BuyerHold => ({
  id, name: id, units, limitCents: limit, soloBestCents: soloBest, consentAt: "x", status: "held", authorizationId: `A-${id}`, authorizedCents: limit * units,
});

test("commit–reveal: hash binds the exact offer; any change or wrong salt fails", () => {
  const o = offer("p", 36000);
  const salt = newSalt();
  const h = commitmentHash(o, salt);
  assert.equal(h.length, 64);
  assert.ok(verifyReveal(h, o, salt));
  assert.ok(!verifyReveal(h, { ...o, priceCents: 35900 }, salt), "price change detected");
  assert.ok(!verifyReveal(h, o, newSalt()), "wrong salt detected");
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: 3 } }), canonicalJson({ a: { c: 3, d: 2 }, b: 1 }), "key order irrelevant");
  assert.throws(() => commitmentHash(o, "short"), /salt/);
});

test("solo: cheapest offer that meets requirements wins; unlicensed is filtered when licence required", () => {
  const buyers = [buyer("maria", 40000)];
  const award = clear(buyers, [cand(offer("quickfix", 31000, 1, { licensed: false })), cand(offer("capitol", 38000)), cand(offer("lonestar", 36000))], {
    ...req,
    licensed: true,
  });
  assert.ok(award);
  assert.equal(award.providerId, "lonestar");
  assert.equal(award.priceCents, 36000);
  assert.match(award.table.find((t) => t.providerId === "quickfix")!.note, /not licensed/);
});

test("together: uniform price maximises buyer surplus; below-price buyers are released (worked example)", () => {
  const buyers = [
    ...Array.from({ length: 10 }, (_, i) => buyer(`a${i}`, 35000)),
    ...Array.from({ length: 14 }, (_, i) => buyer(`b${i}`, 32000)),
    ...Array.from({ length: 10 }, (_, i) => buyer(`c${i}`, 30000)),
  ];
  const award = clear(buyers, [cand(offer("A", 33900, 10)), cand(offer("B", 30900, 25)), cand(offer("C", 29900, 30))], req)!;
  assert.equal(award.providerId, "C");
  assert.equal(award.priceCents, 29900);
  assert.equal(award.unitsServed, 34);
  assert.equal(award.buyerSavingCents, 10 * 5100 + 14 * 2100 + 10 * 100);
  assert.equal(award.table.find((t) => t.providerId === "B")!.feasible, false, "B needs 25 but only 24 can afford $309");
});

test("together: best-of guarantee excludes a buyer whose solo quote beats the group price", () => {
  const buyers = [buyer("maria", 14000, 1, 10000), buyer("dev", 13000), buyer("aisha", 12500)];
  const award = clear(buyers, [cand(offer("G", 11000, 2))], req)!;
  assert.deepEqual(award.buyersIn.sort(), ["aisha", "dev"]);
  assert.match(award.buyersOut[0].reason, /solo quote/);
});

test("clearing: no feasible offer → null (everyone released)", () => {
  assert.equal(clear([buyer("x", 10000)], [cand(offer("p", 20000))], req), null);
  assert.equal(clear([{ ...buyer("x", 50000), status: "pending" }], [cand(offer("p", 20000))], req), null, "unfunded buyers never count");
});

test("clearing: ties broken by more units, then lower price, then earlier commitment", () => {
  const buyers = [buyer("x", 20000), buyer("y", 20000)];
  // Same surplus (0 each) is impossible to tie on price here; test earliest-commit tie on identical offers.
  const award = clear(buyers, [cand(offer("late", 15000, 1), 50), cand(offer("early", 15000, 1), 10)], req)!;
  assert.equal(award.providerId, "early");
});

test("policy gate: blocks over-capture, wrong price, missing proof, missing approval, wrong payee", () => {
  const b = buyer("maria", 40000);
  const r = {
    id: "r1", status: "proving", buyers: [b], award: { buyersIn: ["maria"], priceCents: 36000 }, proof: { verdict: "pass" },
  } as unknown as JobRequest;
  assert.doesNotThrow(() => enforce({ kind: "CAPTURE", request: r, buyer: b, amountCents: 36000, approvedBy: "buyer" }));
  assert.throws(() => enforce({ kind: "CAPTURE", request: r, buyer: b, amountCents: 45000, approvedBy: "buyer" }), PolicyViolation);
  assert.throws(() => enforce({ kind: "CAPTURE", request: r, buyer: b, amountCents: 35000, approvedBy: "buyer" }), /final price/);
  assert.throws(() => enforce({ kind: "CAPTURE", request: r, buyer: b, amountCents: 36000, approvedBy: null }), /approval/);
  const noProof = { ...r, proof: { verdict: "review" } } as unknown as JobRequest;
  assert.throws(() => enforce({ kind: "CAPTURE", request: noProof, buyer: b, amountCents: 36000, approvedBy: "buyer" }), /proof/);
  assert.throws(
    () => enforce({ kind: "PAYOUT", request: r, amountCents: 100, receiver: "evil@x.com", expectedReceiver: "good@x.com", capturedTotalCents: 36000 }),
    /verified winning provider/,
  );
  assert.throws(
    () => enforce({ kind: "PAYOUT", request: r, amountCents: 40000, receiver: "g", expectedReceiver: "g", capturedTotalCents: 36000 }),
    /captured/,
  );
  assert.throws(() => enforce({ kind: "HOLD", request: { ...r, status: "open" } as JobRequest, buyer: b, amountCents: 50000, maxAuthCents: 100000 }), /hold must equal limit/);
  assert.throws(() => enforce({ kind: "HOLD", request: { ...r, status: "open" } as JobRequest, buyer: b, amountCents: 40000, maxAuthCents: 30000 }), /cap/);
});

test("audit log: hash chain detects tampering", () => {
  const log = new AuditLog();
  log.append("engine", "a", { x: 1 });
  log.append("paypal", "b", { y: 2 });
  log.append("ai", "c", {});
  assert.deepEqual(log.verify(), { ok: true, brokenAt: null, length: 3 });
  const entries = log.toJSON();
  (entries[1].data as { y: number }).y = 999;
  assert.equal(log.verify().brokenAt, 2);
});

test("demand signal never carries a buyer's limit", () => {
  const r = { id: "r1", mode: "solo", title: "t", category: "plumbing", description: "", zip: "78704", requirements: req, closesAt: "", status: "bidding", buyers: [buyer("m", 40000)] } as unknown as JobRequest;
  const s = JSON.stringify(demandSignal(r));
  assert.ok(!s.includes("40000") && !s.includes("400.00") && !/limit/i.test(s));
  assert.equal(demandSignal(r).fundedUnits, 1);
});

test("proof: code checks catch reuse and non-images; verdict needs AI-visible code + matching work", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
  const facts = inspectImage(png);
  assert.equal(facts.mime, "image/png");
  const fresh = codeChecks(facts, new Date().toISOString(), new Set());
  assert.ok(fresh.every((c) => c.ok !== false));
  const reused = codeChecks(facts, new Date().toISOString(), new Set([facts.sha256]));
  assert.equal(reused.find((c) => c.name === "Never used before")!.ok, false);
  assert.equal(verdict(reused), "fail");
  assert.equal(verdict(fresh), "review", "without AI checks a human must decide");
  const pass = [...fresh, { name: "One-time code visible", ok: true, detail: "", by: "ai" as const }, { name: "Work matches the job", ok: true, detail: "", by: "ai" as const }];
  assert.equal(verdict(pass), "pass");
  assert.match(newChallengeCode(), /^AEON-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(inspectImage(Buffer.from("not an image at all")).mime, "unknown");
});
