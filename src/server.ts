import { timingSafeEqual } from "node:crypto";
import { Channel3 } from "./catalog/channel3.js";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { demoProviders } from "./agents/providers.js";
import { Agent } from "./ai/agent.js";
import { NvidiaClient, UsageMeter } from "./ai/nvidia.js";
import { loadConfig } from "./config.js";
import { fmt } from "./core/clearing.js";
import { PayPalClient } from "./paypal/client.js";
import type { PaymentRail } from "./paypal/rail.js";
import { SimulatedPayPal } from "./paypal/simulated.js";
import { CommitBody, demandSignal, RevealBody } from "./protocol/schema.js";
import { Aeonith, HttpError } from "./service.js";
import { seedDemo, Store } from "./store.js";

const cfg = loadConfig();
const paypal: PaymentRail = cfg.paypalMode === "sandbox" ? new PayPalClient(cfg) : new SimulatedPayPal(cfg.APP_BASE_URL);
// NVIDIA usage is metered on every request (credits counted down from NVIDIA_CREDITS, persisted to AI_USAGE_FILE).
const meter = new UsageMeter(cfg.AI_USAGE_FILE, cfg.NVIDIA_CREDITS, cfg.NVIDIA_CREDITS_PER_REQUEST);
const agent = new Agent(
  cfg.ANTHROPIC_API_KEY,
  cfg.AI_MODEL,
  cfg.NVIDIA_API_KEY ? { client: new NvidiaClient(cfg.NVIDIA_API_KEY, meter), textModel: cfg.NVIDIA_TEXT_MODEL, visionModel: cfg.NVIDIA_VISION_MODEL } : null,
);
const store = new Store(cfg.DATA_FILE);
const catalog = new Channel3(cfg.CHANNEL3_API_KEY);
seedDemo(store);
const app$ = new Aeonith({
  store,
  paypal,
  agent,
  providers: demoProviders(cfg.PROVIDER_PAYOUT_EMAIL),
  currency: cfg.CURRENCY,
  appBaseUrl: cfg.APP_BASE_URL,
  maxAuthCents: Math.round(cfg.MAX_AUTH_AMOUNT * 100),
  platformFeePct: cfg.PLATFORM_FEE_PCT,
});

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use("/api/webhooks/paypal", express.json({ limit: "256kb" }));
app.use(express.json({ limit: "12mb" })); // proof photos arrive base64-encoded
app.use(express.static(fileURLToPath(new URL("../public", import.meta.url))));
app.use("/vendor/bryntum", express.static(fileURLToPath(new URL("../node_modules/@bryntum/scheduler", import.meta.url))));
// Front-end libraries served from node_modules (pinned in package.json), so the demo never depends on a CDN.
app.use("/vendor/three", express.static(fileURLToPath(new URL("../node_modules/three", import.meta.url))));
app.use("/vendor/gsap", express.static(fileURLToPath(new URL("../node_modules/gsap", import.meta.url))));
app.use("/vendor/lenis", express.static(fileURLToPath(new URL("../node_modules/lenis/dist", import.meta.url))));
app.use("/vendor/ag-grid", express.static(fileURLToPath(new URL("../node_modules/ag-grid-enterprise/dist", import.meta.url)), { maxAge: "7d" })); // loaded on demand

const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

function requireAdmin(req: Request) {
  const given = Buffer.from(String(req.header("x-admin-token") ?? ""));
  const want = Buffer.from(cfg.ADMIN_TOKEN);
  if (!cfg.ADMIN_TOKEN || given.length !== want.length || !timingSafeEqual(given, want)) throw new HttpError(401, "Admin token required");
}

// ---------- meta ----------
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    paypal: paypal.mode,
    ai: agent.label,
    aiProvider: agent.provider,
    aiCreditsLeft: agent.provider === "nvidia" ? meter.remaining : null,
    currency: cfg.CURRENCY,
    audit: store.audit.verify(),
  });
});
app.get("/api/public-config", (_req, res) => {
  // PayPal client ID is public by design (it loads the PayPal JS SDK); the secret never leaves the server.
  res.json({ paypalMode: paypal.mode, paypalClientId: paypal.mode === "sandbox" ? cfg.PAYPAL_CLIENT_ID : "", currency: cfg.CURRENCY, feePct: cfg.PLATFORM_FEE_PCT, agGridLicenseKey: cfg.AG_GRID_LICENSE_KEY, channel3: catalog.enabled });
});

// ---------- the agent's follow-up questions + real product catalog (Channel3) ----------
app.post("/api/intake/clarify", wrap(async (req, res) => {
  const { text, draft } = z.object({ text: z.string().min(3).max(1500), draft: z.any() }).parse(req.body);
  res.json(await agent.clarify(text, draft));
}));
app.get("/api/catalog/search", wrap(async (req, res) => {
  const q = z.string().min(2).max(200).parse(String(req.query.q ?? ""));
  res.json({ source: "channel3", products: await catalog.search(q, Number(req.query.limit ?? 6)) });
}));
// AI usage and NVIDIA credit meter (no prompts or outputs are stored, only counts, models and timings).
app.get("/api/ai/usage", (_req, res) => res.json({ provider: agent.provider, label: agent.label, ...meter.summary() }));

// ---------- buyer side ----------
app.post("/api/intake", wrap(async (req, res) => {
  const { text } = z.object({ text: z.string().min(3).max(1000) }).parse(req.body);
  res.json(await agent.parseJob(text));
}));

app.get("/api/requests", (_req, res) => res.json(store.list()));
app.get("/api/requests/:id", (req, res) => res.json(app$.req(req.params.id)));

app.post("/api/requests", wrap(async (req, res) => {
  const body = z
    .object({
      mode: z.enum(["solo", "together"]),
      title: z.string().min(3).max(90),
      category: z.string().min(2).max(30),
      description: z.string().max(600).default(""),
      zip: z.string().max(10).default(""),
      licensed: z.boolean().default(false),
      minWarrantyMonths: z.number().int().min(0).max(120).default(0),
      completeBy: z.string().max(30).default(""),
      buyerName: z.string().max(60).default("You"),
      limitDollars: z.number().positive().max(100000),
      units: z.number().int().min(1).max(20).default(1),
      depositDollars: z.number().positive().max(100000).optional(),
      flow: z.enum(["quotes", "funded"]).optional(),
      itemId: z.string().max(40).optional(),
      catalog: z.object({
        seller: z.string().max(80),
        items: z.array(z.object({ id: z.string().max(40), name: z.string().max(90), msrpCents: z.number().int().positive().max(50_000_000), image: z.string().max(500).optional(), source: z.string().max(40).optional(), url: z.string().max(500).optional() })).min(1).max(12),
      }).optional(),
    })
    .parse(req.body);
  res.status(201).json(await app$.createRequest(body));
}));

app.post("/api/requests/:id/join", wrap(async (req, res) => {
  const body = z
    .object({ name: z.string().max(60), limitDollars: z.number().positive().max(100000), units: z.number().int().min(1).max(5).default(1), soloBestDollars: z.number().positive().optional(), itemId: z.string().max(40).optional() })
    .parse(req.body);
  res.status(201).json(app$.join(req.params.id, body));
}));

app.post("/api/requests/:id/buyers/:bid/hold", wrap(async (req, res) => {
  res.json(await app$.startHold(req.params.id, req.params.bid));
}));
app.post("/api/requests/:id/buyers/:bid/cancel", wrap(async (req, res) => {
  await app$.cancelHold(req.params.id, req.params.bid);
  res.json({ ok: true });
}));

// PayPal JS SDK popup: the buyer approved the order in PayPal's window; authorize it server-side (same checks).
app.post("/api/paypal/orders/:orderId/approved", wrap(async (req, res) => {
  const orderId = String(req.params.orderId);
  if (!/^[A-Z0-9-]{5,40}$/i.test(orderId)) throw new HttpError(400, "Bad order id");
  const { request, buyer } = await app$.completeHold(orderId);
  res.json({ requestId: request.id, buyerId: buyer.id, status: buyer.status, authorizationId: buyer.authorizationId });
}));

app.get("/paypal/return", wrap(async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!/^[A-Z0-9-]{5,40}$/i.test(token)) throw new HttpError(400, "Bad token");
  const { request } = await app$.completeHold(token);
  res.redirect(`/?r=${request.id}&held=1`);
}));
app.get("/paypal/cancel", (req, res) => res.redirect(`/?cancelled=1`));

// PayPal Vault approval return (Autopilot). PayPal sends the setup token as approval_token_id.
app.get("/paypal/vault-return", wrap(async (req, res) => {
  const token = String(req.query.approval_token_id ?? req.query.token ?? "");
  if (!/^[A-Z0-9-]{5,40}$/i.test(token)) throw new HttpError(400, "Bad token");
  await app$.completeAutopilot(token);
  res.redirect("/?vaulted=1#/autopilot");
}));
app.get("/sim/vault", (req, res) => {
  if (paypal.mode !== "simulated") return res.status(404).end();
  const token = String(req.query.token ?? "").replace(/[^A-Z0-9-]/gi, "");
  res.type("html").send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Simulated PayPal</title>
  <body style="font-family:system-ui;max-width:420px;margin:60px auto;padding:16px">
  <p style="background:#fff3cd;padding:8px;border-radius:6px">SIMULATED PayPal (no sandbox credentials configured)</p>
  <h2>Save PayPal for Aeonith Autopilot</h2><p>Aeonith may place holds (not charges) within your budget when a sensor reports an emergency.</p>
  <p><a href="/paypal/vault-return?approval_token_id=${token}" style="background:#0070ba;color:#fff;padding:10px 16px;border-radius:20px;text-decoration:none">Agree and save</a></p></body>`);
});

// ---------- Autopilot (Vault + merchant-initiated holds) ----------
app.get("/api/autopilot", (_req, res) => res.json([...store.autopilots.values()]));
app.post("/api/autopilot", wrap(async (req, res) => {
  const body = z.object({
    buyerName: z.string().max(60).default("You"),
    zip: z.string().max(10).default(""),
    capDollars: z.number().positive().max(100000),
    categories: z.array(z.enum(["plumbing", "electrical", "hvac"])).min(1).max(3).default(["plumbing"]),
  }).parse(req.body);
  res.status(201).json(await app$.startAutopilot(body));
}));
app.post("/api/autopilot/:id/revoke", wrap(async (req, res) => res.json(app$.revokeAutopilot(String(req.params.id)))));
app.post("/api/autopilot/:id/sensor", wrap(async (req, res) => {
  const body = z.object({ device: z.string().min(2).max(60), location: z.string().min(2).max(60), reading: z.string().min(2).max(80) }).parse(req.body);
  res.status(201).json(await app$.sensorAlert({ autopilotId: String(req.params.id), ...body }));
}));

// ---------- Voice Agent ----------
app.get("/api/requests/:id/call", (req, res) => {
  const intent = req.query.intent === "release" ? "release" : req.query.intent === "overcharge" ? "overcharge" : "book";
  res.json(app$.callScript(req.params.id, intent));
});
app.post("/api/requests/:id/voice", wrap(async (req, res) => {
  const body = z.object({ intent: z.enum(["book", "release", "overcharge"]), transcript: z.string().min(1).max(300), method: z.enum(["voice", "tap"]) }).parse(req.body);
  res.json(await app$.voiceConsent(req.params.id, body));
}));

// ---------- Live Proof ----------
app.post("/api/requests/:id/live/start", wrap(async (req, res) => res.json(app$.liveStart(req.params.id))));
app.post("/api/requests/:id/live/frame", wrap(async (req, res) => {
  const { imageBase64 } = z.object({ imageBase64: z.string().min(100).max(6_000_000) }).parse(req.body);
  res.json(await app$.liveFrame(req.params.id, imageBase64));
}));
app.post("/api/requests/:id/live/finish", wrap(async (req, res) => res.json(app$.liveFinish(req.params.id))));

// ---------- Payment request (pro) and direct release (buyer) ----------
app.post("/api/requests/:id/payment-request", wrap(async (req, res) => {
  const body = z.object({ amountDollars: z.number().positive().max(100000), note: z.string().max(200).default("") }).parse(req.body);
  res.json(app$.requestPayment(req.params.id, body));
}));

// ---------- Recruiting calls ----------
app.post("/api/requests/:id/recruit", wrap(async (req, res) => res.json(await app$.recruit(req.params.id))));

// Simulated-mode approval screen (stands in for PayPal's page ONLY when no sandbox credentials are set).
app.get("/sim/approve", (req, res) => {
  if (paypal.mode !== "simulated") return res.status(404).end();
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const token = esc(req.query.token);
  const amount = esc(req.query.amount);
  res.type("html").send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Simulated PayPal</title>
  <body style="font-family:system-ui;max-width:420px;margin:60px auto;padding:16px">
  <p style="background:#fff3cd;padding:8px;border-radius:6px">SIMULATED PayPal (no sandbox credentials configured)</p>
  <h2>Approve a hold of $${amount}</h2><p>Funds are reserved, not charged.</p>
  <p><a href="/paypal/return?token=${token}" style="background:#0070ba;color:#fff;padding:10px 16px;border-radius:20px;text-decoration:none">Approve hold</a>
  &nbsp; <a href="/paypal/cancel">Cancel</a></p></body>`);
});

// ---------- competition ----------
app.post("/api/requests/:id/open-bidding", wrap(async (req, res) => res.json(app$.openBidding(req.params.id))));
app.post("/api/requests/:id/run-providers", wrap(async (req, res) => res.json(await app$.runSimulatedProviders(req.params.id))));
app.post("/api/requests/:id/close-bidding", wrap(async (req, res) => res.json(app$.closeBidding(req.params.id))));
app.post("/api/requests/:id/award", wrap(async (req, res) => res.json(await app$.award(req.params.id))));

// ---------- proof + settlement ----------
app.post("/api/requests/:id/challenge", wrap(async (req, res) => res.json(app$.issueChallenge(req.params.id))));
app.post("/api/requests/:id/proof", wrap(async (req, res) => {
  const body = z.object({ imageBase64: z.string().min(100).max(12_000_000), note: z.string().max(500).default(""), skipVision: z.boolean().default(false) }).parse(req.body);
  if (body.skipVision) requireAdmin(req);
  res.json(await app$.submitProof(req.params.id, body));
}));
app.post("/api/requests/:id/confirm", wrap(async (req, res) => {
  app$.confirmDone(req.params.id);
  res.json({ ok: true });
}));
app.post("/api/requests/:id/settle", wrap(async (req, res) => {
  const { as } = z.object({ as: z.enum(["buyer", "admin"]) }).parse(req.body);
  if (as === "admin") requireAdmin(req);
  res.json(await app$.settle(req.params.id, as));
}));
app.post("/api/admin/reset", wrap(async (req, res) => {
  requireAdmin(req);
  // Releases any live holds first so nothing stays reserved at PayPal, then reseeds the demo.
  for (const r of store.list()) {
    if (r.buyers.some((b) => b.status === "held") && r.status !== "settled") await app$.releaseAll(r.id, "Demo reset").catch(() => {});
  }
  store.reset();
  seedDemo(store);
  res.json({ ok: true, requests: store.list().length });
}));

app.post("/api/requests/:id/release", wrap(async (req, res) => {
  requireAdmin(req);
  res.json(await app$.releaseAll(req.params.id, "Released by admin"));
}));
app.post("/api/requests/:id/try-overcharge", wrap(async (req, res) => res.json(app$.tryOvercharge(req.params.id))));

// ---------- audit ----------
app.get("/api/audit", (req, res) => {
  const rid = typeof req.query.r === "string" ? req.query.r : undefined;
  res.json({ verify: store.audit.verify(), entries: store.audit.all(rid) });
});

// ---------- Offer Protocol v1 (what provider agents see) ----------
app.get("/protocol/v1/requests", (_req, res) => {
  res.json(store.list().filter((r) => ["bidding", "revealing"].includes(r.status)).map(demandSignal));
});
app.get("/protocol/v1/requests/:id", (req, res) => res.json(demandSignal(app$.req(req.params.id))));
app.post("/protocol/v1/requests/:id/commitments", wrap(async (req, res) => {
  res.status(201).json(app$.commit(req.params.id, CommitBody.parse(req.body)));
}));
app.post("/protocol/v1/requests/:id/reveals", wrap(async (req, res) => {
  const body = RevealBody.parse(req.body);
  res.json({ valid: app$.reveal(req.params.id, body) });
}));
app.get("/protocol/v1/requests/:id/result", (req, res) => {
  const r = app$.req(req.params.id);
  res.json({ status: r.status, winner: r.award ? { providerId: r.award.providerId, priceCents: r.award.priceCents, unitsServed: r.award.unitsServed } : null });
});

// ---------- webhooks ----------
app.post("/api/webhooks/paypal", wrap(async (req, res) => {
  const ok = await paypal.verifyWebhook(req.headers, req.body);
  if (!ok) throw new HttpError(400, "Webhook signature not verified");
  app$.onWebhook(req.body);
  res.json({ ok: true });
}));

// ---------- errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", issues: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[error]", msg);
  res.status(502).json({ error: msg.includes("PayPal") ? msg : "Something went wrong" });
});

app.listen(cfg.PORT, () => {
  console.log(`Aeonith on ${cfg.APP_BASE_URL}`);
  console.log(`  PayPal: ${paypal.mode}${paypal.mode === "simulated" ? " (set PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET for the real sandbox)" : ""}`);
  console.log(`  AI: ${agent.label}${agent.provider === "nvidia" ? ` · ~${meter.remaining} of ${cfg.NVIDIA_CREDITS} NVIDIA credits left` : ""}`);
  console.log(`  Holds capped at $${fmt(Math.round(cfg.MAX_AUTH_AMOUNT * 100))} per person`);
});
