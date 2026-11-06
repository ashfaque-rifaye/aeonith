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
