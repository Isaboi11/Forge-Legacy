# Error Reporting — Forge Legacy

**Status:** Stage 1 BUILT (2026-08-21) · Stage 2 (Sentry) PLANNED, blocked on the next native build
**Migration:** `0176_client_errors.sql`
**Governs:** `src/lib/diagnostics.ts`, `src/domain/diagnostics/breadcrumb-core.ts`, `src/data/errors-live.ts`, `/admin` § Errors

---

## 1. The problem this exists to solve

> PO, 2026-08-21: *"sometimes we're guessing at what the error is … catch the exact path they're going in
> instead of having to ask them, but we capture on the back end and are able to fix it right away."*

The guessing is on the record. `Forge-Legacy-Master-Status.md` documents the **"THE APP IS FROZEN"** week:
the diagnosis was **wrong twice** — a missing `profiles` row (disproved by one query), then an RLS block
(disproved by `.single()` erroring rather than returning null) — before the cause turned out to be the last
line of `routeFor`. Three of the first 28 accounts were trapped.

Throughout, **TestFlight showed `Crashes: –`**.

That is the shape of the problem, and it is the reason this is not just "add Sentry":

> **This app's characteristic failure is not a native crash. It is a JS fault, or a control that silently
> does nothing, on a device nobody can attach a debugger to, described second-hand by an athlete who has
> no reason to know what a stack trace is.**

Apple already reports native crashes. Nothing reported the other kind. `ScreenBoundary` has been catching
JS faults since it was written and printing them to `console.error` — a console that, on a tester's phone,
nobody will ever read.

---

## 2. What Stage 1 does

Three things, and the third is the one that answers the actual question.

### 2.1 It catches the error

| Door | Catches | Where |
|---|---|---|
| `ErrorUtils.setGlobalHandler` | every uncaught JS exception, fatal and not | `lib/diagnostics.ts` |
| rejection tracking | unhandled promise rejections (a failed `await`) | native, via RN's own tracker |
| `unhandledrejection` / `error` | the same, on the web preview | `globalThis.addEventListener` |
| `ScreenBoundary.componentDidCatch` | a screen that threw during render | `components/screen-boundary.tsx` |
| `OverlayBoundary.componentDidCatch` | a global decoration that threw | `components/overlay-boundary.tsx` |
| the Supabase `fetch` wrapper | every failed request, as a breadcrumb | `lib/supabase.ts` |

> ⚠ **Every handler chains to the one it replaced.** RN's default global handler is what shows the redbox
> in development and reports a fatal natively. Replacing it outright would trade the errors you can
> already see for the ones you cannot — strictly worse than no reporter, and silent.

### 2.2 It names *which bug*, not *which occurrence*

Every report carries a **fingerprint**: a hash of the error name, the message with its variable parts
normalised out, and the first stack frame in our own `src/`. Rows group by it.

That is the difference between a usable dashboard and a firehose. 400 raw rows is a list nobody opens
twice; *"eleven bugs, one of them hit 312 times by 9 people"* is a morning's work, already ordered.

Ranking is by **athletes affected**, not occurrences. 200 crashes from one tester is a bad afternoon;
12 crashes across 12 people is a release blocker, and sorting by volume gets that backwards.

### 2.3 ⭐ It carries the trail

The last **40 steps** before the fault: screens opened, actions taken, requests that failed.

The "frozen app" week would have read:

```
· sign_in_submitted
→ /onboarding
· onboarding_continue
→ /onboarding                        ×214
```

and ended in about a minute.

**Consecutive repeats collapse** (`×214`). Without that, a render loop fills the 40-crumb window with the
symptom in milliseconds and pushes the cause out — so every report of the worst bug class would arrive with
its evidence already overwritten. `×214` is also a better description of a redirect loop than 214 identical
lines.

Actions come **free** from the existing `track()` calls — the app already reports `sign_in_submitted`,
`onboarding_continue`, `workout_saved`. Routing those through `breadcrumb()` means the trail stays current
as the product grows instead of decaying into whatever somebody remembered to annotate.

### 2.4 ⭐ It says whether your fix worked

`app_version` is `1.0.0` for **every OTA ever published on top of build 6** — it cannot answer "did that
fix land". `update_id` names the exact bundle, so *"no occurrences on `01a02293…`"* is a real answer.

The bug's triage status (`NEW → ACKED → FIXED → IGNORED`) is keyed by **fingerprint**, and **deliberately
does not reset** when a fixed bug recurs. That asymmetry is the point — it lets the dashboard say:

> ⚠ marked FIXED on Aug 19 — **4 since**

which is how you learn a fix did not take. A self-resetting status can never say it.

---

## 3. Reading it — `/admin` § Errors

Range-scoped (7D / 30D / …), which is the one operator queue that should be: unlike a support ticket, a
crash on a build nobody runs is not a to-do item. The chips are how you ask *"is this still happening"*.

Tap a bug to open the trail, the stack, the component stack, the device, and the OTA it happened on. The
list names nobody (AA-D2); identity appears one level down, where you are working a specific bug — the
`admin_feedback` precedent, since *"three accounts are trapped in onboarding"* is not actionable without
knowing which three.

> ⚠ **The "Reporting" row is an honest-zero guard and it reads the OPPOSITE way from the one on Feedback.**
> Zero errors is the outcome we want *and* exactly what a broken reporter looks like. So the row says which
> of the two it is. Once the client is deployed, **"nothing has EVER been reported" is the bug**.

---

## 4. What it does NOT catch

Stated plainly, because a reporter you over-trust is worse than one you under-trust.

- **Hard native crashes.** The app quitting to the home screen kills the JS engine before anything can
  send. TestFlight / App Store Connect → Crashes is still the surface for those. Stage 2 fixes this.
- **A device with no network** at the moment of the fault. There is no offline queue — an error report is
  not worth the complexity of durable retry, and the same bug will report from the next athlete.
- **Anything before the first JS line executes** — a native launch failure, a bad binary.
- **Errors from an athlete with product-usage measurement off** — no, correction: those *are* caught, but
  **without the trail**. See § 5.

---

## 5. The privacy line

Three tables, three different rules, and they are not interchangeable:

| Table | Rule |
|---|---|
| `app_events` (0131) | Allowlisted. Never a word the athlete wrote. |
| `feedback` (0167) | Deliberate free text — a support message is only useful in their own words. |
| `client_errors` (0176) | **The first rule, with one carve-out.** |

**Breadcrumbs follow 0131 exactly** — route *shapes* (`/squad/[id]`, never `/squad/9f3c…`), enum-shaped
action names, ids. PO decision 2026-08-21, chosen over an "everything including input" option that was
offered and declined. Enforced in `domain/diagnostics/breadcrumb-core.ts` and **tested** — a value with
whitespace in the middle is treated as prose and dropped at every door.

**The carve-out is `message` and `stack`.** An error message *is* the payload; redacting it leaves a
timestamp attached to nothing. It can incidentally quote athlete text (`invalid input value "Push Day A"`),
which is accepted deliberately, bounded at 2000 characters, disclosed in both privacy surfaces, and pruned
at 90 days.

### ⭐ The opt-out is SPLIT, and the split is the design

"Help improve Forge" **off** →

- the **trail** stops. A route trail *is* usage, and collecting one anyway under a different table name
  would be a back door through the promise `props-core.ts` exists to keep.
- the **fault** still reports — what broke, on which screen, on which build. That is a defect in our
  software, not a record of their behaviour.

Without the trail we know something is broken. With it we know how to reproduce it. Both are honest
positions; only one of them is theirs to decline.

> ⛔ **`site/privacy.html` and `Docs/Legal/Privacy-Policy.md` both carry the "Diagnostics" section, and it
> must be PUBLISHED before `0176` is applied** (P6-A1-D8). `site/` is a separate Cloudflare deploy —
> writing the paragraph is not publishing it.

---

## 6. Safety properties, and why each one is load-bearing

| Property | Why |
|---|---|
| Every export is sync, returns void, cannot throw | Every caller is *already* inside a failure. A reporter that throws becomes the crash. |
| `report_client_error` swallows every internal error | Same reason, one layer down. It returns `null` rather than raising. |
| `diagnostics.ts` imports **nothing** that reaches `lib/supabase` | `lib/supabase` imports *it*. A cycle here deadlocks module-init on Hermes and the app does not launch. The send path is a registered **sink**. |
| Armed at **import time** in the root layout, not in an effect | The launch crash this project shipped happened before anything mounted. A reporter started from `useEffect` would have been silent for exactly the failure it most needs to catch. |
| Rate limited 30/hour per session **and** 5000/hour globally | The first is a render loop. The second is that `session_id` is client-minted and the anon key is public by design — rotate one and the per-session cap is defeated. |
| Client-side de-dup: 5 per fingerprint, 25 per session | The server caps too, but by then the radio has already been woken sixty times a second. |
| `user_id` is **nullable** | A launch crash has no session. `report_client_error` is granted to `anon` for this reason alone. |
| `session_id` is the **same** id `app_events` mints | An error row joins to the athlete's usage trail for the same sitting, so 40 crumbs can be extended backwards across the whole session. Two independently-minted ids would silently return nothing on that join. |

---

## 7. Stage 2 — Sentry

**Why not now:** `@sentry/react-native` carries a **native module**. It cannot ride an `eas update`, and
every tester is on build 6. Stage 1 is a Postgres table reachable from the JS bundle, which is why it ships
OTA to the people hitting bugs today.

**What Sentry adds that Stage 1 cannot:**

- native crash capture with symbolicated traces
- source-mapped stacks (Stage 1 stores the minified frame; you read the fingerprint's top frame, not a line
  in your editor)
- session replay, release health, alerting

**What it costs, beyond the subscription:**

1. **A new native build + TestFlight review.** Fold it into the RevenueCat/paywall build, which is already
   required.
2. **A privacy-label change.** `Docs/App-Store-Privacy-Labels.md` currently argues *"`package.json` carries
   no ad or analytics SDK, so no ATT prompt is required."* Sentry adds **Crash Data** and **Performance
   Data** under Diagnostics. Still no ATT prompt (not used for tracking), but the declaration changes —
   and `Docs/Legal/Privacy-Policy.md` § 3 currently promises **"No third-party crash or error reporting …
   no Sentry, Bugsnag or Crashlytics."** ⛔ **That sentence must be edited before Sentry ships, not after.**

**They are complements, not a migration.** Keep Stage 1 when Sentry lands: it owns the breadcrumb trail
under a privacy rule we control, it joins to `app_events`, and it costs nothing per event.

---

## 8. Open decisions

| # | Decision | Status |
|---|---|---|
| ER-D1 | Breadcrumbs record route + action + ids; never input text | ✅ PO, 2026-08-21 |
| ER-D2 | The analytics opt-out drops the trail, keeps the fault | ✅ Built as described in § 5 |
| ER-D3 | `report_client_error` granted to `anon` to catch pre-session crashes | ✅ Built; rate limits in § 6 |
| ER-D4 | Sentry in the next native build | ⏳ Blocked on the paywall build |
| ER-D5 | `ScreenBoundary` wraps only 2 of 77 screens today | ⏳ **OPEN.** The global handler catches the rest, but they get no *recovery UI* — a throw during render blanks or kills the screen instead of naming itself. Widening it is a separate pass. |
| ER-D6 | No offline queue for reports | ✅ Deliberate — see § 4 |
