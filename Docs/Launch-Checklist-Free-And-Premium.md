# Launch Checklist — Free & Premium

## v1.5 | 2026-08-17 · THE WORKING LIST

> **⛔⛔ v1.5 — §9 WAS BUILT ON A FACTUAL ERROR AND MOST OF IT MAY NOW DISSOLVE. READ §9's BANNER BEFORE
> DOING ANYTHING IN IT.** Since v1.1 this list has called `G722GV8H8C` *"the qest4 team"* and planned a
> migration away from it. **PO, 2026-08-17: it is an INDIVIDUAL Apple Developer membership under
> Isaiah's own personal Apple ID. There is no qest4 company account, and there never was** — `qest4` is
> reverse-DNS of the work email domain, picked on 2026-08-05 as a bundle-ID string, and **this document
> mistook a naming convention for an owner.**
>
> **Nothing has to be migrated, because nothing belongs to anyone else.** The likely path is now
> **Apple's individual-to-organization conversion** of the membership already held (§9.2 rewritten),
> which — if Apple confirms it — **keeps the bundle ID, app `6798436104`, the TestFlight builds, the
> testers' installs, the EAS credentials and the APNs key, all untouched.** §9.3 stops being the item
> that "can genuinely bite," and **§9.4 and §9.5 collapse to verification.**
>
> ⚠ **This is not yet confirmed with Apple, and the fallbacks stay in the document until it is.** But
> the honest reading is that **the scariest item in Stage 2 was an artefact of a wrong assumption about
> who owned an account**, and it went four versions without anyone checking. Cost of checking: one
> glance at Membership details.

> **⭐ v1.4 — THE BUSINESS CHECKING ACCOUNT IS OPEN (§9.0b), AND IT CLOSES A GATE THIS LIST NEVER
> NAMED.** Zions Business Launch, in the exact legal name `FORGE LEGACY LLC`, opened 2026-08-17 — the
> same day the D-U-N-S issued. ⏳ Routing and account numbers are *coming*, not in hand.
>
> **⚠ The gap it exposes matters more than the item itself: this checklist had no line for App Store
> Connect's Agreements, Tax and Banking.** §7.4 said "submit" and §10.7 said "confirm the paywall", and
> **neither is possible without an active Paid Applications Agreement** — which needs the bank account,
> a W-9, and a signature from someone with legal authority to bind the entity. It is now **§9.7**, and
> it is a submission gate, not a payout chore: an app with IAPs cannot be submitted under an agreement
> that is not in effect. Left undiscovered, it would have surfaced on the day of submission.
>
> **⚠ The ownership contradiction v1.1 flagged is RESOLVED (§9.0b).** PO, 2026-08-17: *Isaiah owns
> Altimealix Holdings; Altimealix is the parent of Forge Legacy LLC.* The operating agreement is right
> and CP 575's "SOLE MBR" is the SS-4 responsible party, not a membership claim. **That chain decides
> what goes on Apple's W-9 — see §9.7.**
>
> **Execution order — ⚠ REVISED AGAIN IN v1.5, because §9.2 and §9.3 are now ONE conversation with Apple,
> not two items in sequence:** **§9.2+§9.3 together (one support request: convert `G722GV8H8C` to an
> organization, and confirm in writing that the bundle ID, the app record and TestFlight survive it) →
> §9.7 → §4 Phase E → §10 → §5 → §6 → §7.** ⚠ Gate that request on §9.1's D-U-N-S lookup resolving
> first. §9.7 sits where it does because it needs the organization to exist, and everything from §4 down
> assumes money can eventually move. *(v1.3 put §9.3 first as the item "whose answer comes from Apple";
> that is still true, it is just the same phone call as §9.2 now.)*

> **⚠ v1.2 — STAGE 1 IS CLOSED, AND SIX ITEMS BELOW WERE STALE IN THE SAME DIRECTION.** The testers have
> the build (PO, 08-17), the database runs through `0162`, the website is live, the paywall *screen* is
> built, and the privacy copy was fixed before any label was signed. **8.3 · 8.5 · 8.7 · 8.8 · 9.1b · 10.1
> · 10.2 all now read ✅** — every one had been done days before this file admitted it.
>
> **That is this document's characteristic failure and it is worth naming.** It has never once described
> work as finished that was not; it repeatedly describes finished work as pending. The cost is real —
> §8.1 records the day nearly spent re-applying eleven migrations that were already in, and re-pasting an
> applied migration is *not* free (`0141` died on `42P13`). **Verify before you execute anything here.**
>
> **One item moved the other way:** Phase F gained **6.2b**, because the "free while testing" claim lives
> in three places and this list named one.

**Purpose:** get Forge Legacy released with **Free and Premium only**. Written to be picked up by a
session with no prior context. Work top to bottom; each item names its own files and its own finish line.

### ⚠ v1.1 — THE RELEASE IS TWO STAGES, AND THEY RUN IN PARALLEL

PO decisions, 2026-08-13: **the 20 testers get it now and some of them get it free; the public release
carries the paywall; and the public release ships under a new Forge Legacy LLC organization account.**

That splits this list in two, and the split is the schedule:

| | **Stage 1 — TestFlight** | **Stage 2 — Public** |
|---|---|---|
| **Audience** | the 20 OG testers | everyone |
| **Apple team** | existing `G722GV8H8C` (§8) | ⚠ **v1.5: the SAME membership, converted Individual → Organization** (§9.2). Previously read "new Forge Legacy LLC org account", which assumed a second entity held the first one |
| **Entitlement** | `default_tier` stays `PREMIUM` — nothing gates | Phase F flip (§6) |
| **Needs** | §8 only — the DB blockers and a build | §4 Phase E · §5 Legal · §6 · §9 (incl. **9.7 Paid Apps Agreement**) · §10 |
| **Blocked by** | ✅ **nothing — shipped, testers have it** | ✅ **Nothing external.** D-U-N-S `149910851` issued 2026-08-17 (§9.1). ⏳ The record needs 24–48 h to become queryable before 9.2 can start, but that is a wait, not a blocker. **Everything remaining is work this team controls** |

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
- [~] **4.4 — Referrals.** ✅ **CLIENT HALF BUILT AND `0170` APPLIED 2026-08-19; the grant itself waits on 4.2.**
      A code per athlete. Credit granted only on the referee's **first successful payment**. Both sides
      credited; referrer capped at 12 months per rolling year.
      **Done:** `0170_referral_attribution.sql` (the attribution store + `record_referral_attribution()` +
      `my_referral_attribution()`), `src/domain/referral/` (pure, 24 tests), `src/data/referral-live.ts`,
      `src/lib/pending-referral-store.ts`, capture off the incoming link, flush at the first authenticated
      moment, and the squad invite link carrying `ref=`.
      ⚠ **`0145` HAD ALREADY BUILT THE WHOLE ECONOMIC HALF IN JUNE AND NOTHING HAD EVER CALLED IT.** The one
      missing fact was that `grant_referral_credit(p_referee, p_code)` takes the code **as an argument**, and
      the database never knew which code an athlete arrived through — fine only if payment follows the invite
      immediately, which MA3-D20 guarantees it does not.
      ⚠ **NO REWARD IS PROMISED IN ANY COPY, DELIBERATELY.** The credit cannot be granted until 4.2's webhook
      exists and `default_tier` is still `PREMIUM`, so *"we both get a month free"* would be a NEW false
      billing claim added to the four §6 is already retiring. **Phase F owes this a revisit** — the marker is
      in `referralLinkFor()`'s header.
      ⛔ **OPEN — MA3-D21's challenge half cannot be built as specified.** Challenge invites are
      `method: 'in_app'` to existing friends and never leave the app, so there is no link to attach a referral
      to and the recipient already has an account. `challenges-live.ts:415` calls a challenge invite *"an
      install opportunity"*; as built it is not one. **Needs a product decision, not code.**
      ⛔ **OPEN — no surface for typing in a code** you were given verbally rather than tapped.
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
- [ ] **6.2b — ⚠ RETIRE THE "FREE WHILE TESTING" CLAIM IN ALL THREE PLACES, IN THE SAME PASS AS 6.1(c).**
      Every one of them is true today and becomes a **false billing claim** the instant `default_tier`
      flips — and **nothing on any surface will look wrong**, which is why this is a grep and not a
      review. Added v1.2, 2026-08-17: the list previously named only the landing page (6.3), so a Phase F
      done to the letter would have shipped an in-app page telling paying athletes there was nothing to
      cancel. `grep -rn "free while" src/ site/*.html` — three sites:
      **(a) `site/index.html`** — the marketing copy **and** the JSON-LD `offers: { price: "0" }` (6.3).
      **(b) `src/domain/settings/content.ts:30,32`** — *"Forge is free while we're testing. There is no
      subscription, no billing, and nothing to cancel."* This one renders **inside the app**, on the
      membership sheet, to the exact cohort being charged. It is the App Store 3.1.2 shape.
      **(c) `src/domain/settings/__tests__/content.test.mjs:168`** — **a test that asserts the claim.**
      `assert.match(text, /free while we're testing/i, 'says what is actually true')`. **Phase F fails
      the test gate until this is updated**, which is the gate doing its job rather than an obstacle: the
      same test already bans `renews yearly`, `billing is handled`, `next charge`, `cancel at any time`
      and `Founder`, because shipped design-comp copy once told every tester all of those falsely.
      Update the assertion to the new truth — do not delete it.
- [ ] **6.3 — Landing page.** `Docs/Marketing/Landing-Page-Design-Brief.md` §12 and the JSON-LD
      `offers: { price: "0" }` stay correct until this point, then need the real ladder — with
      **Never Charge For History as the headline**. No competitor can copy it without abandoning their
      revenue model. **See 6.2b — this is one of three claim sites, not the only one.**

---

## 7 · Ship

⚠ **v1.1: this section is Stage 2 (public). Stage 1's ship steps are §8.7–§8.9** — same gates, existing
Apple team, no paywall. Do not read 7.4 as the tester build.

- [ ] **7.1 — Full gates green** (see standing rules above).
- [ ] **7.2 — `git status` clean, `fingerprint:compare` against the live build.**
- [ ] **7.3 — `eas update` + `expo export` + `eas deploy --prod`, then curl prod for a 200.**
      A "successful" deploy serving a 404 has happened twice; re-running fixes it. Only ever hand over
      **forgelegacy.expo.app** — a throwaway `--hash` URL wipes localStorage and signs people out.
- [ ] **7.4 — New iOS build and App Store submission.** ⚠ **v1.4: §9.7 must be green first** — the Paid
      Applications Agreement has to be *in effect*, not merely accepted, or the IAPs cannot be submitted
      with the build.
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
- [x] **8.3 — ✅ APPLIED.** Confirmed by the 08-13 preflight and everything through `0162` since. Original text:
      **Apply `0151_stair_floors.sql` BEFORE deploying current code.** Three data modules name
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
- [x] **8.5 — ✅ ALL APPLIED, and the database now runs through `0162`.** `0149`, both `0152` files, `0153`
      and `0154` were confirmed by the 08-13 preflight (24/24); `0155`–`0158` preflighted 15/15 the same
      day; `0159` applied 08-15; `0160`/`0161` evidenced by working squad create + transfer; `0162`
      confirmed by a route drawn on device 08-16. **`0144` remains correctly absent by decision.**
      ⚠ **Do not re-paste any of these** — `0141` already died on `42P13` when re-run. Original text:
      **Apply the remainder:** `0149_hide_invite_code_and_presence.sql` ·
      **both** `0152` files · `0153` (reported applied 2026-08-13 — confirm in 8.1, do not assume) ·
      `0154_revoke_public_on_0153_trigger_fns.sql`. ⚠ **Not `0144`.**
- [ ] **8.6 — Close the two open rulings that touch shipped surfaces** (`Docs/Launch-Audit-2026-08-12.md`
      §4). **(a) The distance-units doctrine conflict** — `units.ts:8-10` forbids converting distance,
      `0139:10-14` makes `units` the single switch, and the code follows both in different files
      (`CardioBlockCard` converts; `log-activity` and the coach do not). Whichever is chosen makes the
      other document wrong, so the losing doc gets a superseded banner in the same pass.
      **(b) The storage-orphan ledger** — extend it to personal photos, or accept dashboard cleanup for
      launch and write that down as a decision.
- [x] **8.7 — ✅ DONE.** `app.json` is at **`buildNumber` 6** (`411fd2b6…`, commit `aaee846c`, 08-15), two
      past the `5` this item asked for. The gates themselves are not one-time — re-run them before every
      publish. Original text: **Gates, clean tree, then build.** `npx tsc --noEmit` → 0 · `node --test`
      all green · `npx expo lint` at baseline · **`git status` clean** (publishing bundles the working
      tree, not HEAD) · `fingerprint:compare` against the live build.
- [x] **8.8 — ✅ DONE. The testers have the build (PO, 2026-08-17)** and have had it for a while.
      ✅ **And it is build 6** (PO, 2026-08-17) — the exact runtime (`411fd2b6…`, commit `aaee846c`) every
      OTA since 08-15 has been published against. **The testers are current** on the units fix, the white
      screen, the squads outage, the chapter dead end and both cardio fixes. Worth confirming rather than
      assuming: an OTA only lands where the runtime matches, so on build 4 or 5 they would have received
      nothing since, and no OTA could have repaired it — only a new binary.
      **⇒ The cohort is OTA-reachable, and that is an asset with an expiry.** Any JS-only change reaches
      them in minutes. **The first native module added ends it** — see §4.2.
- [ ] **8.9 — Deploy web from the same tree** — `expo export` → `eas deploy --prod` → **curl prod for a
      200**. A "successful" deploy serving a 404 has happened twice; re-running fixes it. Only ever hand
      over **forgelegacy.expo.app**; a throwaway `--hash` URL wipes localStorage and signs people out.

---

## 9 · Apple entity migration — Forge Legacy LLC

PO decision 2026-08-13: **the public release ships under Forge Legacy LLC as an organization**, rather
than under the individual membership `G722GV8H8C` that `eas.json` names today, holding app `6798436104`
and the bundle `com.qest4.forgelegacy`.

⚠ **v1.5 corrected the sentence above.** It read *"under a new Forge Legacy LLC organization account, not
`G722GV8H8C` (the qest4 team…)"* — two errors in one line: there is no qest4 team, and a *new* account is
probably not how this happens. **The decision was always about the seller of record, not about which
account object holds the app.** Converting the existing membership satisfies the decision completely.

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
- [x] **9.0b — ✅ OPEN 2026-08-18. Business checking — Zions Business Launch, in the exact
      legal name `FORGE LEGACY LLC`.** Opened from the existing Zions personal relationship, so it is a
      new account rather than a new customer; expect a separate Business Digital Banking login.
      ⚠ **Applying was not opening, and this entry claimed 08-17 for a week it had not earned.** Zions
      emailed the same evening (Digital Banking Ops) asking for the SS-4/EIN letter plus documents naming
      **all authorized principals and titles**, with the application set to auto-close **2026-08-31** if
      unanswered. Answered same day with CP 575 + the stamped certificate + the executed operating
      agreement (**Exhibit B is the principals-and-titles page**), and **that cleared it — the
      anticipated second round on Altimealix's certificate and EIN never came.** PO confirmed open
      2026-08-18. Record it as *applied 08-17 → verified → open 08-18*, because the gap is the thing
      that keeps catching this project.
      ⏳ **Routing and account numbers are not in hand yet** — they arrive with the welcome packet /
      online-banking access. **§9.7 cannot be completed until they do**, though nothing else waits on it.
      As filed and as it should stay: NAICS **513210 Software Publishers** (not a gym code) · tax
      classification **Disregarded Entity** · taxable party **Isaiah + SSN** · **no** DBA · Operating
      Account only · declared activity ATM/debit, no cash, no wires · **no** merchant services.
      $50 to open; **$10/mo waived by a $500 minimum daily balance**; 50 txns + $3k cash per cycle; go
      paperless or it is $3/mo. ⚠ **The $30/mo Payments Package was correctly declined** — that is ACH
      and wire *origination*, and an Apple payout is *incoming* ACH. Nothing in this launch needs it.
      ⭐ **AND IT RESOLVED THE OWNERSHIP CONTRADICTION v1.1 COULD NOT.** PO, 2026-08-17: **Isaiah owns
      Altimealix Holdings LLC; Altimealix owns Forge Legacy LLC.** So the operating agreement's
      "`Altimealix Holdings LLC` owns 100%" is the correct statement of *direct* membership, and CP 575's
      **"ISAIAH ALTAMIRANO SOLE MBR" is the SS-4 responsible party printed back**, not a competing
      ownership claim. The two documents were never in conflict about the facts, only about which layer
      of the chain they name. **Isaiah is the ultimate beneficial owner through a two-link chain** —
      Forge Legacy → Altimealix → Isaiah — which is exactly the look-through the Zions application
      declared, and it is the same chain Apple's tax form has to reflect (§9.7).
      ⚠ **This does not close the evidence gap.** Utah's Certificate of Organization still has no member
      field, so the parent-child link remains provable only by the operating agreement and Utah's
      principals data. Any future counterparty that wants ownership *proved* rather than asserted needs
      those, not the stamped certificate.
- [x] **9.1 — ✅ DONE 2026-08-17. D-U-N-S `149910851`.** Case `10803372` resolved at 18:14 UTC, tracking
      `10740542`, sub-resolution *"Verified through a company spokesperson"* — **the documents answered on
      08-15 closed it and the anticipated phone call never came.** Four days from request to number,
      comfortably inside Apple's stated ~7 business days.
      **The record came back matching what was filed, field for field** — `Forge Legacy LLC` ·
      `3832 E Cunninghill Dr, Eagle Mountain, UT 84005` · 1 employee · principal Isaiah Altamirano. That
      exact-match was the single most common rejection at D&B and at Apple, and it is clean.
      ⏳ **⚠ THE NUMBER EXISTS AND THE RECORD DOES NOT RESOLVE YET.** D&B's own resolution text: *"a DUNS
      number has been generated for the business, and information will be available in 24–48 hours"* —
      so ~08-18 18:14 UTC at the earliest, and Apple's enrollment **validates by querying D&B**. Starting
      9.2 against a lookup that misses is how an enrollment is rejected and the clock restarts.
      **Gate 9.2 on the lookup succeeding, not on the calendar:** confirm at
      `https://developer.apple.com/enroll/duns-lookup/`, **signed in as the Apple ID intended to OWN the
      developer account**, that it returns Forge Legacy LLC at the Eagle Mountain address. Then enroll.
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
- [x] **9.1b — ✅ DONE 2026-08-16. `forgelegacy.app` is live and the enrollment gate is cleared.**
      Root / `/privacy` / `/terms` / `www` all **200**, HTTP **301 → HTTPS**, MX intact so `isaiah@` and
      `support@` were never at risk. Apple's requirement — a public, functional site on the org's own
      domain, parking pages and thin sites explicitly rejected — **is satisfied**, and it closed §10.1 in
      the same move. ⚠ **It is a Cloudflare WORKER named `forgelegacy`, not Pages**, and a Worker cannot
      be renamed. ⚠ **Redeploy by staging files, never by dragging `site/` in** — `_exported-bundle.html`
      is a git-ignored 4 MB export that a directory upload would publish as a public indexable page; it
      returns 404 live and must stay that way. Original text: **Buy the domain and stand up a real site +
      work email on it. Blocks enrollment, and it is the item that will be discovered late.**
> **⛔⛔ v1.5 — THIS ENTIRE SECTION WAS BUILT ON A FACTUAL ERROR, AND CORRECTING IT MAY DELETE MOST OF
> IT.** Every version of this list has called `G722GV8H8C` *"the qest4 team"* and reasoned from there:
> a second legal entity holding the app, requiring migration, transfer or surrender. **PO, 2026-08-17:
> the Apple Developer account is an INDIVIDUAL membership under Isaiah's own personal Apple ID.**
>
> **There is no qest4 company account. There never was.** `qest4` is a string in a bundle identifier —
> reverse-DNS of the work email domain, chosen on 2026-08-05 because it was the domain at hand — and
> this document mistook a naming convention for an owner. Nothing was ever held by anyone else.
>
> **So the framing "migrate away from qest4" is wrong.** The account is already Isaiah's. What Stage 2
> actually needs is for that same membership to be re-badged from an individual to an organization, and
> **Apple has a documented path for exactly that: individual-to-organization conversion.** See 9.3.
>
> ⚠ **Do not delete 9.3's (a)/(b)/(c) yet.** They stay as the fallbacks until Apple confirms conversion
> in writing. But **9.2, 9.4 and 9.5 are now conditional and may collapse to nothing**, and that is a
> materially different — and much cheaper — Stage 2 than the one this list has described since v1.1.

- [ ] **9.2 — ⚠ CONVERT, DO NOT ENROLL — CONFIRM WITH APPLE FIRST (rewritten v1.5).** The old text here
      said *"enroll Forge Legacy LLC in the Apple Developer Program ($99/yr)"*, which assumed a fresh
      second account. **With an individual membership already held on this Apple ID, a fresh enrollment
      is likely not even possible** — Apple does not generally let one Apple ID hold both an individual
      and an organization membership, which is precisely why the conversion path exists.
      **Ask Apple Developer Support to convert membership `G722GV8H8C` from Individual to Organization**,
      with `Forge Legacy LLC`, D-U-N-S `149910851`, and Isaiah as a person with authority to bind it.
      ⚠ **Gate it on 9.1's lookup resolving first** — conversion validates the D-U-N-S the same way
      enrollment does.
      ⚠ **One consequence to accept deliberately:** conversion leaves the LLC's developer account owned
      by Isaiah's *personal* Apple ID. That is normal (every org account is held by a person's Apple ID)
      but it is worth knowing rather than discovering. **Do not create a second Apple ID at
      `forgelegacy.app` for this** — a new Apple ID means a new account, which is the expensive path this
      correction just avoided. If the address matters later, change the Apple ID on the account.
      ⚠ **Fallback if Apple says no:** the old plan stands — enroll a separate organization account under
      a different Apple ID, and 9.3–9.5 apply in full.
- [ ] **9.3 — ⚠ BUNDLE IDENTIFIER — LIKELY A NON-ISSUE NOW, BUT CONFIRM RATHER THAN ASSUME.** Bundle IDs
      are globally unique and `com.qest4.forgelegacy` is registered to `G722GV8H8C`.
      **If 9.2's conversion succeeds, this item costs nothing: the team record is the same record, so the
      bundle ID, app `6798436104`, the TestFlight builds and the testers' installs all persist untouched.**
      Nothing is transferred because nothing moves. ⚠ **Confirm that in writing with Apple as part of the
      conversion request** — it is the single question worth asking explicitly, and it is cheap to ask.
      ⚠ **The seller name still changes** to `Forge Legacy LLC`, which is the point of converting; on an
      individual account it would otherwise have been Isaiah's personal legal name on the public listing.
      **Only if conversion is refused** do the three original shapes apply, and they are kept verbatim:
      **(a) Release the identifier** and re-register it under a new org account — keeps the ID and every
      deep link, but the old app record must be removed first and its TestFlight builds die with it.
      **(b) New bundle ID** (e.g. `com.forgelegacy.app`) — always available, but it is a *different app*
      to iOS: the 20 testers' installs do not upgrade, they sit alongside. Changes the native
      fingerprint, so a new build regardless.
      **(c) Apple app transfer** to the new org account — preserves ID, installs and TestFlight, **but
      transfer generally requires the app to have already been publicly released**, which contradicts
      "first public release is under the LLC." Only viable if Stage 2 is re-sequenced to ship first and
      transfer after.
      ⚠ **In the (a)/(b)/(c) branch only, the `scheme` (`forgelegacy`) and the Supabase redirect
      allow-list must be re-checked** — an auth callback that silently stops resolving is a launch-day
      outage. **Conversion does not touch either**, because the bundle ID does not change.
- [ ] **9.4 — ⚠ CONDITIONAL (v1.5) — probably a NO-OP.** `eas.json` already names `ascAppId 6798436104`
      and `appleTeamId G722GV8H8C`, and **conversion changes neither** — the team ID survives a
      membership-type change. **Verify both after conversion and expect to change nothing.**
      Only if 9.3 lands on (a)/(b)/(c): update `submit.production.ios`, and for (b) also
      `ios.bundleIdentifier` + `android.package` in `app.json`.
      ⚠ **`eas.json` byte-for-byte matters** — a fresh checkout rewrites it with CRLF where the working
      copy has LF: identical to read, different fingerprint. Edit in place; do not re-create the file.
- [ ] **9.5 — ⚠ CONDITIONAL (v1.5) — the push-key risk is probably GONE.** This item existed because a
      *new team* means new credentials and **push stops silently** until the APNs key is re-uploaded.
      **Conversion keeps the team, so it keeps the credentials** — no new provisioning, no new APNs key,
      no silent push outage. **Verify push still delivers after conversion anyway** (it is one test send
      and the failure mode is invisible), but do not pre-emptively rotate anything.
      Only if 9.3 lands on (a)/(b)/(c): re-create EAS credentials under the new team and **re-upload the
      APNs key**, or push dies quietly.
- [ ] **9.6 — Enroll Forge Legacy LLC in the App Store Small Business Program** for 15% rather than 30%.
      Enrollment is per-entity and applies from the following month — **do it before revenue, not after.**
      (This supersedes §6.2, which assumed a single account.)
- [ ] **9.7 — ⚠ NEW v1.4 · App Store Connect → Agreements, Tax, and Banking. THIS IS A SUBMISSION GATE,
      NOT A PAYOUT CHORE, AND THE LIST DID NOT HAVE IT.** §7.4 said "submit" and §10.7 said "confirm the
      paywall ships"; **neither is achievable while the Paid Applications Agreement is merely accepted
      rather than in effect.** In-app purchases stay unsubmittable and sandbox purchases fail until all
      three of the following are green in App Store Connect. Three parts, in order:
      **(a) Accept the Paid Applications Agreement** under the Forge Legacy LLC org account (so: after
      9.2). The accepting person must have legal authority to bind the entity — the same standard as
      enrollment. The free-apps agreement is already in force and is **not** this.
      **(b) Bank account.** Needs the routing and account numbers from 9.0b — ⏳ **not yet in hand**, and
      this is the only line in §9 still waiting on something external. **The account holder name must
      match the legal entity exactly: `FORGE LEGACY LLC`.** A mismatch here fails the same way every
      other name mismatch in this section fails — silently, and by restarting the clock.
      **(c) Tax forms — and the two-link ownership chain from 9.0b decides what goes on them.** Forge
      Legacy LLC is a **disregarded entity**, so a W-9 does not carry the LLC's own name on line 1; it
      carries the name of the tax owner, with the LLC on line 2. **With Altimealix Holdings LLC in the
      middle, the look-through runs Forge Legacy → Altimealix → Isaiah** — the same reading the Zions
      application declared. ⚠ **Do not fill this from the above.** It is the one item in this checklist
      whose wrong answer is a federal tax filing rather than a rejected form, the EIN on CP 575 is a real
      alternative to the SSN, and **a two-tier disregarded chain is exactly the shape a CPA should
      confirm before signing.** Budget an hour of professional time; it is cheaper than an amended
      return. US entity ⇒ W-9; the other regions' forms only matter once those storefronts are enabled.
      ⚠ **Sequence it early enough to absorb a bank-verification round trip.** Apple micro-deposits or
      otherwise verifies the account, and that is days, not minutes — it should not be discovered in the
      same week as submission.

---

## 10 · App Store listing artifacts — the legal half is done, the marketing half is not

⚠ **This section's heading read *"none of these exist yet"* and was wrong on its first two items.** The
hosted policy and terms went live 08-15/08-16 and the privacy copy was corrected before any label was
signed — which was the whole point of 10.2's ordering. **10.1 and 10.2 are closed. 10.3–10.7 are
genuinely unstarted**, and all five gate submission rather than review.

- [x] **10.1 — ✅ DONE. `forgelegacy.app/privacy` and `/terms` both return 200.** `site/privacy.html` is
      the hosted document Apple links to and the one that governs; the in-app copy in
      `src/domain/settings/content.ts` is the summary of it. **Use these two URLs in App Store Connect.**
- [x] **10.2 — ✅ DONE 2026-08-15 (`cc2b5de`), and done in the right order — the copy was fixed BEFORE any
      label was signed, which is the only thing this item was ever protecting.** The Launch Audit §4-3
      finding is closed: the list no longer says *"only"*, and all three omissions are now stated —
      **precise location** (with the 200 m route trim described as a storage guarantee, not a display
      setting), **photos and video**, and **product-usage analytics**. Verified this pass that the two
      documents agree in substance: `site/privacy.html` §2 carries seven collection categories and the
      in-app summary contradicts none of them.
      ⚠ **They must not drift.** The in-app text is shorter by design and never different in substance —
      `content.ts` carries that rule in a comment above the body. **Change one, change the other**, and
      re-check both against the labels in 10.3.
      **Declare 10.3 from `site/privacy.html`, not from memory and not from the in-app summary.**
- [~] **10.3 — App Privacy nutrition labels** — ✅ **THE ANSWER SHEET IS WRITTEN: `Docs/App-Store-Privacy-Labels.md`
      (2026-08-19).** Every answer derived from `site/privacy.html` per 10.2, with the policy section cited
      beside each, plus the *considered-and-excluded* list so the near-calls read as decisions.
      **Twelve data types to declare**, all Linked, none used for tracking: Email · Name · Fitness · Health ·
      Precise Location · Photos or Videos · Customer Support · Other User Content · User ID · Device ID ·
      Product Interaction. Declare linkage and tracking use honestly; `usesNonExemptEncryption: false` is
      already set in `app.json`.
      ✅ **"Used for tracking" is NO, and it is verifiable rather than asserted** — `package.json` carries no
      Sentry, Bugsnag, Firebase, Amplitude, Mixpanel, Segment, Facebook, AdMob, AppsFlyer, Adjust or Branch.
      **No ATT prompt is required and none should be added.**
      ⚠ **Two answers are easy to get wrong and are called out in the sheet:** **Product Personalization** is
      required on Fitness and Health — Coach Holt building a program *from* training data is the definition —
      and **Device ID** must be declared for the push token.
      ⛔ **DO NOT SIGN UNTIL THE SUBMISSION BUILD IS DECIDED.** `Purchases → Purchase History` is NO today and
      **YES the moment `react-native-purchases` ships (4.2)**. Since 10.7 requires the Stage-2 build to carry
      the paywall, filling these in now and shipping the paywall later signs a declaration that is false about
      the build in review. `site/privacy.html` also gains a purchases paragraph and RevenueCat joins its §4
      provider list in the same pass — **policy → in-app summary → labels, in that order.**
- [~] **10.4 — Support URL and marketing URL.** Support URL is required. A mailto: alone is not enough.
      ✅ **The URL is LIVE and verified from outside since 2026-08-18: `https://forgelegacy.app/support`
      returns 200.** *(This box was unticked until 08-20 while the thing it gates had been done for two
      days — stale in the pessimistic direction, which is still stale.)* ⏳ Left: **paste it into App Store
      Connect** along with the marketing URL (`https://forgelegacy.app`). Not done until it is in the form.
- [~] **10.5 — Screenshots** at the required display size, plus app icon, description, promotional text,
      keywords, category (Health & Fitness), and age rating.
      ✅ **COPY WRITTEN 2026-08-19 — `Docs/App-Store-Listing-Copy.md`.** Name, subtitle, promotional text
      (149/170), keywords (94/100) and the full description (~2,470/4000), in Landing v6's voice.
      ✅ **SUBTITLE CHOSEN 2026-08-19 — option A, `Workout log & strength tracker`** (30/30, so any later
      edit is a rewrite). **§4's keyword list already assumed A and needs no change**; the two are coupled,
      and changing the subtitle without rewriting the keywords is the documented failure mode.
      **Nothing in the copy is still owed by the PO** — what remains on this row is the app icon and the
      age rating.
      ✅ **SCREENSHOTS SHOT AND FRAMED 2026-08-19 — eight, at 6.9" (1320 × 2868).** Captured on an
      iPhone 16 Pro Max, whose native resolution **is** an accepted 6.9" size, so nothing was scaled or
      resampled. Raws in `…/OneDrive/ForgeLegacy-AppStore/raw`, framed finals in `…/final/01–08.png`,
      uploaded in numeric order. Full running order, captions and the rationale are in
      **`Docs/App-Store-Listing-Copy.md` §8**, which is now the record for this row.
      ⚠ **EVERY FRAME IS CROPPED BELOW THE STATUS BAR** — that is what removes a third-party media-player
      pill sitting in the Dynamic Island on four captures, and on 02 the pinned red **Delete Program**
      button, which no amount of scrolling moves out of frame.
      ⚠ **THE SOCIAL FRAMES ARE THE REVIEWER DEMO ACCOUNT ON PURPOSE** — real testers' names and handles
      in a store screenshot are public forever and would need consent; `reviewer-seed.mjs` content is ours.
      ~~⛔ **STILL OWED: RESHOOT 05 (rank).**~~ ✅ **CLOSED 2026-08-20 — BY RECAPTIONING, NOT RESHOOTING,
      and this row was stale until 2026-08-21.** A reshoot was never available: **PO — *"I don't have enough
      to screenshot the other ranks"*** — so the account will NOT have rank history by launch, which is the
      assumption this row was resting on. The caption band was redrawn instead: *"Earned once. Yours for
      good."* → **"Everyone starts at zero."**, so the empty rank stops contradicting the caption and becomes
      the thing it is about. **The file is replaced; all eight frames are final** — verified 2026-08-21, each
      1320 × 2868, with `05-SUPERSEDED-earned-once.png` kept one folder ABOVE `final/` so the upload set stays
      exactly eight.
      ⚠ **SCREENSHOTS: ONE iPhone size — 6.5" OR 6.9", not both.** This row said "6.9" and 6.5" at minimum",
      which is double the work; Apple takes one set and scales. Verified against Apple's screenshot
      specifications 2026-08-18. **Real captures of the running app** — the landing page's phone mockups are
      HTML recreations and must never be used as screenshots, though their art direction is the right frame.
      ⚠ **Do not state the program-catalogue count anywhere in the listing** — the catalogue is a
      DISCOVER shelf now, Coach Holt is the product, and the number reads as a shortfall.
      ⛔ **Do not call Coach Holt "AI"** — it is a deterministic rulebook and the sentence-reading layer is out
      of scope before full release. ⛔ **Promise no Android, Watch, Health/Strava sync or CSV export**; the
      description says so explicitly instead, per Known Gaps' *"say it rather than let it be discovered."*
      ~~⛔ **AGE RATING IS BLOCKED** on the new 10.8 below.~~ ✅ **UNBLOCKED, ANSWERED AND ENTERED IN APP STORE CONNECT 2026-08-20 —
      `13+`, `16+` in Australia.** The question-by-question sheet is `Docs/App-Store-Listing-Copy.md` **§6b**.
      ⚠ **Answer it from §6b, not from memory or an older draft: Apple replaced the questionnaire in 2025.**
      12+ and 17+ no longer exist, and it is now In-App Controls · Capabilities · Content Descriptors.
      ⚠ **From September 2026 the Social Media questions are required to submit at all**, and we submit
      inside that window. ⛔ One answer is conditional — *Medical or Treatment Information = None* holds only
      while `limitations.ts` stays a mechanical exclusion map; injury advice in coaching copy makes it 16+.
- [x] **10.8 — ✅ BUILT 2026-08-19, `0171` APPLIED AND VERIFIED · ✅ CLIENT HALF DEPLOYED 08-19** (web
      `entry-69d5be42…`, OTA `01a01bda…` on build 6's runtime) · ✅ **filter list seeded by `0173`**
      (37 patterns + 18 documented exclusions) — ⏳ **`0173` authored, NOT applied; paste `pending-0173.sql`.**
      Blocks (symmetric, severing the friendship, leaving shared squads intact per the PO decision) ·
      reports on post/comment/check-in/person/squad with an open/actioned/dismissed status · `/admin` →
      Reports carrying an **oldest-still-open** line, which is what evidences *timely response* where a bare
      count cannot · `/blocked` in Settings → Privacy & Alerts, **ungated**, because blocking is reachable
      from a profile and unblocking is not · a `moderation_blocklist` + `profiles` trigger.
      ⚠ **ENFORCEMENT IS ENTIRELY SERVER-SIDE AND THE TWO FEEDS NEEDED DIFFERENT TOOLS.** `squad_feed()` is
      `security invoker` ⇒ four **`AS RESTRICTIVE`** policies reach it (restrictive = ANDed, so nothing
      existing had to be read or replaced). `friends_feed()` is `security definer` ⇒ **RLS does not apply**,
      so it carries **four explicit `is_blocked` predicates** — post, comment count, reaction count and
      reactor names. `supabase/apply/verify-0171.sql` asserts **both counts are 4**.
      ⛔ **STILL OWED, and recorded in the migration:** the slur/profanity list is **not seeded** (9
      impersonation patterns only; extending it needs no migration, so requirement 1 currently rests on
      operator takedown), and **blocked athletes still appear in competition standings** — a decision, since
      standings are numbers rather than authored content.
      ✅ **DEPLOYED 2026-08-19** — web `entry-69d5be4226aaa8d83f75e397b28f981b.js` (200, hash matched, live
      bundle searched for strings only this code contains) and an OTA to `production` on runtime
      `411fd2b6…`, which `fingerprint:compare` matched against build 6 BEFORE publishing and which the
      manifest endpoint then returned when queried as an iOS client. Report and Block confirmed visible in
      the app by the PO.
      *Original finding, kept because it is why this row exists:* **A submission
      blocker that appears on no other launch document.** The app has UGC — squad posts, comments, reactions,
      check-in photos and video, handles, shared workout notes — and the entire binary contains **one** Report
      control: `src/app/squad-settings.tsx:688`, which shows `'Reporting a squad is coming soon'`. **No report
      on a post, no block, no mute, no backing table** — `grep "create table.*(block|report)"` over all 170
      migrations returns nothing.
      Guideline 1.2 requires **filtering · reporting with timely response · blocking abusive users · published
      contact info**. Only the fourth is done (`forgelegacy.app/support`, 08-18).
      ⚠ **"It is only a private squad" does not exempt it** — Discover and request-to-join mean a stranger can
      enter a squad and post into a feed the athlete reads.
      ⚠ **The "coming soon" toast is worse than no button**: it proves inside the binary that the need was
      known and unmet, and a reviewer who taps it has found the finding.
      **Not designed here** — block-vs-mute, who a report notifies, and what `/admin` shows are product
      decisions. That some form of all three must exist before submission is not.
- [x] **10.6 — ✅ DONE 2026-08-19. A review demo account, seeded AND walked screen by screen.**
      `supabase/seed/reviewer-seed.mjs` (idempotent, writes through the anon key as the signed-in athlete so
      everything is provably reachable by the account Apple signs in to) + `reviewer-verify.mjs` (reports
      what that session can READ, which is the different and load-bearing question) +
      `Docs/App-Store-Reviewer-Notes.md` (pre-submission checklist and the paste-ready notes box).
      **Two accounts**, because a squad of one, a leaderboard of one and a feed of your own posts are the
      empty screens this item exists to prevent.
      ⚠ **THE WALKTHROUGH FOUND SIX DEFECTS THE SEED'S OWN OUTPUT REPORTED AS SUCCESS** — no program (Home
      showed its cold-start face), no chapter (the entire Legacy tab blank despite 5 real PRs), PRs first 0
      then 20, an empty friends feed, an impossible check-in, and two re-run failures. All fixed; all listed
      in the notes' §1b. **Walking it is not a formality.**
      ✅ **ALL NINE CHECKS PASS as of the 2026-08-19 deploy** (`entry-69d5be42…` + OTA `01a01bda…`). The two
      that failed before it — Report/Block on a profile, Settings → Blocked People — were failing only
      because `0171`'s client half was unshipped, which is what "applied is not shipped" looks like from the
      outside.
      *(Original text:)* **A review demo account, seeded.** Apple reviews behind the login. It needs a real account
      with a running program, logged history, a squad with a second member, and a challenge — **the
      social pillar is unreviewable from an empty account**, and "no content" reads as a broken app
      under Guideline 2.1. Include reviewer notes explaining Train Together needs two devices.
- [ ] **10.7 — Confirm the Stage-2 build carries the paywall** and that §5 (Legal) and §6 (Phase F) are
      done before submission, not after. **An IAP that is present but not yet purchasable fails review;
      an app that shows prices with no way to pay fails 3.1.2.**
      ⚠ **v1.4: add §9.7 to that list.** "Not yet purchasable" includes *the Paid Applications Agreement
      is not in effect* — the failure looks identical from the reviewer's side, and unlike the other two
      it cannot be fixed by editing the build.

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
