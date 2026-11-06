# Sandbox & Secrets Security Checklist (Aeonith)

The repo has to be **public** for the hackathon, so assume anything committed is world-readable forever.

## 1. Secrets
- [ ] `.env` is gitignored (see `.gitignore`); only `.env.example` (no values) is committed.
- [ ] **Client Secret is server-side only.** Client ID is public and may go to the browser; the secret never does.
- [ ] No keys in code, README, screenshots, demo video, or the Devpost description. Blur dashboards in the video.
- [ ] The PayPal AI Toolkit/MCP access token is in your agent's *local* settings (`.claude/settings.local.json`, gitignored), never in a committed file.
- [ ] Before making the repo public run a secret scan over the **full history**, e.g. `gitleaks detect` or `trufflehog git file://.`. If a secret ever got committed, **rotate it** (delete/regenerate the app secret in the PayPal dashboard). Deleting the commit isn't enough.
- [ ] Enable GitHub secret scanning + push protection on the repo.

## 2. Keep sandbox and live apart
- [ ] Only use **Sandbox** credentials. Check the dashboard toggle (top-left) says *Sandbox*.
- [ ] App fails fast on startup unless `PAYPAL_ENV=sandbox` and the base URL is `api-m.sandbox.paypal.com`.
- [ ] Use a dedicated sandbox **app**, a business (merchant) account and a personal (buyer) account in the **same country/currency**. Name them.
- [ ] Never put your real PayPal login/card details anywhere in the project. Sandbox accounts have their own fake emails/passwords.
- [ ] Do **not** use a live token with the MCP server. The MCP server and toolkit are for sandbox here.

## 3. Tokens
- [ ] Access tokens last ~9 hours. Cache the token in memory and re-fetch on 401. Don't fetch one per request. The toolkit's `/paypal-setup refresh` re-issues the MCP token.
- [ ] Never log tokens, secrets, or full request headers.

## 4. Payment integrity (what judges notice)
- [ ] **Compute prices/amounts on the server.** Never trust an amount sent from the browser.
- [ ] After capture, verify status, amount, currency, and the merchant against your own order record before fulfilling anything.
- [ ] Send a unique `PayPal-Request-Id` on create/capture calls so retries are idempotent.
- [ ] Handle the unhappy paths: declined, cancelled, refunded, pending, duplicate clicks (sandbox supports negative testing).

## 5. Webhooks
- [ ] **Verify the signature** on every webhook (PayPal's SDK or `POST /v1/notifications/verify-webhook-signature` with your `PAYPAL_WEBHOOK_ID`). Reject otherwise. Otherwise anyone can fake "payment completed".
- [ ] Return HTTP 200 only after you have accepted/queued the event. Anything else makes PayPal retry (up to 25 times over 3 days).
- [ ] Make the handler idempotent (dedupe on event id).
- [ ] Local dev needs a tunnel (ngrok, Cloudflare Tunnel). Webhooks belong to a specific app and environment.
- [ ] Don't leave a tunnel up with an open admin surface.

## 6. AI-specific risks (this is an AI + money project)
- [ ] **Prompt injection:** treat all text the model reads (product pages, emails, invoices, user input) as untrusted. It must not be able to change who gets paid or how much.
- [ ] Tools that move money get **hard limits** in code (max amount, allow-listed payees/merchants, per-session cap), not just in the prompt. `MAX_ORDER_AMOUNT` in `.env.example`.
- [ ] Human confirmation step before any payment/payout/refund the agent proposes. Judges will like seeing this in the video.
- [ ] Keep an audit log of every agent tool call and its result (no secrets in it).
- [ ] Give the MCP/agent the narrowest tool set it needs (e.g. disable payouts if unused).
- [ ] Set spend limits/alerts on your AI provider key.

## 7. Judge access (public repo + public demo)
- [ ] The README must let judges run it: include **sandbox-only** test buyer credentials (a throwaway personal sandbox account) or tell them how to create one. Never real accounts.
- [ ] Keep the sandbox buyer's balance modest and rotate its password after judging.
- [ ] Hosted demo: add basic rate limiting, CORS locked to your own origin, and no admin routes. Keep it up until winners are announced (~Dec 21).
- [ ] Don't edit the repo/video/linked materials after the Nov 12 deadline until winners are announced (Devpost: "submissions are locked").
- [ ] A LICENSE file must be detectable in the repo About section (e.g. MIT or Apache-2.0).

## 8. Quick hygiene
- [ ] `npm audit` / `pip-audit` clean of criticals; pin dependency versions; commit the lockfile.
- [ ] Use HTTPS everywhere on the hosted demo; set secure headers.
- [ ] Validate and sanitize all input; parameterize any DB queries.
