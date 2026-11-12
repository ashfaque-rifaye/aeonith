# Devpost and YouTube submission: Aeonith (copy-paste ready)

> Deadline: **Thu Nov 12, 2026, 12:00 pm PT**. After it, change nothing (repo, README, video) until winners are announced.
> Two blanks left: the YouTube link `[[YouTube URL]]` and the sandbox buyer password `[[sandbox password]]` (also in the README).

---

## Devpost form

### Project name
Aeonith

### Elevator pitch (≤ 200 chars)
Your AI agent pools buyers, sellers' agents bid blind, and PayPal holds the money until delivery. Cars with neighbours, or a pro for your home: buy together, pay on proof.

### About the project

#### Inspiration
Two everyday purchases are broken the same way. **Buying a car:** dealers save their volume prices for fleets, so five neighbours buying Toyotas one at a time all pay near sticker. **Hiring a pro:** you pay up front and hope. The FTC logged **81,925 home-improvement fraud reports in 2024**, "failure to return deposits" tops complaint lists, and California even caps contractor down payments at **$1,000 or 10%**.

AI shopping agents could help, but a 2026 study showed that when an agent chats with a seller, the seller can work out the most you'd pay. We wanted the opposite: **agents that pool buyers and make sellers compete without ever learning anyone's max price, and money that only moves on proof, held by PayPal, not by us.**

#### What it does
**1. Buy a car together (or any product).** Maria leaves a voice note: "A RAV4 Hybrid, max $35,500, Austin." NVIDIA Nemotron structures it and asks the follow-ups a good salesperson would. Her neighbours want **different models from the same dealership**. Each joins with a **$500 refundable deposit** approved in PayPal's own checkout window (Orders v2 `AUTHORIZE`: held, not charged). Dealers' AI agents seal **one fleet discount** for the whole group (SHA-256 commit–reveal). Code picks the winner: **8.7% off every model, about $2,926 per car, $14,632 for five neighbours**. Anyone whose private max is below their model's price is released and their hold voided: $0. **AG Grid** shows every dealer's sealed offer side by side so anyone can check the math, and for goods, **Channel3's** live catalog finds the exact product a pool buys (e.g. one Chromebook model for eight parents).

**2. Hire a pro, pay on proof.** Licensed pros send sealed quotes. One comes from an outside pro's own agent, which bids through our **APIMatic-generated SDK** (it runs as a **Render** background worker). If there are too few, Maria's agent **phones local pros who aren't on Aeonith yet**. She books the best licensed quote and PayPal authorizes **exactly $336**; the slot lands on the pro's **Bryntum** schedule. The pro records **live, stamped video proof** and NVIDIA vision confirms the work. Then the pro asks for **$380**: the policy gate refuses the capture, Maria's **agent calls her**, she says "pay the agreed price", PayPal captures only $336, **Payouts** pays the pro, and the overcharge goes on the pro's record.

**3. Autopilot for home emergencies (PayPal Vault).** Save PayPal once with a budget. A leak sensor fires at 3 a.m.: Aeonith files the job, places a merchant-initiated hold on the saved wallet (Orders v2 `AUTHORIZE` with `vault_id`, no login, no redirect), pros bid blind, and the agent calls. Nobody is sent until Maria says approve; she pays only the winning price, after proof. A **Render cron job** reauthorizes holds past PayPal's 3-day honor period and releases stale ones.

**Why only PayPal:** authorize-now/capture-later is the escrow; partial capture with `final_capture` plus void makes "pay exactly the sealed price" automatic; Payouts pays dealers and pros (even ones recruited by phone an hour ago) to an email; Vault makes Autopilot possible; reauthorization and webhooks keep long deals honest; and buyers already trust PayPal's checkout.

**How PayPal earns:** a processing fee on every capture, a Payouts fee on every seller payment, Pay Later on big-ticket balances, and new PayPal accounts on both sides. Breakdown in `docs/USE_CASES.md`.

#### How we built it
- **PayPal (sandbox):** JS SDK popup approvals; Orders v2 `AUTHORIZE` (buyer-approved and merchant-initiated with `vault_id`); **Vault v3** setup and payment tokens; Payments v2 partial capture with `final_capture`, void, **reauthorize**, refund; **Payouts v1**; Webhooks with `verify-webhook-signature`; `PayPal-Request-Id` idempotency on every call.
- **AI:** **NVIDIA Nemotron** (`nemotron-3.5-super-vl`, text + vision, via build.nvidia.com) for schema-validated intake, follow-up questions, seller-agent pitches, promise checks and **vision proof checks**. Every NVIDIA request is metered (credits, tokens, latency, purpose) and shown on the Trust page. Claude is supported as an alternative. **AI advises; code decides money.** Every AI step has a deterministic fallback.
- **Agents on both sides:** buyers' agent (intake, recruiting calls, voice consent), sellers' agents (sealed bids), an open **Offer Protocol** over HTTP and as an **MCP server**.
- **APIMatic:** an OpenAPI 3 spec (`docs/openapi.yaml`) generates the TypeScript SDK in `sdk/typescript`; the MCP server and the outside seller agent bid through it.
- **Render:** web service with a persistent disk, a background worker (the outside seller agent, over Render's private network) and a cron job (hold sweeper), all in `render.yaml`; secrets are set with the Render API from a script.
- **AG Grid Enterprise:** sealed-offer comparison on every job, the audit log (filters, row grouping) and the AI usage grid.
- **Bryntum Scheduler:** the booked slot on the pro's schedule and the Pros page.
- **Channel3:** live product search for buy-together pools.
- **Trust:** commit–reveal sealed bids, a payment policy gate in front of every PayPal call, fingerprinted voice consent, live stamped video proof, and a hash-chained, tamper-evident audit log.
- **Experience:** a real-time **three.js** 3D claw that *holds your card* and follows the job, GSAP motion, dark and light themes.
- **Stack:** Node 22, TypeScript, Express 5, Zod 4. 20 automated tests.

#### Challenges
- Making the money path impossible for an AI to bend: seller text never reaches payment code; only schema-checked offers do, and capture can never exceed the sealed price or the hold.
- Fair clearing for groups that buy **different models** from one seller, simple enough to explain in one sentence.
- Proof that's hard to fake without heavy infrastructure: a live session that expires in 2 minutes, reuse detection by fingerprint, and AI vision that shows its concerns instead of guessing.
- Letting outside agents bid without trusting them: commit–reveal plus an SDK and an MCP server over the same protocol.

#### Accomplishments
- A complete, tested market loop on real PayPal rails: **compete → hold → prove → pay**, for cars, home services and emergencies.
- Sealed bids that even the operator can't peek at.
- An overcharge that is blocked by code and resolved by a phone-style call in seconds.
- A deployed system: web service, outside seller agent and hold sweeper running on Render.

#### What we learned
Authorization holds are an underrated trust primitive: hold, partial capture, void and reauthorize let you build fair marketplaces without anyone sending a deposit to a stranger.

#### What's next
Real phone calls (the script and consent logic are ready), PayPal multiparty onboarding for sellers, licence checks against state boards, Venmo as a funding option, and a "make it a group buy" button inside PayPal.

#### Honest limits
Dealers and most pros in the demo are simulated agents (the protocol is real and outside agents bid the same way). Video proof shows visible completion, not workmanship quality. Sandbox only. Not legal or financial advice.

### Built with
paypal, paypal-orders-v2, paypal-payments, paypal-payouts, paypal-vault, paypal-js-sdk, paypal-webhooks, nvidia, nemotron, nvidia-nim, claude, ai-agents, model-context-protocol, apimatic, render, ag-grid, bryntum, channel3, typescript, node.js, express, zod, three.js, gsap

### Links
- **Try it:** https://aeonith.onrender.com (PayPal sandbox)
- **Code:** https://github.com/ashfaque-rifaye/aeonith (MIT)
- **Video:** [[YouTube URL]]

### Testing instructions for judges
Open **https://aeonith.onrender.com**. When PayPal's window opens, sign in as the sandbox buyer **sb-nsxra53758944@personal.example.com** / **[[sandbox password]]**.

1. **Start a request → Hire a pro**, describe the job, **Let the agent understand it**, then **Ask for sealed quotes**. One quote comes from Hill Country Plumbing's own agent (Render worker, APIMatic SDK).
2. **Open the sealed quotes**, then **Book with PayPal** and approve in PayPal's window. The slot appears on the pro's Bryntum schedule.
3. **Pro: record video proof** (camera, or upload a photo/video), **Stop & verify**.
4. In the pro's app, request more than the quote: the gate blocks it and your agent calls. Tap **Pay the agreed price**.
5. See authorize, capture, Payouts and the overcharge flag in **Activity**, and the hash-chained **Trust** log.
6. Cars: **Start a request → Buy something together**, pick a model, join with the $500 PayPal deposit, add neighbours, ask dealers, open the offers (AG Grid table under the winner).
7. Autopilot: **Save PayPal for Autopilot**, then **Trigger alert** and answer the call.

Full guide and local setup: README.

### Sponsor tools to select on the form
- **AG Grid**: sealed-offer comparison on every job, audit log, AI usage
- **Bryntum** (Scheduler): the booked slot on the pro's schedule, the Pros page
- **Channel3**: live product search for buy-together pools
- **APIMatic**: TypeScript SDK generated from `docs/openapi.yaml` via the APIMatic code-generation API; seller agents and the MCP server bid through it
- **Render**: web service + disk, seller-agent worker, hold-sweeper cron

**APIMatic Context Plugin question:** we did not use the Context Plugin; we used APIMatic's code-generation API to generate the SDK.

**Existing project?** No: built during the submission period.

---

## YouTube

**Title (≤ 100 chars)**
Aeonith: Buy Together, Pay on Proof | PayPal + AI agents (PayPal AI Hackathon 2026)

**Description**
```
Aeonith: your AI agent pools buyers, sellers' AI agents bid blind, and PayPal holds the money until the deal is delivered.

Built for the PayPal AI Hackathon 2026. Everything you see runs on the real PayPal sandbox (no real money moves).

▶ Try it: https://aeonith.onrender.com
▶ Code (MIT): https://github.com/ashfaque-rifaye/aeonith

Chapters
0:00 The problem: sticker prices and deposit fraud
0:05 Aeonith
0:11 Architecture: AI agents, sealed bids, PayPal money rails, Render
0:24 Use case 1: buy a car together (how PayPal keeps deposits safe)
0:35 Demo: voice note, PayPal deposit, sealed dealer bids, 8.7% off, AG Grid, Channel3
1:15 Use case 2: hire a pro, pay on proof
1:25 Demo: sealed quotes (incl. an APIMatic SDK agent), PayPal booking, Bryntum, video proof, overcharge blocked
2:18 Use case 3: Autopilot for emergencies (PayPal Vault)
2:28 Demo: a leak sensor files and funds the job, the agent calls
2:51 Aeonith

How PayPal is used
• Orders v2 AUTHORIZE: deposits and bookings are held, not paid
• Payments v2: capture only the sealed price, void anyone priced out, reauthorize old holds
• Payouts v1: pay the dealer or pro, even one recruited by phone
• Vault v3: Autopilot funds an emergency on a saved wallet, no redirect
• JS SDK: every approval happens in PayPal's own window

How AI is used
• NVIDIA Nemotron turns a voice note into a structured request and asks follow-ups
• Sellers' AI agents seal bids with SHA-256; code (not AI) picks the winner
• NVIDIA vision checks the pro's live video proof
• A voice agent calls you at money moments; your answer is fingerprinted

Also built with AG Grid, Bryntum Scheduler, Channel3, APIMatic and Render.

Narration is AI-generated (Microsoft neural voices).
#PayPal #AI #AIagents #Hackathon #Fintech
```

**Settings:** Public · not made for kids · category Science & Technology · tags: PayPal, PayPal sandbox, AI agents, NVIDIA Nemotron, agentic commerce, escrow, sealed bid, hackathon, AG Grid, Bryntum, Channel3, APIMatic, Render · thumbnail: a frame from 0:05 (the home page) or 0:11 (architecture).
