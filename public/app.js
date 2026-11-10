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
  { id: "jobs", label: "Jobs", icon: "jobs", href: "#/jobs" },
  { id: "new", label: "Post a job", icon: "plus", href: "#/new", fab: true },
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
const statusChip = (r) => `<span class="chip ${STATUS[r.status]?.[1] ?? ""}">${r.status === "bidding" ? `<span class="pulse"></span>` : ""}${STATUS[r.status]?.[0] ?? esc(r.status)}</span>`;
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
  { icon: "bolt", cat: "electrical", mode: "solo", live: true, title: "Solo repair", story: "One person, one job. Licensed pros' agents compete for it; you never haggle on the doorstep.", example: "Outlets: $224 vs $260 max", paypal: "Authorize → partial capture" },
  { icon: "gutter", cat: "gutters", mode: "together", live: true, title: "Street group", story: "Neighbours fund the same job. One trip serves every home, so everyone gets the same lower price.", example: "$118/home vs $160 solo", paypal: "Many holds → many captures" },
  { icon: "car", cat: "vehicles", live: true, preset: true, title: "Car pool, one dealership", story: "Five buyers want the same model and trim. Dealers' agents seal a per-car price for the whole group. Each buyer holds only a refundable deposit.", example: "$31,980/car vs $33k max", paypal: "$500 deposit hold → applied at delivery" },
  { icon: "box", cat: "electronics", live: true, preset: true, title: "Bulk items", story: "Parents, clubs or small offices pool an order of identical items. Retail agents bid for the batch; delivery photo releases the money.", example: "Chromebooks $267 vs $349", paypal: "Full-price holds → captures + Payouts" },
  { icon: "fridge", cat: "appliances", preset: true, title: "Appliances & upgrades", story: "Heat pumps, water heaters, EV chargers: a neighbourhood pools rebate-eligible upgrades and gets an installer's volume price.", example: "Hardware + install, one deal", paypal: "Pay Later on the balance" },
  { icon: "users", cat: "other", title: "Small-business restock", story: "Cafés and shops on one street pool supply orders (cups, beans, packaging) so a small buyer gets a big buyer's price.", example: "Monthly pooled orders", paypal: "Vault + recurring holds" },
];

// ---------- home ----------
function viewHome() {
  const held = requests.reduce((s, r) => s + heldNow(r), 0);
  const returned = requests.reduce((s, r) => s + r.buyers.reduce((t, b) => t + (b.status === "captured" ? (b.authorizedCents ?? 0) - (b.capturedCents ?? 0) : b.status === "voided" ? (b.authorizedCents ?? 0) : 0), 0), 0);
  const blocks = audit.entries.filter((e) => e.action === "blocked").length;
  const active = requests.filter((r) => !["settled", "released"].includes(r.status)).length;
  const latest = requests.find((r) => heldNow(r) > 0) || requests.find((r) => !["settled", "released"].includes(r.status)) || requests[0];
  const st = latest ? sceneState(latest) : "idle";
  const ticker = audit.entries.slice(-14).reverse().map((e) => {
    const k = e.actor.split(":")[0];
    const d = e.data || {};
    const extra = d.amount ? ` $${d.amount}` : d.priceCents ? ` ${usd(d.priceCents)}` : d.hash ? ` ${String(d.hash).slice(0, 12)}…` : "";
    return `<span><b class="${KIND[k] || ""}">${esc(k)}</b>${esc(LABEL[e.action] || e.action)}${esc(extra)}</span>`;
  }).join("");
  const settledJobs = requests.filter((r) => r.status === "settled");
  const avgSaving = settledJobs.length ? Math.round(settledJobs.reduce((s, r) => s + r.award.buyerSavingCents / Math.max(1, r.award.unitsServed), 0) / settledJobs.length) : 0;
  return `
  <section class="hero-ember">
    <div class="stage" id="stage" data-state="${st === "idle" ? "held" : st}" data-agents="${Math.max(3, latest?.commitments.length || 3)}" data-winner="${latest ? winnerIndex(latest) : 0}" data-amount="${esc(usd(latest ? (heldNow(latest) || latest.buyers.reduce((s, b) => s + holdOf(latest, b), 0)) : 0))}" data-label="${esc(st === "idle" ? "your private limit" : st === "settled" ? "paid on proof" : st === "released" ? "released · $0 charged" : "held · not paid")}">
      <div class="hud h1" data-float><span class="dotc">${ic("lock")}</span><div><small>Held in PayPal</small><b>${money(held, { count: true })}</b></div></div>
    </div>
    <div class="hero-inner">
      <h1 class="h-title" data-split>Your Money <br>Held Until <br><span class="soft">It's Done</span></h1>
      <div class="h-right">
        <p data-fade>Pros' AI agents compete with sealed bids. PayPal holds your payment and releases it only on photo proof.</p>
        <div class="cta-row" data-fade><a class="btn primary" href="#/new">Post a job</a><a class="btn-round" href="#/jobs" aria-label="See jobs">${ic("arrow")}</a></div>
        <form class="cmd h-ask" id="ask" data-fade>
          ${ic("spark")}
          <input name="q" placeholder="Leaking water heater, max $400…" aria-label="What needs doing?" autocomplete="off" />
          <button class="btn primary" type="submit" aria-label="Ask agent">${ic("arrow")}</button>
        </form>
      </div>
      <div class="h-bottom">
        <div class="h-caption" data-fade>Sealed bids, paid on proof</div>
        <div class="h-social" data-fade><span class="lbl">Held · Sealed · Proven</span><span class="circ" title="PayPal hold">${ic("lock")}</span><span class="circ" title="Sealed bids">${ic("hash")}</span><span class="circ" title="Photo proof">${ic("camera")}</span></div>
      </div>
    </div>
    <div class="wordmark" aria-hidden="true">AEONITH</div>
  </section>
  <div class="ticker" aria-label="Live agent activity"><div class="track-x">${ticker}${ticker}</div></div>

  <div class="sec-head"><div><div class="eyebrow">Live</div><h2 style="margin-top:6px">The market, <span class="grad">right now</span></h2></div><span class="chip ${audit.verify.ok ? "ok" : "bad"}">${ic("shield")}${audit.verify.length} events · chain ${audit.verify.ok ? "intact" : "broken"}</span></div>
  <div class="kpis" data-stagger>
    <div class="card kpi" data-tilt><small>Open jobs</small><span class="v num">${active}</span><div class="sub">${requests.length} total</div></div>
    <div class="card kpi" data-tilt><small>Held in PayPal</small><span class="v">${money(held, { count: true })}</span><div class="sub">reserved, not paid</div></div>
    <div class="card kpi" data-tilt><small>Returned to buyers</small><span class="v">${money(returned, { count: true })}</span><div class="sub">${avgSaving ? `avg ${usd0(avgSaving)} below limit` : "never above the hold"}</div></div>
    <div class="card kpi" data-tilt><small>Agent overreach blocked</small><span class="v num" style="color:${blocks ? "var(--red)" : "inherit"}">${blocks}</span><div class="sub">policy gate on every call</div></div>
  </div>

  <div class="sec-head"><div><div class="eyebrow">Start a job</div><h2 style="margin-top:6px">What needs <span class="grad">fixing?</span></h2></div><span class="small muted">licensed pros · sealed bids · paid on proof</span></div>
  <div class="cats" data-stagger>${["plumbing", "electrical", "hvac", "gutters", "cleaning", "handyman"].map((c) =>
    `<button class="cat" data-cat="${c}" data-tilt style="--tint:${cat(c).tint}"><span class="ico">${ic(cat(c).icon)}</span><span><b>${cat(c).label}</b><small>sealed bids</small></span></button>`).join("")}</div>

  <div class="home-grid" style="margin-top:14px">
    <section class="card" data-reveal>
      <div class="card-head"><h3>Your jobs</h3><a class="small muted" href="#/jobs">View all →</a></div>
      <div class="jobs">${requests.length ? requests.slice(0, 5).map(jobRow).join("") : `<div class="empty">No jobs yet.</div>`}</div>
    </section>
    <section class="card" data-reveal>
      <div class="card-head"><h3>${ic("terminal", "inline")} Agent console</h3><span class="chip ${audit.verify.ok ? "ok" : "bad"}">${audit.verify.ok ? "chain ✓" : "broken"}</span></div>
      <div class="feed">${feedLines(audit.entries, 9) || `<div class="muted">idle</div>`}</div>
      <div class="caret small muted" style="margin-top:8px;font-family:var(--mono)">listening</div>
    </section>
  </div>


  <div class="sec-head"><div><div class="eyebrow">Use cases</div><h2 style="margin-top:6px">One loop, <span class="grad">many markets</span></h2></div><span class="small muted">hold · sealed bids · proof · pay, for services and goods</span></div>
  <div class="usegrid" data-stagger>${USE_CASES.map((u) => {
    const live = requests.find((r) => r.category === u.cat && (u.mode ? r.mode === u.mode : true));
    return `<div class="card use" data-tilt>
      <div class="row-between"><span class="ico">${ic(u.icon)}</span><span class="chip ${u.live ? "lime" : ""}">${u.live ? "live in demo" : "same engine · next"}</span></div>
      <h3>${esc(u.title)}</h3>
      <p>${esc(u.story)}</p>
      <div class="use-kv"><div><small>Example</small><b>${esc(u.example)}</b></div><div><small>PayPal</small><b>${esc(u.paypal)}</b></div></div>
      ${live ? `<a class="btn ghost" href="#/job/${live.id}">Open the live job ${ic("arrow")}</a>` : u.preset ? `<button class="btn ghost" data-cat="${u.cat}">Try it ${ic("arrow")}</button>` : ""}
    </div>`;
  }).join("")}</div>

  <div class="sec-head"><div><div class="eyebrow">How it works</div><h2 style="margin-top:6px">Compete · hold · prove · <span class="grad">pay</span></h2></div></div>
  <div class="howgrid" data-stagger>
    <div class="card how" data-tilt><span class="icon3">${ic("lock")}</span><span class="n">01 · HOLD</span><h3>One PayPal hold</h3><p>Approve your limit once. It's reserved in PayPal, not paid to anyone, and pros never see the number.</p></div>
    <div class="card how" data-tilt><span class="icon3">${ic("hash")}</span><span class="n">02 · COMPETE</span><h3>Sealed bids</h3><p>Pros' agents commit a SHA-256 fingerprint. Nobody, including us, can read or change a bid until it closes.</p></div>
    <div class="card how" data-tilt><span class="icon3">${ic("camera")}</span><span class="n">03 · PROVE</span><h3>Photo proof</h3><p>The pro shows the finished job with a one-time code in frame. Code checks freshness; AI vision checks the work.</p></div>
    <div class="card how" data-tilt><span class="icon3">${ic("receipt")}</span><span class="n">04 · PAY</span><h3>Paid on proof</h3><p>A policy gate allows a capture only at the final price and never above your hold. The rest returns to you.</p></div>
  </div>
  `;
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
  return `<div class="row-between" style="margin-bottom:16px"><div><div class="eyebrow">All requests</div><h2 style="margin-top:6px">Jobs</h2></div><a class="btn primary" href="#/new">${ic("plus")}Post a job</a></div>
    <div class="card"><div class="jobs">${requests.length ? requests.map(jobRow).join("") : `<div class="empty">No jobs yet.</div>`}</div></div>`;
}

// ---------- job detail ----------
function viewJob(r) {
  if (!r) return `<a class="back" href="#/home">${ic("back")}Home</a><div class="card empty">Job not found.</div>`;
  const c = cat(r.category);
  const done = FLOW.map(([, , f]) => f(r));
  const nowIdx = done.indexOf(false);
  const req = r.requirements;
  const jobFeed = audit.entries.filter((e) => e.requestId === r.id);
  return `
  <a class="back" href="#/jobs">${ic("back")}Jobs</a>
  <div class="detail">
    <div class="col">
      <div class="card fade-in">
        <div class="job-title">
          <div class="ico">${ic(c.icon)}</div>
          <div style="min-width:0;flex:1"><div class="row" style="gap:6px">${statusChip(r)}<span class="chip">${r.mode === "together" ? `${ic("users")}Together` : "Solo"}</span><span class="chip mono" style="font-size:11px">${esc(r.id)}</span></div>
            <h1 style="margin-top:10px">${esc(r.title)}</h1>
            <p class="muted" style="margin:8px 0 0">${esc(r.description)}</p></div>
        </div>
        <div class="chips" style="margin-top:14px">
          <span class="chip">${ic(c.icon)}${c.label}</span>
          ${r.zip ? `<span class="chip">${ic("pin")}${esc(r.zip)}</span>` : ""}
          ${req.licensed ? `<span class="chip">${ic("shield")}Licensed only</span>` : ""}
          ${req.minWarrantyMonths ? `<span class="chip">${ic("check")}${req.minWarrantyMonths}-mo warranty</span>` : ""}
          ${req.completeBy ? `<span class="chip">${ic("clock")}Start by ${esc(new Date(req.completeBy + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</span>` : ""}
        </div>
        <div class="flow" aria-label="Progress">${FLOW.map(([n, i], k) => `<div class="s ${done[k] ? "done" : k === nowIdx ? "now" : ""}"><span class="n">${done[k] ? ic("check") : ic(i)}</span>${n}</div>`).join("")}</div>
      </div>
      ${autopilotBanner(r)}
      <div class="mc-mobile">${vault(r)}</div>
      ${peopleCard(r)}
      ${bidsCard(r)}
      ${winnerCard(r)}
      ${liveCard(r)}
      ${proofCard(r)}
      ${callsCard(r)}
      ${receiptCard(r)}
      ${paypalRailCard(r)}
    </div>
    <aside class="rail">${vault(r)}
      <div class="card"><div class="card-head"><h3>${ic("terminal", "inline")} Agent console</h3><span class="small muted mono">${jobFeed.length} events</span></div>
        <div class="feed">${feedLines(jobFeed, 10) || `<div class="muted">idle</div>`}</div></div>
    </aside>
  </div>`;
}

function nextAction(r) {
  const pending = r.buyers.find((b) => b.status === "pending");
  const anyHeld = r.buyers.some((b) => b.status === "held");
  if (["open", "bidding"].includes(r.status) && r.mode === "solo" && pending) return { id: "hold", label: `Hold ${usd0(holdOf(r, pending))}${r.depositPerUnitCents ? " deposit" : ""} with PayPal`, buyer: pending.id };
  if (["open", "bidding"].includes(r.status) && anyHeld && r.commitments.length === 0) return { id: "run", label: "Invite pros' agents to bid" };
  if (r.status === "bidding" && r.commitments.length) return { id: "close", label: "Unseal bids & pick winner" };
  if (["open", "bidding"].includes(r.status) && r.mode === "together" && pending) return { id: "scroll", target: "people", label: "Neighbours: approve holds" };
  if (r.status === "awarded" && r.autopilotId && !r.bookedAt) return { id: "call", intent: "book", label: "Answer your agent's call" };
  if (r.status === "awarded" && r.live && !r.live.finishedAt) return { id: "scroll", target: "live", label: "Pro: show the job on camera" };
  if (r.status === "awarded" && !r.proof) return { id: "challenge", label: "Pro: start job · get code" };
  if (r.status === "awarded" && r.proof) return { id: "scroll", target: "proof", label: "Pro: upload proof photo" };
  if (r.status === "proving" && r.proof?.verdict !== "fail") return { id: "call", intent: "release", label: "Agent call: release payment" };
  return null;
}

function vault(r) {
  const mine = r.mode === "solo" ? r.buyers[0] : null;
  const heldAmt = r.mode === "solo" ? (mine?.authorizedCents ?? (mine ? holdOf(r, mine) : 0)) : r.buyers.filter((b) => b.authorizedCents).reduce((s, b) => s + b.authorizedCents, 0);
  const charged = r.buyers.reduce((s, b) => s + (b.capturedCents || 0), 0);
  const isHeld = r.buyers.some((b) => b.status === "held");
  const proven = r.status === "proving" && (r.proof?.verdict === "pass" || !!r.buyerConfirmedAt);
  const stage = r.status === "settled" ? 3 : proven ? 2 : isHeld || r.status === "proving" ? 1 : 0;
  const t = (k, label, icon) => `<div class="t ${stage > k ? "done" : stage === k ? "now" : ""}"><span class="dot">${stage > k ? ic("check") : ic(icon)}</span>${label}</div>`;
  const next = nextAction(r);
  let eyebrow, amount, sub, state;
  const finalTotal = r.award ? r.award.priceCents * r.award.unitsServed : 0;
  const dep = r.depositPerUnitCents;
  if (r.status === "settled" && dep) { eyebrow = "Deposits applied"; amount = charged; sub = `${usd(r.settlement?.balanceDueCents)} balance paid to the seller at handover`; state = ["check", "applied on delivery"]; }
  else if (r.status === "settled") { eyebrow = "Paid on proof"; amount = charged; sub = `${usd(heldAmt - charged)} returned to ${r.mode === "solo" ? "you" : "neighbours"}`; state = ["check", "released on proof"]; }
  else if (r.status === "released") { eyebrow = "Released"; amount = 0; sub = "Every hold voided. Nobody was charged."; state = ["x", "nothing charged"]; }
  else if (isHeld) { eyebrow = r.mode === "solo" ? "Your money is held" : "Held across the street"; amount = heldNow(r) || heldAmt; sub = r.award ? (dep ? `Final ${usd(r.award.priceCents)}/${unitOf(r)}. Only the deposit is captured, at delivery.` : `Final ${usd(r.award.priceCents)}${r.mode === "together" ? `/${unitOf(r)}` : ""}. Never more than you held.`) : dep ? `Refundable ${usd0(dep)} deposit per ${unitOf(r)}, not paid to anyone.` : "Reserved in PayPal, not paid to anyone."; state = ["lock", "held · not paid"]; }
  else { eyebrow = r.mode === "solo" ? "Your private limit" : "Group limits"; amount = r.buyers.reduce((s, b) => s + holdOf(r, b), 0); sub = dep ? "Deposits to hold. Sellers never see anyone's max price." : "Pros never see this number."; state = ["shield", "private"]; }
  const pct = r.status === "settled" ? (heldAmt ? charged / heldAmt : 1) : r.award && heldAmt ? Math.min(1, finalTotal / heldAmt) : isHeld ? 1 : 0;
  const C = 2 * Math.PI * 38;
  const ringLbl = r.award ? `<b>${Math.round(pct * 100)}%</b>of hold` : isHeld ? `<b>100%</b>held` : `<b>n/a</b>no hold`;
  const lines = [];
  if (r.award) lines.push(["Winning bid", `${usd(r.award.priceCents)}${r.mode === "together" ? ` × ${r.award.unitsServed}` : ""}`]);
  if (r.settlement?.payout) lines.push(["Paid to pro", usd(r.settlement.payout.amountCents)], ["Platform fee", usd(r.settlement.payout.feeCents)]);
  if (r.award && dep) lines.push(["Deposit applied", `${usd(capOf(r, r.award.priceCents))} × ${r.award.unitsServed}`], ["Saved vs. max prices", usd(r.award.buyerSavingCents)]);
  if (r.settlement?.balanceDueCents) lines.push(["Balance at handover", usd(r.settlement.balanceDueCents)]);
  if (r.award && r.status !== "settled" && !dep) lines.push([r.mode === "solo" ? "You keep" : "Returned at capture", usd(r.buyers.filter((b) => r.award.buyersIn.includes(b.id)).reduce((s, b) => s + (b.authorizedCents ?? 0) - r.award.priceCents * b.units, 0))]);
  return `<div class="vault fade-in">
    <div class="vault3d" data-vault3d data-amount="${esc(usd(amount))}" data-label="${esc(state[1])}" data-state="${sceneState(r)}" data-agents="${Math.max(3, r.commitments.length || 3)}" data-winner="${winnerIndex(r)}"><span class="tag">${esc(state[1])}</span></div>
    <div class="top">
      <div style="min-width:0"><div class="eyebrow" style="color:var(--lime)">${ic("vault", "inline")} ${esc(eyebrow)}</div>
        <div class="amount">${money(amount, { count: true })}</div><div class="sub">${esc(sub)}</div></div>
      <div class="ring" aria-hidden="true"><svg viewBox="0 0 92 92"><circle class="trackc" cx="46" cy="46" r="38"/><circle class="fill" cx="46" cy="46" r="38" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-offset="${C * (1 - pct)}"/></svg><div class="lbl">${ringLbl}</div></div>
    </div>
    <div class="track">${t(0, "You hold", "lock")}${t(1, "Work proven", "camera")}${t(2, "Pro paid", "receipt")}</div>
    ${lines.length ? `<div class="lines">${lines.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>` : ""}
    ${next ? `<button class="btn primary block" data-next>${esc(next.label)} ${ic("arrow")}</button>` : ""}
    ${r.status === "proving" ? `<button class="btn ghost block" data-overcharge>${ic("shield")}Test: let an agent overcharge</button>` : ""}
    <div class="hint">${health?.paypal === "sandbox" ? "paypal sandbox · live api calls" : "simulated paypal · add sandbox keys for live calls"}</div>
  </div>`;
}

function peopleCard(r) {
  const open = ["open", "bidding"].includes(r.status);
  const rows = r.buyers.map((b) => {
    const st = { held: ["ok", "held"], captured: ["ok", `paid ${usd(b.capturedCents)}`], voided: ["warn", "released · $0"], failed: ["bad", "failed"], pending: ["", "not held"] }[b.status];
    return `<div class="person">
      <span class="avatar" style="background:${tint(b.name)}">${esc(initials(b.name))}</span>
      <div class="who"><b>${esc(b.name)}</b><small>${r.depositPerUnitCents ? "max price" : "limit"} ${usd0(b.limitCents)} · private${b.soloBestCents ? ` · solo quote ${usd0(b.soloBestCents)}` : ""}${b.authorizationId ? ` · ${esc(b.authorizationId)}` : ""}</small>${b.note ? `<small style="color:var(--amber)">${esc(b.note)}</small>` : ""}</div>
      <div class="act"><span class="chip ${st[0]}">${st[1]}</span>
        ${b.status === "pending" && open ? `<button class="btn primary" data-hold="${b.id}">${ic("lock")}Hold ${usd0(holdOf(r, b))}${r.depositPerUnitCents ? " deposit" : ""}</button>` : ""}
        ${b.status === "held" && open ? `<button class="btn ghost" data-cancel="${b.id}">Cancel hold</button>` : ""}</div>
    </div>`;
  }).join("");
  const join = r.mode === "together" && open ? `
    <form class="form-grid" data-join style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
      <label class="field">Neighbour name<input class="input" name="name" required placeholder="Jordan" /></label>
      <label class="field">${r.depositPerUnitCents ? `Private max price per ${unitOf(r)} ($)` : "Private limit per home ($)"}<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required /></label>
      <label class="field">Solo quote already in hand ($, optional)<input class="input" name="soloBestDollars" type="number" min="1" inputmode="decimal" /></label>
      <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${ic("plus")}Join this group</button></div>
    </form>` : "";
  return `<div class="card fade-in" id="people">
    <div class="card-head"><div><h3>${r.mode === "solo" ? "Funded request" : cat(r.category).pool ? "Buyers in the pool" : "Neighbours"}</h3><div class="small muted" style="margin-top:4px">${r.depositPerUnitCents ? `Each buyer holds a refundable ${usd0(r.depositPerUnitCents)} deposit. Max price at or above the winning bid: in. Below: released, never charged.` : r.mode === "solo" ? "One PayPal approval. Charged only on proof, at the final price." : "Each home approves its own hold. Below the final price → released, never charged."}</div></div>
      ${r.mode === "together" ? `<span class="chip lime">${fundedUnits(r)}/${r.buyers.length} funded</span>` : ""}</div>
    <div class="people">${rows}</div>${join}
  </div>`;
}

function bidsCard(r) {
  if (!r.commitments.length) {
    const can = ["open", "bidding"].includes(r.status) && r.buyers.some((b) => b.status === "held");
    return `<div class="card fade-in"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted" style="margin-top:4px">Pros' agents see job, area and funded homes. Never your limit.</div></div></div>
      <div class="note">${ic("info")}<div>${can ? "Your request is funded. Invite pros' agents to submit sealed bids." : "Approve a PayPal hold first. Pros only bid on funded jobs."}</div></div>${r.status === "bidding" ? recruitBtn() : ""}</div>`;
  }
  const animate = ui.justRevealed === r.id;
  const items = r.commitments.map((c, i) => {
    const rev = r.reveals.find((v) => v.offer.providerId === c.providerId);
    const row = r.award?.table.find((t) => t.providerId === c.providerId);
    const win = r.award?.providerId === c.providerId;
    const o = rev?.offer;
    return `<div class="bid ${win ? "win" : r.award ? "out" : ""} ${rev && animate ? "reveal-anim" : ""}" data-tilt style="animation-delay:${i * 120}ms">
      ${win ? `<span class="ribbon">WINNER</span>` : ""}
      <div class="head"><span class="avatar" style="background:${tint(c.providerName)}">${esc(initials(c.providerName))}</span>
        <div style="min-width:0"><b>${esc(c.providerName)}</b><div class="small muted mono">ai agent · simulated</div></div></div>
      ${!rev ? `<div class="sealed"><div class="lockrow">${ic("lock")}sealed · sha-256</div><div class="scramble" data-hash="${esc(c.hash)}">${esc(c.hash)}</div></div>`
        : `<div><span class="price">${money(o.priceCents)}</span><span class="muted small">${o.minUnits > 1 ? ` /${unitOf(r)} · min ${o.minUnits}` : ""}</span></div>
           <div class="chips">${o.promises.licensed ? `<span class="chip ok">${ic("shield")}${esc(o.promises.licenseNo)}</span>` : `<span class="chip bad">${ic("x")}unlicensed</span>`}
             <span class="chip">${o.promises.warrantyMonths}-mo warranty</span><span class="chip">${ic("clock")}${esc(when(o.promises.startAt, { minute: undefined, month: undefined, day: undefined }))}</span></div>
           <div>${rev.valid ? `<span class="chip lime">${ic("check")}matches sealed hash</span>` : `<span class="chip bad">${esc(rev.rejectReason)}</span>`}</div>
           ${row && !win ? `<div class="why">${esc(row.note)}</div>` : ""}`}
    </div>`;
  }).join("");
  return `<div class="card fade-in"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted" style="margin-top:4px">Each agent committed a SHA-256 fingerprint. Nobody, including us, can read a bid before it closes.</div></div><span class="chip">${r.commitments.length} bids</span></div>${r.status === "bidding" ? recruitBtn() : ""}
    <div class="bids">${items}</div></div>`;
}

function winnerCard(r) {
  if (!r.award) return "";
  const a = r.award;
  const w = r.reveals.find((v) => v.offer.providerId === a.providerId);
  const rev = r.aiOfferReview;
  const outs = a.buyersOut.map((o) => `<li><b>${esc(r.buyers.find((b) => b.id === o.buyerId)?.name)}</b>: ${esc(o.reason)}</li>`).join("");
  return `<div class="card fade-in">
    <div class="card-head"><div><div class="eyebrow">Deterministic clearing</div><h3 style="margin-top:6px">${esc(a.providerName)} wins</h3></div><span style="font-size:30px">${money(a.priceCents)}</span></div>
    <p style="margin:0 0 12px;color:var(--ink-2)">${esc(a.reason)}</p>
    ${w ? `<div class="note">${ic("info")}<div><b>Binding promises</b> (from the sealed offer): ${w.offer.promises.licensed ? `licensed ${esc(w.offer.promises.licenseNo)}` : "not licensed"}, ${w.offer.promises.warrantyMonths}-month warranty, starts ${esc(when(w.offer.promises.startAt))}.<div class="small muted" style="margin-top:4px">Pitch (display only, never parsed): “${esc(w.pitch)}”</div></div></div>` : ""}
    ${rev ? `<div class="note ai" style="margin-top:10px">${ic("spark")}<div><b>AI promise check:</b> ${esc(rev.summary)}${rev.flags.length ? `<ul>${rev.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}</div></div>` : ""}
    ${outs ? `<div class="note warn" style="margin-top:10px">${ic("hand")}<div><b>Released, never charged</b><ul>${outs}</ul></div></div>` : ""}
    <div class="small muted" style="margin:14px 0 8px">Every sealed offer, side by side (AG Grid):</div>
    <div class="grid-host" id="bids-grid-${esc(r.id)}"></div>
  </div>`;
}

function proofCard(r) {
  if (!["awarded", "proving", "settled"].includes(r.status)) return "";
  const p = r.proof;
  const checks = p?.checks?.length ? `<div class="checks" style="margin-top:14px">${p.checks.map((c) => {
    const k = c.ok === true ? "ok" : c.ok === false ? "bad" : "na";
    return `<div class="check ${k}"><span class="ci">${ic(k === "ok" ? "check" : k === "bad" ? "x" : "q")}</span><div><b class="small">${esc(c.name)}</b><small>${esc(c.detail)}</small></div><span class="chip ${c.by === "ai" ? "violet" : ""}">${c.by === "ai" ? "AI vision" : "code"}</span></div>`;
  }).join("")}</div>
  <div class="note ${p.verdict === "pass" ? "ok" : p.verdict === "fail" ? "bad" : "warn"}" style="margin-top:10px">${ic(p.verdict === "pass" ? "check" : p.verdict === "fail" ? "x" : "info")}<div><b>Verdict: ${esc(p.verdict)}</b>. ${p.verdict === "pass" ? "Proof passed. Payment can be released." : p.verdict === "fail" ? "Proof failed. Money stays on hold and can be released back." : "Needs the homeowner's eyes: check the photo and confirm."}</div></div>` : "";
  return `<div class="card fade-in" id="proof">
    <div class="card-head"><div><h3>Proof of completion</h3><div class="small muted" style="margin-top:4px">The pro photographs the finished job with this one-time code written in the frame.</div></div></div>
    ${p ? `<div class="ticket"><div class="code">${esc(p.code)}</div><div class="small"><b>Issued ${esc(when(p.issuedAt))}</b><br><span class="muted">Code rejects reused or stale photos. AI vision reads the code and checks the work.</span></div></div>`
      : `<div class="note">${ic("camera")}<div>When the pro starts, they receive a one-time code. Money only moves after photo proof.</div></div>`}
    ${r.status === "awarded" && !(r.live && !r.live.finishedAt) && (!r.autopilotId || r.bookedAt) ? `<div class="live-cta"><button class="btn primary" data-live>${ic("camera")}Start Live Proof (camera)</button><span class="small muted">Code appears only when the session starts and expires in 2 minutes.</span></div>` : ""}
    ${p && r.status === "awarded" && !(r.live && !r.live.finishedAt) ? `<form data-proof class="stack" style="margin-top:14px">
      <label class="upload" id="drop">${ic("upload")}<b>Upload the completion photo</b><span class="small muted">code ${esc(p.code)} must be visible</span><input type="file" name="photo" accept="image/*" capture="environment" required /></label>
      <label class="field">Note from the pro<input class="input" name="note" placeholder="Replaced 40-gal unit, old one hauled away" /></label>
      <button class="btn primary" type="submit">${ic("camera")}Submit proof</button></form>` : ""}
    ${checks}
  </div>`;
}

function receiptCard(r) {
  if (r.status === "released") return `<div class="card fade-in"><h3>Released</h3><p class="muted" style="margin:6px 0 0">Every hold was voided. Nobody was charged.</p></div>`;
  if (r.status !== "settled" || !r.settlement) {
    if (r.status === "proving") return `<div class="card fade-in"><div class="row-between"><div><h3>Admin</h3><div class="small muted">Release all holds if something went wrong.</div></div><button class="btn danger" data-release>Release all holds</button></div></div>`;
    return "";
  }
  const s = r.settlement;
  const lines = r.buyers.map((b) => {
    const cap = s.captures.find((c) => c.buyerId === b.id);
    const held = b.authorizedCents ?? holdOf(r, b);
    return `<div class="rline"><div><b>${esc(b.name)}</b><div class="small muted mono">held ${usd(held)}${cap ? ` · ${esc(cap.captureId)}` : ` · ${esc(b.note || "released")}`}</div></div>
      <div class="r"><b>${money(cap ? cap.amountCents : 0)}</b><div class="small" style="color:var(--ok)">${r.depositPerUnitCents && cap ? `deposit applied · ${usd(r.award.priceCents * b.units - cap.amountCents)} due at handover` : `${usd(cap ? held - cap.amountCents : held)} back`}</div></div></div>`;
  }).join("");
  return `<div class="card fade-in"><div class="card-head"><div><div class="eyebrow">Receipt</div><h3 style="margin-top:6px">Settled on PayPal</h3></div>${ic("receipt")}</div>
    <div>${lines}</div>
    ${s.payout ? `<div class="note ok" style="margin-top:12px">${ic("check")}<div><b>${usd(s.payout.amountCents)} paid out to ${esc(r.award.providerName)}</b> via PayPal Payouts (fee ${usd(s.payout.feeCents)}).${s.balanceDueCents ? ` The ${usd(s.balanceDueCents)} balance is paid to the seller at handover (financing or PayPal checkout), at the sealed price.` : ""}<div class="small mono" style="margin-top:4px">batch ${esc(s.payout.batchId)} · ${esc(s.payout.status)}</div></div></div>` : ""}</div>`;
}

// ---------- post a job ----------
function viewNew() {
  const d = ui.draft;
  return `<div style="margin-bottom:16px"><div class="eyebrow">Post a job</div><h2 style="margin-top:6px">What needs <span class="grad">fixing?</span></h2></div>
  <div class="grid-2">
    <div class="card fade-in">
      <label class="field">Describe it in your own words<textarea class="input" id="intake" rows="4">${esc(ui.text ?? "Water heater is leaking in my garage, need it fixed by Friday, max $400, Austin 78704. Licensed plumber only.")}</textarea></label>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="parse">${ic("spark")}Let the agent fill it in</button><span class="small muted mono" id="src">${d ? (d.source === "ai" ? "parsed by claude" : "parsed by offline rules") : ""}</span></div>
      ${d ? `<div class="ai-box" style="margin-top:14px"><div class="small" style="font-weight:600;margin-bottom:8px;color:#ffd0d8">${ic("spark", "inline")} Agent extracted: edit anything</div>
        <div class="chips"><span class="chip">${cat(d.category).label}</span>${d.limitDollars ? `<span class="chip lime">max ${usd0(d.limitDollars * 100)}</span>` : `<span class="chip warn">no limit found</span>`}${d.licensed ? `<span class="chip">licensed</span>` : ""}${d.completeBy ? `<span class="chip">by ${esc(d.completeBy)}</span>` : ""}${d.zip ? `<span class="chip">${esc(d.zip)}</span>` : ""}${d.units > 1 ? `<span class="chip">${d.units} homes</span>` : ""}</div></div>` : ""}
    </div>
    <form class="card fade-in" id="draft" style="${d ? "" : "display:none"}">
      <div class="form-grid">
        <label class="field full">Job<input class="input" name="title" required value="${esc(d?.title)}" /></label>
        <label class="field full">Details for the pro<input class="input" name="description" value="${esc(d?.description)}" /></label>
        <label class="field">Category<select class="input" name="category">${Object.keys(CAT).map((k) => `<option value="${k}" ${d?.category === k ? "selected" : ""}>${CAT[k].label}</option>`).join("")}</select></label>
        <label class="field">ZIP code<input class="input" name="zip" inputmode="numeric" value="${esc(d?.zip)}" /></label>
        <label class="field">Most you'll pay per job ($) · private<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required value="${d?.limitDollars || ""}" /></label>
        <label class="field">Start by<input class="input" name="completeBy" type="date" value="${esc(d?.completeBy)}" /></label>
        <label class="field">Minimum warranty (months)<input class="input" name="minWarrantyMonths" type="number" min="0" value="${d?.minWarrantyMonths ?? 0}" /></label>
        <label class="field">Refundable deposit per unit ($, item pools)<input class="input" name="depositDollars" type="number" min="1" inputmode="decimal" placeholder="e.g. 500 for a car" value="${d?.depositDollars || (cat(d?.category).pool && d?.limitDollars > 1000 ? 500 : "")}" /></label>
        <label class="field">Homes / units<input class="input" name="units" type="number" min="1" value="${d?.units || 1}" /></label>
        <label class="switch full"><input type="checkbox" name="licensed" ${d?.licensed ? "checked" : ""} />Licensed pro required</label>
        <div class="field full">How do you want to buy?
          <div class="seg"><label><input type="radio" name="mode" value="solo" ${!d || d.units <= 1 ? "checked" : ""} />Just me</label><label><input type="radio" name="mode" value="together" ${d?.units > 1 ? "checked" : ""} />With neighbours</label></div></div>
        <label class="field full">Your name<input class="input" name="buyerName" value="Maria G." /></label>
      </div>
      <div class="note" style="margin-top:14px">${ic("lock")}<div>Next you'll approve a <b>PayPal hold</b> for this amount: reserved, not paid. You're charged only the winning price, only after proof.</div></div>
      <button class="btn primary block" type="submit" style="margin-top:14px">Create funded request ${ic("arrow")}</button>
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
  root.querySelectorAll(".ring .fill").forEach((c) => requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = c.dataset.offset; })));
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

const recruitBtn = () => `<div class="row" style="margin-top:12px;gap:10px;flex-wrap:wrap"><button class="btn" data-recruit>${ic("users")}Have my agent call local pros</button><span class="small muted">Pitches offline pros on your funded job. Winners are paid by PayPal Payouts to email.</span></div>`;

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
    <p class="muted small" style="margin:6px 0 0">${esc(r.trigger.location)} · ${esc(when(r.trigger.at))}. Funded from your vaulted PayPal without waking you: ${b?.authorizedCents ? `${usd(b.authorizedCents)} held (${esc(b.authorizationId || "")})` : "hold pending"}. ${r.bookedAt ? "You approved the booking on the call." : r.status === "awarded" ? "Nobody is dispatched until you approve on the call." : ""}</p></div></div>`;
}

// ---------- calls (consent + recruiting) ----------
function callsCard(r) {
  if (!r.calls?.length) return "";
  return `<div class="card fade-in"><div class="card-head"><div><div class="eyebrow">Agent calls</div><h3 style="margin-top:6px">What your agent said, word for word</h3></div><span class="chip">${r.calls.length} call${r.calls.length === 1 ? "" : "s"}</span></div>
    <div class="calls">${r.calls.slice().reverse().map((c) => `<details class="call" ${c === r.calls[r.calls.length - 1] ? "open" : ""}>
      <summary><span class="call-ico">${ic(c.kind === "recruit" ? "users" : "q")}</span><div style="min-width:0"><b>${c.kind === "recruit" ? `Recruiting call · ${esc(c.party)}` : `Consent call · ${esc(c.party)}`}</b><div class="small muted">${esc(c.phone || "in-app call")} · ${esc(when(c.at))}</div></div><span class="chip ${/Declined/.test(c.outcome) ? "warn" : "ok"}">${esc(c.outcome)}</span></summary>
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
    <div class="callx-top"><span class="mono small">${intent === "book" ? "INCOMING · BOOKING APPROVAL" : "INCOMING · PAYMENT RELEASE"}</span><span class="mono small" id="cx-t">00:00</span></div>
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
      await speak(ok ? (intent === "book" ? "Booked. I'll call you again when the proof is in." : "Done. PayPal captured the payment and the pro is being paid.") : "Understood. Nothing moves until you say so.");
      el.querySelector("#cx-sub").innerHTML = `${ok ? "Approved" : "Declined"} · <span class="mono">sha256 ${out.consent.sha256.slice(0, 12)}…</span>`;
      toast(ok ? (intent === "book" ? "Booked by voice. Proof code issued to the pro." : "Released by voice: captured on PayPal and paid out.") : "Declined on the call. Nothing moved.");
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
    const yes = intent === "book" ? "Approve, book them" : "Release payment";
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
    <div class="card-head"><div><div class="eyebrow">Live Proof · camera</div><h3 style="margin-top:6px">Show the finished job, with this code in frame</h3></div><span class="chip ${left > 20 ? "lime" : "warn"}" id="lv-left">${left}s left</span></div>
    <div class="live-grid">
      <div class="live-cam"><video id="lv-video" playsinline muted autoplay></video><div class="live-code">${esc(L.code)}</div><span class="rec"><i></i>LIVE</span><div class="live-scan"></div></div>
      <div class="live-side">
        <div class="small"><b>Pro:</b> write <span class="mono">${esc(L.code)}</span> on paper, put it next to the finished work, then open the camera.</div><div class="small muted" style="margin-top:6px">The code was created when this session started and dies in 2 minutes, so an old photo or video can't pass. NVIDIA vision checks frames as they arrive.</div>
        <ol class="frames" id="lv-frames">${L.frames.map(frameRow).join("")}</ol>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" data-lv="cam">${ic("camera")}Code written down: open camera</button><button class="btn" data-lv="snap">${ic("camera")}Check a frame now</button><button class="btn primary" data-lv="finish" ${L.frames.length ? "" : "disabled"}>${ic("check")}Finish proof</button></div>
      </div>
    </div></div>`;
}
const frameRow = (f, i) => `<li><span class="mono small">#${i + 1} ${hhmm(f.at)}</span><span class="chip ${f.codeVisible === true ? "ok" : f.codeVisible === false ? "bad" : ""}">code ${f.codeVisible === true ? "✓" : f.codeVisible === false ? "✗" : "?"}</span><span class="chip ${f.matchesJob === true ? "ok" : f.matchesJob === false ? "bad" : ""}">work ${f.matchesJob === true ? "✓" : f.matchesJob === false ? "✗" : "?"}</span><small class="muted">${esc(f.summary || "")}</small></li>`;
async function wireLive(r) {
  const card = $("#live");
  if (!card) { stopLiveCam(); return; }
  const video = $("#lv-video");
  const openCam = async () => {
    try {
      liveCam.stream ??= await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = liveCam.stream;
      card.querySelector("[data-lv=cam]")?.remove();
      clearInterval(liveCam.timer);
      liveCam.timer = setInterval(snap, 3500);
      setTimeout(snap, 1800);
    } catch { toast("Camera unavailable: allow camera access, or use the photo upload instead.", 6000); }
  };
  if (liveCam.stream) { video.srcObject = liveCam.stream; card.querySelector("[data-lv=cam]")?.remove(); }
  const left = $("#lv-left");
  const tick = setInterval(() => { const s = Math.max(0, Math.round((Date.parse(r.live.expiresAt) - Date.now()) / 1000)); if (left) left.textContent = `${s}s left`; if (!s) clearInterval(tick); }, 1000);
  ui.timers.push(tick);
  const snap = async () => {
    if (liveCam.busy || !video.videoWidth) return;
    liveCam.busy = true;
    try {
      const w = Math.min(960, video.videoWidth), h = Math.round((w / video.videoWidth) * video.videoHeight);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(video, 0, 0, w, h);
      const b64 = c.toDataURL("image/jpeg", 0.85).split(",")[1];
      card.classList.add("checking");
      const out = await post(`/api/requests/${r.id}/live/frame`, { imageBase64: b64 });
      r.live.frames.push(out.frame);
      $("#lv-frames").innerHTML = r.live.frames.map(frameRow).join("");
      card.querySelector("[data-lv=finish]").disabled = false;
      if (out.done || r.live.frames.length >= 6) await finish();
    } catch (e) { toast(e.message, 5000); clearInterval(liveCam.timer); }
    finally { liveCam.busy = false; card.classList.remove("checking"); }
  };
  const finish = async () => {
    clearInterval(liveCam.timer);
    const p = await post(`/api/requests/${r.id}/live/finish`);
    stopLiveCam();
    toast(`Live Proof verdict: ${p.verdict}`);
    await load(); render({ animate: false });
  };
  card.querySelector("[data-lv=cam]")?.addEventListener("click", openCam);
  card.querySelector("[data-lv=snap]").addEventListener("click", snap);
  card.querySelector("[data-lv=finish]").addEventListener("click", (e) => act(e.currentTarget, finish, { rerender: false }));
  if (liveCam.stream && !liveCam.timer) liveCam.timer = setInterval(snap, 3500);
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
      if (ui.ringOn === r.id && r.status === "awarded" && r.autopilotId && !r.bookedAt) { ui.ringOn = null; setTimeout(() => openCall(r, "book"), 900); }
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
  if (next.id === "hold") return startHold(r, next.buyer, btn);
  if (next.id === "call") return openCall(r, next.intent);
  const map = {
    run: async () => { const res = await post(`/api/requests/${r.id}/run-providers`); toast(`${res.length} pro agents sealed a bid`); },
    close: async () => { await post(`/api/requests/${r.id}/close-bidding`); const out = await post(`/api/requests/${r.id}/award`); ui.justRevealed = r.id; toast(out.award ? `${out.award.providerName} wins at ${usd(out.award.priceCents)}` : "No bid met your terms. Every hold was released."); },
    challenge: () => post(`/api/requests/${r.id}/challenge`),
    confirm: async () => { await post(`/api/requests/${r.id}/confirm`); toast("Confirmed. Release the payment when ready."); },
    settle: async () => { await post(`/api/requests/${r.id}/settle`, { as: "buyer" }); toast("Paid on proof: captured on PayPal and paid out to the pro."); },
  };
  await act(btn, map[next.id]);
}
function startHold(r, bid, btn) {
  return act(btn, async () => { const o = await post(`/api/requests/${r.id}/buyers/${bid}/hold`); location.href = o.approveUrl; }, { rerender: false });
}

function wireJob(r) {
  const v = $("#view");
  v.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", (e) => runNext(r, nextAction(r), e.currentTarget)));
  v.querySelectorAll("[data-hold]").forEach((b) => b.addEventListener("click", () => startHold(r, b.dataset.hold, b)));
  v.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => act(b, () => post(`/api/requests/${r.id}/buyers/${b.dataset.cancel}/cancel`))));
  v.querySelector("[data-join]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, () => post(`/api/requests/${r.id}/join`, { name: f.get("name"), limitDollars: Number(f.get("limitDollars")), units: 1, soloBestDollars: f.get("soloBestDollars") ? Number(f.get("soloBestDollars")) : undefined }));
  });
  const form = v.querySelector("[data-proof]");
  if (form) {
    const input = form.querySelector("input[type=file]");
    input.addEventListener("change", () => {
      const f = input.files[0];
      if (!f) return;
      const drop = $("#drop");
      drop.querySelectorAll("img").forEach((i) => i.remove());
      const img = document.createElement("img");
      img.alt = "Selected proof photo";
      img.src = URL.createObjectURL(f);
      drop.prepend(img);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const file = f.get("photo");
      act(e.submitter, async () => {
        const b64 = await new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = bad; fr.readAsDataURL(file); });
        const p = await post(`/api/requests/${r.id}/proof`, { imageBase64: b64, note: f.get("note") || "" });
        toast(`Proof verdict: ${p.verdict}`);
      });
    });
  }
  v.querySelector("[data-live]")?.addEventListener("click", (e) => act(e.currentTarget, () => post(`/api/requests/${r.id}/live/start`)));
  v.querySelectorAll("[data-recruit]").forEach((b) => b.addEventListener("click", (e) => act(e.currentTarget, async () => {
    const calls = await post(`/api/requests/${r.id}/recruit`);
    const joined = calls.filter((c) => c.outcome.startsWith("Joined")).length;
    toast(`Your agent called ${calls.length} local pro${calls.length === 1 ? "" : "s"}: ${joined} joined with a sealed bid.`, 6000);
  })));
  v.querySelectorAll("[data-overcharge]").forEach((b) => b.addEventListener("click", (e) => act(e.currentTarget, async () => {
    const res = await post(`/api/requests/${r.id}/try-overcharge`);
    toast(res.blocked ? `Blocked ✓ ${res.message}` : "Not blocked?!", 7000);
  })));
  v.querySelector("[data-release]")?.addEventListener("click", (e) => {
    const token = prompt("Admin token (ADMIN_TOKEN in .env)");
    if (token) act(e.currentTarget, () => post(`/api/requests/${r.id}/release`, {}, { "x-admin-token": token }));
  });
}

function wireNew() {
  $("#parse")?.addEventListener("click", (e) => {
    ui.text = $("#intake").value;
    act(e.currentTarget, async () => { ui.draft = await post("/api/intake", { text: ui.text }); }, { rerender: false }).then(() => render());
  });
  $("#draft")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, async () => {
      const out = await post("/api/requests", {
        mode: f.get("mode"), title: f.get("title"), category: f.get("category"), description: f.get("description") || "", zip: f.get("zip") || "",
        licensed: f.get("licensed") === "on", minWarrantyMonths: Number(f.get("minWarrantyMonths") || 0), completeBy: f.get("completeBy") || "",
        buyerName: f.get("buyerName") || "You", limitDollars: Number(f.get("limitDollars")),
        // Item pools: the creator buys one unit; the others join with their own holds.
        units: cat(f.get("category")).pool && f.get("mode") === "together" ? 1 : Number(f.get("units") || 1),
        ...(Number(f.get("depositDollars")) > 0 ? { depositDollars: Number(f.get("depositDollars")) } : {}),
      });
      ui.draft = null;
      location.hash = `#/job/${out.request.id}`;
      toast("Request created. Approve your PayPal hold to fund it.");
    }, { rerender: false });
  });
}

// ---------- boot ----------
addEventListener("scroll", () => $("#topnav")?.classList.toggle("scrolled", scrollY > 40), { passive: true });
async function boot() {
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
