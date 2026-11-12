# Aeonith

**Buy together. Pay on proof.** Your AI agent pools buyers who want the same kind of thing from the same seller (cars from one dealership, a street's gutter job, a batch of laptops), makes sellers' AI agents compete with **sealed bids**, and lets **PayPal hold the money** until the deal is delivered. Alone, you get competing sealed quotes without haggling and pay only on proof. Together, you also get the fleet price.

Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/). **Sandbox only**: no real money moves.

## The problem
- Home repair was the **#1 consumer complaint of 2025** in Tennessee, at a record high ([NewsTalk 98.7](https://newstalk987.com/?p=1104138)). The FTC logged **81,925 home-improvement fraud reports in 2024** ([FinanceBuzz](https://financebuzz.com/contractor-scams)). Lost deposits are a top issue ([WWIS](https://wwisradio.com/wisconsin-consumers-top-complaints-of-2025)).
- California caps contractor down payments at **$1,000 or 10%, whichever is less** ([CSLB](https://www.cslb.ca.gov/Resources/IndustryBulletins/2022/Industry_Bulletin_Progress_Payment_Restrictions.pdf)). Deposits are risky enough that the law steps in.
- Small buyers get one quote, often on the doorstep, and pay up front. AI shopping agents make it worse if they chat with sellers, because they leak what you'd pay ([2026 study](https://arxiv.org/abs/2604.26220)).

### Three use cases, one engine
| | What happens | PayPal |
|---|---|---|
| **1. Cars, bought together** (lead) | Neighbours who want Toyotas (different models!) from one dealership pool. Each joins with a **$500 refundable deposit**. Dealers' agents seal **one fleet discount off MSRP** for the whole group; each buyer pays their own model's price. Buyers whose private max is below their model's price are released: $0. | Deposit `AUTHORIZE` → capture applied at delivery, void for those out → Payouts |
| **2. Hire a pro, pay on proof** | Licensed pros send sealed quotes (the agent phones pros who aren't on Aeonith yet if there are too few). You **book the winner** and PayPal holds **exactly the sealed price**. Video proof checked by NVIDIA vision; the pro requests payment; anything above the sealed price is **blocked, escalated by a call, and flagged**. | `AUTHORIZE` at booking (JS SDK popup) → capture only the sealed price → Payouts |
| **3. Autopilot** (add-on) | Save PayPal once with an emergency budget. A leak sensor files the job at 3 a.m. and funds it on the saved wallet, no redirect; nobody is sent until you approve on the agent's call. | **Vault v3** → merchant-initiated `AUTHORIZE` with `vault_id` |

## How it works
| Step | What happens | Who decides |
|---|---|---|
| 1. Ask | “Water heater leaking, fix by Friday, max $400, licensed only.” The AI agent (NVIDIA Nemotron, or Claude) turns it into a structured request. | AI (schema-validated output) |
| 2. **Hold** | Pools: each buyer approves a refundable deposit hold. Hire-a-pro: after sealed quotes, you book the winner and approve a hold of **exactly the sealed price**, in PayPal's own popup (JS SDK, Orders v2 `intent: AUTHORIZE`). | You, in PayPal |
| 3. **Compete** | Provider agents see only the job, area, number of funded homes and deadline. **Never your limit.** Each submits `SHA-256(offer + salt)`. | Provider agents |
| 4. Reveal & award | After close, providers reveal and each offer is checked against its hash. Deterministic clearing picks the best offer that meets your requirements. In **Together** mode everyone pays the same price, and anyone below it is released. | Code |
| 5. **Prove** | The provider records **video proof** in the Aeonith camera: every frame is stamped with the job's live session and time (2-minute window) and fingerprinted, so an old or reused video can't pass. NVIDIA vision (Nemotron VL) checks that it is this job, finished, with observations, concerns and a confidence score. Photo/video upload goes through the same checks. | Code + AI advise, you confirm |
| 5b. **Request payment** | The provider asks to be paid. If the amount is above the sealed price, the policy gate refuses the capture, your agent **calls you**, PayPal captures only the sealed price, and the overcharge goes on the provider's record. You can also release payment yourself. | Code + your voice/tap |
| 6. **Pay** | The **policy gate** allows capture only of the final price, only ≤ your hold, only after proof or your confirmation. Then: partial capture (the rest is released to you) → **Payouts** to the provider. | Code + PayPal |

Every step is written to a **hash-chained audit log**. Editing any past entry breaks the chain.

### Agentic features on PayPal rails
| Feature | What happens | PayPal under it |
|---|---|---|
| **Autopilot: the home files the job itself** | You save PayPal once with an emergency budget (e.g. $450, plumbing). A leak sensor reports water at 3 a.m. Aeonith files the job, places a **hold on your vaulted PayPal with no redirect**, and pros' agents seal their bids before you wake up. Nobody is dispatched until you approve on a call. | **Vault v3** setup token → payment token, then **Orders v2 `AUTHORIZE` with `vault_id`** (merchant-initiated). The policy gate caps it at your budget and approved trades |
| **Voice Agent** | Your agent rings you at the two money moments: "PayPal is holding $450. Lone Star won at $360, 12-month warranty. Say *approve* to book." and later "Proof passed. PayPal captures $360 and releases $90. Say *release payment*." Spoken (Web Speech) or tapped. Approval is decided by deterministic phrase matching, never by AI, and each answer is **SHA-256 fingerprinted into the audit chain**. | Your spoken "release payment" is the human approval the policy gate requires before **Payments v2 capture** and **Payouts** |
| **Video proof** | The pro records the finished work in the Aeonith camera. Frames are stamped with a session that exists only from that moment and **expires in 2 minutes**, so an old photo or video can't pass. NVIDIA vision checks the work frame by frame and shows what it saw. | Proof is the gate for **capture**; no proof, nothing moves |
| **Overcharge call** | The pro asks for more than the sealed price. The gate refuses that capture, your agent calls ("They asked for $380. You booked them at $336, so I blocked the extra $44"), and on "pay the agreed price" PayPal captures only $336 and the pro is flagged. | **Payments v2 capture** can never exceed the sealed price |
| **Ask, by voice** | Leave a voice note; NVIDIA Nemotron structures it and asks 2–3 follow-up questions (trim, trade-in, access…) that change the offers. | Better requests, fewer surprises at capture |
| **Recruiting calls** | Too few bids? Your agent phones local pros who aren't on Aeonith yet and pitches the **already-funded** job: "PayPal is holding $400 on the buyer's account." Those who accept seal a bid through the same protocol. | Winners are paid by **Payouts to their email**: no PayPal account needed in advance; they claim the money (and join PayPal) |
| **Activity on every job** | One readable timeline of every PayPal call (order, authorization or vaulted authorization, reauthorization, capture with `final_capture`, void, Payouts batch, with IDs), plus every agent, AI and policy decision. | Read straight from the audit chain |

### What's technically new
- **Commit–reveal sealed bids:** nobody, including Aeonith, can read or leak a bid early, and a revealed bid can't be changed.
- **Offer Protocol as an MCP server** (`npm run mcp`): any MCP-capable provider agent can discover funded jobs and bid. The protocol has no field that can carry a buyer's limit, and a test proves it.
- **Payment policy gate** in front of every PayPal call; the AI can never move money ([src/core/policy.ts](src/core/policy.ts)).
- **Catalog pools:** buyers pick different models from one seller; sellers seal one fleet discount; each buyer is cleared at their own model's price ([src/core/clearing.ts](src/core/clearing.ts) `clearCatalog`).
- **Quote-first booking:** sealed quotes before any money moves; the hold equals the sealed price ([src/core/policy.ts](src/core/policy.ts)).
- **Proof** with stamped live sessions, reuse detection + AI vision ([src/core/proof.ts](src/core/proof.ts)).
- **Together mode:** uniform-price clearing with a **best-of guarantee**, so you never pay more than your own solo quote ([src/core/clearing.ts](src/core/clearing.ts)).
- **Tamper-evident audit log** ([src/core/audit.ts](src/core/audit.ts)).

## Built with
- **PayPal (sandbox):**
  - **PayPal JS SDK** buttons (popup approval) + Orders v2: `AUTHORIZE` (buyer-approved), and `AUTHORIZE` with **`vault_id`** (merchant-initiated, Autopilot)
  - **Vault v3**: setup tokens + payment tokens (save PayPal once for Autopilot)
  - Payments v2: partial capture with `final_capture`, void, reauthorize, refund
  - **Payouts v1**
  - Webhooks with `verify-webhook-signature`
  - `PayPal-Request-Id` idempotency
- **AI:** **NVIDIA Nemotron** (`nvidia/nemotron-3.5-super-vl-120b-a12b`, text + vision) through the NVIDIA API catalog (build.nvidia.com), used for:
  - structured intake (JSON validated with Zod)
  - provider agent pitches
  - promise checks
  - vision proof checks

  **Every NVIDIA request is metered**: credits count down from your balance, with tokens, latency and purpose per call. The count is persisted, shown on the Trust page, and available at `GET /api/ai/usage` and via `npm run nvidia:check`. Claude (`claude-opus-5-5`) is supported as an alternative provider. Every AI step has a deterministic fallback, so the app runs without any key.
- **Channel3** product catalog API: live search for the exact product a pool buys (real images and retail prices), e.g. eight parents pooling for one Chromebook model
- **APIMatic**: [`docs/openapi.yaml`](docs/openapi.yaml) generates the TypeScript SDK in [`sdk/typescript`](sdk/typescript). Sellers' own agents bid through it: the MCP server and [`scripts/seller-agent.ts`](scripts/seller-agent.ts) (seal with SHA-256, reveal after close) use the SDK, not hand-written HTTP
- **Render** ([render.yaml](render.yaml), live at https://aeonith.onrender.com): web service with a persistent disk; a background worker running a pro's SDK bidding agent over Render's private network; a cron job every 6 hours that reauthorizes PayPal holds past the 3-day honor period and releases holds on requests that closed with no winner. `node scripts/render-env.mjs` copies secrets from `.env` to Render and deploys
- **Model Context Protocol** TypeScript SDK (provider-facing MCP server)
- **AG Grid Enterprise**: every sealed offer side by side on each job (so buyers can check the clearing), plus the Trust page audit log (filters, row grouping) and AI usage grid
- **Bryntum Scheduler**: a booked pro's slot appears on their schedule on the job page, next to their other Aeonith jobs; the Pros page shows every booked pro (trial package, so it shows a watermark)
- **three.js** (real-time 3D claw that holds the card and follows the job's state), **GSAP + ScrollTrigger** (motion), **Lenis** (smooth scroll)
- Node 22, TypeScript, Express 5, Zod 4

## Design
A full-bleed ember gradient hero with a live 3D claw **holding your card**: the product metaphor, *money held, not paid*. The claw follows the real job status:

| Job state | What the claw does |
|---|---|
| No hold yet | Hangs open |
| Money held | Grips the card |
| Bidding | Sparks circle it as sealed bids arrive |
| Checking proof | An amber scan line sweeps the card |
| Paid | Opens and drops the card to the pro |
| Released | The card slides back out |

The money card on each job page is a mini version of the same scene.

- Top navigation on desktop; a floating tab bar and a sticky next-step button on phones.
- The 3D scene pauses when it's off screen or in a background tab.
- Falls back to a flat glow without WebGL.
- Respects reduced-motion settings.

Visual direction was inspired by the "Daily Bank" fintech concept by Nixtio on Dribbble; all artwork and code here are original.

## Run it
```bash
npm install
cp .env.example .env      # fill PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (sandbox), ADMIN_TOKEN; NVIDIA_API_KEY (or ANTHROPIC_API_KEY) and AG_GRID_LICENSE_KEY optional
npm run dev               # http://localhost:3000
npm test                  # 20 tests: clearing (incl. multi-model fleet pools), commit–reveal, policy gate, audit chain, proof, reauthorize, quote-first booking + overcharge, Autopilot + Voice Agent + video proof
npm run sandbox:check     # confirms your PayPal sandbox keys work (prints no secrets)
npm run nvidia:check      # confirms the NVIDIA key + models work and prints credits left (spends 2 credits)
npm run demo              # with the server running: drives every flow end to end and fills the app with realistic jobs
```
`npm run demo` resets the demo, then runs ten real scenarios through the same HTTP API the UI uses, checking each result:

| Scenario | Outcome |
|---|---|
| Electrical repair | Settled |
| Furnace repair | A 6-month-warranty bid is filtered out and an agent overcharge is blocked, then settled |
| Six-home gutter group | Group price, and one neighbour released |
| TV mount over budget | No bid fits, so the hold is released at $0 |
| Move-out clean | Pro booked, waiting on proof |
| **Car pool**: 5 buyers, same model, one dealership | Each buyer holds only a **$500 refundable deposit**. Dealer agents seal per-car bids, the deposit is applied at delivery, and the balance is due at handover at the sealed price |
| **Bulk items**: 8 parents, one Chromebook order | Batch price $267 against ~$349 retail; one parent released |
| Maria's water heater | Left fresh for a live demo |

The same loop covers services *and* goods (cars, appliances, solar, school orders, small-business restock). See [docs/USE_CASES.md](docs/USE_CASES.md) for every use case, how each PayPal API is used, and **how PayPal earns** from the system.

In sandbox mode it prints each PayPal approval link and waits for you to approve as the sandbox buyer.

Without sandbox credentials the app runs in a clearly labelled **SIMULATED PayPal** mode, for local development only. To reset, run `npm run demo` again or `POST /api/admin/reset` with the admin token.

### Sandbox accounts (US)
| Role | Sandbox account |
|---|---|
| Buyer (approve holds) | `sb-nsxra53758944@personal.example.com` |
| Aeonith (merchant of record, app "Aeonith") | `sb-llat153656226@business.example.com` |
| Provider (receives Payouts) | `sb-rds43c53656224@business.example.com` |

Passwords: Developer Dashboard → Testing tools → Sandbox accounts. Judges' logins will be listed here before submission.

### Let your own agent bid (MCP)
```bash
AEONITH_URL=http://localhost:3000 PROVIDER_ID=acme PROVIDER_NAME="Acme Plumbing" npm run mcp
```
Tools: `list_open_requests`, `submit_sealed_bid`, `reveal_bid`, `get_result`.

## Honest limits
- The provider agents in the demo are **simulated** (our cost models plus AI-written pitches). The protocol is real and open.
- A photo proves **visible completion**, not workmanship quality. PayPal Purchase Protection and refunds still apply.
- The demo console shows all roles on one page. A production app would separate buyer, provider and admin views.
- In the demo Aeonith is merchant of record and pays providers with Payouts. Production would use PayPal's multiparty/platform onboarding.
- Sandbox only. Not legal advice.

## Docs
[Solution design](docs/SOLUTION_DESIGN.md) · [Use cases & PayPal revenue](docs/USE_CASES.md) · [Deep analysis](docs/DEEP_ANALYSIS.md) · [Research](docs/CONCEPT_BRIEF.md) · [Security](SECURITY.md) · [Hackathon notes](HACKATHON.md)

## License
[MIT](LICENSE)
