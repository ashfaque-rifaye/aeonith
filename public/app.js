// Aeonith demo console. One page, all roles (buyer, provider agents, admin) so judges can follow the whole loop.
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const usd = (c) => `$${(Number(c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Service area is Austin, TX: show job times in US Central.
const when = (iso) => (iso ? `${new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} CT` : "");
const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");

let cfg = { paypalMode: "simulated" };
const state = { requests: [], selected: { solo: null, together: null } };

function toast(msg, ms = 3500) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), ms);
}

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.issues?.join("; ") || `HTTP ${res.status}`);
  return body;
}
const post = (path, data, headers) => api(path, { method: "POST", body: JSON.stringify(data ?? {}), headers });

async function act(btn, fn) {
  const label = btn?.textContent;
  try {
    if (btn) { btn.disabled = true; btn.textContent = "Working…"; }
    await fn();
  } catch (e) {
    toast(e.message, 6000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
    await refresh();
  }
}

// ---------- tabs ----------
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${b.dataset.tab}`));
    if (b.dataset.tab === "providers") renderProviders();
    if (b.dataset.tab === "audit") renderAudit();
  }),
);
function showTab(name) {
  document.querySelector(`.tabs button[data-tab="${name}"]`)?.click();
}

// ---------- load ----------
async function refresh() {
  state.requests = await api("/api/requests");
  for (const mode of ["solo", "together"]) {
    const keep = state.requests.find((r) => r.id === state.selected[mode]);
    state.selected[mode] = (keep ?? state.requests.find((r) => r.mode === mode))?.id ?? null;
  }
  renderRequestTab("solo");
  renderRequestTab("together");
}

async function boot() {
  cfg = await api("/api/public-config");
  const h = await api("/api/health");
  $("#badges").innerHTML = `
    <span class="badge ${h.paypal === "sandbox" ? "" : "warn"}">PayPal: ${h.paypal === "sandbox" ? "Sandbox (real API)" : "SIMULATED (no sandbox secret)"}</span>
    <span class="badge ${h.ai.startsWith("claude") ? "" : "warn"}">AI: ${esc(h.ai)}</span>
    <span class="badge">Audit chain: ${h.audit.ok ? "intact" : "BROKEN"}</span>`;
  const qs = new URLSearchParams(location.search);
  const rid = qs.get("r");
  await refresh();
  if (rid) {
    const r = state.requests.find((x) => x.id === rid);
    if (r) { state.selected[r.mode] = r.id; await refresh(); showTab(r.mode); }
  }
  if (qs.get("held")) toast("PayPal hold approved: funds reserved, not charged.");
  if (qs.get("cancelled")) toast("Hold cancelled at PayPal. Nothing was reserved.");
  if (qs.size) history.replaceState(null, "", "/");
}

// ---------- request view (solo + together share it) ----------
const STEPS = [
  ["Funded", (r) => r.buyers.some((b) => ["held", "captured"].includes(b.status))],
  ["Sealed bids", (r) => r.commitments.length > 0],
  ["Winner", (r) => !!r.award],
  ["Proof", (r) => !!r.proof?.submittedAt],
  ["Paid", (r) => r.status === "settled"],
];

function renderRequestTab(mode) {
  const el = $(`#tab-${mode}`);
  const list = state.requests.filter((r) => r.mode === mode);
  const r = list.find((x) => x.id === state.selected[mode]);
  if (!r) { el.innerHTML = `<div class="card"><p class="muted">No ${mode} requests yet. Create one in “New request”.</p></div>`; return; }
  const picker = list.length > 1
    ? `<label style="max-width:360px">Request <select data-pick="${mode}">${list.map((x) => `<option value="${x.id}" ${x.id === r.id ? "selected" : ""}>${esc(x.title)} · ${esc(x.status)}</option>`).join("")}</select></label>`
    : "";
  const done = STEPS.map(([, f]) => f(r));
  const nowIdx = done.indexOf(false);
  const funded = r.buyers.filter((b) => b.status === "held" || b.status === "captured");
  const fundedUnits = funded.reduce((s, b) => s + b.units, 0);

  el.innerHTML = `
    ${picker}
    <div class="card">
      <div class="hero">
        <div>
          <h2>${esc(r.title)}</h2>
          <div class="muted">${esc(r.description)}</div>
          <div class="row">
            <span class="pill">${r.mode === "solo" ? "Solo" : "Together"}</span>
            <span class="pill">${esc(r.category)}</span>
            ${r.zip ? `<span class="pill">ZIP ${esc(r.zip)}</span>` : ""}
            ${r.requirements.licensed ? `<span class="pill">Licensed pro required</span>` : ""}
            ${r.requirements.minWarrantyMonths ? `<span class="pill">≥ ${r.requirements.minWarrantyMonths}-mo warranty</span>` : ""}
            ${r.requirements.completeBy ? `<span class="pill">Start by ${esc(r.requirements.completeBy)}</span>` : ""}
            <span class="pill ${r.status === "settled" ? "ok" : r.status === "released" ? "warn" : ""}">${esc(r.status)}</span>
          </div>
        </div>
        <div class="price">
          <div class="muted">Funded</div>
          <div class="big">${fundedUnits} ${r.mode === "solo" ? "job" : "home" + (fundedUnits === 1 ? "" : "s")}</div>
          <div class="muted">${r.commitments.length} sealed bid${r.commitments.length === 1 ? "" : "s"}</div>
        </div>
      </div>
      <div class="steps">${STEPS.map(([n], i) => `<div class="step ${done[i] ? "done" : i === nowIdx ? "now" : ""}">${i + 1}. ${n}</div>`).join("")}</div>
    </div>
    ${buyersCard(r)}
    ${competitionCard(r)}
    ${awardCard(r)}
    ${proofCard(r)}
    ${settleCard(r)}
  `;
  wire(el, r);
}

function holdPill(b) {
  const cls = { held: "ok", captured: "ok", voided: "warn", failed: "bad", pending: "" }[b.status];
  const label = { held: "Held (reserved)", captured: "Charged", voided: "Released", failed: "Failed", pending: "Not yet held" }[b.status];
  return `<span class="pill ${cls}">${label}</span>`;
}

function buyersCard(r) {
  const open = ["open", "bidding"].includes(r.status);
  const rows = r.buyers.map((b) => `
    <tr>
      <td><strong>${esc(b.name)}</strong>${b.soloBestCents ? `<div class="muted">has a solo quote of ${usd(b.soloBestCents)}</div>` : ""}</td>
      <td>${b.units}</td>
      <td>${usd(b.limitCents)} <span class="muted">private</span></td>
      <td>${holdPill(b)}${b.note ? `<div class="muted">${esc(b.note)}</div>` : ""}
        ${b.authorizationId ? `<div class="hash">auth ${esc(b.authorizationId)}</div>` : ""}
        ${b.captureId ? `<div class="hash">capture ${esc(b.captureId)} · ${usd(b.capturedCents)}</div>` : ""}</td>
      <td>${b.status === "pending" && open ? `<button class="primary" data-hold="${b.id}">Hold ${usd(b.limitCents * b.units)} with PayPal</button>` : ""}
          ${b.status === "held" && open ? `<button data-cancel="${b.id}">Cancel hold</button>` : ""}</td>
    </tr>`).join("");
  const join = r.mode === "together" && open ? `
    <form class="grid" data-join>
      <label>Neighbour name <input name="name" required placeholder="Jordan" /></label>
      <label>Private limit per home ($) <input name="limitDollars" type="number" min="1" required /></label>
      <label>Solo quote you already have ($, optional) <input name="soloBestDollars" type="number" min="1" /></label>
      <div class="row" style="align-self:end"><button type="submit">Join this group</button></div>
    </form>` : "";
  return `<div class="card">
    <h3>${r.mode === "solo" ? "Your funded request" : "Neighbours in this group"}</h3>
    <p class="muted">Each person approves one PayPal hold at their own limit. Money is <strong>reserved, not charged</strong>, and is charged only after proof, at the final price, which can't be higher than the limit.</p>
    <div class="table-wrap"><table><thead><tr><th>Who</th><th>Homes</th><th>Limit</th><th>PayPal hold</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    ${join}
  </div>`;
}

function competitionCard(r) {
  const anyHeld = r.buyers.some((b) => b.status === "held");
  const canRun = ["open", "bidding"].includes(r.status) && anyHeld;
  const commits = r.commitments.map((c) => {
    const rev = r.reveals.find((v) => v.offer.providerId === c.providerId);
    return `<tr>
      <td><strong>${esc(c.providerName)}</strong><div class="muted">AI provider agent (simulated)</div></td>
      <td class="hash">${esc(c.hash)}</td>
      <td>${rev ? (rev.valid ? `<span class="pill ok">✓ matches hash</span> ${usd(rev.offer.priceCents)}${rev.offer.minUnits > 1 ? ` · min ${rev.offer.minUnits} homes` : ""}` : `<span class="pill bad">✗ ${esc(rev.rejectReason)}</span>`) : `<span class="pill">sealed 🔒</span>`}</td>
    </tr>`;
  }).join("");
  return `<div class="card">
    <h3>Sealed competition</h3>
    <p class="muted">Provider agents see only the demand signal (job, area, funded homes, deadline). Each commits a SHA-256 fingerprint of its offer. Nobody, including Aeonith, can read a bid until bidding closes.</p>
    <div class="row">
      <button class="primary" data-run ${canRun ? "" : "disabled"}>Invite provider agents to bid</button>
      <button data-close ${r.status === "bidding" && r.commitments.length ? "" : "disabled"}>Close bidding · reveal · pick winner</button>
      ${!anyHeld && ["open", "bidding"].includes(r.status) ? `<span class="muted">Approve at least one PayPal hold first: providers only bid on funded demand.</span>` : ""}
    </div>
    ${commits ? `<div class="table-wrap"><table><thead><tr><th>Provider</th><th>Commitment (SHA-256)</th><th>Reveal</th></tr></thead><tbody>${commits}</tbody></table></div>` : ""}
  </div>`;
}

function awardCard(r) {
  if (!r.award) return "";
  const a = r.award;
  const rows = a.table.map((t) => `<tr><td>${esc(t.providerName)}</td><td>${usd(t.priceCents)}</td><td>${t.minUnits}</td><td>${t.eligibleUnits}</td>
    <td><span class="pill ${t.note === "Winner" ? "ok" : t.feasible ? "" : "warn"}">${esc(t.note)}</span></td></tr>`).join("");
  const outs = a.buyersOut.map((o) => `<li>${esc(r.buyers.find((b) => b.id === o.buyerId)?.name)}: ${esc(o.reason)}</li>`).join("");
  const rev = r.aiOfferReview;
  const winner = r.reveals.find((v) => v.offer.providerId === a.providerId);
  return `<div class="card">
    <div class="hero">
      <div><h3>Winner: ${esc(a.providerName)}</h3><p>${esc(a.reason)}</p></div>
      <div class="price"><div class="muted">Final price ${r.mode === "together" ? "per home" : ""}</div><div class="big">${usd(a.priceCents)}</div><div class="muted">${usd(a.buyerSavingCents)} below limits</div></div>
    </div>
    ${winner ? `<div class="callout"><strong>Promises (binding, from the sealed offer):</strong> ${winner.offer.promises.licensed ? `licensed ${esc(winner.offer.promises.licenseNo)}` : "not licensed"}, ${winner.offer.promises.warrantyMonths}-month warranty, ${esc(when(winner.offer.promises.startAt))}.<div class="muted">Pitch (display only, never parsed): “${esc(winner.pitch)}”</div></div>` : ""}
    ${rev ? `<div class="callout ${rev.ok ? "ok" : "warn"}"><strong>AI promise check:</strong> ${esc(rev.summary)}${rev.flags.length ? `<ul>${rev.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}</div>` : ""}
    <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Offer</th><th>Price</th><th>Min homes</th><th>Can afford</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${outs ? `<div class="callout"><strong>Released, not charged:</strong><ul>${outs}</ul></div>` : ""}
  </div>`;
}

function proofCard(r) {
  if (!["awarded", "proving", "settled"].includes(r.status)) return "";
  const p = r.proof;
  const checks = p?.checks?.length ? `<div class="table-wrap"><table><thead><tr><th>Check</th><th>By</th><th>Result</th></tr></thead><tbody>${p.checks.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.by === "ai" ? "AI vision" : "Code"}</td><td><span class="pill ${c.ok === true ? "ok" : c.ok === false ? "bad" : "warn"}">${c.ok === true ? "Pass" : c.ok === false ? "Fail" : "Not verifiable"}</span> <span class="muted">${esc(c.detail)}</span></td></tr>`).join("")}</tbody></table></div>
    <div class="callout ${p.verdict === "pass" ? "ok" : p.verdict === "fail" ? "bad" : "warn"}"><strong>Verdict: ${esc(p.verdict)}</strong>. ${p.verdict === "pass" ? "Proof passed: payment can be released." : p.verdict === "fail" ? "Proof failed: money stays on hold; release or request a new proof." : "Needs the homeowner's eyes: confirm the job is done to release payment."}</div>` : "";
  return `<div class="card">
    <h3>Proof Challenge</h3>
    <p class="muted">When the job is done, the provider photographs it with this one-time code written on paper in the frame. Code checks freshness and reuse; AI vision checks the code and the work. Money moves only on proof.</p>
    ${p ? `<div class="challenge">${esc(p.code)}</div><div class="muted">Issued ${esc(when(p.issuedAt))}</div>` : `<button class="primary" data-challenge>Provider: start job & get one-time code</button>`}
    ${p && r.status === "awarded" ? `<form class="grid" data-proof>
      <label class="wide">Completion photo (with the code visible) <input type="file" name="photo" accept="image/*" capture="environment" required /></label>
      <label class="wide">Provider note <input name="note" placeholder="Replaced 40-gal unit, old one hauled away" /></label>
      <div class="row"><button class="primary" type="submit">Submit proof</button></div></form>` : ""}
    ${checks}
  </div>`;
}

function settleCard(r) {
  if (!["proving", "settled", "released"].includes(r.status)) return "";
  if (r.status === "released") return `<div class="card"><h3>Released</h3><p>Every hold was voided. Nobody was charged.</p></div>`;
  if (r.status === "proving") {
    const needConfirm = r.proof?.verdict !== "pass" && !r.buyerConfirmedAt;
    return `<div class="card"><h3>Pay the provider</h3>
      <p class="muted">The policy gate allows a capture only if proof passed or the homeowner confirmed, the amount equals the final price, and it can't exceed the hold.</p>
      <div class="row">
        ${needConfirm ? `<button class="primary" data-confirm ${r.proof?.verdict === "fail" ? "disabled" : ""}>Homeowner: confirm job done</button>` : ""}
        <button class="primary" data-settle ${needConfirm ? "disabled" : ""}>Release payment via PayPal</button>
        <button data-overcharge>Test: let an agent overcharge</button>
        <button class="danger" data-release>Admin: release all holds</button>
      </div></div>`;
  }
  const s = r.settlement;
  const rows = r.buyers.map((b) => {
    const cap = s.captures.find((c) => c.buyerId === b.id);
    const held = b.authorizedCents ?? b.limitCents * b.units;
    return `<tr><td>${esc(b.name)}</td><td>${usd(held)}</td><td>${cap ? usd(cap.amountCents) : "$0.00"}</td><td>${cap ? usd(held - cap.amountCents) : b.status === "voided" ? usd(held) : "n/a"}</td><td class="hash">${esc(cap?.captureId ?? b.note ?? "")}</td></tr>`;
  }).join("");
  const total = s.captures.reduce((t, c) => t + c.amountCents, 0);
  return `<div class="card">
    <h3>Settled on PayPal ✓</h3>
    <div class="table-wrap"><table><thead><tr><th>Who</th><th>Held</th><th>Charged</th><th>Returned to them</th><th>PayPal ref</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${s.payout ? `<div class="callout ok"><strong>Payout to ${esc(r.award.providerName)}:</strong> ${usd(s.payout.amountCents)} (charged ${usd(total)} − ${usd(s.payout.feeCents)} fee) → ${esc(s.payout.receiver)} · batch <span class="hash">${esc(s.payout.batchId)}</span> · ${esc(s.payout.status)}</div>` : ""}
  </div>`;
}

function wire(el, r) {
  el.querySelector("[data-pick]")?.addEventListener("change", (e) => { state.selected[r.mode] = e.target.value; refresh(); });
  el.querySelectorAll("[data-hold]").forEach((b) => b.addEventListener("click", () => act(b, async () => {
    const o = await post(`/api/requests/${r.id}/buyers/${b.dataset.hold}/hold`);
    location.href = o.approveUrl; // PayPal approval page (or the simulated stand-in)
  })));
  el.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => act(b, () => post(`/api/requests/${r.id}/buyers/${b.dataset.cancel}/cancel`))));
  el.querySelector("[data-join]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    act(e.submitter, () => post(`/api/requests/${r.id}/join`, {
      name: f.get("name"), limitDollars: Number(f.get("limitDollars")), units: 1,
      soloBestDollars: f.get("soloBestDollars") ? Number(f.get("soloBestDollars")) : undefined,
    }));
  });
  el.querySelector("[data-run]")?.addEventListener("click", (e) => act(e.target, async () => {
    const res = await post(`/api/requests/${r.id}/run-providers`);
    toast(`${res.length} provider agent${res.length === 1 ? "" : "s"} sealed a bid.`);
  }));
  el.querySelector("[data-close]")?.addEventListener("click", (e) => act(e.target, async () => {
    await post(`/api/requests/${r.id}/close-bidding`);
    const out = await post(`/api/requests/${r.id}/award`);
    toast(out.award ? `Winner: ${out.award.providerName} at ${usd(out.award.priceCents)}` : "No offer met the requirements. Every hold was released.");
  }));
  el.querySelector("[data-challenge]")?.addEventListener("click", (e) => act(e.target, () => post(`/api/requests/${r.id}/challenge`)));
  el.querySelector("[data-proof]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const file = f.get("photo");
    act(e.submitter, async () => {
      const b64 = await new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = bad; fr.readAsDataURL(file); });
      const p = await post(`/api/requests/${r.id}/proof`, { imageBase64: b64, note: f.get("note") || "" });
      toast(`Proof verdict: ${p.verdict}`);
    });
  });
  el.querySelector("[data-confirm]")?.addEventListener("click", (e) => act(e.target, () => post(`/api/requests/${r.id}/confirm`)));
  el.querySelector("[data-settle]")?.addEventListener("click", (e) => act(e.target, async () => {
    await post(`/api/requests/${r.id}/settle`, { as: "buyer" });
    toast("Captured on PayPal and paid out to the provider.");
  }));
  el.querySelector("[data-overcharge]")?.addEventListener("click", (e) => act(e.target, async () => {
    const res = await post(`/api/requests/${r.id}/try-overcharge`);
    toast(res.blocked ? `Blocked ✓ ${res.message}` : "Not blocked?!", 7000);
  }));
  el.querySelector("[data-release]")?.addEventListener("click", (e) => {
    const token = prompt("Admin token (ADMIN_TOKEN in .env)");
    if (token) act(e.target, () => post(`/api/requests/${r.id}/release`, {}, { "x-admin-token": token }));
  });
}

// ---------- new request ----------
$("#parse").addEventListener("click", (e) => act(e.target, async () => {
  const d = await post("/api/intake", { text: $("#intake").value });
  const f = $("#draft");
  f.classList.remove("hidden");
  for (const [k, v] of Object.entries(d)) {
    const input = f.elements.namedItem(k);
    if (!input) continue;
    if (input.type === "checkbox") input.checked = !!v; else input.value = v || (input.type === "number" ? "" : "");
  }
  if (!d.limitDollars) f.elements.namedItem("limitDollars").value = "";
  f.elements.namedItem("mode").value = d.units > 1 ? "together" : "solo";
  $("#intake-src").textContent = d.source === "ai" ? "Parsed by Claude" : "Parsed by offline rules (no API key)";
}));
$("#draft").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  act(e.submitter, async () => {
    const out = await post("/api/requests", {
      mode: f.get("mode"), title: f.get("title"), category: f.get("category"), description: f.get("description") || "", zip: f.get("zip") || "",
      licensed: f.get("licensed") === "on", minWarrantyMonths: Number(f.get("minWarrantyMonths") || 0), completeBy: f.get("completeBy") || "",
      buyerName: f.get("buyerName") || "You", limitDollars: Number(f.get("limitDollars")), units: Number(f.get("units") || 1),
    });
    state.selected[out.request.mode] = out.request.id;
    await refresh();
    showTab(out.request.mode);
    toast("Request created. Approve your PayPal hold to fund it.");
  });
});

// ---------- provider view ----------
let scheduler;
async function renderProviders() {
  const signals = await api("/protocol/v1/requests");
  $("#signals").textContent = signals.length ? JSON.stringify(signals, null, 2) : "No requests are open for bids right now. (Approve a hold, then invite provider agents.)";
  const jobs = state.requests.filter((r) => r.award);
  const resources = [...new Map(jobs.map((r) => [r.award.providerId, { id: r.award.providerId, name: r.award.providerName }])).values()];
  const events = jobs.map((r) => {
    const o = r.reveals.find((v) => v.offer.providerId === r.award.providerId)?.offer;
    return o && { id: r.id, resourceId: r.award.providerId, name: `${r.title} (${r.award.unitsServed} home${r.award.unitsServed === 1 ? "" : "s"})`, startDate: o.promises.startAt, endDate: o.promises.endAt, eventColor: r.status === "settled" ? "green" : "blue" };
  }).filter(Boolean);
  try {
    if (!document.querySelector("link[data-bryntum]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "/vendor/bryntum/svalbard-light.css"; l.dataset.bryntum = "1";
      document.head.append(l);
    }
    const { Scheduler } = await import("/vendor/bryntum/scheduler.module.js");
    const first = events.length ? Math.min(...events.map((e) => Date.parse(e.startDate))) : Date.now();
    const start = new Date(first); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 3 * 86400_000);
    if (scheduler) scheduler.destroy();
    scheduler = new Scheduler({
      appendTo: "scheduler",
      timeZone: "America/Chicago",
      startDate: start,
      endDate: end,
      viewPreset: "hourAndDay",
      rowHeight: 56,
      columns: [{ text: "Provider", field: "name", width: 200 }],
      resources: resources.length ? resources : [{ id: "none", name: "No awarded jobs yet" }],
      events,
      readOnly: true,
    });
  } catch (e) {
    $("#scheduler").innerHTML = `<p class="muted">Scheduler unavailable: ${esc(e.message)}</p>`;
  }
}

// ---------- audit ----------
async function renderAudit() {
  const { verify, entries } = await api("/api/audit");
  $("#audit-verify").innerHTML = `<div class="callout ${verify.ok ? "ok" : "bad"}"><strong>${verify.ok ? "Chain intact" : `Chain broken at #${verify.brokenAt}`}</strong> · ${verify.length} entries, each linked to the previous by SHA-256.</div>`;
  $("#audit").innerHTML = entries.slice().reverse().map((e) => `
    <div class="entry"><div class="muted">#${e.seq}</div><div class="muted">${esc(when(e.at))}</div>
    <div><strong>${esc(e.actor.split(":")[0])}</strong> · ${esc(e.action)} <span class="muted">${esc(JSON.stringify(e.data)).slice(0, 220)}</span><div class="hash">${esc(short(e.hash))} ← ${esc(short(e.prevHash))}</div></div></div>`).join("");
}

boot().catch((e) => toast(e.message, 8000));
