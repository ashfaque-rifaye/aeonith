# Aeonith use cases, and how PayPal wins

Aeonith is one loop: **hold → sealed bids → proof → pay**. It began with home services, but nothing in the loop is specific to plumbing. It works wherever:

- several buyers want the **same thing**,
- a seller would give a **better price for volume**, and
- buyers need **protection until it's delivered**.

This doc lists the use cases. Some already run in the app; others use the same engine with different settings. It then explains how PayPal is used at each step and how PayPal earns.

## 1. Use cases

### Running in the app today (`npm run demo` creates all of them)

| # | Use case | Mode | What PayPal holds | Example result in the demo |
|---|---|---|---|---|
| 1 | **Solo home repair**: two dead kitchen outlets | Solo | The buyer's private limit ($260) | 2 licensed electricians bid. Bright Line wins at **$224**, $36 goes back to the buyer, and the pro is paid **$217.28** |
| 2 | **Solo repair with conditions**: a furnace that needs a 12-month warranty | Solo | Limit ($320) | The 6-month-warranty bid is filtered out. Lakeway wins at **$293**. An agent's overcharge attempt is **blocked by the policy gate** |
| 3 | **Street group**: gutter cleaning, Maple St | Together (6 homes) | Each home's limit | **$118/home** against a $160 solo quote. The buyer with a $90 limit is released, $0 charged |
| 4 | **Nothing fits**: TV mount, $60 max | Solo | Limit ($60) | No bid fits the limit, so the hold is voided. **$0 charged** |
| 5 | **Job in progress**: move-out deep clean | Solo | Limit ($250) | Pro booked at **$198**, proof code issued, waiting for the photo |
| 6 | **Car pool: 5 buyers, same model, one dealership** | Together, deposit pool | **$500 refundable deposit** each. The $33k max price is never held | 3 dealer agents seal per-car bids:<br>• **Capital Auto Group wins at $31,980/car for 4 cars**<br>• Hill Country Motors' $32,239 can't reach 4 buyers<br>• Lakeline's 12-month warranty fails the 36-month rule<br>• Eli (max $31,500) is released<br><br>At delivery (photo of the VIN plate with the one-time code) the deposits are captured and applied to the price. **$125,920 balance** is due at handover |
| 7 | **Bulk items: 8 parents, one Chromebook order** | Together | Full price | **CampusTech wins at $267/device** (retail ~$349) for 7 parents. Uma ($250 max) is released. A delivery photo releases the money |

**How the car pool works.** A car is too expensive for one PayPal hold, and no buyer should tie up $33,000. So big-ticket pools use a **refundable deposit hold**:

- Each buyer's **private max price** still decides whether they're in the deal (dealers never see it).
- Only the deposit is authorized in PayPal.
- The policy gate allows a capture of exactly the deposit, and only if the final price is at or below that buyer's max.
- The balance is paid to the dealer at handover at the **sealed price**, which can't change after the reveal. It's paid through financing or PayPal checkout.

Two pieces of code enforce this: `holdPerUnit` and `capturePerUnit` in [src/core/policy.ts](../src/core/policy.ts). A test covers it in [test/flow.test.ts](../test/flow.test.ts).

**Why "one dealership" matters.** The pool buys the same model and trim from a single winner. That gives the dealer one deal desk, one batch of paperwork and a guaranteed volume. That fixed cost is what the dealer agents spread across cars in their bids. It's the same economics as gutter cleaning: one truck, many homes.

### Same engine, next markets

| Use case | Who pools | Why sellers discount | PayPal fit |
|---|---|---|---|
| **Appliances and energy upgrades** (heat-pump water heaters, EV chargers, insulation) | A street or HOA | One installer route and bulk hardware. Rebate paperwork is done once | Hold on the install. **Pay Later** on hardware |
| **Solar group buys** | A town or neighbourhood | Proven: Solarize-style campaigns cut prices as more people sign up ([Frederick County, MD: 66 homes at 23.7% off retail](https://cleantechnica.com/2013/10/11/cracking-code-residential-solar-power/); [Michigan group buys, 5–15%](https://www.cbsnews.com/detroit/news/solar-panel-group-buys-spread-across-michigan)) | Deposit pool, the same as cars. Milestone captures |
| **Fleet or used-car pools** (rideshare drivers, small businesses, a family buying 2 cars) | Coworkers, driver groups | Volume and fast turnover for the dealer | Deposit pool, plus Payouts to the dealer |
| **School and club orders** (devices, uniforms, instruments) | PTA, sports club | One shipment, predictable volume | Full-price holds. **Venmo** for parents |
| **Small-business restock** (cups, beans, packaging) | Shops on one street | A big-buyer price for small buyers | Vaulted payment method with recurring holds |
| **Group travel and events** (charter bus, venue, tour guide) | A group of friends or a team | A guaranteed headcount | Holds released if the minimum isn't met |
| **Moving and junk removal** on the same day | One building | One truck, many apartments | Together mode, the same as gutters |

The same safety rules apply to every one:

- **Best-of guarantee:** you never pay more than the solo quote you already have.
- **Private limits:** sellers never see what you'd pay.
- **Never charged when out:** anyone below the final price is released, not charged.
- **Proof before money moves.**

## 2. How PayPal is used, step by step

| Step | PayPal API (all live in the sandbox code path) | Why it matters |
|---|---|---|
| Fund the request | **Orders v2 `intent: AUTHORIZE`** | The buyer's money is reserved, not paid. Sellers only bid on funded demand, so there's no tyre-kicking |
| Keep it alive | **Payments v2 reauthorize** (3-day honor period, 29-day validity) | Long jobs and car deliveries stay guaranteed |
| Release anyone out of the deal | **Void** | The released buyer sees $0 charged, instantly and visibly |
| Pay the exact final price | **Partial capture** with `final_capture` | The buyer approved a ceiling but pays only the winning price. The rest is released automatically |
| Pay the seller | **Payouts v1** | The seller is paid once proof is in, so there's no waiting on invoices |
| Fix problems | **Refund** (policy-gated) | Purchase Protection stays intact |
| Stay in sync | **Webhooks** with signature verification | Voids or disputes at PayPal update Aeonith's state |
| Never double-charge | **`PayPal-Request-Id`** idempotency on every money call | Retries are safe |
| Balance on big tickets *(next)* | **Pay Later / Pay Monthly** at handover | Car and solar balances are financed inside PayPal |
| Autopilot *(built)* | **Vault v3** setup + payment tokens, then **Orders v2 AUTHORIZE with `vault_id`** (merchant-initiated) | A sensor files and funds an emergency job while the buyer sleeps, within a budget they approved once. Booking still waits for their "approve" on the Voice Agent call |
| Consent *(built)* | Voice Agent call before **capture** | The buyer's spoken "release payment" is the human approval the policy gate requires; it's fingerprinted into the audit chain |
| Pay pros you just met *(built)* | **Payouts to email** | Recruited pros are paid without a PayPal account in advance; they claim the payout |
| Sellers as merchants *(production)* | **Multiparty / PayPal Complete Payments** onboarding plus a platform (partner) fee | Each pro or dealer becomes a PayPal merchant, and Aeonith takes its fee on the same capture |

## 3. How PayPal earns from this system

PayPal earns on **every dollar Aeonith moves**, and the network brings PayPal new users on both sides.

1. **Transaction fees on every capture.** Every winning price is captured through PayPal. The commonly cited US rate for PayPal Checkout is **3.49% + $0.49** per transaction ([checkoutpage.com, 2026](https://checkoutpage.com/blog/paypal-fees)). This is a third-party figure; confirm it on PayPal's merchant fee page.
2. **Payout fees.** Every seller is paid through Payouts. One fee calculator lists **2%, max $20** per domestic payout, but this is unverified.
3. **Pay Later volume.** Big-ticket pools (cars, solar, heat pumps) have a balance to finance, and PayPal Pay Later earns merchant-side fees on it. It also makes a large purchase affordable, which increases how many buyers can join a pool.
4. **New PayPal accounts.** Each Together pool is **viral by design**:
   - One person starts it, and every neighbour, coworker or parent who joins approves a **PayPal** hold. One gutter job brought 6 PayPal checkouts; one car pool brought 5.
   - On the seller side, every pro, dealer and retailer is onboarded as a PayPal merchant to get paid.
5. **More money stays in PayPal.** Payouts land in the seller's PayPal balance. From there it can be spent, transferred instantly (a fee product) or used for their own supply purchases.
6. **Fewer disputes and lower loss rates.** Funds are guaranteed before work starts and released only on proof, with an audit trail for every step. That means fewer chargebacks and "work never done" claims, which lowers PayPal's own losses on services, a high-dispute category.
7. **Vaulted, merchant-initiated volume.** Autopilot turns a one-time Vault approval into recurring holds and captures, the stickiest kind of PayPal volume, because the buyer's emergency budget lives in PayPal.
8. **Payouts as acquisition.** Recruited pros are paid by Payouts to their email before they have a PayPal account; claiming the money brings them into PayPal.
9. **A rail for agentic commerce.** The Offer Protocol (HTTP + MCP) gives any AI agent a safe way to spend:
   - an authorization the agent can never exceed (policy gate plus PayPal's own limit)
   - capture only on proof
   - every step logged

   That makes PayPal the default way agents commit money.

### What the demo scenarios are worth to PayPal (estimates)

These use the third-party rates above: Checkout 3.49% + $0.49 per capture and Payouts 2% (max $20). They are illustrative, not a quote.

| Scenario | Money captured | Captures | Est. checkout fees | Payouts | Est. payout fees | **Est. PayPal revenue** |
|---|---|---|---|---|---|---|
| Solo outlets | $224 | 1 | $8.31 | 1 × $217.28 | $4.35 | **≈ $12.66** |
| Solo furnace | $293 | 1 | $10.72 | 1 × $284.21 | $5.68 | **≈ $16.40** |
| Maple St gutters | $590 | 5 | $23.04 | 1 × $572.30 | $11.45 | **≈ $34.49** |
| Car pool (deposits only) | $2,000 | 4 | $71.76 | 1 × $1,940 | $20.00 (cap) | **≈ $91.76**, plus Pay Later fees on whatever part of the $125,920 balance buyers finance through PayPal |
| Chromebook order | $1,869 | 7 | $68.66 | 1 × $1,812.93 | $20.00 (cap) | **≈ $88.66** |
| **Total** | **$4,976** | **18** | **$182.49** | **5** | **$61.48** | **≈ $244** |

The released buyers (Sam, Eli, Uma and Jordan) are also part of the story. They paid $0, but they still have PayPal accounts and a reason to come back.

### How Aeonith itself earns, and why the numbers work

- **Demo:** Aeonith is merchant of record and takes a 3% platform fee from the payout. That's lower than PayPal's per-transaction cost, so the demo setup doesn't make money on its own. We say so openly.
- **Production:** each seller is onboarded through **PayPal multiparty / Complete Payments**. The seller is the merchant and pays PayPal's processing fee, as they do today. Aeonith collects a **platform (partner) fee on the same capture**:
  - Services: about **5–8%**. There are no lead fees: sellers pay only when they win and deliver.
  - Item pools: a **flat success fee** per unit, for example a dealer fee per car sold.
- **Sellers still come out ahead.** They get guaranteed, pre-funded demand with no lead fees, no chasing invoices and payment on proof. Dealers get a batch of committed buyers with deposits down.

## 4. What stays honest

- PayPal authorizations have per-account and per-transaction limits. That's why **cars use deposit holds**, not full-price holds. The app caps any single hold (`MAX_AUTH_AMOUNT`, $1,000 in the demo).
- A car's **balance** is paid at handover, outside the hold. Aeonith guarantees the **price** (sealed and fixed), not the buyer's financing.
- Fee figures come from third-party summaries dated 2026. Confirm them against PayPal's official merchant fee page before quoting them in the submission.
- Dealers, retailers and pros in the demo are simulated agents with their own cost models. The protocol they use is real and open.
