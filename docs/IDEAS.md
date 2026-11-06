# Aeonith: idea brainstorm & pick

> **Superseded by [CONCEPT_BRIEF.md](CONCEPT_BRIEF.md) (v2, 2026-11-06).** An originality sweep found 2026 projects already doing AI group-buying (Pool, Jotbandhi, SwarmDeal). v2 re-grounds the idea in 2026 research: sealed preferences, funded intent, sealed-bid clearing among seller agents, and verify-then-capture. The analysis below is kept for history.

Constraints: build by **Nov 11** (5 days), PayPal sandbox central, AI meaningful, avoid crowded themes (see [RESEARCH.md](RESEARCH.md)), and score on all five equally weighted criteria.

## Scored shortlist (1–5 each, my estimate)

| # | Idea | Roots | Tech | Design | Impact | Innov. | Demo | Crowding | Total |
|---|---|---|---|---|---|---|---|---|---|
| **A** | **Aeonith Collective: AI buyer agents that pool demand and unlock bulk prices; money is authorised, only captured if the deal clinches** | MobShop/Priceline/Ariba (expired) | 5 | 4 | 5 | 5 | 5 | none | **24** |
| B | Reverse marketplace: your agent posts a *binding conditional purchase offer* (PayPal-authorised); merchant agents compete to accept | Priceline US5794207 (expired) | 5 | 4 | 3 | 4 | 4 | low | 20 |
| C | Early-pay discount agent: negotiates "pay today for 2% off" on PayPal invoices between SMBs and freelancers | Fast101 US10115098 (expired) | 4 | 3 | 4 | 3 | 3 | med (invoice ideas) | 17 |
| D | Proof-of-delivery escrow: AI vision checks a delivery or job photo and releases an authorised payment | none (generic) | 4 | 3 | 4 | 2 | 4 | high (OpenStall, Proofpay) | 17 |
| E | Neighbourhood energy/solar co-op purchase agent | Volt402-like | 3 | 3 | 5 | 4 | 3 | low | 18 (folds into A as a use case) |

**Pick: A, with B as a built-in mode.** It's the only one that hits every winner pattern *and* sits in empty space. B becomes the "merchant didn't publish tiers? Our agent posts a binding group offer" path, which also gives true agent-to-agent negotiation.

---

## A. Aeonith Collective: the concept

**One-liner:** *Tell your agent what you want and the most you'll pay. It finds other people who want the same thing, negotiates a group price, and you're only charged if the group deal closes, at the lower price.*

**Who it's for (pick one for the video):** a school PTA buying 40 Chromebooks; a block buying solar panels or heat pumps together (strong impact story); a small-farm co-op buying seed and fertiliser; a student dorm buying textbooks. Small buyers normally pay retail while big companies get volume pricing. This gives small buyers the big-buyer price.

**How it works (end to end, sandbox):**
1. **Intent (AI).** User types: *"Need a 6kW home battery, max $5,500, installed before March."* Claude turns it into a structured want: item, specs, max price, quantity, deadline, flexible criteria (multi-criteria matching, after eWinWin).
2. **Match & pool (AI).** The coordinator agent clusters compatible wants into a **pool** (same product class, compatible specs and deadlines) and explains *why* each person is in it.
3. **Price tiers.** The merchant publishes a tier schedule (1–9 units $5,500 · 10–24 $4,950 · 25+ $4,600), or the merchant's agent negotiates one with the pool's agent (Mode B: binding conditional group offer).
4. **Commit with PayPal (core).** Each member approves a PayPal order with `intent: AUTHORIZE` **at their max price**. Funds are held, not taken. *This is the trust fix that killed 2000-era group buying.*
5. **Watch & nudge (AI).** As pledges come in, the agent shows "7 more to unlock $4,950", explains the trade-offs, and suggests nearby compatible buyers. Webhooks keep state honest.
6. **Clinch or release.** At the deadline the settlement engine computes the reached tier and **partially captures** every authorisation at the *tier price* (≤ what each person authorised), using `final_capture: true`. If the minimum isn't met, it **voids** every authorisation and nobody pays. A human admin approves the settlement plan (human-in-the-loop).
7. **Receipt & explanation.** Each member gets "You authorised $5,500, paid $4,950, saved $550, because 12 neighbours joined". Analytics show savings across the community.

**PayPal surface (not a bolted-on button):** Orders v2 `AUTHORIZE`, authorization capture (partial, final), void, reauthorize when the 3-day honor period lapses, webhooks + signature verification, `PayPal-Request-Id` idempotency. Stretch goals: Payouts to refund a "loyalty bonus" when a pool overshoots a tier, and the Agent Toolkit/MCP for the merchant agent's catalog and orders.

**AI surface:** intent→structured want (structured outputs), pool clustering with rationale, merchant↔pool negotiation agent (tool use, bounded by hard limits), nudges/explanations, settlement plan reviewer that flags anomalies before capture.

**Guardrails are built in, not the pitch:** an agent can never capture above what a human authorised (enforced by PayPal *and* our code); admin approval before settlement; audit log of every agent action.

**Sponsor stack (pick at most 2):**
- **Render** (hosting + Workflows for the deadline/settlement job). It's needed anyway, and it's a prize.
- **Channel3** (real product catalog for "what are we buying", $1.5k prize, 20k free credits). Use it if the demo shops for consumer goods.
- AG Studio *only* if time remains for a community savings dashboard.

**Prize targets:** Best Use of Agentic Commerce · Most Creative · Most Impactful · Best Use of PayPal + AI → plus one sponsor (Render or Channel3).

**Why judges haven't seen it:** every other agent project is *one* agent spending *one* person's money more safely. This is *many* agents creating buying power that no individual has, with PayPal holding everyone's money in suspense until the group wins.

**Demo video beat sheet (≤ 3:00):**
- 0:00 Problem: "Maya's PTA needs 40 laptops. Alone: $399 each. Districts pay $299."
- 0:20 Three phones/browsers. Three parents tell their agents what they need in plain words.
- 0:50 The agent forms a pool, explains why, shows the tier ladder. Each parent approves a PayPal hold at $399 (sandbox).
- 1:30 A fast-forward of pledges fills the bar and the tier unlocks. The negotiation agent wins an extra tier from the merchant agent.
- 2:00 The admin approves the settlement plan. Captures go through at $299. Show a *failed* pool voiding cleanly too.
- 2:30 Receipts ("saved $100"), community savings, and the architecture in 10 seconds (Orders AUTHORIZE → partial capture/void, Claude agents, webhooks).
- 2:50 "Big-buyer prices for small buyers."

**Risks & mitigations:**
- Authorization honor period is 3 days (valid 29). Demo pools close in minutes; show reauthorize logic for long pools.
- Multi-merchant settlement needs PayPal partner onboarding. Use one sandbox merchant (the pool's seller) for the hackathon and mention partner/multiparty as the roadmap.
- Fake demand: pledges need a real PayPal-approved authorisation, so no free riders.

## Stretch features (only if ahead)
- **Mode B: conditional group offer.** The pool agent posts a binding "40 units at $289, accept by Friday" to several merchant agents, and the first accepting merchant wins (after Priceline US5794207).
- **Local pickup settlement** (after Walker US7039603): buy at the group price, collect at a partner shop.
- **Early-pay discount** (after Fast101): the merchant offers an extra 1% if the pool settles within 24 h.
