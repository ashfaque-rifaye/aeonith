# Aeonith: Concept Brief (v2)

*Collective buying power for the age of AI agents, without leaking what you're willing to pay.*

Version 2 · 2026-11-06. It replaces the v1 framing in [IDEAS.md](IDEAS.md). It was rebuilt from 2026 research, 2025–26 patent filings and an originality sweep (sources at the end).

---

## 1. The pitch in 30 seconds

When you send an AI agent shopping, it gives you away. A 2026 study found that sellers can recover a buyer agent's **willingness to pay almost one-for-one** from the conversation alone, and that **prompts can't fix it** ([Role Coherence, Apr 2026](https://arxiv.org/abs/2604.26220)). Meanwhile, individuals pay retail while institutions get volume pricing.

**Aeonith is a sealed buyers' union.** You tell your agent what you need and your private ceiling. Your agent never talks to a seller. It joins a **collective**, and PayPal places a **hold at your ceiling**, so the demand is *funded*, not a wishlist. Competing **seller agents** see only "34 funded units, closes Friday". They submit **sealed** price schedules at the same time. A deterministic clearing engine picks the best offer, and **everyone pays the same clearing price**, which is usually far below their ceiling. PayPal captures at that price. If no offer clears, every hold is voided and **nobody pays**.

> *Approve once. Never charged more than you said. Never charged at all unless the group wins.*

## 2. Why v2 (what the originality check found)

"AI agents that group-buy" alone is **not original** in 2026:

| Existing project | What it does | What it lacks |
|---|---|---|
| [Pool](https://github.com/nimarco/pool) (AWS Agents for Humans, Aug 2026) | Notices neighbours needing the same thing, recruits a local fulfiller, coordinates | No payment holds, no seller competition, no preference privacy |
| [Jotbandhi](https://github.com/singhakousik363-del/jotbandhi) (Aug 2026) | Collective *selling* for farmers: where/when to sell, shared freight | Seller-side, advisory, no payments |
| [SwarmDeal](https://lablab.ai/ai-hackathons/agentic-commerce-on-arc/arcpay-agents/swarmdeal-autonomous-ai-group-buying-agent) (lablab, Jan 2026) | Group-buy UX and agent reasoning | "Coordination rather than checkout", no settlement |
| 8+ PayPal-hackathon repos (LEASH, Allowance, IntentFence, Warrant…) | Spending limits / mandates for **one** agent | Single-user, defensive |

So v1 (seller-published tiers + holds) was too close to these. **v2's novelty is the combination none of them have:** sealed preferences + funded intent + sealed-bid competition among seller agents + uniform clearing + verify-then-capture, all settled on PayPal.

## 3. Where the ideas come from (inspiration → design decision)

| Source (2025–2026) | Insight | Aeonith design decision |
|---|---|---|
| [When Agents Shop for You: Role Coherence](https://arxiv.org/abs/2604.26220) (Apr 2026) | Delegation itself leaks willingness to pay; it needs an *architectural* fix, not prompting | **Sealed Preferences:** buyer agents never converse with sellers; ceilings live only in the clearing engine and in PayPal holds |
| [Magentic Marketplace](https://arxiv.org/abs/2510.25779) (Microsoft, Oct 2025) | Agents show **first-proposal bias** and are manipulable; search order shapes outcomes | **Sealed, simultaneous** seller offers; no "first offer wins"; ranking is deterministic, not conversational |
| [Agent Bazaar](https://arxiv.org/abs/2605.17698) (May 2026) | Seller agents cause price crashes, and one agent can run **Sybil** "lemon market" fraud | Seller identity bound to a verified PayPal business account; duplicate-listing / Sybil check before acceptance |
| [TruthMarketTwin](https://arxiv.org/abs/2605.10059) (May–Aug 2026) | LLM sellers exploit reputation systems; **warrant enforcement reduces deception** | Seller claims become structured **warrants** checked before capture; breach → no capture / refund |
| [TessPay](https://arxiv.org/abs/2602.00213), [RAILS](https://arxiv.org/abs/2606.08790) (2026) | "Verify-then-pay"; *clearing* is the missing primitive between authorization and settlement | Explicit **clearing step** between PayPal *authorize* and *capture*, with an evidence record |
| [Red-teaming AP2 via prompt injection](https://arxiv.org/abs/2601.22569) (Jan 2026) + Korean patent [KR20260124680A](https://patents.google.com/patent/KR20260124680A/en) | Agent payment flows get hijacked through text; separate natural-language messages from payment-control messages | **Two channels:** seller text never reaches the money path; offers are parsed into a strict schema and money math is deterministic |
| [AgenticPay benchmark](https://arxiv.org/abs/2602.06008), [ContractSim](https://arxiv.org/abs/2608.10475) (2026) | LLMs negotiate poorly over long horizons and under uncertainty | No free-form haggling over money; LLMs **interpret, explain, check**; the mechanism decides |
| [Coalition Formation in LLM Agent Networks](https://arxiv.org/abs/2604.14386) (Apr 2026) | LLM coalitions are unstable without structure | Coalitions form by a **deterministic compatibility rule** (spec + deadline + region), with the AI explaining membership |
| Visa [WO2026173648A1](https://patents.google.com/patent/WO2026173648A1/en), [WO2026173611A1](https://patents.google.com/patent/WO2026173611A1/en); Mastercard [US20260154681A1](https://patents.google.com/patent/US20260154681A1/en) (2025–26, pending) | Industry is standardising **per-user mandates** (intent + constraints → scoped token) | We don't copy them. We go one level up: a **collective mandate** ("N people, each with a private ceiling, jointly authorise a purchase if price ≤ their ceiling"), realised with standard PayPal holds |
| UnionPay [CN122420137A](https://patents.google.com/patent/CN122420137A/en) (May 2026, pending) | Single-agent automated bargaining via MCP | Contrast: we *avoid* one-to-one bargaining and replace it with sealed collective clearing |
| Consumer surveys ([Worldpay 2026](https://worldpay.com/en/insights/articles/agentic-commerce-report-2026-out-now), [Checkout.com](https://www.checkout.com/newsroom/consumer-demand-for-ai-shopping-is-forming-fast-but-trust-for-agentic-commerce-is-still-catching-up), [Forbes Oct 2026](https://www.forbes.com/sites/jordanmckee/2026/10/01/agentic-commerce-has-a-consumer-trust-problem/)) | 59% want to approve every purchase; comfort collapses above $500; trust is the blocker | **One explicit approval** (the PayPal hold at your ceiling), visible and cancellable until close; never charged above it |
| [Paying to Know](https://arxiv.org/abs/2606.24783) (Jun 2026) | When buyers are agents, the scarce thing is *verified information*, not matching | Stretch: the collective can buy verified info (test reports, warranty terms) once and share it across all members |

Prior art we lean on and that is free to use (expired): Priceline's conditional purchase offers (US5794207), MobShop's demand aggregation (US6269343), Ariba's buyers' club (US6584451). See [RESEARCH.md](RESEARCH.md).

## 4. The five core concepts

### ① Sealed Preferences (privacy by architecture)
Each buyer's ceiling is stored **only** in (a) the PayPal authorization amount and (b) the clearing engine. Sellers receive a **minimal demand signal**: product spec, total funded units, deadline, region. That's no histogram, no individual numbers and no chat with buyers. The "leak" the Role Coherence paper measured can't happen because there's no conversation to infer from.

### ② Funded Intent (demand that's real)
A pledge only counts once PayPal has **authorized** it (Orders v2 `intent: AUTHORIZE`, amount = ceiling × units). For sellers this is new: **proof-of-funds demand** rather than "interested" clicks. That's guaranteed volume with zero acquisition cost, which is why sellers will bid low.

### ③ Sealed-bid Reverse Clearing (the mechanism)
Seller agents submit sealed **price schedules** (e.g. "≥25 units: $309", "≥30 units: $299") before the deadline. At close the engine evaluates every offer:
- For offer price *p* with minimum quantity *q*: the eligible buyers are those whose ceiling ≥ *p*. The offer is feasible if their units ≥ *q*.
- Choose the feasible offer that **maximises total buyer surplus** Σ(ceiling − p), with ties broken by more units served, then by the earliest valid submission.
- **Everyone included pays the same clearing price p.** Buyers below p are voided, not charged.

Why it's good: your ceiling only decides *whether* you're in, never *what* you pay. So there's no reason to lowball or bluff, which is the classic uniform-price intuition. Sellers can't see each other's bids, which removes first-proposal bias and anchoring, and makes collusion through chat harder.

### ④ Verify-then-Capture
Each offer carries **warrants**: structured claims such as model, specs, warranty months, delivery date and return policy. Before capture, an AI checker compares the warrants against the pool's requirements and the seller's listing, and flags mismatches or Sybil patterns (same catalog content under several seller identities). A **human admin approves** the settlement plan, then capture runs.

### ⑤ Two-Channel Safety
Natural language (seller pitches, buyer chat) is **data**, shown to humans and summarised by AI. The **payment channel** carries only schema-validated objects (Offer, ClearingDecision, SettlementInstruction). An AI can't move money. Code computes amounts, and PayPal enforces capture ≤ authorization.

## 5. Worked example (the demo story)

**Lincoln Elementary PTA** wants student Chromebooks. Retail is $399. 28 families (34 units) join through their agents with private ceilings:

| Private ceiling | Units |
|---|---|
| $350 | 10 |
| $320 | 14 |
| $300 | 10 |

Each family approves **one PayPal hold** at ceiling × units. Three seller agents bid sealed:

| Seller | Schedule | Eligible units at that price | Feasible? | Buyer surplus |
|---|---|---|---|---|
| A | ≥10 units: **$339** | 10 (only the $350s) | ✅ | 10 × $11 = $110 |
| B | ≥25 units: **$309** | 24 ($350s + $320s) | ❌ needs 25 | n/a |
| C | ≥30 units: **$299** | 34 (everyone) | ✅ | $510 + $294 + $10 = **$814** |

The engine picks **C at $299**: all 34 units, the highest surplus. **Every family pays $299.** The family with a $350 ceiling saves $51 against their own limit and $100 against retail. The group saves **$3,400**. Seller C never learned that 10 families would have paid $350.

If no offer had been feasible, every hold is **voided** and nobody pays.

## 6. How money moves on PayPal (sandbox)

```
Buyer approves  ──► Orders v2  intent=AUTHORIZE (amount = ceiling × units)   [hold, not charge]
Deadline        ──► Clearing engine picks offer + price p                      [deterministic]
Admin approves  ──► captureAuthorization(amount = p × units, final_capture)   [≤ hold, enforced]
                ──► voidAuthorization() for buyers below p / failed pools     [nobody pays]
Aeonith (merchant of record) ──► Payouts API → winning seller's PayPal account (minus fee)
Webhooks (verified) reconcile every step; PayPal-Request-Id makes retries idempotent
```

The winner isn't known when holds are placed, so **Aeonith acts as the cooperative's merchant of record** and pays the winning seller with **PayPal Payouts**. That's one more real PayPal capability, and it's how a buyers' co-op works in real life. Holds last 3 days (honor period) and can be reauthorized up to 29 days, so demo pools close in minutes.

## 7. Where AI is used, and where it deliberately isn't

| AI does (Claude) | Code and PayPal do |
|---|---|
| Turns free text into a structured need + private ceiling ("12 Chromebooks, no more than $340 each") | Store the ceiling; never show it to sellers |
| Groups compatible needs and explains why you're in this pool | Apply the compatibility rule; build the minimal demand signal |
| Seller agents (simulated merchants for the demo) read the demand signal and generate sealed price schedules + warrants | Validate offers against a strict schema |
| Checks warrants against requirements, spots Sybil or duplicate sellers, writes the settlement review | Clearing math, capture/void amounts, payouts |
| Plain-language receipts: "You set $350, paid $299, saved $51" | Enforce capture ≤ authorization |

## 8. Why it should score on each criterion

- **Technological implementation:** goes well beyond a pay button. It covers AUTHORIZE, partial capture, void, reauthorize, Payouts and verified webhooks, plus multi-agent AI with structured outputs and a formal clearing mechanism.
- **Design:** one approval per person, a progress bar of funded demand, a sealed-bid reveal moment, and receipts that show savings.
- **Potential impact:** PTAs, community solar/heat-pump co-ops, small farms and small businesses. Small buyers get institutional prices, and their privacy is protected against seller agents (a 2026 research finding).
- **Innovation:** builds directly on 2026 research gaps (preference leakage, first-proposal bias, verify-then-pay clearing) and goes beyond per-user mandate patents to a *collective* mandate.
- **Presentation:** a natural story arc: the leak problem, everyone joins, a sealed-bid reveal, PayPal settles, nobody overpays.

Prize fit: **Best Use of Agentic Commerce**, **Most Creative**, **Most Impactful**, **Best Use of PayPal + AI**, plus Render (hosting) or Channel3 (real product data for seller listings).

## 9. Three-minute video beat sheet
1. **0:00 The leak.** "Your shopping agent tells sellers what you'd pay." Show one line from the 2026 study.
2. **0:20 The need.** The PTA and three families. Each tells their agent their need and a private ceiling.
3. **0:45 Funded intent.** Each approves one PayPal hold (sandbox). The pool bar fills to "34 funded units".
4. **1:15 Sealed bids.** Three seller agents submit. What sellers *see* (just "34 units") is shown next to what they *don't* (ceilings).
5. **1:45 Clearing.** Reveal: C at $299 wins. The AI review flags seller B's warranty mismatch. The admin approves.
6. **2:15 PayPal settles.** Captures go through at $299, a lower-ceiling hold is voided, and the seller is paid out.
7. **2:40 Receipts and impact.** "$3,400 saved. Nobody overpaid. Nobody's price leaked."

## 10. Build scope (5 days)

**MVP (must ship):**
- Need intake (AI) → private ceiling → PayPal AUTHORIZE hold *(already in the scaffold)*
- Minimal demand signal API for sellers; 2–3 **simulated seller agents** (Claude) that submit sealed schedules + warrants
- Clearing engine (§4③) with unit tests *(replaces tier logic in `src/pools/engine.ts`)*
- Settlement: capture at clearing price / void below price or on failure *(capture/void already in scaffold)*
- AI settlement review + admin approval *(in scaffold)*
- Receipts and savings view; hosted on Render

**Should:** Payouts to the winning seller (sandbox second business account); verified webhooks end to end.
**Stretch:** Channel3 catalog data for seller listings; shared "verified info" purchase; reauthorize for long pools; AG Studio savings dashboard.

## 11. Honest risks and open questions
- **Simulated sellers:** in the demo the seller agents are ours. Say so plainly in the video, and frame the seller side as an open protocol any merchant agent can implement.
- **Merchant of record and Payouts** need PayPal approval in production. The sandbox supports Payouts. Multiparty/partner onboarding is the real-world path.
- **Strategic sellers** could shade bids if they learn the mechanism. A reserve price (retail) and a minimum-improvement rule help.
- **Ceiling privacy vs. PayPal:** PayPal sees the hold amount (it has to). The privacy claim is about *sellers and their agents*, not the payment processor.
- **Legal:** not legal advice. The patents cited are inspiration; the expired ones are free to use, while the pending 2025–26 filings (Visa, Mastercard, UnionPay) cover different mechanisms. A real launch needs a freedom-to-operate review.

## Sources
Research: [2604.26220](https://arxiv.org/abs/2604.26220) · [2510.25779](https://arxiv.org/abs/2510.25779) · [2605.17698](https://arxiv.org/abs/2605.17698) · [2605.10059](https://arxiv.org/abs/2605.10059) · [2602.00213](https://arxiv.org/abs/2602.00213) · [2606.08790](https://arxiv.org/abs/2606.08790) · [2601.22569](https://arxiv.org/abs/2601.22569) · [2602.06008](https://arxiv.org/abs/2602.06008) · [2608.10475](https://arxiv.org/abs/2608.10475) · [2604.14386](https://arxiv.org/abs/2604.14386) · [2606.24783](https://arxiv.org/abs/2606.24783) · [2609.01519](https://arxiv.org/abs/2609.01519)
Patents (2024–26, pending unless noted): [WO2026173648A1](https://patents.google.com/patent/WO2026173648A1/en) · [WO2026173611A1](https://patents.google.com/patent/WO2026173611A1/en) · [WO2025240729A1](https://patents.google.com/patent/WO2025240729A1/en) · [US20260154681A1](https://patents.google.com/patent/US20260154681A1/en) · [CN122420137A](https://patents.google.com/patent/CN122420137A/en) · [KR20260124680A](https://patents.google.com/patent/KR20260124680A/en) · [US12526244B2](https://patents.google.com/patent/US12526244B2/en) (Citi, active) · [CN122472780A](https://patents.google.com/patent/CN122472780A/en)
Industry: [PayPal agentic commerce services](https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping) · [PayPal at Ai4 2026](https://newsroom.paypal-corp.com/2026-08-10-PayPal-Takes-Center-Stage-at-Ai4-2026) · [Worldpay Agentic Commerce Report 2026](https://worldpay.com/en/insights/articles/agentic-commerce-report-2026-out-now) · [Checkout.com trust study](https://www.checkout.com/newsroom/consumer-demand-for-ai-shopping-is-forming-fast-but-trust-for-agentic-commerce-is-still-catching-up) · [Riskified Nov 2026](https://www.riskified.com/press/agentic-commerce-pulse-consumer-survey-november-2026/) · [Forbes: trust problem](https://www.forbes.com/sites/jordanmckee/2026/10/01/agentic-commerce-has-a-consumer-trust-problem/) · [MACH Alliance hackathon lessons](https://machalliance.org/insights-hub/from-who-showed-up-to-what-they-built)
