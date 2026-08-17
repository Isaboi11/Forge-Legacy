# Launch Checklist — Free & Premium

## v1.1 | 2026-08-13 · THE WORKING LIST

**Purpose:** get Forge Legacy released with **Free and Premium only**. Written to be picked up by a
session with no prior context. Work top to bottom; each item names its own files and its own finish line.

### ⚠ v1.1 — THE RELEASE IS TWO STAGES, AND THEY RUN IN PARALLEL

PO decisions, 2026-08-13: **the 20 testers get it now and some of them get it free; the public release
carries the paywall; and the public release ships under a new Forge Legacy LLC organization account.**

That splits this list in two, and the split is the schedule:

| | **Stage 1 — TestFlight** | **Stage 2 — Public** |
|---|---|---|
| **Audience** | the 20 OG testers | everyone |
| **Apple team** | existing `G722GV8H8C` (§8) | **new Forge Legacy LLC org account** (§9) |
| **Entitlement** | `default_tier` stays `PREMIUM` — nothing gates | Phase F flip (§6) |
| **Needs** | §8 only — the DB blockers and a build | §4 Phase E · §5 Legal · §6 · §9 · §10 |
| **Blocked by** | nothing but §8.1 | **a D-U-N-S number: 3–14 days, and it has not been started** |

**The D-U-N-S wait is the build window, not dead time.** Start §9.1 the day the LLC is filed; Phase E
(§4) is roughly the same length and has no dependency on it. Do not let the two run in series.

**Section order is no longer execution order.** Execute: **§8 → (§9.1 and §4 in parallel) → §10 → §5 →
§6 → §7.**

**Coach AI is deliberately NOT in this list.** PO decision 2026-08-12: no AI spend before full release,
and no AI for testers. The D1 groundwork is already written and sits unused, costing nothing —
`supabase/migrations/0144_coach_ai_credits.sql`, `supabase/functions/coach-interpret/`,
`src/data/coach-interpret-live.ts`, `src/domain/coach/medical-routing.ts`. **Do not apply 0144 or deploy
that function as part of this launch.** Scope for it later: `Docs/AI-Coach-Capability-Scope-v0.1.md` and
`Docs/Coach-AI-Preflight-Gates-v0.1.md`.

---

## Read before touching anything

1. **`Forge-Legacy-Master-Status.md`** — required by `AGENTS.md` before any work. Dashboard, Decision
   Queue, Recently Completed.
2. **`~/.claude/plans/i-need-to-figure-reflective-hellman.md`** — the locked Pricing Structure &
   Monetization Build Plan. **This is the authority on every number below.** Free is approved 26 of 26
   lines, Premium 12.
3. **`Docs/Amendments/Monetization-Architecture-Amendment-001.md`** (LOCKED) and
   **`Docs/P-8-Subscription-Architecture.md`** (LOCKED).

### Standing rules this repo has been bitten by

- **`ls supabase/migrations | tail` before authoring any migration.** Numbering is the dependency graph;
  there is no CLI keeping a history table. ⚠ **v1.1: files now run through `0154`, not 0143** — the line
  below was already stale eleven files later, which is the failure this rule exists to prevent.
  **`0144` is taken** (Coach AI, deliberately unapplied). ⚠ **`0152` is used twice** —
  `0152_discover_trained_today.sql` and `0152_weekly_review_created_at.sql`. Both must be applied; neither
  can be identified by number alone.
- **Migrations are applied by pasting into the Supabase SQL editor.** No CLI, no service key. Use
  **`supabase/apply/preflight-0146-0153.sql`** to ask the database what is really applied — the ledger
  in the dashboard has been wrong before and cost a session, and it is wrong right now (§8.1).
  `preflight-what-is-applied.sql` is the older, narrower one and mislabelled `app_admins`.
- **`@/` is type-only inside `src/domain/`.** A runtime `@/` import there breaks `node --test`. Use
  relative `.ts`.
- **`git status` before any publish.** Publishing bundles the working tree, not HEAD. Another session's
  uncommitted work has shipped to a phone before.
- **Concurrent sessions want separate branches.** Three commit collisions so far.
- **Gates, every time:** `npx tsc --noEmit` → 0 · `node --test --experimental-strip-types "src/**/__tests__/*.test.mjs"` → all green (2,062 at time of writing) · `npx expo lint` → baseline **1 error + 13 warnings** (both pre-existing).
- **Never hardcode a price anywhere in `src/`.** P-8 §80 is binding: price is read from the platform
  catalog at runtime.

---

## 0 · Paperwork that blocks legitimacy — ✅ **DONE 2026-08-12**

Do this first. It is small, and everything below is built on it.

> **All five items complete, and — the part that matters — Amendment 003 was *applied* into every document it
> amends in the same pass, not left as a pointer.** Written:
> `Docs/Amendments/Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` (LOCKED).
> Its §10 is the application ledger and every row is ✅.
>
> **Two things found while doing it, both worth knowing before Phase C:**
> 1. **Amendment 001's §11 and §13 had contradicted its own §4 since 2026-08-05 — the same day it was
>    revised.** Fixed.
> 2. **The in-workout Holt cap cannot fire M-7.** §12 has always banned M-7 during an active workout; that
>    rule is older and locked and it wins. The cap is enforced by **not rendering the control on Free**
>    (M7-D13). Build it that way — a gate that opens a modal mid-set is the wrong build.

- [x] **0.1 — Write `Docs/Amendments/Monetization-Architecture-Amendment-003.md`.** ✅
      Amendment 001 §4 currently states there is **no tier above Premium**, which forbids the Coach AI
      add-on outright. Amendment 003 must: authorize the add-on model · record the Holt free/paid split
      (1 four-week program lifetime + 2 single days/month, no in-workout Holt on Free) · record the
      referral program · set the squad cap at **1 free / 5 paid** · state the organising principle
      (*your legacy is yours forever; the coach is a service*).
      ⚠ This project's recurring failure is an amendment that is locked and never applied. Write it.
- [x] **0.2 — Supersede the squad cap in `Docs/Amendments/Critical-Decisions-Amendment-001.md`.** ✅ **v1.1.**
      Decision 4 carries a superseded banner with the full chain (Amdt 001 said 1 → this said 2 → MA3-D7
      says 1). Rules 3–6 hold verbatim against the new numbers. **Decision 3's photo figure was also stale**
      — the account-wide ruling stands, "50" does not.
- [x] **0.3 — Update `Docs/M-7-Premium-Upsell-Spec.md`.** ✅ **v1.1.** 75 photos, 1 squad, **4 triggers → 9**,
      counting-exclusion table (Forge templates and squad check-ins never count), every cap number injected
      from config, W-1 references removed. ⚠ **In-workout Holt is suppressed, not gated** (M7-D13).
      **Coach AI never appears on M-7** (§6.4, M7-D16).
- [x] **0.4 — Resolve `Docs/P-8-Subscription-Wireframe-Spec.md` open question #2.** ✅ **v1.1, §11.**
      Four-option picker, annual pre-selected, lifetime last and never pre-selected, Founder row only while
      seats remain and **not at all if the count cannot be read**. Disclosure line above the buy button.
      **RevenueCat** (P8W-D10) — ⚠ new native dependency, so a new iOS build, not an OTA.
- [x] **0.5 — Add a Decision Queue row to `Forge-Legacy-Master-Status.md`** ✅ **row 22.** Row 14 item (1) is
      closed (75, shared counter); **items (2) and (3) are still open, so the row stands rather than being
      deleted.** Recently Completed entry added.

---

## 1 · Phase B — entitlement plumbing (nothing gates yet) — ✅ **DONE 2026-08-12 · MIGRATION APPLIED**

Goal: the app can tell Free from Premium, and **no behaviour changes at all**.

> **✅ `0145` IS APPLIED**, confirmed 2026-08-12 against the database via
> `supabase/apply/preflight-what-is-applied.sql` — all five rows read `APPLIED`, **including
> `programs_cap_guard_trg`**, which is the one that matters: the tables can exist without the trigger if a
> paste is truncated, and in that state the program cap silently never fires.
>
> **`0144` correctly reads MISSING** — Coach AI stays unapplied by PO decision.
>
> ⚠ **`my_entitlement()` and every other `my_*` function raise 28000 in the SQL editor**, which runs as
> `postgres` with no `auth.uid()`. That is the guard working; they are verified from the app. The
> session-free checks are in the migration's footer.

- [x] **1.1 — Migration `0145`** ✅ `supabase/migrations/0145_entitlement.sql` (`ls | tail` confirmed 0144
      was the last; 0144 remains unapplied Coach AI and is untouched). Lands `entitlement_config` (one row,
      **every cap and allowance as jsonb, `-1` = unlimited**), `athlete_entitlement`, `athlete_usage`,
      the Holt lifetime + **lazily-refilling monthly** counters, `has_used_free_import` (**zero prior
      occurrences in code or SQL — the locked import model had never been given anywhere to live**),
      `referral_codes` + `referral_credits` with the 12-month rolling cap, and the Founder seat counter
      **derived, never stored** (a stored counter that drifts high sells seat 101).
      ⚠ **`programs_cap_guard()` is a real BEFORE INSERT trigger on `programs`** — counting and enforcing
      in one atomic statement, so the five call sites that create programs cannot each forget. **No
      `after delete` trigger, deliberately** (MA3-D9): adding one "for symmetry" silently stops the program
      cap ever firing.
- [x] **1.2 — Invite-funnel events** ✅ `src/domain/analytics/invite-funnel.ts` +
      `trackInvite()`. **`sent` and `accepted` are wired now** (program share, squad invite + join,
      challenge create + join, friend accept); **`installed` and `converted` are declared and unreferenced**
      — they need a code that survives the App Store round trip and a first payment, both Phase E.
      Every prop key reuses the existing privacy allowlist rather than widening it.
      ✅ **`0131–0133` were ALREADY APPLIED** — confirmed against the database 2026-08-12 via
      `preflight-what-is-applied.sql` (`app_events`, `athlete_activity`, `metrics_daily` and both cron jobs
      all present). **This item contradicted the standing rules at the top of this file**, which said
      "applied through 0143"; the standing rules were right and §1.2 was carried over stale from the
      pricing plan. Nothing to paste.
- [x] **1.3 — Replace `src/lib/entitlement.ts`** ✅ → **`entitlement.tsx`** (provider + hooks; the old
      `.ts` is deleted and both importers still resolve). Still the ONE place that answers the question.
      Every existing athlete defaults to a **seat-free PREMIUM grant** via `entitlement_config.default_tier`
      — no backfill needed now, and no migration needed at Phase F either: **it is one UPDATE.**
      ⚠ **Three states, not two.** `unknown` is distinct from `blocked`, because M-7 §10 forbids an upsell
      when entitlement cannot be verified. Cap gates fail **closed** (block + retry, no modal); feature
      display fails **open**, so a paying athlete offline is not shown a locked card.
      ⚠ Not a security boundary — the gate is `programs_cap_guard()` in Postgres.
- [x] **1.4 — Verify** ✅ `tsc` 0 · `node --test` **2,087 green** · lint at baseline (1 error + 13 warnings).
      **The force-to-Free device pass is still owed** and cannot be done from here — the SQL is in
      `0145`'s footer (`insert into athlete_entitlement … 'FREE'`, and a one-line delete to undo).

---

## 2 · Phase C — caps and gates (present but dark) — ✅ **DONE 2026-08-12**

Goal: every limit is enforced, everyone is still entitled, so nothing is felt yet.

Reuse the cap pattern at `src/domain/exercise-picker/custom-core.ts:16` — the only enforced cap in the
app today and the right shape.

> **What was built.** `src/domain/entitlement/caps-core.ts` (pure, 19 tests) holds the arithmetic;
> `useCapGate` / `useCapGates` read it; **`usePremiumGate()` is the ONE way a cap becomes an M-7** and it
> honours all four of M-7's locked rules in one place rather than nine.
>
> **⚠ It is NINE gates, not eight.** The table below counts photos and videos as one row; they are two
> counters with two caps and two different exclusion rules, and they are checked separately.

- [x] **2.1 — The caps** ✅ Each is a **pre-action** check that blocks and opens M-7 *before* the
      flow starts — never a dead end halfway through.

      | Cap | Free | Surface |
      |---|---|---|
      | Holt programs | 1 four-week, lifetime | `src/app/coach.tsx`, `src/domain/coach/` |
      | Holt single days | 2/month, refilling | same |
      | Holt in-workout | none on Free | in-session entry from `src/app/workout.tsx` |
      | Programs | 3 lifetime — built, generated, **or received** | `src/app/program-builder.tsx`, `src/app/send-program.tsx` |
      | Imports | 1 lifetime | the import BottomSheet |
      | Squads | 1 | `src/app/create-squad.tsx`, `src/app/join-squad.tsx`, invite acceptance |
      | Photos | 75 | `src/app/add-photo.tsx`; restore the "X of 75" counter withheld at `src/app/photos.tsx:63-67` |
      | Videos | 5 persistent | `src/lib/useMediaPicker.tsx` — check-ins never count |
      | Day templates | 5 | `src/app/templates.tsx` — the 81 Forge templates never count |

      ⚠ **Program slots do not reopen on delete**, or the cap never fires for someone running one block
      at a time. **Workouts logged against a deleted program are kept forever** (Never Charge For History).

      **Where each one actually landed:**

      | Cap | Gate site | Note |
      |---|---|---|
      | Programs | `(tabs)/squads`-style pre-tap in `program-builder` `onSave` (create paths only) | **Edit is NOT gated** — a Free athlete at the cap must still be able to fix a typo in a program they own |
      | Programs (received) | `program-share/[id].tsx` `accept` | Fires on the **recipient's** device, before the RPC, so the offer survives the refusal |
      | Imports | `program-builder` `openImport` | **Two caps guard one button** — an import creates a program, so `imports` AND `programs` are both checked |
      | Squads | `(tabs)/squads` `goCreate` · `join-squad` `onContinue` · `create-squad` `onCreate` (backstop) | |
      | Photos | `add-photo` `choose` · `transformation-add` `pickPose` | **The cap decides what the picker OFFERS** — images-only when video is full, and vice versa |
      | Videos | `add-photo` `choose` · `transformation-add` `pickVideo` | ⚠ **Not in `useMediaPicker`**, deliberately — that would count squad check-ins, which are uncapped on every tier (MA3-D14). The note is in the file |
      | Templates | `templates` `newTemplate` | The 81 Forge starters are code constants, never rows, so they cannot be miscounted |
      | Holt program / day | `coach.tsx` mode buttons | Before the six-question flow, not after it |
      | Holt in-workout | `workout.tsx` `holtHidden` | ⚠ **SUPPRESSED, NOT GATED** — see 2.2 |
      | Photo counter | `photos.tsx` "X of 75" | **Restored.** It was withheld because a limit nobody could pay to remove is a threat; the tier now exists. Hidden entirely for Premium, whose 1,000 is a guard, not an offer |

- [x] **2.2 — Wire M-7 real triggers** ✅ `src/hooks/usePremiumGate.ts` is the single path; the harness
      call at `ceremony-harness.tsx` is left as the dev preview it always was, but **it is no longer the
      only caller**. Copy renders reason + four benefit rows + the fixed reassurance line from
      `caps-core`, with **every number injected from server config** (M7-D14).
      **All four locked rules honoured:** never during an active workout · never auto-reopen (deduped on
      `m7-<cap>`) · **never fires when entitlement cannot be verified** — the surface shows *"Unable to
      verify your subscription. Try again."* · and Coach AI appears nowhere on it (M7-D16, test-enforced).
      ⚠ **The in-workout Holt cap CANNOT fire M-7** and does not try. §12's ban on M-7 during W-9–W-16 is
      older and locked and it wins, so the Free in-session Holt control is simply **not rendered**
      (M7-D13). Manual substitution stays free — nobody is stranded mid-set.
      ⚠ **"Upgrade" has nowhere to go yet.** P-8 is item 4.1. Until it exists the tap shows *"Subscriptions
      open with the next release."* — flip `SUBSCRIPTION_ROUTE_BUILT` in `useCeremony.tsx` when 4.1 lands.
      Nobody sees this today: everyone is entitled, so no gate fires.
      ⚠ **`ForgePremiumModal.tsx` was deliberately NOT used** despite being built for this. It is in the
      six libraries reclassified LEGACY/REFERENCE, and the one path that asks an athlete for money is the
      wrong place to debut a legacy component. Recorded in `copy.ts` so it reads as a choice.
- [x] **2.3 — Tests** ✅ 19 in `src/domain/entitlement/__tests__/caps-core.test.mjs`, relative `.ts`
      imports. They pin the off-by-one (75 means the **76th** is refused), that `unknown` never collapses
      into `blocked`, that in-workout Holt is a **switch and not a quantity** (0 ≠ unlimited), that the
      Holt lifetime and monthly counters are independent, that a malformed count cannot open every gate at
      once, and that no cap number is a literal. **Referral-credit accrual is enforced in SQL, not TS** —
      the rolling-year cap lives in `grant_referral_credit()` and has no domain module to test.
- [x] **2.4 — Verify** ✅ `tsc` 0 · **2,087 tests green** · lint baseline (1 error + 13 warnings).
      **The nine-limit device walkthrough is still owed** and needs 0145 applied plus a forced-Free row.
      The entitlement-read-failure case is exercised today by simply *not* applying 0145: every gate reads
      `unknown`, blocks, and shows the retry — which is that test, run by accident.

---

## 3 · Share-card export — broken, and now acquisition-critical — ✅ **DONE 2026-08-12 (route (a))**

- [x] **3.1 — Fix export on device.** ✅ **Route (a): `react-native-svg` + `toDataURL`. No new native
      module, so no fingerprint change, so this reaches phones over the air.**

      ⚠ **This item named the wrong file, and the difference matters.** `src/lib/share-image.ts` is **not**
      a stub — a parallel session already ported it, and it composes and copies today. The remaining stub
      was **`src/lib/progress-image.ts`**, which is what actually said *"it works in the browser today"*.
      The Progress Photo Post card — the one built to be posted to Instagram — was the broken half.

      **What shipped:** `src/lib/progress-card-host.tsx`, an off-screen SVG rasteriser mirroring
      `share-card-host.tsx` exactly, rendering both the Grid card and Hero slides at 3.6×. It reads
      **`domain/share/progress-card` for every rect**, so a card composed on a phone and one composed in a
      browser cannot drift in placement. Pill widths come from `domain/share/text-measure`, because
      `react-native-svg` will draw text and will not tell you how wide it came out.

      ⚠ **IT COPIES, IT DOES NOT SAVE — AND THE TOAST NOW SAYS SO.** `expo-media-library`, `expo-sharing`
      and `expo-file-system` are all absent and all change the fingerprint. So the card goes to the
      clipboard, the same trade `share-image.ts` already ships. `ProgressExportResult` gained `via`, and
      `progress-photo-post.tsx` phrases its toast from it — it previously said *"Saved — attach it in
      Instagram"* on **every** platform, which on device would have sent somebody to Instagram to attach a
      file that was never written.

      ⚠ **The honest limit: the clipboard holds ONE image.** A hero carousel is N files by design, so one
      slide is copied and the toast says *"Copied slide 1 of 6"* rather than implying six. **Phase E cuts a
      new iOS build for RevenueCat anyway** — `expo-media-library` turns this into a true multi-file save
      then, and nothing above the delivery line changes.

      ⚠ **Two renderers, one geometry — and the paint is still duplicated.** Colours, faces and shadows
      exist in both `progress-image.web.ts` (canvas) and `progress-card-host.tsx` (SVG). Extracting a
      display list the way `card-draw.ts` does for the share card is the right follow-up; it was too large
      to do inside a launch pass without risking a shipping feature. The note is in both files.

---

## 4 · Phase E — P-8, billing, referrals

- [x] **4.1 — Build `src/app/subscription.tsx`** ✅ **DONE 2026-08-16.** Built to the spec: loading /
      Free / Premium / `unknown` states, dual entry (back-chevron from Account Settings, × via
      `?from=gate` over an M-7 trigger), plan picker with **annual pre-selected**, computed saving,
      Founder row with a live seat count, usage review, restore, and the disclosure line **in the sticky
      commit bar directly above the buy button**. `SUBSCRIPTION_ROUTE_BUILT` is flipped and the Account
      Settings row routes here instead of opening the membership sheet.
      **New:** `src/domain/billing/plans-core.ts` (pure, 23 tests) · `src/lib/billing.ts` (the store
      port) · `fetchCapConfig()` in `entitlement-live.ts`.
      ⚠ **The `.dc` and the spec disagreed and the split was a PO decision (2026-08-16): the design
      governs the visual language, the locked spec governs every number, plan and claim.** The `.dc`
      predates the pricing lock — three plans at typed prices, no Founder or Lifetime, no Coach AI
      disclosure, and benefits promising analytics, Communities and "unlimited Squads" (which M7-D15
      forbids). Deltas are enumerated in the screen's header comment.
      ⚠ **`Docs/P-8-Subscription-Wireframe-Spec.md` contradicts itself on picker placement** — §11.2's
      prose says "between the reassurance line and the usage review", its own §3.2 diagram puts it above
      the buy button. Built to the diagram, because plan → disclosure → button adjacency is the whole
      point of P8W-D4. **Owed: an amendment resolving §11.2.**
      ⚠ **Not yet rendered in a browser.** `tsc` 0 · 2,450 tests green · lint at baseline · web bundle
      builds and emits the route — but static export is shell-only, so the screen has not been *seen*.
- [ ] **4.2 — Integrate RevenueCat.** Resolves P-8 open question #1: entitlement, Restore Purchases and
      receipt validation in one dependency, free under $2.5k monthly tracked revenue. No billing
      dependency exists in `package.json` today. Multiple concurrent entitlements (Premium + Coach AI) is
      exactly what it handles well.
      ⚠ **P-8 is already written against a port, so this is an adapter, not a rewrite.** Implement
      `BillingAdapter` from `src/lib/billing.ts` over `react-native-purchases` and call
      `registerBilling()` once at app start. Until then `UNAVAILABLE_BILLING` is in force and the screen
      says so honestly instead of faking a price.
      ⚠ **Identify plans by RevenueCat PACKAGE, never by SKU id.** `premium_annual_9999` carries its
      price in its name, so importing one into `src/` smuggles a price past the §9 grep —
      `plans-core.test.mjs` fails the build if any of them appear.
      ⚠ **Do not add the dependency until a native build is going out anyway.** It changes the
      fingerprint, and every OTA to the build in testers' hands stops being deliverable the moment it
      lands. Stage 1 (§8) needs none of this.
- [ ] **4.3 — Configure 6 SKUs** in App Store Connect:
      `premium_monthly_1299` · `premium_annual_9999` · `premium_lifetime_299` ·
      `coach_ai_monthly_999` · `coach_ai_annual_8999` · `founder_lifetime_149` (first 100, then delisted).
      ⚠ The Coach AI IDs were corrected from `_799`/`_6999` on 2026-08-12 — the price is **$9.99/$89.99**.
      Coach AI SKUs can be configured now and left unreleased.
- [ ] **4.4 — Referrals.** A code per athlete. Credit granted only on the referee's **first successful
      payment**. Both sides credited; referrer capped at 12 months per rolling year. Attach it to squad
      and challenge invites, not just a generic code.
- [ ] **4.5 — Founder seat counter.** Visible ("68 of 100 left") or the scarcity does no work. Stops at
      100 and the SKU delists. **The 20 OG testers do not occupy seats** — they get the same entitlement
      free on a separate grant.
- [ ] **4.6 — Verify in StoreKit sandbox:** buy Premium, buy Coach AI alongside it, force-close,
      reinstall, Restore Purchases, confirm **both** entitlements return. Confirm no price string is
      hardcoded anywhere in `src/`.
      ⚠ **This phase needs a new iOS native build, not an OTA.** `fingerprint:compare` against the live
      build before publishing.

---

## 5 · Legal — before any money changes hands

- [ ] **5.1 — Terms and privacy review by counsel.** The brief is already written in the pricing plan
      under *Legal exposure*. A startup review is inexpensive relative to charging for AI body analysis
      later.
- [ ] **5.2 — The structural risk is "lifetime" + a separate AI subscription.** The disclosure must sit
      **above the buy button**, not in the terms.
- [ ] **5.3 — Confirm the false-billing copy is gone.** Phase A fixed it; re-grep `src/` for `Founder`,
      `renews yearly`, `Billing is handled`, `next charge`, `cancel at any time` and expect zero hits
      outside the guard test. App Store Guideline 3.1.2.

---

## 6 · Phase F — switch on

- [ ] **6.1 — Flip default entitlement to Free.** The 20 testers keep their grant.
      ⚠ **THREE STATEMENTS, IN THIS ORDER, OR THE FREE TIER IS GIVEN AWAY TWICE.** The SQL for all three is
      in `0145`'s footer.
      **(a) Backfill `athlete_usage.programs_created` from `programs`.** The trigger only counts inserts
      made since 0145 was applied, so every pre-existing program is invisible to it — an athlete already
      holding 3 would read 0 and be handed three more. MA3-D9 says the count is *lifetime*; a counter that
      starts at zero on a populated account is not one.
      **(b) Grant the 20 OG testers** their seat-free PREMIUM row (MA3-D25). Before the flip, not after —
      between those two statements they would be Free.
      **(c) Then** `update entitlement_config set default_tier = 'FREE'`.
      ⚠ **`has_used_free_import` cannot be backfilled** — nothing has ever recorded that an import
      happened. Everyone starts with it unspent, including anyone who has already used one. Accepted: it
      errs toward the athlete, and there is no data to do better with.
- [ ] **6.2 — Enroll in the App Store Small Business Program** for the 15% rate rather than 30%.
      ⚠ **SUPERSEDED BY §9.6 (v1.1).** Enrollment is per-entity, so it belongs to **Forge Legacy LLC**, not to
      the qest4 team this line was written against.
- [ ] **6.3 — Landing page.** `Docs/Marketing/Landing-Page-Design-Brief.md` §12 and the JSON-LD
      `offers: { price: "0" }` stay correct until this point, then need the real ladder — with
      **Never Charge For History as the headline**. No competitor can copy it without abandoning their
      revenue model.

---

## 7 · Ship

⚠ **v1.1: this section is Stage 2 (public). Stage 1's ship steps are §8.7–§8.9** — same gates, existing
Apple team, no paywall. Do not read 7.4 as the tester build.

- [ ] **7.1 — Full gates green** (see standing rules above).
- [ ] **7.2 — `git status` clean, `fingerprint:compare` against the live build.**
- [ ] **7.3 — `eas update` + `expo export` + `eas deploy --prod`, then curl prod for a 200.**
      A "successful" deploy serving a 404 has happened twice; re-running fixes it. Only ever hand over
      **forgelegacy.expo.app** — a throwaway `--hash` URL wipes localStorage and signs people out.
- [ ] **7.4 — New iOS build and App Store submission.**
- [ ] **7.5 — Update `Forge-Legacy-Master-Status.md`** — a Recently Completed entry per shipped phase.

---

## 8 · Stage 1 — TestFlight to the 20 testers (existing Apple team) — **DO THIS FIRST**

Nothing in §4–§6 blocks this. `default_tier` stays `PREMIUM`, so every tester resolves entitled and no
cap is felt — which is exactly the free access the PO promised them. **No paywall code is needed to put
the app in their hands.**

- [x] **8.1 — ⛔ Establish what is actually applied.** ✅ **RUN 2026-08-13. ALL 24 CHECKS GREEN —
      the database is fully applied through `0154`, and `0144` correctly reads MISSING.**
      ⚠ **The dashboard, this checklist's own standing rule and the working notes were ALL wrong, and
      all wrong in the same direction: they described work as pending that had already landed.** The
      board said "applied and verified through 0143" while eleven more files were in; the notes had
      0145, 0150 and 0152 as unapplied and every one of them is in. **The failure mode this project
      keeps recording is a migration that lies about having worked — this is the mirror image, a
      LEDGER that lies about work being undone, and it cost nothing only because the preflight was run
      before anything was applied on top of it.** Re-pasting an applied migration is not free: `0141`
      already died on `42P13` when re-run.
      ⚠ **8.2–8.5 below are therefore CLOSED — do not apply anything.** They are kept rather than
      deleted so the reasoning survives; the file also now covers `0154`, which the name still doesn't.
- [x] **8.2 — ✅ ALREADY APPLIED (8.1, 2026-08-13). Saving a workout is NOT broken.** Kept below because
      the reasoning is the most valuable thing in this file. Original text:
      **Apply `0150_restore_evaluate_honors_grant.sql`. ⛔ HARDEST BLOCKER IN THE LIST.**
      `0147` §3 revoked EXECUTE on `evaluate_honors(text)` from `authenticated`. Its three callers —
      `save_workout`, `continue_workout`, `skip_program_session` — are `security invoker`, so the revoke
      landed on the athlete. The call sits at the END of `save_workout`, so the transaction rolls back
      and **the workout is gone**. Finish Workout, Continue Training and session-skip are dead for
      every athlete until this lands. Do not hand a build to a tester before it does.
- [ ] **8.3 — Apply `0151_stair_floors.sql` BEFORE deploying current code.** Three data modules name
      `floors` in their select; PostgREST answers a missing column with `42703`, the whole query fails,
      and `if (error) return null` renders that as *"there is nothing to continue."* This is the
      0117/0118 failure exactly.
- [x] **8.4 — ✅ DONE 2026-08-14. Applied AND exercised end to end on a real account — this 5.1.1(v)
      submission blocker is CLOSED.** Predictions were written down BEFORE the delete and all held:
      `auth.users` 0 · `profiles` 0 · the solo squad dissolved · the shared squad survived with
      **exactly one** owner, the longest-serving remaining member. `owners = 1` is the result that
      mattered — `delete_my_account` demotes then promotes because `squad_one_owner` is a partial unique
      index, and a squad left with zero owners cannot be repaired from inside the app.
      ⚠ **Still uncovered, deliberately:** a squad owned by SOMEONE ELSE that the athlete had joined (a
      plain `squad_members` cascade, materially lower risk), and **storage cleanup, which SQL cannot
      see** — the client removes objects best-effort before the cascade. Original text:
      **Apply `0148_delete_my_account.sql`, then test the path on device.**
      **App Store Review 5.1.1(v) requires in-app account deletion for any app supporting account
      creation — this is a submission blocker independent of the copy**, and `content.ts:44` already
      promises it. The client side exists (`src/data/account-live.ts`, `src/app/account-settings.tsx`);
      what is unverified is the round trip. Delete a real account with squads, a program, photos and
      check-in video, and confirm nothing is orphaned and nothing else's rows went with it.
- [ ] **8.5 — Apply the remainder:** `0149_hide_invite_code_and_presence.sql` ·
      **both** `0152` files · `0153` (reported applied 2026-08-13 — confirm in 8.1, do not assume) ·
      `0154_revoke_public_on_0153_trigger_fns.sql`. ⚠ **Not `0144`.**
- [ ] **8.6 — Close the two open rulings that touch shipped surfaces** (`Docs/Launch-Audit-2026-08-12.md`
      §4). **(a) The distance-units doctrine conflict** — `units.ts:8-10` forbids converting distance,
      `0139:10-14` makes `units` the single switch, and the code follows both in different files
      (`CardioBlockCard` converts; `log-activity` and the coach do not). Whichever is chosen makes the
      other document wrong, so the losing doc gets a superseded banner in the same pass.
      **(b) The storage-orphan ledger** — extend it to personal photos, or accept dashboard cleanup for
      launch and write that down as a decision.
- [ ] **8.7 — Gates, clean tree, then build.** `npx tsc --noEmit` → 0 · `node --test` all green ·
      `npx expo lint` at baseline · **`git status` clean** (publishing bundles the working tree, not
      HEAD) · `fingerprint:compare` against the live build. **Bump `ios.buildNumber` to `5`** in
      `app.json` — build 4 (`5de44367`) is what is in the field.
- [ ] **8.8 — TestFlight the 20 testers.** They need Apple IDs collected and an internal or external
      group. **External testers require a Beta App Review**; internal (up to 100, must be App Store
      Connect users on the team) do not. Pick internal if the 20 can be added as users — it removes a
      review round trip from the critical path.
- [ ] **8.9 — Deploy web from the same tree** — `expo export` → `eas deploy --prod` → **curl prod for a
      200**. A "successful" deploy serving a 404 has happened twice; re-running fixes it. Only ever hand
      over **forgelegacy.expo.app**; a throwaway `--hash` URL wipes localStorage and signs people out.

---

## 9 · Apple entity migration — Forge Legacy LLC

PO decision 2026-08-13: **the public release ships under a new Forge Legacy LLC organization account**, not
`G722GV8H8C` (the qest4 team that `eas.json` names today, holding app `6798436104` and the bundle
`com.qest4.forgelegacy`).

**✅ LLC FILED 2026-08-13.** The entity of record, and the exact strings Apple and D&B match against:

| | |
|---|---|
| **Legal name** | `Forge Legacy LLC` — ⚠ *not* "Forge LLC"; this becomes the public App Store seller name |
| **Utah entity number** | `14725906-0160` |
| **Filing number** | `2608131147918B`, effective 2026-08-13 02:06 PM |
| **Principal / mailing address** | `3832 E Cunninghill Dr, Eagle Mountain, UT 84005` |
| **Registered agent** | Isaiah Altamirano, individual, same address |
| **EIN** | `42-4433633`, issued 2026-08-13 (CP 575 saved) |
| **Parent** | **`Altimealix Holdings LLC` owns 100%**, same address — first of several planned subsidiaries |

⚠ **Utah's Certificate of Organization has no member field.** The parent-child link lives in Utah's
principals data and the operating agreement — it is **not** on the stamped certificate and cannot be
evidenced with it. Anywhere ownership must be *proved* rather than asserted, this is the gap.

⚠ **Every downstream form matches on the name and address above, exactly.** A mismatch is the single
most common rejection at D&B and at Apple enrollment, and it restarts the clock rather than erroring.

> **⚠ CORRECTION 2026-08-13, from Apple's own enrollment docs — an organization account needs more than
> a D-U-N-S, and the extra requirements were NOT in v1.1 of this list.** Verified at
> `developer.apple.com/help/account/membership/program-enrollment/`:
> 1. **A public, functional website on a domain associated with the organization.** Social media pages
>    are explicitly rejected, as are registrar parking pages and sites with minimal content.
>    **⛔ `forgelegacy.expo.app` does NOT qualify — it is Expo's domain, not Forge Legacy LLC's.**
> 2. **A work email address on that same domain.** A gmail address does not pass.
> 3. **The legal entity name becomes the public seller name on the App Store listing.** No DBAs,
>    fictitious names, trade names or branches are accepted.
>
> **This moves the domain from a §10 listing chore to a §9 enrollment gate (9.1b).** Left where v1.1 put
> it, the D-U-N-S clears on day 7 against a website that does not exist and enrollment stalls anyway —
> the wait would have been spent and the gate still shut.

- [x] **9.0 — ✅ DONE 2026-08-13. EIN `42-4433633`.** Free, online, issued immediately; the applicant must be the
      Responsible Party with an SSN, and the LLC must already exist with the state (it does). The tool is
      **weekdays 07:00–22:00 ET** and times out on inactivity, so do it in one sitting and save the PDF —
      re-issuing is a phone call. Needed for the business bank account and for **App Store Connect's tax
      and banking forms**, without which Apple cannot pay out. Not a D-U-N-S dependency; do it in parallel.
- [~] **9.1 — 🟡 REQUESTED 2026-08-13, IN VERIFICATION. It is the long pole and it is free.**
      **Status: D&B case # 10803372.** They wrote 2026-08-13 asking for two documents showing the
      business name and address; **answered 2026-08-15** with the stamped Certificate of Organization,
      the CP 575, and their Business Information Form (parent declared as Altimealix Holdings LLC,
      100%). ⏳ **Next: D&B phones to verify business type and employee count — answer it.** The
      answers must match the form: software publisher · 1 employee · Utah LLC formed Aug 2026 ·
      pre-revenue. Expect resolution late Aug; escalate only past two weeks.
      Apple requires a D-U-N-S number for an *organization* Developer Program account, matched against
      the legal entity name and address. Use **Apple's own look-up tool**
      (`https://developer.apple.com/enroll/duns-lookup/`), not D&B directly — it is free and feeds
      enrollment. **Sign in with the Apple ID intended to OWN the developer account**, not a personal one.
      It asks for legal entity name · headquarters address · mailing address · work contact. It first
      checks for an existing D-U-N-S, which would skip the wait entirely.
      ⚠ **Apple's stated timeline is 5 business days at D&B + 2 for Apple to receive it (~7 business
      days) — not the "3–14" written in v1.1.** **Expediting does not shorten it**; Apple says so
      explicitly. Escalate to D&B only past two weeks. D&B may call or email asking business type and
      employee count — **that is the step that stalls if it goes unanswered.**
- [ ] **9.1b — ⛔ Buy the domain and stand up a real site + work email on it. Blocks enrollment, and
      it is the item that will be discovered late.** Needs to be live *before* 9.2, i.e. within the
      D-U-N-S window, not after it. `Docs/Marketing/Landing-Page-Design-Brief.md` is the source. This is
      the same domain that must host privacy and terms (§10.1), so one purchase closes three items —
      but the enrollment gate is the one with the deadline. Everything else in §9 waits on it, and §10's
      listing work cannot be entered until the account exists.
- [ ] **9.2 — Enroll Forge Legacy LLC in the Apple Developer Program** ($99/yr) once the D-U-N-S resolves.
      The enrolling person must have legal authority to bind the entity.
- [ ] **9.3 — ⚠ RESOLVE THE BUNDLE IDENTIFIER BEFORE BUILDING ANYTHING UNDER THE NEW TEAM. This is the
      one item here that can genuinely bite, and it should be confirmed with Apple rather than assumed.**
      Bundle IDs are globally unique across the App Store, and `com.qest4.forgelegacy` is currently
      registered to `G722GV8H8C`. Three shapes, and they are not equivalent:
      **(a) Release the identifier from the qest4 team** and register it under Forge Legacy LLC — keeps the ID
      and every deep link, but the qest4 app record must be removed first and TestFlight builds under it
      die with it.
      **(b) New bundle ID** (e.g. `com.forgelegacy.app`) — always available, but it is a *different app*
      to iOS: the 20 testers' installs do not upgrade, they sit alongside. Changes the native
      fingerprint, so a new build regardless.
      **(c) Apple app transfer** from qest4 to Forge Legacy LLC — preserves ID, installs and TestFlight, **but
      transfer generally requires the app to have already been publicly released**, which contradicts
      "first public release is under the LLC." Only viable if Stage 2 is re-sequenced to ship under
      qest4 and transfer after.
      ⚠ **Whichever is chosen, the `scheme` (`forgelegacy`) and the Supabase redirect allow-list must be
      re-checked** — an auth callback that silently stops resolving is a launch-day outage.
- [ ] **9.4 — Update `eas.json` `submit.production.ios`** (`ascAppId`, `appleTeamId`) and, if 9.3 chose
      (b), `ios.bundleIdentifier` + `android.package` in `app.json`.
      ⚠ **`eas.json` byte-for-byte matters** — a fresh checkout rewrites it with CRLF where the working
      copy has LF: identical to read, different fingerprint. Edit in place; do not re-create the file.
- [ ] **9.5 — Re-create the EAS project credentials** under the new team (push key, provisioning). Push
      notifications are configured against the old team's APNs key; **a new key means push silently
      stops** until it is uploaded.
- [ ] **9.6 — Enroll Forge Legacy LLC in the App Store Small Business Program** for 15% rather than 30%.
      Enrollment is per-entity and applies from the following month — **do it before revenue, not after.**
      (This supersedes §6.2, which assumed a single account.)

---

## 10 · App Store listing artifacts — none of these exist yet

No store-listing document exists in this repo. Every item below is unstarted and all of them gate
submission, not just review.

- [ ] **10.1 — Privacy policy and terms at a public HTTPS URL.** The in-app copy in
      `src/domain/settings/content.ts` is not a link Apple can read; App Store Connect requires a URL,
      and it must still resolve after launch. Host it on the landing-page domain.
- [ ] **10.2 — ⚠ Fix the privacy policy's collection list BEFORE the nutrition labels are signed.**
      `content.ts:53` claims to be exhaustive and **omits product-usage analytics** (Launch Audit §4-3).
      The App Privacy labels are a declaration Apple holds you to, and signing one that contradicts your
      own posted policy is the worst version of this bug. Fix the copy, then declare from the fixed copy.
- [ ] **10.3 — App Privacy nutrition labels** — every category the app actually collects: account
      identity, health/fitness data, photos and video, **precise location** (the app requests
      `ACCESS_FINE_LOCATION` for run tracking), and usage analytics. Declare linkage and tracking use
      honestly; `usesNonExemptEncryption: false` is already set in `app.json`.
- [ ] **10.4 — Support URL and marketing URL.** Support URL is required. A mailto: alone is not enough.
- [ ] **10.5 — Screenshots** at the required display sizes (6.9" and 6.5" iPhone at minimum), plus
      app icon, description, promotional text, keywords, category (Health & Fitness), and age rating.
      ⚠ **Do not state the program-catalogue count anywhere in the listing** — the catalogue is a
      DISCOVER shelf now, Coach Holt is the product, and the number reads as a shortfall.
- [ ] **10.6 — A review demo account, seeded.** Apple reviews behind the login. It needs a real account
      with a running program, logged history, a squad with a second member, and a challenge — **the
      social pillar is unreviewable from an empty account**, and "no content" reads as a broken app
      under Guideline 2.1. Include reviewer notes explaining Train Together needs two devices.
- [ ] **10.7 — Confirm the Stage-2 build carries the paywall** and that §5 (Legal) and §6 (Phase F) are
      done before submission, not after. **An IAP that is present but not yet purchasable fails review;
      an app that shows prices with no way to pay fails 3.1.2.**

---

## Known gaps going in — accepted, not forgotten

Recorded so they are decisions rather than surprises in a review:

- **No Android.** Half the addressable market; every revenue figure is computed on the smaller half.
- **No Apple Watch, no Apple Health / Strava sync, no CSV export.** Table stakes for competitors. Coach
  Holt in Premium is what makes $99.99 defensible against them.
- **Free Holt allowance is one program, lifetime.** The monthly single-day refill keeps Free alive, but
  the wall lands around week five. Watch it once analytics are on.
- **Every cap number is a guess.** They are server-side config precisely so being wrong costs a SQL
  update instead of a release. Set them properly from real usage at ~p50–p60 once data exists.

---

*Authority: the Pricing Structure & Monetization Build Plan (locked 2026-08-12) governs every number.
This checklist sequences it and adds nothing to it.*
