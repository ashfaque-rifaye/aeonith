# Devpost submission: Aeonith (copy-paste ready)

> Fill the `[[…]]` placeholders once the repo, the hosted demo and the YouTube video exist. Submit by **Wed Nov 11** (hard deadline Thu Nov 12, 12:00 pm PT).

## Project name
Aeonith

## Elevator pitch (≤ 200 chars)
Your AI agent pools buyers, sellers' agents bid blind, and PayPal holds the money until delivery. Cars with neighbours, or a pro for your home: buy together, pay on proof.

## Tagline options
- Buy together. Pay on proof.
- An agent that buys like a crowd and pays like an escrow.

## About the project (story)

### Inspiration
Two everyday purchases are broken the same way. **Buying a car:** dealers save their volume prices for fleets, so five neighbours buying Toyotas one at a time all pay near sticker. **Hiring a pro:** you pay up front and hope. The FTC logged **81,925 home-improvement fraud reports in 2024**, "failure to return deposits" tops complaint lists, and California even caps contractor down payments at **$1,000 or 10%**.

AI shopping agents could help, but a 2026 study showed that when an agent chats with a seller, the seller can work out the most you'd pay. We wanted the opposite: **agents that pool buyers and make sellers compete without ever learning anyone's max price, and money that only moves on proof, held by PayPal, not by us.**

### What it does
**1. Cars, bought together (lead use case).** Maria leaves a voice note: "A RAV4 Hybrid, max $35,500, Austin." NVIDIA Nemotron structures it and asks the follow-ups a good salesperson would (trim, trade-in, financing). Her neighbours want **different models from the same dealership** (Camry, Corolla Cross, Grand Highlander). Each joins with a **$500 refundable deposit** approved in PayPal's own popup (Orders v2 `AUTHORIZE`). Dealers' AI agents seal **one fleet discount off MSRP** for the whole group (SHA-256 commit–reveal). Code picks the winner (8.7% off every model in the demo); each buyer pays their own model's discounted price; anyone whose private max is below it is released and their deposit voided: $0.

**2. Hire a pro, pay on proof.** Licensed pros send sealed quotes; if there are too few, the agent **phones local pros who aren't on Aeonith yet** and they bid too. Maria books the winner, and PayPal holds **exactly the sealed price**. When the work is done the pro records **video proof**: frames are stamped with a live session that expires in 2 minutes, and NVIDIA vision confirms it's this job, finished. The pro requests payment; when they ask for **$380 instead of the sealed $336**, the policy gate refuses the capture, Maria's **agent calls her**, PayPal captures only $336, pays the pro with **Payouts**, and the overcharge goes on the pro's record.

**3. Autopilot (PayPal Vault, add-on).** Save PayPal once with an emergency budget. A leak sensor at 3 a.m. files the job and places a merchant-initiated hold on the saved wallet (Orders v2 `AUTHORIZE` with `vault_id`), no redirect; pros bid before you wake, and nobody is sent until you approve on the agent's call.

**Why only PayPal:** authorize-now/capture-later is the escrow; partial capture with `final_capture` + void makes "pay exactly the sealed price" automatic; Payouts pays dealers and pros (even ones recruited by phone an hour ago) to an email; Vault makes Autopilot possible; reauthorization and webhooks keep long deals honest; and buyers already have PayPal.

**Also built:** street groups with a best-of guarantee (never pay more than your own solo quote), bulk orders with real products and retail prices from the **Channel3** catalog, an MCP Offer Protocol any seller's agent can use, AG Grid Enterprise comparisons and audit log, a Bryntum Scheduler of booked jobs, a tamper-evident hash-chained audit log, and a light/dark UI.

**How PayPal earns:**
- a processing fee on every capture
- a Payouts fee on every seller payment
- Pay Later on big-ticket balances
- new PayPal accounts on both sides: every pool member approves a PayPal hold, and every seller is onboarded as a PayPal merchant

The eight demo scenarios move about $4,976 through 18 captures and 5 payouts, worth roughly $244 in PayPal fees. Full breakdown: `docs/USE_CASES.md`.

### How we built it
- **PayPal (sandbox):**
  - Orders v2 `AUTHORIZE`, plus **merchant-initiated `AUTHORIZE` on a vaulted wallet** (Autopilot)
  - **Vault v3** setup tokens and payment tokens
  - Payments v2: partial capture with `final_capture`, void, **reauthorize** after the 3-day honor period, refund
  - **Payouts** to the provider
  - Webhooks with `verify-webhook-signature`
  - `PayPal-Request-Id` idempotency
- **AI:** **NVIDIA Nemotron** (`nemotron-3.5-super-vl`, text + vision, via build.nvidia.com) for schema-validated intake, provider-agent pitches, promise checks and **vision proof checks**. **Every NVIDIA request is metered** (credits, tokens, latency, purpose) and shown live on the Trust page. Claude is supported as an alternative provider. The AI advises; code decides. Every AI step has a deterministic fallback.
- **Agent-to-agent:** an open **Offer Protocol** exposed over HTTP and as an **MCP server**, so any MCP-capable provider agent can discover funded jobs and bid.
- **Trust:**
  - commit–reveal sealed bids
  - a payment policy gate in front of every PayPal call
  - a **hash-chained, tamper-evident audit log**
  - a Sybil check for duplicate provider identities
- **Experience:** a real-time **three.js** 3D claw that *holds your card* and follows the job (grips when held, sparks during bidding, scans during proof, drops the card to the pro on payment), plus **GSAP** motion, **Bryntum Scheduler** for booked jobs, and **AG Grid Enterprise** for the audit log (filters, row grouping), AI-usage grid and the sealed-offer comparison on every job.
- **Stack:** Node 22, TypeScript, Express 5, Zod 4. 20 automated tests cover clearing, commit–reveal, the policy gate, the audit chain, proof, reauthorization, the full solo, group and car-pool (deposit) flows, and Autopilot → Voice Agent → Live Proof → voice release, including holds blocked outside the Autopilot budget or scope.

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
- Real phone calls (the Voice Agent's script and consent logic are ready; a telephony provider is the next step).
- Real provider onboarding through PayPal's multiparty/platform flows (Partner Referrals needs partner approval).
- Licence verification against state boards.
- Venmo as a funding option.
- A "Make it a group job" button inside PayPal or Venmo.

### Honest limits
- Provider agents in the demo are simulated (the protocol is real).
- A photo proves visible completion, not workmanship quality.
- Sandbox only.
- Not legal advice.

## Built with
paypal, paypal-orders-v2, paypal-payments, paypal-payouts, paypal-webhooks, nvidia, nemotron, nvidia-nim, claude, model-context-protocol, ag-grid, typescript, node.js, express, zod, three.js, gsap, bryntum, render

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
- NVIDIA (Nemotron via the NVIDIA API catalog: intake, pitches, promise checks, vision proof)
- AG Grid (Enterprise: audit log, AI usage, sealed-offer comparison)
- Bryntum (Scheduler: booked jobs)
- Render (hosting), if deployed there
