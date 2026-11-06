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
const SWATCH = ["#c8f560", "#4ff0b4", "#8b7bff", "#52d6ff", "#ffbf5a", "#ff8fb1"];
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
  vault: "M4 5h16v14H4zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 9V7M12 17v-2M4 9h2M4 15h2",
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.info}"/></svg>`;
const CAT = {
  plumbing: { icon: "drop", tint: "rgba(82,214,255,.35)", label: "Plumbing" },
  electrical: { icon: "bolt", tint: "rgba(255,191,90,.35)", label: "Electrical" },
  hvac: { icon: "fan", tint: "rgba(139,123,255,.4)", label: "Heating & AC" },
  gutters: { icon: "gutter", tint: "rgba(79,240,180,.35)", label: "Gutters" },
  cleaning: { icon: "broom", tint: "rgba(255,143,177,.35)", label: "Cleaning" },
  handyman: { icon: "wrench", tint: "rgba(200,245,96,.35)", label: "Handyman" },
  landscaping: { icon: "leaf", tint: "rgba(79,240,180,.35)", label: "Yard" },
  moving: { icon: "truck", tint: "rgba(82,214,255,.35)", label: "Moving" },
  other: { icon: "wrench", tint: "rgba(200,245,96,.35)", label: "Other" },
};
const cat = (c) => CAT[c] || CAT.other;

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
}

// ---------- navigation ----------
const NAV = [
  { id: "home", label: "Home", icon: "home", href: "#/home" },
  { id: "jobs", label: "Jobs", icon: "jobs", href: "#/jobs" },
  { id: "new", label: "Post a job", icon: "plus", href: "#/new", fab: true },
  { id: "pros", label: "Pros", icon: "pros", href: "#/pros" },
  { id: "trust", label: "Trust", icon: "shield", href: "#/trust" },
];
function renderNav(active) {
  $("#side-nav").innerHTML = NAV.map((n) => `<a href="${n.href}" class="${n.id === active ? "active" : ""} ${n.fab ? "cta" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
  $("#tabbar").innerHTML = NAV.map((n) => n.fab
    ? `<a href="${n.href}" class="fab" aria-label="${n.label}"><span class="fab-btn">${ic("plus")}</span></a>`
    : `<a href="${n.href}" class="${n.id === active ? "active" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
}
function envPills() {
  if (!health) return "";
  const pp = health.paypal === "sandbox";
  const ai = health.ai.startsWith("claude");
  return `<span class="chip ${pp ? "ok" : "warn"}">${ic("lock")}${pp ? "PayPal sandbox" : "PayPal simulated"}</span>
    <span class="chip ${ai ? "violet" : "warn"}" title="${esc(health.ai)}">${ic("spark")}${ai ? "Claude online" : "AI offline rules"}</span>`;
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
  "settlement.approved": "settlement approved", "request.released": "all holds released", blocked: "POLICY BLOCKED", webhook: "webhook",
};
const feedLines = (entries, n = 8) => entries.slice(-n).reverse().map((e) => {
  const k = e.actor.split(":")[0];
  const d = e.data || {};
  const extra = d.amount ? ` $${d.amount}` : d.priceCents ? ` ${usd(d.priceCents)}` : d.hash ? ` ${String(d.hash).slice(0, 10)}…` : d.rule ? ` [${d.rule}]` : "";
  return `<div class="ln"><span class="t">${hhmm(e.at)}</span><span><span class="k ${KIND[k] || ""}">${esc(k)}</span> ${esc(LABEL[e.action] || e.action)}${esc(extra)}</span></div>`;
}).join("");

// ---------- home ----------
function viewHome() {
  const held = requests.reduce((s, r) => s + heldNow(r), 0);
  const returned = requests.reduce((s, r) => s + r.buyers.reduce((t, b) => t + (b.status === "captured" ? (b.authorizedCents ?? 0) - (b.capturedCents ?? 0) : b.status === "voided" ? (b.authorizedCents ?? 0) : 0), 0), 0);
  const blocks = audit.entries.filter((e) => e.action === "blocked").length;
  const active = requests.filter((r) => !["settled", "released"].includes(r.status)).length;
  const latest = requests.find((r) => !["settled", "released"].includes(r.status)) || requests[0];
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
  <section class="hero3d">
    <div class="copy">
      <div class="eyebrow" data-fade><span class="pulse" style="display:inline-block;margin-right:8px;vertical-align:1px"></span>Agent active · sealed-bid home services</div>
      <h1 class="display" style="margin-top:16px" data-split>Fair prices. <span class="iri">Paid on proof.</span></h1>
      <p class="lede" data-fade>Name the job and the most you'll pay. Pros' AI agents compete with <b>sealed bids</b> they can't peek at. PayPal holds your money, and releases it only when the work is <b>proven done</b>.</p>
      <form class="cmd" id="ask" data-fade>
        ${ic("spark")}
        <input name="q" placeholder="Water heater leaking, fix by Friday, max $400…" aria-label="What needs doing?" autocomplete="off" />
        <button class="btn primary" type="submit">Ask agent ${ic("arrow")}</button>
      </form>
      <div class="legend" data-fade><span><i style="background:var(--lime)"></i>your money (held)</span><span><i style="background:var(--amber)"></i>pro agents</span><span><i style="background:var(--violet)"></i>sealed bids</span></div>
    </div>
    <div class="stage" id="stage" data-state="${st}" data-agents="${Math.max(3, latest?.commitments.length || 3)}" data-winner="${latest ? winnerIndex(latest) : 0}">
      <div class="hud h1" data-float><span class="dotc">${ic("lock")}</span><div><small>Held in PayPal</small><b>${money(held, { count: true })}</b></div></div>
      <div class="hud h2" data-float><span class="dotc" style="color:var(--violet);background:rgba(139,123,255,.14)">${ic("hash")}</span><div><small>Sealed bids</small><b class="num">${requests.reduce((s, r) => s + r.commitments.length, 0)}</b></div></div>
      <div class="hud h3" data-float><span class="dotc" style="color:var(--amber);background:rgba(255,191,90,.14)">${ic("camera")}</span><div><small>Paid only on</small><b>photo proof</b></div></div>
    </div>
    <div class="bigword" aria-hidden="true" data-parallax="-12">HELD · NOT · PAID</div>
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
    <div><h3>${esc(r.title)}</h3><div class="meta">${c.label.toLowerCase()} · ${esc(r.zip || "n/a")} · ${r.mode === "together" ? `${fu}/${total} homes funded` : "solo"}</div>
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
      <div class="mc-mobile">${vault(r)}</div>
      ${peopleCard(r)}
      ${bidsCard(r)}
      ${winnerCard(r)}
      ${proofCard(r)}
      ${receiptCard(r)}
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
  if (["open", "bidding"].includes(r.status) && r.mode === "solo" && pending) return { id: "hold", label: `Hold ${usd0(pending.limitCents * pending.units)} with PayPal`, buyer: pending.id };
  if (["open", "bidding"].includes(r.status) && anyHeld && r.commitments.length === 0) return { id: "run", label: "Invite pros' agents to bid" };
  if (r.status === "bidding" && r.commitments.length) return { id: "close", label: "Unseal bids & pick winner" };
  if (["open", "bidding"].includes(r.status) && r.mode === "together" && pending) return { id: "scroll", target: "people", label: "Neighbours: approve holds" };
  if (r.status === "awarded" && !r.proof) return { id: "challenge", label: "Pro: start job · get code" };
  if (r.status === "awarded" && r.proof) return { id: "scroll", target: "proof", label: "Pro: upload proof photo" };
  if (r.status === "proving" && r.proof?.verdict !== "pass" && !r.buyerConfirmedAt && r.proof?.verdict !== "fail") return { id: "confirm", label: "Confirm the job is done" };
  if (r.status === "proving" && (r.proof?.verdict === "pass" || r.buyerConfirmedAt)) return { id: "settle", label: "Release payment via PayPal" };
  return null;
}

function vault(r) {
  const mine = r.mode === "solo" ? r.buyers[0] : null;
  const heldAmt = r.mode === "solo" ? (mine?.authorizedCents ?? (mine?.limitCents ?? 0) * (mine?.units || 1)) : r.buyers.filter((b) => b.authorizedCents).reduce((s, b) => s + b.authorizedCents, 0);
  const charged = r.buyers.reduce((s, b) => s + (b.capturedCents || 0), 0);
  const isHeld = r.buyers.some((b) => b.status === "held");
  const proven = r.status === "proving" && (r.proof?.verdict === "pass" || !!r.buyerConfirmedAt);
  const stage = r.status === "settled" ? 3 : proven ? 2 : isHeld || r.status === "proving" ? 1 : 0;
  const t = (k, label, icon) => `<div class="t ${stage > k ? "done" : stage === k ? "now" : ""}"><span class="dot">${stage > k ? ic("check") : ic(icon)}</span>${label}</div>`;
  const next = nextAction(r);
  let eyebrow, amount, sub, state;
  const finalTotal = r.award ? r.award.priceCents * r.award.unitsServed : 0;
  if (r.status === "settled") { eyebrow = "Paid on proof"; amount = charged; sub = `${usd(heldAmt - charged)} returned to ${r.mode === "solo" ? "you" : "neighbours"}`; state = ["check", "released on proof"]; }
  else if (r.status === "released") { eyebrow = "Released"; amount = 0; sub = "Every hold voided. Nobody was charged."; state = ["x", "nothing charged"]; }
  else if (isHeld) { eyebrow = r.mode === "solo" ? "Your money is held" : "Held across the street"; amount = heldNow(r) || heldAmt; sub = r.award ? `Final ${usd(r.award.priceCents)}${r.mode === "together" ? "/home" : ""}. Never more than you held.` : "Reserved in PayPal, not paid to anyone."; state = ["lock", "held · not paid"]; }
  else { eyebrow = r.mode === "solo" ? "Your private limit" : "Group limits"; amount = r.buyers.reduce((s, b) => s + b.limitCents * b.units, 0); sub = "Pros never see this number."; state = ["shield", "private"]; }
  const pct = r.status === "settled" ? (heldAmt ? charged / heldAmt : 1) : r.award && heldAmt ? Math.min(1, finalTotal / heldAmt) : isHeld ? 1 : 0;
  const C = 2 * Math.PI * 38;
  const ringLbl = r.award ? `<b>${Math.round(pct * 100)}%</b>of hold` : isHeld ? `<b>100%</b>held` : `<b>n/a</b>no hold`;
  const lines = [];
  if (r.award) lines.push(["Winning bid", `${usd(r.award.priceCents)}${r.mode === "together" ? ` × ${r.award.unitsServed}` : ""}`]);
  if (r.settlement?.payout) lines.push(["Paid to pro", usd(r.settlement.payout.amountCents)], ["Platform fee", usd(r.settlement.payout.feeCents)]);
  if (r.award && r.status !== "settled") lines.push([r.mode === "solo" ? "You keep" : "Returned at capture", usd(r.buyers.filter((b) => r.award.buyersIn.includes(b.id)).reduce((s, b) => s + (b.authorizedCents ?? 0) - r.award.priceCents * b.units, 0))]);
  return `<div class="vault fade-in">
    <div class="vault3d" data-vault3d data-state="${sceneState(r)}" data-agents="${Math.max(3, r.commitments.length || 3)}" data-winner="${winnerIndex(r)}"><span class="tag">${esc(state[1])}</span></div>
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
      <div class="who"><b>${esc(b.name)}</b><small>limit ${usd0(b.limitCents)} · private${b.soloBestCents ? ` · solo quote ${usd0(b.soloBestCents)}` : ""}${b.authorizationId ? ` · ${esc(b.authorizationId)}` : ""}</small>${b.note ? `<small style="color:var(--amber)">${esc(b.note)}</small>` : ""}</div>
      <div class="act"><span class="chip ${st[0]}">${st[1]}</span>
        ${b.status === "pending" && open ? `<button class="btn primary" data-hold="${b.id}">${ic("lock")}Hold ${usd0(b.limitCents * b.units)}</button>` : ""}
        ${b.status === "held" && open ? `<button class="btn ghost" data-cancel="${b.id}">Cancel hold</button>` : ""}</div>
    </div>`;
  }).join("");
  const join = r.mode === "together" && open ? `
    <form class="form-grid" data-join style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
      <label class="field">Neighbour name<input class="input" name="name" required placeholder="Jordan" /></label>
      <label class="field">Private limit per home ($)<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required /></label>
      <label class="field">Solo quote already in hand ($, optional)<input class="input" name="soloBestDollars" type="number" min="1" inputmode="decimal" /></label>
      <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${ic("plus")}Join this group</button></div>
    </form>` : "";
  return `<div class="card fade-in" id="people">
    <div class="card-head"><div><h3>${r.mode === "solo" ? "Funded request" : "Neighbours"}</h3><div class="small muted" style="margin-top:4px">${r.mode === "solo" ? "One PayPal approval. Charged only on proof, at the final price." : "Each home approves its own hold. Below the final price → released, never charged."}</div></div>
      ${r.mode === "together" ? `<span class="chip lime">${fundedUnits(r)}/${r.buyers.length} funded</span>` : ""}</div>
    <div class="people">${rows}</div>${join}
  </div>`;
}

function bidsCard(r) {
  if (!r.commitments.length) {
    const can = ["open", "bidding"].includes(r.status) && r.buyers.some((b) => b.status === "held");
    return `<div class="card fade-in"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted" style="margin-top:4px">Pros' agents see job, area and funded homes. Never your limit.</div></div></div>
      <div class="note">${ic("info")}<div>${can ? "Your request is funded. Invite pros' agents to submit sealed bids." : "Approve a PayPal hold first. Pros only bid on funded jobs."}</div></div></div>`;
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
        : `<div><span class="price">${money(o.priceCents)}</span><span class="muted small">${o.minUnits > 1 ? ` /home · min ${o.minUnits}` : ""}</span></div>
           <div class="chips">${o.promises.licensed ? `<span class="chip ok">${ic("shield")}${esc(o.promises.licenseNo)}</span>` : `<span class="chip bad">${ic("x")}unlicensed</span>`}
             <span class="chip">${o.promises.warrantyMonths}-mo warranty</span><span class="chip">${ic("clock")}${esc(when(o.promises.startAt, { minute: undefined, month: undefined, day: undefined }))}</span></div>
           <div>${rev.valid ? `<span class="chip lime">${ic("check")}matches sealed hash</span>` : `<span class="chip bad">${esc(rev.rejectReason)}</span>`}</div>
           ${row && !win ? `<div class="why">${esc(row.note)}</div>` : ""}`}
    </div>`;
  }).join("");
  return `<div class="card fade-in"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted" style="margin-top:4px">Each agent committed a SHA-256 fingerprint. Nobody, including us, can read a bid before it closes.</div></div><span class="chip">${r.commitments.length} bids</span></div>
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
    ${p && r.status === "awarded" ? `<form data-proof class="stack" style="margin-top:14px">
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
    const held = b.authorizedCents ?? b.limitCents * b.units;
    return `<div class="rline"><div><b>${esc(b.name)}</b><div class="small muted mono">held ${usd(held)}${cap ? ` · ${esc(cap.captureId)}` : ` · ${esc(b.note || "released")}`}</div></div>
      <div class="r"><b>${money(cap ? cap.amountCents : 0)}</b><div class="small" style="color:var(--ok)">${usd(cap ? held - cap.amountCents : held)} back</div></div></div>`;
  }).join("");
  return `<div class="card fade-in"><div class="card-head"><div><div class="eyebrow">Receipt</div><h3 style="margin-top:6px">Settled on PayPal</h3></div>${ic("receipt")}</div>
    <div>${lines}</div>
    ${s.payout ? `<div class="note ok" style="margin-top:12px">${ic("check")}<div><b>${usd(s.payout.amountCents)} paid out to ${esc(r.award.providerName)}</b> via PayPal Payouts (fee ${usd(s.payout.feeCents)}).<div class="small mono" style="margin-top:4px">batch ${esc(s.payout.batchId)} · ${esc(s.payout.status)}</div></div></div>` : ""}</div>`;
}

// ---------- post a job ----------
function viewNew() {
  const d = ui.draft;
  return `<div style="margin-bottom:16px"><div class="eyebrow">Post a job</div><h2 style="margin-top:6px">What needs <span class="grad">fixing?</span></h2></div>
  <div class="grid-2">
    <div class="card fade-in">
      <label class="field">Describe it in your own words<textarea class="input" id="intake" rows="4">${esc(ui.text ?? "Water heater is leaking in my garage, need it fixed by Friday, max $400, Austin 78704. Licensed plumber only.")}</textarea></label>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="parse">${ic("spark")}Let the agent fill it in</button><span class="small muted mono" id="src">${d ? (d.source === "ai" ? "parsed by claude" : "parsed by offline rules") : ""}</span></div>
      ${d ? `<div class="ai-box" style="margin-top:14px"><div class="small" style="font-weight:600;margin-bottom:8px;color:#cfc8ff">${ic("spark", "inline")} Agent extracted: edit anything</div>
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
        <label class="field">Homes / jobs<input class="input" name="units" type="number" min="1" value="${d?.units || 1}" /></label>
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
    const start = new Date(first - 3 * 3600_000); start.setMinutes(0, 0, 0);
    if (scheduler) scheduler.destroy();
    scheduler = new Scheduler({
      appendTo: el, timeZone: "America/Chicago", startDate: start, endDate: new Date(start.getTime() + 2 * 86400_000),
      viewPreset: "hourAndDay", rowHeight: 58, barMargin: 8, readOnly: true,
      columns: [{ text: "Pro", field: "name", width: innerWidth < 600 ? 120 : 190 }],
      resources: resources.length ? resources : [{ id: "none", name: "No booked jobs yet" }], events,
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Scheduler unavailable: ${esc(e.message)}</div>`;
  }
}

// ---------- trust ----------
function viewTrust() {
  const { verify, entries } = audit;
  return `<div style="margin-bottom:16px"><div class="eyebrow">Tamper-evident · SHA-256 chain</div><h2 style="margin-top:6px">Trust <span class="grad">log</span></h2>
    <p class="muted" style="margin:8px 0 0;max-width:640px">Every bid, AI check, policy decision and PayPal call. Each entry carries the hash of the one before it, so editing history breaks the chain.</p></div>
  <div class="note ${verify.ok ? "ok" : "bad"}">${ic(verify.ok ? "check" : "x")}<div><b>${verify.ok ? "Chain intact" : `Chain broken at #${verify.brokenAt}`}</b> · ${verify.length} entries verified</div></div>
  <div class="card section"><div class="timeline">${entries.slice().reverse().slice(0, 150).map((e) => {
    const kind = e.actor.split(":")[0];
    const r = requests.find((x) => x.id === e.requestId);
    return `<div class="ev ${kind}"><div class="meta"><span class="chip">${esc(kind)}</span><span>#${e.seq}</span><span>${esc(when(e.at))}</span>${r ? `<a href="#/job/${r.id}">${esc(r.title)}</a>` : ""}</div>
      <div class="what">${esc(LABEL[e.action] || e.action)}</div>
      <div class="small muted">${esc(Object.entries(e.data || {}).filter(([k]) => k !== "signal").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")).slice(0, 260)}</div>
      <div class="mono muted" style="margin-top:4px">${esc(e.hash.slice(0, 16))}… ← ${esc(e.prevHash.slice(0, 16))}…</div></div>`;
  }).join("")}</div></div>`;
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

// ---------- router ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, id] = h.split("/");
  return { name, id };
}
async function render({ animate = true } = {}) {
  ui.timers.forEach(clearInterval);
  ui.timers = [];
  const { name, id } = route();
  const view = $("#view");
  renderNav(name === "job" ? "jobs" : name);
  document.body.classList.remove("has-cta");
  $(".mobile-cta")?.remove();
  if (name === "home") { view.innerHTML = viewHome(); wireHome(); }
  else if (name === "jobs") view.innerHTML = viewJobs();
  else if (name === "job") {
    const r = requests.find((x) => x.id === id);
    view.innerHTML = viewJob(r);
    if (r) {
      wireJob(r);
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
  else if (name === "trust") view.innerHTML = viewTrust();
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
      const v = sceneMod.createVault(h, { state: h.dataset.state, agents: Number(h.dataset.agents), winner: Number(h.dataset.winner), compact: h.hasAttribute("data-vault3d") });
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
    }[b.dataset.cat];
    ui.draft = null;
    location.hash = "#/new";
  }));
}

async function runNext(r, next, btn) {
  if (next.id === "scroll") { document.getElementById(next.target)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (next.id === "hold") return startHold(r, next.buyer, btn);
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
        buyerName: f.get("buyerName") || "You", limitDollars: Number(f.get("limitDollars")), units: Number(f.get("units") || 1),
      });
      ui.draft = null;
      location.hash = `#/job/${out.request.id}`;
      toast("Request created. Approve your PayPal hold to fund it.");
    }, { rerender: false });
  });
}

// ---------- boot ----------
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
  if (qs.get("cancelled")) setTimeout(() => toast("Hold cancelled at PayPal. Nothing was reserved."), 300);
  if (qs.size) history.replaceState(null, "", "/" + location.hash);
  await load();
  await render();
}
addEventListener("hashchange", async () => { await load(); await render(); scrollTop(); });
boot().catch((e) => toast(e.message, 8000));
