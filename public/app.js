// Aeonith web app. Hash router, no framework. All money logic lives on the server; this file only renders and calls the API.
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (c, dp = 2) => `$${(Number(c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const usd0 = (c) => usd(c, Number(c) % 100 ? 2 : 0);
const when = (iso, opts) => (iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...opts }) + " CT" : "");
const initials = (n) => String(n || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const PASTELS = ["var(--mint)", "var(--peach)", "var(--lilac)", "var(--sky)", "var(--rose)", "var(--butter)"];
const tint = (s) => PASTELS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PASTELS.length];

// ---------- icons (inline SVG, stroke-based) ----------
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
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
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
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.info}"/></svg>`;
const CAT = {
  plumbing: { icon: "drop", tint: "var(--sky)", label: "Plumbing" },
  electrical: { icon: "bolt", tint: "var(--butter)", label: "Electrical" },
  hvac: { icon: "fan", tint: "var(--lilac)", label: "Heating & AC" },
  gutters: { icon: "gutter", tint: "var(--mint)", label: "Gutters" },
  cleaning: { icon: "broom", tint: "var(--rose)", label: "Cleaning" },
  handyman: { icon: "wrench", tint: "var(--peach)", label: "Handyman" },
  landscaping: { icon: "leaf", tint: "var(--mint)", label: "Yard" },
  moving: { icon: "truck", tint: "var(--sky)", label: "Moving" },
  other: { icon: "wrench", tint: "var(--peach)", label: "Other" },
};
const cat = (c) => CAT[c] || CAT.other;

// ---------- state / api ----------
let health = null;
let requests = [];
const draftState = { draft: null };

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
    if (btn) { btn.disabled = true; btn.innerHTML = `<span>Working…</span>`; }
    await fn();
  } catch (e) {
    toast(e.message, 6500);
  } finally {
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = html; }
    if (rerender) { await load(); render(); }
  }
}
async function load() {
  requests = await api("/api/requests");
}

// ---------- navigation ----------
const NAV = [
  { id: "home", label: "Home", icon: "home", href: "#/home" },
  { id: "jobs", label: "My jobs", icon: "jobs", href: "#/jobs" },
  { id: "new", label: "Post a job", icon: "plus", href: "#/new", fab: true },
  { id: "pros", label: "Pros", icon: "pros", href: "#/pros" },
  { id: "trust", label: "Trust log", icon: "shield", href: "#/trust" },
];
function renderNav(active) {
  $("#side-nav").innerHTML = NAV.map((n) =>
    `<a href="${n.href}" class="${n.id === active ? "active" : ""} ${n.fab ? "cta" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
  $("#tabbar").innerHTML = NAV.map((n) => n.fab
    ? `<a href="${n.href}" class="fab" aria-label="${n.label}"><span class="fab-btn">${ic("plus")}</span></a>`
    : `<a href="${n.href}" class="${n.id === active ? "active" : ""}">${ic(n.icon)}<span>${n.label}</span></a>`).join("");
}
function envPills() {
  if (!health) return "";
  const pp = health.paypal === "sandbox";
  const ai = health.ai.startsWith("claude");
  return `<span class="chip ${pp ? "ok" : "warn"}" title="PayPal mode">${ic("lock")}${pp ? "PayPal sandbox" : "PayPal simulated"}</span>
    <span class="chip ${ai ? "ok" : "warn"}" title="${esc(health.ai)}">${ic("spark")}${ai ? "Claude on" : "AI offline"}</span>`;
}

// ---------- derived ----------
const funded = (r) => r.buyers.filter((b) => ["held", "captured"].includes(b.status));
const fundedUnits = (r) => funded(r).reduce((s, b) => s + b.units, 0);
const heldTotal = (r) => r.buyers.filter((b) => ["held", "captured"].includes(b.status)).reduce((s, b) => s + (b.authorizedCents ?? b.limitCents * b.units), 0);
const STATUS = {
  open: ["Waiting for holds", ""],
  bidding: ["Pros are bidding", "peach"],
  revealing: ["Revealing bids", "peach"],
  awarded: ["Pro booked", "teal"],
  proving: ["Checking proof", "warn"],
  settled: ["Paid on proof", "ok"],
  released: ["Released · $0 charged", "warn"],
};
const statusChip = (r) => `<span class="chip ${STATUS[r.status]?.[1] ?? ""}">${STATUS[r.status]?.[0] ?? esc(r.status)}</span>`;
const FLOW = [
  ["Funded", "lock", (r) => funded(r).length > 0],
  ["Sealed bids", "hash", (r) => r.commitments.length > 0],
  ["Winner", "check", (r) => !!r.award],
  ["Proof", "camera", (r) => !!r.proof?.submittedAt],
  ["Paid", "receipt", (r) => r.status === "settled"],
];

// ---------- views ----------
function viewHome() {
  const mine = requests.filter((r) => r.mode === "solo");
  const groups = requests.filter((r) => r.mode === "together");
  const saved = requests.filter((r) => r.status === "settled").reduce((s, r) => s + r.buyers.reduce((t, b) => t + (b.capturedCents ? (b.authorizedCents ?? 0) - b.capturedCents : 0), 0), 0);
  return `
  <div class="hello"><div><div class="eyebrow">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div><h2 style="margin-top:4px">Hi Maria 👋</h2></div>
    <div class="env-pills hide-sm">${envPills()}</div></div>
  <section class="hero">
    <h1 class="display">Fair prices.<br><em>Paid on proof.</em></h1>
    <p>Say what needs fixing and the most you'll pay. Verified pros compete with <b>sealed bids</b>, and PayPal holds your money until the job is <b>proven done</b>. No deposits to strangers.</p>
    <form class="ask" id="ask">
      ${ic("spark")}
      <input name="q" placeholder="My water heater is leaking, max $400…" aria-label="What needs doing?" autocomplete="off" />
      <button class="btn primary" type="submit">Ask agent</button>
    </form>
    <div class="trust-row">
      <span class="chip">${ic("lock")}Held, not paid</span>
      <span class="chip">${ic("hash")}Sealed bids</span>
      <span class="chip">${ic("camera")}Proof before payment</span>
      ${saved ? `<span class="chip ok">${ic("check")}${usd0(saved)} returned to buyers</span>` : ""}
    </div>
  </section>

  <section class="section">
    <div class="row-between"><h3>Popular jobs</h3></div>
    <div class="tiles">${["plumbing", "electrical", "hvac", "gutters", "cleaning", "handyman"].map((c) =>
      `<button class="tile" data-cat="${c}" style="background:${cat(c).tint}">${ic(cat(c).icon)}<div><b>${cat(c).label}</b><br><small>Sealed bids</small></div></button>`).join("")}</div>
  </section>

  <section class="section">
    <div class="row-between"><h3>Your jobs</h3><a class="small muted" href="#/jobs">See all</a></div>
    <div class="jobs">${mine.length ? mine.slice(0, 4).map(jobCard).join("") : `<div class="card empty">No jobs yet. Post one above.</div>`}</div>
  </section>

  ${groups.length ? `<section class="section">
    <div class="row-between"><h3>Together near you</h3><span class="small muted">One truck, one trip: lower price for every home</span></div>
    <div class="jobs">${groups.slice(0, 2).map(jobCard).join("")}</div>
  </section>` : ""}`;
}

function jobCard(r) {
  const c = cat(r.category);
  const fu = fundedUnits(r);
  const total = r.buyers.reduce((s, b) => s + b.units, 0);
  const price = r.award ? `<span class="money">${usd0(r.award.priceCents)}</span><span class="muted small"> ${r.mode === "together" ? "/home" : "final"}</span>` : `<span class="muted small">${r.commitments.length} sealed bid${r.commitments.length === 1 ? "" : "s"}</span>`;
  return `<a class="job" href="#/job/${r.id}">
    <div class="job-top">
      <div class="job-ic" style="background:${c.tint}">${ic(c.icon)}</div>
      <div style="flex:1;min-width:0"><h3>${esc(r.title)}</h3><div class="small muted">${c.label}${r.zip ? ` · ${esc(r.zip)}` : ""} · ${r.mode === "together" ? `${total} homes` : "Solo"}</div></div>
    </div>
    ${r.mode === "together" ? `<div><div class="row-between small"><span><b>${fu}</b> of ${total} homes funded</span><span class="faces">${r.buyers.slice(0, 5).map((b) => `<span class="face" style="background:${tint(b.name)}">${esc(initials(b.name))}</span>`).join("")}</span></div><div class="bar" style="margin-top:8px"><i style="width:${total ? (fu / total) * 100 : 0}%"></i></div></div>` : ""}
    <div class="row-between">${statusChip(r)}<div>${price}</div></div>
  </a>`;
}

function viewJobs() {
  return `<div class="row-between" style="margin-bottom:14px"><h2>My jobs</h2><a class="btn primary" href="#/new">${ic("plus")}Post a job</a></div>
    <div class="jobs">${requests.length ? requests.map(jobCard).join("") : `<div class="card empty">No jobs yet.</div>`}</div>`;
}

// ---------- job detail ----------
function viewJob(r) {
  if (!r) return `<a class="back" href="#/home">${ic("back")}Home</a><div class="card empty">Job not found.</div>`;
  const c = cat(r.category);
  const done = FLOW.map(([, , f]) => f(r));
  const nowIdx = done.indexOf(false);
  const req = r.requirements;
  return `
  <a class="back" href="#/jobs">${ic("back")}My jobs</a>
  <div class="detail">
    <div class="col">
      <div class="card">
        <div class="job-title">
          <div class="job-ic" style="background:${c.tint}">${ic(c.icon)}</div>
          <div style="min-width:0;flex:1"><div class="row" style="gap:8px">${statusChip(r)}<span class="chip">${r.mode === "together" ? `${ic("users")}Together` : "Solo"}</span></div>
            <h1 style="margin-top:8px">${esc(r.title)}</h1>
            <p class="muted" style="margin:6px 0 0">${esc(r.description)}</p></div>
        </div>
        <div class="chips" style="margin-top:12px">
          <span class="chip">${ic(c.icon)}${c.label}</span>
          ${r.zip ? `<span class="chip">${ic("pin")}${esc(r.zip)}</span>` : ""}
          ${req.licensed ? `<span class="chip">${ic("shield")}Licensed pro only</span>` : ""}
          ${req.minWarrantyMonths ? `<span class="chip">${ic("check")}${req.minWarrantyMonths}-month warranty</span>` : ""}
          ${req.completeBy ? `<span class="chip">${ic("clock")}Start by ${esc(new Date(req.completeBy + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</span>` : ""}
        </div>
        <div class="flow" aria-label="Progress">${FLOW.map(([n, i], k) => `<div class="s ${done[k] ? "done" : k === nowIdx ? "now" : ""}"><span class="n">${done[k] ? ic("check") : ic(i)}</span>${n}</div>`).join("")}</div>
      </div>
      <div class="mc-mobile">${moneyCard(r)}</div>
      ${peopleCard(r)}
      ${bidsCard(r)}
      ${winnerCard(r)}
      ${proofCard(r)}
      ${receiptCard(r)}
    </div>
    <aside class="rail">${moneyCard(r)}</aside>
  </div>`;
}

/** The single next action for this job, shown in the money card and as a sticky CTA on mobile. */
function nextAction(r) {
  const pending = r.buyers.find((b) => b.status === "pending");
  const anyHeld = r.buyers.some((b) => b.status === "held");
  if (["open", "bidding"].includes(r.status) && r.mode === "solo" && pending) return { id: "hold", label: `Hold ${usd0(pending.limitCents * pending.units)} with PayPal`, buyer: pending.id };
  if (["open", "bidding"].includes(r.status) && anyHeld && r.commitments.length === 0) return { id: "run", label: "Invite pros to bid" };
  if (r.status === "bidding" && r.commitments.length) return { id: "close", label: "Reveal sealed bids" };
  if (["open", "bidding"].includes(r.status) && r.mode === "together" && pending) return { id: "scroll", target: "people", label: "Neighbours: approve holds" };
  if (r.status === "awarded" && !r.proof) return { id: "challenge", label: "Pro: start job · get code" };
  if (r.status === "awarded" && r.proof) return { id: "scroll", target: "proof", label: "Pro: upload proof photo" };
  if (r.status === "proving" && r.proof?.verdict !== "pass" && !r.buyerConfirmedAt && r.proof?.verdict !== "fail") return { id: "confirm", label: "Confirm the job is done" };
  if (r.status === "proving" && (r.proof?.verdict === "pass" || r.buyerConfirmedAt)) return { id: "settle", label: "Release payment" };
  return null;
}

function moneyCard(r) {
  const mine = r.mode === "solo" ? r.buyers[0] : null;
  const held = r.mode === "solo" ? (mine?.authorizedCents ?? mine?.limitCents * (mine?.units || 1)) : heldTotal(r);
  const charged = r.buyers.reduce((s, b) => s + (b.capturedCents || 0), 0);
  const isHeld = r.buyers.some((b) => b.status === "held");
  const proven = r.status === "proving" && (r.proof?.verdict === "pass" || !!r.buyerConfirmedAt);
  const stage = r.status === "settled" ? 3 : proven ? 2 : isHeld || r.status === "proving" ? 1 : 0;
  const t = (k, label, icon) => `<div class="t ${stage > k ? "done" : stage === k ? "now" : ""}"><span class="dot">${stage > k ? ic("check") : ic(icon)}</span>${label}</div>`;
  const next = nextAction(r);
  let headline, amount, sub;
  if (r.status === "settled") { headline = "Paid on proof"; amount = usd(charged); sub = `charged · ${usd(held - charged)} returned to ${r.mode === "solo" ? "you" : "neighbours"}`; }
  else if (r.status === "released") { headline = "Released"; amount = "$0.00"; sub = "Every hold voided. Nobody was charged."; }
  else if (isHeld) { headline = r.mode === "solo" ? "Your money is held" : "Held across the street"; amount = usd(held); sub = r.award ? `Final price ${usd(r.award.priceCents)}${r.mode === "together" ? "/home" : ""}: you'll never pay more than you held` : "Reserved in PayPal, not paid to anyone"; }
  else { headline = r.mode === "solo" ? "Your private limit" : "Group limits"; amount = usd(r.mode === "solo" ? (mine?.limitCents ?? 0) * (mine?.units || 1) : r.buyers.reduce((s, b) => s + b.limitCents * b.units, 0)); sub = "Pros never see this number"; }
  const lines = [];
  if (r.award) lines.push(["Winning bid", `${usd(r.award.priceCents)}${r.mode === "together" ? " × " + r.award.unitsServed : ""}`]);
  if (r.settlement?.payout) lines.push(["Paid to pro", usd(r.settlement.payout.amountCents)], ["Platform fee", usd(r.settlement.payout.feeCents)]);
  if (r.award && r.status !== "settled") lines.push([r.mode === "solo" ? "You keep" : "Returned at capture", usd(r.buyers.filter((b) => r.award.buyersIn.includes(b.id)).reduce((s, b) => s + (b.authorizedCents ?? 0) - r.award.priceCents * b.units, 0))]);
  return `<div class="moneycard">
    <div class="eyebrow">${esc(headline)}</div>
    <div class="amount money">${amount}</div>
    <div class="sub">${esc(sub)}</div>
    <span class="badge">${ic(r.status === "settled" ? "check" : "lock")}${r.status === "settled" ? "Released on proof" : r.status === "released" ? "Nothing charged" : "Held, not paid"}</span>
    <div class="track">${t(0, "You hold", "lock")}${t(1, "Work proven", "camera")}${t(2, "Pro paid", "receipt")}</div>
    ${lines.length ? `<div class="lines">${lines.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div>` : ""}
    ${next ? `<button class="btn primary block" data-next>${esc(next.label)}</button>` : ""}
    ${r.status === "proving" ? `<button class="btn ghostlight block" data-overcharge>Test: let an agent overcharge</button>` : ""}
    <div class="hint">${health?.paypal === "sandbox" ? "PayPal sandbox · real API calls" : "Simulated PayPal: add sandbox keys for real calls"}</div>
  </div>`;
}

function peopleCard(r) {
  const open = ["open", "bidding"].includes(r.status);
  const rows = r.buyers.map((b) => {
    const st = { held: ["ok", "Held"], captured: ["ok", `Paid ${usd(b.capturedCents)}`], voided: ["warn", "Released · $0"], failed: ["bad", "Failed"], pending: ["", "Not held yet"] }[b.status];
    return `<div class="person">
      <span class="avatar" style="background:${tint(b.name)}">${esc(initials(b.name))}</span>
      <div class="who"><b>${esc(b.name)}</b><small>Limit ${usd0(b.limitCents)} · private${b.soloBestCents ? ` · solo quote ${usd0(b.soloBestCents)}` : ""}</small>${b.note ? `<small>${esc(b.note)}</small>` : ""}</div>
      <div class="act"><span class="chip ${st[0]}">${st[1]}</span>
        ${b.status === "pending" && open ? `<button class="btn primary" data-hold="${b.id}">${ic("lock")}Hold ${usd0(b.limitCents * b.units)}</button>` : ""}
        ${b.status === "held" && open ? `<button class="btn ghost" data-cancel="${b.id}">Cancel hold</button>` : ""}</div>
    </div>`;
  }).join("");
  const join = r.mode === "together" && open ? `
    <form class="form-grid" data-join style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
      <label class="field">Neighbour name<input class="input" name="name" required placeholder="Jordan" /></label>
      <label class="field">Private limit per home ($)<input class="input" name="limitDollars" type="number" min="1" inputmode="decimal" required /></label>
      <label class="field">Solo quote you already have ($, optional)<input class="input" name="soloBestDollars" type="number" min="1" inputmode="decimal" /></label>
      <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${ic("plus")}Join this group</button></div>
    </form>` : "";
  return `<div class="card" id="people">
    <div class="card-head"><div><h3>${r.mode === "solo" ? "Your hold" : "Neighbours"}</h3><div class="small muted">${r.mode === "solo" ? "One PayPal approval. Charged only on proof, at the final price." : "Each home approves its own hold. Anyone whose limit is below the final price is released, never charged."}</div></div>
      ${r.mode === "together" ? `<span class="chip">${fundedUnits(r)}/${r.buyers.length} funded</span>` : ""}</div>
    <div class="people">${rows}</div>${join}
  </div>`;
}

function bidsCard(r) {
  if (!r.commitments.length) {
    const can = ["open", "bidding"].includes(r.status) && r.buyers.some((b) => b.status === "held");
    return `<div class="card"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted">Pros' AI agents see the job, area and funded homes. Never your limit.</div></div></div>
      <div class="note">${ic("info")}<div>${can ? "Your request is funded. Invite pros to submit sealed bids." : "Approve a PayPal hold first: pros only bid on funded jobs."}</div></div></div>`;
  }
  const items = r.commitments.map((c) => {
    const rev = r.reveals.find((v) => v.offer.providerId === c.providerId);
    const row = r.award?.table.find((t) => t.providerId === c.providerId);
    const win = r.award?.providerId === c.providerId;
    const o = rev?.offer;
    return `<div class="bid ${win ? "win" : r.award ? "out" : ""}">
      ${win ? `<span class="ribbon">WINNER</span>` : ""}
      <div class="head"><span class="avatar" style="background:${tint(c.providerName)}">${esc(initials(c.providerName))}</span>
        <div style="min-width:0"><b>${esc(c.providerName)}</b><div class="small muted">AI agent · simulated</div></div></div>
      ${!rev ? `<div class="sealed">${ic("lock")}<div style="min-width:0"><b class="small">Sealed</b><div class="mono muted">${esc(c.hash.slice(0, 24))}…</div></div></div>`
        : `<div><span class="price money">${usd0(o.priceCents)}</span><span class="muted small">${o.minUnits > 1 ? ` /home · min ${o.minUnits}` : ""}</span></div>
           <div class="chips">${o.promises.licensed ? `<span class="chip ok">${ic("shield")}${esc(o.promises.licenseNo)}</span>` : `<span class="chip bad">${ic("x")}Unlicensed</span>`}
             <span class="chip">${o.promises.warrantyMonths}-mo warranty</span><span class="chip">${ic("clock")}${esc(when(o.promises.startAt, { minute: undefined }))}</span></div>
           <div class="small ${rev.valid ? "" : "muted"}">${rev.valid ? `<span class="chip ok">${ic("check")}Matches sealed hash</span>` : `<span class="chip bad">${esc(rev.rejectReason)}</span>`}</div>
           ${row && !win ? `<div class="why">${esc(row.note)}</div>` : ""}`}
    </div>`;
  }).join("");
  return `<div class="card"><div class="card-head"><div><h3>Sealed bids</h3><div class="small muted">Each pro committed a SHA-256 fingerprint. Nobody, including us, can read a bid until bidding closes.</div></div><span class="chip">${r.commitments.length} bids</span></div>
    <div class="bids">${items}</div></div>`;
}

function winnerCard(r) {
  if (!r.award) return "";
  const a = r.award;
  const w = r.reveals.find((v) => v.offer.providerId === a.providerId);
  const rev = r.aiOfferReview;
  const outs = a.buyersOut.map((o) => `<li><b>${esc(r.buyers.find((b) => b.id === o.buyerId)?.name)}</b>: ${esc(o.reason)}</li>`).join("");
  return `<div class="card">
    <div class="card-head"><div><div class="eyebrow">Why this pro won</div><h3 style="margin-top:4px">${esc(a.providerName)}</h3></div><span class="money" style="font-size:26px">${usd0(a.priceCents)}</span></div>
    <p style="margin:0 0 10px">${esc(a.reason)}</p>
    ${w ? `<div class="note">${ic("info")}<div><b>Binding promises</b> (from the sealed offer): ${w.offer.promises.licensed ? `licensed ${esc(w.offer.promises.licenseNo)}` : "not licensed"}, ${w.offer.promises.warrantyMonths}-month warranty, starts ${esc(when(w.offer.promises.startAt))}.<div class="small muted" style="margin-top:4px">Pitch (display only, never parsed): “${esc(w.pitch)}”</div></div></div>` : ""}
    ${rev ? `<div class="note ${rev.ok ? "ok" : "warn"}" style="margin-top:10px">${ic("spark")}<div><b>AI promise check:</b> ${esc(rev.summary)}${rev.flags.length ? `<ul>${rev.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}</div></div>` : ""}
    ${outs ? `<div class="note warn" style="margin-top:10px">${ic("hand")}<div><b>Released, never charged</b><ul>${outs}</ul></div></div>` : ""}
  </div>`;
}

function proofCard(r) {
  if (!["awarded", "proving", "settled"].includes(r.status)) return "";
  const p = r.proof;
  const checks = p?.checks?.length ? `<div class="checks" style="margin-top:14px">${p.checks.map((c) => {
    const k = c.ok === true ? "ok" : c.ok === false ? "bad" : "na";
    return `<div class="check ${k}"><span class="ci">${ic(k === "ok" ? "check" : k === "bad" ? "x" : "q")}</span><div><b class="small">${esc(c.name)}</b><small>${esc(c.detail)}</small></div><span class="chip">${c.by === "ai" ? "AI vision" : "Code"}</span></div>`;
  }).join("")}</div>
  <div class="note ${p.verdict === "pass" ? "ok" : p.verdict === "fail" ? "bad" : "warn"}" style="margin-top:10px">${ic(p.verdict === "pass" ? "check" : p.verdict === "fail" ? "x" : "info")}<div><b>Verdict: ${esc(p.verdict)}</b>. ${p.verdict === "pass" ? "Proof passed. Payment can be released." : p.verdict === "fail" ? "Proof failed. Money stays on hold; it can be released back to you." : "Needs your eyes: check the photo and confirm the job is done."}</div></div>` : "";
  return `<div class="card" id="proof">
    <div class="card-head"><div><h3>Proof of completion</h3><div class="small muted">The pro photographs the finished job with this one-time code written on paper in the frame.</div></div></div>
    ${p ? `<div class="ticket"><div class="code">${esc(p.code)}</div><div class="small"><b>Code issued ${esc(when(p.issuedAt))}</b><br>Code checks reject reused or stale photos. AI vision reads the code and checks the work matches the job.</div></div>`
      : `<div class="note">${ic("camera")}<div>When the pro starts the job, they get a one-time code. Money only moves after the photo proof.</div></div>`}
    ${p && r.status === "awarded" ? `<form data-proof class="stack" style="margin-top:14px">
      <label class="upload" id="drop">${ic("upload")}<b>Upload the completion photo</b><span class="small muted">Code ${esc(p.code)} must be visible</span><input type="file" name="photo" accept="image/*" capture="environment" required /></label>
      <label class="field">Note from the pro<input class="input" name="note" placeholder="Replaced 40-gal unit, old one hauled away" /></label>
      <button class="btn dark" type="submit">${ic("camera")}Submit proof</button></form>` : ""}
    ${checks}
  </div>`;
}

function receiptCard(r) {
  if (r.status === "released") return `<div class="card"><h3>Released</h3><p class="muted" style="margin:6px 0 0">Every hold was voided. Nobody was charged.</p></div>`;
  if (r.status !== "settled" || !r.settlement) {
    if (r.status === "proving") return `<div class="card"><div class="row-between"><div><h3>Admin</h3><div class="small muted">Release all holds if something went wrong.</div></div><button class="btn danger" data-release>Release all holds</button></div></div>`;
    return "";
  }
  const s = r.settlement;
  const lines = r.buyers.map((b) => {
    const cap = s.captures.find((c) => c.buyerId === b.id);
    const held = b.authorizedCents ?? b.limitCents * b.units;
    return `<div class="rline"><div><b>${esc(b.name)}</b><div class="small muted">held ${usd(held)}${cap ? ` · <span class="mono">${esc(cap.captureId)}</span>` : ` · ${esc(b.note || "released")}`}</div></div>
      <div class="r"><b class="money">${cap ? usd(cap.amountCents) : "$0.00"}</b><div class="small" style="color:var(--ok)">${usd(cap ? held - cap.amountCents : held)} back</div></div></div>`;
  }).join("");
  return `<div class="card"><div class="card-head"><div><div class="eyebrow">Receipt</div><h3 style="margin-top:4px">Settled on PayPal</h3></div>${ic("receipt")}</div>
    <div class="receipt">${lines}</div>
    ${s.payout ? `<div class="note ok" style="margin-top:12px">${ic("check")}<div><b>${usd(s.payout.amountCents)} paid out to ${esc(r.award.providerName)}</b> via PayPal Payouts (fee ${usd(s.payout.feeCents)}).<div class="small mono" style="margin-top:4px">batch ${esc(s.payout.batchId)} · ${esc(s.payout.status)}</div></div></div>` : ""}</div>`;
}

// ---------- post a job ----------
function viewNew() {
  const d = draftState.draft;
  return `<div class="row-between" style="margin-bottom:14px"><div><div class="eyebrow">Post a job</div><h2 style="margin-top:4px">What needs <span class="accent">fixing?</span></h2></div></div>
  <div class="grid-2">
    <div class="card">
      <label class="field">Describe it in your own words<textarea class="input" id="intake" rows="4">${esc(draftState.text ?? "Water heater is leaking in my garage, need it fixed by Friday, max $400, Austin 78704. Licensed plumber only.")}</textarea></label>
      <div class="row" style="margin-top:12px"><button class="btn dark" id="parse">${ic("spark")}Let the agent fill it in</button><span class="small muted" id="src">${d ? (d.source === "ai" ? "Parsed by Claude" : "Parsed by offline rules (no AI key)") : ""}</span></div>
      ${d ? `<div class="ai-box" style="margin-top:14px"><div class="small" style="font-weight:800;margin-bottom:8px">${ic("spark", "inline")} AI suggested: edit anything below</div>
        <div class="chips"><span class="chip">${cat(d.category).label}</span>${d.limitDollars ? `<span class="chip">Max ${usd0(d.limitDollars * 100)}</span>` : `<span class="chip warn">No limit found</span>`}${d.licensed ? `<span class="chip">Licensed</span>` : ""}${d.completeBy ? `<span class="chip">By ${esc(d.completeBy)}</span>` : ""}${d.zip ? `<span class="chip">${esc(d.zip)}</span>` : ""}${d.units > 1 ? `<span class="chip">${d.units} homes</span>` : ""}</div></div>` : ""}
    </div>
    <form class="card ${d ? "" : "hidden"}" id="draft">
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
      <div class="note" style="margin-top:14px">${ic("lock")}<div>Next you'll approve a <b>PayPal hold</b> for this amount. It's reserved, not paid, and you're only charged the winning price after proof.</div></div>
      <button class="btn primary block" type="submit" style="margin-top:14px">Review & create request</button>
    </form>
  </div>`;
}

// ---------- pros ----------
let scheduler;
function viewPros(signals) {
  return `<div style="margin-bottom:14px"><div class="eyebrow">Offer Protocol · HTTP + MCP</div><h2 style="margin-top:4px">What pros' agents <span class="accent">see</span></h2>
    <p class="muted" style="margin:6px 0 0;max-width:640px">This is everything a provider agent receives. There's no field that could carry a buyer's limit, by design and by test.</p></div>
  <div class="nolimit">${ic("shield")}Buyer price limits: never sent to providers</div>
  <div class="section stack">${signals.length ? signals.map((s) => `<div class="card signal">
      <div class="row-between"><div class="row"><span class="job-ic" style="background:${cat(s.category).tint}">${ic(cat(s.category).icon)}</span><div><b>${esc(s.title)}</b><div class="small muted">${esc(s.description)}</div></div></div>${statusChip({ status: s.status })}</div>
      <div class="kv"><div><small>Funded homes</small><b>${s.fundedUnits}</b></div><div><small>Mode</small><b>${s.mode === "solo" ? "Solo" : "Together"}</b></div><div><small>Area</small><b>${esc(s.zip || "n/a")}</b></div><div><small>Closes</small><b>${esc(when(s.closesAt, { weekday: undefined, minute: undefined }))}</b></div></div>
      <div class="chips">${s.requirements.licensed ? `<span class="chip">Licence required</span>` : ""}${s.requirements.minWarrantyMonths ? `<span class="chip">≥${s.requirements.minWarrantyMonths}-mo warranty</span>` : ""}${s.requirements.completeBy ? `<span class="chip">Start by ${esc(s.requirements.completeBy)}</span>` : ""}</div>
    </div>`).join("") : `<div class="card empty">No jobs are open for bids right now. Fund a job, then invite pros.</div>`}</div>
  <div class="section card"><div class="card-head"><div><h3>Booked jobs</h3><div class="small muted">Winning pros' slots (Bryntum Scheduler, US Central time)</div></div></div><div id="scheduler"></div></div>
  <div class="section card"><h3>Bring your own agent</h3><p class="small muted" style="margin:6px 0 10px">Any MCP-capable agent can discover funded jobs and submit sealed bids:</p>
    <div class="mono" style="background:var(--cream);padding:12px;border-radius:12px">AEONITH_URL=… PROVIDER_ID=acme PROVIDER_NAME="Acme Plumbing" npm run mcp</div>
    <div class="chips" style="margin-top:10px"><span class="chip">list_open_requests</span><span class="chip">submit_sealed_bid</span><span class="chip">reveal_bid</span><span class="chip">get_result</span></div></div>`;
}
async function mountScheduler() {
  const el = $("#scheduler");
  if (!el) return;
  const jobs = requests.filter((r) => r.award);
  const resources = [...new Map(jobs.map((r) => [r.award.providerId, { id: r.award.providerId, name: r.award.providerName }])).values()];
  const events = jobs.map((r) => {
    const o = r.reveals.find((v) => v.offer.providerId === r.award.providerId)?.offer;
    return o && { id: r.id, resourceId: r.award.providerId, name: `${r.title}`, startDate: o.promises.startAt, endDate: o.promises.endAt, eventColor: r.status === "settled" ? "green" : "teal" };
  }).filter(Boolean);
  try {
    if (!document.querySelector("link[data-bryntum]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = matchMedia("(prefers-color-scheme: dark)").matches ? "/vendor/bryntum/svalbard-dark.css" : "/vendor/bryntum/svalbard-light.css"; l.dataset.bryntum = "1";
      document.head.append(l);
    }
    const { Scheduler } = await import("/vendor/bryntum/scheduler.module.js");
    const first = events.length ? Math.min(...events.map((e) => Date.parse(e.startDate))) : Date.now();
    const start = new Date(first - 3 * 3600_000); start.setMinutes(0, 0, 0);
    if (scheduler) scheduler.destroy();
    scheduler = new Scheduler({
      appendTo: el,
      timeZone: "America/Chicago",
      startDate: start,
      endDate: new Date(start.getTime() + 2 * 86400_000),
      viewPreset: "hourAndDay",
      rowHeight: 58,
      barMargin: 8,
      columns: [{ text: "Pro", field: "name", width: innerWidth < 600 ? 120 : 190 }],
      resources: resources.length ? resources : [{ id: "none", name: "No booked jobs yet" }],
      events,
      readOnly: true,
    });
  } catch (e) {
    el.innerHTML = `<div class="empty">Scheduler unavailable: ${esc(e.message)}</div>`;
  }
}

// ---------- trust log ----------
function viewTrust(audit) {
  const { verify, entries } = audit;
  const label = (e) => ({
    "request.created": "Request created", "request.joined": "Neighbour joined", "order.created": "PayPal order created (AUTHORIZE)", "hold.authorized": "PayPal hold placed",
    "bidding.opened": "Bidding opened", "bid.committed": "Sealed bid committed", "bidding.closed": "Bidding closed", "bid.revealed": "Bid revealed & verified", "bid.reveal_rejected": "Bid reveal REJECTED",
    "award.made": "Winner chosen (deterministic)", "award.none": "No feasible offer", "offer.reviewed": "AI promise check", "proof.challenge_issued": "Proof code issued", "proof.submitted": "Proof submitted",
    "job.confirmed": "Homeowner confirmed", "hold.captured": "PayPal capture", "hold.voided": "PayPal hold released", "hold.reauthorized": "PayPal hold renewed", "payout.created": "PayPal payout to pro",
    "settlement.approved": "Settlement approved", "request.released": "All holds released", blocked: "Policy gate BLOCKED", webhook: "PayPal webhook",
  })[e.action] || e.action;
  return `<div style="margin-bottom:14px"><div class="eyebrow">Tamper-evident</div><h2 style="margin-top:4px">Trust <span class="accent">log</span></h2>
    <p class="muted" style="margin:6px 0 0;max-width:640px">Every bid, AI check, policy decision and PayPal call. Each entry carries the SHA-256 of the one before it, so editing history breaks the chain.</p></div>
  <div class="note ${verify.ok ? "ok" : "bad"}">${ic(verify.ok ? "check" : "x")}<div><b>${verify.ok ? "Chain intact" : `Chain broken at #${verify.brokenAt}`}</b> · ${verify.length} entries verified</div></div>
  <div class="card section"><div class="timeline">${entries.slice().reverse().slice(0, 120).map((e) => {
    const kind = e.actor.split(":")[0];
    const r = requests.find((x) => x.id === e.requestId);
    return `<div class="ev ${kind}"><div class="meta"><span class="chip">${esc(kind)}</span><span>#${e.seq}</span><span>${esc(when(e.at))}</span>${r ? `<a href="#/job/${r.id}">${esc(r.title)}</a>` : ""}</div>
      <div class="what">${esc(label(e))}</div>
      <div class="small muted">${esc(Object.entries(e.data || {}).filter(([k]) => k !== "signal").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")).slice(0, 260)}</div>
      <div class="mono muted" style="margin-top:4px">${esc(e.hash.slice(0, 16))}… ← ${esc(e.prevHash.slice(0, 16))}…</div></div>`;
  }).join("")}</div></div>`;
}

// ---------- router ----------
function route() {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, id] = h.split("/");
  return { name, id };
}
async function render() {
  const { name, id } = route();
  const view = $("#view");
  const navId = name === "job" ? "jobs" : name;
  renderNav(navId);
  document.body.classList.remove("has-cta");
  $(".mobile-cta")?.remove();
  if (name === "home") view.innerHTML = viewHome();
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
        bar.innerHTML = `<button class="btn primary" data-next>${esc(next.label)}</button>`;
        document.body.append(bar);
        document.body.classList.add("has-cta");
        bar.querySelector("[data-next]").addEventListener("click", (e) => runNext(r, next, e.currentTarget));
      }
    }
  } else if (name === "new") { view.innerHTML = viewNew(); wireNew(); }
  else if (name === "pros") { view.innerHTML = `<div class="skeleton"></div>`; const s = await api("/protocol/v1/requests"); view.innerHTML = viewPros(s); mountScheduler(); }
  else if (name === "trust") { view.innerHTML = `<div class="skeleton"></div>`; view.innerHTML = viewTrust(await api("/api/audit")); }
  else location.hash = "#/home";
  if (name === "home") wireHome();
}

function wireHome() {
  $("#ask")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get("q");
    draftState.text = q || undefined;
    draftState.draft = null;
    location.hash = "#/new";
    if (q) setTimeout(() => $("#parse")?.click(), 50);
  });
  document.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    const c = b.dataset.cat;
    draftState.text = { plumbing: "Kitchen sink is leaking under the cabinet, need it fixed this week, max $250. Licensed plumber.", electrical: "Two outlets in the living room stopped working, max $200, licensed electrician.", hvac: "Furnace makes a loud noise and won't stay on, max $300, licensed.", gutters: "Gutter cleaning for 5 homes on our street before winter, max $130 each.", cleaning: "Deep clean of a 2-bed apartment this Saturday, max $220.", handyman: "Mount a TV and fix a sticking door, max $180." }[c];
    draftState.draft = null;
    location.hash = "#/new";
  }));
}

async function runNext(r, next, btn) {
  if (next.id === "scroll") { document.getElementById(next.target)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (next.id === "hold") return startHold(r, next.buyer, btn);
  const map = {
    run: async () => { const res = await post(`/api/requests/${r.id}/run-providers`); toast(`${res.length} pros sealed a bid`); },
    close: async () => { await post(`/api/requests/${r.id}/close-bidding`); const out = await post(`/api/requests/${r.id}/award`); toast(out.award ? `${out.award.providerName} wins at ${usd(out.award.priceCents)}` : "No bid met your terms. Every hold was released."); },
    challenge: () => post(`/api/requests/${r.id}/challenge`),
    confirm: async () => { await post(`/api/requests/${r.id}/confirm`); toast("Confirmed. You can release the payment now."); },
    settle: async () => { await post(`/api/requests/${r.id}/settle`, { as: "buyer" }); toast("Paid on proof: captured on PayPal and paid out to the pro."); },
  };
  await act(btn, map[next.id]);
}
function startHold(r, bid, btn) {
  return act(btn, async () => {
    const o = await post(`/api/requests/${r.id}/buyers/${bid}/hold`);
    location.href = o.approveUrl;
  }, { rerender: false });
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
  v.querySelector("[data-overcharge]")?.addEventListener("click", (e) => act(e.currentTarget, async () => {
    const res = await post(`/api/requests/${r.id}/try-overcharge`);
    toast(res.blocked ? `Blocked ✓ ${res.message}` : "Not blocked?!", 7000);
  }));
  v.querySelector("[data-release]")?.addEventListener("click", (e) => {
    const token = prompt("Admin token (ADMIN_TOKEN in .env)");
    if (token) act(e.currentTarget, () => post(`/api/requests/${r.id}/release`, {}, { "x-admin-token": token }));
  });
}

function wireNew() {
  $("#parse")?.addEventListener("click", (e) => {
    draftState.text = $("#intake").value;
    act(e.currentTarget, async () => { draftState.draft = await post("/api/intake", { text: draftState.text }); }, { rerender: false }).then(() => render());
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
      draftState.draft = null;
      location.hash = `#/job/${out.request.id}`;
      toast("Request created. Approve your PayPal hold to fund it.");
    }, { rerender: false });
  });
}

// ---------- boot ----------
async function boot() {
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
addEventListener("hashchange", async () => { await load(); await render(); scrollTo({ top: 0 }); });
boot().catch((e) => toast(e.message, 8000));
