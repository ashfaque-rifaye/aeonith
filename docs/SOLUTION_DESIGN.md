# Aeonith: Hardened Solution Design (v3)

*2026-11-06 · Source of truth for what we build. Background: [DEEP_ANALYSIS.md](DEEP_ANALYSIS.md) (prior art, PayPal fit, US/EU checks) and [CONCEPT_BRIEF.md](CONCEPT_BRIEF.md) (research). Market: **US first, EU second**.*

---

## 0. v3.1 refinements (from the playbook analysis, 2026-11-06)

**What the playbook shows:**
- Recent payment-hackathon winners share one thread: *"the AI decides whether money should move, and code enforces it."* Examples: Polygraph (verify, then pay), AgentHandshake (policy gate before money moves), Lockpay (escrow released on proof).
- The crowded areas to avoid are dispute copilots, agent mandates and spend limits, generic "AI buys for you" agents, vendor bank-change fraud and truck detention invoicing.
- The six winning patterns: proof before action; code enforces, AI advises; an insider/niche domain; a real moment plus a number; honest limits; a 30-second aha.

**How Aeonith uses every pattern, and goes one step further than each winner:**

| Winning pattern | Typical winner does… | Aeonith does… |
|---|---|---|
| Proof before action | Verifies **one** seller's claims (Polygraph, ProofLock idea) | **Proof Challenge:** the provider must photograph the finished job with a **one-time code** written in frame. Code checks image freshness and that the photo isn't reused; AI vision checks the code and the work against the promises. Only then does capture happen. |
| Code enforces, AI advises | One policy gate on refunds (AgentHandshake) | A policy gate on **every** PayPal call, and sealed bids that **even we can't open early** (commit–reveal) |
| Escrow on proof | Holds one payment for one creator (Lockpay) | Holds before **competition**: providers bid only for demand that's already funded, then get paid on proof |
| Insider / niche domain | — | **US home repair and service jobs.** California law caps contractor deposits at **$1,000 or 10%, whichever is less** ([CSLB bulletin](https://www.cslb.ca.gov/Resources/IndustryBulletins/2022/Industry_Bulletin_Progress_Payment_Restrictions.pdf), [Cal. B&P §7159](https://law.justia.com/codes/california/2016/code-bpc/division-3/chapter-9/article-10/section-7159/)), yet unreturned deposits are a top complaint. With Aeonith **no deposit goes to anyone**: the money stays in the homeowner's own PayPal hold until proof. A state-rules table drives the copy and limits. |
| Real moment + a number | — | Tennessee's AG says home repair was the **#1 consumer complaint of 2025, at a record high** ([NewsTalk 98.7](https://newstalk987.com/?p=1104138)). The FTC logged **81,925 home-improvement fraud reports in 2024** ([FinanceBuzz](https://financebuzz.com/contractor-scams)). Wisconsin lists "failure to return deposits" among the top issues ([WWIS](https://wwisradio.com/wisconsin-consumers-top-complaints-of-2025)). |
| Honest limits | "Sandbox only" | The README and video state: simulated provider agents, sandbox money, a photo proves *visible* completion (not workmanship quality), not legal advice. |
| 30-second aha | Green tick → capture | **The sealed-bid reveal + proof tick → capture, and a failed proof → void**, both on screen with real PayPal sandbox IDs |

**What makes it hard to copy:** it's a complete market loop, **compete → hold → prove → pay**, with three parts we haven't seen combined:
1. Sealed, commit–reveal competition among provider agents for a **funded** request.
2. Proof-Challenge-gated settlement.
3. An opt-in **Together** mode with uniform pricing and a best-of guarantee.

Each winner above built one of these steps.

**Hero domain is locked:** US home services (repairs, cleaning, gutters, small installs). Products stay in the engine, but they're not in the video.

**AI provider:** no hackathon LLM credits exist. The app runs end to end on deterministic fallbacks and switches to Claude automatically when `ANTHROPIC_API_KEY` is set.

---

## 1. The product in one breath

> **Tell your agent what you need and the most you'll pay. Verified sellers compete for it with secret bids. PayPal holds your money and only pays the winner when you get what was promised.**
> Alone, you get competing quotes without haggling. With neighbours, you also get the bulk price.

One engine, two modes:

| | **Solo** (a group of one) | **Together** (many matching requests) |
|---|---|---|
| Who | One person with one need | People with the same need nearby, who each opt in |
| Example | Maria in Austin: *"Water heater is leaking. Fix it by Thursday, max $400."* | 6 homes on Maria's street need gutter cleaning before winter |
| What sellers compete on | Price + promises (arrival time, licence, work warranty) | Per-home price at a minimum number of homes (one truck, one trip, so it's cheaper) |
| Who pays what | The winning quote (≤ your hold) | Everyone pays the same final price (≤ each person's hold) |
| When money moves | After the job is confirmed done | After each job or delivery is confirmed |

**Why both modes matter:** Solo gives *every* individual value on day one, with no need to wait for neighbours. Together is the multiplier. The same request flows into a group automatically, but **only if the person says yes**, and only if the group price beats their solo quotes.

**Beyond shopping:** the main examples are **local services** (repairs, cleaning, tutoring, moving, car service), where small buyers are most exposed. People can't compare prices easily, they get upsold on the spot, and they pay up front with no protection. Products (school devices, sports gear) use the same engine.

This lines up exactly with ideas PayPal lists on the hackathon's [Resources page](https://paypalaihackathon.devpost.com/resources):
- *"a scheduling assistant that pays contractors automatically when a job is marked complete"*
- *"two agents negotiating and settling a payment between themselves (agent-to-agent commerce)"*
- *"a tool that lets neighbors pool money for a shared community … project (like a block's solar co-op)"*

---

## 2. The real problem (for the video)

1. **Small buyers have no leverage.** You get one quote, often on the doorstep, and you pay it. Businesses get competing bids and bulk pricing.
2. **Paying up front is risky; paying after is risky for the provider.** Deposits disappear, no-shows happen both ways.
3. **AI shopping agents make it worse if done naively.** They leak what you'd pay ([2026 study](https://arxiv.org/abs/2604.26220)), and marketplaces are banning agents that place orders without permission (eBay, Feb 2026).

**Proof the model works:** pooled competitive bidding already saves households money in practice. iChoosr runs it in the UK and Europe and Solarize in the US. Both are slow, manual, single-category, and nobody commits money up front. We make it instant, AI-run, any category, and backed by PayPal.

---

## 3. "Never hurts the small person": risks turned into design rules

These are the **Buyer's Agent Charter**, enforced in code (a policy gate in front of every PayPal call), not just written in a prompt:

| Risk | Rule | How it's enforced |
|---|---|---|
| Agents get banned from marketplaces (eBay, Feb 2026) | **Our agent never shops or orders on third-party sites.** Sellers come to us and opt in through the Offer Protocol. | No scraping or ordering code exists. Sellers must register with a verified PayPal business account. |
| Agent leaks your price | **Your limit never leaves the engine.** Sellers see only "need, area, deadline, number of funded requests". | The demand-signal API has no field that can carry a limit. A schema test proves it. |
| Agent overspends | **Never charge more than you approved.** | The gate rejects capture > hold. PayPal also refuses captures above the authorization. |
| Agent acts without you | **Every hold is approved by you, in PayPal.** Nothing is charged until delivery or completion is confirmed. | No hold without a buyer-approved order. Capture requires a completion record. |
| Group makes you worse off | **Best-of guarantee:** joining a group is optional. If the group price is worse than your best solo quote, you get the solo quote. | The engine computes both and picks the lower for each person. |
| Your money is tied up | Holds are short (24–72 h for quotes). Cancel any time before close. Released immediately if no deal. | Void on cancel, failure or expiry. Reauthorize only with consent. |
| Bad or fake sellers | Sellers are verified PayPal business accounts. Fake duplicate sellers are flagged. Promises are checked before payment. | Identity check, duplicate detection, AI promise check, human approval. |
| Seller text hijacks the AI | Seller text is never instructions and never reaches the payment code. | Two channels: free text is display-only; offers are strict schema objects. |
| Disputes | Problem? Don't confirm. Funds stay on hold, then partial capture or void after review. | Payment state machine; Disputes API watcher (production). |
| AI disclosure (EU AI Act Art. 50, US bot laws) | Every AI voice is labelled "AI assistant" or "AI seller agent". | UI labels; the README says the seller agents are simulated. |
| Districts already get bulk prices | We serve individuals, families, neighbours and micro-businesses, not institutions | Personas and copy |

**Fees:** free for buyers. Sellers pay a small success fee because they get guaranteed, prepaid demand with zero marketing cost.

---

## 4. What's technically new (the "Technological Implementation" story)

The judges are builders. Here is what goes beyond a standard checkout:

### 4.1 Sealed bids that even we can't peek at (commit–reveal)
Seller agents first submit a **commitment**: `SHA-256(offer JSON + secret salt)`. After the deadline they **reveal** the offer and salt, and the engine checks the hash. Consequences:
- No one, **including Aeonith**, can see or leak a bid before close. That rules out insider tip-offs and "last-look" cheating.
- Any change to a revealed offer is detectable.
- Commitments are visible in the audit log, so the auction can be verified afterwards.

This is a standard cryptographic technique, but we haven't seen it in consumer agentic commerce.

### 4.2 Aeonith Offer Protocol, exposed as an MCP server
Any merchant's AI agent can join, not just ours. The protocol is a small **MCP server** with tools:
- `list_open_requests` returns the demand signal (no limits).
- `submit_commitment` and `reveal_offer`.
- `get_result`.

Our simulated seller agents (Claude) use **the same MCP tools**, so the demo shows real agent-to-agent commerce over an open standard. A judge could connect their own agent.

### 4.3 Payment policy gate (guardrails as code)
Every PayPal call goes through one function that checks:
- the amount is ≤ the hold;
- the payee is the verified winner;
- the required approvals exist (buyer for holds, admin or buyer confirmation for capture);
- an idempotency key is present.

AI can *propose*; only the gate can *execute*. It's unit-tested with adversarial cases.

### 4.4 Verify-then-pay state machine, driven by PayPal events
```
REQUESTED → HELD (buyer approved PayPal hold)
          → AWARDED (engine picked winner; commit–reveal verified)
          → FULFILLED (service: completion photo + buyer confirm / product: tracking added)
          → CAPTURED (partial capture at final price; rest released)
          → PAID_OUT (Payouts to the seller, minus fee)
   any → RELEASED (void) on cancel, no feasible bid, or failed verification
```
Every transition is reconciled with **verified PayPal webhooks**.

### 4.5 AI proof-of-completion check (multimodal)
For services, the provider uploads a completion photo and a note. Claude (vision) compares them with the job and the provider's promises ("water heater replaced, 40-gal, haul-away included?"). It writes a short finding for the buyer. The buyer taps **Confirm**, or after 48 h without a dispute, settlement proceeds. The AI **advises**; the buyer or admin **decides**.

### 4.6 Tamper-evident audit trail
Every agent message, offer, decision and PayPal call is appended to a **hash-chained log**: each entry includes the hash of the previous one. "Receipts for agents" lets judges and users see exactly what happened and that nothing was edited.

### 4.7 Deterministic clearing engine with property tests
- **Solo:** filter offers by required promises, then take the lowest price, tie-broken by better promises, then earliest commit.
- **Together:** uniform price that maximises total buyer saving, subject to each seller's minimum (see the CONCEPT_BRIEF worked example).
- **Property tests prove the invariants:** never above any hold; everyone in a group pays the same; the best-of guarantee holds.

---

## 5. PayPal: the only payment rail, used end to end

All money movement goes through PayPal APIs. No other payment provider is used.

| Step | PayPal API | Notes |
|---|---|---|
| Sign in / identity (optional, US) | **Log in with PayPal** | Verified buyer identity reduces fake buyers |
| Hold | **Orders v2** `intent: AUTHORIZE` → buyer approval → authorize | Amount = limit (solo) or limit × units (together) |
| Keep hold alive | **Payments v2** reauthorize | After the 3-day honor period, with consent |
| Charge final price | **Payments v2** capture, partial, `final_capture: true` | Gate-checked: ≤ hold |
| Release | **Payments v2** void | Cancel, no deal, or failed verification |
| Proof of delivery (products) | **Add tracking** (Shipment Tracking API) | Capture after tracking/delivery |
| Pay the provider | **Payouts** | Aeonith is merchant of record in the demo; multiparty/platform onboarding in production |
| Refund after capture (problem path) | **Payments v2** refund | |
| Disputes (production) | **Disputes API** + webhooks | Freeze payout if a dispute opens |
| Sync | **Webhooks** + `verify-webhook-signature` | Every state change |
| Safety | `PayPal-Request-Id` idempotency | No double charges |
| US funding option (stretch) | **Venmo** via the JS SDK | US only |

---

## 6. AI: what Claude does (and doesn't)

| Claude does | Model features |
|---|---|
| Intake: turns "water heater leaking, fix by Thursday, max $400" into a structured request; asks one clarifying question if needed | Structured outputs |
| Group suggestion: "5 neighbours also need gutter cleaning this month. Join for a group quote?" (opt-in) | Structured outputs + explanation |
| Seller agents (simulated providers) read the demand via MCP and decide sealed offers from their own cost sheet | Tool use over MCP |
| Promise check: compares offers with requirements; flags mismatches or duplicates | Structured outputs |
| Proof-of-completion check from a photo and note | Vision |
| Plain-English receipts and summaries | — |
| **Never:** picks winners, computes amounts, calls PayPal | Enforced by the policy gate |

Model: `claude-opus-5-5`, with a deterministic offline fallback so the demo never breaks.

---

## 7. Sponsor tools (natural, not forced)
| Sponsor | Use | Prize |
|---|---|---|
| **Bryntum Scheduler** (licence in `.env`) | Provider booking calendar: the winning provider's job slot, group service days for a street, completion status | $1,000 ×3 |
| **Channel3** (key in `.env`) | Real product data and retail reference prices for product requests ("retail $399"), used as a ceiling check | $1,500 |
| **Render** | Hosting + a cron/Workflow for deadlines and reauthorize | credits |

At most one sponsor prize can be won. Bryntum fits the services story best; Channel3 fits products.

---

## 8. The demo (one story, under 3 minutes)
1. **0:00 Problem:** Maria, Austin. Water heater leaking. One plumber quotes $520 on the phone, deposit up front.
2. **0:20 Solo:** she tells Aeonith: "fix by Thursday, max $400". She approves a **$400 PayPal hold** ("reserved, not spent").
3. **0:45 Sealed bids:** three AI provider agents submit commitments (hashes shown), then reveal: $380, $345 (no licence, so filtered out), $360 with a 1-year warranty. The winner is $360. Bryntum shows Thursday 2–4 pm booked.
4. **1:20 Proof and pay:** the provider uploads a completion photo. Claude: "Matches: 40-gal unit installed, haul-away noted." Maria taps Confirm. PayPal **captures $360**, releases $40, and **pays out** the provider.
5. **1:50 Together:** Aeonith notices 5 neighbours need gutter cleaning. They opt in, each approves a hold, and a sealed group bid gives $95/home (solo quotes were ~$160). One house's limit was $90, so that hold is released and they pay nothing.
6. **2:30 Trust:** the audit log, the "your price was never shared" panel, and the policy gate rejecting an AI attempt to overcharge.
7. **2:50 Close:** "Competing quotes for one. Bulk prices for many. PayPal holds the money until it's done."

---

## 9. Build plan (Nov 6 → submit Nov 11)
| Day | Must |
|---|---|
| Nov 6–7 | US sandbox accounts + app; real hold → capture/void test; engine rewrite (solo + together) with property tests; policy gate |
| Nov 8 | Commit–reveal + Offer Protocol (in-process first, then MCP server); Claude seller agents; intake |
| Nov 9 | State machine + webhooks; Payouts; proof-of-completion (vision); hash-chained audit log |
| Nov 10 | UI (solo flow, group flow, Bryntum Scheduler, receipts); Render deploy; README with judge credentials |
| Nov 11 | Record video, final checks, submit |

**Should:** MCP server exposed externally, Log in with PayPal, Shipment Tracking, Channel3 reference prices.
**Stretch:** Venmo, EUR/DE buyer, Disputes watcher.

## 10. Decisions still needed from you
1. Hero story: **Maria's home repair (solo) → her street (together)**, as above? (Recommended: it covers the individual and collective angles in one story.)
2. OK to create **US sandbox buyer/seller accounts + a new app**? (The current ones are India-based.)
3. Paste the **full** PayPal Client ID and Secret into `.env` (the ID you shared is the shortened display version) and add `ANTHROPIC_API_KEY`.
