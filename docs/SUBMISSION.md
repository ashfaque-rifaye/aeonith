# Devpost submission: Aeonith (copy-paste ready)

> Fill the `[[…]]` placeholders once the repo, the hosted demo and the YouTube video exist. Submit by **Wed Nov 11** (hard deadline Thu Nov 12, 12:00 pm PT).

## Project name
Aeonith

## Elevator pitch (≤ 200 chars)
Name the job and your max price. Pros' AI agents compete with sealed bids. PayPal holds your money and pays only on photo proof. Alone or with neighbours.

## Tagline options
- Your money, held until it's done.
- Fair prices. Paid on proof.

## About the project (story)

### Inspiration
Home repair was **Tennessee's #1 consumer complaint in 2025, at a record high**. The FTC logged **81,925 home-improvement fraud reports in 2024**, and "failure to return deposits" tops the lists. California even caps contractor down payments at **$1,000 or 10%**. Meanwhile small buyers get one quote, often on the doorstep, and pay up front.

AI shopping agents could help, but a 2026 study showed that when an agent chats with a seller, the seller can work out the most you'd pay. We wanted the opposite: **agents that compete for you without ever learning your limit, and money that only moves on proof.**

### What it does
1. **Ask.** "Water heater leaking, fix by Friday, max $400, licensed only." Claude turns it into a structured, funded request.
2. **Hold.** You approve one **PayPal hold** (Orders v2 `AUTHORIZE`) at your private limit. It's reserved, not paid.
3. **Compete.** Pros' AI agents see only the job, area and number of funded homes, never your limit. Each submits a **sealed bid**: a SHA-256 commitment that nobody, including us, can read or change before the close.
4. **Award.** Bids are revealed and checked against their commitments. Deterministic clearing picks the best offer that meets your requirements, and Claude checks the winner's promises.
5. **Prove.** The pro photographs the finished job with a **one-time code** in frame. Code checks reuse and freshness; Claude vision checks the code and the work.
6. **Pay.** A **policy gate** allows a partial capture only of the final price, only ≤ your hold, only after proof. The rest is released to you, and **PayPal Payouts** pays the pro.

**Together mode:** neighbours who need the same job join with their own holds. A provider's single trip makes the per-home price lower, everyone pays the same price, anyone below it is released, and a **best-of guarantee** means you never pay more than a solo quote you already have.

**Beyond services: item pools.** The same loop works for goods:
- **Car pool:** five buyers want the same model and trim from one dealership. Each holds only a **$500 refundable deposit**, while their private max price decides whether they're in. Dealer agents seal per-car bids, and the winner gets 4 committed buyers at **$31,980/car**. At delivery (a VIN photo with the one-time code) the deposits are captured and applied, and the balance is paid at the sealed price.
- **Bulk order:** eight parents buy the same Chromebook at **$267** against ~$349 retail.
- **Next:** appliances, solar group buys, school orders and small-business restock.

**How PayPal earns:**
- a processing fee on every capture
- a Payouts fee on every seller payment
- Pay Later on big-ticket balances
- new PayPal accounts on both sides: every pool member approves a PayPal hold, and every seller is onboarded as a PayPal merchant

The eight demo scenarios move about $4,976 through 18 captures and 5 payouts, worth roughly $244 in PayPal fees. Full breakdown: `docs/USE_CASES.md`.

### How we built it
- **PayPal (sandbox):**
  - Orders v2 `AUTHORIZE`
  - Payments v2: partial capture with `final_capture`, void, **reauthorize** after the 3-day honor period, refund
  - **Payouts** to the provider
  - Webhooks with `verify-webhook-signature`
  - `PayPal-Request-Id` idempotency
- **AI:** Claude (`claude-opus-5-5`) for structured-output intake, provider-agent pitches, promise checks and **vision proof checks**. The AI advises; code decides. Every AI step has a deterministic fallback.
- **Agent-to-agent:** an open **Offer Protocol** exposed over HTTP and as an **MCP server**, so any MCP-capable provider agent can discover funded jobs and bid.
- **Trust:**
  - commit–reveal sealed bids
  - a payment policy gate in front of every PayPal call
  - a **hash-chained, tamper-evident audit log**
  - a Sybil check for duplicate provider identities
- **Experience:** a real-time **three.js** 3D claw that *holds your card* and follows the job (grips when held, sparks during bidding, scans during proof, drops the card to the pro on payment), plus **GSAP** motion and **Bryntum Scheduler** for booked jobs.
- **Stack:** Node 22, TypeScript, Express 5, Zod 4. 16 automated tests cover clearing, commit–reveal, the policy gate, the audit chain, proof, reauthorization, and the full solo, group and car-pool (deposit) flows.

### Challenges
- Making the money path impossible for an AI to bend: seller text never reaches payment code; only schema-checked offers do, and PayPal itself refuses captures above the hold.
- Fair clearing for groups (uniform price, minimum units, best-of guarantee) that stays simple enough to explain in one sentence.
- Proof that's hard to fake without heavy infrastructure: a one-time code, reuse detection by hash, camera timestamps, and AI vision, with "not verifiable" shown honestly instead of guessed.

### Accomplishments
- A complete, tested market loop on real PayPal rails: **compete → hold → prove → pay**.
- Sealed bids that even the operator can't peek at.
- A UI where the 3D scene *is* the state machine.

### What we learned
Authorization holds are an underrated trust primitive: hold, partial capture, void and reauthorize let you build fair marketplaces without anyone ever sending a deposit to a stranger.

### What's next
- Real provider onboarding through PayPal's multiparty/platform flows.
- Licence verification against state boards.
- Venmo as a funding option.
- A "Make it a group job" button inside PayPal or Venmo.

### Honest limits
- Provider agents in the demo are simulated (the protocol is real).
- A photo proves visible completion, not workmanship quality.
- Sandbox only.
- Not legal advice.

## Built with
paypal, paypal-orders-v2, paypal-payments, paypal-payouts, paypal-webhooks, claude, anthropic, model-context-protocol, typescript, node.js, express, zod, three.js, gsap, bryntum, render

## Links
- Repo: [[GitHub URL]]
- Demo: [[Render URL]]
- Video: [[YouTube URL]]

## Testing instructions for judges
1. Open [[demo URL]] (or run locally: `npm install && cp .env.example .env && npm run dev`).
2. On the job page, click **Hold $400 with PayPal** and log in with the sandbox buyer **[[sb-nsxra53758944@personal.example.com / password]]**.
3. Follow the button on the page:
   1. **Invite pros' agents to bid**
   2. **Unseal bids & pick winner**
   3. **Pro: start job · get code**
   4. Upload any photo
   5. **Confirm the job is done**
   6. **Release payment**
4. See the captures, payout and the hash-chained **Trust log**.
5. Try **"Test: let an agent overcharge"**: the policy gate blocks it.

## Sponsor tools to tick
- Bryntum (Scheduler: booked jobs)
- Render (hosting), if deployed there
