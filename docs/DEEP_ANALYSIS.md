# Aeonith: Deep Analysis Before We Build

*Prepared 2026-11-06, the day of the go/no-go decision. Target market: **United States first, EU second**. India is out of scope.*

Use this document to decide, before writing more code:
1. Does something like this already exist?
2. What exactly does AI do, and what exactly does PayPal do?
3. What do PayPal and the judges want from this hackathon, and does Aeonith fit?
4. Who is it for in the US and EU, and what are the legal and practical traps?
5. Which refinements make it stronger?

Plain-language summary: Aeonith lets ordinary people team up through AI assistants to get bulk prices. PayPal holds each person's money until the group deal is done, and sellers compete with sealed bids without ever seeing what anyone was willing to pay. See [CONCEPT_BRIEF.md](CONCEPT_BRIEF.md) for the full concept.

---

## Part 1. Does this already exist? (honest answer: the pieces do, the combination doesn't)

### 1.1 The closest real-world matches

| Who | Where | What they do | How close | What they lack compared with us |
|---|---|---|---|---|
| **iChoosr** | UK, Netherlands, Belgium (since ~2008; 1.5M+ households) | Households register, iChoosr runs an **anonymised reverse auction** where energy suppliers bid for the whole group, and each household gets a personal offer. Often run with local councils. ([Warwickshire](https://www.warwickshire.gov.uk/news/article/1555/are-you-paying-too-much-for-your-gas-and-electricity-bills-warwickshire-switch-and-save-is-back-to-help-you), [CMA submission](https://assets.publishing.service.gov.uk/media/54b93afced915d159700000b/iChoosr_submission.pdf), [PetrolPrices](https://www.petrolprices.com/?p=10060802)) | **Very close in mechanism**: pooled demand plus a sealed reverse auction | Energy only. Run by people on fixed auction days. Registrations are **non-binding** (no money committed, so suppliers bid on uncertain demand). No AI agents. No payment settlement: you switch supplier afterwards. |
| **Solarize campaigns / Solar United Neighbors** | US (since ~2009, many states) | A community picks an installer through **competitive bidding**, and the price drops in tiers as more homes sign up, retroactively for everyone. ([CESA](https://cesa.org/?p=13366), [SolarReviews](https://www.solarreviews.com/blog/understanding-how-solarize-energy-campaigns-work), [Solarize Cincy](https://solarunitedneighbors.org/?p=3598), [ICMA fact sheet](https://www.icma.org/sites/default/files/306455_Local%20Governments%20and%20Bulk%20Solar%20Purchasing%20Fact%20Sheet.pdf)) | **Close in spirit**: bulk discounts, installers bid | Solar only. Months-long campaigns run by volunteers or nonprofits. No payment commitment until each home signs its own contract. No AI. |
| **Pinduoduo (China) / Temu** | China; Temu in US and EU | Social group buying where the price drops when friends join. Temu in the West dropped the team-buy mechanic and runs as a direct marketplace. ([Global Sources](https://www.globalsources.com/knowledge/pinduoduo-vs-temu/)) | Same consumer instinct | One retailer sets the price, so sellers don't compete. No price privacy. The Western version doesn't group-buy. |
| **Groupon** | US / EU | Now a "local experiences" voucher marketplace ([Tracxn](https://tracxn.com/d/trending-business-models/startups-in-group-buying/__p6rH5289aNHEdjwp7-zCVwpv2veLyXmuELepw8Duocc/companies)) | Historical ancestor | The merchant sets the discount. The "tipping point" group mechanic is mostly gone. |
| **PayPal Pools** (relaunched Nov 2024 in US, UK, DE, IT, ES) | US / EU | Friends **collect money** into a pool for a shared expense ([TechCrunch](https://techcrunch.com/2024/11/14/paypals-new-feature-will-let-you-easily-split-expenses-with-family-and-friends), [Shopifreaks](https://www.shopifreaks.com/paypal-brings-back-money-pools/)). Status in late 2026 is unconfirmed; some sources say it's gone. | **The PayPal-internal neighbour of our idea** | Pools collect money for something you've already decided to buy. Nobody negotiates a better price. |
| **School/government co-op purchasing** (Sourcewell, OMNIA Partners, GPOs) | US | Institutions buy from pre-competed contracts | Same economics | Institutions only. Families, neighbours and tiny businesses can't join. |
| **B2B reverse auctions** (Fairmarkit, Procol, Fluenta One; FedBid/Unison for US government) | US / EU | Suppliers bid on a buyer's request, and AI ranks the offers ([Fairmarkit](https://fairmarkit.com/reverse-auctions), [FedBid](https://en.wikipedia.org/wiki/FedBid)) | Same mechanism, **one big buyer** | Enterprise procurement. One buyer, not a pooled crowd. |
| **AI group-buying hackathon projects**: Pool (Aug 2026), SwarmDeal (Jan 2026), Jotbandhi (Aug 2026) | Global | AI agents notice and coordinate shared demand | Same "AI + group buy" headline | No money is committed, sellers don't compete, no price privacy, and nothing settles. |
| **AI checkout in chat**: ChatGPT Instant Checkout, Perplexity Instant Buy, Copilot Checkout, Google UCP; PayPal Agent Ready / Store Sync ([PayPal, Oct 2025](https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping), [PayPal + Google UCP](https://investor.pypl.com/news-and-events/news-details/2026/From-Search-to-Checkout-PayPal-Supports-Trusted-AI-Checkout-with-Google/default.aspx), [PayPal on protocols](https://newsroom.paypal-corp.com/2026-01-22-Making-Sense-of-the-AI-Shopping-Protocol-Moment)) | US (some EU/UK) | One person's agent buys one item at the listed price | Same "agentic commerce" space | Individual buying at list price. No pooling or competition. |

### 1.2 What this means

- **The mechanism is proven, not new.** Pooled demand plus a reverse auction among sellers works in real life: iChoosr runs it at scale in Europe, and Solarize in the US. That's **good news for "Potential Impact"**: we can cite real savings programmes and real demand.
- **What is new** is the version that is AI-agent-native, works across product categories, **is backed by real money up front**, and settles automatically on PayPal:
  - **Funded:** a PayPal hold makes demand binding. iChoosr and Solarize bids rest on non-binding sign-ups, so sellers have to price in drop-outs.
  - **Agent-native:** an AI assistant handles signing up and grouping, so you don't need a council or volunteers.
  - **Instant settlement:** charge or release automatically; no follow-up contracts.
  - **Price privacy:** sellers never see individual limits.
  - **Any category**, not just energy.
- **What we must not claim:** "first group buying" or "first reverse auction". Say instead: *"iChoosr proved that pooled reverse auctions save households money. Aeonith makes that work for any purchase, run by AI agents, and settled by PayPal in minutes instead of months."* Judges will respect this, and it pre-empts the "this exists" objection.

### 1.3 Things that could hurt us
- **eBay banned unapproved buy-for-me agents from 20 Feb 2026** ([Cyblance](https://www.cyblance.com/auction/should-your-auction-platform-let-ai-agents-bid-ebay-just-said-no-should-you/)). Marketplaces are wary of agents placing orders. Our answer: sellers opt in, a human approves every hold, and humans approve settlement.
- **School districts already get bulk prices** through co-op contracts. The PTA story should be about **families buying for their own kids** (personal devices, sports gear, instruments), not the district's laptops.

---

## Part 2. What PayPal and the judges want

### 2.1 What the rules and webinars say (from [HACKATHON.md](../HACKATHON.md))
- **No tracks and no problem statements.** Any app counts if it **meaningfully uses PayPal and AI**. A PayPal button on an unrelated app "is not enough".
- PayPal's advice in the webinars: **"Start from a real problem"**, then map it to PayPal capabilities.
- **Five equally weighted criteria (1–5 each):** Technological Implementation, Design, Potential Impact, Innovation, Presentation. Ties are broken on Technological Implementation.
- **Judges** are mostly PayPal **developer relations** people (Jo Franchetti, Eddie Jaoude, Marco Podien, …) plus sponsor developer advocates. They are builders and want to see **real API depth**, not slides.
- **Official inspiration categories** include *"AI agents that actually transact … agent-to-agent commerce"* and *"community pooled funds"* (social impact). Aeonith sits exactly where those two meet.
- **Prizes:** **Best Use of Agentic Commerce**, **Best Use of PayPal + AI**, **Most Impactful**, **Most Creative**, **Best Demo Delivery** (the video). Max one grand prize plus one sponsor prize.

### 2.2 Are they looking for payment features, a new app, or something inside PayPal?
**All three are allowed. What wins is a new application where PayPal is the engine.** Reading the signals together:
- They want **apps built on PayPal's developer platform**, not proposals for PayPal's internal product roadmap. Judges score a working product.
- But devrel judges love projects that show off **less-used PayPal APIs in a smart way**. Most entries will use a basic "create order, capture" checkout. Aeonith uses **authorize-and-hold, partial capture, void, reauthorize, Payouts and webhooks**, a deliberately rich and correct use of the platform.
- PayPal's 2025–26 strategy is **agentic commerce**: Agent Ready, Store Sync, and the ChatGPT, Perplexity, Copilot and Google UCP deals. A project showing **many agents transacting safely on PayPal** speaks directly to that strategy.

### 2.3 Which PayPal team would care (for the pitch and the "future" slide)
| PayPal team/product | Why Aeonith matters to them |
|---|---|
| **Agentic commerce (Agent Ready, Store Sync)** | A new agent pattern: *collective* agent purchases with built-in consent and holds. Merchants on Store Sync could receive funded group demand. |
| **Checkout / Orders & Payments APIs** | Shows auth-and-capture as a trust tool, not just a hotel/rental feature |
| **Payouts / Hyperwallet** | Paying the winning seller; later, paying multiple sellers |
| **PayPal Pools / Venmo (consumer)** | Natural home: "Pools that negotiate". Today's Pool collects money for a fixed purchase; an Aeonith Pool **gets the price down first**. |
| **Honey (PayPal's deals brand)** | Honey finds existing coupons; Aeonith *creates* a discount by bringing buyers together. |
| **PayPal Business (SMB merchants)** | Small merchants are both buyers (supplies) and sellers (bidding for group demand) |

**Positioning recommendation:** pitch Aeonith as **a standalone app built on PayPal** (so it's judged as a complete product). End the video with one line: *"Tomorrow this could be a button in PayPal Pools or Venmo: 'Make this a group deal.'"* That shows we understand PayPal's own products without depending on gated APIs.

### 2.4 Scoring self-assessment (honest)
| Criterion | Score we can reach | What gets us there | What would drop us |
|---|---|---|---|
| Technological Implementation | 4–5 | Real sandbox holds, partial capture, void, Payouts, verified webhooks. Claude with structured outputs. A clearing engine with tests. | Fake or mocked PayPal calls; the AI only decorating |
| Design | 4 | One approval per person, a live "funded units" bar, a sealed-bid reveal, savings receipts | Admin-heavy screens, jargon ("clearing", "warrants") in the UI |
| Potential Impact | 4–5 | Cite iChoosr and Solarize as proof the model saves money; a specific US audience | A vague "everyone" audience |
| Innovation | 4 | Funded + agent-native + private + instant settlement; honest about prior art | Claiming to have invented group buying |
| Presentation | 4–5 | A simple story: one family, $399 → $299, nobody overpays | Explaining mechanism theory in the video |

---

## Part 3. What AI does and what PayPal does (precise)

### 3.1 AI (Claude), with an earned role at each step
| Step | AI job | Why AI (not a form) |
|---|---|---|
| Intake | Turns "2 Chromebooks for my kids, under $350, before school starts" into item, specs, quantity, limit and deadline. Asks one follow-up if something is unclear. | Messy natural language; catches spec mismatches ("Chromebook" vs a "Chromebook Plus" model) |
| Grouping | Matches you to a compatible group and explains why in one sentence | Fuzzy matching across specs and deadlines |
| Seller agents | (Simulated merchants) read the demand signal and their own cost sheet, then produce a sealed offer with promises (warranty, delivery) | Demonstrates agent-to-agent commerce; any real merchant agent could follow the same protocol |
| Verification | Checks the winning offer's promises against what buyers asked for; flags duplicate or shady sellers | Reading listings and spotting mismatches is a language task |
| Explanations | Receipts and the summary for the admin: "Seller B's warranty is 6 months, below the 12 you required" | Builds trust |
| **Not AI** | Picking the winner, any amount, any PayPal call | Money must be deterministic and auditable; AI agents are known to negotiate poorly ([AgenticPay](https://arxiv.org/abs/2602.06008)) |

### 3.2 PayPal: every capability and why it's essential
| PayPal capability | What it does in Aeonith | Without it |
|---|---|---|
| **Orders v2 `intent: AUTHORIZE`** | Each buyer approves one hold at their limit; money is reserved, not taken | Demand is just "interest", and sellers won't bid low |
| **Partial capture** (`final_capture: true`) | Charges the winning price (≤ hold) | People would pay their limit, not the group price |
| **Void** | Releases the holds of buyers below the price, or everyone's if the deal fails | People could get stuck paying for a failed deal |
| **Reauthorize** | Extends holds past the 3-day honor period (an authorization lasts up to 29 days) ([PayPal docs](https://developer.paypal.com/docs/checkout/standard/customize/authorization-honor/)) | Only very short groups would work |
| **Payouts** | Pays the winning seller after capture | We couldn't pay a seller chosen *after* buyers paid |
| **Webhooks + signature verification** | Keeps our records in sync (e.g., a buyer cancels in PayPal) | State would drift; a security risk |
| **PayPal-Request-Id** | Retries never double-charge | Double charges on network errors |
| **Buyer protection** (production) | Covers the buyer if goods don't arrive | Buyers would have less reason to trust it |
| Venmo (US, roadmap) | Group members pay with Venmo | — |

**The one-line answer to "why PayPal?":** *PayPal can hold money now, charge less later, or release it entirely. That three-way choice is exactly what a group deal needs. A normal "pay now" button can't do it.*

---

## Part 4. US & EU: market, legal and practical checks

### 4.1 Who it's for (US first)
Pick **one** hero audience for the demo. Options compared:

| Audience | Pain | Ticket per person | Demo-ability | Verdict |
|---|---|---|---|---|
| **Parents in a school community** (devices, instruments, sports gear for their own kids) | Back-to-school costs; districts get discounts families don't | $100–$500 | Excellent, relatable | **Recommended hero** |
| Small US businesses (cafés buying espresso machines, Etsy sellers buying packaging) | No volume pricing; PayPal's core merchant base | $200–$2,000 | Good | **Second persona** (one line in the video) |
| Neighbours buying home upgrades (heat pumps, EV chargers, solar) | Big costs | $2,000–$20,000 | Weak: needs site surveys, and holds are too large | Roadmap only |
| Online communities (hobby gear, Discord/Reddit groups) | Niche gear is expensive | $100–$1,000 | Good | Roadmap |

Consumer surveys show trust breaks down for agent purchases **above about $500** and that 59% want to approve each purchase ([Forbes Oct 2026](https://www.forbes.com/sites/jordanmckee/2026/10/01/agentic-commerce-has-a-consumer-trust-problem/), [Worldpay](https://worldpay.com/en/insights/articles/agentic-commerce-report-2026-out-now)). **Keep demo holds under $500 per person**, with one explicit approval.

### 4.2 Legal and regulatory checklist (not legal advice: flag in README as "production considerations")
| Topic | US | EU | Our handling |
|---|---|---|---|
| **Holding and moving other people's money** | State money-transmitter laws may apply if we take buyers' money and pass it to sellers | PSD2/PSD3 payment-institution rules; the "commercial agent" exemption is narrow | **Aeonith is the merchant of record**: we *sell* the goods (buying from the winning seller), so we're a retailer, not a money transmitter. Production route: PayPal's multiparty/platform onboarding so funds go straight to sellers. |
| **AI disclosure** | California bot-disclosure law; FTC on deceptive AI | **EU AI Act Art. 50 applies since 2 Aug 2026**: users must be told they're talking to an AI ([jorijn.com](https://jorijn.com/en/blog/eu-ai-act-website-chatbot-disclosure-august-2026/), [aiweekly](https://aiweekly.co/alerts/european-commission-sets-august-2-ai-transparency-deadline)) | A visible "AI assistant" label; the seller agents are labelled as AI |
| **Consumer rights** | FTC rules on clear pricing; state auto-renewal laws (n/a) | **14-day withdrawal right** for online purchases (Consumer Rights Directive); Omnibus price transparency | Show total price and terms before the hold; returns policy is a required seller promise |
| **Privacy of price limits** | State privacy laws (CCPA/CPRA) | **GDPR**: the price limit is personal data | Store limits encrypted and minimally; never share with sellers; delete after settlement |
| **Holds on debit cards / balances** | Holds reduce the buyer's available funds | Same, plus SCA (PayPal handles it) | Short windows (24–72 h), a clear "your money is reserved, not spent" message, release immediately on failure |
| **Competition law** | Buyer groups are generally fine for consumers | Same; purchasing cooperation guidelines | Sealed bids also prevent seller collusion via chat |
| **Platform terms for AI agents** | eBay bans unapproved buy-for-me agents | — | Sellers opt in to Aeonith; no scraping or ordering on third-party marketplaces |

### 4.3 PayPal sandbox setup for US/EU (**action needed**)
- Your current sandbox test accounts are **India (IN)**. PayPal India has restrictions (for example, no payments between two Indian accounts), which could break our flow and doesn't match a US/EU product.
- **Fix:** create a **US Business** (seller/merchant of record) and a **US Personal** (buyer) sandbox account, plus optionally a **German (EUR)** buyer to show EU support. Create a new sandbox app linked to the US Business account. PayPal's own guidance is that buyer and merchant should be in the same country and currency for basic testing.
- Currency: **USD** for the demo; EUR as configuration.

---

## Part 5. Failure modes and edge cases (every situation)

| Situation | What happens | Who's protected and how |
|---|---|---|
| Not enough buyers by the deadline | No feasible offer → **void all holds** | Buyers pay nothing |
| Bids too high for everyone's limits | Same → void all | Buyers |
| Some buyers' limits below the winning price | Their holds voided; others charged the winning price | Low-limit buyers pay nothing |
| Buyer cancels before close | Hold voided; they leave the group; numbers update | Buyer |
| Buyer's hold fails at capture (card expired, honor period lapsed) | Reauthorize; if it still fails, drop them and recheck the seller's minimum. If below the minimum, rerun with the next feasible offer or void all. | Group and seller |
| Seller's promises don't match the request | AI flags it → admin rejects → next best feasible offer | Buyers |
| Same seller bidding under fake names | Flagged by checks on identity and duplicate listings | Fair competition |
| Seller text tries to manipulate the AI | Seller text never reaches payment code; offers are strict data | Everyone |
| Winning seller fails to deliver | Production: PayPal buyer protection plus refunds by Aeonith as merchant of record. Demo: show a refund path if time allows. | Buyers |
| Admin approves something wrong | Code still enforces charge ≤ hold; full audit log | Buyers |
| Double-click or network retry | Request IDs make calls idempotent | Buyers |
| PayPal webhook spoofed | Signature verification rejects it | Platform |

---

## Part 6. Refinements I recommend (fine-tuning the idea)

1. **Lead with the money problem, not the research.** Headline: *"Bulk prices for families. Your money stays on hold until the deal is done."* The price-privacy point becomes the "why it's smart" line, not the opening.
2. **Credit iChoosr and Solarize openly.** "Proven to save households money, now for any purchase, run by AI agents, settled by PayPal in minutes." This turns the biggest objection into evidence.
3. **Hero audience: US parents buying for their own kids.** Second persona: small businesses (one line).
4. **One clear rule for the user:** "You'll never pay more than your limit, and you pay the same price as everyone else."
5. **Sellers are opt-in merchants.** Make the seller side a tiny open spec ("Aeonith Offer Protocol": demand in, sealed offer out), so it's clearly agent-to-agent commerce any merchant can join. Seller agents are simulated in the demo, and we say so.
6. **Use a real catalog where it helps.** Channel3 gives real products, specs and retail prices for the item being bought (the "retail $399" anchor). This also targets the Channel3 sponsor prize.
7. **Keep holds small and windows short:** under $500 per person, 24–72 h groups.
8. **Remove jargon from the UI:** "secret bid" instead of "sealed schedule"; "promises" instead of "warrants"; "final price" instead of "clearing price".
9. **Future slide:** "A 'Make it a group deal' button in PayPal Pools, Venmo or Honey."

---

## Part 7. Go / no-go

**Recommendation: GO.** The idea is grounded in a proven real-world model (iChoosr, Solarize), adds a genuinely new combination (funded, agent-native, private, instant PayPal settlement), and uses PayPal more deeply than typical entries. It also maps directly onto two dedicated prizes, Agentic Commerce and PayPal + AI.

**Before coding, decide:**
1. Hero audience: US parents (recommended) or small businesses?
2. Create US sandbox accounts and a new sandbox app (needs your OK)?
3. Sponsor add-on: Channel3 for real product data (recommended; the key already works), with Render for hosting?

## Sources
Prior art: [iChoosr (Warwickshire)](https://www.warwickshire.gov.uk/news/article/1555/are-you-paying-too-much-for-your-gas-and-electricity-bills-warwickshire-switch-and-save-is-back-to-help-you) · [iChoosr CMA submission](https://assets.publishing.service.gov.uk/media/54b93afced915d159700000b/iChoosr_submission.pdf) · [PetrolPrices / iChoosr](https://www.petrolprices.com/?p=10060802) · [Peterborough collective switching](https://democracy.peterborough.gov.uk/documents/s12609/6.%20Collective%20Energy%20Switching.pdf) · [CESA Solarize](https://cesa.org/?p=13366) · [SolarReviews: Solarize](https://www.solarreviews.com/blog/understanding-how-solarize-energy-campaigns-work) · [Solarize Cincy](https://solarunitedneighbors.org/?p=3598) · [ICMA bulk solar](https://www.icma.org/sites/default/files/306455_Local%20Governments%20and%20Bulk%20Solar%20Purchasing%20Fact%20Sheet.pdf) · [EnergySage group buy](https://www.energysage.com/partners/group-buy-solar-programs-how-get-right-price) · [Pinduoduo vs Temu](https://www.globalsources.com/knowledge/pinduoduo-vs-temu/) · [Tracxn group buying](https://tracxn.com/d/trending-business-models/startups-in-group-buying/__p6rH5289aNHEdjwp7-zCVwpv2veLyXmuELepw8Duocc/companies) · [Fairmarkit](https://fairmarkit.com/reverse-auctions) · [FedBid](https://en.wikipedia.org/wiki/FedBid) · [eBay agent ban](https://www.cyblance.com/auction/should-your-auction-platform-let-ai-agents-bid-ebay-just-said-no-should-you/)

PayPal: [Agentic commerce launch](https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping) · [Google UCP](https://investor.pypl.com/news-and-events/news-details/2026/From-Search-to-Checkout-PayPal-Supports-Trusted-AI-Checkout-with-Google/default.aspx) · [AI shopping protocols](https://newsroom.paypal-corp.com/2026-01-22-Making-Sense-of-the-AI-Shopping-Protocol-Moment) · [Pools relaunch (TechCrunch)](https://techcrunch.com/2024/11/14/paypals-new-feature-will-let-you-easily-split-expenses-with-family-and-friends) · [Shopifreaks](https://www.shopifreaks.com/paypal-brings-back-money-pools/) · [Auth honor period](https://developer.paypal.com/docs/checkout/standard/customize/authorization-honor/) · [Payouts](https://docs.paypal.ai/growth/payouts/overview) · [Platform Payouts](https://developer.paypal.com/limited-release/platform-payouts)

Regulation and trust: [EU AI Act Art. 50 (jorijn.com)](https://jorijn.com/en/blog/eu-ai-act-website-chatbot-disclosure-august-2026/) · [AI Weekly](https://aiweekly.co/alerts/european-commission-sets-august-2-ai-transparency-deadline) · [Forbes: trust problem](https://www.forbes.com/sites/jordanmckee/2026/10/01/agentic-commerce-has-a-consumer-trust-problem/) · [Worldpay 2026](https://worldpay.com/en/insights/articles/agentic-commerce-report-2026-out-now)

Research: see [CONCEPT_BRIEF.md](CONCEPT_BRIEF.md) sources.

*Not legal advice. Several web sources are secondary; PayPal Pools' current status and Agent Ready availability are unconfirmed.*
