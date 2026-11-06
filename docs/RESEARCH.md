# Research: what wins, what's crowded, what's patent-free

Compiled 2026-11-06. Sources are linked inline. Three inputs: (1) recent agentic-commerce/fintech hackathons, (2) what other PayPal AI Hackathon entrants are publicly building, (3) prior-art patents that have **expired** (free to practise).

---

## 1. Recent hackathons (roughly the last 3–9 months) and their winners

| Event | When | Winners / signal |
|---|---|---|
| [MACH Alliance / Bloomreach AI Exchange agentic commerce hackathon](https://machalliance.org/insights-hub/from-who-showed-up-to-what-they-built) | write-up Jul 2026, 83 teams | **SilentWatch** (re-engages disengaging customers), **Orbit Agent** (discover→build→send→measure loop *with human approvals*), **Lighthouse** (CX risk officer that *justifies* its risk signal), **CRM Pathfinder** (what to do next, from live analytics) |
| [Agentic Commerce x402 Hackathon, Berlin](https://algorand.co/blog/agentic-commerce-x402-hackathon-berlin-recap) | Jun 2026 | **Juicebag Mail** (agent sends/receives *physical* mail, pay-per-letter), **Volt402** (EV agent buys a neighbour's solar power in real time), Liminal (routes agents to trustworthy providers), AlgoEUPay (checkout) |
| [SF Agentic Commerce x402 Hackathon](https://www.skale.space/blog/san-francisco-agentic-commerce-x402-hackathon-recap-winners) | Feb 2026 | Superpage (agents doing real-world commerce), RequestTap (open-source payment router); Google track for *Best Integration of AP2* |
| [BSV Open Run // AgenticPay](https://www.prnewswire.com/news-releases/bsv-associations-open-run--agenticpay-hackathon-concludes-with-10-000-awarded-across-five-winning-projects-302762606.html) | Apr 2026 | Dolphin Sense: 90 agents in an autonomous newsroom settling via micropayments |
| [lablab Agentic Commerce on Arc](https://github.com/lablab-ai/community-content/blob/main/blog/en/agentic-commerce-on-arc-ai-hackathon.mdx) | Jan 2026, 222 teams | RSoft Agentic Bank (agent identity + credit scoring + settlement), NewsFacts |
| [lablab Alpaca AI Trading Agents](https://x.com/lablabai/status/2105583053867495711) | Sep 2026 | Autobelay. Organisers' summary: "the best ones had one rule: **the AI never pulls the trigger**" |
| [HuskyHack (Sound CU + UW Tacoma)](https://www.prnewswire.com/news-releases/collegiate-entrepreneurs-impress-with-fintech-solutions-at-the-2026-huskyhack-302915784.html) | Oct 2026 | Scout: live scam detection on phone calls ($15k) |
| [Alkami 2026 Hackathon](https://www.alkami.com/news/alkami-recognizes-2026-hackathon-winners-showcasing-innovation-across-its-platform/) | Oct 2026 | Card Compass (AI maps card integrations), Insight Engine (personalised account-holder insights) |
| [Gloo AI Hackathon](https://finance.yahoo.com/technology/ai/articles/gloo-ai-hackathon-winners-announced-120000606.html) | Oct 2026 | Fosterly ($100k): agent connecting youth aging out of foster care to services |
| [C:\>DIR Agentic Regulator Hackathon](https://www.fii.international/news/cdir-global-agentic-regulator-hackathon-2026-winners) | Oct 2026 | Team Pheonix (SEBI); agentic-payments track |

### Patterns judges keep rewarding
1. **A named user + a concrete outcome** beats a generic assistant ("agent a lifecycle marketer could imagine deploying"). PayPal's own judging asks for a "credible, specific case".
2. **Orchestration over chat.** Multi-step loops across several systems or MCP surfaces, not a chatbot with a pay button.
3. **Human-in-the-loop as a design principle.** Approval gates, "AI never pulls the trigger", explainable reasons.
4. **Explainability / evidence.** Winners *justify* their signal (Lighthouse).
5. **Physical-world or community tie-in makes it memorable.** Juicebag Mail (real letters), Volt402 (neighbour's solar), Fosterly.
6. **Many agents transacting with each other** (agent-to-agent commerce, micropayments) scores on novelty.
7. **A working, end-to-end demo** with real (sandbox) money movement. Every recap stresses "shipped, not slides".

## 2. The competition inside *this* hackathon (public GitHub, created ≥ Oct 1 2026)

~29,000 registrants. A `gh search repos "paypal hackathon"` sweep (Nov 6) shows heavy clustering:

| Theme | Public examples | Crowding |
|---|---|---|
| **Agent spending limits / mandates / firewalls / "is this payee real"** | LEASH-Spending-Firewall, Allowance, IntentFence, Warrant, TrustOra, pay-guardian, Greenlight, Proofpay ×2 | 🔴 saturated |
| **Dispute / chargeback copilots** | Rebuttal, dispute-agent, PayResolve-AI | 🔴 |
| Bill splitting / receipts | SplitPay AI | 🟠 |
| Savings circles | Susu Steward | 🟠 |
| Payment orchestration / idempotency | SlothPay | 🟠 |
| Seller-side WhatsApp → agent marketplace, order split across sellers | OpenStall Collective | 🟡 (adjacent) |
| Classroom donation transparency (AG Studio) | rajab-rajab | 🟡 |

The two most-read idea lists (Devpost's own inspiration list, and [The GenAI Magazine's "10 ideas"](https://thegenaimagazine.com/paypal-ai-hackathon-2026-ideas-deadline-prizes): gift-finder, invoice chaser, churn saver, dispute copilot, ask-your-payments dashboard, booking deposits, creator splitter, chat-to-pay, price-watch agent, integration copilot) are where most entries will land. **Anything on those lists is a "seen it ten times" for judges.**

The project gallery isn't public yet, so this is a lower bound.

## 3. Patents: expired prior art we can freely build on

Found via Google Patents (status read from each record's legal-status field). All are **expired**, so the claimed methods are public domain. *Not legal advice; a quick search is not a freedom-to-operate opinion.*

| Patent | Owner | Priority | Status | What it claims |
|---|---|---|---|---|
| [US5794207A](https://patents.google.com/patent/US5794207A/en) | Walker Asset Mgmt (Priceline) | 1996 | Expired 2016 | **Buyer-driven conditional purchase offer**: buyer posts a *binding* offer price backed by a payment identifier; sellers search offers and accept, which binds the buyer |
| [US6269343B1](https://patents.google.com/patent/US6269343B1/en) | MobShop | 1998 | Expired 2019 | **Demand aggregation**: seller's conditional offer whose price *drops with total volume committed by a deadline*; strangers pool demand |
| [US6584451B1](https://patents.google.com/patent/US6584451B1/en) | Ariba | 1999 | Expired 2019 | **Online Buyers Club**: aggregate many small buyers' *optional purchase terms* against sellers' dynamic pricing schedules; facilitator finds the best-fit transaction |
| [US8196811B2](https://patents.google.com/patent/US8196811B2/en) | eWinWin | 1999 | Expired 2019 | Multiple-criteria buying/selling: deals matched on price *and* non-price criteria (quality, delivery time, warranty) |
| [US10115098B2](https://patents.google.com/patent/US10115098B2/en) | Fast 101 | 1999 | Expired 2020 | Invoiceless trading: early-payment discount in exchange for immediate settlement |
| [US7039603B2](https://patents.google.com/patent/US7039603B2/en) | Walker Digital | 1996 | Expired 2016 | Buy online at one price, collect at a local retailer, settle the difference |

**Why these failed in 2000 and work now:** MobShop, Mercata and Accompany died because *humans* had to find each other, wait for a group to fill, re-check, and trust strangers. Coordination cost killed them. Agents remove exactly that cost: they hold preferences, watch deadlines, negotiate and commit 24/7. PayPal's **authorize-now / capture-later** API removes the trust problem: nobody is charged unless the deal clinches, and everyone is charged at the final, lower price.

Quick check for *active* modern patents on "AI agents aggregate buyer demand with pre-authorised payments" (priority ≥ 2020) returned nothing on point. Before any commercial launch get a proper FTO search.

## 4. Implication

Don't build the 9th spending firewall. Build what the winners' patterns and the empty space both point at: **many buyer agents coordinating and transacting together, with money held safely until a condition is met, explainable at every step, tied to a real community**. That's the brief for [IDEAS.md](IDEAS.md).
