import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { demoProviders } from "./agents/providers.js";
import { Agent } from "./ai/agent.js";
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
const agent = new Agent(cfg.ANTHROPIC_API_KEY, cfg.AI_MODEL);
const store = new Store(cfg.DATA_FILE);
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
    ai: agent.online ? `claude (${cfg.AI_MODEL})` : "offline rules (no ANTHROPIC_API_KEY)",
    currency: cfg.CURRENCY,
    audit: store.audit.verify(),
  });
});
app.get("/api/public-config", (_req, res) => {
  res.json({ paypalMode: paypal.mode, currency: cfg.CURRENCY, feePct: cfg.PLATFORM_FEE_PCT });
});

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
    })
    .parse(req.body);
  res.status(201).json(await app$.createRequest(body));
}));

app.post("/api/requests/:id/join", wrap(async (req, res) => {
  const body = z
    .object({ name: z.string().max(60), limitDollars: z.number().positive().max(100000), units: z.number().int().min(1).max(5).default(1), soloBestDollars: z.number().positive().optional() })
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

app.get("/paypal/return", wrap(async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!/^[A-Z0-9-]{5,40}$/i.test(token)) throw new HttpError(400, "Bad token");
  const { request } = await app$.completeHold(token);
  res.redirect(`/?r=${request.id}&held=1`);
}));
app.get("/paypal/cancel", (req, res) => res.redirect(`/?cancelled=1`));

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
  const body = z.object({ imageBase64: z.string().min(100).max(12_000_000), note: z.string().max(500).default("") }).parse(req.body);
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
  console.log(`  AI: ${agent.online ? cfg.AI_MODEL : "offline rules"}`);
  console.log(`  Holds capped at $${fmt(Math.round(cfg.MAX_AUTH_AMOUNT * 100))} per person`);
});
