# Operator Metrics — What To Track

**Status:** PROPOSAL (not locked — §12 lists what needs a PO decision)
**Date:** 2026-08-21
**Governed by:** `Admin-Analytics-Architecture-v1.0.md` + `Admin-Analytics-Amendment-001.md`
**Relates to:** `Launch-Checklist-Free-And-Premium.md` §4 Phase E, §6 Phase F ·
`Amendments/Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` ·
`P-8-Subscription-Wireframe-Spec.md`

---

## 0. The headline, before the list

**`/admin` already computes roughly sixty metrics across eleven sections. Not one of them is a dollar, and
nothing in this repository can produce one.** That is not an oversight — it is the state of the build:

| Fact | Where | Consequence |
|---|---|---|
| `entitlement_config.default_tier = 'PREMIUM'` | `0145` | **Every athlete resolves to Premium today.** "Free users = 0" and "paid users = everyone" are both true and both meaningless. Phase F flips one row and inverts it. |
| No billing SDK is installed | `package.json` has no `react-native-purchases` | `src/lib/billing.ts` is a **port with an `UNAVAILABLE_BILLING` adapter**. It returns `'unavailable'` for every purchase. Nothing has ever been sold. |
| No price exists in `src/` | P-8 §80 / P8W-D3, enforced by `plans-core.test.mjs` | Prices are the store's localized strings. **The only price written down anywhere is `founder_lifetime_149` ($149).** The monthly and annual price points are not yet chosen in the repo. |
| No payment webhook | `0170` header says so explicitly | `grant_referral_credit()` is deliberately ungranted to `authenticated`. The referral ledger has been built and unused since `0145`. |

So this document is in two halves: **§1–§4 is what you can have today or nearly today**, and **§5–§9 is
what only exists after the RevenueCat adapter lands (Phase E 4.2 — a native build, not an OTA).**

**The single most important consequence:** the moment money starts moving, **RevenueCat becomes a second
source of truth for a fact Postgres also stores** (`athlete_entitlement.tier`). Every subscription product
that gets this wrong ends up with a dashboard that disagrees with the bank. §10 is about that.

---

## 1. The top row — eight tiles, the 30-second glance

If the dashboard shows nothing else above the fold, show these. Each is one number and one delta against
the preceding equal window.

| # | Tile | Definition | Status |
|---:|---|---|---|
| 1 | **MRR** | Normalized monthly recurring revenue, **net of store commission**, **excluding lifetime and Founder** | ⛔ needs billing |
| 2 | **Paying subscribers** | `tier='PREMIUM'` AND `premium_kind IN ('MONTHLY','ANNUAL')` AND (`premium_until` is null OR `> now()`) | ⛔ needs billing |
| 3 | **Free athletes** | Everyone resolving to `FREE` through `athlete_tier()` | ⚠ meaningless until Phase F |
| 4 | **Free → Paid conversion** | paying ÷ (paying + free), all-time and by 30-day cohort | ⛔ |
| 5 | **Net new paid this month** | new paid − churned paid | ⛔ |
| 6 | **Monthly churn** | churned paid ÷ paid at period start | ⛔ |
| 7 | **Activated athletes (30d)** | signed up AND logged a first workout | ✅ `admin_overview.tiles.activated` |
| 8 | **WAU / MAU stickiness** | weekly actives ÷ monthly actives | ✅ `admin_engagement` + `admin_events.presence` |

⚠ **Tiles 1 and 2 are not the same story and must never be one tile.** An annual subscriber is one
subscriber and one-twelfth of their payment per month. A Founder is one customer and **zero MRR**.
Collapsing those is how a product reports growth in the month it actually stopped growing.

---

## 2. Money — the revenue block

### 2.1 The recurring numbers

| Metric | Formula | ⚠ Trap specific to Forge |
|---|---|---|
| **MRR** | Σ(monthly plans) + Σ(annual ÷ 12) | **`LIFETIME` and `FOUNDER` are excluded, full stop.** They are not recurring. |
| **ARR** | MRR × 12 | Do not fold lifetime in here either. |
| **Net vs gross** | gross × (1 − commission) | Apple takes **30%**, or **15%** under the Small Business Program (under $1M/yr — Forge qualifies) **and 15% on any subscription past its twelfth consecutive month.** Track both; the bank only ever sees net. |
| **New MRR** | from accounts that had none | |
| **Expansion MRR** | monthly → annual upgrades, plus the Coach AI add-on | Coach AI is a **concurrent entitlement, not a tier above** (MA3-D2/D3). It is expansion revenue on the same customer. |
| **Contraction MRR** | annual → monthly downgrades | |
| **Churned MRR** | lapsed subscriptions | |
| **Net revenue retention** | (start + expansion − contraction − churn) ÷ start | The one number that says whether the business compounds. |

### 2.2 The one-time numbers — kept separate, always

| Metric | Note |
|---|---|
| **Lifetime revenue this month** | Cash, not MRR. Report it beside MRR, never inside it. |
| **Founder seats sold, of 100** | `select count(*) from athlete_entitlement where founder_seat is not null` — **available today**, and a unique partial index means it cannot oversell. **MA3-D25: the 20 OG testers hold `GRANT` and occupy no seat.** |
| **Founder revenue** | seats × $149 gross. |
| **Deferred revenue** | Annual and lifetime cash received but not yet earned. Matters at tax time, not on a daily tile. |

### 2.3 Per-customer economics

| Metric | Formula |
|---|---|
| **ARPU** | net revenue ÷ all athletes, free included |
| **ARPPU** | net revenue ÷ paying athletes |
| **LTV** | ARPPU ÷ monthly churn rate |
| **LTV : CAC** | only meaningful once there is paid acquisition; 3:1 is the usual bar |
| **Months to payback** | CAC ÷ (ARPPU × margin) |

### 2.4 Refunds, and the honesty problem

- **Refund rate** — count and dollars, broken out by plan.
- ⚠ **Apple refunds retroactively and silently.** Revenue for a closed month can drop after you have
  already reported it. Either the dashboard restates history or every figure carries an as-of date.
  Restating is the right answer, and RevenueCat does it for you.
- **Chargebacks and billing-retry recoveries** — the difference between "they left" and "their card
  expired" (see §6.2).

---

## 3. Population — free, paid, and the shape between them

| Metric | Source today |
|---|---|
| Total accounts | ✅ `admin_overview.tiles.athletes_total` |
| Onboarded accounts | ✅ `onboarded_total` — an account that never finished onboarding is not a user |
| **Free athletes** | ⛔ needs a tier-breakdown RPC |
| **Paying: monthly / annual / lifetime / Founder** | ⛔ — the column exists (`premium_kind`); nothing reads it |
| **Grant holders** | ⛔ — **must be broken out and excluded from every paid figure.** `premium_kind='GRANT'` covers the 20 OG testers *and every existing athlete during Phase B*. If grants land in the paid bucket, conversion reads ~100% on day one. |
| **Coach AI holders** | ⛔ — `coach_ai = true`, tracked separately from Premium per MA3-D2 |
| **Expired / lapsed** | ⛔ — `premium_until < now()`. Note there is deliberately no boolean "active" to read; `is_entitled()` compares to `now()` because nothing runs on expiry. |

⚠ **`athlete_entitlement` has no row for most athletes, by design** (`0145`: *"an athlete with no row gets
`default_tier`, which is why Phase B needs no backfill"*). **Any tier count written as
`select tier from athlete_entitlement group by 1` will undercount the entire population.** It has to
resolve through `athlete_tier()` or left-join from `profiles`.

---

## 4. Growth and acquisition

| Metric | Status |
|---|---|
| Signups per day, cumulative athletes | ✅ `admin_growth.series` |
| Week-over-week and month-over-month growth rate | ⚠ derivable from the series; not currently displayed as a rate |
| **Acquisition funnel** — signed up → onboarded → first workout → second workout → week-2 return | ✅ `admin_growth.funnel`, and it correctly gives week-2 its **own denominator** (somebody who signed up yesterday is not eligible) |
| Newest athletes, by name | ✅ `admin_recent_signups` — AA-D8, account existence only, never training data |
| **Referred signups, referral conversion** | ⚠ **`referral_attribution` exists as of `0170` and nothing reads it.** One RPC away: attributed signups, top referrers, referred-vs-organic conversion. First attribution wins and is immutable, so the number is trustworthy. |
| **Channel / campaign attribution** | ⛔ not built. Needs the store's own install-source data, or a UTM captured at the landing site (`forgelegacy.app` — a separate Cloudflare surface). |
| **Landing site → App Store → install → signup** | ⛔ the top of this funnel lives on a different host from everything else here. |
| **App Store impressions → product page views → downloads** | ⛔ App Store Connect only. Never reaches Postgres; link out. |

---

## 5. Conversion — the funnel that does not exist yet

This is the section with the **least** existing instrumentation and the **most** value after Phase F.

The good news: **`app_events.kind` is free-form `text` with a length check, not an enum** (`0131`), so
every event below can be emitted with **no migration at all** — just `track()` calls.

The path, stage by stage:

1. `paywall_reached` — **which of the nine M-7 triggers fired**; if a cap, which cap
2. `paywall_viewed` — P-8 rendered
3. `plan_selected` — and which slot: annual (pre-selected) / monthly / founder / lifetime
4. `purchase_started` — the native sheet opened
5. `purchase_completed` / `purchase_cancelled` / `purchase_failed`
6. `trial_started` → `trial_converted` / `trial_cancelled`
7. `restore_attempted` / `restore_succeeded`

And from those, the metrics:

| Metric | Why it earns its place |
|---|---|
| **Conversion by trigger** | Tells you *which cap actually sells*. MA3 says every cap number is a guess — photos 75, programs 3, squads 1 — and calls them Initial Assumptions to be reset at p50–p60 of engaged behaviour. This is the data that ends the guessing. |
| **Paywall view → purchase rate** | The core funnel step. |
| **Plan mix** | Annual is pre-selected and lifetime is "last and never steered toward" (P8W-D8). If lifetime dominates anyway, that is a finding. |
| **Trial start rate, trial → paid rate** | If you run an intro offer, this is the single biggest lever on MRR. |
| **Time from signup to purchase** | Median days. Decides whether a trial is even the right instrument. |
| **Cap-hit without purchase** | Athletes who hit a wall and did *not* buy. The most valuable and most commonly ignored number in a freemium app. |
| **Purchase failure rate** | Separates "would not" from "could not". `billing.ts` already distinguishes `failed` from `unavailable` — carry that distinction all the way to the dashboard. |

⚠ **Instrument the paywall events BEFORE Phase F, not after.** They cost nothing while everyone is
Premium, and they are the baseline you compare the flip against. Retrofitting them means the first month
of real revenue has no funnel behind it.

---

## 6. Retention and churn

### 6.1 Already built — usage retention

| Metric | Source |
|---|---|
| Weekly signup cohort × weeks-since grid | ✅ `admin_retention_cohorts` — and it correctly greys **UNKNOWN** cells instead of drawing them as 0% |
| DAU / WAU / MAU, stickiness | ✅ `admin_engagement` + `admin_events.presence` |
| Median days between workouts | ✅ `admin_engagement.medianDaysBetween` |
| **Churn-risk buckets** | ✅ `admin_engagement.churnRisk` — days since last activity, bucketed |
| Session count, median and p90 length, screens per session | ✅ `admin_events.sessions` |
| D1 / D7 / D30 retention as headline numbers | ⚠ the cohort grid contains them; they are not surfaced as tiles |

### 6.2 Not built — revenue churn

| Metric | Note |
|---|---|
| **Logo churn** | subscribers lost ÷ subscribers at period start |
| **Revenue churn** | the same, weighted by MRR — a churned annual subscriber hurts twelve times what a monthly one does |
| **⭐ Auto-renew-off rate** | **The most actionable subscription metric there is.** Apple reports intent to cancel the moment the toggle flips — days or weeks before the subscription actually ends. It is the only churn signal that arrives while you can still do something about it, and it requires the RevenueCat webhook; nothing else surfaces it. |
| **Involuntary vs voluntary churn** | A billing failure or grace period is not a decision. Involuntary churn is recoverable and is often 20–40% of the total; treating them as one number means optimizing the wrong thing. |
| **Grace-period recovery rate** | |
| **Renewal rate by plan and by cohort** | Annual renewals arrive in one lump twelve months later. A bad annual cohort is invisible for a year unless it is cohorted from day one. |
| **Resurrection / win-back** | Lapsed athletes who repurchase. |
| **⚠ Entitlement lapse vs account abandon** | Two different events. Someone can stay in the app on Free after churning — MA3's *Never Charge For History* means their whole training log stays readable. **A churned subscriber who still opens the app daily is a win-back candidate; one who vanished is not.** Most products cannot make that distinction. This one is built so that it can, so the dashboard should. |

---

## 7. Engagement and product — already strong

Listed for completeness. All of this is live in `/admin` today.

| Section | What it gives | RPC |
|---|---|---|
| **Overview** | athletes, active, signups, workouts, hours all-time, median workouts per active | `admin_overview` |
| **Feature adoption** | ever-used vs used-in-window, per feature | `admin_feature_adoption` |
| **Program adherence** | adherence %, sessions completed and skipped, graduated, **finished** (short programs, `0155`), ended early, drop-off by week | `admin_feature_adoption.programs` (`0166`) |
| **Content popularity** | top exercises, activity mix, cardio modality mix, **session source** (program / template / freestyle), top honors | `admin_content_popularity` |
| **Social health** | squads (created, public, active, posts, check-ins, size histogram, join requests), friends (accepted, pending, median), challenges (created, completed, cancelled, live, by type), **push sent and failed by kind** | `admin_social_health` |
| **Events** | screens viewed, actions, sessions, platform split, **and the opt-out count, so coverage is visible** | `admin_events` (`0133`) |

⚠ **`admin_events.optedOut` is the model to copy everywhere.** It reports how many athletes contribute
nothing, so a number is never read as a population figure when it is a sample. Any revenue metric derived
from a partial source deserves the same denominator disclosure.

**The gap in this section:** there is no **Coach Holt** block. Holt is what the paid tier sells, and the
dashboard cannot currently say how many programs it generated, how many survived past week one, how many
were edited, or how often it refused (endurance refuses rather than guesses). That is arguably the most
important *product* metric in the app, and it is missing.

---

## 8. Product health — built, and part of it is an App Store obligation

| Metric | Source | Note |
|---|---|---|
| Distinct bugs, occurrences, **athletes affected**, fatal count | ✅ `admin_client_errors` (`0176`) | ⚠ ranked by athletes affected, not occurrences — correct |
| Crash-free rate | ⛔ | Needs Sentry — Stage 2, blocked on a native build |
| Feedback: unanswered, bugs, total, last received | ✅ `admin_feedback` (`0167`) | |
| **Moderation queue: open / actioned / dismissed / oldest still open** | ✅ `admin_reports` (`0171`) | ⚠ **Guideline 1.2 requires reporting AND timely response.** "Oldest still open" is a compliance metric, not a nice-to-have. |
| **`update_id` on every error** | ✅ | The only field that can answer *"did my fix ship"* — `app_version` is `1.0.0` on every OTA |
| App Store rating and review volume | ⛔ | App Store Connect only |

---

## 9. Cost — so the top line means something

| Metric | Note |
|---|---|
| **Store commission** | 15% or 30%. The single largest cost line, and it is automatic. |
| **Coach AI token spend, per athlete per month** | ⚠ MA3-D1 is explicit that Coach AI is *"a conversation that costs money every time it happens"* and is **never sold as a lifetime**. A per-athlete cost figure is what proves that rule still holds. `coach_ai_config` (`0144`) is the thing to meter against. |
| **Gross margin per paying athlete** | (net revenue − AI − storage − infra) ÷ paying |
| **Supabase storage growth** | 75 photos and 5 videos free per athlete. **Storage caps reopen on delete; creation caps do not** (`0145`) — so storage cost tracks live counts, never the monotonic counters. |
| **Push volume** | ✅ already in `admin_social_health.push` |

---

## 10. Where each number lives — and the reconciliation you will need

| Source | Owns | Lag |
|---|---|---|
| **RevenueCat** | MRR, churn, trials, plan mix, auto-renew status, refunds | near-realtime |
| **App Store Connect** | proceeds actually paid, impressions → downloads, ratings | 1–2 days, and in *Apple's* fiscal calendar |
| **Postgres (`/admin`)** | everything about behaviour; `athlete_entitlement` as the app's own entitlement answer | realtime |

⚠ **`athlete_entitlement.tier` is not a payment record and must never be reported as one.** `0145` says it
plainly: a purchase "makes the *store* believe they paid", and the server-side entitlement is what the app
then re-reads. A `GRANT` row is fully entitled and worth $0. **Every revenue figure must come from the
billing platform and every entitlement figure from Postgres — and the dashboard should carry a
reconciliation count where the two disagree**, because they will, and the day they silently disagree is
the day the numbers stop being worth reading.

⚠ **One clock.** `0130` already fixes the whole dashboard to a single operator timezone passed by the
client, never a per-athlete `profiles.tz`. Store reports arrive in a different calendar again. Any
month-boundary revenue figure needs its timezone stated on screen, exactly as `activeDef` already is.

---

## 11. Recommended build order

| # | Step | Cost | Unblocks |
|---:|---|---|---|
| 1 | **Emit the §5 paywall and purchase events now** | `track()` calls only — **no migration**, `kind` is free text | The whole conversion funnel, with a pre-flip baseline |
| 2 | **`admin_monetization()` — the tier breakdown** | one RPC over `athlete_entitlement` + `athlete_tier()` | Free/paid split, plan mix, grants isolated, Founder seats — **all readable today** |
| 3 | **Surface referral attribution** | one RPC over `referral_attribution` (`0170`, built, unread) | Referred vs organic |
| 4 | **A Coach Holt adoption block** | reads existing tables | The product metric for the thing the paid tier sells |
| 5 | **RevenueCat adapter + webhook** | Phase E 4.2 — **native build, no OTA** | MRR, churn, trials, refunds, auto-renew-off, and `grant_referral_credit()` finally firing |
| 6 | **The revenue section in `/admin`** | after 5 | The §1 top row |
| 7 | Sentry | Stage 2, native build | Crash-free rate |

**Steps 1–4 need no billing SDK, no native build, and no new table.** Those are the ones worth doing this
week. 5–7 wait on the build that is already on the checklist.

---

## 12. Decisions this needs from you

1. **Does a revenue section violate AA-D2?** AA-D2 forbids "a named athlete beside a number", and AA-D9
   makes that absolute for *performance* data. Amendment 001 already established (AA-D8) that **facts
   about the service's own customer relationship are a different category** from facts about training.
   Payment sits squarely in that category — but it is a new decision, not an extension of an old one, and
   it should land as **Admin-Analytics-Amendment-002 (AA-D12)** before anything is built. My reading:
   aggregates need no amendment at all; a named-customer payment view does.
2. **The monthly and annual price points.** `founder_lifetime_149` is the only price in the repo. Nothing
   in §2 can be modelled without the other two, and P8W-D3 means they may only ever live in App Store
   Connect — so the *decision* still has to be recorded somewhere, and this document is not it.
3. **Trial or no trial.** It changes the shape of the §5 funnel and is the largest single swing on MRR.
4. **One dashboard or two?** RevenueCat's own dashboard is good and free. The realistic answer is that
   `/admin` keeps behaviour and links out for money — which is fine, provided the free/paid split and the
   conversion funnel live *inside* `/admin`, since those need the behavioural half to mean anything.

---

## Change log

| Version | Date | Change |
|---|---|---|
| Proposal | 2026-08-21 | Initial. Written against `/admin` as built through `0176`. |
