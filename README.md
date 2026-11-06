# Aeonith

**Compete → hold → prove → pay.** Tell your agent what you need done and the most you'll pay. Verified providers' AI agents compete for the job with **sealed bids**. **PayPal holds your money** (reserved, not charged) and pays the winner only when the job is **proven done**. Alone, you get competing quotes without haggling. With neighbours, you also get the group price.

Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/). **Sandbox only**: no real money moves.

## The problem
- Home repair was the **#1 consumer complaint of 2025** in Tennessee, at a record high ([NewsTalk 98.7](https://newstalk987.com/?p=1104138)). The FTC logged **81,925 home-improvement fraud reports in 2024** ([FinanceBuzz](https://financebuzz.com/contractor-scams)). Lost deposits are a top issue ([WWIS](https://wwisradio.com/wisconsin-consumers-top-complaints-of-2025)).
- California caps contractor down payments at **$1,000 or 10%, whichever is less** ([CSLB](https://www.cslb.ca.gov/Resources/IndustryBulletins/2022/Industry_Bulletin_Progress_Payment_Restrictions.pdf)). Deposits are risky enough that the law steps in.
- Small buyers get one quote, often on the doorstep, and pay up front. AI shopping agents make it worse if they chat with sellers, because they leak what you'd pay ([2026 study](https://arxiv.org/abs/2604.26220)).

## How it works
| Step | What happens | Who decides |
|---|---|---|
| 1. Ask | “Water heater leaking, fix by Friday, max $400, licensed only.” Claude turns it into a structured request. | AI (structured outputs) |
| 2. **Hold** | You approve **one PayPal hold** at your limit (Orders v2 `intent: AUTHORIZE`). | You, in PayPal |
| 3. **Compete** | Provider agents see only the job, area, number of funded homes and deadline. **Never your limit.** Each submits `SHA-256(offer + salt)`. | Provider agents |
| 4. Reveal & award | After close, providers reveal and each offer is checked against its hash. Deterministic clearing picks the best offer that meets your requirements. In **Together** mode everyone pays the same price, and anyone below it is released. | Code |
| 5. **Prove** | The provider photographs the finished job with a **one-time code** in frame. Code checks reuse and freshness; Claude vision checks the code and the work. | Code + AI advise, you confirm |
| 6. **Pay** | The **policy gate** allows capture only of the final price, only ≤ your hold, only after proof or your confirmation. Then: partial capture (the rest is released to you) → **Payouts** to the provider. | Code + PayPal |

Every step is written to a **hash-chained audit log**. Editing any past entry breaks the chain.

### What's technically new
- **Commit–reveal sealed bids:** nobody, including Aeonith, can read or leak a bid early, and a revealed bid can't be changed.
- **Offer Protocol as an MCP server** (`npm run mcp`): any MCP-capable provider agent can discover funded jobs and bid. The protocol has no field that can carry a buyer's limit, and a test proves it.
- **Payment policy gate** in front of every PayPal call; the AI can never move money ([src/core/policy.ts](src/core/policy.ts)).
- **Proof Challenge** with code checks + AI vision ([src/core/proof.ts](src/core/proof.ts)).
- **Together mode:** uniform-price clearing with a **best-of guarantee**, so you never pay more than your own solo quote ([src/core/clearing.ts](src/core/clearing.ts)).
- **Tamper-evident audit log** ([src/core/audit.ts](src/core/audit.ts)).

## Built with
- **PayPal (sandbox):**
  - Orders v2: `AUTHORIZE`
  - Payments v2: partial capture with `final_capture`, void, reauthorize, refund
  - **Payouts v1**
  - Webhooks with `verify-webhook-signature`
  - `PayPal-Request-Id` idempotency
- **AI:** Claude (`claude-opus-5-5`) via the Anthropic TypeScript SDK, used for:
  - structured-output intake
  - provider agent pitches
  - promise checks
  - vision proof checks

  Every AI step has a deterministic fallback, so the app runs without a key.
- **Model Context Protocol** TypeScript SDK (provider-facing MCP server)
- **Bryntum Scheduler** (booked jobs view; trial package, so it shows a watermark)
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
cp .env.example .env      # fill PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (sandbox), ADMIN_TOKEN; ANTHROPIC_API_KEY optional
npm run dev               # http://localhost:3000
npm test                  # 15 tests: clearing, commit–reveal, policy gate, audit chain, proof, reauthorize, full solo + group flows
npm run sandbox:check     # confirms your PayPal sandbox keys work (prints no secrets)
```
Without sandbox credentials the app runs in a clearly labelled **SIMULATED PayPal** mode, for local development only. Delete `data/state.json` to reset the demo.

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
- The provider agents in the demo are **simulated** (our cost models plus Claude-written pitches). The protocol is real and open.
- A photo proves **visible completion**, not workmanship quality. PayPal Purchase Protection and refunds still apply.
- The demo console shows all roles on one page. A production app would separate buyer, provider and admin views.
- In the demo Aeonith is merchant of record and pays providers with Payouts. Production would use PayPal's multiparty/platform onboarding.
- Sandbox only. Not legal advice.

## Docs
[Solution design](docs/SOLUTION_DESIGN.md) · [Deep analysis](docs/DEEP_ANALYSIS.md) · [Research](docs/CONCEPT_BRIEF.md) · [Security](SECURITY.md) · [Hackathon notes](HACKATHON.md)

## License
[MIT](LICENSE)
