# PayPal AI Hackathon — "Build What's Next with PayPal and AI"

Project: **Aeonith** (placeholder)
Sources (read 2026-11-05/06): Devpost home, Rules, Resources, FAQs, Updates (all 6 posts), all 10 sponsor pages, and full transcripts of all 4 webinar recordings. Companion file: [SECURITY.md](SECURITY.md).

> ⚠️ **Deadline: Thu Nov 12, 2026, 12:00 pm PT (Devpost shows "12:00pm PST").** The Oct 6 and Oct 13 webinars said "2:00 pm Pacific", but the Official Rules, the Devpost banner and the latest updates all say **12:00 pm**. Rules prevail (Rules §11). Treat 12:00 pm PT as the real cutoff, and aim to submit Nov 11.
> After the deadline, submissions are **locked**. Don't edit the repo, video or linked materials until after winners are announced (~Dec 21).

---

## 1. Overview

- Global online hackathon (~29,000 registered on Devpost). Sponsor **PayPal Inc.**, administrator **Devpost**. About 6 weeks to build.
- No prescribed problem statements or tracks.
- **One hard requirement:** the project must *meaningfully use both PayPal and AI*. PayPal says "meaningfully" means a PayPal button bolted onto an unrelated app **is not enough**; PayPal must be central.
- Any AI tool, model or platform is fine ("we're not going to prescribe a stack").
- Individuals, teams (no max size) and organizations. You can be on several teams and also enter solo.
- Existing projects are allowed if **significantly updated** during the period. Explain what changed.
- Up to multiple submissions, each substantially different.
- Prize stacking is real: one project can win a grand prize **and** a sponsor prize.

## 2. Key dates (Pacific Time)

| Event | Date |
|---|---|
| Submission period opens | Thu Oct 1, 2026, 9:15 am |
| Live build sessions (all done, recordings below) | Oct 6, 7, 12, 13 |
| **Submission deadline** | **Thu Nov 12, 2026, 12:00 pm** |
| Judging period | Tue Dec 1, 2:00 pm – Tue Dec 15, 2026, 8:00 am |
| Winners announced | ~Mon Dec 21, 2026, 2:00 pm |

Early eligibility check: Devpost's team offered one for submissions made by Nov 5, and the latest update (Nov 5) says submitting "today" still gets one. You can keep editing until the deadline.

## 3. Eligibility

- Age of majority where you live.
- Not open to residents or organizations in places prohibited by US/local law: Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, other OFAC-sanctioned countries (applies to **every** team member).
- Not open to employees/agents/family of PayPal, Devpost or other promotion entities, judges or their employers, or anyone with a conflict of interest.
- Teams/orgs appoint one **Representative** to submit. Teammates are added from the Devpost project page (invite by email or share the team invite link). Each teammate must first register for the hackathon, be logged in, and accept.
- No financial/preferential support from PayPal or Devpost (funding, contracts, commercial license) before the end of the period.
- Can't open a PayPal account in your country? Ask in the PayPal Discord. Being able to open one is separate from eligibility.

## 4. Project requirements

Build or update an app that:

1. Integrates **PayPal's developer platform** using the **free sandbox**. Any PayPal service counts: Venmo, Braintree, Xoom, Honey, Zettle, Paidy, Hyperwallet, Simility, Swift Financial, etc. (Some are region-restricted or need business review. See §10.)
2. **Meaningfully uses AI** (any tool/model/platform).
3. Is a working prototype or proof of concept.
4. Is documented well enough for judges to evaluate.
5. Complies with the Official Rules. You must be authorized to use any third-party SDK, API or data.

## 5. Submission checklist

The Devpost form asks for: project name, **elevator pitch** (a few sentences: "what you'd tell a friend at the pub or a VC"), **project story** (inspiration, how you built it, tools, why), text description, tools list, repo link, demo link/video, and **sponsor tools used** (the form has a sponsor selector and an APIMatic plugin question).

- [ ] **Project** built per the requirements
- [ ] **Text description** of features and functionality
- [ ] **Tools used**: which models/AI services, and how each was used. Also name **both PayPal and AI** in the description, the "Built With" section **and** the video. Devpost says this "makes them impossible to miss".
- [ ] **Functional demo**: a hosted demo URL **or** complete setup/run instructions in the repo (with test credentials, sandbox logins, API keys needed). Mockups, static prototypes and non-functional demos do **not** qualify. If your site is private, include login credentials.
- [ ] **Public repo** (GitHub/GitLab/Bitbucket): all source, assets, instructions, a **README**, and an **open-source LICENSE visible in the repo's About section**
- [ ] **Demo video**
  - under **3 minutes** (judges needn't watch beyond)
  - **public on YouTube**; link on the form (upload early, processing can take hours)
  - shows the project working on the device it was built for
  - no third-party trademarks or copyrighted music/material without permission
  - Devpost tips: open with the problem and who it's for, then show PayPal **and** AI working end to end; cut loading screens and setup; an AI voiceover is fine
- [ ] Explain how an existing project was significantly updated (if applicable)
- [ ] Select sponsor tools on the form if going for sponsor prizes (and answer the APIMatic plugin question if you used it)
- [ ] Teammates invited **and accepted**
- [ ] All materials in English (or with translation)
- [ ] **Keep demo, test credentials, trials and credits alive until winners are announced (Dec 21).** Free of charge and unrestricted for judges until judging ends.
- [ ] Hide API keys: environment variables, never commit secrets (see SECURITY.md)

Judges "aren't required to run your project" and may judge from the text, images and video alone, so the **video carries a lot of weight**. Hardware projects may be asked to provide physical access.

## 6. Judging

**Stage 1 (pass/fail), after the Nov 12 deadline:** the review team checks for a working build, a public repo with an open-source license, a public video under 3 minutes, and meaningful use of PayPal **and** AI. It may use expert panels, peer review and/or automated AI analysis.

**Stage 2:** judges score each eligible project **1–5** on five **equally weighted** criteria (presentation = 20% of the score):

| Criterion | What they ask |
|---|---|
| Technological Implementation | How thoroughly/skillfully are PayPal and AI used? Genuine, working, non-trivial implementation? |
| Design | A complete, coherent product experience, not just a technical proof of concept? |
| Potential Impact | A credible, specific case for solving a real problem for a real audience, and does the demo show it? |
| Innovation / Idea | How creative and novel? How does it differ from existing concepts? |
| Presentation | Does the video show it working end to end? Clear problem, audience, why it matters? Easy to follow? |

**Tie-break:** highest score on the first criterion (Technological Implementation), then the next, then a judge vote.

**Judges:** PayPal (Jo Franchetti, Eddie Jaoude, Marco Podien, Karthik Ravi, Himraj Singh, Nathaniel Olson) plus AG Grid (Sylwia Vargas), APIMatic (Ameer Hassan), Bryntum (Mats Bryntse), Channel3 (Ignacio Valdez Bicard), Elastic (Carly Richmond), Postman (Pooja Mistry), Render (Shifra Williams).

## 7. Prizes (≈ $69,750: $67,500 cash + $2,250 Render credits)

**Grand (all eligible submissions)**

| Prize | Amount |
|---|---|
| 1st / 2nd / 3rd | $12,000 / $8,000 / $5,000 |
| Most Creative · Most Impactful · **Best Demo Delivery** · Best Use of PayPal + AI · Best Use of Agentic Commerce | $5,000 each |

(PayPal stressed in the webinars that Best Demo Delivery is a real $5,000 prize for the 3-minute video.)

**Sponsor prizes (must use that sponsor's tool)**

| Sponsor | Prizes |
|---|---|
| AG Grid | 1st $5,000 · 2nd $2,000 · 3rd $1,000 ×3. Judged on polish (custom widgets, theming, layout) and on how you build it, e.g. the **Studio Agent Framework** (custom agents, swapped-in harness) |
| APIMatic | $1,000 + 6 months APIMatic Business ×3. Best use of the **PayPal Context Plugin** |
| Bryntum | $1,000 ×3 (Gantt / Scheduler / Calendar) |
| Channel3 | $1,500 ×1 (must really call the API or MCP: search, enrichment, recommendations) |
| Render | credits only: 1st $1,000 · 2nd $750 · 3rd $500 (Render Workflows / deploy) |

Astropods, Elastic, KERNEL, Postman and Zapier have no listed prize but offer tools/credits.

Stacking: max **one Grand (or Honorable Mention) + one Sponsor prize** per project. You *can* use several sponsor tools and be considered for each, but win at most one sponsor prize. Winners need affidavit/tax forms (W-9/W-8BEN) within 10 business days and are paid within 60 days of the forms. Winners pay their own fees/taxes.

## 8. Credits & free access you can claim for development

You claim these yourself: each needs a sign-in or account creation (Render uses GitHub OAuth, KERNEL a dashboard login, APIMatic a form for people who *used* the plugin), which I can't do on your behalf. Use your team sign-up email where one is asked.

| Provider | What you get | Claim link | Priority for Aeonith |
|---|---|---|---|
| **PayPal sandbox + dev account** | Free, no real money | https://developer.paypal.com/dashboard/ | **Must** |
| **PayPal AI Toolkit + sandbox MCP** | Free, open source | https://github.com/paypal/AI-Toolkit | **Must** (dev speed) |
| **Render** | **$50 credits** (hosting + Workflows); applied to the month-end bill ([how](https://render.com/docs/credits)) | https://credits-portal-mmdm.onrender.com/claim/paypal-ai-hackathon (Continue with GitHub) | **Must** (hosted demo, sponsor prize) |
| **Anthropic (Claude)** | No hackathon credits; pay-as-you-go API key | https://console.anthropic.com/ | **Must** for live AI (app runs offline without it) |
| **Channel3** | **20,000 API credits**, no card, code `PAYPAL-HACKATHON-2026`; top-ups in #channel3 on the PayPal Discord | https://trychannel3.com/developers · [docs](https://docs.trychannel3.com/) · [MCP](https://trychannel3.com/mcp) | Should (real catalog, $1.5k prize) |
| **APIMatic** | 1 month Basic if you used the Context Plugin; winners get 6 months Business | [Install guide](https://drive.google.com/file/d/1qa7Xkjt3PGJllHQVCP1IuE-XxlRNz4mN/view) · [Claim form](https://docs.google.com/forms/d/e/1FAIpQLScc2oCgAFACm7d6H3R4mgzv-O34DdyVnLIBNiwmUNggr_-hhA/viewform) (after using it) | Optional |
| **KERNEL** | **$50 credits** (cloud browsers for agents) | https://dashboard.onkernel.com/hackathon?code=KERNELDEVPOST2026 | Optional |
| **Elastic** | 14-day serverless trial + [30-day self-extension](https://www.elastic.co/trialextension); or [run locally](https://www.elastic.co/downloads/elasticsearch) | https://ela.st/elastic-paypal-hackathon | Optional |
| **Zapier** | 14-day Professional trial (no card), then Free | https://zapier.com/sign-up · [MCP quickstart](https://docs.zapier.com/mcp/get-started/quickstart) | Optional |
| **AG Grid (AG Studio)** | 45-day trial licence; no penalty without a key | [Licence](https://www.ag-grid.com/studio/license-pricing/) · [PayPal boilerplate](https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate) | Stretch (savings dashboard) |
| **Bryntum** | 45-day trial: `npm install @bryntum/scheduler@npm:@bryntum/scheduler-trial` | https://bryntum.com/download/ | Skip |
| **Astropods** | Free account | https://astropods.com/ · [docs](http://docs.astropods.com/) | Skip |
| **Postman** | Free plan + PayPal collections | https://www.postman.com/paypal | Handy for API testing |
| **PayPal Discord** | Help from the PayPal + sponsor teams | https://discord.gg/sJ2G6DyvSK | **Join** |

**Not offered:** no LLM/API credits from Anthropic/OpenAI or others are mentioned anywhere. You bring your own AI provider/key. The only AI-adjacent free stuff is through the sponsors above (the AG Grid agent framework still needs your own LLM key). Trial lengths run out: Elastic 14 days, Zapier 14 days, AG Grid/Bryntum 45 days. Since judging runs to Dec 15, plan which trials must stay alive (Elastic can extend; others may need a re-up or a recorded fallback).

## 9. Webinar recordings, key takeaways

| Date | Title | Link |
|---|---|---|
| Oct 6 | Set Up PayPal's Sandbox and AI Toolkit From Scratch (44 min; first 8 min = rules/prizes) | https://www.youtube.com/watch?v=FFJfCW9z3Do |
| Oct 7 | Power Your PayPal Hackathon Project with APIMatic Context Plugins (25 min) | https://youtu.be/zRWixN68tDg |
| Oct 12 | Build a payments dashboard without building a dashboard (AG Studio, 41 min) | https://www.youtube.com/watch?v=LGfG44i1Fj8 |
| Oct 13 | Start building with PayPal (53 min, repeat of Oct 6 with Q&A) | https://youtu.be/ck_zyB66p_Y |

### Strategy & rules signals from the PayPal team
- **Start from a real problem**, not a PayPal product; then map it to PayPal capabilities (Marco: "find a problem… solving a real problem you know from personal experience").
- Don't leave the demo video to the last hour; **presentation is a fifth of the score**.
- "Meaningfully" = PayPal central, not bolted on.
- Existing projects OK with meaningful progress; multiple submissions OK if substantially different.
- Sponsor tools are optional but give extra shots at prizes "without adding too much extra work". Look at partner prizes before you pick your stack.
- Help: **PayPal Discord** (developer.paypal.com/discord → https://discord.gg/sJ2G6DyvSK). Team members Jo, Marco and Eddie are there for all 6 weeks; check the announcements channel. Bugs or missing error codes in the AI Toolkit: open an issue/PR (PRs are reviewed and merged, and sit on your CV).

### PayPal capabilities ("house of brands")
- Brands: PayPal, Venmo (US only), Braintree, Hyperwallet, Xoom etc.; all count for the hackathon.
- Capabilities: accept payments (buttons, links, donations), Pay Later (BNPL), Fastlane (accelerated checkout), vaulting, in-person POS (hard: needs terminals), alternative payment methods (often local), **invoicing, subscriptions, payouts, disputes, order tracking, Login with PayPal, transaction search, shipments/tracking, catalog**.
- **Some products are gated** behind business review/regional limits (e.g. *Store Sync* for LLM product catalogs, parts of the **agentic commerce** tooling). Review is slow and may not finish during the hackathon. PayPal is working on faster sandbox onboarding and will announce it in Discord. Check the docs first and ask on Discord if unsure.
- Docs: developer.paypal.com → Get started → Developer resources → AI tools. AI docs: developer.paypal.com/ai/get-started (docs.paypal.ai).

### AI tooling from PayPal
- **PayPal AI Toolkit** (github.com/paypal/AI-Toolkit): open-source plug-in for Claude Code / Claude desktop / OpenAI Codex.
  - Skill `paypal-best-practices` auto-loads on PayPal work (recommended vs deprecated APIs, auth, orders, subscriptions, invoices, webhooks, error handling, sandbox testing).
  - Slash commands: `/paypal-setup` (configure, verify MCP, **refresh token**), `/paypal-sandbox [topic]`, `/paypal-test-accounts` (test cards, BNPL, Venmo, webhook scenarios), `/paypal-explain-error`, `/paypal-doctor` (scan code or "webhooks aren't firing").
- **Sandbox MCP server** tools: orders & payments (create/capture/refund), invoices (create/send/manage/QR), subscriptions (plans, manage), disputes (list/respond), catalog (products/pricing), shipments (create/track), reporting (list transactions, merchant insights). Example: "create a $9/month plan with a 2-week trial and subscribe test buyer 1".
- **MCP setup (4 steps):** install toolkit → get Client ID and Secret from the dashboard → `curl` client-credentials call for an access token → put it in the agent's `settings.json` env as `PAYPAL_SANDBOX_ACCESS_TOKEN` → **fully quit and restart** the agent (`/clear` is not enough) → run `/paypal-setup`.
- **Gotcha:** the token **expires roughly every 9 hours** → 401s. Run `/paypal-setup refresh`.
- **Agent Toolkit / agent tools** (separate from the AI Toolkit): PayPal tools packaged for LangChain, CrewAI, Vercel AI SDK, Mastra, etc. Useful for building agents that transact. **PayPal's Postman has an "agentic commerce" workspace** for inspiration.
- **APIMatic Context Plugin**: one `npx` command (see APIMatic resource page) adds PayPal API context to Claude Code, Cursor, Codex, Copilot/VS Code. Covers TypeScript, Python, Java, Ruby, PHP, C# with PayPal server SDKs for **Orders, Payments, Vault, Subscriptions, Transaction Search**. It plans first, builds, then verifies against production-readiness checks. A "coffee shop storefront" prompt produces a working sandbox checkout in 5–7 min. Claimed to be far cheaper/more reliable than docs-MCP or raw OpenAPI. Using it + answering the form question qualifies you for the APIMatic prize and free month.

### Sandbox how-to (from the sessions)
- developer.paypal.com → click the `</>` icon if you logged in on paypal.com. **Toggle top-left to *Sandbox*.**
- Testing tools → Sandbox accounts: two defaults exist (one Business = merchant, one Personal = buyer; can't delete). Create more, **name them**, make buyer and merchant **the same country/currency**. You can edit email, password, name, balance (starts $5,000), and add test cards.
- Apps & Credentials → create an app (choose Merchant, pick the sandbox it belongs to) → Client ID (public) + Secret (server-only). Sandbox creds don't work in live and vice versa.
- Enable features like **Transaction Search**; changes take **up to 10–15 minutes**; remember to click Save.
- Go live later by swapping only **base URL + client ID + secret** (env vars). Webhooks must be re-created for live with a different URL.
- **Webhooks:** register an HTTPS URL (use ngrok/Cloudflare Tunnel locally). PayPal POSTs events; reply **200** to ack, otherwise it retries **up to 25 times over 3 days** with backoff. Eddie ticks *all events* in sandbox and lets the app ignore what it doesn't need. **Always verify the signature.** Webhooks belong to an app and environment.
- **Debug:** Testing tools → Sandbox notifications (emails that would have been sent), Event logs → API calls (select your app!), Webhook events (payload, attempts, **resend**), Error logs.
- **Test unhappy paths**: decline, cancel, refund, pending, then check your app reacts (e.g. downgrade after refund). Log in to both the buyer and merchant sandbox to see both sides.
- Token: `POST /v1/oauth2/token` with client ID/secret; use `Authorization: Bearer`. Tokens last 9 h, so cache and refresh on rejection. SDKs do this for you.
- Samples: github.com/paypal-examples/docs-examples (a "sample integration" repo, copy `.env.sample` → `.env`, `cd server/node && npm i && npm start`); PayPal Postman collections (postman.com/paypal); `getting-started-with-paypal-sandbox` repo.

### AG Grid / AG Studio session (Oct 12) highlights
- AG Studio = embedded analytics (dashboards/charts/grids, built-in data engine, cross-filtering). Wired to PayPal REST (invoices, customers, ~6–7 endpoints) via a `getDashboardApiData` wrapper → AG Studio `sources`, optional `relationships`, calculated fields (e.g. collection rate), calendars.
- PayPal-themed via `studioTheme.withParams(...)`; theme builder on their site; prebuilt reports through state (pages/widgets/filters); `mode` view/edit, undo/redo via `onApiReady`, save/load state.
- **AI assistant**: Studio ships an agent framework (UI + harness + agents + tools). Use `createAIHarness` with an LLM adapter (OpenAI adapter in docs; tweak for Anthropic). Built-in data agent and page agent. They want to see custom agents/tools.
- Full demo source and a boilerplate repo with AG Studio + PayPal are linked from their page. No penalty for missing licence key.

## 10. Official inspiration categories

1. **AI agents / automation**: agents that actually transact: shop and check out, pay contractors on job completion, agent-to-agent commerce.
2. **Money movement**: send by phone number, freelancer payment dashboard, instant gig payouts, receipt-scan bill splitting, split donations.
3. **Business solutions**: multi-currency freelancer invoicing, creator tipping/memberships, marketplace split payments, small-merchant POS add-ons.
4. **Consumer experiences**: auto-categorizing budget app, in-chat money requests, simplified checkout for students/families/seniors.
5. **Social impact**: accessible donations, microloans/fundraising for the underbanked, recurring donor payouts to field partners, community pooled funds.

Sponsor-specific ideas (from their pages): AG Grid (storefront analytics, anomaly-alert agent, donation dashboard, natural-language finance agent, invoice nudge-bot), Bryntum (payment-gated booking calendar, subscription revenue timeline, dispute triage Scheduler, **agent that reschedules milestones on payment events**), Elastic (multi-step agent on Elasticsearch + Jina embeddings, Agent Builder, A2A/MCP), Channel3 (shopping agents, gift finders, AI stylists), Zapier (MCP actions across 9,000+ apps incl. PayPal), KERNEL (agents browsing the real web with live replay), Astropods (deploy and monitor production agents, Slack-connected), Render (Workflows to orchestrate agent tasks/jobs).

## 11. Strategy notes (my take)

- Two dedicated $5k awards reward exactly this brief: **Best Use of PayPal + AI** and **Best Use of Agentic Commerce**. The AI Toolkit/MCP server and Agent Toolkit are the shortest path to a credible agent that moves money (in sandbox).
- Add **guardrails** (spend limits, allow-listed payees, human-confirm step). It also strengthens the "Technological Implementation" and "Potential Impact" stories. See SECURITY.md §6.
- Pick *at most one or two* sponsor tools that fit naturally (Render is the cheapest "easy add": it needs hosting anyway; $50 credit). Don't force AG Grid/Bryntum unless the product really needs a dashboard/schedule.
- Because judges may not run it, the **video** should show: problem → who it's for → PayPal + AI working end to end (including a failure/refund path) → why it matters. Keep it under 3:00.
- Pass Stage 1 first: working build, public repo + license in About, public video, README with run steps and sandbox test credentials.
- Don't depend on gated products (Store Sync, some agentic-commerce APIs) unless you already have access.

## 12. Aeonith: project notes

Research: [docs/RESEARCH.md](docs/RESEARCH.md) · Ideas and pick: [docs/IDEAS.md](docs/IDEAS.md) · Code: [README.md](README.md)

- **Concept:** Aeonith Collective. AI buyer agents pool demand to unlock volume tiers; PayPal holds funds (AUTHORIZE) and captures at the group price only if the pool clinches, otherwise voids.
- **Target user / problem:** small buyers (PTAs, neighbourhood co-ops, small farms) who pay retail while institutions get bulk pricing.
- **PayPal pieces used:** Orders v2 AUTHORIZE, authorization partial capture/void/reauthorize, webhooks + signature verification, idempotency.
- **AI pieces used:** Claude structured outputs for intent parsing, pool matching with rationale, and settlement review; (planned) merchant↔pool negotiation agent.
- **Sponsor tools (optional):** Render (hosting); Channel3 if consumer goods.
- **Prizes targeted:** Best Use of Agentic Commerce, Most Creative, Most Impactful, Best Use of PayPal + AI, plus Render or Channel3.
- **What's new during the period (if pre-existing):**
- **Repo URL / License:**
- **Demo URL:**
- **Video URL (YouTube):**

### Timeline to Nov 12, 12:00 pm PT (today = Nov 6)
- [ ] Nov 6: lock concept; PayPal dev account + sandbox buyer/merchant + app; install AI Toolkit; claim credits you'll use (Render/KERNEL/Channel3/APIMatic); scaffold repo with LICENSE, `.gitignore`, `.env.example`
- [ ] Nov 6–9: core PayPal + AI flow end to end (incl. webhooks + guardrails)
- [ ] Nov 9–10: UI polish, README with run steps + sandbox test creds, hosted demo
- [ ] Nov 10–11: secret scan, record and upload the <3 min YouTube video, finish description and Built With
- [ ] **Nov 11: submit**; verify every link while logged out; make sure teammates accepted
- [ ] Nov 12–Dec 21: **don't touch** the submission; keep demo/credits/trials alive
