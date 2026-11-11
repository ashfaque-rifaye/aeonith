import assert from "node:assert/strict";
import { test } from "node:test";
import { demoProviders } from "../src/agents/providers.js";
import { Agent } from "../src/ai/agent.js";
import { SimulatedPayPal } from "../src/paypal/simulated.js";
import { Aeonith } from "../src/service.js";
import { newBuyer, seedDemo, Store } from "../src/store.js";

function setup() {
  const store = new Store(null);
  seedDemo(store);
  const paypal = new SimulatedPayPal("http://localhost:3000");
  const svc = new Aeonith({
    store,
    paypal,
    agent: new Agent("", "offline"),
    providers: demoProviders("provider@business.example.com"),
    currency: "USD",
    appBaseUrl: "http://localhost:3000",
    maxAuthCents: 100000,
    platformFeePct: 3,
  });
  return { store, paypal, svc };
}

async function holdAll(svc: Aeonith, rid: string, store: Store) {
  for (const b of store.get(rid)!.buyers) {
    const order = await svc.startHold(rid, b.id);
    await svc.completeHold(order.id);
  }
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(500, 7)]).toString("base64");

test("solo end to end: hold → sealed bids → award → proof → buyer confirms → capture < hold → payout", async () => {
  const { store, svc } = setup();
  const solo = store.list().find((r) => r.mode === "solo")!;
  await holdAll(svc, solo.id, store);
  assert.equal(solo.buyers[0].status, "held");
  assert.equal(solo.buyers[0].authorizedCents, 40000);

  const commits = await svc.runSimulatedProviders(solo.id);
  assert.equal(commits.length, 3, "three plumbing-capable providers");
  assert.ok(solo.commitments.every((c) => /^[0-9a-f]{64}$/.test(c.hash)));
  assert.equal(solo.reveals.length, 0, "nothing readable before close");

  svc.closeBidding(solo.id);
  assert.ok(solo.reveals.every((r) => r.valid));
  await svc.award(solo.id);
  assert.equal(solo.status, "awarded");
  assert.equal(solo.award!.providerName, "Lone Star Plumbing Co.");
  assert.equal(solo.award!.priceCents, 36000);

  svc.issueChallenge(solo.id);
  await assert.rejects(svc.settle(solo.id, "buyer"), /proof/i, "can't settle before proof");
  const proof = await svc.submitProof(solo.id, { imageBase64: PNG, note: "Installed new 40-gal unit" });
  assert.equal(proof.verdict, "review", "offline AI → human decides");
  await assert.rejects(svc.settle(solo.id, "buyer"), /Policy gate/, "gate blocks capture without confirmation");
  svc.confirmDone(solo.id);
  await svc.settle(solo.id, "buyer");
  assert.equal(solo.status, "settled");
  assert.equal(solo.buyers[0].capturedCents, 36000, "charged the winning price, not the $400 hold");
  assert.equal(solo.settlement!.payout!.amountCents, 36000 - 1080, "payout = capture minus 3% fee");
  assert.ok(store.audit.verify().ok);
});

test("together: group price, best-of guarantee and below-price buyers released at award time", async () => {
  const { store, svc } = setup();
  const g = store.list().find((r) => r.mode === "together")!;
  await holdAll(svc, g.id, store);
  svc.openBidding(g.id);
  await svc.runSimulatedProviders(g.id);
  svc.closeBidding(g.id);
  await svc.award(g.id);
  const a = g.award!;
  assert.ok(a.priceCents < 16000, "group price beats a typical solo quote");
  const sam = g.buyers.find((b) => b.name === "Sam W.")!;
  assert.equal(sam.status, "voided", "Sam's $90 limit is below the price: released immediately");
  for (const id of a.buyersIn) assert.equal(g.buyers.find((b) => b.id === id)!.status, "held");
});

test("tampered reveal is rejected; duplicate provider identity is rejected", async () => {
  const { store, svc } = setup();
  const solo = store.list().find((r) => r.mode === "solo")!;
  await holdAll(svc, solo.id, store);
  svc.openBidding(solo.id);
  svc.commit(solo.id, { providerId: "ext", providerName: "External Co", hash: "a".repeat(64) });
  assert.throws(() => svc.commit(solo.id, { providerId: "ext2", providerName: "external co", hash: "b".repeat(64) }), /Duplicate provider/);
  svc.closeBidding(solo.id);
  const valid = svc.reveal(solo.id, {
    offer: { requestId: solo.id, providerId: "ext", priceCents: 100, minUnits: 1, promises: { licensed: true, licenseNo: "M-1", warrantyMonths: 1, startAt: new Date().toISOString(), endAt: new Date().toISOString() } },
    salt: "c".repeat(32),
    pitch: "",
  });
  assert.equal(valid, false, "a $1 bid that doesn't match the sealed hash can't win");
});

test("no feasible offer releases every hold; over-limit hold and overcharge are blocked", async () => {
  const { store, svc } = setup();
  const { request } = await svc.createRequest({
    mode: "solo", title: "Fix outlet", category: "plumbing", description: "", zip: "78704", licensed: true, minWarrantyMonths: 0, completeBy: "",
    buyerName: "Low", limitDollars: 50, units: 1,
  });
  await holdAll(svc, request.id, store);
  assert.equal(svc.tryOvercharge(request.id).blocked, true);
  await svc.runSimulatedProviders(request.id);
  svc.closeBidding(request.id);
  await svc.award(request.id);
  assert.equal(request.status, "released");
  assert.equal(request.buyers[0].status, "voided");

  const big = await svc.createRequest({
    mode: "solo", title: "Big job", category: "plumbing", description: "", zip: "", licensed: false, minWarrantyMonths: 0, completeBy: "",
    buyerName: "X", limitDollars: 5000, units: 1,
  });
  await assert.rejects(svc.startHold(big.request.id, big.buyer.id), /cap/);
  void newBuyer;
});

test("holds older than PayPal's 3-day honor period are reauthorized before capture", async () => {
  const { store, svc } = setup();
  const solo = store.list().find((r) => r.mode === "solo")!;
  await holdAll(svc, solo.id, store);
  const oldAuth = solo.buyers[0].authorizationId;
  solo.buyers[0].authorizedAt = new Date(Date.now() - 4 * 86400_000).toISOString();
  await svc.runSimulatedProviders(solo.id);
  svc.closeBidding(solo.id);
  await svc.award(solo.id);
  svc.issueChallenge(solo.id);
  await svc.submitProof(solo.id, { imageBase64: PNG, note: "done" });
  svc.confirmDone(solo.id);
  await svc.settle(solo.id, "buyer");
  assert.notEqual(solo.buyers[0].authorizationId, oldAuth);
  assert.ok(store.audit.all(solo.id).some((e) => e.action === "hold.reauthorized"));
  assert.equal(solo.status, "settled");
});

test("car pool from one dealership: $500 refundable deposits, sealed dealer bids, deposit applied at delivery", async () => {
  const { store, svc } = setup();
  const inDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
  const { request: r } = await svc.createRequest({
    mode: "together", title: "5 × 2026 compact hybrid SUV, same trim", category: "vehicles", description: "Same model and trim, Austin TX.",
    zip: "78704", licensed: true, minWarrantyMonths: 36, completeBy: inDays(10), buyerName: "Ava", limitDollars: 33000, units: 1, depositDollars: 500,
  });
  svc.join(r.id, { name: "Ben", limitDollars: 32500, units: 1, soloBestDollars: 32100 });
  svc.join(r.id, { name: "Cara", limitDollars: 32800, units: 1 });
  svc.join(r.id, { name: "Dan", limitDollars: 32000, units: 1 });
  svc.join(r.id, { name: "Eli", limitDollars: 31500, units: 1 });
  await holdAll(svc, r.id, store);
  assert.ok(r.buyers.every((b) => b.authorizedCents === 50000), "each buyer holds only the $500 deposit, not $33k");

  await svc.runSimulatedProviders(r.id);
  assert.equal(r.commitments.length, 3, "three dealer agents bid");
  svc.closeBidding(r.id);
  await svc.award(r.id);
  assert.equal(r.award!.providerName, "Capital Auto Group");
  assert.equal(r.award!.priceCents, 3198000);
  assert.match(r.award!.table.find((t) => t.providerName === "Lakeline Value Cars")!.note, /warranty 12/);
  assert.equal(r.buyers.find((b) => b.name === "Eli")!.status, "voided", "Eli's $31.5k limit is below the price: released");

  svc.issueChallenge(r.id);
  await svc.submitProof(r.id, { imageBase64: PNG, note: "VIN plates + code at handover" });
  svc.confirmDone(r.id);
  await svc.settle(r.id, "buyer");
  assert.equal(r.settlement!.captures.length, 4);
  assert.ok(r.settlement!.captures.every((c) => c.amountCents === 50000), "only the deposit is captured");
  assert.equal(r.settlement!.balanceDueCents, 4 * (3198000 - 50000));
  assert.equal(r.settlement!.payout!.amountCents, 200000 - 6000);
});

test("Autopilot: sensor files + funds a job on the vaulted wallet; Voice Agent books; Live Proof; voice release settles", async () => {
  const { store, svc } = setup();
  const { autopilot, approveUrl } = await svc.startAutopilot({ buyerName: "Maria G.", zip: "78704", capDollars: 450, categories: ["plumbing"] });
  assert.match(approveUrl, /sim\/vault/);
  await svc.completeAutopilot(autopilot.setupTokenId!);
  assert.equal(store.autopilots.get(autopilot.id)!.status, "active");

  const r = await svc.sensorAlert({ autopilotId: autopilot.id, device: "Leak sensor", location: "Garage water heater", reading: "Water detected" });
  assert.equal(r.buyers[0].authorizedCents, 45000, "hold placed on the vaulted wallet without a redirect");
  assert.equal(r.status, "awarded");
  assert.throws(() => svc.issueChallenge(r.id), /booking/, "no dispatch before the buyer approves");

  const script = svc.callScript(r.id, "book");
  assert.ok(script.lines.some((l) => l.includes("$450.00")), "call states what PayPal holds");
  const declinedFirst = await svc.voiceConsent(r.id, { intent: "book", transcript: "Approve. Book them.", method: "voice" });
  assert.equal(declinedFirst.consent.approved, true);
  assert.ok(r.proof?.code, "booking issues the proof code");

  const live = svc.liveStart(r.id);
  assert.match(live.code, /^AEON-/);
  await svc.liveFrame(r.id, PNG);
  const proof = svc.liveFinish(r.id);
  assert.equal(proof.verdict, "review", "offline AI can't read the code: buyer decides");
  const stop = await svc.voiceConsent(r.id, { intent: "release", transcript: "No, stop, not yet", method: "voice" });
  assert.equal(stop.consent.approved, false);
  assert.equal(r.status, "proving", "a no keeps the money on hold");
  await svc.voiceConsent(r.id, { intent: "release", transcript: "Yes, release payment", method: "voice" });
  assert.equal(r.status, "settled");
  assert.ok(store.audit.all(r.id).some((e) => e.action === "consent.voice"));
});

test("Autopilot holds are blocked outside the approved budget and scope; recruiting calls add sealed bids", async () => {
  const { store, svc } = setup();
  const { autopilot } = await svc.startAutopilot({ buyerName: "Dev", zip: "78704", capDollars: 300, categories: ["electrical"] });
  await assert.rejects(svc.sensorAlert({ autopilotId: autopilot.id, device: "Leak sensor", location: "Kitchen", reading: "Water detected" }), /isn't active/);
  await svc.completeAutopilot(autopilot.setupTokenId!);
  await assert.rejects(svc.sensorAlert({ autopilotId: autopilot.id, device: "Leak sensor", location: "Kitchen", reading: "Water detected" }), /doesn't cover plumbing/);

  const solo = store.list().find((r) => r.mode === "solo")!;
  const o = await svc.startHold(solo.id, solo.buyers[0].id);
  await svc.completeHold(o.id);
  svc.openBidding(solo.id);
  const calls = await svc.recruit(solo.id);
  assert.ok(calls.length >= 1 && calls.some((c) => c.outcome.startsWith("Joined")));
  assert.ok(solo.commitments.some((c) => c.providerName === "Barton Creek Plumbing"));
  assert.ok(calls[0].lines.some((l) => /PayPal Payouts/.test(l.text)));
});

test("quote-first: sealed quotes before any hold; booking holds exactly the winning price; overcharge is blocked, flagged, and only the sealed price is captured", async () => {
  const { store, svc } = setup();
  const { request: r } = await svc.createRequest({ mode: "solo", flow: "quotes", title: "Fix leaking water heater", category: "plumbing", description: "Leak at the base", zip: "78704", licensed: true, minWarrantyMonths: 0, completeBy: "", buyerName: "Maria G.", limitDollars: 400, units: 1 });
  assert.equal(r.flow, "quotes");
  await svc.runSimulatedProviders(r.id);
  assert.ok(r.commitments.length >= 3, "pros bid before any money is held");
  assert.equal(r.buyers[0].status, "pending");
  svc.closeBidding(r.id);
  await svc.award(r.id);
  assert.equal(r.status, "awarded");
  assert.throws(() => svc.liveStart(r.id), /Book the winner/);
  const order = await svc.startHold(r.id, r.buyers[0].id);
  await svc.completeHold(order.id);
  assert.equal(r.buyers[0].authorizedCents, r.award!.priceCents, "hold = sealed price, not the private budget");
  assert.ok(r.bookedAt);
  svc.liveStart(r.id);
  r.live!.frames.push({ at: new Date().toISOString(), sha256: "a".repeat(64), codeVisible: null, matchesJob: true, summary: "Water heater installed, dry floor" });
  const proof = svc.liveFinish(r.id);
  assert.equal(proof.verdict, "pass");
  svc.requestPayment(r.id, { amountDollars: r.award!.priceCents / 100 + 44, note: "extra" });
  assert.equal(r.paymentRequest!.overchargeCents, 4400);
  assert.ok(store.audit.entries.some((e) => e.action === "blocked" && e.requestId === r.id), "the oversized capture was refused by the gate");
  const out = await svc.voiceConsent(r.id, { intent: "overcharge", transcript: "Pay the agreed price.", method: "tap" });
  assert.equal(out.request.status, "settled");
  assert.equal(r.buyers[0].capturedCents, r.award!.priceCents, "only the sealed price is captured");
  assert.equal(r.flags?.length, 1, "provider flagged");
});

test("catalog pool: different models from one dealership, one sealed fleet discount, each buyer at their own model's price", async () => {
  const { store, svc } = setup();
  const catalog = { seller: "Toyota dealers", items: [{ id: "rav4", name: "RAV4 Hybrid", msrpCents: 3650000 }, { id: "camry", name: "Camry", msrpCents: 3220000 }, { id: "ghl", name: "Grand Highlander", msrpCents: 4890000 }] };
  const { request: r } = await svc.createRequest({ mode: "together", title: "Toyota pool", category: "vehicles", description: "", zip: "78704", licensed: true, minWarrantyMonths: 36, completeBy: "", buyerName: "Ava", limitDollars: 34000, units: 1, depositDollars: 500, catalog, itemId: "rav4" });
  svc.join(r.id, { name: "Ben", limitDollars: 30000, units: 1, itemId: "camry" });
  svc.join(r.id, { name: "Cara", limitDollars: 33800, units: 1, itemId: "rav4" });
  svc.join(r.id, { name: "Eli", limitDollars: 43000, units: 1, itemId: "ghl" });
  await holdAll(svc, r.id, store);
  assert.ok(r.buyers.every((b) => b.authorizedCents === 50000));
  await svc.runSimulatedProviders(r.id);
  svc.closeBidding(r.id);
  await svc.award(r.id);
  const a = r.award!;
  assert.ok(a.discountBps && a.discountBps > 0);
  const ava = r.buyers.find((b) => b.name === "Ava")!, ben = r.buyers.find((b) => b.name === "Ben")!, eli = r.buyers.find((b) => b.name === "Eli")!;
  assert.ok(a.unitPrices![ava.id] > a.unitPrices![ben.id], "each model has its own price");
  assert.ok(a.unitPrices![ava.id] < 3650000);
  assert.equal(eli.status, "voided", "max below his model's discounted price → released, never charged");
});
