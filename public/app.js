// Aeonith web app: hash router, no framework. All money logic is server-side; this file renders and calls the API.
import { animateView, initSmoothScroll, installPointerFX, scrollTop } from "/motion.js";
const $ = (s, el = document) => el.querySelector(s);
let sceneMod = null; // three.js vault, loaded lazily
const scenes = [];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (c) => `$${(Number(c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Big money with dimmed cents (Cryptfy-style). */
const money = (c, { count = false } = {}) => {
  const [i, d] = usd(c).split(".");
  return `<span class="num"${count ? ` data-count="${Number(c) || 0}"` : ""}>${i}<span class="dec">.${d}</span></span>`;
};
const usd0 = (c) => (Number(c) % 100 ? usd(c) : `$${(Number(c) / 100).toLocaleString("en-US")}`);
const when = (iso, opts) => (iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...opts }) + " CT" : "");
const hhmm = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const initials = (n) => String(n || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const SWATCH = ["#ff7a3d", "#ffc29a", "#ff4d6d", "#ffd166", "#ffbf5a", "#ff8fb1"];
const tint = (s) => SWATCH[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % SWATCH.length];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- icons ----------
const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  jobs: "M4 7h16v12H4zM9 7V5h6v2M4 12h16",
  plus: "M12 5v14M5 12h14",
  pros: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  check: "M5 12.5 10 17l9-10",
  x: "M6 6l12 12M18 6 6 18",
  q: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5",
  back: "M15 5l-7 7 7 7",
  camera: "M4 8h3l2-2h6l2 2h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  hand: "M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 15a1.6 1.6 0 0 1 2.6-1.8L7 14.5",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  fan: "M12 12c0-4 1-8 4-8s3 4-4 8zm0 0c4 0 8 1 8 4s-4 3-8-4zm0 0c0 4-1 8-4 8s-3-4 4-8zm0 0c-4 0-8-1-8-4s4-3 8 4z",
  gutter: "M3 6h18l-2 4H5zM7 10v10M17 10v10",
  broom: "M14 3l-4 9M7 12h8l2 9H5z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  leaf: "M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7",
  truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  pin: "M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  users: "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20v-1a4 4 0 0 0-3-3.8",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5",
  hash: "M5 9h14M5 15h14M10 3 8 21M16 3l-2 18",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  terminal: "M4 5h16v14H4zM8 10l2 2-2 2M12 14h4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  car: "M5 16h14M3 16v-3l2-5h14l2 5v3M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M5 12h14",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9",
  fridge: "M6 3h12v18H6zM6 10h12M9 6v2M9 13v3",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8",
  vault: "M4 5h16v14H4zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 9V7M12 17v-2M4 9h2M4 15h2",
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.info}"/></svg>`;
const CAT = {
  plumbing: { icon: "drop", tint: "rgba(255,209,102,.35)", label: "Plumbing" },
  electrical: { icon: "bolt", tint: "rgba(255,191,90,.35)", label: "Electrical" },
  hvac: { icon: "fan", tint: "rgba(255,77,109,.4)", label: "Heating & AC" },
  gutters: { icon: "gutter", tint: "rgba(255,194,154,.35)", label: "Gutters" },
  cleaning: { icon: "broom", tint: "rgba(255,143,177,.35)", label: "Cleaning" },
  handyman: { icon: "wrench", tint: "rgba(255,122,61,.35)", label: "Handyman" },
  landscaping: { icon: "leaf", tint: "rgba(255,194,154,.35)", label: "Yard" },
  vehicles: { icon: "car", tint: "rgba(255,122,61,.35)", label: "Cars", unit: "car", pool: true },
  electronics: { icon: "box", tint: "rgba(255,209,102,.35)", label: "Electronics", unit: "item", pool: true },
  appliances: { icon: "fridge", tint: "rgba(255,194,154,.35)", label: "Appliances", unit: "item", pool: true },
  moving: { icon: "truck", tint: "rgba(255,209,102,.35)", label: "Moving" },
  other: { icon: "wrench", tint: "rgba(255,122,61,.35)", label: "Other" },
};
const cat = (c) => CAT[c] || CAT.other;
/** Unit noun for a request ("home" for services, "car" / "item" for item pools). */
const unitOf = (r) => cat(r.category).unit || "home";
/** One buyer's PayPal hold: their limit, or the refundable deposit for big-ticket item pools. Mirrors the server policy. */
const holdOf = (r, b) => (r.depositPerUnitCents ?? b.limitCents) * b.units;
const capOf = (r, price) => (r.depositPerUnitCents ? Math.min(r.depositPerUnitCents, price) : price);

// ---------- state / api ----------
let health = null;
let requests = [];
let audit = { verify: { ok: true, length: 0 }, entries: [] };
const ui = { draft: null, text: undefined, justRevealed: null, timers: [] };

function toast(msg, ms = 3600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), ms);
}
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.issues?.join("; ") || `Request failed (${res.status})`);
  return body;
}
const post = (path, data, headers) => api(path, { method: "POST", body: JSON.stringify(data ?? {}), headers });
async function act(btn, fn, { rerender = true } = {}) {
  const html = btn?.innerHTML;
  try {
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="caret">Working</span>`; }
    await fn();
  } catch (e) {
    toast(e.message, 6500);
  } finally {
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = html; }
    if (rerender) { await load(); render({ animate: false }); }
  }
}
async function load() {
  [requests, audit] = await Promise.all([api("/api/requests"), api("/api/audit").catch(() => audit)]);
  api("/api/health").then((h) => { health = h; const pills = envPills(); ["#env", "#env-top"].forEach((sel) => { const el = $(sel); if (el) el.innerHTML = pills; }); }).catch(() => {});
}

// ---------- navigation ----------
const NAV = [
  { id: "home", label: "Home", icon: "home", href: "#/home" },
  { id: "jobs", label: "Requests", icon: "jobs", href: "#/jobs" },
  { id: "new", label: "Start a request", icon: "plus", href: "#/new", fab: true },
  { id: "autopilot", label: "Autopilot", icon: "bolt", href: "#/autopilot" },
  { id: "pros", label: "Pros", icon: "pros", href: "#/pros", desk: true },
  { id: "trust", label: "Trust", icon: "shield", href: "#/trust" },
];
function renderNav(active) {
  $("#side-nav").innerHTML = NAV.filter((n) => !n.fab).map((n) => `<a href="${n.href}" class="${n.id === active ? "active" : ""} ${n.fab ? "cta" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
  $("#tabbar").innerHTML = NAV.filter((n) => !n.desk).map((n) => n.fab
    ? `<a href="${n.href}" class="fab" aria-label="${n.label}"><span class="fab-btn">${ic("plus")}</span></a>`
    : `<a href="${n.href}" class="${n.id === active ? "active" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
}
function envPills() {
  if (!health) return "";
  const pp = health.paypal === "sandbox";
  const prov = health.aiProvider || (health.ai.startsWith("claude") ? "claude" : "offline");
  const aiTxt = prov === "nvidia" ? `NVIDIA Nemotron${health.aiCreditsLeft != null ? ` · ~${health.aiCreditsLeft} cr` : ""}` : prov === "claude" ? "Claude online" : "AI offline rules";
  return `<span class="chip ${pp ? "ok" : "warn"}">${ic("lock")}${pp ? "PayPal sandbox" : "PayPal simulated"}</span>
    <a class="chip ${prov === "offline" ? "warn" : "violet"}" href="#/trust" title="${esc(health.ai)}">${ic("spark")}${esc(aiTxt)}</a>`;
}

// ---------- derived ----------
const funded = (r) => r.buyers.filter((b) => ["held", "captured"].includes(b.status));
const fundedUnits = (r) => funded(r).reduce((s, b) => s + b.units, 0);
const heldNow = (r) => r.buyers.filter((b) => b.status === "held").reduce((s, b) => s + (b.authorizedCents ?? 0), 0);
const STATUS = {
  open: ["Awaiting hold", ""],
  bidding: ["Bidding live", "lime"],
  revealing: ["Revealing", "lime"],
  awarded: ["Pro booked", "violet"],
  proving: ["Checking proof", "warn"],
  settled: ["Paid on proof", "ok"],
  released: ["Released · $0", "warn"],
};
/** Map a job's real status onto the 3D vault's visual state. */
const sceneState = (r) => {
  if (r.status === "settled") return "settled";
  if (r.status === "released") return "released";
  if (r.status === "proving") return "proving";
  if (r.status === "awarded") return "awarded";
  if (["bidding", "revealing"].includes(r.status) && r.commitments.length) return "bidding";
  return r.buyers.some((b) => b.status === "held") ? "held" : "idle";
};
const winnerIndex = (r) => Math.max(0, r.award ? r.commitments.findIndex((c) => c.providerId === r.award.providerId) : 0);
const statusText = (r) => {
  if (!r.buyers) return STATUS[r.status]?.[0] ?? r.status;
  if (r.status === "open") return r.flow === "quotes" ? "New request" : r.mode === "together" ? "Pool forming" : "Awaiting hold";
  if (r.status === "bidding") return "Sealed bidding";
  if (r.status === "awarded") return r.flow === "quotes" && !r.buyers.some((b) => b.status === "held") ? "Winner · book it" : unitOf(r) === "home" ? "Pro booked" : "Deal won";
  if (r.status === "proving") return r.paymentRequest?.overchargeCents > 0 && !r.paymentRequest.resolution ? "Overcharge blocked" : "Proof verified";
  return STATUS[r.status]?.[0] ?? r.status;
};
const statusChip = (r) => `<span class="chip ${STATUS[r.status]?.[1] ?? ""}">${r.status === "bidding" ? `<span class="pulse"></span>` : ""}${esc(statusText(r))}</span>`;
const FLOW = [
  ["Funded", "lock", (r) => funded(r).length > 0],
  ["Sealed", "hash", (r) => r.commitments.length > 0],
  ["Winner", "check", (r) => !!r.award],
  ["Proof", "camera", (r) => !!r.proof?.submittedAt],
  ["Paid", "receipt", (r) => r.status === "settled"],
];
const KIND = { paypal: "paypal", policy: "policy", ai: "ai", provider: "provider" };
const LABEL = {
  "request.created": "request created", "request.joined": "neighbour joined", "order.created": "order AUTHORIZE created", "hold.authorized": "hold placed",
  "bidding.opened": "bidding opened", "bid.committed": "sealed bid committed", "bidding.closed": "bidding closed", "bid.revealed": "bid revealed ✓ hash", "bid.reveal_rejected": "reveal REJECTED",
  "award.made": "winner chosen (deterministic)", "award.none": "no feasible bid", "offer.reviewed": "promise check", "proof.challenge_issued": "proof code issued", "proof.submitted": "proof submitted",
  "job.confirmed": "homeowner confirmed", "hold.captured": "capture", "hold.voided": "hold released", "hold.reauthorized": "hold renewed", "payout.created": "payout to pro",
  "sensor.alert": "sensor alert", "consent.voice": "consent on call", "recruit.call": "recruiting call", "proof.live_started": "live proof started", "proof.live_frame": "live frame checked",
  "settlement.approved": "settlement approved", "request.released": "all holds released", blocked: "POLICY BLOCKED", webhook: "webhook",
};
const feedLines = (entries, n = 8) => entries.slice(-n).reverse().map((e) => {
  const k = e.actor.split(":")[0];
  const d = e.data || {};
  const extra = d.amount ? ` $${d.amount}` : d.priceCents ? ` ${usd(d.priceCents)}` : d.hash ? ` ${String(d.hash).slice(0, 10)}…` : d.rule ? ` [${d.rule}]` : "";
  return `<div class="ln"><span class="t">${hhmm(e.at)}</span><span><span class="k ${KIND[k] || ""}">${esc(k)}</span> ${esc(LABEL[e.action] || e.action)}${esc(extra)}</span></div>`;
}).join("");

// ---------- use cases (home page) ----------
const USE_CASES = [
  { icon: "car", cat: "vehicles", live: true, hero: true, tag: "lead use case", title: "Cars, bought together", story: "Neighbours who want Toyotas (different models, one dealership) pool. Dealers' agents seal one fleet discount for the whole group; everyone holds just a refundable deposit.", example: "~8% off sticker on every model", paypal: "$500 deposit holds → applied at delivery" },
  { icon: "drop", cat: "plumbing", mode: "solo", live: true, title: "Hire a pro, pay on proof", story: "Licensed pros send sealed quotes. You book the winner, PayPal holds exactly that price, and video proof releases it.", example: "Water heater: $336 vs $400 max", paypal: "Authorize → capture on proof → Payouts" },
  { icon: "gutter", cat: "gutters", mode: "together", live: true, title: "Street group", story: "Neighbours fund the same job. One trip serves every home, so everyone gets the same lower price.", example: "$118/home vs $160 solo", paypal: "Many holds → many captures" },
  { icon: "box", cat: "electronics", live: true, preset: true, title: "Bulk items", story: "Parents, clubs or small offices pool an order of identical items. Retail agents bid for the batch; delivery photo releases the money.", example: "Chromebooks $267 vs $349", paypal: "Full-price holds → captures + Payouts" },
  { icon: "fridge", cat: "appliances", preset: true, title: "Appliances & upgrades", story: "Heat pumps, water heaters, EV chargers: a neighbourhood pools rebate-eligible upgrades and gets an installer's volume price.", example: "Hardware + install, one deal", paypal: "Pay Later on the balance" },
  { icon: "bolt", cat: "plumbing", title: "Autopilot (PayPal Vault)", tag: "built · add-on", story: "Save PayPal once with an emergency budget. A leak sensor files and funds the job at 3 a.m.; your agent calls before anyone is sent.", example: "$450 budget, no redirect", paypal: "Vault v3 → merchant-initiated AUTHORIZE" },
  { icon: "users", cat: "other", title: "Small-business restock", story: "Cafés and shops on one street pool supply orders (cups, beans, packaging) so a small buyer gets a big buyer's price.", example: "Monthly pooled orders", paypal: "Vault + recurring holds" },
];

// ---------- home ----------
function viewHome() {
  const held = requests.reduce((s, r) => s + heldNow(r), 0);
  const latest = requests.find((r) => heldNow(r) > 0) || requests.find((r) => !["settled", "released"].includes(r.status)) || requests[0];
  const st = latest ? sceneState(latest) : "idle";
  const ticker = audit.entries.slice(-14).reverse().map((e) => {
    const f = ACT[e.action];
    if (!f) return "";
    const [, kind, title] = f(e.data || {});
    return `<span><b class="${KIND[kind] || kind}">${esc(kind)}</b>${esc(title)}</span>`;
  }).join("");
  const settled = requests.filter((r) => r.status === "settled");
  const saved = settled.reduce((s, r) => s + (r.award?.buyerSavingCents || 0), 0);
  const blocks = audit.entries.filter((e) => e.action === "blocked" || e.action === "overcharge.detected").length;
  return `
  <section class="hero-ember">
    <div class="stage" id="stage" data-state="${st === "idle" ? "held" : st}" data-agents="${Math.max(3, latest?.commitments.length || 3)}" data-winner="${latest ? winnerIndex(latest) : 0}" data-amount="${esc(usd(latest ? (heldNow(latest) || latest.buyers.reduce((s, b) => s + holdOf(latest, b), 0)) : 0))}" data-label="${esc(st === "settled" ? "paid on proof" : "held · not paid")}">
      <div class="hud h1" data-float><span class="dotc">${ic("lock")}</span><div><small>Held in PayPal</small><b>${money(held, { count: true })}</b></div></div>
    </div>
    <div class="hero-inner">
      <h1 class="h-title" data-split>Buy Together. <br>Pay On <br><span class="soft">Proof.</span></h1>
      <div class="h-right">
        <p data-fade>Your AI agent pools buyers, makes sellers compete with sealed bids, and PayPal holds the money until the deal is delivered.</p>
        <div class="cta-row" data-fade><a class="btn primary" href="#/new">Start a request</a><a class="btn-round" href="#how" aria-label="How it works">${ic("arrow")}</a></div>
        <form class="cmd h-ask" id="ask" data-fade>
          ${ic("spark")}
          <input name="q" placeholder="A RAV4 Hybrid with my neighbours, max $36k…" aria-label="What do you need?" autocomplete="off" />
          <button class="btn primary" type="submit" aria-label="Ask agent">${ic("arrow")}</button>
        </form>
      </div>
      <div class="h-bottom">
        <div class="h-caption" data-fade>Pooled demand · sealed bids · paid on proof</div>
        <div class="h-social" data-fade><span class="lbl">Built on PayPal</span><span class="circ" title="PayPal hold">${ic("lock")}</span><span class="circ" title="Sealed bids">${ic("hash")}</span><span class="circ" title="Video proof">${ic("camera")}</span></div>
      </div>
    </div>
    <div class="wordmark" aria-hidden="true">AEONITH</div>
  </section>
  <div class="ticker" aria-label="Live agent activity"><div class="track-x">${ticker}${ticker}</div></div>

  <section class="story" id="problem" data-reveal>
    <div class="eyebrow">The problem</div>
    <h2 class="big">Buyers pay up front, alone, and hope.</h2>
    <div class="probs" data-stagger>
      <div class="card prob"><span class="pn">01</span><h3>Alone, you pay sticker</h3><p>Dealers and suppliers give volume prices to fleets and big buyers. Five neighbours buying the same brand get none of it, because they buy one at a time.</p></div>
      <div class="card prob"><span class="pn">02</span><h3>Money leaves before the work</h3><p>Deposits are paid up front and jobs go unfinished: <b>81,925</b> home-improvement fraud reports reached the FTC in 2024 alone.</p></div>
      <div class="card prob"><span class="pn">03</span><h3>Your budget is on the table</h3><p>Quotes are haggled one by one, and the price drifts up to whatever you said you could pay.</p></div>
    </div>
    <div class="eyebrow" style="margin-top:34px">What Aeonith does</div>
    <h2 class="big">An agent that buys like a crowd and pays like an escrow.</h2>
    <div class="sol" data-stagger>
      <div class="card sol-i"><span class="icon3">${ic("users")}</span><h3>Pool</h3><p>Your agent groups buyers who want the same thing from the same seller: cars, appliances, a street's gutter job.</p></div>
      <div class="card sol-i"><span class="icon3">${ic("hash")}</span><h3>Sealed bids</h3><p>Sellers' AI agents bid blind, locked by SHA-256. Nobody sees your max price, and nobody can change a bid.</p></div>
      <div class="card sol-i"><span class="icon3">${ic("lock")}</span><h3>PayPal holds it</h3><p>Money is authorized in PayPal, not paid. Only the sealed price can be captured, and only after proof.</p></div>
      <div class="card sol-i"><span class="icon3">${ic("camera")}</span><h3>Proof, then pay</h3><p>Video proof checked by NVIDIA vision. Your agent calls you before money moves. Overcharges are blocked.</p></div>
    </div>
  </section>

  <section class="why-pp" id="why" data-reveal>
    <div class="why-head"><div class="eyebrow">Why only PayPal</div><h2 class="big">Aeonith is PayPal's money rails, driven by agents.</h2>
      <p class="muted">Without these primitives this is just another marketplace taking deposits. With them, nobody holds anyone's money but PayPal.</p></div>
    <div class="why-grid" data-stagger>
      <div class="card why"><span class="pp-tag">Orders v2 · AUTHORIZE</span><h3>Hold, don't pay</h3><p>Funds are authorized on the buyer's own PayPal: real commitment for sellers, zero risk for buyers.</p></div>
      <div class="card why"><span class="pp-tag">Payments v2 · capture + void</span><h3>Pay exactly the sealed price</h3><p>Capture only the winning amount with final_capture; the rest is released automatically. Lost the pool? Voided: $0.</p></div>
      <div class="card why"><span class="pp-tag">Payouts v1</span><h3>Pay anyone, instantly</h3><p>Pros and dealers are paid to an email the moment proof passes, even pros we recruited by phone an hour ago.</p></div>
      <div class="card why"><span class="pp-tag">Vault v3</span><h3>Autopilot</h3><p>Save PayPal once with a budget. Emergencies are funded merchant-initiated, with no redirect, inside that budget.</p></div>
      <div class="card why"><span class="pp-tag">Reauthorize · webhooks</span><h3>Long deals, kept honest</h3><p>Holds renewed past the 3-day honor period; webhooks keep every state in sync with PayPal.</p></div>
      <div class="card why"><span class="pp-tag">Trust at checkout</span><h3>Buyers already have it</h3><p>Hundreds of millions of people pay with PayPal. No new wallet, no new card, no new account to trust.</p></div>
    </div>
  </section>

  <div class="sec-head" id="how"><div><div class="eyebrow">Use cases</div><h2 style="margin-top:6px">One engine, <span class="grad">many markets</span></h2></div><span class="small muted">pool · sealed bids · PayPal hold · proof · pay</span></div>
  <div class="usegrid" data-stagger>${USE_CASES.map((u) => {
    const live = requests.find((r) => r.category === u.cat && (u.mode ? r.mode === u.mode : true));
    return `<div class="card use ${u.hero ? "hero-use" : ""}" data-tilt>
      <div class="row-between"><span class="ico">${ic(u.icon)}</span><span class="chip ${u.live ? "lime" : ""}">${u.tag || (u.live ? "live in demo" : "same engine · next")}</span></div>
      <h3>${esc(u.title)}</h3>
      <p>${esc(u.story)}</p>
      <div class="use-kv"><div><small>Example</small><b>${esc(u.example)}</b></div><div><small>PayPal</small><b>${esc(u.paypal)}</b></div></div>
      ${live ? `<a class="btn ghost" href="#/job/${live.id}">Open the live one ${ic("arrow")}</a>` : u.preset ? `<button class="btn ghost" data-cat="${u.cat}">Try it ${ic("arrow")}</button>` : ""}
    </div>`;
  }).join("")}</div>

  <div class="sec-head"><div><div class="eyebrow">Live</div><h2 style="margin-top:6px">Right now on <span class="grad">Aeonith</span></h2></div><span class="chip ${audit.verify.ok ? "ok" : "bad"}">${ic("shield")}${audit.verify.length} events · chain ${audit.verify.ok ? "intact" : "broken"}</span></div>
  <div class="kpis" data-stagger>
    <div class="card kpi"><small>Requests</small><span class="v num">${requests.length}</span><div class="sub">${requests.filter((r) => !["settled", "released"].includes(r.status)).length} open</div></div>
    <div class="card kpi"><small>Held in PayPal</small><span class="v">${money(held, { count: true })}</span><div class="sub">reserved, not paid</div></div>
    <div class="card kpi"><small>Saved below buyers' max</small><span class="v">${money(saved, { count: true })}</span><div class="sub">across ${settled.length} settled deals</div></div>
    <div class="card kpi"><small>Overcharges blocked</small><span class="v num" style="color:${blocks ? "var(--red)" : "inherit"}">${blocks}</span><div class="sub">policy gate on every call</div></div>
  </div>
  <section class="card" style="margin-top:14px" data-reveal>
    <div class="card-head"><h3>Your requests</h3><a class="small muted" href="#/jobs">View all →</a></div>
    <div class="jobs">${requests.length ? requests.slice(0, 6).map(jobRow).join("") : `<div class="empty">No requests yet.</div>`}</div>
  </section>`;
}
function jobRow(r) {
  const c = cat(r.category);
  const fu = fundedUnits(r);
  const total = r.buyers.reduce((s, b) => s + b.units, 0);
  return `<a class="job" href="#/job/${r.id}">
    <span class="ico">${ic(c.icon)}</span>
    <div><h3>${esc(r.title)}</h3><div class="meta">${c.label.toLowerCase()} · ${esc(r.zip || "n/a")} · ${r.mode === "together" ? `${fu}/${total} ${unitOf(r)}s funded` : "solo"}</div>
      ${r.mode === "together" ? `<div class="bar"><i style="width:${total ? (fu / total) * 100 : 0}%"></i></div>` : ""}</div>
    <div class="right">${statusChip(r)}${r.award ? `<span class="price">${money(r.award.priceCents)}</span>` : `<span class="small muted">${r.commitments.length} sealed</span>`}</div>
  </a>`;
}

function viewJobs() {
  return `<div class="row-between" style="margin-bottom:16px"><div><div class="eyebrow">Purchases and jobs</div><h2 style="margin-top:6px">Requests</h2></div><a class="btn primary" href="#/new">${ic("plus")}Start a request</a></div>
    <div class="card"><div class="jobs">${requests.length ? requests.map(jobRow).join("") : `<div class="empty">No requests yet.</div>`}</div></div>`;
}

// ---------- job detail ----------
function viewJob(r) {
  if (!r) return `<a class="back" href="#/home">${ic("back")}Home</a><div class="card empty">Request not found.</div>`;
  const c = cat(r.category);
  const steps = flowSteps(r);
  const done = steps.map(([, , f]) => f(r));
  const nowIdx = done.indexOf(false);
  const req = r.requirements;
  return `
  <a class="back" href="#/jobs">${ic("back")}Requests</a>
  <div class="detail">
    <div class="col">
      <div class="card fade-in">
        <div class="job-title">
          <div class="ico">${ic(c.icon)}</div>
          <div style="min-width:0;flex:1"><div class="row" style="gap:6px">${statusChip(r)}<span class="chip">${r.catalog ? `${ic("car")}Buying together` : r.mode === "together" ? `${ic("users")}Together` : "Just me"}</span></div>
            <h1 style="margin-top:10px">${esc(r.title)}</h1>
            <p class="muted" style="margin:8px 0 0">${esc(r.description)}</p></div>
        </div>
        <div class="chips" style="margin-top:14px">
          <span class="chip">${ic(c.icon)}${c.label}</span>
          ${r.zip ? `<span class="chip">${ic("pin")}${esc(r.zip)}</span>` : ""}
          ${req.licensed ? `<span class="chip">${ic("shield")}${unitOf(r) === "home" ? "Licensed only" : "Licensed dealers"}</span>` : ""}
          ${req.minWarrantyMonths ? `<span class="chip">${ic("check")}${req.minWarrantyMonths}-mo warranty</span>` : ""}
          ${req.completeBy ? `<span class="chip">${ic("clock")}By ${esc(new Date(req.completeBy + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</span>` : ""}
        </div>
        <div class="flow" aria-label="Progress">${steps.map(([n, i], k) => `<div class="s ${done[k] ? "done" : k === nowIdx ? "now" : ""}"><span class="n">${done[k] ? ic("check") : ic(i)}</span>${n}</div>`).join("")}</div>
      </div>
      ${autopilotBanner(r)}
      <div class="mc-mobile">${vault(r)}</div>
      ${r.mode === "together" ? peopleCard(r) : ""}
      ${bidsCard(r)}
      ${winnerCard(r)}
      ${liveCard(r)}
      ${proofCard(r)}
      ${payCard(r)}
      ${receiptCard(r)}
      ${callsCard(r)}
    </div>
    <aside class="rail">${vault(r)}${activityCard(r)}</aside>
  </div>`;
}
function flowSteps(r) {
  const held = (x) => x.buyers.some((b) => ["held", "captured"].includes(b.status));
  if (r.flow === "quotes") return [["Sealed quotes", "hash", (x) => x.commitments.length > 0], ["Winner", "check", (x) => !!x.award], ["PayPal hold", "lock", held], ["Video proof", "camera", (x) => !!x.proof?.submittedAt], ["Paid", "receipt", (x) => x.status === "settled"]];
  if (r.mode === "together") return [["Deposits held", "lock", held], ["Sealed offers", "hash", (x) => x.commitments.length > 0], ["Winner", "check", (x) => !!x.award], ["Proof", "camera", (x) => !!x.proof?.submittedAt], ["Paid", "receipt", (x) => x.status === "settled"]];
  return [["PayPal hold", "lock", held], ["Sealed bids", "hash", (x) => x.commitments.length > 0], ["Winner", "check", (x) => !!x.award], ["Proof", "camera", (x) => !!x.proof?.submittedAt], ["Paid", "receipt", (x) => x.status === "settled"]];
}

function nextAction(r) {
  const pending = r.buyers.find((b) => b.status === "pending");
  const anyHeld = r.buyers.some((b) => b.status === "held");
  const goods = unitOf(r) !== "home";
  const bids = goods ? "offers" : "quotes";
  if (r.flow === "quotes") {
    if (["open", "bidding"].includes(r.status) && !r.commitments.length) return { id: "run", label: "Ask local pros for sealed quotes" };
    if (r.status === "bidding") return { id: "close", label: `Open the ${r.commitments.length} sealed quotes` };
    if (r.status === "awarded" && !anyHeld) return { id: "book", label: `Book ${r.award.providerName} with PayPal`, buyer: r.buyers[0].id };
  } else {
    if (["open", "bidding"].includes(r.status) && pending && (r.mode === "solo" || r.buyers.indexOf(pending) === 0 || !anyHeld))
      return { id: "hold", label: r.depositPerUnitCents ? `Join with a ${usd0(r.depositPerUnitCents)} refundable deposit` : `Hold ${usd0(holdOf(r, pending))} with PayPal`, buyer: pending.id };
    if (["open", "bidding"].includes(r.status) && anyHeld && !r.commitments.length) return { id: "run", label: goods ? "Ask dealers for sealed offers" : "Ask pros for sealed quotes" };
    if (r.status === "bidding" && r.commitments.length) return { id: "close", label: `Open the ${r.commitments.length} sealed ${bids}` };
  }
  if (r.status === "awarded" && r.autopilotId && !r.bookedAt) return { id: "call", intent: "book", label: "Answer your agent's call" };
  if (r.status === "awarded" && r.live && !r.live.finishedAt) return { id: "scroll", target: "live", label: "Pro is recording video proof" };
  if (r.status === "awarded") return { id: "live", label: goods ? "Seller: record delivery proof" : "Pro: record video proof" };
  if (r.status === "proving" && r.proof?.verdict !== "fail") {
    if (!r.paymentRequest) return { id: "scroll", target: "pay", label: goods ? "Seller: request payment" : "Pro: request payment" };
    return { id: "call", intent: r.paymentRequest.overchargeCents > 0 && !r.paymentRequest.resolution ? "overcharge" : "release", label: "Answer your agent's call" };
  }
  return null;
}

function vault(r) {
  const mine = r.mode === "solo" ? r.buyers[0] : null;
  const isHeld = r.buyers.some((b) => b.status === "held");
  const heldAmt = r.mode === "solo" ? (mine?.authorizedCents ?? 0) : r.buyers.filter((b) => b.authorizedCents).reduce((s, b) => s + b.authorizedCents, 0);
  const charged = r.buyers.reduce((s, b) => s + (b.capturedCents || 0), 0);
  const proven = r.status === "proving" && (r.proof?.verdict === "pass" || !!r.buyerConfirmedAt);
  const stage = r.status === "settled" ? 3 : proven ? 2 : isHeld || r.status === "proving" ? 1 : 0;
  const t = (k, label, icon) => `<div class="t ${stage > k ? "done" : stage === k ? "now" : ""}"><span class="dot">${stage > k ? ic("check") : ic(icon)}</span>${label}</div>`;
  const next = nextAction(r);
  const dep = r.depositPerUnitCents;
  let eyebrow, amount, sub, state;
  if (r.status === "settled" && dep) { eyebrow = "Deposits applied"; amount = charged; sub = `${usd(r.settlement?.balanceDueCents)} balance to the dealer at handover`; state = "applied on delivery"; }
  else if (r.status === "settled") { eyebrow = "Paid on proof"; amount = charged; sub = heldAmt > charged ? `${usd(heldAmt - charged)} returned to ${r.mode === "solo" ? "you" : "buyers"}` : "Exactly the sealed price. Nothing more."; state = "paid on proof"; }
  else if (r.status === "released") { eyebrow = "Released"; amount = 0; sub = "Every hold voided. Nobody was charged."; state = "nothing charged"; }
  else if (isHeld) { eyebrow = r.mode === "solo" ? "Held by PayPal" : dep ? "Deposits held by PayPal" : "Held across the street"; amount = heldNow(r) || heldAmt; sub = r.award ? (dep ? `Winning deal: ${r.award.discountBps ? `${(r.award.discountBps / 100).toFixed(1)}% off every model` : usd(r.award.priceCents)}. Only deposits are held.` : `Paid to ${r.award.providerName} only after proof.`) : dep ? "Refundable. Not paid to anyone." : "Reserved in PayPal. Not paid to anyone."; state = "held · not paid"; }
  else if (r.flow === "quotes" && r.award) { eyebrow = "Winning sealed quote"; amount = r.award.priceCents; sub = `Book ${r.award.providerName}: PayPal holds exactly this amount until the work is proven.`; state = "ready to book"; }
  else { eyebrow = r.flow === "quotes" ? "Your private budget" : r.mode === "solo" ? "Your private limit" : "Pool"; amount = r.flow === "quotes" ? r.buyers[0].limitCents : r.buyers.reduce((s, b) => s + holdOf(r, b), 0); sub = r.flow === "quotes" ? "Pros never see it. Nothing is held until you book a winner." : dep ? "Refundable deposits. Sellers never see anyone's max price." : "Pros never see this number."; state = "private"; }
  const pct = r.status === "settled" ? 1 : heldAmt && r.award ? Math.min(1, (r.award.unitPrices ? Object.values(r.award.unitPrices).reduce((s, v) => s + v, 0) : r.award.priceCents * r.award.unitsServed) / (dep ? Infinity : heldAmt)) : 1;
  const C = 2 * Math.PI * 38;
  const showRing = (isHeld || r.status === "settled") && !dep;
  const lines = [];
  if (r.award && !r.award.discountBps) lines.push(["Sealed price", `${usd(r.award.priceCents)}${r.mode === "together" ? ` × ${r.award.unitsServed}` : ""}`]);
  if (r.award?.discountBps) lines.push(["Fleet discount", `${(r.award.discountBps / 100).toFixed(1)}% off MSRP`], ["Cars in the deal", String(r.award.unitsServed)]);
  if (r.settlement?.payout) lines.push(["Paid to " + (unitOf(r) === "home" ? "pro" : "seller"), usd(r.settlement.payout.amountCents)], ["Platform fee", usd(r.settlement.payout.feeCents)]);
  if (r.settlement?.balanceDueCents) lines.push(["Balance at handover", usd(r.settlement.balanceDueCents)]);
  if (r.award && isHeld && !dep && heldAmt > r.award.priceCents) lines.push(["Returned to you", usd(heldAmt - r.award.priceCents)]);
  return `<div class="vault fade-in">
    <div class="vault3d" data-vault3d data-amount="${esc(usd(amount))}" data-label="${esc(state)}" data-state="${sceneState(r)}" data-agents="${Math.max(3, r.commitments.length || 3)}" data-winner="${winnerIndex(r)}"><span class="tag">${esc(state)}</span></div>
    <div class="top">
      <div style="min-width:0"><div class="eyebrow">${ic("vault", "inline")} ${esc(eyebrow)}</div>
        <div class="amount">${money(amount, { count: true })}</div><div class="sub">${esc(sub)}</div></div>
      ${showRing ? `<div class="ring" aria-hidden="true"><svg viewBox="0 0 92 92"><circle class="trackc" cx="46" cy="46" r="38"/><circle class="fill" cx="46" cy="46" r="38" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - pct)}"/></svg><div class="lbl"><b>${r.status === "settled" ? "Paid" : `${Math.round(pct * 100)}%`}</b><span>${r.status === "settled" ? "on proof" : "of hold"}</span></div></div>` : ""}
    </div>
    <div class="track">${t(0, "PayPal hold", "lock")}${t(1, "Work proven", "camera")}${t(2, "Paid out", "receipt")}</div>
    ${lines.length ? `<div class="lines">${lines.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>` : ""}
    ${next ? `<button class="btn primary block" data-next>${esc(next.label)} ${ic("arrow")}</button>` : ""}
    <div class="hint">${health?.paypal === "sandbox" ? "PayPal sandbox · live API calls" : "simulated PayPal · add sandbox keys for live calls"}</div>
  </div>`;
}

function peopleCard(r) {
  const open = ["open", "bidding"].includes(r.status);
  const item = (b) => r.catalog?.items.find((i) => i.id === b.itemId);
  if (r.flow === "quotes") return "";
  const rows = r.buyers.map((b) => {
    const st = { held: ["ok", r.depositPerUnitCents ? "deposit held" : "held"], captured: ["ok", `paid ${usd(b.capturedCents)}`], voided: ["warn", "released · $0"], failed: ["bad", "failed"], pending: ["", "not held yet"] }[b.status];
    const it = item(b);
    const mine = r.award?.unitPrices?.[b.id];
    return `<div class="person">
      <span class="avatar" style="background:${tint(b.name)}">${esc(initials(b.name))}</span>
      <div class="who"><b>${esc(b.name)}</b><small>${it ? `${esc(it.name)} · MSRP ${usd0(it.msrpCents)} · ` : ""}${r.depositPerUnitCents ? "max price" : "limit"} ${usd0(b.limitCents)} · private</small>${mine ? `<small class="saved">Pays ${usd0(mine)} · saves ${usd0((it?.msrpCents ?? mine) - mine)} vs sticker</small>` : ""}${b.note ? `<small style="color:var(--amber)">${esc(b.note)}</small>` : ""}</div>
      <div class="act"><span class="chip ${st[0]}">${st[1]}</span>
        ${b.status === "pending" && open ? `<button class="btn primary" data-hold="${b.id}">${ic("lock")}${r.depositPerUnitCents ? `Hold ${usd0(r.depositPerUnitCents)} deposit` : `Hold ${usd0(holdOf(r, b))}`}</button>` : ""}</div>
    </div>`;
  }).join("");
  const join = r.mode === "together" && open ? `
    <form class="form-grid" data-join style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
      <label class="field">Name<input class="input" name="name" required placeholder="Jordan" /></label>
      ${r.catalog ? `<label class="field">Model<select class="input" name="itemId">${r.catalog.items.map((i) => `<option value="${esc(i.id)}">${esc(i.name)} · ${usd0(i.msrpCents)}</option>`).join("")}</select></label>` : ""}
      <label class="field">${r.depositPerUnitCents ? `Your max price ($, private)` : "Private limit per home ($)"}<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required /></label>
      <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${ic("plus")}Join this pool</button></div>
    </form>` : "";
  const total = r.buyers.reduce((s, b) => s + b.units, 0);
  return `<div class="card fade-in" id="people">
    <div class="card-head"><div><h3>${r.catalog ? `Buyers in the pool · ${esc(r.catalog.seller)}` : cat(r.category).pool ? "Buyers in the pool" : r.mode === "solo" ? "Funded request" : "Neighbours"}</h3><div class="small muted" style="margin-top:4px">${r.catalog ? "Different models, one dealership: the dealer gives the whole group one fleet discount. Everyone holds a refundable PayPal deposit; if the final price for your model is above your private max, you're released, never charged." : r.depositPerUnitCents ? `Each buyer holds a refundable ${usd0(r.depositPerUnitCents)} deposit.` : r.mode === "solo" ? "One PayPal approval. Charged only on proof." : "Each home approves its own hold. Below the final price → released, never charged."}</div></div>
      ${r.mode === "together" ? `<span class="chip lime">${fundedUnits(r)}/${total} deposits held</span>` : ""}</div>
    <div class="people">${rows}</div>${join}
  </div>`;
}

function bidsCard(r) {
  const goods = unitOf(r) !== "home";
  const who = goods ? "dealers" : "pros";
  const explain = `<div class="seal-explain">
      <div><span class="si">${ic("lock")}</span><b>Sealed on send</b><small>Each ${goods ? "dealer's" : "pro's"} AI agent locks its bid with a SHA-256 fingerprint.</small></div>
      <div><span class="si">${ic("shield")}</span><b>Nobody can peek</b><small>Not other ${who}, not even Aeonith. Your budget is never shown.</small></div>
      <div><span class="si">${ic("check")}</span><b>Opened together</b><small>Every bid must match its fingerprint. Plain code picks the winner.</small></div>
    </div>`;
  const live = ui.liveCalls?.rid === r.id ? `<div class="livecalls" id="livecalls"></div>` : "";
  if (!r.commitments.length) {
    const can = ["open", "bidding"].includes(r.status) && (r.flow === "quotes" || r.buyers.some((b) => b.status === "held"));
    return `<div class="card fade-in hero-card" id="bids"><div class="card-head"><div><div class="eyebrow">${ic("hash", "inline")} Sealed bids</div><h3 style="margin-top:6px">${goods ? "Dealers compete for the whole group" : "Pros compete for your job"}, blind</h3></div></div>
      ${explain}
      ${ui.receiving === r.id ? `<div class="receiving"><span class="spin"></span>Sending your request to verified ${who}' agents… waiting for sealed bids</div>` : `<div class="note">${ic("info")}<div>${can ? `Ready. Ask ${who} for sealed ${goods ? "offers" : "quotes"}: they see the ${goods ? "models and number of buyers" : "job and area"}, never your ${goods ? "max price" : "budget"}.` : "Waiting for buyers to join with their PayPal deposit."}</div></div>`}
      ${live}</div>`;
  }
  const revealedNow = ui.justRevealed === r.id;
  const arriving = ui.arrive?.rid === r.id;
  const n = r.commitments.length;
  const items = r.commitments.map((c, i) => {
    const rev = r.reveals.find((v) => v.offer.providerId === c.providerId);
    const row = r.award?.table.find((t) => t.providerId === c.providerId);
    const win = r.award?.providerId === c.providerId;
    const o = rev?.offer;
    const isNew = arriving && i >= ui.arrive.from;
    const delay = isNew ? (i - ui.arrive.from) * 700 : revealedNow ? i * 750 : 0;
    const recruited = (r.recruited || []).some((p) => p.id === c.providerId);
    return `<div class="bid ${win ? "win" : r.award ? "out" : ""} ${isNew ? "arrive" : ""} ${rev && revealedNow ? "reveal-anim" : ""} ${win && revealedNow ? "win-late" : ""}" style="animation-delay:${delay}ms;${win && revealedNow ? `--win-delay:${n * 750 + 300}ms` : ""}">
      ${win ? `<span class="ribbon">WINNER</span>` : ""}
      <div class="head"><span class="avatar" style="background:${tint(c.providerName)}">${esc(initials(c.providerName))}</span>
        <div style="min-width:0"><b>${esc(c.providerName)}</b><div class="small muted">${recruited ? "recruited by phone" : "AI agent"} · sealed ${hhmm(c.committedAt)}</div></div></div>
      ${!rev ? `<div class="sealed"><div class="lockrow">${ic("lock")}sealed · sha-256</div><div class="scramble" data-hash="${esc(c.hash)}">${esc(c.hash)}</div></div>`
        : `<div><span class="price">${o.discountBps ? `${(o.discountBps / 100).toFixed(1)}%<small> off every model</small>` : money(o.priceCents)}</span><span class="muted small">${o.minUnits > 1 ? ` · min ${o.minUnits} ${unitOf(r)}s` : ""}</span></div>
           <div class="chips">${o.promises.licensed ? `<span class="chip ok">${ic("shield")}${esc(o.promises.licenseNo)}</span>` : `<span class="chip bad">${ic("x")}unlicensed</span>`}
             <span class="chip">${o.promises.warrantyMonths}-mo warranty</span><span class="chip">${ic("clock")}${esc(when(o.promises.startAt, { minute: undefined, month: undefined, day: undefined }))}</span></div>
           <div>${rev.valid ? `<span class="chip lime">${ic("check")}matches its sealed hash</span>` : `<span class="chip bad">${esc(rev.rejectReason)}</span>`}</div>
           ${row && !win ? `<div class="why">${esc(row.note)}</div>` : ""}`}
    </div>`;
  }).join("");
  const opened = r.reveals.length > 0;
  return `<div class="card fade-in hero-card" id="bids"><div class="card-head"><div><div class="eyebrow">${ic("hash", "inline")} Sealed bids</div><h3 style="margin-top:6px">${opened ? `${n} bids opened · every fingerprint checked` : `${n} sealed bid${n === 1 ? "" : "s"} · nobody can read them yet`}</h3></div><span class="chip ${opened ? "ok" : "lime"}">${opened ? "verified" : `<span class="pulse"></span>sealed`}</span></div>
    ${opened ? "" : explain}
    ${arriving ? `<div class="receiving done" style="--n:${n - ui.arrive.from}"><span class="spin"></span><span>Receiving sealed bids</span><i class="bar"></i></div>` : ""}
    ${r.status === "bidding" ? recruitBtn(r) : ""}
    ${live}
    <div class="bids">${items}</div></div>`;
}

function winnerCard(r) {
  if (!r.award) return "";
  const a = r.award;
  const w = r.reveals.find((v) => v.offer.providerId === a.providerId);
  const rev = r.aiOfferReview;
  const outs = a.buyersOut.map((o) => `<li><b>${esc(r.buyers.find((b) => b.id === o.buyerId)?.name)}</b>: ${esc(o.reason)}</li>`).join("");
  const perBuyer = a.unitPrices ? `<div class="savings">${r.buyers.filter((b) => a.unitPrices[b.id]).map((b) => {
    const it = r.catalog?.items.find((i) => i.id === b.itemId);
    const p = a.unitPrices[b.id];
    return `<div class="sv"><span class="avatar" style="background:${tint(b.name)}">${esc(initials(b.name))}</span><div style="min-width:0"><b>${esc(b.name)}</b><small>${esc(it?.name ?? "")}</small></div><div class="r"><s>${usd0(it?.msrpCents ?? p)}</s><b>${usd0(p)}</b><small>saves ${usd0((it?.msrpCents ?? p) - p)}</small></div></div>`;
  }).join("")}</div>` : "";
  return `<div class="card fade-in" id="winner">
    <div class="card-head"><div><div class="eyebrow">Picked by code, not by AI</div><h3 style="margin-top:6px">${esc(a.providerName)} wins</h3></div><span class="win-price">${a.discountBps ? `${(a.discountBps / 100).toFixed(1)}% off` : money(a.priceCents)}</span></div>
    <p style="margin:0 0 12px;color:var(--ink-2)">${esc(a.reason)}</p>
    ${perBuyer}
    ${rev ? `<div class="ai-panel"><div class="ai-h">${ic("spark")}<span>NVIDIA Nemotron · promise check</span><span class="chip ${rev.ok ? "ok" : "warn"}">${rev.ok ? "all promises match" : "check flags"}</span></div><p>${esc(rev.summary)}</p>${rev.flags.length ? `<ul>${rev.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
      ${w ? `<div class="ai-facts"><span>${w.offer.promises.licensed ? `Licensed ${esc(w.offer.promises.licenseNo)}` : "Not licensed"}</span><span>${w.offer.promises.warrantyMonths}-month warranty</span><span>Starts ${esc(when(w.offer.promises.startAt))}</span></div>` : ""}</div>` : ""}
    ${outs ? `<div class="note warn" style="margin-top:10px">${ic("hand")}<div><b>Released, never charged</b><ul>${outs}</ul></div></div>` : ""}
    <div class="small muted" style="margin:14px 0 8px">Every sealed offer side by side (AG Grid):</div>
    <div class="grid-host" id="bids-grid-${esc(r.id)}"></div>
  </div>`;
}

function proofCard(r) {
  if (!["awarded", "proving", "settled"].includes(r.status)) return "";
  const goods = unitOf(r) !== "home";
  const booked = r.flow !== "quotes" || r.buyers.some((b) => ["held", "captured"].includes(b.status));
  if (r.status === "awarded" && r.live && !r.live.finishedAt) return "";
  if (r.status === "awarded") {
    return `<div class="card fade-in" id="proof"><div class="card-head"><div><div class="eyebrow">${ic("camera", "inline")} ${goods ? "Delivery" : "Video"} proof</div><h3 style="margin-top:6px">Money moves only after the ${goods ? "delivery" : "work"} is proven</h3></div></div>
      <p class="muted small" style="margin:0 0 12px">${goods ? "The dealer records the handover." : "When the job is done, the pro records a short video in the Aeonith camera."} Every frame is stamped with this job's live session and time, so an old photo or someone else's video can't be reused. NVIDIA vision checks it's <b>this</b> job, finished.</p>
      ${booked && (!r.autopilotId || r.bookedAt) ? `<div class="live-cta"><button class="btn primary" data-live>${ic("camera")}Record video proof</button><label class="btn ghost upl">${ic("upload")}Upload photo or video<input type="file" accept="image/*,video/*" data-upload hidden /></label></div>` : `<div class="note">${ic("lock")}<div>Book the winner with PayPal first.</div></div>`}
    </div>`;
  }
  return verifyCard(r);
}
function verifyCard(r) {
  const p = r.proof;
  if (!p?.checks?.length) return "";
  const frames = r.live?.frames || [];
  const best = frames.find((f) => f.matchesJob === true) || frames[frames.length - 1];
  const conf = best?.confidence ?? (p.verdict === "pass" ? 90 : 50);
  const ok = p.verdict === "pass";
  const C = 2 * Math.PI * 34;
  const codeChecks = p.checks.filter((c) => c.by === "code");
  return `<div class="card fade-in" id="proof">
    <div class="verify ${ok ? "pass" : p.verdict === "fail" ? "fail" : "review"}">
      <div class="v-ring"><svg viewBox="0 0 80 80"><circle class="trackc" cx="40" cy="40" r="34"/><circle class="fill" cx="40" cy="40" r="34" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - conf / 100)}"/></svg><div class="v-lbl"><b>${conf}%</b><small>confidence</small></div></div>
      <div class="v-body"><div class="eyebrow">${ic("spark", "inline")} NVIDIA Nemotron vision · ${frames.length || 1} frame${frames.length === 1 ? "" : "s"}</div>
        <h3>${ok ? "Verified: the work is done" : p.verdict === "fail" ? "Not verified: money stays held" : "Needs your eyes"}</h3>
        <p>${esc(best?.summary || p.aiSummary || "")}</p>
        ${best?.observations?.length ? `<ul class="obs">${best.observations.map((o) => `<li>${ic("check")}${esc(o)}</li>`).join("")}</ul>` : ""}
        ${best?.concerns?.length ? `<ul class="obs warn">${best.concerns.map((o) => `<li>${ic("info")}${esc(o)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>
    <div class="v-chips">${codeChecks.map((c) => `<span class="chip ${c.ok ? "ok" : c.ok === false ? "bad" : ""}" title="${esc(c.detail)}">${ic(c.ok ? "check" : c.ok === false ? "x" : "info")}${esc(c.name)}</span>`).join("")}<span class="chip mono">sha256 ${esc((p.photoSha256 || "").slice(0, 12))}…</span></div>
  </div>`;
}

function receiptCard(r) {
  if (r.status === "released") return `<div class="card fade-in"><h3>Released</h3><p class="muted" style="margin:6px 0 0">Every hold was voided. Nobody was charged.</p></div>`;
  if (r.status !== "settled" || !r.settlement) return "";
  const s = r.settlement;
  const lines = r.buyers.map((b) => {
    const cap = s.captures.find((c) => c.buyerId === b.id);
    const held = b.authorizedCents ?? holdOf(r, b);
    return `<div class="rline"><div><b>${esc(b.name)}</b><div class="small muted mono">held ${usd(held)}${cap ? ` · ${esc(cap.captureId)}` : ` · ${esc(b.note || "released")}`}</div></div>
      <div class="r"><b>${money(cap ? cap.amountCents : 0)}</b><div class="small" style="color:var(--ok)">${r.depositPerUnitCents && cap ? `deposit applied · ${usd((r.award.unitPrices?.[b.id] ?? r.award.priceCents) * b.units - cap.amountCents)} at handover` : `${usd(cap ? held - cap.amountCents : held)} back`}</div></div></div>`;
  }).join("");
  const flag = (r.flags || [])[0];
  return `<div class="card fade-in"><div class="card-head"><div><div class="eyebrow">Receipt</div><h3 style="margin-top:6px">Settled on PayPal</h3></div>${ic("receipt")}</div>
    <div>${lines}</div>
    ${s.payout ? `<div class="note ok" style="margin-top:12px">${ic("check")}<div><b>${usd(s.payout.amountCents)} paid to ${esc(r.award.providerName)}</b> by PayPal Payouts (fee ${usd(s.payout.feeCents)}).${s.balanceDueCents ? ` The ${usd(s.balanceDueCents)} balance is paid to the dealer at handover, at the sealed price.` : ""}<div class="small mono" style="margin-top:4px">batch ${esc(s.payout.batchId)} · ${esc(s.payout.status)}</div></div></div>` : ""}
    ${flag ? `<div class="note bad" style="margin-top:10px">${ic("shield")}<div><b>Warning recorded on ${esc(flag.providerName)}</b>: ${esc(flag.reason)}. Repeat overcharges remove a pro from future sealed bids.</div></div>` : ""}</div>`;
}

// ---------- post a job ----------
const CAR_CATALOG = {
  seller: "Toyota dealers · Austin, TX",
  items: [
    { id: "rav4-xle", name: "2026 RAV4 Hybrid XLE", msrpCents: 3650000, source: "dealer list (sample MSRP)" },
    { id: "camry-se", name: "2026 Camry SE", msrpCents: 3220000, source: "dealer list (sample MSRP)" },
    { id: "ccross-s", name: "2026 Corolla Cross Hybrid S", msrpCents: 3080000, source: "dealer list (sample MSRP)" },
    { id: "ghl-xle", name: "2026 Grand Highlander XLE", msrpCents: 4890000, source: "dealer list (sample MSRP)" },
  ],
};
function viewNew() {
  const d = ui.draft;
  const kind = ui.kind || (d && cat(d.category).pool ? "buy" : "buy");
  const sample = kind === "buy"
    ? "I want a 2026 RAV4 Hybrid, max $35,500, Austin 78704. A few neighbours want Toyotas too, some want a Camry. Need 36-month warranty."
    : "Water heater is leaking in my garage, need it fixed by Friday, max $400, Austin 78704. Licensed plumber only.";
  const isCar = d?.category === "vehicles";
  const isProduct = d && ["electronics", "appliances"].includes(d.category);
  const q = ui.questions;
  return `<div style="margin-bottom:16px"><div class="eyebrow">Start a request</div><h2 style="margin-top:6px">What do you <span class="grad">need?</span></h2></div>
  <div class="seg kind-seg" role="tablist"><label><input type="radio" name="kind" value="buy" ${kind === "buy" ? "checked" : ""} />${ic("car")}Buy something together</label><label><input type="radio" name="kind" value="hire" ${kind === "hire" ? "checked" : ""} />${ic("wrench")}Hire a pro</label></div>
  <div class="grid-2" style="margin-top:14px">
    <div class="stack">
      <div class="card fade-in">
        <label class="field">Say it or type it, in your own words<textarea class="input" id="intake" rows="4">${esc(ui.text ?? sample)}</textarea></label>
        <div class="voice ${ui.listening ? "on" : ""}" id="voice"><button class="mic" id="mic" type="button" aria-label="Record a voice note">${ic("mic")}</button><div class="vwave">${Array.from({ length: 32 }, (_, i) => `<i style="animation-delay:${(i % 8) * 80}ms"></i>`).join("")}</div><span class="small muted" id="voice-l">${ui.listening ? "Listening… transcribing" : "Voice note"}</span></div>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="parse">${ic("spark")}Let the agent understand it</button><span class="small muted mono" id="src">${d ? (d.source === "ai" ? "NVIDIA Nemotron" : "offline rules") : ""}</span></div>
        ${d ? `<div class="ai-panel" style="margin-top:14px"><div class="ai-h">${ic("spark")}<span>Your agent understood</span></div>
          <div class="chips"><span class="chip">${cat(d.category).label}</span>${d.limitDollars ? `<span class="chip lime">max ${usd0(d.limitDollars * 100)}</span>` : `<span class="chip warn">no max price yet</span>`}${d.licensed ? `<span class="chip">${isCar ? "licensed dealer" : "licensed"}</span>` : ""}${d.completeBy ? `<span class="chip">by ${esc(d.completeBy)}</span>` : ""}${d.zip ? `<span class="chip">${esc(d.zip)}</span>` : ""}${d.minWarrantyMonths ? `<span class="chip">${d.minWarrantyMonths}-mo warranty</span>` : ""}</div></div>` : ""}
        ${q?.questions?.length ? `<div class="ai-panel qs" style="margin-top:12px"><div class="ai-h">${ic("spark")}<span>${q.questions.length} quick questions from your agent</span><span class="small muted">better answers → better sealed offers</span></div>
          ${q.questions.map((x) => `<div class="qa" data-q="${esc(x.id)}"><b>${esc(x.question)}</b><small>${esc(x.why)}</small><div class="chips">${x.options.map((o) => `<button type="button" class="chip opt ${ui.answers?.[x.id] === o ? "sel" : ""}" data-opt="${esc(o)}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
          <button class="btn" id="apply-answers" style="margin-top:10px">${ic("check")}Use my answers</button></div>` : ""}
      </div>
      ${isProduct ? `<div class="card fade-in" id="c3"><div class="card-head"><div><div class="eyebrow">${ic("box", "inline")} Real products · Channel3 catalog</div><h3 style="margin-top:6px">Pick the exact item the pool buys</h3></div></div><div class="c3-grid" id="c3-grid"><div class="caret small muted">Searching retail catalog</div></div></div>` : ""}
    </div>
    <form class="card fade-in" id="draft" style="${d ? "" : "display:none"}">
      ${isCar ? `<div class="field full">Choose your model <span class="small muted">· everyone in the pool can pick a different one from the same dealership</span>
        <div class="models">${CAR_CATALOG.items.map((m, i) => `<label class="model"><input type="radio" name="itemId" value="${m.id}" ${(ui.itemId || "rav4-xle") === m.id ? "checked" : ""} />${ic("car")}<b>${esc(m.name)}</b><small>MSRP ${usd0(m.msrpCents)}</small></label>`).join("")}</div></div>` : ""}
      <div class="form-grid">
        <label class="field full">${isCar || isProduct ? "Pool name" : "Job"}<input class="input" name="title" required value="${esc(isCar ? "Toyota pool · one Austin dealership" : d?.title)}" /></label>
        <label class="field full">Details for sellers<input class="input" name="description" value="${esc(d?.description)}" /></label>
        <label class="field">Category<select class="input" name="category">${Object.keys(CAT).map((k) => `<option value="${k}" ${d?.category === k ? "selected" : ""}>${CAT[k].label}</option>`).join("")}</select></label>
        <label class="field">ZIP code<input class="input" name="zip" inputmode="numeric" value="${esc(d?.zip)}" /></label>
        <label class="field">${isCar || isProduct ? "Your max price ($) · private" : "Most you'll pay ($) · private"}<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required value="${d?.limitDollars || ""}" /></label>
        <label class="field">${isCar ? "Deliver by" : "Start by"}<input class="input" name="completeBy" type="date" value="${esc(d?.completeBy)}" /></label>
        <label class="field">Minimum warranty (months)<input class="input" name="minWarrantyMonths" type="number" min="0" value="${d?.minWarrantyMonths ?? (isCar ? 36 : 0)}" /></label>
        ${isCar || isProduct ? `<label class="field">Refundable deposit ($)<input class="input" name="depositDollars" type="number" min="1" inputmode="decimal" value="${isCar ? 500 : ""}" placeholder="e.g. 50" /></label>` : ""}
        <label class="switch full"><input type="checkbox" name="licensed" ${d?.licensed || isCar ? "checked" : ""} />${isCar ? "Licensed dealers only" : "Licensed pro required"}</label>
        <input type="hidden" name="mode" value="${isCar || isProduct ? "together" : "solo"}" />
        <label class="field full">Your name<input class="input" name="buyerName" value="Maria G." /></label>
      </div>
      <div class="note" style="margin-top:14px">${ic("lock")}<div>${isCar || isProduct ? "Next: join the pool with a <b>refundable PayPal deposit</b>. Dealers then bid blind for the whole group. Your max price stays private." : "Next: licensed pros send <b>sealed quotes</b>. You book the winner and PayPal holds exactly that price until the work is proven."}</div></div>
      <button class="btn primary block" type="submit" style="margin-top:14px">${isCar || isProduct ? "Start the pool" : "Ask for sealed quotes"} ${ic("arrow")}</button>
    </form>
  </div>`;
}

// ---------- pros ----------
let scheduler;
function viewPros(signals) {
  return `<div style="margin-bottom:16px"><div class="eyebrow">Offer Protocol v1 · HTTP + MCP</div><h2 style="margin-top:6px">What pros' agents <span class="grad">see</span></h2>
    <p class="muted" style="margin:8px 0 0;max-width:640px">Everything a provider agent receives. There's no field that could carry a buyer's limit: by design, and by test.</p></div>
  <div class="nolimit">${ic("shield")}Buyer price limits: never sent to providers</div>
  <div class="section stack">${signals.length ? signals.map((s) => `<div class="card fade-in">
      <div class="row-between"><div class="row" style="min-width:0"><span class="job-title"><span class="ico" style="width:42px;height:42px">${ic(cat(s.category).icon)}</span></span><div style="min-width:0"><b>${esc(s.title)}</b><div class="small muted">${esc(s.description)}</div></div></div>${statusChip({ status: s.status })}</div>
      <div class="kv" style="margin-top:12px"><div><small>Funded homes</small><b>${s.fundedUnits}</b></div><div><small>Mode</small><b>${s.mode}</b></div><div><small>Area</small><b>${esc(s.zip || "n/a")}</b></div><div><small>Closes</small><b>${esc(when(s.closesAt, { weekday: undefined, minute: undefined }))}</b></div></div>
      <div class="chips" style="margin-top:10px">${s.requirements.licensed ? `<span class="chip">licence required</span>` : ""}${s.requirements.minWarrantyMonths ? `<span class="chip">≥${s.requirements.minWarrantyMonths}-mo warranty</span>` : ""}${s.requirements.completeBy ? `<span class="chip">start by ${esc(s.requirements.completeBy)}</span>` : ""}</div>
    </div>`).join("") : `<div class="card empty">No jobs open for bids right now. Fund a job, then invite pros.</div>`}</div>
  <div class="section card"><div class="card-head"><div><h3>Booked jobs</h3><div class="small muted" style="margin-top:4px">Winning pros' slots · Bryntum Scheduler · US Central</div></div></div><div id="scheduler"></div></div>
  <div class="section card"><h3>Bring your own agent</h3><p class="small muted" style="margin:6px 0 10px">Any MCP-capable agent can discover funded jobs and submit sealed bids:</p>
    <div class="codeblock">AEONITH_URL=… PROVIDER_ID=acme PROVIDER_NAME="Acme Plumbing" npm run mcp</div>
    <div class="chips" style="margin-top:10px"><span class="chip lime">list_open_requests</span><span class="chip lime">submit_sealed_bid</span><span class="chip lime">reveal_bid</span><span class="chip lime">get_result</span></div></div>`;
}
async function mountScheduler() {
  const el = $("#scheduler");
  if (!el) return;
  const jobs = requests.filter((r) => r.award);
  const resources = [...new Map(jobs.map((r) => [r.award.providerId, { id: r.award.providerId, name: r.award.providerName }])).values()];
  const events = jobs.map((r) => {
    const o = r.reveals.find((v) => v.offer.providerId === r.award.providerId)?.offer;
    return o && { id: r.id, resourceId: r.award.providerId, name: r.title, startDate: o.promises.startAt, endDate: o.promises.endAt, eventColor: r.status === "settled" ? "green" : "lime" };
  }).filter(Boolean);
  try {
    if (!document.querySelector("link[data-bryntum]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "/vendor/bryntum/svalbard-dark.css"; l.dataset.bryntum = "1";
      document.head.append(l);
    }
    const { Scheduler } = await import("/vendor/bryntum/scheduler.module.js");
    const first = events.length ? Math.min(...events.map((e) => Date.parse(e.startDate))) : Date.now();
    const lastEnd = events.length ? Math.max(...events.map((e) => Date.parse(e.endDate))) : Date.now();
    const start = new Date(first - 3 * 3600_000); start.setMinutes(0, 0, 0);
    if (scheduler) scheduler.destroy();
    scheduler = new Scheduler({
      appendTo: el, timeZone: "America/Chicago", startDate: start, endDate: new Date(Math.max(start.getTime() + 2 * 86400_000, lastEnd + 3 * 3600_000)),
      viewPreset: "hourAndDay", rowHeight: 58, barMargin: 8, readOnly: true,
      columns: [{ text: "Pro", field: "name", width: innerWidth < 600 ? 120 : 190 }],
      resources: resources.length ? resources : [{ id: "none", name: "No booked jobs yet" }], events,
    });
    if (events.length > 1) { try { scheduler.zoomToFit({ leftMargin: 60, rightMargin: 60 }); } catch { /* keep default zoom */ } }
  } catch (e) {
    el.innerHTML = `<div class="empty">Scheduler unavailable: ${esc(e.message)}</div>`;
  }
}

// ---------- trust ----------
function viewTrust(usage) {
  const { verify, entries } = audit;
  return `<div style="margin-bottom:16px"><div class="eyebrow">Tamper-evident · SHA-256 chain</div><h2 style="margin-top:6px">Trust <span class="grad">log</span></h2>
    <p class="muted" style="margin:8px 0 0;max-width:640px">Every bid, AI check, policy decision and PayPal call. Each entry carries the hash of the one before it, so editing history breaks the chain.</p></div>
  <div class="note ${verify.ok ? "ok" : "bad"}">${ic(verify.ok ? "check" : "x")}<div><b>${verify.ok ? "Chain intact" : `Chain broken at #${verify.brokenAt}`}</b> · ${verify.length} entries verified</div></div>
  ${aiUsageCard(usage)}
  <div class="card section"><div class="card-head"><div><h3>${ic("terminal", "inline")} Audit log</h3><div class="small muted" style="margin-top:4px">${small() ? "Tap a header to sort or filter. More columns on desktop." : "Filter, sort or drag a column to the top bar to group (AG Grid Enterprise)."}</div></div><span class="chip">${entries.length} events</span></div>
    <div class="grid-host" id="audit-grid" style="height:560px"></div>
  <div class="timeline grid-fallback">${entries.slice().reverse().slice(0, 150).map((e) => {
    const kind = e.actor.split(":")[0];
    const r = requests.find((x) => x.id === e.requestId);
    return `<div class="ev ${kind}"><div class="meta"><span class="chip">${esc(kind)}</span><span>#${e.seq}</span><span>${esc(when(e.at))}</span>${r ? `<a href="#/job/${r.id}">${esc(r.title)}</a>` : ""}</div>
      <div class="what">${esc(LABEL[e.action] || e.action)}</div>
      <div class="small muted">${esc(Object.entries(e.data || {}).filter(([k]) => k !== "signal").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")).slice(0, 260)}</div>
      <div class="mono muted" style="margin-top:4px">${esc(e.hash.slice(0, 16))}… ← ${esc(e.prevHash.slice(0, 16))}…</div></div>`;
  }).join("")}</div></div>`;
}

function aiUsageCard(u) {
  if (!u) return "";
  const purposes = Object.entries(u.byPurpose || {}).sort((a, b) => b[1].credits - a[1].credits);
  const live = u.provider === "nvidia";
  return `<div class="card section" id="ai-usage">
    <div class="card-head"><div><div class="eyebrow">${ic("spark", "inline")} AI usage</div><h3 style="margin-top:6px">${live ? "NVIDIA credits" : "AI calls"}</h3>
      <div class="small muted" style="margin-top:4px">${esc(u.label)}. Every NVIDIA request is metered${u.estimated ? `, ${u.creditsPerRequest} credit each (estimate: reconcile on build.nvidia.com)` : ""}.</div></div>
      <span class="chip ${live ? "violet" : "warn"}">${live ? "live" : "not in use"}</span></div>
    <div class="kpis" style="margin:0 0 12px">
      <div class="card kpi"><small>Credits left</small><span class="v num">~${u.remainingCredits}</span><div class="sub">of ${u.startingCredits}</div></div>
      <div class="card kpi"><small>Credits used</small><span class="v num">${u.creditsUsed}</span><div class="sub">${u.requests} requests · ${u.failed} failed</div></div>
      <div class="card kpi"><small>Tokens</small><span class="v num">${(u.promptTokens + u.completionTokens).toLocaleString("en-US")}</span><div class="sub">${u.promptTokens.toLocaleString("en-US")} in · ${u.completionTokens.toLocaleString("en-US")} out</div></div>
      <div class="card kpi"><small>Top use</small><span class="v" style="font-size:20px">${esc(purposes[0]?.[0]?.replace(/_/g, " ") || "n/a")}</span><div class="sub">${purposes[0] ? `${purposes[0][1].credits} credits` : "no calls yet"}</div></div>
    </div>
    <div class="chips" style="margin-bottom:12px">${purposes.map(([k, v]) => `<span class="chip">${esc(k.replace(/_/g, " "))} · ${v.credits} cr</span>`).join("")}</div>
    <div class="grid-host" id="ai-grid" style="height:320px"></div>
  </div>`;
}

// ---------- AG Grid Enterprise (loaded on demand) ----------
let agReady = null;
function loadAgGrid() {
  agReady ??= (async () => {
    const cfg = await api("/api/public-config").catch(() => ({}));
    await new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "/vendor/ag-grid/ag-grid-enterprise.min.js";
      sc.onload = res;
      sc.onerror = () => rej(new Error("AG Grid failed to load"));
      document.head.append(sc);
    });
    const ag = window.agGrid;
    if (cfg.agGridLicenseKey) ag.LicenseManager.setLicenseKey(cfg.agGridLicenseKey);
    const theme = ag.themeQuartz.withPart(ag.colorSchemeDark).withParams({
      backgroundColor: "#1a0705", foregroundColor: "#fff4ee", accentColor: "#ff7a3d", borderColor: "rgba(255,220,200,.12)",
      headerBackgroundColor: "#260a07", oddRowBackgroundColor: "rgba(255,255,255,.02)", chromeBackgroundColor: "#210806",
      fontFamily: "Geist, Inter, system-ui, sans-serif", headerFontFamily: "Geist Mono, ui-monospace, monospace", headerFontSize: 11,
      fontSize: 13, spacing: 6, wrapperBorderRadius: 16, borderRadius: 8, rowHoverColor: "rgba(255,122,61,.10)", selectedRowBackgroundColor: "rgba(255,122,61,.18)",
    });
    return { ag, theme };
  })();
  return agReady;
}
async function mountGrid(id, options) {
  const host = document.getElementById(id);
  if (!host) return null;
  try {
    const { ag, theme } = await loadAgGrid();
    if (!document.body.contains(host)) return null;
    host.closest(".card")?.querySelector(".grid-fallback")?.remove();
    return ag.createGrid(host, { theme, animateRows: !reduceMotion, defaultColDef: { sortable: true, filter: true, resizable: true, minWidth: 90 }, ...options });
  } catch (e) {
    host.remove(); // keep the plain timeline fallback
    return null;
  }
}
const small = () => matchMedia("(max-width: 720px)").matches;
function mountTrustGrids(usage) {
  const rows = audit.entries.slice().reverse().map((e) => {
    const r = requests.find((x) => x.id === e.requestId);
    const d = e.data || {};
    return {
      seq: e.seq, at: e.at, kind: e.actor.split(":")[0], action: LABEL[e.action] || e.action, job: r?.title || "",
      amount: d.amount ? Number(d.amount) : d.priceCents ? d.priceCents / 100 : null,
      details: Object.entries(d).filter(([k]) => k !== "signal").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ").slice(0, 300),
      hash: e.hash.slice(0, 16), jobId: e.requestId,
    };
  });
  mountGrid("audit-grid", {
    rowData: rows,
    rowGroupPanelShow: small() ? "never" : "always",
    sideBar: small() ? false : { toolPanels: ["columns", "filters"], hiddenByDefault: true },
    enableCellTextSelection: true,
    columnDefs: [
      { field: "seq", headerName: "#", width: 70, minWidth: 60, filter: "agNumberColumnFilter", pinned: small() ? null : "left" },
      { field: "at", headerName: "Time (CT)", width: 170, hide: small(), valueFormatter: (p) => (p.value ? when(p.value) : ""), filter: "agDateColumnFilter", filterParams: { comparator: (d, v) => new Date(v).setHours(0, 0, 0, 0) - d.getTime() } },
      { field: "kind", headerName: "Actor", width: 110, hide: small(), enableRowGroup: true, filter: "agSetColumnFilter",
        cellRenderer: (p) => (p.value ? `<span class="chip">${esc(p.value)}</span>` : "") },
      { field: "action", headerName: "Event", flex: 1, minWidth: 170, enableRowGroup: true, filter: "agSetColumnFilter" },
      { field: "job", headerName: "Job", flex: 1, minWidth: 180, enableRowGroup: true, filter: "agSetColumnFilter",
        cellRenderer: (p) => (p.data?.jobId && p.value ? `<a href="#/job/${esc(p.data.jobId)}">${esc(p.value)}</a>` : esc(p.value || "")) },
      { field: "amount", headerName: "Amount", width: 120, type: "rightAligned", filter: "agNumberColumnFilter", aggFunc: "sum", valueFormatter: (p) => (p.value == null ? "" : usd(Math.round(p.value * 100))) },
      { field: "details", headerName: "Details", flex: 2, minWidth: 260, hide: small(), filter: "agTextColumnFilter", tooltipField: "details" },
      { field: "hash", headerName: "Hash", width: 170, cellClass: "mono", hide: small() },
    ],
    autoGroupColumnDef: { minWidth: 220 },
    pagination: true, paginationPageSize: 50, paginationPageSizeSelector: [25, 50, 100, 200],
  });
  if (usage) mountGrid("ai-grid", {
    rowData: usage.recent,
    columnDefs: [
      { field: "at", headerName: "Time (CT)", width: 170, hide: small(), valueFormatter: (p) => (p.value ? when(p.value) : ""), sort: "desc" },
      { field: "purpose", headerName: "Purpose", width: 150, filter: "agSetColumnFilter", valueFormatter: (p) => String(p.value || "").replace(/_/g, " ") },
      { field: "model", headerName: "Model", flex: 1, minWidth: 220, filter: "agSetColumnFilter", hide: small() },
      { field: "ok", headerName: "Result", width: 110, filter: "agSetColumnFilter", cellRenderer: (p) => `<span class="chip ${p.value ? "ok" : "bad"}">${p.value ? "ok" : "failed"}</span>`, tooltipField: "error" },
      { headerName: "Tokens", width: 110, type: "rightAligned", valueGetter: (p) => p.data.promptTokens + p.data.completionTokens, filter: "agNumberColumnFilter" },
      { field: "ms", headerName: "Latency", width: 110, hide: small(), type: "rightAligned", valueFormatter: (p) => `${(p.value / 1000).toFixed(1)} s` },
      { field: "credits", headerName: "Credits", width: 100, type: "rightAligned" },
    ],
  });
}
function mountBidGrid(r) {
  if (!r.award) return;
  mountGrid(`bids-grid-${r.id}`, {
    domLayout: "autoHeight",
    rowData: r.award.table.map((t) => {
      const o = r.reveals.find((v) => v.offer.providerId === t.providerId)?.offer;
      return { ...t, price: t.priceCents / 100, warranty: o?.promises.warrantyMonths ?? null, licence: o?.promises.licensed ? o.promises.licenseNo : "none", start: o?.promises.startAt, surplus: t.surplusCents / 100 };
    }),
    columnDefs: [
      { field: "providerName", headerName: unitOf(r) === "home" ? "Pro" : "Seller", minWidth: 170, flex: 1, pinned: small() ? null : "left",
        cellRenderer: (p) => `${p.data.note === "Winner" ? "🏆 " : ""}${esc(p.value)}` },
      { field: "price", headerName: `Price / ${unitOf(r)}`, width: 140, type: "rightAligned", sort: "asc", valueFormatter: (p) => usd(Math.round(p.value * 100)) },
      { field: "minUnits", headerName: "Min units", width: 110, type: "rightAligned" },
      { field: "eligibleUnits", headerName: "Can afford", width: 120, type: "rightAligned" },
      { field: "warranty", headerName: "Warranty", width: 110, type: "rightAligned", valueFormatter: (p) => (p.value == null ? "" : `${p.value} mo`) },
      { field: "licence", headerName: "Licence", width: 130 },
      { field: "start", headerName: "Starts", width: 160, valueFormatter: (p) => (p.value ? when(p.value, { minute: undefined }) : "") },
      { field: "surplus", headerName: "Buyer saving", width: 140, type: "rightAligned", valueFormatter: (p) => usd(Math.round(p.value * 100)) },
      { field: "note", headerName: "Outcome", minWidth: 220, flex: 1,
        cellRenderer: (p) => `<span class="chip ${p.value === "Winner" ? "ok" : p.data.feasible ? "" : "warn"}">${esc(p.value)}</span>` },
    ],
    getRowStyle: (p) => (p.data.note === "Winner" ? { background: "rgba(255,122,61,.14)" } : undefined),
  });
}

// ---------- motion helpers ----------
function animateNumbers(root) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    if (reduceMotion || target === 0) return;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 800);
      const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
      const [i, d] = usd(v).split(".");
      el.innerHTML = `${i}<span class="dec">.${d}</span>`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  root.querySelectorAll(".ring .fill, .v-ring .fill").forEach((c) => requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = c.dataset.offset; })));
}
function scrambleHashes(root) {
  if (reduceMotion) return;
  const hex = "0123456789abcdef";
  root.querySelectorAll(".scramble").forEach((el) => {
    const real = el.dataset.hash;
    const id = setInterval(() => {
      if (!document.body.contains(el)) return clearInterval(id);
      el.textContent = [...real].map((ch) => (Math.random() < 0.18 ? hex[(Math.random() * 16) | 0] : ch)).join("");
    }, 90);
    ui.timers.push(id);
  });
}

const recruitBtn = (r) => `<div class="recruit-row"><button class="btn" data-recruit>${ic("users")}Call local ${unitOf(r) === "home" ? "pros" : "dealers"} who aren't on Aeonith yet</button><span class="small muted">Your agent phones them, pitches the job, and they seal a bid. Winners are paid by PayPal Payouts to email.</span></div>`;

// ---------- PayPal rail (every PayPal API object behind this job) ----------
const PP_API = {
  "order.created": (d) => ["Orders v2", "Create order · intent AUTHORIZE", d.orderId, d.amount && `$${d.amount}`],
  "hold.authorized": (d) => d.via ? ["Vault v3 + Orders v2", "Merchant-initiated AUTHORIZE on vaulted wallet", d.authorizationId, d.amount && `$${d.amount} held`] : ["Orders v2", "Authorize order → hold placed", d.authorizationId, d.amount && `$${d.amount} held`],
  "hold.reauthorized": (d) => ["Payments v2", "Reauthorize (3-day honor period)", d.to, ""],
  "hold.captured": (d) => ["Payments v2", "Capture · final_capture: true", d.captureId, `$${d.amount} captured · $${d.released} released`],
  "hold.voided": (d) => ["Payments v2", "Void authorization", d.authorizationId, "$0 charged"],
  "payout.created": (d) => ["Payouts v1", "Batch payout to the pro", d.batchId, `$${d.amount} · fee $${d.fee}`],
  webhook: (d) => ["Webhooks", `Verified ${d.type}`, d.authorizationId, ""],
  blocked: (d) => ["Policy gate", `Blocked before PayPal: ${d.rule}`, d.action, ""],
};
function paypalRailCard(r) {
  const rows = audit.entries.filter((e) => e.requestId === r.id && PP_API[e.action] && (e.actor === "paypal" || e.action === "blocked"));
  if (!rows.length) return "";
  return `<div class="card fade-in pprail"><div class="card-head"><div><div class="eyebrow">PayPal rail</div><h3 style="margin-top:6px">Every PayPal call behind this job</h3></div><span class="chip ${health?.paypal === "sandbox" ? "ok" : "warn"}">${health?.paypal === "sandbox" ? "live sandbox" : "simulated"}</span></div>
    <ol class="pp-steps">${rows.map((e) => {
      const [api, what, id, amt] = PP_API[e.action](e.data || {});
      return `<li class="${e.action === "blocked" ? "bad" : ""}"><span class="pp-api">${esc(api)}</span><div><b>${esc(what)}</b>${id ? `<div class="mono small muted">${esc(id)}</div>` : ""}</div><span class="pp-amt">${esc(amt || "")}</span><span class="pp-t mono">${hhmm(e.at)}</span></li>`;
    }).join("")}</ol></div>`;
}

// ---------- Autopilot banner on sensor-filed jobs ----------
function autopilotBanner(r) {
  if (!r.trigger) return "";
  const b = r.buyers[0];
  return `<div class="card fade-in ap-banner"><span class="ap-ico">${ic("bolt")}</span><div style="min-width:0"><div class="eyebrow">Filed by your home · Autopilot</div>
    <h3 style="margin-top:6px">${esc(r.trigger.device)}: ${esc(r.trigger.reading)}</h3>
    <p class="muted small" style="margin:6px 0 0">${esc(r.trigger.location)} · ${esc(when(r.trigger.at))}. Funded from your saved PayPal (Vault) while you slept: ${b?.authorizedCents ? `${usd(b.authorizedCents)} held` : "hold pending"}. ${r.bookedAt ? "You approved the booking on the call." : r.status === "awarded" ? "Nobody is sent until you say yes on the call." : ""}</p></div></div>`;
}

// ---------- calls (consent + recruiting) ----------
function callsCard(r) {
  const calls = (r.calls || []).filter((c) => !(ui.liveCalls?.rid === r.id && ui.liveCalls.calls.some((x) => x.id === c.id)));
  if (!calls.length) return "";
  return `<div class="card fade-in"><div class="card-head"><div><div class="eyebrow">Agent calls</div><h3 style="margin-top:6px">Every call, recorded word for word</h3></div><span class="chip">${calls.length} call${calls.length === 1 ? "" : "s"}</span></div>
    <div class="calls">${calls.slice().reverse().map((c) => `<details class="call">
      <summary><span class="call-ico">${ic(c.kind === "recruit" ? "users" : "q")}</span><div style="min-width:0"><b>${c.kind === "recruit" ? `Recruiting · ${esc(c.party)}` : `Call with ${esc(c.party)}`}</b><div class="small muted">${esc(c.phone || "in-app call")} · ${esc(when(c.at))}</div></div><span class="chip ${/Declined/.test(c.outcome) ? "warn" : "ok"}">${esc(c.outcome)}</span></summary>
      <div class="bubbles">${c.lines.map((l) => `<div class="bub ${l.who}"><small>${l.who === "agent" ? "Aeonith agent" : l.who === "pro" ? esc(c.party) : "You"}</small>${esc(l.text)}</div>`).join("")}</div>
    </details>`).join("")}</div>
    ${(r.consents || []).length ? `<div class="small muted mono" style="margin-top:10px">${r.consents.map((c) => `${c.intent} · ${c.method} · ${c.approved ? "approved" : "declined"} · sha256 ${c.sha256.slice(0, 16)}…`).join("<br>")}</div>` : ""}
  </div>`;
}

// ---------- the incoming call (Voice Agent) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function pickVoice() {
  const vs = speechSynthesis?.getVoices?.() || [];
  return vs.find((v) => /en-US/i.test(v.lang) && /Natural|Aria|Jenny|Ava|Online/i.test(v.name)) || vs.find((v) => /en-US/i.test(v.lang)) || vs[0];
}
function speak(text) {
  // Captions advance on a reading-speed timer, so the call works with or without audio output.
  const minMs = Math.max(1600, text.length * 58);
  return new Promise((done) => {
    let finished = false;
    const end = () => { if (!finished) { finished = true; done(); } };
    setTimeout(end, minMs + 900);
    try {
      if (!("speechSynthesis" in window) || ui.quietCall) return;
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 1.02; u.pitch = 1;
      u.onend = () => setTimeout(end, 250);
      speechSynthesis.speak(u);
    } catch { /* captions only */ }
  });
}
async function openCall(r, intent) {
  document.querySelector(".callx")?.remove();
  const el = document.createElement("div");
  el.className = "callx";
  el.innerHTML = `<div class="callx-card" role="dialog" aria-label="Incoming call from your Aeonith agent">
    <div class="callx-top"><span class="mono small">${intent === "book" ? "INCOMING · BOOKING APPROVAL" : intent === "overcharge" ? "INCOMING · OVERCHARGE ALERT" : "INCOMING · PAYMENT RELEASE"}</span><span class="mono small" id="cx-t">00:00</span></div>
    <div class="callx-av"><span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span><span class="av">${ic("spark")}</span></div>
    <h2>Aeonith agent</h2><div class="small muted" id="cx-sub">calling about ${esc(r.title)}</div>
    <div class="callx-wave" id="cx-wave">${Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i % 7) * 90}ms"></i>`).join("")}</div>
    <div class="callx-caps" id="cx-caps"></div>
    <div class="callx-heard" id="cx-heard"></div>
    <div class="callx-actions" id="cx-act">
      <button class="btn ghost" data-cx="decline">${ic("x")}Decline</button>
      <button class="btn primary" data-cx="accept">${ic("check")}Accept</button>
    </div>
    <div class="callx-foot small muted">Your answer is fingerprinted (SHA-256) into the audit chain. ${SR ? "Speak, or tap." : "Tap to answer (no microphone here)."}</div>
  </div>`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("in"));
  const t0 = Date.now();
  const clock = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const c = el.querySelector("#cx-t"); if (c) c.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 500);
  const close = () => { clearInterval(clock); try { speechSynthesis.cancel(); } catch {} el.classList.remove("in"); setTimeout(() => el.remove(), 300); };
  const act$ = el.querySelector("#cx-act");
  const caps = el.querySelector("#cx-caps");
  const answer = async (transcript, method) => {
    act$.innerHTML = `<span class="caret small">Recording consent</span>`;
    el.querySelector("#cx-heard").innerHTML = `<b>You:</b> “${esc(transcript)}”`;
    try {
      const out = await post(`/api/requests/${r.id}/voice`, { intent, transcript, method });
      const ok = out.consent.approved;
      await speak(ok ? (intent === "book" ? "Booked. I'll call you again when the proof is in." : intent === "overcharge" ? "Done. Overcharge flagged." : "Done. PayPal captured the payment and the pro is being paid.") : "Understood. Nothing moves until you say so.");
      el.querySelector("#cx-sub").innerHTML = `${ok ? "Approved" : "Declined"} · <span class="mono">sha256 ${out.consent.sha256.slice(0, 12)}…</span>`;
      toast(ok ? (intent === "book" ? "Booked by voice." : intent === "overcharge" ? "Agreed price paid. Overcharge refused and flagged." : "Released by voice: captured on PayPal and paid out.") : "Declined on the call. Nothing moved.");
    } catch (e) { toast(e.message, 6000); }
    setTimeout(async () => { close(); await load(); render({ animate: false }); }, 1400);
  };
  el.querySelector("[data-cx=decline]").addEventListener("click", () => answer("No, not now.", "tap"));
  el.querySelector("[data-cx=accept]").addEventListener("click", async () => {
    el.classList.add("live");
    act$.innerHTML = `<span class="caret small">On the call</span>`;
    let script;
    try { script = await api(`/api/requests/${r.id}/call?intent=${intent}`); } catch (e) { toast(e.message); close(); return; }
    for (const line of script.lines) {
      const p = document.createElement("p");
      p.textContent = line;
      caps.append(p);
      requestAnimationFrame(() => p.classList.add("on"));
      caps.scrollTop = caps.scrollHeight;
      await speak(line);
    }
    el.classList.add("listening");
    const yes = intent === "book" ? "Approve, book them" : intent === "overcharge" ? "Pay the agreed price" : "Release payment";
    act$.innerHTML = `<button class="btn ghost" data-a="no">${ic("x")}Not now</button>${SR ? `<button class="btn" data-a="mic">${ic("q")}Speak</button>` : ""}<button class="btn primary" data-a="yes">${ic("check")}${esc(yes)}</button>`;
    act$.querySelector("[data-a=no]").addEventListener("click", () => answer("No, not now.", "tap"));
    act$.querySelector("[data-a=yes]").addEventListener("click", () => answer(yes + ".", "tap"));
    act$.querySelector("[data-a=mic]")?.addEventListener("click", () => {
      const rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.maxAlternatives = 1;
      const heard = el.querySelector("#cx-heard");
      let finalText = "";
      rec.onresult = (ev) => { finalText = [...ev.results].map((x) => x[0].transcript).join(" "); heard.innerHTML = `<b>You:</b> “${esc(finalText)}”`; };
      rec.onerror = () => toast("Couldn't hear you. Tap instead.");
      rec.onend = () => { if (finalText.trim()) answer(finalText.trim(), "voice"); };
      heard.innerHTML = `<span class="caret small">Listening</span>`;
      rec.start();
    });
  });
}

// ---------- Live Proof (camera) ----------
const liveCam = { stream: null, timer: null, busy: false };
function stopLiveCam() { clearInterval(liveCam.timer); liveCam.timer = null; liveCam.stream?.getTracks().forEach((t) => t.stop()); liveCam.stream = null; }
function liveCard(r) {
  const L = r.live;
  if (!L || L.finishedAt || r.status !== "awarded") return "";
  const left = Math.max(0, Math.round((Date.parse(L.expiresAt) - Date.now()) / 1000));
  return `<div class="card fade-in live" id="live">
    <div class="card-head"><div><div class="eyebrow">${ic("camera", "inline")} Video proof · recording live</div><h3 style="margin-top:6px">Show the finished ${unitOf(r) === "home" ? "work" : "delivery"}</h3></div><span class="chip ${left > 20 ? "lime" : "warn"}" id="lv-left">${left}s left</span></div>
    <div class="live-grid">
      <div class="live-cam"><video id="lv-video" playsinline muted autoplay></video>
        <span class="rec"><i></i>REC</span>
        <div class="stamp"><b>AEONITH · VERIFIED CAPTURE</b><span>${esc(L.code)} · <span id="lv-clock">${hhmm(new Date().toISOString())}</span> · ${esc(r.zip || "")} · ${esc(r.title.slice(0, 28))}</span></div>
        <div class="live-scan"></div></div>
      <div class="live-side">
        <div class="small muted">Aeonith stamps every frame with this session (<span class="mono">${esc(L.code)}</span>) and the time. The session ends in 2 minutes, so an old video can't be passed off as new. NVIDIA vision analyses frames as they arrive:</div>
        <ol class="frames" id="lv-frames">${L.frames.map(frameRow).join("")}</ol>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" data-lv="finish" ${L.frames.length ? "" : "disabled"}>${ic("check")}Stop & verify</button></div>
      </div>
    </div></div>`;
}
const frameRow = (f, i) => `<li><span class="mono small">frame ${i + 1}</span><span class="chip ${f.matchesJob === true ? "ok" : f.matchesJob === false ? "bad" : ""}">${f.matchesJob === true ? `${ic("check")}matches the job` : f.matchesJob === false ? "doesn't match" : "unsure"}${f.confidence != null ? ` · ${f.confidence}%` : ""}</span><small class="muted">${esc(f.summary || "")}</small></li>`;
/** Burn the session stamp into a frame (like a timestamp camera) before it is uploaded. */
function stampFrame(src, r, label) {
  const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
  const w = Math.min(960, sw), h = Math.round((w / sw) * sh);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0, w, h);
  g.fillStyle = "rgba(10,3,2,.62)"; g.fillRect(0, h - 34, w, 34);
  g.fillStyle = "#fff"; g.font = "600 15px Geist, system-ui, sans-serif";
  g.fillText(`AEONITH ${label} · ${r.live?.code ?? ""} · ${new Date().toISOString().slice(0, 19).replace("T", " ")}Z · ${r.zip || ""}`, 12, h - 12);
  return c.toDataURL("image/jpeg", 0.86).split(",")[1];
}
async function wireLive(r) {
  const card = $("#live");
  if (!card) { stopLiveCam(); return; }
  const video = $("#lv-video");
  const openCam = async () => {
    try {
      liveCam.stream ??= await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = liveCam.stream;
      clearInterval(liveCam.timer);
      liveCam.timer = setInterval(snap, 3500);
      setTimeout(snap, 2200);
    } catch { toast("Camera unavailable: allow camera access, or upload a photo or video instead.", 6000); }
  };
  const left = $("#lv-left"), clock = $("#lv-clock");
  const tick = setInterval(() => { const s = Math.max(0, Math.round((Date.parse(r.live.expiresAt) - Date.now()) / 1000)); if (left) left.textContent = `${s}s left`; if (clock) clock.textContent = new Date().toLocaleTimeString("en-US", { hour12: false }); if (!s) clearInterval(tick); }, 1000);
  ui.timers.push(tick);
  const snap = async () => {
    if (liveCam.busy || !video.videoWidth) return;
    liveCam.busy = true;
    try {
      card.classList.add("checking");
      const out = await post(`/api/requests/${r.id}/live/frame`, { imageBase64: stampFrame(video, r, "LIVE") });
      r.live.frames.push(out.frame);
      $("#lv-frames").innerHTML = r.live.frames.map(frameRow).join("");
      card.querySelector("[data-lv=finish]").disabled = false;
      if (out.done || r.live.frames.length >= 5) await finish();
    } catch (e) { toast(e.message, 5000); clearInterval(liveCam.timer); }
    finally { liveCam.busy = false; card.classList.remove("checking"); }
  };
  const finish = async () => {
    clearInterval(liveCam.timer);
    const p = await post(`/api/requests/${r.id}/live/finish`);
    stopLiveCam();
    toast(p.verdict === "pass" ? "Verified by NVIDIA vision. The pro can now request payment." : `Proof verdict: ${p.verdict}`);
    await load(); render({ animate: false });
    setTimeout(() => document.getElementById("proof")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  };
  card.querySelector("[data-lv=finish]").addEventListener("click", (e) => act(e.currentTarget, finish, { rerender: false }));
  if (liveCam.stream) { video.srcObject = liveCam.stream; if (!liveCam.timer) liveCam.timer = setInterval(snap, 3500); }
  else openCam();
}
/** Upload path: a photo, or frames pulled from a video, go through the same stamped session and AI checks. */
async function uploadProof(r, file) {
  await post(`/api/requests/${r.id}/live/start`);
  await load();
  const fresh = requests.find((x) => x.id === r.id);
  const frames = [];
  if (file.type.startsWith("video/")) {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(file);
    await new Promise((ok, bad) => { v.onloadedmetadata = ok; v.onerror = () => bad(new Error("Can't read that video")); });
    for (const k of [0.25, 0.55, 0.85]) {
      v.currentTime = Math.max(0, v.duration * k);
      await new Promise((ok) => { v.onseeked = ok; });
      frames.push(stampFrame(v, fresh, "UPLOAD"));
    }
  } else {
    const img = new Image(); img.src = URL.createObjectURL(file);
    await img.decode();
    frames.push(stampFrame(img, fresh, "UPLOAD"));
  }
  for (const f of frames) { const out = await post(`/api/requests/${r.id}/live/frame`, { imageBase64: f }); if (out.done) break; }
  const p = await post(`/api/requests/${r.id}/live/finish`);
  toast(p.verdict === "pass" ? "Verified by NVIDIA vision." : `Proof verdict: ${p.verdict}`);
}

// ---------- Autopilot page ----------
function viewAutopilot(list) {
  const active = list.filter((a) => a.status === "active");
  return `<div style="margin-bottom:16px"><div class="eyebrow">Autopilot · PayPal Vault</div><h2 style="margin-top:6px">Your home <span class="grad">files the job itself</span></h2>
    <p class="muted" style="margin:8px 0 0;max-width:720px">Save PayPal once with a budget. When a sensor reports an emergency, Aeonith files the job, places a <b>hold</b> on your vaulted PayPal (no redirect, you can be asleep), and pros bid. Nobody is dispatched and nothing is charged until your agent calls and you say "approve".</p></div>
  <div class="grid-2">
    <form class="card fade-in" id="ap-form">
      <div class="card-head"><h3>${ic("lock", "inline")} Turn on Autopilot</h3><span class="chip">${health?.paypal === "sandbox" ? "PayPal sandbox" : "simulated"}</span></div>
      <div class="form-grid">
        <label class="field">Your name<input class="input" name="buyerName" value="Maria G." /></label>
        <label class="field">ZIP<input class="input" name="zip" value="78704" inputmode="numeric" /></label>
        <label class="field">Emergency budget per job ($)<input class="input" name="capDollars" type="number" min="1" value="450" /></label>
        <div class="field">Covers<div class="chips" style="margin-top:6px">${["plumbing", "electrical", "hvac"].map((c, i) => `<label class="chip"><input type="checkbox" name="cat" value="${c}" ${i === 0 ? "checked" : ""} /> ${cat(c).label}</label>`).join("")}</div></div>
      </div>
      <div class="note" style="margin-top:14px">${ic("info")}<div>PayPal <b>Vault v3</b>: you approve a setup token once. Each emergency is then an <b>Orders v2 AUTHORIZE</b> on your vaulted wallet (merchant-initiated), capped by this budget in our policy gate. You can turn it off at any time.</div></div>
      <button class="btn primary block" type="submit" style="margin-top:14px">Save PayPal for Autopilot ${ic("arrow")}</button>
    </form>
    <div class="card fade-in">
      <div class="card-head"><h3>${ic("bolt", "inline")} Your Autopilots</h3><span class="chip">${active.length} active</span></div>
      ${list.length ? list.map((a) => `<div class="ap-row"><div style="min-width:0"><b>${esc(a.buyerName)} · up to ${usd0(a.capCents)}</b><div class="small muted mono">${a.vaultId ? `vault ${esc(a.vaultId)}` : `setup ${esc(a.setupTokenId || "")}`}</div><div class="small muted">${a.categories.map((c) => cat(c).label).join(" · ")} · ${esc(a.zip)}</div></div>
        <span class="chip ${a.status === "active" ? "ok" : a.status === "pending" ? "warn" : ""}">${a.status}</span></div>
        ${a.status === "active" ? `<form class="sensor" data-sensor="${a.id}">
          <div class="small" style="font-weight:600;margin-bottom:8px">${ic("spark", "inline")} Simulate a sensor alert</div>
          <div class="form-grid"><label class="field">Device<select class="input" name="device"><option>Leak sensor</option><option>Smart thermostat</option><option>Smart breaker panel</option></select></label>
          <label class="field">Where<input class="input" name="location" value="Garage water heater" /></label>
          <label class="field full">Reading<input class="input" name="reading" value="Water detected on the floor" /></label></div>
          <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" type="submit">${ic("bolt")}Trigger alert</button><button class="btn ghost" type="button" data-revoke="${a.id}">Turn off</button></div>
        </form>` : ""}`).join("") : `<div class="empty">No Autopilot yet.</div>`}
    </div>
  </div>`;
}
function wireAutopilot() {
  $("#ap-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, async () => {
      const out = await post("/api/autopilot", { buyerName: f.get("buyerName"), zip: f.get("zip"), capDollars: Number(f.get("capDollars")), categories: f.getAll("cat") });
      location.href = out.approveUrl;
    }, { rerender: false });
  });
  document.querySelectorAll("[data-sensor]").forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    act(e.submitter, async () => {
      toast("Sensor alert received. Filing and funding the job…", 6000);
      const r = await post(`/api/autopilot/${form.dataset.sensor}/sensor`, { device: f.get("device"), location: f.get("location"), reading: f.get("reading") });
      ui.ringOn = r.id;
      location.hash = `#/job/${r.id}`;
    }, { rerender: false });
  }));
  document.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", () => act(b, () => post(`/api/autopilot/${b.dataset.revoke}/revoke`))));
}

function payCard(r) {
  if (r.status !== "proving" || !r.award) return "";
  const b = r.buyers.find((x) => r.award.buyersIn.includes(x.id)) || r.buyers[0];
  const sealed = (r.award.unitPrices?.[b.id] ?? r.award.priceCents) * b.units;
  const pr = r.paymentRequest;
  const who = unitOf(r) === "home" ? "pro" : "dealer";
  if (pr) {
    const over = pr.overchargeCents > 0;
    return `<div class="card fade-in" id="pay"><div class="${over ? "alert-over" : "alert-ok"}">
      <div class="ao-ico">${ic(over ? "shield" : "receipt")}</div>
      <div><div class="eyebrow">${over ? "Overcharge detected · blocked before PayPal" : "Payment requested"}</div>
        <h3>${over ? `${esc(r.award.providerName)} asked for ${usd(pr.amountCents)}. The sealed price is ${usd(sealed)}.` : `${esc(r.award.providerName)} asked for ${usd(pr.amountCents)}, the sealed price.`}</h3>
        <p>${over ? `That's ${usd(pr.overchargeCents)} over. The policy gate refused the capture: PayPal can only take the sealed ${usd(sealed)}. ${pr.resolution ? esc(pr.resolution) + "." : "Your agent is calling you before anything moves."}` : "Your agent is calling you to confirm before PayPal captures anything."}</p>
        ${pr.note ? `<small class="muted">Pro's note: “${esc(pr.note)}”</small>` : ""}</div></div>
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary" data-call="${over && !pr.resolution ? "overcharge" : "release"}">${ic("q")}Answer the agent's call</button><button class="btn ghost" data-release-now>${ic("check")}Release ${usd(sealed)} myself</button></div>
    </div>`;
  }
  return `<div class="card fade-in" id="pay"><div class="card-head"><div><div class="eyebrow">${ic("receipt", "inline")} Getting paid</div><h3 style="margin-top:6px">Proof passed. Now the ${who} can ask to be paid</h3></div></div>
    <div class="pay-grid">
      <form class="pro-app" data-payreq>
        <div class="pa-top"><span class="avatar" style="background:${tint(r.award.providerName)}">${esc(initials(r.award.providerName))}</span><div><b>${esc(r.award.providerName)}</b><small>${who}'s Aeonith app</small></div></div>
        <div class="pa-sealed">Sealed price <b>${usd(sealed)}</b></div>
        <label class="field">Amount to request ($)<input class="input" name="amount" type="number" step="0.01" min="1" value="${(sealed / 100).toFixed(2)}" /></label>
        <label class="field">Note<input class="input" name="note" placeholder="Replaced 40-gal unit, hauled the old one" /></label>
        <button class="btn primary block" type="submit">${ic("receipt")}Request payment</button>
      </form>
      <div class="buyer-side">
        <b>You, the buyer</b>
        <p class="small muted">When the ${who} asks to be paid, your agent calls you to confirm. Anything above the sealed price is blocked and flagged. Or release it yourself now:</p>
        <button class="btn" data-release-now>${ic("check")}Release ${usd(sealed)} now</button>
      </div>
    </div></div>`;
}

const ACT = {
  "request.created": (d) => ["spark", "buyer", d.by === "autopilot" ? "Autopilot filed the request" : "Request created", d.title || ""],
  "request.joined": (d) => ["users", "buyer", "A buyer joined the pool", d.item || ""],
  "order.created": (d) => ["lock", "paypal", `PayPal order created · $${d.amount}`, "intent AUTHORIZE", "Orders v2", d.orderId],
  "hold.authorized": (d) => ["lock", "paypal", `PayPal holds $${d.amount}`, d.via ? "saved wallet, merchant-initiated" : "reserved, not paid", d.via ? "Vault v3 + Orders v2" : "Orders v2 · authorize", d.authorizationId],
  "hold.reauthorized": (d) => ["lock", "paypal", "PayPal renewed the hold", "3-day honor period", "Payments v2 · reauthorize", d.to],
  "bidding.opened": () => ["hash", "engine", "Request sent for sealed bids", "sellers see no budgets"],
  "bid.committed": (d) => ["hash", "provider", "Sealed bid received", `${String(d.hash || "").slice(0, 14)}…`],
  "bidding.closed": () => ["hash", "engine", "Bidding closed · unsealing", ""],
  "bid.revealed": (d) => ["check", "provider", `Bid opened${d.priceCents ? ` · ${usd(d.priceCents)}` : ""}`, "matches its fingerprint"],
  "bid.reveal_rejected": () => ["x", "policy", "Bid rejected", "didn't match its fingerprint"],
  "award.made": (d) => ["check", "engine", "Winner picked by code", d.priceCents ? usd(d.priceCents) : ""],
  "award.none": () => ["x", "engine", "No bid met your terms", "everything released"],
  "offer.reviewed": (d) => ["spark", "ai", "AI checked the winner's promises", d.ok ? "all match" : "flags raised"],
  "recruit.call": (d) => ["users", "agent", `Agent called ${d.pro}`, d.outcome],
  "sensor.alert": (d) => ["bolt", "device", "Sensor alert", `${d.reading || ""}`],
  "consent.voice": (d) => ["q", "buyer", d.approved ? "You approved on the call" : "You declined on the call", `${d.intent} · sha256 ${String(d.sha256 || "").slice(0, 10)}…`],
  "proof.live_started": () => ["camera", "provider", "Video proof started", "stamped session"],
  "proof.live_frame": (d) => ["spark", "ai", `AI checked frame ${d.n}`, d.matchesJob ? "matches the job" : "not sure yet"],
  "proof.challenge_issued": () => ["camera", "engine", "Proof session issued", ""],
  "proof.submitted": (d) => ["camera", "provider", `Proof ${d.verdict === "pass" ? "verified" : d.verdict}`, d.live ? "live video" : "upload"],
  "job.confirmed": () => ["check", "buyer", "You confirmed the job", ""],
  "payment.requested": (d) => ["receipt", "provider", `Pro asked for $${d.amount}`, `sealed $${d.sealed}`],
  "overcharge.detected": (d) => ["shield", "policy", `Overcharge blocked · +$${d.extra}`, `asked $${d.asked}, sealed $${d.sealed}`],
  "provider.flagged": (d) => ["shield", "policy", `Warning on ${d.provider}'s record`, `asked $${d.asked} vs $${d.sealed}`],
  blocked: (d) => ["shield", "policy", "Policy gate stopped a PayPal call", d.rule || ""],
  "hold.captured": (d) => ["receipt", "paypal", `PayPal captured $${d.amount}`, Number(d.released) > 0 ? `$${d.released} released back` : "final capture", "Payments v2 · capture", d.captureId],
  "hold.voided": (d) => ["x", "paypal", "PayPal released the hold · $0", d.reason || "", "Payments v2 · void", d.authorizationId],
  "payout.created": (d) => ["receipt", "paypal", `PayPal Payouts sent $${d.amount}`, `fee $${d.fee}`, "Payouts v1", d.batchId],
  "settlement.approved": () => ["check", "engine", "Settled", ""],
  "request.released": () => ["x", "engine", "All holds released", ""],
  "balance.due_at_handover": (d) => ["car", "engine", `Balance at handover: $${d.balance}`, d.seller || ""],
  webhook: (d) => ["check", "paypal", "PayPal webhook verified", d.type, "Webhooks", d.authorizationId],
};
function activityCard(r) {
  const rows = audit.entries.filter((e) => e.requestId === r.id && ACT[e.action]).slice().reverse();
  const pp = rows.filter((e) => e.actor === "paypal").length;
  return `<div class="card act-card"><div class="card-head"><h3>${ic("terminal", "inline")} Activity</h3><span class="chip pp">${pp} PayPal call${pp === 1 ? "" : "s"}</span></div>
    <ol class="acts">${rows.slice(0, 40).map((e) => {
      const [icon, kind, title, sub, apiName, id] = ACT[e.action](e.data || {});
      return `<li class="a ${kind}"><span class="dot">${ic(icon)}</span><div style="min-width:0"><b>${esc(title)}</b>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}${apiName ? `<div class="api"><span class="pp-tag">PayPal ${esc(apiName)}</span>${id ? `<span class="mono">${esc(String(id).slice(0, 22))}</span>` : ""}</div>` : ""}</div><span class="t">${hhmm(e.at)}</span></li>`;
    }).join("") || `<li class="a"><span class="dot">${ic("info")}</span><div><b>Nothing yet</b></div></li>`}</ol></div>`;
}

// ---------- router ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, id] = h.split("/");
  return { name, id };
}
async function render({ animate = true } = {}) {
  ui.timers.forEach(clearInterval);
  ui.timers = [];
  if (route().name !== "job") stopLiveCam();
  const { name, id } = route();
  const view = $("#view");
  renderNav(name === "job" ? "jobs" : name);
  document.body.classList.toggle("is-home", name === "home");
  document.body.classList.remove("has-cta");
  $(".mobile-cta")?.remove();
  if (name === "home") { view.innerHTML = viewHome(); wireHome(); }
  else if (name === "jobs") view.innerHTML = viewJobs();
  else if (name === "job") {
    const r = requests.find((x) => x.id === id);
    view.innerHTML = viewJob(r);
    if (r) {
      wireJob(r);
      mountBidGrid(r);
      wireLive(r);
      const nx = nextAction(r);
      if (ui.ringOn === r.id && nx?.id === "call") { ui.ringOn = null; setTimeout(() => openCall(r, nx.intent), 900); }
      const next = nextAction(r);
      if (next) {
        const bar = document.createElement("div");
        bar.className = "mobile-cta";
        bar.innerHTML = `<button class="btn primary">${esc(next.label)} ${ic("arrow")}</button>`;
        document.body.append(bar);
        document.body.classList.add("has-cta");
        bar.querySelector("button").addEventListener("click", (e) => runNext(r, next, e.currentTarget));
      }
    }
    ui.justRevealed = null;
  } else if (name === "new") { view.innerHTML = viewNew(); wireNew(); }
  else if (name === "pros") { view.innerHTML = `<div class="skeleton"></div>`; const s = await api("/protocol/v1/requests"); view.innerHTML = viewPros(s); mountScheduler(); }
  else if (name === "autopilot") { const list = await api("/api/autopilot").catch(() => []); view.innerHTML = viewAutopilot(list); wireAutopilot(); }
  else if (name === "trust") { const usage = await api("/api/ai/usage").catch(() => null); view.innerHTML = viewTrust(usage); mountTrustGrids(usage); }
  else { location.hash = "#/home"; return; }
  animateNumbers(view);
  scrambleHashes(view);
  view.querySelectorAll(".detail .col > .card, .jobs-page .card").forEach((c, i) => { if (i > 0) c.setAttribute("data-reveal", ""); });
  if (animate) animateView(view);
  else view.querySelectorAll(".fade-in").forEach((el) => el.classList.remove("fade-in"));
  mountScenes(view);
}

/** Mount the three.js vault into every visible [data-vault3d] / #stage host. Lazy-loads three.js once. */
async function mountScenes(root) {
  scenes.splice(0).forEach((s) => s.destroy());
  const hosts = [...root.querySelectorAll("#stage, [data-vault3d]")].filter((h) => h.offsetParent !== null);
  if (!hosts.length) return;
  try {
    sceneMod ??= await import("/scene.js");
    if (!sceneMod.webglOK()) throw new Error("no webgl");
    for (const h of hosts) {
      if (!document.body.contains(h)) continue;
      const v = sceneMod.createVault(h, { amount: h.dataset.amount, label: h.dataset.label, state: h.dataset.state, agents: Number(h.dataset.agents), winner: Number(h.dataset.winner), compact: h.hasAttribute("data-vault3d") });
      if (h.dataset.state === "bidding") setTimeout(() => v.burst(6), 400);
      scenes.push(v);
    }
  } catch {
    hosts.forEach((h) => h.classList.add("fallback"));
  }
}

function wireHome() {
  $("#ask")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get("q");
    ui.text = q || undefined;
    ui.draft = null;
    location.hash = "#/new";
    if (q) setTimeout(() => $("#parse")?.click(), 80);
  });
  document.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    ui.text = {
      plumbing: "Kitchen sink is leaking under the cabinet, need it fixed this week, max $250. Licensed plumber.",
      electrical: "Two outlets in the living room stopped working, max $200, licensed electrician.",
      hvac: "Furnace makes a loud noise and won't stay on, max $300, licensed.",
      gutters: "Gutter cleaning for 5 homes on our street before winter, max $130 each.",
      cleaning: "Deep clean of a 2-bed apartment this Saturday, max $220.",
      handyman: "Mount a TV and fix a sticking door, max $180.",
      vehicles: "5 of us want the same 2026 compact hybrid SUV from one dealership, max $33,000 each, 36-month warranty, Austin 78704.",
      electronics: "8 parents buying the same Chromebook for school, max $300 each, delivered to Austin 78704.",
      appliances: "6 neighbours want heat-pump water heaters installed, max $900 each, Austin 78704.",
    }[b.dataset.cat];
    ui.draft = null;
    location.hash = "#/new";
  }));
}

async function runNext(r, next, btn) {
  if (next.id === "scroll") { document.getElementById(next.target)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (next.id === "hold" || next.id === "book") return openPayPal(r, next.buyer, next.id);
  if (next.id === "call") return openCall(r, next.intent);
  if (next.id === "live") return act(btn, async () => { await post(`/api/requests/${r.id}/live/start`); setTimeout(() => document.getElementById("live")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300); });
  if (next.id === "run") return askForBids(r, btn);
  const map = {
    close: async () => {
      await post(`/api/requests/${r.id}/close-bidding`);
      const out = await post(`/api/requests/${r.id}/award`);
      ui.justRevealed = r.id;
      const p = out.award;
      toast(p ? `${p.providerName} wins${p.discountBps ? ` with ${(p.discountBps / 100).toFixed(1)}% off every model` : ` at ${usd(p.priceCents)}`}` : "No bid met your terms. Nothing was charged.", 5000);
      setTimeout(() => document.getElementById("bids")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    },
  };
  await act(btn, map[next.id]);
}
/** Ask sellers for sealed bids, then show them arriving one by one. */
async function askForBids(r, btn) {
  ui.receiving = r.id;
  render({ animate: false });
  document.getElementById("bids")?.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const before = r.commitments.length;
    const res = await post(`/api/requests/${r.id}/run-providers`);
    await new Promise((ok) => setTimeout(ok, 900));
    ui.receiving = null;
    ui.arrive = { rid: r.id, from: before };
    await load();
    render({ animate: false });
    setTimeout(() => { if (ui.arrive?.rid === r.id) ui.arrive = null; }, 700 * res.length + 1500);
  } catch (e) { ui.receiving = null; toast(e.message, 6000); await load(); render({ animate: false }); }
}
/** Recruiting calls, played back line by line (2× speed) so you can see what the agent said. */
async function recruitLive(r, btn) {
  btn.disabled = true; btn.innerHTML = `<span class="caret">Dialling</span>`;
  let calls;
  try { calls = await post(`/api/requests/${r.id}/recruit`); } catch (e) { toast(e.message, 6000); btn.disabled = false; return; }
  const before = r.commitments.length;
  ui.liveCalls = { rid: r.id, calls };
  render({ animate: false });
  const host = $("#livecalls");
  host?.scrollIntoView({ behavior: "smooth", block: "center" });
  for (const c of calls) {
    if (!host) break;
    const box = document.createElement("div");
    box.className = "lc";
    box.innerHTML = `<div class="lc-h"><span class="lc-dot"></span><b>Calling ${esc(c.party)}</b><span class="mono small muted">${esc(c.phone || "")}</span><span class="chip">2× speed</span></div><div class="bubbles"></div>`;
    host.append(box);
    const bub = box.querySelector(".bubbles");
    const fastCall = calls.indexOf(c) > 0;
    for (const [li, l] of c.lines.entries()) {
      const fast = fastCall || li >= 4;
      if (fast) { const d = document.createElement("div"); d.className = `bub ${l.who}`; d.innerHTML = `<small>${l.who === "agent" ? "Aeonith agent" : esc(c.party)}</small>${esc(l.text)}`; bub.append(d); continue; }
      const d = document.createElement("div");
      d.className = `bub ${l.who} typing`;
      d.innerHTML = `<small>${l.who === "agent" ? "Aeonith agent" : esc(c.party)}</small><span class="dots"><i></i><i></i><i></i></span>`;
      bub.append(d);
      host.scrollTop = host.scrollHeight;
      await new Promise((ok) => setTimeout(ok, 200));
      d.classList.remove("typing");
      d.innerHTML = `<small>${l.who === "agent" ? "Aeonith agent" : esc(c.party)}</small>${esc(l.text)}`;
      await new Promise((ok) => setTimeout(ok, Math.min(1500, 250 + l.text.length * 9)));
    }
    box.querySelector(".lc-h").insertAdjacentHTML("beforeend", `<span class="chip ${/Joined/.test(c.outcome) ? "ok" : "warn"}">${esc(c.outcome)}</span>`);
    box.querySelector(".lc-dot").classList.add("off");
    await new Promise((ok) => setTimeout(ok, 700));
  }
  toast(`${calls.filter((c) => c.outcome.startsWith("Joined")).length} of ${calls.length} pros joined with a sealed bid`, 5000);
  await new Promise((ok) => setTimeout(ok, 1200));
  ui.liveCalls = null;
  ui.arrive = { rid: r.id, from: before };
  await load();
  render({ animate: false });
  setTimeout(() => { ui.arrive = null; }, 3000);
}
function startHold(r, bid, btn) {
  return openPayPal(r, bid, "hold");
}
/** The PayPal step, in PayPal's own window (JS SDK popup). Falls back to the redirect flow in simulated mode. */
let ppSdk = null;
function loadPayPalSdk() {
  ppSdk ??= (async () => {
    const c = await api("/api/public-config");
    if (!c.paypalClientId) return null;
    await new Promise((ok, bad) => {
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(c.paypalClientId)}&intent=authorize&currency=${c.currency || "USD"}&components=buttons&disable-funding=card,credit,paylater,venmo`;
      s.onload = ok; s.onerror = () => bad(new Error("PayPal SDK failed to load"));
      document.head.append(s);
    });
    return window.paypal;
  })().catch((e) => { ppSdk = null; throw e; });
  return ppSdk;
}
async function openPayPal(r, buyerId, kind) {
  const b = r.buyers.find((x) => x.id === buyerId) || r.buyers[0];
  const amount = kind === "book" ? (r.award?.unitPrices?.[b.id] ?? r.award?.priceCents) * b.units : holdOf(r, b);
  const dep = r.depositPerUnitCents;
  const title = kind === "book" ? `Book ${r.award.providerName}` : dep ? "Join the pool with a refundable deposit" : "Hold your money in PayPal";
  const bullets = kind === "book"
    ? [`PayPal authorizes ${usd(amount)}: held on your account, not paid to anyone.`, "Captured only after the video proof passes and you approve.", "Anything above the sealed price is blocked. Nothing used? The hold is voided: $0."]
    : dep ? [`PayPal authorizes a ${usd(amount)} deposit: refundable, not paid to anyone.`, "If the winning price for your model is above your private max, it's voided: $0.", "At delivery the deposit is applied to your car's sealed price."]
      : [`PayPal authorizes ${usd(amount)}: held, not paid.`, "You're charged only the winning price, after proof.", "The rest is released back to you."];
  document.querySelector(".ppx")?.remove();
  const el = document.createElement("div");
  el.className = "ppx";
  el.innerHTML = `<div class="ppx-card" role="dialog" aria-label="${esc(title)}">
    <button class="ppx-x" aria-label="Close">${ic("x")}</button>
    <div class="eyebrow">${ic("lock", "inline")} Secured by PayPal</div>
    <h2>${esc(title)}</h2>
    <div class="ppx-amt">${money(amount)}<small>${kind === "book" ? "sealed price · held until proof" : dep ? "refundable deposit" : "held · not paid"}</small></div>
    <ul class="ppx-list">${bullets.map((t) => `<li>${ic("check")}${esc(t)}</li>`).join("")}</ul>
    <div id="pp-buttons" class="pp-buttons"><div class="caret small muted">Loading PayPal</div></div>
    <div class="small muted" id="pp-status">PayPal opens in its own secure window. Aeonith never sees your PayPal login.</div>
  </div>`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("in"));
  const close = () => { el.classList.remove("in"); setTimeout(() => el.remove(), 250); };
  el.querySelector(".ppx-x").addEventListener("click", close);
  el.addEventListener("click", (e) => { if (e.target === el) close(); });
  const status = (t) => { const s = el.querySelector("#pp-status"); if (s) s.innerHTML = t; };
  let paypal = null;
  try { paypal = await loadPayPalSdk(); } catch (e) { status(esc(e.message)); }
  const host = el.querySelector("#pp-buttons");
  if (!paypal) {
    host.innerHTML = `<button class="btn primary block">${ic("lock")}Continue to PayPal (simulated)</button>`;
    host.querySelector("button").addEventListener("click", (e) => act(e.currentTarget, async () => { const o = await post(`/api/requests/${r.id}/buyers/${b.id}/hold`); location.href = o.approveUrl; }, { rerender: false }));
    return;
  }
  host.innerHTML = "";
  paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "pill", label: "paypal", height: 50, tagline: false },
    createOrder: async () => (await post(`/api/requests/${r.id}/buyers/${b.id}/hold`)).id,
    onApprove: async (data) => {
      status(`<span class="caret">Authorizing with PayPal</span>`);
      try {
        const out = await post(`/api/paypal/orders/${data.orderID}/approved`);
        status(`${ic("check", "inline")} Held by PayPal · <span class="mono">${esc(out.authorizationId || "")}</span>`);
        toast(kind === "book" ? `Booked. PayPal is holding ${usd(amount)} until the work is proven.` : `PayPal is holding ${usd(amount)}: reserved, not charged.`, 5000);
        setTimeout(async () => { close(); await load(); render({ animate: false }); }, 1300);
      } catch (e) { status(esc(e.message)); }
    },
    onCancel: () => status("PayPal window closed. Nothing was held."),
    onError: (e) => status(esc(e?.message || "PayPal error")),
  }).render(host);
}

function wireJob(r) {
  const v = $("#view");
  v.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", (e) => runNext(r, nextAction(r), e.currentTarget)));
  v.querySelectorAll("[data-hold]").forEach((b) => b.addEventListener("click", () => openPayPal(r, b.dataset.hold, "hold")));
  v.querySelector("[data-join]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, () => post(`/api/requests/${r.id}/join`, { name: f.get("name"), limitDollars: Number(f.get("limitDollars")), units: 1, ...(f.get("itemId") ? { itemId: f.get("itemId") } : {}) }));
  });
  v.querySelector("[data-live]")?.addEventListener("click", (e) => act(e.currentTarget, () => post(`/api/requests/${r.id}/live/start`)));
  v.querySelector("[data-upload]")?.addEventListener("change", (e) => { const file = e.target.files?.[0]; if (file) act(e.target.closest("label"), () => uploadProof(r, file)); });
  v.querySelectorAll("[data-recruit]").forEach((b) => b.addEventListener("click", (e) => recruitLive(r, e.currentTarget)));
  v.querySelector("[data-payreq]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, async () => {
      const out = await post(`/api/requests/${r.id}/payment-request`, { amountDollars: Number(f.get("amount")), note: f.get("note") || "" });
      ui.ringOn = r.id;
      if (out.paymentRequest?.overchargeCents > 0) toast(`Overcharge blocked: ${usd(out.paymentRequest.overchargeCents)} above the sealed price. Your agent is calling you.`, 6000);
    });
  });
  v.querySelectorAll("[data-call]").forEach((b) => b.addEventListener("click", () => openCall(r, b.dataset.call)));
  v.querySelectorAll("[data-release-now]").forEach((b) => b.addEventListener("click", (e) => act(e.currentTarget, async () => {
    if (r.proof?.verdict !== "pass") await post(`/api/requests/${r.id}/confirm`);
    await post(`/api/requests/${r.id}/settle`, { as: "buyer" });
    toast("Released: PayPal captured the sealed price and paid the pro by Payouts.", 5000);
  })));
}

function wireNew() {
  document.querySelectorAll("[name=kind]").forEach((x) => x.addEventListener("change", () => { ui.kind = x.value; ui.text = undefined; ui.draft = null; ui.questions = null; ui.answers = {}; render({ animate: false }); }));
  const parse = async (text) => {
    ui.text = text;
    ui.draft = await post("/api/intake", { text });
    ui.questions = null;
    render({ animate: false });
    try { ui.questions = await post("/api/intake/clarify", { text, draft: ui.draft }); ui.answers = {}; render({ animate: false }); } catch { /* questions are optional */ }
  };
  $("#parse")?.addEventListener("click", (e) => act(e.currentTarget, () => parse($("#intake").value), { rerender: false }));
  document.querySelectorAll(".qa .opt").forEach((b) => b.addEventListener("click", () => {
    const id = b.closest(".qa").dataset.q;
    ui.answers = { ...(ui.answers || {}), [id]: b.dataset.opt };
    b.closest(".chips").querySelectorAll(".opt").forEach((x) => x.classList.toggle("sel", x === b));
  }));
  $("#apply-answers")?.addEventListener("click", (e) => act(e.currentTarget, async () => {
    const qa = (ui.questions?.questions || []).filter((x) => ui.answers?.[x.id]).map((x) => `${x.question} ${ui.answers[x.id]}.`).join(" ");
    const text = `${$("#intake").value.trim()} ${qa}`.trim();
    const fresh = await post("/api/intake", { text });
    const keep = (k) => (fresh[k] === "" || fresh[k] === 0 || fresh[k] == null ? ui.draft?.[k] : fresh[k]);
    ui.draft = { ...ui.draft, ...fresh, ...Object.fromEntries(["zip", "limitDollars", "completeBy", "minWarrantyMonths", "category"].map((k) => [k, keep(k)])), licensed: fresh.licensed || ui.draft?.licensed, source: "ai" };
    ui.text = text;
    ui.questions = { questions: [], source: "ai" };
    toast("Updated with your answers.");
  }, { rerender: true }));
  // Voice note: Web Speech API where the browser has it.
  const mic = $("#mic");
  mic?.addEventListener("click", () => {
    if (!SR) { toast("Voice notes need Chrome or Edge. Type instead."); return; }
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true;
    let base = ""; ui.listening = true; $("#voice").classList.add("on"); $("#voice-l").textContent = "Listening… tap to stop";
    rec.onresult = (ev) => { $("#intake").value = base + [...ev.results].map((x) => x[0].transcript).join(" "); };
    rec.onend = () => { ui.listening = false; $("#voice")?.classList.remove("on"); const l = $("#voice-l"); if (l) l.textContent = "Voice note"; };
    rec.onerror = () => toast("Couldn't hear you. Type instead.");
    mic.onclick = () => rec.stop();
    rec.start();
  });
  // Channel3: real products for item pools
  const g = $("#c3-grid");
  if (g && ui.draft) {
    api(`/api/catalog/search?q=${encodeURIComponent(ui.draft.title)}&limit=6`).then((res) => {
      if (!res.products.length) { g.innerHTML = `<div class="small muted">No catalog matches. Describe the item instead.</div>`; return; }
      g.innerHTML = res.products.map((p, i) => `<label class="c3"><input type="radio" name="c3pick" value="${i}" ${i === 0 ? "checked" : ""} />${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" />` : ""}<b>${esc(p.title)}</b><small>${esc(p.brand)} · retail ${usd(p.priceCents)}${p.domain ? ` · ${esc(p.domain)}` : ""}</small></label>`).join("");
      ui.c3 = res.products;
    }).catch((e) => { g.innerHTML = `<div class="small muted">Catalog unavailable: ${esc(e.message)}</div>`; });
  }
  $("#draft")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, async () => {
      const category = f.get("category");
      let catalog, itemId;
      if (category === "vehicles") { catalog = CAR_CATALOG; itemId = f.get("itemId") || CAR_CATALOG.items[0].id; }
      else if (ui.c3?.length && ["electronics", "appliances"].includes(category)) {
        const p = ui.c3[Number(document.querySelector("[name=c3pick]:checked")?.value || 0)];
        catalog = { seller: `${p.brand || "Retailers"} · via Channel3`, items: [{ id: `c3-${p.id}`.slice(0, 40), name: p.title.slice(0, 90), msrpCents: p.priceCents, image: p.image, source: "Channel3", url: p.url }] };
        itemId = catalog.items[0].id;
      }
      const together = f.get("mode") === "together";
      const out = await post("/api/requests", {
        mode: together ? "together" : "solo", flow: together ? "funded" : "quotes",
        title: f.get("title"), category, description: f.get("description") || "", zip: f.get("zip") || "",
        licensed: f.get("licensed") === "on", minWarrantyMonths: Number(f.get("minWarrantyMonths") || 0), completeBy: f.get("completeBy") || "",
        buyerName: f.get("buyerName") || "You", limitDollars: Number(f.get("limitDollars")), units: 1,
        ...(Number(f.get("depositDollars")) > 0 ? { depositDollars: Number(f.get("depositDollars")) } : {}),
        ...(catalog ? { catalog, itemId } : {}),
      });
      ui.draft = null; ui.questions = null; ui.answers = {};
      location.hash = `#/job/${out.request.id}`;
      toast(together ? "Pool started. Join it with your refundable PayPal deposit." : "Request created. Ask pros for sealed quotes.");
    }, { rerender: false });
  });
}

// ---------- boot ----------
addEventListener("scroll", () => $("#topnav")?.classList.toggle("scrolled", scrollY > 40), { passive: true });
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem("aeonith-theme", t); } catch { /* private mode */ }
  const b = $("#theme-btn");
  if (b) b.innerHTML = t === "light" ? `${ic("spark")}<span>Dark</span>` : `${ic("spark")}<span>Light</span>`;
}
async function boot() {
  let theme = "dark";
  try { theme = localStorage.getItem("aeonith-theme") || "dark"; } catch { /* default */ }
  const qt = new URLSearchParams(location.search).get("theme");
  applyTheme(qt === "light" || qt === "dark" ? qt : theme);
  $("#theme-btn")?.addEventListener("click", () => { applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"); render({ animate: false }); });
  installPointerFX();
  initSmoothScroll();
  try { health = await api("/api/health"); } catch { health = null; }
  const pills = envPills();
  $("#env").innerHTML = pills;
  $("#env-top").innerHTML = pills;
  const qs = new URLSearchParams(location.search);
  if (qs.get("r")) location.hash = `#/job/${qs.get("r")}`;
  if (qs.get("held")) setTimeout(() => toast("PayPal hold approved: reserved, not charged."), 300);
  if (qs.get("vaulted")) { location.hash = "#/autopilot"; setTimeout(() => toast("PayPal saved for Autopilot (Vault). Holds only within your budget."), 300); }
  if (qs.get("quiet")) ui.quietCall = true;
  if (qs.get("cancelled")) setTimeout(() => toast("Hold cancelled at PayPal. Nothing was reserved."), 300);
  if (qs.size) history.replaceState(null, "", "/" + location.hash);
  await load();
  await render();
}
addEventListener("hashchange", async () => { await load(); await render(); scrollTop(); });
boot().catch((e) => toast(e.message, 8000));
