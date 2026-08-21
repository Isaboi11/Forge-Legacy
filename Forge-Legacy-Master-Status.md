# Forge Legacy — Master Status & Project Dashboard

> **🧭 READ THIS FIRST.** This is the permanent source of truth for Forge Legacy. Every Claude session must begin by reading this document before doing any work. It tells you where the project stands, what is already done (so you never duplicate it), what is blocked, and what comes next.
>
> **Maintenance rules (do not skip):**
> 1. Always update this file after major work.
> 2. Never delete completed milestones — move them to **§ Recently Completed**.
> 3. Add newly discovered work to the relevant section.
> 4. Keep all six completion percentages current.
> 5. Keep the **Decision Queue** current — remove a decision only when it is resolved.
> 6. Keep **Recently Completed** to the **15 most recent entries**. When it grows past that, MOVE the
>    overflow — verbatim — into `Docs/Status-Archive-2026-08.md` (or a new month's archive) and leave the
>    pointer at the foot of the section. **Moving is not deleting**; rule 2 still holds, and several
>    archived entries are the only record of why something was built the way it was.
>    ⚠ This is not tidiness. `AGENTS.md` makes every session read this file *first*, so its length is a tax
>    every future session pays. On 2026-08-18 it reached 5,374 lines / 868 KB with **81% of it one week of
>    changelog** — 48 entries written between 11 and 18 August. Archiving returned it to ~1,300 lines.
> 7. Update **Last Updated** and the **Dashboard** on every edit.

**Type:** Living Project Dashboard + Documentation Completion Audit
**Last Updated:** 2026-08-20 (**⭐ A PROGRAM CAN BE IMPORTED BY PHOTOGRAPHING IT — AND THE MODEL IS NEVER ALLOWED TO READ A PROGRAM, ONLY CHARACTERS.** `Architecture-Amendment-001-Import.md` §5 named image import in June and deferred it; §4.3 of the SAME document locks *"No AI interpretation. No inference."* Both hold, because the model transcribes pixels to tab-separated rows and stops — `parseProgramTable()` does every bit of the interpreting, so a photographed table and a pasted one are identical code from that line onward. ⚠ **The guard is one line: a kept line must contain a tab.** The app cannot enforce what is in front of a camera, so the guarantee is not that the model will decline to describe a person — it is that **the function has no channel that carries a sentence**. ⚠ **And the KNOWN-GOOD half of the test caught the real bug**: requiring an exercise-name column rejected the entire endurance case, whose header is `Week · Day · Session` with no movement column at all. ⚠ **Library only, no camera, deliberately** — Decision Queue #22 still lists the age floor open and the app is rated 13+. ⚠ **Metered, not charged** (`photo_import`, 2 credits, `metering_only` already true); ≈$0.035 a read. ⏳ **`0174` AUTHORED NOT APPLIED · the Edge Function is NOT DEPLOYED and does not ride an OTA — it needs a separate Supabase deploy.** ⚠ `coach-interpret` may be in the same undeployed state; not verified this pass.)
**Audit Basis:** Live repository scan, 2026-08-01. `git ls-files` (430 TS/TSX · 40 `*.test.mjs` · 257 `Docs/**/*.md` · 97 migrations), `git ls-files src/app` (72 screens, excl. layouts + `+html`), `git rev-list --count` (210), `node --test` (508 pass / 0 fail), `npx tsc --noEmit` (0), `npx eslint src` (1 pre-existing error + 13 warnings), `npx expo export --platform web` (clean, 11.11 MB entry), `wc -l` (87,450 LOC). Data-layer contract checked mechanically across 53 RPC names · 61 call sites · 434 select columns · 119 write payloads · 35 tables for RLS · 52 `SECURITY DEFINER` functions. Prior basis 2026-07-15 (227 TS/TSX · 33,229 LOC · 176 tests) retained in the Change Log.

---

## 📊 Project Dashboard

| Dimension | Completion | Notes |
|---|---:|---|
| **Architecture Design** | **~100%** | All 21 Architecture Freeze rows ✅ Complete; V1 Architecture Freeze officially **FROZEN 2026-06-30** |
| **UI / Wireframes** | **~95%** | Nearly all screens specced; W18/W19 both lock-candidate (W18 corrected 2026-07-09 — previously misdashboarded as LOCKED; W19 blocked on W18, see Decision Queue #16); no Search/Rest-Timer/Community wireframe yet — Communities is architecture-only in this pass, no pixel layout authored |
| **Content Authoring** | **Coaching 92% · Programs REFRAMED** | **Coaching: 735 of 797 exercises Published, 62 Needs Review.** **Honors: 179 awardable** across 14 categories. ⚠ **THE 24-PROGRAM CATALOGUE IS NO LONGER THE TARGET (PO, 2026-08-12): *"We are no longer doing 24 programs. That is least of ours right now since we have Coach Holt."*** This board previously read **8% programs** and called 7-of-24 *"the largest remaining gap"*; that measured against a goal the product no longer has, and the number was misleading in the direction that matters — it described a shelf as unfinished while the thing that replaced it shipped. **Holt generates a program per athlete from `rulebook/`, deterministically, across 10 goals** — so the catalogue is now a DISCOVER shelf rather than the supply of training, and **14 shipped definitions populate it adequately**. ⚠ **THE CONTENT INVESTMENT MOVED, IT DID NOT DISAPPEAR.** `rulebook/skeletons.ts` says it in its own header — *"THIS FILE IS THE COACHING"* — so the tables in `domain/coach/rulebook/` (skeletons, volume, preferences, limitations, cues, endurance) are now the authored content, and their quality is the product. `limitations.ts` in particular is flagged in its own file as the closest thing to health guidance in the app and **not yet reviewed by anyone**. **Exercise media: 703 loops + 703 posters live in the `exercise-media` bucket** (`project_exercise_media_animations`) — the older *"0 of 797"* on this row was stale. **Day-workout templates: 81 shipped**, 579 rows, audited clean |
| **Backend / Data** | **BUILT (Supabase) — 171 migration files, 0001–0171; `0170` and `0171` APPLIED AND VERIFIED 2026-08-19 via `supabase/apply/verify-017*.sql` (one row, every answer — the editor shows only the LAST statement's result, which is how two security checks once ran unread).** Prior text follows: **158 migration files, 0001–0158. ✅ APPLIED AND VERIFIED THROUGH 0158** (2026-08-13: `preflight-0146-0153.sql` **24/24 green** through 0154, `preflight-0155-0158.sql` **15/15 green** plus the config-row check; `0144` correctly absent by decision). ⚠ **THIS CELL WAS WRONG TWICE IN ONE DAY, IN BOTH DIRECTIONS** — it read "applied through 0143" while eleven more were in, was corrected to 0154, then read "`0155`–`0158` authored, NOT applied" while all four were already applied by a concurrent session. **The ledger is edited by hand and the schema is not, so any number written here is true only at the instant it is typed. Run the preflight; do not read this cell.** ⚠ **AND A STRUCTURAL PREFLIGHT IS NOT THE WHOLE ANSWER**: `entitlement_config` holds ONE row and a column DEFAULT does not touch it, so all fifteen 0158 checks can read APPLIED while every athlete — Premium included — is blocked from saving a week. That row is checked separately, by data, and returned free 3 / paid −1 | ⚠ **This row read "125 files, applied through 0125" while eighteen more had shipped** — the drift is recorded because it is the recurring failure of this board, not a one-off. 0137 signup alerts · 0138 substitution + avoidance capture · 0139 every athlete to imperial · 0140 athlete weekly reviews · 0141/0142 squad check-in video prune + orphan ledger · 0143 coach intensity signals. **Verified by the PO from the SQL editor**, not assumed: `exercise_avoidance`, `athlete_weekly_reviews` and `coach_intensity_signal` all return 0 rows without error, and `profiles` off imperial = **0**. ⚠ **0141 shipped able to run only ONCE** — `create or replace` cannot change a return type and 0142 changes it, so a re-run died on `42P13`; fixed to DROP first, because with no CLI and no history table, re-running from the top is the only recovery this project has. RLS on every table; every `SECURITY DEFINER` pins `search_path` |
| **Code Implementation** | **~78%** *(77 screens + the coach chat sheet, essentially all backend-wired)* | **77 screens** — 71 plus `/workout-builder` (W-25) and `/squad/[id]/goal` (S-2b) shipped 2026-08-03, `/forge-templates` 2026-08-05, **`/workout-join` 2026-08-07** (batch 4 shipped it; this row was never updated for it) and **`/coach` 2026-08-08**, and 72 until `/active-run` was retired 2026-08-01 (one run surface, folded onto the workout card). **74 of 75 read real Supabase** — `/forge-templates` browses shipped definitions and reads the athlete’s own templates only to mark what they already own. The whole SOCIAL pillar — Squads · Squad Detail · Friends · Feed · Athlete Profile — is live, not mock; the old "fully MOCK, quarantined in `*-placeholder.ts`" reading was stale by weeks. Remaining: content, media production, and the deferred items in Current Sprint |
| **Testing** | **2,644 tests green** *(coverage % not instrumented → not measured)* | ⚠ This row read **1616**. Newest, all from the 2026-08-11/12 passes: `shared-session` (12 — a partner's workout counts toward YOUR program, matched by coverage of the prescribed main lifts and catalogue-key identity), `partner-credit` (15 — both athletes named from the one row both can read, and a removal that survives the second pass), `intensity` (21 — ⚠ the DIAGONAL invariant: `beginner@drive` is bounded by `intermediate@push` on every lever that touches training content, and `back_off` is identical across all twelve cells), `intra-set` (18 — the five gates on the mid-set nudge, and a grading regex over every in-workout line that **rejected one of my own**), `tour-phases` (14 — ⚠ every surface still teaches something at phase 1, which is what makes thinning safe rather than a slower version of gating), `review` (11 — a banned-word list so a weekly summary cannot drift into a scoreboard), `intensity-learning` (15 — up is offered, down applies itself, and nothing moves on one session), `superset-labels` (16) and `substitution-capture` (11). Behavioural coverage of built layers, NOT whole-app coverage |

| Snapshot | Value |
|---|---|
| **Current Phase** | **Post-audit hardening.** 72 screens on a live Supabase backend (97 migrations), 508 tests, live at forgelegacy.expo.app. The 2026-08-01 audit found the build materially healthier than this board claimed — and one class of defect it did not: values displayed from columns nothing writes |
| **Current Focus** | **Coach Holt is the product; the catalogue is a shelf.** Closed 2026-08-11/12: the shared-workout program credit and partner symmetry, the Log-Set double tap, coach intensity + the mid-set nudge, the coin as the single coaching surface, tutorial phasing (23 steps → 11 on day one) with the first tour telemetry, the weekly review, swap/intensity capture, sharing discoverability, and every athlete back on imperial. **Next: the avoidance surface** — CL-D3 makes a visible, reversible list a PRECONDITION of `assemble()` reading the signals now being captured, so Holt records swaps and avoidances and is forbidden to use them until it exists |
| **Biggest Blocker** | **⚠ REFRAMED 2026-08-09 by PO decision: "we don’t need that many programs now that we have Coach Holt." The 24-program catalogue target is no longer the blocker it was.** Holt builds a program for any goal, room, session length and limitation, plus five race distances — so nobody is waiting on authored content to get a block. Authored catalogue programs remain valuable as *curated, named* work with Forge’s voice on them, and the locked roster still stands, but the COUNT stops being the critical path. The next real gap is the AI layer (the Edge Function that lets Holt read a sentence), which is what the paid tier is actually selling. Historical note: **Programs content — 7 of 24 authored** (Body Recomposition Foundation added 2026-08-06; Wave 2 of the Stage-2 plan is otherwise untouched). The old entry here ("the Social backend") has been wrong for weeks: Squads, Friends, Squad Detail and the feed are all Supabase-backed. Secondary: 0 of 797 exercises have media |
| **Last Updated** | 2026-08-20 (**Photo import ships into the tree.** Photograph a training table and it becomes pasteable rows — the model transcribes, `parseProgramTable()` interprets, so the locked *"No AI interpretation"* principle holds. The guard is a tab-only filter, which is what makes it structurally unable to describe a person. **Library only, no camera** — the age floor is still open and the app is 13+. **Metered, not charged.** ⏳ **`0174` authored NOT applied · Edge Function NOT deployed — it does not ride an OTA.** Nothing works until both happen; it fails closed until then.) |

> **30-second read:** Forge Legacy is a fully-architected fitness-legacy app (257 docs, ~208 mentioning LOCKED) with **a real, backend-wired product** live at forgelegacy.expo.app: **72 screens, 71 of them reading real Supabase data**, over **97 migrations (0001–0098, all applied)** with RLS on all 35 tables. 430 TS/TSX · 87,450 LOC · **508 `node --test` green** · tsc 0 · lint at baseline. *(Two readings that were stale for weeks and are now corrected: the social pillar is NOT placeholder — Squads, Squad Detail, Friends, the feed and Athlete Profile are all live; and this app is Supabase, not the Firebase the design doc ratifies.)* **Content is the critical path now, not plumbing:** exercise coaching is 735 of 797 published (92%) and honors are real data (139 awardable rows), but **programs are 7 of 24** and **exercise media is 0 of 797**. **Open, deliberately deferred** (reasons in Current Sprint): `chapters.workout_count` is a stored counter that is correct only until a delete-workout path ships; ~~`rank-progression` is built but orphaned~~ (**false — corrected 2026-08-02**: the Progress Hub links to it); the dead `chapters.honor_count` column awaits a change that already touches onboarding. **A standing lesson from the 2026-08-01 audit, worth keeping in view: a value that is only ever its default is worse than an absent one — absent renders nothing, a stale default renders a confident, specific, false claim about the athlete.** **The Backend/Data-Model architecture is now LOCKED** (`Backend-Data-Model-Architecture-v1.0.1` — Firebase stack, 12 runtime services, all entity schemas canonical). **Global Search is now also LOCKED** (`Global-Search-Architecture-v1.0.md` — Catalog Search/Discovery Search category split, Never-Searchable list, Performance Firewall-extended ranking/display rules, full reconciliation with both Backend §14 and `Community-Discovery-and-Search-v1.0`). The project can begin implementation as soon as the remaining Freeze rows resolve (Rest Timer, Component Library). **Rank is now ✅ Complete** — all 16 TBDs resolved/closed; RSA, RCM, Calibration Decisions, M-1, P-1, P-2 all LOCKED. Content authoring (programs/exercises) is also early (~12%). **New this session:** the Homepage Principles system is now fully architected and LOCKED — a quiet, rotating "digital inscription" of original Forge Legacy principles and reflection questions on Home (H-1), governed by `Homepage-Principles-Architecture-v1.0` with its canonical content in `Homepage-Principles-Library-v1.0`; the architecture states no fixed entry count so it cannot go stale as the library changes. **Also new this session:** the Communities subsystem (the fourth relationship pillar — Legacy/Friends/Squads/**Communities**) is now fully architected and LOCKED, with `Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`, and a complete downstream reconciliation across Social, Challenge, Honor, Notification, Monetization, and Navigation architecture. **Also new this session:** the Squad System Architecture is LOCKED — Goals, Missions, daily Check-ins, a shared Streak, Momentum, a Weekly Summary, a Squad Feed, Honors integration (new `SQUAD` catalog category), inline Competition standings, and Analytics, all scoped to Squad-internal surfaces only. This **deliberately lifts the Performance Firewall for Squad surfaces alone** — Friends Feed, Communities, and Calendar keep the original no-comparison Firewall unchanged — superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for those surfaces. **Also new this session:** Exercise Library Phase 4 (Media Architecture & Standards) is LOCKED — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group and defines production standards for all 5 media/anatomy fields, including mandatory consistency rules for looping animations (neutral-stance start/end) and muscle target images (fixed model/pose/camera template). This is standards and schema only — media production itself remains entirely unstarted for all 195 exercises. **Also new this session:** the Exercise Library's 5 flagged naming-duplicate pairs are fully resolved (Phase 5) — one canonical V1 name locked per pair (Box Step-Up, Back Squat, Front Plank, Barbell Romanian Deadlift, Barbell Bench Press), catalog reduced from 200 to 195 exercises (44 anchors, down from 45), and a new `Exercise-Naming-Standard-v1.0.md` locks the naming principles and an immutability-after-publication governance rule for future authoring. **Also new this session:** the Honors System Final V1 Architecture is LOCKED — reconciled two previously-parallel, never-merged catalog lineages (the locked 82-type catalog and six unmerged Expansion Pass documents) into one coherent system, merged Endurance/Consistency/Prestige, and added a new Hidden category, reaching **167 honor types across 13 categories**; two brand-new Strength honor families (Sex-Specific Milestones, Relative Strength Milestones — 24 types) were designed in full and then deferred to V2 by PO decision before final lock; also discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (still showing the original 7 categories from before this project's own prior Competition/Communities/Squad work). Architecture and schema only — the full L-11 descriptive-content catalog pass remains a separate, future task.

---

## 🚦 Project Health

| Dimension | Health | Read |
|---|:---:|---|
| **Architecture** | 🟢 | All 21 Freeze rows ✅ Complete; **V1 Architecture Freeze FROZEN 2026-06-30** |
| **Documentation** | 🟡 | 257 `Docs/*.md` (42 Amendments), ~208 mentioning LOCKED. Specs are strong; the lag is in THIS dashboard and in amendments authored but never merged into their parent docs — the recurring pattern |
| **Content** | 🟠 | Mixed, and previously mis-scored as one number. **Coaching content 735 of 797 published (92%)**; honors ARE data (139 awardable rows). **Programs 7 of 24** and **exercise media 0** — those two are the real gap |
| **Backend** | 🟢 | **Supabase, built & live** — 155 migration files (0002 lives in `supabase/design/`); ⚠ **0001–0154 ALL APPLIED, nothing pending** — verified by preflight 2026-08-13, 24/24 green. *(This row read "133 files, 0001–0130 applied, 0131–0133 authored and pending" while twenty-four more had shipped and every one of them was in the database. Recorded rather than silently overwritten: the drift is always in the same direction — the ledger describes work as pending that is already done — and it is dangerous because re-pasting an applied migration is not free, `0141` died on `42P13` when re-run.)* RLS on every table, and every `SECURITY DEFINER` function pins `search_path`. **One deliberate exception to "≥1 policy per table": `app_admins` (0129) and `metrics_daily` (0133) have RLS ENABLED WITH ZERO POLICIES** — that is deny-by-default and is the point, since `profiles_read` is `using (true)` and the operator roster must not be enumerable. Do not "fix" it (AA-D6) |
| **Code** | 🟢 | **72 screens, 71 of them on real Supabase data.** The one fixture-backed screen was deferred out of the routed tree 2026-08-01. ~150 components · 68 domain modules · 39 data modules |
| **Testing** | 🟢 | **2,644 green** (`node --test`, measured 2026-08-19) + live Supabase round-trip proofs; gates every unit. Coverage % still not instrumented → not measured |
| **OVERALL** | 🟢 | **A real, backend-wired app.** The social pillar — long carried here as the blocker — has been live for weeks. Critical path is now CONTENT (programs, exercise media), not plumbing |

---

## 🏃 Current Sprint

> **⛔ 2026-08-19 — A SUBMISSION BLOCKER THAT WAS ON NO LAUNCH DOCUMENT, AND IT IS NOW CLOSED IN CODE.**
> **App Store Guideline 1.2** requires filtering · reporting **with timely responses** · **blocking** ·
> published contact info for any app carrying user-generated content. Forge had the fourth and **one**
> report control — a toast reading *"Reporting a squad is coming soon"*. **`0171` is applied and verified**
> (both enforcement counts 4). ✅ **The client half DEPLOYED the same day** — web `entry-69d5be42…`, OTA
> `01a01bda…` on build 6's runtime, `fingerprint:compare` matched before publishing — so testers have the
> block. *(This line read "NOT deployed" until 2026-08-20; it was stale in the pessimistic direction.)*
> **Of the two things left owed, one is now closed:** ✅ **the slur/profanity list is seeded — `0173`,
> 37 patterns and eighteen documented exclusions** (⏳ **authored, NOT applied** — paste
> `supabase/apply/pending-0173.sql`; it needs no deploy, the trigger has been live since `0171`). ⚠ Still
> open **by decision**: blocked athletes appear in competition standings, since a scoreboard of numbers is
> not authored content — and the filter covers **handles and names only**, not post bodies.
>
> ✅ **AND THE AGE RATING IS ANSWERED — `13+`, `16+` in Australia (2026-08-20).** ⚠ **The questionnaire had
> changed and answering it from memory would have been wrong**: the tiers are now 4+ / 9+ / 13+ / 16+ / 18+
> (**12+ and 17+ are gone**) and it is split into In-App Controls · Capabilities · Content Descriptors.
> Question-by-question sheet with Apple's definitions in **`Docs/App-Store-Listing-Copy.md` §6b**; the two
> judgement calls (*Social Media = Present*, *Medical = None*) are argued there. ⚠ **From September 2026
> the Social Media questions are required to submit at all**, and we submit inside that window.
>
> ⚠ **THIS UNBLOCKED THE APP STORE AGE RATING**, which §10.5 could not answer while the controls were
> missing. Both listing artefacts are now written: `Docs/App-Store-Listing-Copy.md` (subtitle chosen by the
> PO — **"Workout log & strength tracker"**) and `Docs/App-Store-Privacy-Labels.md` (11 data types, all
> Linked, **none used for tracking** — verifiable rather than asserted, since `package.json` carries no ad
> or analytics SDK, so **no ATT prompt is required**). ⛔ **Do not sign the labels until the paywall build
> is decided**: `Purchases → Purchase History` is *No* today and *Yes* the moment RevenueCat ships, and
> §10.7 requires the submitted build to carry the paywall — filling them in now signs a declaration that
> is false about the build in review.
>
> **▶ 2026-08-19 — THE D-U-N-S RESOLVED AND THE CONVERSION REQUEST IS FILED.** Apple's `duns-lookup`
> returned `FORGE LEGACY LLC` at the Eagle Mountain address and mailed the number, closing the one item
> that was genuinely waiting on an outside party. The membership request went in the same day:
> **Apple Developer Support case `20000141921728`** — Contact Us → Membership and Account → **Program
> Enrollment** — asking to convert `G722GV8H8C` **Individual → Organization** under `Forge Legacy LLC` /
> D-U-N-S `149910851`, and to confirm *before processing* that bundle ID `com.qest4.forgelegacy`, app
> `6798436104`, TestFlight and its testers, signing certificates and **the APNs key** all survive.
> ⏳ **FILED IS NOT GRANTED.** This row exists because this board's documented failure mode is reading
> as done in the reassuring direction — a filed support case is the exact shape of thing that later gets
> mistaken for a completed one. Apple replies in days and will ask for proof of authority to bind the
> LLC (stamped certificate + operating agreement **Exhibit B**, both staged). **Follow up on the case;
> never re-file** — a duplicate case slows it. ⛔ **If a rep proposes release-and-re-register or a new
> bundle ID, do not agree in the moment** — those are the documented fallbacks and each costs TestFlight
> and the testers' installs. **Two sub-items survive the conversion**: verifying the five carry-overs in
> writing, and **enrolling in the App Store Small Business Program (30% → 15%), a separate opt-in that
> does not happen automatically.** Everything downstream still waits on this: **§9.7 Agreements, Tax and
> Banking is entered inside an *organization* App Store Connect account that does not exist yet**, and an
> app with IAPs cannot be *submitted* while the Paid Applications Agreement is not in effect. Unblocked
> and parallel meanwhile: Phase E (RevenueCat + SKUs + StoreKit sandbox), §10 store listing + screenshots
> + the seeded reviewer account, and §5 counsel review. See `Docs/GO-LIVE.md` v1.8.

**Sprint:** **LAUNCH — Stage 2** (2026-08-17). ⚠ **CORRECTED 2026-08-17 evening: "nothing external is left to wait for" was WRONG — the bank account was never open, only applied for.** **Stage 1 is CLOSED**: the testers have the build (build 6, OTA-reachable), the database runs through `0162`, `forgelegacy.app` is live, and the P-8 paywall *screen* is built. ✅ **D-U-N-S `149910851` ISSUED 2026-08-17** — the last external blocker is gone (⏳ the record needs 24–48 h to become queryable before §9.2 enrollment can start; gate it on Apple's `duns-lookup` returning the company, not on the calendar). ⚠ **THE CRITICAL PATH IS NOW ENTIRELY OURS**, which is a harder problem than a wait, not an easier one: **start §9.2+§9.3 — ⚠ REFRAMED 2026-08-17: they are ONE support request, and the "bundle identifier crisis" was an artefact of a wrong premise.** `G722GV8H8C` is an **individual membership on Isaiah's own Apple ID**, not a qest4 company team, so **ask Apple to convert it to an organization** and confirm in the same message that the bundle ID, app `6798436104` and TestFlight survive — if they do, **§9.4 collapses to verification and §9.5 stops applying entirely** (no new team ⇒ no new APNs key ⇒ no silent push outage). Gate the request on the D-U-N-S lookup resolving. Fallbacks stay documented until Apple confirms. Everything else is unblocked and can run in parallel: the RevenueCat adapter + 6 SKUs + StoreKit sandbox (§4.2–4.6) · the bundle-identifier decision (§9.3 — *confirm with Apple, it is the one item that can genuinely bite*) · App Privacy labels, screenshots and the seeded reviewer account (§10.3–10.7) · counsel review (§5). ⚠ **The business bank account is APPLIED FOR, NOT OPEN — corrected 2026-08-17 evening.** Zions emailed the same day asking for the **SS-4/EIN letter and business documents showing all authorized principals and titles**, and the application **auto-closes 2026-08-31** if unanswered. Answered that evening with CP 575 + the stamped certificate + a newly **executed operating agreement** (manager-managed, Altimealix sole member, Isaiah Manager; **Exhibit B is the authorized-principals-and-titles page**, reusable for §9.7 and D&B). ⚠ **Expect a second round** — an *entity* member usually draws a request for Altimealix's own certificate and EIN letter. **So an external party is back on the critical path**, and the item below is not closed: submitting an application exposed a gate neither launch document had: **App Store Connect's Agreements, Tax and Banking (new §9.7)**. An app with IAPs **cannot be submitted while the Paid Applications Agreement is not in effect**, and that needs the bank account, a W-9 and a binding signature. It would have surfaced on submission day. ✅ **The ownership contradiction is also settled**: Isaiah → Altimealix Holdings LLC → Forge Legacy LLC, so the operating agreement states direct membership correctly and CP 575's "SOLE MBR" is the SS-4 responsible party, not a rival claim — ⚠ **that two-link disregarded chain is what Apple's W-9 must reflect, and it is a CPA question.** ⚠ **Do not install `react-native-purchases` casually** — it is a native module, and the moment it lands every OTA to the build in testers' hands stops being deliverable until a new binary ships. That is now a decision with a cost, because the testers are actively using it. ⚠ **Two open verifications**: which build the testers hold (an OTA only reaches a matching runtime — if it is not build 6, a fortnight of fixes reached nobody), and the P-8 screen has still never been rendered in a browser. — **The batch-3 content below is HISTORICAL**, kept for its write-up rather than because it is current: **PO training-session feedback, batch 3** (2026-08-11) — three things found by using it

**Status: SHIPPED.** Migrations **0134 + 0135 APPLIED by the PO 2026-08-11** (with **0136**, the planned
workout, in the same pass). **OTA published** to branch `production`, iOS runtime `74a9a86b…`, group
`b39ed5c9-0a62-4799-a608-294b8ab17238`, commit `efd42d0` — `fingerprint:compare` matched build 4
(`5de44367`) **exactly** before publishing. Web preview deployed at
`entry-18a2c2ead296c028102611448d51be56.js`, `forgelegacy.expo.app` verified 200. Full write-up in
**Recently Completed #1**.

**⚠ WEB AND THE OTA ARE NOT THE SAME CODE.** The web export was taken BEFORE `efd42d0` landed, so
`forgelegacy.expo.app` carries these three fixes only, while the OTA also carries the Home
planned-workout feature that a parallel session committed mid-upload. Neither is wrong; they are just
different, and the next web deploy closes the gap.

**⚠ TWO COMMITS DESCRIBE OTHER WORK.** That same parallel session committed this batch under messages
belonging to its own: **`a1c6b1a` ("chore(migrations): 0126-0128 applied and verified") carries 0134,
0135 and their bundle**, and **`efd42d0` ("feat(home): build a workout for later…") carries every client
change and this dashboard entry**. Nothing is lost and the tree is clean — recorded because
`git log -- <file>` is the only way to find this work now, and a later reader looking for it by message
will not.

**Verification still owed:** applying proves only that the bodies parsed — PL/pgSQL binds column
references at RUN time. **(1)** a second account comments on your post and the bell moves; **(2)** open a
squad goal and tap a session somebody else logged and their sets appear. Until both are seen, treat this
as applied-not-proven.

**Gates:** tsc **0** · **1,836 tests / all green** (10 new here; the count includes the parallel session's
work, which shipped in the same OTA and was gated after the fact) · eslint **1 error + 13 warnings = the
pre-existing baseline, nothing added** · clean web export.

1. **"It won't let me add a video or a picture. And now I'm frozen on the friends feed page."** The
   Friends feed was the only capture surface in the app that opened a media picker from **inside a
   sheet**, and the only one that did not work — `useMediaPicker` presents its own `BottomSheet` and then
   a system picker, neither of which can be presented over a modal still on screen. Its header already
   documented that failure, from an earlier tester report, for the chooser IT owns; it knew nothing about
   a *caller* that is itself a modal. **The composer is now one screen for both feeds** and the audience
   decides where the post lands, which also deletes the duplicate.
2. **"I got reactions and comments on my last post, but I wasn't notified."** True on **both** feeds. The
   union had twelve branches and none read `squad_post_comments` or `squad_post_reactions`: the app
   announced that you **posted** and never that anybody **answered**. SOC-D11 has locked "comments
   generate notifications (to the post author; new P-5 row §13)" since the document locked — never built.
3. **"I clicked a workout someone logged on the goal screen and it said it couldn't load it."** 0117's
   dead link, one door over: that migration fixed a recap card by admitting workouts carried by a **post**,
   and a goal contribution is not a post. **The listing and the gate had different answers**, which is the
   actual defect — a screen that names a session has already made the visibility decision.

**Applied 2026-08-11** — `pending-0134-0135.sql` and `pending-0136.sql`, both by the PO in one pass.

**Prior sprint:** **Creator Dashboard, Phases 1 + 2** (2026-08-11) — the operator can see the product being used

**Phase 1: SHIPPED.** Migrations **0129 + 0130 APPLIED**, OTA published to `production` on runtime
`74a9a86b…` after `fingerprint:compare` matched build 4. Write-up in **Recently Completed #1**.

**Phase 2: code complete, MIGRATIONS 0131–0133 NOT YET APPLIED.** tsc clean · **1,822 tests** · lint at
baseline. Write-up in **Recently Completed #1a**.

**To reach it:** app → Settings → **Creator Dashboard** (bottom of the list, operator accounts only).

**⚠ WHAT THE PO MUST DO, AND IN THIS ORDER:**

1. ~~Publish the privacy-policy edit first.~~ ✅ **DONE 2026-08-11** — live at
   https://forgelegacy.expo.app/privacy. AA-D9 / P6-A1-D8 are satisfied: the disclosure is public
   *before* any collection starts.
2. **Paste `supabase/apply/pending-0131-0133.sql`.** ← the only remaining step.
3. Verify `select jobname, schedule, active from cron.job order by jobname;` shows **three** jobs.
   `forge-events-prune` is the only thing making the policy's 90-day sentence true; if it is missing,
   that promise is false while the words stay on the page.

**Decision Queue #22 — CLOSED 2026-08-11.** The privacy policy is **LIVE at
https://forgelegacy.expo.app/privacy** (and `/privacy/`; both verified 200 — the bare form 404'd on the
first attempt because EAS Hosting serves it from `privacy.html`, not `privacy/index.html`). Generated
from `Docs/Legal/Privacy-Policy.md` by `scripts/build-privacy-page.mjs`, which refuses to build if any
`[[PLACEHOLDER]]` survives and hard-splits at "Before You Publish" so the internal drafting notes are
never served. It lives in `public/`, not as a route: Apple requires a URL reachable **without an
account**, and an expo-router route would sit behind `<Stack.Protected>`.

Filled: **Isaiah Altamirano** as an individual, `isaiahaltamirano@gmail.com`, both dates, 13 / 30 days.
⚠ **Still open:** no postal address is published (§ 12 offers it on request) — required by some regimes,
and an argument for a registered agent before a wider release. EU/UK and California specifics remain
unaddressed.

A progress capture is now something you lay out rather than something the app decides for you: format,
style, poses, entry, what's printed on the card, and where it goes. One renderer serves the composer
preview, the squad feed and the post detail, and the exporter redraws the same geometry at 3.6×.

**Two things worth the PO's attention.**

1. **The entry-share format picker shipped yesterday is now unreachable.** Recently Completed #2 gave a
   single capture *All poses · Full width · Single photo* inside Share Configuration; the handoff (§19)
   routes a Transformation entry's Share here instead. That code is untouched and Compare still uses the
   screen — but the entry branch has no caller until the two flows are merged, which the handoff says is
   a later pass. **Flagged, not decided.**
2. **Instagram and Facebook are not an API integration.** Neither has a share intent this stack can call.
   The tiles compose the real image, hand it over, and open the app — and refuse to open it if the render
   failed. On a device, the render itself is the honest native stub (no `expo-media-library`, no canvas),
   so Save · Instagram · Facebook all report that they need the browser today. **More** works everywhere.

**Next:** the merge of Progress Photo Post and Share Configuration into one share surface, and the
official Instagram/Facebook brand marks (the tiles currently carry neutral glyphs by design).

---

**Sprint:** **Coach Holt, end to end** (2026-08-09) — the chat surface, the endurance rulebook, and a PO batch

**Status: shipped.** tsc clean · **1,512 tests** · lint at baseline · migrations **0123 + 0124 applied and
verified**. Full write-up in **Recently Completed #1**.

Holt now holds a conversation, builds for five race distances as well as five strength goals, and hands
back a plan you can read in full before anything is saved. The endurance standard is 🔒 **LOCKED**.

**The lesson this sprint keeps repeating, in three costumes:** a seventeen-week marathon plan whose
longest run was 7.3 miles passed every structural check; a migration self-check reported false on a
perfect apply; and the chat shipped with a letter "C" where the design’s bronze medallion had been sitting
in the repo the whole time. **tsc, lint and 1,500 tests cannot tell you the output is wrong** — only
reading it can.

**⚠ And one near-miss:** an edit script truncated the just-locked endurance standard to zero bytes.
Opening a file for writing empties it *before* a byte is written, and the exception in between was a
`print` statement failing to encode an emoji to Windows' cp1252 — a diagnostic killed the file it was
diagnosing. It survived only because it had been committed minutes earlier.

**PO decisions recorded:** the chat is unlimited (no model call, no cost to meter) and the 24-program
catalogue target is no longer the blocker now that Holt builds on demand.

**Next:** the AI layer — an Edge Function holding the key so  can read a real sentence. The
engine, the rulebook, the safe-edit layer and the chat are all built to receive it.

---

**Sprint:** **Workout notes** (2026-08-09) — finishing two columns that have been empty since 0001

**Status: code complete.** tsc clean · **1,479 tests green** · lint at baseline. **⏳ Migration 0124 NOT
YET APPLIED.** Full write-up in **Recently Completed #1**.

The PO asked for somewhere to write notes during a workout. Both columns already existed and **neither
had ever been written** — `workout_exercises.notes` since `0001_spine.sql`, and `workouts.notes` through
a `p_notes` argument that every client path has passed as a literal `null` for 114 migrations. A field
accepted but never sent, and a column written by nothing: the exact write-only failure the schema's own
comments cite as a standing warning.

A note on the lift (⋯ menu), a note on the session (the finish screen), both in history — and **the last
thing you said about a lift appears as you set up for it again**, which is the whole point. The same
sentence in your history is a diary; in front of you at the bar it is coaching.

**Notes are not the reflection.** `reflection` is the keepsake — permanent, shown back months later.
`notes` is the training log. They sit a page apart in the flow because two boxes asking the same question
on one screen would be worse than either.

---

**Sprint:** **The endurance rulebook** (2026-08-09) — Holt stops refusing 5k through Ironman

**Status: code complete.** tsc clean · **1,471 tests green** · lint at baseline. Full write-up in
**Recently Completed #1**.

Running was the one thing the coach could not do, and the reason was honest: the knowledge was not in the
repo, and the numbers that decide a running plan are exactly where the sources disagree. So this was
**research → thirteen decisions → code**, not code first. `Docs/Endurance-Programming-Standard-v1.0.md`
puts every contested call to the PO with a recommendation and the argument behind it; all thirteen were
approved and are now encoded, one constant per decision, each carrying its EPS id.

**The lesson worth carrying:** four defects were found by **reading the generated plans as a coach**, and
none of them by a test — including a seventeen-week marathon block whose longest run was 7.3 miles, which
passed every structural check there was. Tables produce *valid* programs long before they produce *good*
ones, and that gap is invisible to tsc, to the validator, and to 1,471 passing tests.

**⏳ Two things want a PO nod before the standard goes LOCKED:** the reading that resolves PAS §11.4's
10%/week cap against PAS §7.1's deload weeks (§6.1), and the marathon entry threshold raised from 10 to
15 mi/week after reading what a 12 mi/week build actually produced (§6.2).

---

**Sprint:** **Coach Holt** (2026-08-08) — a rule-based program builder, free, with the AI layer left for
the paid tier

**Status: code complete.** `npx tsc --noEmit` clean · **1,447 tests green** · lint at baseline (1
pre-existing error, 13 warnings). **⏳ Migration `0123_program_structure_guard.sql` NOT YET APPLIED** —
the UI gate and the slot-validated count are live, the database guard is not. Full write-up in
**Recently Completed #1**.

The short version: testers kept asking for something that *builds* rather than something that *picks*.
Holt asks what you want — goal, days, split, where you train, how long you have, experience, limitations
— and assembles a program or a single day from the 721-exercise catalogue, then hands the draft to the
Program Builder so nothing saves unreviewed. **The engine has zero per-goal branches**; everything
goal-specific is a table in `src/domain/coach/rulebook/`, which makes a new goal an authoring job and
makes ~1,800 combinations testable in seconds. He can also **edit a program you are already running** —
swap a movement, change a prescription or a cardio target, rebuild a day — through a mutation layer that
keeps the session count and every position invariant and **refuses, in terms, to touch a session you
have already trained**.

**Three things this sprint found rather than built.** The **Edit button was live on active programs**
against a LOCKED spec, and saving through it could truncate a ragged program's days or force an
irrevocable graduation — closed at three levels, the third being 0123. The **workout builder's save
dropped cardio** on the floor (`kind: 'strength'` hardcoded, targets nulled) and **`template-day-core`
dropped `targetDurationSec`**; both silent, both mutation-tested now.

**🔴 And one regression of mine that shipped and had to be rolled back:** `CoachBubble` used
`useSafeAreaInsets()` outside any provider, which throws — the app would not launch on device while
`tsc`, 1,420 tests, lint and the web build were all green, because the web build has a DOM fallback that
does not throw. The PO found it by opening the app. Fixed with a root provider and an `OverlayBoundary`
so a decoration can never take the app down again.

**Deliberately not done:** the endurance rulebook (5k → Ironman). Those goals **refuse in terms** today
rather than shipping a plausible-looking marathon table written from memory — that is the next authoring
wave, and it needs PO decisions on the contested calls (long-run share, quality days, taper length) the
same way PAS-D11's volume bands were a decision rather than a lookup.

---

**Sprint:** PO feedback, **batch 4** (2026-08-07) — ten items, of which one was already built, one was
a decision rather than a build, and one turned out to be worse than reported

**Status: SHIPPED 2026-08-08.** Migrations 0119–0122 applied and verified · committed `514d7e7` on `feat/home-onramp` and pushed · web deployed to forgelegacy.expo.app (live bundle `entry-516f9e32192b3d308678fa3fc73a5201.js`, confirmed by fetching the alias, not by trusting the deploy output) · **OTA published at runtime version `791bacda3a99ae050f5ce879b32fe57ba2e4a4a2`, which is build 3's exactly** — the runbook's test for whether an update can reach anyone. Push notifications still need a NEW iOS BUILD; everything else in this batch is live.
`npx tsc --noEmit` clean · **1347 tests green** · lint at baseline (1 pre-existing error, 13 warnings).
Full write-up in **Recently Completed #1**.

The short version. Two were live defects: **check-ins** were reading the entire video into the JS heap
before a byte moved, with no progress, timeout, retry or size guard — which is why "taking long to post
or not even posting" were the same picture; and the **squad invite link** was built from
`window.location.origin`, so an invite generated on a throwaway `--hash` deploy URL pointed at a
deployment that stops existing. Three were spec'd surfaces that had never been built: **joining a
workout in progress**, **naming your first chapter** (and renaming any chapter — there was no rename
path anywhere, for any chapter, ever), and **notifications for squad posts and check-ins**, whose toggle
had been inert since 0022.

**The one that was worse than reported: the squad QR code was not a QR code.** `buildQr` seeded a linear
congruential generator from the invite code, painted three finder squares on, and filled the other four
hundred cells with coin flips. No format information, no timing pattern, no error correction — nothing a
decoder reads. It could never have scanned, and it encoded the bare code rather than the link, so a
working encoder in that slot would still have gone nowhere. Replaced with a real byte-mode encoder
written in-repo (a dependency would have moved the fingerprint), with 21 tests including a decoder that
reads the finished matrix back the way a scanner would.

**What this batch keeps confirming:** the same lesson as batch 3, twice over. A surface can look finished
for months while stating something false — the QR sheet said *"Point a camera at the code"*, and the ⋯
Options row said *"Invite training partner · They'll do this workout too"* while opening a tagging sheet
that sent nothing at all.

---

**Sprint:** PO feedback, **batch 3** (2026-08-05) — four items, two of them not what they looked like

**Status: code complete, deployed and verified live; migrations 0117–0118 APPLIED 2026-08-06**
(`supabase/apply/pending-0117-0118.sql`) — ⏳ **not yet proven at run time.** Full write-up in
**Recently Completed #1**.

The short version: two were plain gaps — the Forge template preview had no *Start*, and the Program
Builder's day couldn't take a template. The other two were surfaces that had looked finished for months
while stating something false. **The Progress Hub's lift charts** plotted `personal_records`, so they
showed the days a record fell rather than how a lift was going — a lift trained hard without a PR drew a
flat line, a lift never PR'd could not be charted at all, nothing could go down, and the value shown was
an **estimated 1RM the athlete had never lifted**. **A shared workout recap** was a dead link for
everyone except its author, on the one card in the feed that promises the most — and the Squad feed sent
the same post type to a different screen entirely, so the amendment that specified the destination was
being met by neither. Plus: an accomplishment can finally carry the photo or the video, which 0023 had
reserved a column for and never filled.

**What this batch keeps confirming:** the two real defects were both *a value or a link that was only
ever its default* — the standing lesson from the 2026-08-01 audit, in two new costumes. Neither was
detectable by grep, tsc, or the test suite as it stood; both were found by a person using the app.

**Two things deliberately NOT done, with reasons:**
- **Chart smoothing** (the `.dc`'s Catmull-Rom curve). A curve through training data invents values
  between sessions — it draws a Tuesday you did not train. A straight segment between two facts is the
  honest line on a chart whose whole job is "what did I actually lift".
- **Deleting an accomplishment does not delete its media object.** Storage has no foreign keys and a
  trigger reaching from a public table into `storage.objects` fails silently when it fails. Recorded in
  0118's header rather than pretended away — the same standing gap `transformation-media` and
  `squad-media` already have, and the same answer: a sweep job, when one is worth writing.

**Prior sprint:** PO training-session feedback, **batch 2** (2026-08-04) — eight items, one retracted

**Status: code complete and deployed; migrations 0112–0115 APPLIED 2026-08-05** (in the 0109–0116 paste).
Full write-up in **Recently Completed #4**. The short version: the PO trained again and wrote down eight
more things. He retracted one on investigation (the video check-in *does* expire), and three of the
remaining seven turned out not to be what they looked like — **supersets already worked and already took
3+ exercises** (what was missing was declaring one at PICK time, building as you go), **"End workout" had
no confirmation at all** in a path that is irreversible, and **name search was an unapplied locked spec
rather than a new request** (`Identity-Amendment-001` §4 vs SOC-D15 — two locked docs disagreed and the
narrower one won by being the one that got built). Also: the set inputs now raise the keyboard on the tap
that asked for it; the **M-2 honor ceremony fires for the first time ever**, on Legacy; a sealed session
can be shared to the Friends feed; and Forge ships six starter templates.

New docs: `Social-Architecture-Amendment-002-Workout-Recap-Posts` ·
`Social-Architecture-Amendment-003-Athlete-Search` · `W26-Amendment-001-Forge-Starter-Templates` — all
three with banners applied to their parent specs in the same pass, per the standing rule that an
amendment left unmerged is the failure mode this project keeps rediscovering.

**Prior sprint:** PO training-session feedback (2026-08-03) — fourteen items from actually using it

**Where the batch came from:** the PO trained a real session on the web preview and wrote down everything
that got in the way. That is a different and better bug report than an audit, because every item is
something a person hit rather than something a grep found — and two of the fourteen turned out not to be
what they looked like.

**Shipped (all verified: tsc 0 · lint at baseline · 878 `node --test` green · web export clean):**

- [x] **The active workout screen stopped fighting the athlete.** One **Set Input Sheet** carrying weight
      AND reps under one "Log Set" that also COMPLETES the set (restores W-9 §6.2, which the build had
      drifted from into two single-field pickers and a separate green check). Typing is now the default
      and the wheel is the opt-in, persisted. The **Actual** column got the bordered-input treatment and
      pencil the Weight column already had. The footer's second button is **Add Exercise** — it held a
      second "End Workout" that, on the last exercise, called the same handler as the primary beside it
- [x] **Two silent falsehoods in set logging.** (1) The wheel *displayed* 0 and wrote back **null** if you
      opened it without scrolling — every weight entered that way was discarded. (2) The Record screen
      counted only sets with a weight, so **three unweighted warm-up sets reported "0 sets"** beside a
      header that said 3. `weight: 0` now means **BW** (an answer) and `null` means nothing was entered
      (an absence) — and a bodyweight set no longer writes a "0 lb personal record"
- [x] **Supersets, end to end** — built on the EXISTING circuit grouping rather than a parallel model, so
      absent `groupKind` reads as `'circuit'` and no shipped program changes meaning. One merged card,
      alternating round-major, rest suppressed between members and fired after the last of a round.
      Creatable in the active workout, the Program Builder and the new Workout Builder. Migration **0106**
      (`workout_exercises.group_*` + `save_workout` + `save_workout_as_template`) — without it a pairing
      made in-session existed until Finish and then did not
- [x] **Start Strength: three doors, not one** (`Forge Strength Start.dc.html`, specified all along).
      Every entry that assumed build-as-you-go — Home's hero, its path card, "Something else today?", the
      Workouts `+`, "Build a Workout", Templates' "New" — now offers **from a template · build it first ·
      build as you go**. One-tap into today's program session is deliberately preserved
- [x] **The Free Workout Builder exists** (W-25, `/workout-builder`). Templates were capture-only, which
      answered half the question and left "plan Thursday before Thursday" with no door at all. W-27's
      "Edit" is now a real edit rather than a rename
- [x] **Exercise search matches TOKENS.** It already matched substrings; what failed was multi-word —
      "db curl" and "press incline" found nothing in a catalogue of 794. The rule moved to a pure module
      so `node --test` can load it AND so the Exercise Library runs the identical matcher: its copy had
      drifted twice, missing the vernacular aliases entirely
- [x] **A rest-timer ding**, gated by the P-4b Sound preference — which was a recorded intent and is now
      real. Web Audio on web, `expo-audio` on native, audio unlocked from the "Log Set" tap because iOS
      Safari will not let a `setInterval` make a sound
- [x] **Avatar positioning** (`AvatarCropEditor`) — pan/zoom into a circular 1:1 mask, cropped at upload
      so the stored file IS the avatar and no consumer changes. The OS picker's `allowsEditing` does
      nothing on web and little on iOS, which is both platforms this app is used from
- [x] **"Save this day as a template" — and it was never the database.** The naming sheet was written once
      at the bottom of a four-early-return screen, inside the LAST branch; the button that opens it is on
      the Record branch, which returns first. Pressing it set state nothing rendered. Every layer beneath
      — handler, data module, RPC, table, RLS — was correct and had been for weeks. A **source guard**
      (`overlay-branch.test.mjs`) now fails if a branch can open that sheet without mounting it; verified
      by removing the fix and watching it fail
- [x] **The "weird emblem" on the Legacy Timeline** was a hand-drawn path — two boxy slabs, vertically
      off-centre, stroked near-black on a bronze coin at 15px. The library's own `book`, `flame`, `shield`
      and `medal` paths replace it. Also: the halo was clipped by `overflow: hidden`, and a chapter that
      is neither active nor sealed claimed a live green dot (`isActive` was fetched and never read)
- [x] **Squad Goal Detail** (S-2b) built to `Squad Goal Detail.dc.html` — hero · pace · contribution ·
      weekly rhythm · milestones · recent progress · closing card · past goals. Migration **0107**. It
      also closes the defect **0103's own header recorded and declined to fix**: a member's contribution
      kept counting past an expired deadline while the squad total was frozen
- [x] **Apple Watch: answered, not built** — `Docs/Wearable-Integration-Feasibility-Note.md`. No browser
      can reach a Watch; iOS has neither a HealthKit web API nor Web Bluetooth. The cheapest real route is
      an Apple Health import in a native build, with no watchOS code at all

**Two more defects, reported from real use after the deploy and fixed the same day:**

- [x] **"N / M trained today" counted VIDEO CHECK-INS, not workouts.** A squadmate trained, logged every
      set, and moved the Squads card's largest figure by nothing. The card was neither stale nor
      mis-fetching — it counted a different thing from the one its own label names, the same class as
      `chapters.honor_count` (0098). RLS on `workouts` is own-row, which is WHY the client had settled
      for check-ins: it was the only cross-member signal it could read. Migration **0108** adds a
      `security definer`, membership-gated count of members with a saved workout OR a check-in since the
      caller's local midnight. It returns a COUNT, never a roster — naming who did not train is a
      different product (SA-D4)
- [x] **Home called a program you never started "Current Program".** The tile is hard-labelled and falls
      back to a `future` program so Start stays one tap away. `index.tsx` had already stopped the HERO
      from making that claim ("Home asserting a program relationship the athlete never entered") and the
      fix stopped one element short of the tile. Now "Planned Program · Not started — tap to begin", with
      the program's SIZE instead of an empty progress bar — an empty bar under "0 / 32" is the picture of
      somebody who started and did nothing
- [x] **The personal 6-week import renamed `Bridger Logan — 6 Weeks` → `Iron & Engine`.** The old name
      put the person who SOLD the program on the athlete's Home screen and made a purchased product look
      like a Forge title. IRON is the barbell spine (bench · squat · deadlift · military press, ladders
      into 5×5, peaking on max-effort triples in week 6); ENGINE is what closes nearly every session
      (sled, wall ball complexes, AMRAPs, assault bike, rowing). Deliberately NOT catalogue-style naming,
      which would make a personal import read as a Forge built-in — see the standing "never promote to
      catalog" rule

**Migrations 0106, 0107 and 0108 APPLIED 2026-08-03** (0106–0107 bundled at `supabase/apply/pending-0106-0107.sql`),
confirmed by a structural check of the four `workout_exercises.group_*` columns and all five functions.
Both redefine PL/pgSQL that resolves column references at RUN time, so that check proves they EXIST, not
that they WORK — the run-time proof is pressing the buttons: log a superset and save it as a template
(0106), open a squad's goal card (0107).

**Decision taken (PO, 2026-08-03): squad goals are OWNER-ONLY.** SQ-D3.2's "any member may set or edit
the active Goal" is **superseded** by `Squad-Architecture-Amendment-004` §4 (SQ-A4-D5), and the banner is
applied to `Squad-System-Architecture-v1.0.md` §3 rather than left to drift. A goal is longer-lived and
more consequential than a squad's name — one runs at a time, and changing it mid-flight resets what
everyone is working toward. **No code changed**: both surfaces already gated on owner, which is also what
`squads_update` (0029) has always enforced. No RPC added, and that policy stays at its narrowest, since
opening it would have exposed the squad's name, privacy and crest too. Members still see the goal and
every contribution; they just don't set it.

**New docs:** `W9-Amendment-004-Supersets-And-Bottom-Add-Exercise` ·
`Program-Authoring-Standard-Amendment-001-Superset-Encoding` (supersedes PAS §567's "use `notes`") ·
`W25-Amendment-001-Builder-Built-And-Strength-Start` ·
`Squad-Architecture-Amendment-004-Goal-Detail-Screen` · `Wearable-Integration-Feasibility-Note`.

**Prior sprint:** Full-app audit (2026-08-02) — try to break it, then fix what broke

**Audit result (see Recently Completed #1).** Seven passes: reachability · data contract · dangling loops ·
personas · computation truth · hostile input · authority. **Three defects closed** — a personal record
nobody set (a lift twice in one session was judged against a stale number), `archive_squad_goal` running
`SECURITY DEFINER` with no caller check (a disclosure oracle over private squads; migration **0101**), and
two invisible control characters that had grep reporting `workout.tsx` as a binary file *mid-audit*.
**One defect reported and deliberately not rushed:** personal records are keyed by display name rather than
`catalog_key`, so one lift can hold two histories — proven, 190 lb announced as a record to an athlete who
has benched 225. Fixing it means replacing `save_workout`, so it needs a decision, not a reflex.

**Prior sprint:** Post-audit correction — make every surface tell the truth

**Objective:** Close the defects found by the 2026-08-01 repository audit, then bring this dashboard back in line
with the built tree. The V1 Architecture Freeze closed 2026-06-30 and implementation is well past it; the
pre-implementation sprint that stood here until now had been complete for five weeks.

**Tasks:**
- [x] **F1 — `chapters.honor_count` was always zero** (migration 0098 + 4 surfaces). Written once at chapter
      creation as a literal 0 and incremented by nothing across 97 migrations, yet displayed as a real tally on
      Chapter Detail, the Legacy Timeline, the public profile, and the M-5 seal ceremony. Now derived from
      `honor_instances.chapter_id`, per 0095's derive-don't-store rule. Commit `8179a10`
- [x] **F2/F3 — 17 routes sat outside the auth guard.** In expo-router a route is gated by being DECLARED, not by
      existing; undeclared screens answered a URL while signed out. RLS meant nothing leaked, but a logged-out
      visitor got empty Goals/Progress-Hub/Friends/Settings instead of sign-in. `route-guard.test.mjs` now derives
      the screen list from the filesystem so it cannot regress. Commit `e6fc901`
- [x] **F4 — invented athletes were compiled into the production web bundle.** Gating a screen does not tree-shake
      a module: `app/post/[id].tsx` was a route, so its static import pulled the whole fixture chain in. Screen
      deferred to `src/deferred/`; verified by rebuild (Ada Ridge 10 → 0, bundle 11.71 → 11.11 MB). Commit `d5a0db3`
- [x] **F5/F6 — three silent failures made honest.** The honors guard caught the impossible case (PGRST205) and
      missed the real one (42703); `claimEarnedHonors` turned a schema error into "0 granted"; a failed
      `saveHomeGym` produced the exact "didn't answer" state its own comment warned against
- [x] **F11/F12 — dead code + a comment that overstated a security bypass** (the gate holds server-side)
- [x] **Dashboard reconciled** to measured ground truth (this entry)
- [ ] **F7 — `chapters.workout_count` is a stored counter with no repair path.** Correct TODAY only because no
      delete-workout path exists. DEFERRED deliberately: fixing it means touching `save_workout` for no current
      user benefit. **Becomes a real defect the day Activity Detail gains a delete** — do it then
- [x] **`rank-progression` — RESOLVED, and the premise was false.** It is not orphaned: the Progress Hub's
      "See every rank" closer links to it (Legacy → rank badge → Progress Hub → here). The "zero inbound
      links" reading was stale in this board AND in `_layout.tsx`'s comment; both corrected 2026-08-02
- [ ] Decide whether to drop the dead `chapters.honor_count` column — needs a `complete_onboarding` rewrite, so it
      should ride with the next change that already touches onboarding
- [ ] Programs content: 7 of 24. **This is still the single largest real gap in the project**

**Sprint Complete When:** no surface displays a value nothing writes; every route is guarded by declaration; the
dashboard's numbers match a fresh measurement.

---

## 🧊 V1 Architecture Freeze

The official checklist of governing architecture documents required **before implementation can begin**. Implementation is gated on every row reading **✅ Complete** (or an explicit written deferral).

| # | Governing Architecture | Status | Source / Note |
|---|---|---|---|
| 1 | Product DNA | ✅ Complete | `FORGE_LEGACY_PRODUCT_DNA.md` LOCKED |
| 2 | Master PRD | ✅ Complete | `FORGE_LEGACY_PRD.md` + `Forge-Legacy-Master-PRD.md` LOCKED (Import Amend 001) |
| 3 | Global Architecture | ✅ Complete | `MVP-Architecture-Audit-v1.0.md`, `Global-Architecture-Status-Audit.md` |
| 4 | Onboarding / Auth | ✅ Complete | Onboarding-Journey + Account-Auth LOCKED |
| 5 | Calendar | ✅ Complete | `Calendar-System-Architecture-v1.0` LOCKED |
| 6 | Programs / Builder | ✅ Complete | Program Catalog + Ecosystem + Authoring Standard LOCKED |
| 7 | Exercise Library | ✅ Complete | `Exercise-Library-Architecture-v1.0` + Exercise-001/002/003 LOCKED |
| 8 | Legacy / Chapters | ✅ Complete | L-1/L-2/L-3–L-6/L-12–L-16 LOCKED |
| 9 | Honors | ✅ Complete | Honor Catalog v1.5 + Evaluation Service v1.1 + HonorInstance v1.1 LOCKED; `Honors-Architecture-V1-Final-v1.0` + `Honors-Authoring-Standards-v1.0` LOCKED |
| 10 | Social / Friends | ✅ Complete | `Social-System-Architecture-v1.0` (governing) LOCKED |
| 11 | Squads | ✅ Complete | S-1 v1.6/S-2 v1.6/S-3 v1.3 LOCKED + **`Squad-System-Architecture-v1.0` LOCKED** (Goals, Missions, Streak, Momentum, Weekly Summary, Feed, Honors, Competition, Notifications, Analytics, Commitment). S-1's secondary "Explore Communities" entry point (Tier 3) retired 2026-07-07 — Communities is now its own tab, see row 20 |
| 12 | Competitions / Challenges | ✅ Complete | `Challenge-System-Architecture-v1.0.md` (v1.5) LOCKED + C1–C7 LOCKED; filename/version mismatch reconciled 2026-06-30 (filename = initial-publication convention; internal header tracks current version; all C-series and cross-doc authority references updated) |
| 13 | Notifications | ✅ Complete | P-5 v1.5 (Arch + Wireframe + Amend 001/002/003) LOCKED |
| 14 | Settings | ✅ Complete | P-4/5/6/8/9 LOCKED (minor cosmetic stale text) |
| 15 | **Rank** | ✅ Complete | RSA LOCKED · RCM LOCKED v1.0.1 (all 16 TBDs closed) · Calibration Decisions LOCKED (Q1–Q14) · M-1/P-1/P-2 LOCKED · P-3 retired · TBD-11 formally closed as non-blocking |
| 16 | **Backend / Data Model** | ✅ Complete | `Backend-Data-Model-Architecture-v1.0.1` LOCKED — Firebase stack, 12 runtime services, all entity schemas, 6 remaining open questions tracked in §20 of that doc |
| 17 | **Global Search** | ✅ Complete | `Global-Search-Architecture-v1.0.md` LOCKED — Catalog Search/Discovery Search category split, Never-Searchable list, entity privacy filters, ranking, navigation targets, offline behavior, full Backend §14 reconciliation, `Community-Discovery-and-Search-v1.0` §6 updated |
| 18 | Component Library / Design System | ✅ Complete | `Component-Library-Architecture-v1.0.md` LOCKED — 3-tier hierarchy (CLA-C01–C37), 6 governing principles, 20 CLA-D decisions; dark-only V1, Phosphor Icons, system font |
| 19 | **Standalone Rest Timer** | ✅ Complete | `Rest-Timer-Architecture-v1.0.md` LOCKED — 22 decisions (RT-D1–RT-D22); ProgressRing component owned; state machine (INACTIVE/RUNNING/BACKGROUNDED/RECOVERABLE), wall-clock strategy, persistence/recovery, accessibility (Reduce Motion + screen reader), 4 open questions (non-blocking), full downstream reconciliation applied |
| 20 | **Communities** | ✅ Complete | `Community-System-Architecture-v1.0` (→ v1.1, COM-D18 navigation revised) + `Community-Feed-Specification-v1.0` + `Community-Discovery-and-Search-v1.0` + `Community-Roles-and-Moderation-v1.0`, all LOCKED; full downstream reconciliation applied to Social-System-Architecture (v1.1), Challenge-System-Architecture (v1.4), Honor Catalog (v1.3), P-5 (v1.3), Monetization Amendment 001, and Master PRD §6/§19. **Navigation reversed 2026-07-07** — Communities is now the **5th bottom-navigation tab** (`Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`), not a Home/Squads discovery entry point; Home's Tier 6 and Squads' Tier 3 modules are retired; still architecture-only, no pixel wireframe authored yet |
| 21 | **Homepage Principles** | ✅ Complete | `Homepage-Principles-Architecture-v1.0` (governing; the "digital inscription" on Home) + `Homepage-Principles-Library-v1.0` (canonical content, single source of truth for entry counts), both LOCKED; reconciled into `Home-Screen-Wireframe-Spec-H1` (→ v1.2, new non-tiered inscription element) and `Forge-Legacy-Master-PRD.md` Amendment Log |

**Freeze status:** **✅ FROZEN — 2026-06-30.** All 21 rows ✅ Complete. The V1 Architecture Freeze is officially declared. Implementation may begin.

---

## 📐 Documentation Status (Architecture only)

Specification maturity for governing/architecture and screen specs. **Content authoring is tracked separately in § Content Status.**

**Legend:** `[x]` LOCKED/complete · `[~]` partial/draft/lock-candidate · `[ ]` not started

### Foundations
- [x] **Product DNA** — `FORGE_LEGACY_PRODUCT_DNA.md` LOCKED
- [x] **Master PRD** — `FORGE_LEGACY_PRD.md` + `Forge-Legacy-Master-PRD.md` LOCKED (Amendment 001 Import applied)
- [x] **MVP Architecture Audit** — `MVP-Architecture-Audit-v1.0.md`
- [x] **Information Architecture (IA)** — in PRD (Phase 2A)

### Auth / Onboarding
- [x] **Account Creation (O-1)** — LOCKED **v1.1** (2026-07-12: reconciled to the governing Onboarding architecture — added the "Your Next Chapter" vision screen (ONB-D5), affirmed one unified path, corrected the stale "O-2 collects Athlete Type / Chapter Invitation" boundary to derived-type + silent-Chapter-I)
- [x] **First-Time Setup (O-2)** — LOCKED **v2.0** (2026-07-12: **reconciled to the governing Onboarding architecture**. Removed O-2a Path Selection, the manual Athlete-Type step, and O-2e Prior Accomplishments; added the unified Goals/Experience/Equipment/Schedule steps + Sex field + deterministic Recommended Starting Point; replaced the profile-reveal Completion Moment with the readiness Transition + silent Chapter I; added Removed-Screens traceability, forward Implementation Requirements, and Verification Scenarios. No governing decision changed — this closes the O-2-vs-Onboarding LOCKED-vs-LOCKED contradiction)
- [~] **First Chapter/Goal (O-3)** — **SUPERSEDED** (2026-07-12: explicit ⛔ superseded banner + status applied; replaced by ONB-D14 silent Chapter I + ONB-D16 transition; naming/rename moves to L-5; retained as historical record only — do not implement)
- [x] **Onboarding First-Time Journey Arch** — LOCKED (governing) → **v1.1 pending reconciliation** via `Docs/Amendments/Onboarding-Amendment-002-Progressive-Discovery.md` (LOCKED, 2026-07-19): cuts onboarding to **identity only (Account + Username)** — Goals/Experience/Equipment/Schedule/Program all move to opt-in post-Home surfaces; **Athlete Type is not asked, defaults `Hybrid`** (ONB-A2-D1, supersedes the ONB-D8 goal-derivation for V1). First-Home card = **[Start Training] + [Programs]** (Programs tab = hub: browse · build-express · opt-in "Get a recommendation"); ONB-D20 Progressive Discovery made concrete (Explore-Forge Home section + per-surface first-visit banners + post-first-workout moment). No locked decision's *content* changed — only timing/placement + a neutral default. Parent-doc §26/change-log merge to v1.1 still pending (recurring "amendment authored, not yet merged" pattern — tracked)
- [x] **Account / Auth Architecture** — LOCKED (session lifecycle + delete account)

### Home
- [x] **Home Screen Wireframe (H-1)** — LOCKED **v1.6** (2026-07-12: added the ONB-D17 first-run "Active Chapter · awaiting first workout" hero sub-state (§5.5) reconciling H-1 to the governing Onboarding architecture — anticipation copy, no progress bar/countdown/shame, Start Workout primary; O-3 authority citation marked superseded. v1.5, 2026-07-08: W-1 Workouts Hub retired, Workouts tab root → W-2. Prior — 2026-07-07: Tier 6 — Explore Communities Module, added 2026-07-02, is **retired** — Communities was promoted to its own bottom-navigation tab, `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`; H-1 reverts to its 5-tier model and the Tab Bar now correctly shows 5 tabs including Communities. Prior note: v1.2 added the Homepage Principle digital inscription as a fixed, non-tiered element between the Chapter Card and the Program Card)
- [x] **Homepage Principles Architecture** — LOCKED v1.0, new this session (governing). The Homepage Principle is a **digital inscription, not a motivational widget** — quiet reflection, not motivation; deterministic per-athlete daily rotation with a 14-day no-repeat window; never AI-generated at runtime (HP-D11); states no fixed library count of its own so it cannot go stale (HP-D10)
- [x] **Homepage Principles Library** — LOCKED v1.0, new this session (canonical content; single source of truth for all library counts; imported verbatim from the approved design session, organized by type — Principles / Reflection Questions)

### Workout (Logger + Active)
- [x] **Workouts Hub (W1)** — LOCKED
- [x] **Activity Type Picker (W8)** — Lock-Ready
- [x] **Active Workout Flow (W9–W16)** — LOCKED
- [x] **Workout Summary (W17)** — LOCKED
- [~] **Activity History (W18)** — **LOCK CANDIDATE** (not yet LOCKED — corrected 2026-07-09; previously mislisted here as LOCKED. The doc's own header reads LOCK CANDIDATE, and its authority citation "Navigated from: W-1 Workouts Hub" is stale since W-1's retirement 2026-07-08 — see Decision Queue #16)
- [~] **Activity Detail (W19)** — **LOCK CANDIDATE** (not yet LOCKED — blocked on W-18 above, since W-19's own authority line cites "W-18 v1.0 (LOCKED)"; cannot legitimately lock until W-18's entry-point citation is reconciled — see Decision Queue #16)
- [x] **Standalone Rest Timer** — `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); 22 RT-D decisions; ProgressRing component contract owned; state machine/background/persistence/accessibility/future platform surfaces defined; closes Architecture Freeze Row 19 and Decision Queue #4

### Programs / Builder
- [x] **Program Browse / Detail / Create / Fork (W2–W5)** — LOCKED
- [x] **Workout Builder (W24)** — LOCKED
- [x] **Free Workout Builder (W25)** — LOCKED
- [x] **Workout Templates Hub/Detail (W26/W27)** — LOCKED

### Program Catalog (architecture)
- [x] **Program Catalog Architecture** — LOCKED
- [x] **Program Ecosystem Architecture** — LOCKED
- [x] **Program Authoring/Production Standard** — LOCKED
- [~] **Family Research + Blueprints (Stage 1)** — 6 families researched, Blueprints LOCKED

### Exercise Library (architecture)
- [x] **Exercise Library Architecture** — LOCKED **v1.2** (this session: adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group)
- [x] **Custom Exercise (Exercise-001 / W-28)** — LOCKED
- [x] **Substitution (Exercise-002)** — LOCKED
- [x] **Favorites (Exercise-003)** — LOCKED
- [x] **Library Wireframes (W21/W22/W23)** — LOCKED
- [x] **Exercise Media Architecture** — LOCKED, new this session (`Exercise-Media-Architecture-v1.0.md`) — adds `muscleTargetImageUrl` field + production standards for all 5 media/anatomy fields (incl. mandatory neutral-stance loop start/end rule and mandatory fixed-template muscle-image consistency rule); reconciled into Exercise-Library-Architecture (→ v1.2), W-22 (→ v1.0 R2, new §6.3a/§6.3b within the Identity block), Exercise-001 (→ v1.0 Media Field Reconciliation), W-28 (→ v1.0 Media Field Reconciliation), Anchor Authoring Framework (→ v1.0 Media Cross-Reference). Standards only — zero exercises have media produced.

### Calendar
- [x] **Calendar System Architecture** — LOCKED

### Goals
- [x] **Goal Hub / Detail / Create-Edit (G1/G2/G3)** — LOCKED (G-1 → **v1.2**, 2026-07-10: corrected stale "post-MVP" G-2/G-3 references — both are actually LOCKED/MVP; Architecture Risk 1 [L-7/L-8 naming] and Risk 4 [achievement trigger] marked resolved; flagged the W-1 entry point as retired with no replacement decided — see Decision Queue #16)

### Chapters / Legacy
- [x] **Legacy Hub (L1)** — LOCKED **v1.1** (2026-07-02: adds §8a Transformation Gallery entry point; corrects a stale "Legacy (5th tab)" header line to the confirmed 4-tab model)
- [x] **Legacy Timeline (L2)** — LOCKED
- [x] **Chapter Detail / Creation / Reflection (L3–L6)** — LOCKED
- [x] **Accomplishments (L12–L14)** — LOCKED
- [x] **Photos (L15/L16)** — LOCKED (2026-07-02: cross-reference note added, differentiating from the new Transformation Gallery — no rule changed)
- [x] **Honor Detail Sheet (L11)** — LOCKED
- [x] **Transformation Gallery (L17/L18)** — LOCKED, new 2026-07-02 — `Transformation-Gallery-Architecture-v1.0.md` + `Transformation-Gallery-Wireframe-Spec-L17-L18.md`; chapter-organized, chronological photo/video archive of physical transformation; stakeholder-directed addition, no social/comparison mechanics; 3 non-blocking open items (monetization limit, chapter-cover-media display integration, in-progress-original delete policy) — see Decision Queue

### Honors (architecture)
- [x] **Honor Catalog v1.5** — LOCKED (this session: reconciled two previously-parallel, never-merged lineages — the locked v1.4 catalog and six unmerged Expansion Pass documents — into one V1 architecture; merged Strength depth [Overhead Press, Pull-Up], Training/Chapters/Goals/Programs/Longevity depth, Endurance [Running/Walking/Cycling/Swimming only], Consistency, and Prestige; added a new Hidden category; fixed a recurring family-count arithmetic error; 167 types / 13 categories / 34 families. Two new Strength families [Sex-Specific Milestones, Relative Strength Milestones, 24 types] were fully designed and then deferred to V2 by PO decision before final lock — preserved in full in § DEFERRED TO V2. 18 honors separately, genuinely deferred — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR — see `Honors-Architecture-V1-Final-v1.0.md` §9)
- [x] **Honor Evaluation Service Architecture v1.1** — LOCKED (new pipeline step [4.5] for Prestige; 6 new evaluator families; PR storage extended to 5 lifts; `cumulativeActiveWeeks` statistic added)
- [x] **HonorInstance Architecture v1.1** — LOCKED (metadata definitions for 4 new honor families merged in V1; Sex-Specific/Relative Strength metadata shapes designed and deferred to V2 alongside their honor families)
- [x] **Honors-Architecture-V1-Final-v1.0** — LOCKED, new this session — master synthesis/reconciliation document
- [x] **Honors-Authoring-Standards-v1.0** — LOCKED, new this session — defines the "Real Athlete Test" (6-item QC checklist) governing all future Honor authoring, including the still-pending full-descriptive-content pass for the 109 new honor types
- [x] **L-10 fallback for honors outside its category list** — ✅ resolved this session — L-10 was discovered stale even before this pass (still showed 7 categories / 53 types despite the catalog already being at 82/10 since last session); now reflects the full current 13-category / 167-type list. Pre-existing, separate staleness in §3's ASCII mockup and §7.2's per-category sort-order subsections (never backfilled for Partnership/Competition/Communities/Squad) remains open — flagged, not fixed this pass.

### Rank System
- [x] **Rank System Architecture** — LOCKED
- [x] **Rank Computation Model** — LOCKED v1.0.1 (Amendment 001 + TBD-11 formal closure) — all 16 TBDs resolved/closed
- [x] **Rank Calibration Decisions** — LOCKED (Q1–Q14 resolved)
- [x] **Rank Implementation Readiness Review** — superseded; all 8 originally-identified blockers since resolved (banner added)

### Social / Friends
- [x] **Social System Architecture (governing)** — LOCKED **v1.1** (Communities added as a peer relationship layer + Post audience extension, this session)
- [x] **Friend Relationship Architecture (+Amend 001)** — LOCKED
- [x] **Workout With Friend (WwF), Partner Select (W20), Train Together (S10)** — LOCKED
- [x] **Workout Share Result (WSR-001) + Share Card / SH1** — LOCKED

### Squads
- [x] **Squads Hub / Detail / Permissions (S1 v1.6 / S2 v1.6 / S3 v1.3)** — LOCKED (2026-07-07: S1 → v1.6, retires Tier 3 — Explore Communities secondary entry point [added 2026-07-02] now that Communities is its own bottom-navigation tab, per `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`)
- [x] **`Squad-System-Architecture-v1.0`** — LOCKED, new this session (governing). Locks Squad Goals, Missions, daily Check-ins (+ optional video), Squad Streak, Squad Momentum, Weekly Summary, Squad Feed, Squad Honors (new `SQUAD` Honor Catalog category, 15 types), inline Competition standings, Analytics, and Commitment. **Deliberately lifts the Performance Firewall for Squad-internal surfaces only** — Friends Feed/Communities/Calendar Firewall is unchanged.
- [x] **Squad amendments (Challenge surfaces, Champions Firewall)** — LOCKED, **superseded for Squad-internal surfaces** by `Squad-System-Architecture-v1.0` (banner added to both amendment files; the challenge-creator-is-challenge-scoped rule is reinforced, not superseded)

### Communities (architecture) — new this session
- [x] **Community System Architecture** — LOCKED (governing; fourth relationship pillar)
- [x] **Community Feed Specification** — LOCKED
- [x] **Community Discovery and Search** — LOCKED (community-scoped only; does not close the project's separate Global Search gap, Decision Queue #3)
- [x] **Community Roles and Moderation** — LOCKED
- [x] **Navigation entry points finalized (2026-07-02), then reversed (2026-07-07)** — `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (LOCKED) originally named Home's Communities entry point "Explore Communities" (H-1 Tier 6, primary) and gave Squads a secondary "Explore Communities" entry point (S-1 Tier 3), reaffirming COM-D18's "not a 5th tab" position. **`Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (LOCKED, 2026-07-07) reverses this**: Communities is designed as a high-frequency, checked-daily feed (Facebook-Group-like) rather than an occasional directory, so it was promoted to the **5th bottom-navigation tab**; both the Home and Squads entry points are retired as redundant. `Community-System-Architecture-v1.0` COM-D18 rewritten accordingly (→ v1.1).
- [~] **Platform-wide moderation escalation + AI moderation** — explicitly acknowledged as not built, not silently omitted (see Decision Queue #9)
- [ ] **Community Hub pixel wireframe** — still not authored (architecture-only); tracked as an open item by the navigation amendment above, not newly discovered
- [ ] **Community wireframes (pixel layout)** — not yet authored; architecture-only in this pass

### Competitions / Challenges
- [x] **Challenge System Architecture v1.5 + C1–C7** — LOCKED (this session: v1.5 narrows the Firewall, CS-D2/CS-D22, for SQUAD-context challenges only — standings now render inline on the owning squad's own S-2 Competitions section; FRIENDS/COMMUNITY contexts unaffected)
- [x] **Challenge amendments 002/003 (Friend Challenges) + 004 (Community Competitions)** — LOCKED (third `COMMUNITY` roster context added, reusing the existing engine — no parallel competition architecture, per `Community-System-Architecture-v1.0` COM-D10)
- [x] **Challenge filename/version consistency** — ✅ reconciled 2026-06-30: filename `v1.0` is the initial-publication convention (same as Exercise-Library-Architecture, Social-System-Architecture, etc.); internal header and Amendment Log track current version (v1.5); versioning note added to the doc; all C-series and cross-doc authority references updated to `v1.0.md (v1.5)`

### Notifications
- [x] **P-5 Notifications (Arch + Wireframe)** — LOCKED **v1.5** (2026-08-14: **Section F — Training** merged from `P-5-Amendment-003-Training-Briefing.md` — the Morning Briefing, **the first category in P-5 whose trigger names no person**, default OFF; §3.2e records the five conditions bounding the narrowing of §1's "no re-engagement notification" finding. Amendment **merged into the parent the same day it locked**, deliberately — "locked but never applied" is this project's recurring documentation failure. v1.4: Squad Feed Activity / Squad Reactions & Mentions relabeled + scope-expanded, new Squad Goal & Mission Updates toggle per `Squad-System-Architecture-v1.0` SQ-D12)
- [x] **Push delivery BUILT (2026-08-07, migration 0120)** — `expo-notifications`, `push_tokens`, `push_outbox`, six enqueue triggers over the parameterised `notification_events_for(p_user)`, and a `pg_cron`+`pg_net` sender. **Preferences are now honoured by a real sender** for five kinds: `squad_activity` · `friend_requests` · `workout_tags` · `program_shares` · `challenge_updates`. ⏳ migration not yet applied; needs a new iOS build (native change, no OTA)
- [x] **⛔ Ceremony toggles removed** — Goal Completed / Honor Earned / Chapter Sealed / Rank Up deleted from the P-5 screen, enforcing the LOCKED §1 rule that ceremonies never push. The design file (`Forge Notifications.dc.html`) shipped them; they had no event source and could never fire. **PD-7 not applied here by PO decision — the doc governs**
- [~] **Four toggles remain with no emitter** — `squad_feed`, `squad_reactions`, `squad_goals`, `squad_invites` are locked by P-5 §3.1/§3.2 but no branch of `notification_events_for` produces them, so they persist intent only. Not a defect; recorded so it is not mistaken for one
- [~] **P-5 Wireframe Spec lags the Architecture** — ⚠️ discovered during this session's reconciliation: the wireframe was never updated for the Architecture's Sections C (Challenges)/D (Friend Requests)/E (Communities); flagged in the wireframe's §11, not resolved this session (see Decision Queue)

### Settings (P-4–P-9)
- [⛔] **P-4 Settings Root** — **DISSOLVED 2026-07-20** (`P-1-Dissolution-Amendment.md`) — merged into **Account Settings**; the design's own `Forge Settings Root.dc.html` redirects on mount
- [x] **P-5 / P-6 / P-8 / P-9** — LOCKED (parent re-pointed from P-4 → **Account Settings**)
- [ ] **Account Settings** — the settings home; ⚠️ **no architecture doc exists** (design-layer only). Absorbs P-1's identity header + the P-4 category map / Sign Out / legal / version
- [ ] **Preferences (P-4b)** — design-layer screen with no P-4 doc coverage
- [~] **P-4 body text "Account/Auth doesn't exist"** — ⚠️ cosmetic stale text (moot — screen dissolved)

### Modals / Ceremonies (M-series)
- [x] **M-1 Rank-Up, M-2 Honor-Earned, M-3 Goal-Achieved, M-4 Program-Graduated** — LOCKED
- [x] **M-5 Chapter Sealing, M-6 Destructive Confirm, M-7 Premium Upsell** — LOCKED

### Profile / Progress
- [⛔] **P-1 Profile** — **DISSOLVED 2026-07-20** (`P-1-Dissolution-Amendment.md`) — no Profile modal, tab or route exists in the design. Record content → **Legacy** (Pinned Legacy already built there); identity/admin content → **Account Settings**. Spec RETAINED as content authority (§4A Pinned Legacy, P-1.1 Edit Profile)
- [ ] **5 orphaned P-1 items** — @username · Athlete Type · "Forging since" · **P-1.1 Edit Profile** · **+ Add Accomplishment** (L-14 currently unreachable). Dispositions locked by the amendment; build debt
- [ ] **My Standard / Trophy Case** — built on Legacy, present in **NO spec** (L-1 or P-1). Undocumented design additions; need spec coverage
- [x] **P-2 Progress Hub (Arch + Spec)** — LOCKED
- [x] **P-3 Rank Detail** — **RETIRED** (intentional)

### Cross-cutting / Monetization
- [x] **Monetization Amendment 001 (+ Amendment 002, Communities)** — LOCKED (this session: Free = 1 community membership / Premium = unlimited, flagged provisional; community ownership capped 1-per-athlete-all-tiers as a non-monetized constraint)
- [x] **Critical Decisions Amendment 001** — LOCKED
- [x] **Environment Tags MVP Amendment** — LOCKED

### Global Search (architecture) — new this session
- [x] **Global Search Architecture** — ✅ `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30) — Catalog Search (Exercises/Programs/HonorType catalog, client-filterable) and Discovery Search (Profiles/Communities, server-indexed) as independent categories with strict exclusivity; Never-Searchable list (Posts/WorkoutSessions/HonorInstances/Challenge standings/private chapters/memories/accomplishments/rest timer history); Performance Firewall principle extended by analogy; 5-entity privacy filter model (ownership, delegation, discoverability flag); canonical-screen navigation rule; entry-point deferred to future wireframe spec; full reconciliation with `Backend-Data-Model-Architecture-v1.0.1` §14 and `Community-Discovery-and-Search-v1.0` §6

### Infrastructure architecture
- [x] **App-wide Data-Model / Backend / Persistence Architecture** — ✅ `Backend-Data-Model-Architecture-v1.0.1` LOCKED (2026-06-30)
- [x] **Global Search spec** — ✅ `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30) — see Global Search subsection above
- [x] **Component-Library / Design-System spec** — ✅ `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30)
- [x] **Forge Design System Architecture (engineering governance)** — ✅ `Forge-Design-System-Architecture-v1.0.md` LOCKED (2026-07-01) — permanent engineering authority governing how component libraries are structured, implemented, validated, and maintained; 16 sections covering design philosophy, 4-level component hierarchy, repository layout, component rules, token rules, naming standards, state/accessibility standards, composition rules, export contracts, validation workflow, and verification checklist; covers all current (Button/Input/Card v1.0) and future libraries; supersedes any informal per-library conventions; companion to `Component-Library-Architecture-v1.0.md` (behavioral contracts) and `Forge-Legacy-Design-System-v1.0.md` (visual identity)
- [ ] **`.docx` → app-data conversion approach** — ❌
- [ ] **Navigation / Routing spec (standalone)** — 🚧 in PRD only
- [~] **Search / Indexing data model** — 🟡 behavioral authority LOCKED (`Global-Search-Architecture-v1.0`); Backend §14 (`Backend-Data-Model-Architecture-v1.0.1`) names the indexable fields and flags Algolia/Typesense sidecar as candidate without selecting one; index technology not yet selected

---

## 📦 Content Status (authored content, not architecture)

Architecture for these is LOCKED; the rows below track **authored content volume**.

| Content Stream | Authored | Target | % | Note |
|---|---:|---:|---:|---|
| **Program Packages (as data)** | **2** | 24 | **~8%** | ⚠ **The single largest content gap.** Strength Foundation I (3-day) + II (4-day) generated to `ProgramDefinition` JSON. The `.docx` source set is broader, but only these two are LOCKED and generated |
| **Program Family Coverage** | 1 | 9 | ~11% | 8 empty folders: Bodyweight, Combat, Conditioning, Cycling, Full Body & Home, Hybrid, Muscle Building, Running |
| **Family Research + Blueprints** | 6 families | 6 | ~100% | Stage-1 research + Blueprints LOCKED |
| **Exercise Catalog (as data)** | **797** | 797 | **100%** | Catalog complete. Long cited as 794 — corrected 2026-08-01 |
| **Exercise Coaching Content** | **735 Published · 62 Needs Review** | 797 | **92%** | Human Approve/Publish gate; 735 carry `approvedBy`. Previously dashboarded as "0 active", which was wrong |
| **Exercise Media** | **wiring BUILT · file count UNVERIFIED** | 797 | — | ⚠ **This row said "0 / 0% / production unstarted" and that was wrong about the code.** `src/domain/exercise-detail/media.ts` is the one id→URL resolver for the `exercise-media` bucket (`loop/<sex>/<id>.webp`, `poster/<sex>/<id>.webp`) and is wired into the detail and list surfaces; a missing poster is an ordinary fallback state, not a break. What is genuinely unknown is how many files the bucket holds — one report says ~703 loops + 703 posters were uploaded. **Settle it before quoting a number:** `select count(*) filter (where name like 'loop/%') as loops, count(*) filter (where name like 'poster/%') as posters from storage.objects where bucket_id = 'exercise-media';` Standards: `Exercise-Media-Architecture-v1.0` |
| **Honors (as data)** | **139 awardable rows** | — | ✅ | `honor_catalog` TABLE + one table-driven evaluator (0077–0083). Most new honors are ROWS, not code. Previously dashboarded as "0 / 167", which predated the build |
| **Badge / Honor Artwork** | 7 rank-family badge sets | 81+ | ~9% | Rank badges shipped and wired; honor medallions still 0 |
| **Transformation Gallery (as data)** | live feature, athlete-authored | — | ✅ | Built (L-17, migration 0044); volume is per-athlete, not an authoring target |

**Content roll-up:** no longer one number — the old "~12% overall" was wrong in both directions. **Coaching content is 92% published and honors are real data**; **programs (7 of 24) and exercise media (0 of 797) are the actual gap.** Averaging those into a single percentage is what let the coaching work stay invisible on this board for weeks. Documentation completeness and content volume remain independent axes.

---

## 🏗️ Implementation Status (actual repository state)

Everything below reflects the **live `src/` tree and git history**, not specs.

| Layer | Status | Evidence |
|---|---|---|
| **Frontend** | 🟢 **Built and backend-wired** | `src/` = **430 TS/TSX (40 test files) · 87,450 LOC**; **72 screens**, 71 reading real Supabase. 150 components · 68 domain modules · 39 data modules |
| **Backend** | 🟢 Supabase (Postgres + RLS) | **97 migrations** (`0001`–`0098`), all applied. 74 SQL functions; business logic lives in RPCs (`save_workout` · `evaluate_honors` · `athlete_profile` · `challenge_*` · `squad_*`) |
| **Database** | 🟢 Live | Supabase Postgres. **RLS enabled on all 35 tables, every one with ≥1 policy.** 52/52 `SECURITY DEFINER` functions pin `search_path` — audited 2026-08-01 |
| **Authentication** | 🟢 Live + **guarded by declaration** | Supabase Auth + `/sign-in` + `/onboarding`; `handle_new_user()` mints the profile. **2026-08-01: 17 screens were outside the `Stack.Protected` guard** — in expo-router a route is gated by being DECLARED, not by existing. Closed, with `route-guard.test.mjs` deriving the screen list from the filesystem so it cannot regress |
| **Navigation** | 🟢 Product IA, real data | Root `Stack` over a 4-tab `(tabs)` group (Home · Workouts · Legacy · Squads). Community shelved to `src/deferred/`; Post Detail joined it 2026-08-01 (see Frontend note on bundling) |
| **Components** | 🟡 **LEGACY / REFERENCE** (2026-07-02) | 6 committed libraries remain reference-only; **no deletion until the new system locks** — this is a standing decision, and the 2026-08-01 audit deferred a duplicate-component cleanup because of it |
| **State Management** | 🟡 Context providers (in-memory) | React context: `useWorkoutSession`, `Ceremony`, `Tour`, `Profile`, `Units` |
| **Testing** | 🟢 Active | `node --test` — **695 tests / 49 files, all green**; gates every unit alongside `tsc` 0 and a clean web export |
| **Deployment / CI** | 🟢 Web preview live | `npx expo export --platform web` + `npx eas-cli deploy --prod` → forgelegacy.expo.app. Entry bundle 11.11 MB; **contains no fabricated athlete identity** (verified by grep after rebuild, 2026-08-01) |

**Git:** **210 commits**, HEAD `d5a0db3` on `feat/home-onramp`. The 2026-08-01 audit + correction pass is `8179a10` (chapter honor tally), `e6fc901` (auth guard, silent failures, dead code), `d5a0db3` (fabricated identity out of the production bundle).

**Design-handoff build-out commits (2026-07-14):** on `main` — `b969603` earlier-session Home-v2 foundation (prereq), `bf1299d` Phase 0 data model, `ff5965b` Phase 1 resolver, `76d1cfd` `.docx`→program-data conversion (#6), `3e3d598` Phase 2 Home core, `6274bf5` earlier-session app shell (prereq), `a559464` **STEP B** 5-tab nav, `0ef9208` **STEP C** full-screen Home match (ChapterTitleBlock/YourCircleCard/QuickActionsRow; retired MissionCard/TrainTogetherCard/HomepagePrinciple to legacy), `e839016` **STEP D · Workouts** (W-2 Program Browse — My Programs + Discover from the real catalog; added optional `durationWeeks`/`frequencyPerWeek` to the runtime `Program`, additive from the definition), `603908b` **STEP D · Legacy** (rebuilt on foundation to `Forge Legacy.dc.html` — the 12 old `legacy-theme` `components/legacy/*` bannered legacy; added placeholder `standard` creed to `LegacyData`; fixed the pre-existing ChapterHistorySection eslint errors), `3f45859` **STEP D · Squads** (S-1 Squads Hub, placeholder), `575c0d0` **STEP D · Community** (Community Home, 5th tab, placeholder), `d5aeac0` **Rank badge import** (verified handoff mapping → `assets/artwork/ranks/`, **32 badges**, 7 families × 4 levels, Established sex-specific; new `src/domain/rank-artwork/` resolver + generated registry + 7-case coverage test; **wired the Home ChapterTitleBlock medallion + Legacy hero seal** to the real badge with graceful fallback — TIER still `PLACEHOLDER_RANK` = Foundation III, no rank backend). **STEP D Phase 3 — all 5 tab screens DONE.** Remaining design-handoff work: **Phase 4** (high-res workout-artwork masters + the real neutral set), gated on those assets; plus deeper sub-screens (Program/Squad/Chapter/Post detail, the deferred bottom sheets). Social screens (Legacy/Squads/Community) are placeholder-only — no social/chapter/goal backend; rank ART now imported but rank EVALUATION (RCM→athlete) is still unbuilt. tsc 0 / eslint clean (own surface) / **143 tests** at each gate.

**Ceremony / Share / Post chunk (2026-07-14):** on `main` — `0e4545d` **① overlay foundation** (Modal · Toast · Insignia composites + `domain/ceremony` locked-order queue + `CeremonyProvider`/`useToast` + a flagged DEV-ONLY `/ceremony-harness`; +5 queue-order tests → **148 tests**), `b0b2f40` **② M-1–M-7** (EXACT locked spec copy; M-1/2/3/4/7 ceremony Modals + M-5/M-6 as a reusable `ConfirmSheet` BottomSheet — reconciled overlay system over the specs' older "centered Modal"), `ef4a411` **③ SH-1 Share Configuration** (`domain/share` + `ShareCard` renderer + `ShareSheet` + `ShareProvider`/`useShareSheet`; the M-1/2/3/4 "Share …" secondaries wired to `openShare`), `8311802` **④ Post Detail shell** (`src/app/post/[id].tsx` read-only full-screen keepsake reusing ShareCard + SH-1; `getPost` demo fixture; `PostDetailActions` seam). **Deferred (flagged in-code):** real ceremony TRIGGERS (no rank/honor/goal/program evaluator — dev harness stands in); in-Forge share destinations + share IMAGE capture (external share carries the text snippet); a true no-tab-bar Full-Screen presentation (needs a root Stack — the app is expo-router/ui Tabs-only). Honor/goal/program ceremony marks are pending-asset Insignia placeholders; rank ceremonies show the real imported badge.

**Workout-art cutouts remain PINNED** (see open-items #4) — bake abandoned; the app masters are a dark slate where figure ≈ background in both luminance and color, so no local transform separates them. Awaiting true-transparent-background masters at source.

**Design-handoff build-out — open items (flagged 2026-07-14, non-blocking):**
1. **Pre-existing repo-wide ESLint errors (3), not ours** — `src/components/legacy/ChapterHistorySection.tsx` (×2, `react/no-unescaped-entities`) and `src/hooks/use-color-scheme.web.ts` (`react-hooks/set-state-in-effect`). Both live in earlier-committed files (the app-shell prereq), not in any design-handoff changeset. Left as-is; fix opportunistically (ChapterHistorySection is in `components/legacy/*`, which the Legacy screen will reuse).
2. **Pending data-model item — per-program `equipment`** — the Programs Catalog **Filters** sheet (Equipment / Home-Gym matching) needs an `equipment` field the runtime `Program` does not carry. **Deliberately NOT added speculatively**; add it (and the Filters sheet + the other two Start-Training / Train-with-others sheets) when Filters is actually built. Until then the Workouts screen ships without the three bottom sheets.
3. **Intentional divergence from the dc — Community AppBar** — `Community Home.dc.html` opens on a bar-less full-bleed banner with floating buttons; the shipped Community screen (`575c0d0`) instead adds an `AppBar` (title "Community" + Discover/Notifications actions + self avatar) so tab-root nav is consistent with Home/Workouts/Legacy/Squads (the banner sits below). This is the one deliberate departure from "screens win, never drift to the blueprint" — documented in-code; revisit if a bar-less community shell is preferred.
4. **Workout-art cutouts PINNED (2026-07-14)** — all four workout-art collections (`training-splits`, `workout-modalities`, `program-themes`, `exercise-families`, male+female) stay on the committed **mask-hack** render (`TodaysWorkoutCard`: opacity + LinearGradient edge-fade → faint watermark, no black box). The transparent-cutout swap is **pinned pending artwork regeneration with transparent backgrounds at source — NOT post-processable**: the exported PNGs on disk are a uniform dark slate where the figure body matches the background in both luminance (~20) and color (95–96% of pixels within color-distance 18 of the bg), so neither a luminance threshold nor a color key can separate a figure that isn't in the bytes (only a ~2–4% bright rim survives). The design tool's true-black masters have the full figure, but the file transport keeps flattening alpha (and the background to slate) in transit. Reopen when true-transparent-background masters land at source; then `TodaysWorkoutCard` drops the mask → renders the cutout at ~0.72.

**Build-from-history note (expo-env.d.ts):** the committed source builds standalone (verified: worktree tsc on committed HEAD = 0 errors). A *bare* checkout shows ~2 CSS-module errors (`*.module.css`, `@/global.css`) ONLY because Expo's `expo-env.d.ts` (its `expo/types` reference, which declares those CSS modules) is **gitignored + generated** — regenerated by `expo start` on any checkout, correctly not committed. `6274bf5`'s message ("tsc = 0 errors") is accurate by that Expo convention.

---

## 🧠 Decision Queue (unresolved architectural decisions)

Open decisions blocking progress. **Remove a row only when the decision is resolved** (then log it in § Recently Completed).

| # | Decision | Why it's blocking | Owner action needed |
|---|---|---|---|
| ~~1~~ | ~~**Backend / Data Model / Persistence**~~ | ~~Universal blocker~~ | **RESOLVED — `Backend-Data-Model-Architecture-v1.0.1` LOCKED 2026-06-30. Firebase stack ratified.** |
| ~~2~~ | ~~**Rank Readiness**~~ | ~~Rank is build-blocked; evaluation-service, data model, trigger events, "meaningful-work" floor are TBDs~~ | **RESOLVED — Architecture Freeze row 15 ✅ Complete 2026-06-30. All 16 TBDs closed in locked RCM v1.0.1 + Calibration Decisions. No build blockers remain.** |
| ~~3~~ | ~~**Global Search Architecture**~~ | ~~No search surface or index model defined~~ | **RESOLVED — `Global-Search-Architecture-v1.0.md` LOCKED 2026-06-30. Catalog Search / Discovery Search categories defined; Never-Searchable list locked; full Backend §14 + Community-Discovery §6 reconciliation complete.** |
| ~~4~~ | ~~**Standalone Rest Timer**~~ | ~~Behavior trapped inside W9–W16, no reusable contract~~ | **RESOLVED — `Rest-Timer-Architecture-v1.0.md` LOCKED 2026-06-30. 22 decisions (RT-D1–RT-D22). ProgressRing component owned. Architecture Freeze row 19 ✅ Complete.** |
| ~~5~~ | ~~**Component Library / Design System**~~ | ~~No component contract → inconsistent build later~~ | **RESOLVED — `Component-Library-Architecture-v1.0.md` LOCKED 2026-06-30. 3-tier hierarchy, 37 components (CLA-C01–C37), 6 governing principles, 20 decisions. Architecture Freeze Row 18 ✅ Complete.** |
| 6 | **`.docx` → app-data conversion** | Programs authored as Word prose (`Programs/*.docx`, authoritative content); no path to structured data. **Now a concrete blocker for Design-Handoff Phase 2 (Home):** the artwork resolver needs real per-program `modality`/`split`/`structure`/`theme` (Phase 0/1 built the types + resolver against a labeled placeholder). **PO directive (2026-07-13):** conversion is its own task run AFTER Phase 1 / BEFORE Phase 2, **non-destructive** (GENERATE structured records from the `.docx`; never edit/delete the `.docx`), must **show how each of modality/split/structure/theme is derived per program and flag any it can't determine for manual assignment** (never silently guess — wrong theme/split → wrong artwork), and requires an **approved conversion plan first**. **PARTIALLY RESOLVED 2026-07-14:** the 2 LOCKED programs (Strength Foundation I 3-day, II 4-day) are converted, validated, and promoted (Home reads real data; placeholder deleted). See Recently Completed #1. | **Remaining:** (a) PO to supply the correct **Foundation II (3-day)** spec (current file is mislabeled research); (b) convert **Foundation I (4-day)** once it moves DRAFT→LOCKED; (c) author + convert the other 5 families (all empty). Reusable pipeline lives in `src/domain/training/ingest/` |
| 7 | **Honors runtime/UX docs stale against the v1.4 catalog** | A full Honors audit (2026-06-29) confirmed `Honors-Spec-L10.md`, `HonorInstance-Architecture-v1.0.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Honor-Detail-Sheet-Spec-L11.md`, and `Honor-Earned-Modal-Spec-M2.md` are all still written against the 53-type/7-category baseline — none reflect Competition (v1.1), Communities/Partnership-rename (v1.3), or Squad (v1.4). L-10 has no display-category fallback for 29 of the 82 LOCKED honor types. The audit also found a separate, never-merged "Expansion Pass" draft track (53→150 honors, unrelated growth path) sitting alongside the LOCKED catalog. Full roadmap (Phase 0–6) recorded in memory (`project_honors_expansion_audit`); not yet executed against any `Docs/` file. | Run the Phase 0 reconciliation pass (update all 5 docs for the 82-type/10-category catalog) before any further Honors authoring — PO has explicitly sequenced authoring behind this |
| 8 | **Canonical PRD** | Two PRD files coexist | Decide which is canonical, cross-link the other |
| 9 | **Community platform-level moderation escalation + AI moderation** | `Community-Roles-and-Moderation-v1.0` CRM-D6 explicitly builds only a self-moderation model (reports route to each community's own Owner/Admin/Moderator); there is no Forge-staff appeal path if a community's own moderators are unresponsive or complicit, and no AI moderation exists (explicit V1 exclusion) | Decide whether/when to design a platform-level escalation path; until then this is an acknowledged, not a silent, gap |
| 10 | **P-5 Notifications Wireframe drift** | The wireframe spec was never updated alongside the Architecture's Sections C (Challenges)/D (Friend Requests)/E (Communities) — discovered during this session's Squad reconciliation, flagged in the wireframe's §11, not resolved | Run a P-5 wireframe reconciliation pass covering Sections C/D/E (and the new Squad Section A rows are already current as of this session) |
| 11 | **Exercise Library data completeness** | `primaryMuscles`/`secondaryMuscles` assigned for all 195 rows (Phase 2 complete); `difficulty` assigned for all 195 rows (Phase 3 complete); media production standards defined (`Exercise-Media-Architecture-v1.0.md`, Phase 4, 2026-06-29) — adds a 5th field, `muscleTargetImageUrl`, as a new "Exercise Anatomy" schema group separate from the existing Media block (FORGE-required, CUSTOM-optional), plus production standards for all 5 fields (incl. a mandatory neutral-stance loop start/end rule for animations and a mandatory fixed-model/pose/camera consistency rule for muscle target images) and a collision-proof uuid-keyed naming convention; **actual media production (all 5 fields, all 195 exercises) remains entirely unstarted** — 0 of 195 rows have any media/anatomy field populated; 4 exercises use closest-available muscle enum by intentional V1 design (Adductor Machine/Butterfly Stretch → `HIP_FLEXORS`; Neck Mobility Flow → `SHOULDERS`; Lacrosse Ball Foot Release → `CALVES` — V1 does not distinguish adductors, cervical musculature, or intrinsic foot musculature, PO decision 2026-06-29); **naming-duplicate pairs resolved (Phase 5, 2026-06-30) — 0 remaining**, see `Exercise-Naming-Standard-v1.0.md`; one follow-up remains — the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" and needs a binary-file content correction; no row can flip `isActive: true` until media is also produced | Run media production pass against the Exercise-Media-Architecture-v1.0.md standard; correct the Strength Foundation II (4-Day) `.docx` "Step-Up" → "Box Step-Up" content before any exercise goes active |
| 12 | **"Strength Standard" sex-specific Honor selector — parked** | PO approved both absolute and relative-strength milestone systems for Honors (2026-06-29) but explicitly held open whether absolute Strength milestones should differentiate by sex, pending a separate, broader product decision: whether Forge collects a sex field anywhere else in the product. If one emerges naturally elsewhere, Honors should reuse it rather than add an Honors-only field. | Decide whether/where Forge collects a sex field at the product level; only then revisit this Honors-specific question |
| 13 | **New Claude Design visual system → component library replacement sequencing** | The 6 committed Forge component libraries (62 components) were reclassified LEGACY/REFERENCE 2026-07-02 pending a from-scratch visual rebuild in Claude Design. No replacement order, approval gate, or per-library migration checklist has been decided yet, and no destructive cleanup may happen until each replacement is implemented and verified. | Once the new Claude Design system is locked, decide replacement order for the 6 legacy libraries and define the verification bar (visual + a11y + prop-contract parity) each replacement must clear before its legacy predecessor can be removed |
| 14 | **Transformation Gallery — ~~3~~ 2 non-blocking open items** *(item 1 CLOSED 2026-08-12)* | ✅ **(1) CLOSED — Gallery entries share the one account-wide photo counter, and that counter is 75, not 50.** `Monetization-Architecture-Amendment-003` **MA3-D8**: free photos 50 → 100 (2026-08-05) → **75**. The number is 6 poses × 12 monthly entries = 72, plus 3 spare — the cap now lands on *"a full year of progress photos, free"* instead of an arbitrary round number, and the paid moment it creates is Transformation Compare, which is most valuable exactly when a year of entries exists. **Two items remain open, which is why this row is not deleted.** Original text: `Transformation-Gallery-Architecture-v1.0.md` (new, 2026-07-02) carries three explicit open questions: ~~(1) whether entries share the existing 50-photo free-tier cap, get a separate cap, or are uncapped;~~ (2) whether "Chapter Cover Media" (`isChapterCover`, reserved field) should render on L-3/L-4/L-1 and how; (3) whether an original (pre-seal) entry should be deletable while its own chapter is still Active — the current wireframe spec takes the conservative "no delete" reading, matching the Photos precedent. None of these block the feature functioning as specced. | ~~PO/stakeholder direction on the monetization limit~~ ✅ **answered: shared counter, 75 (MA3-D8)**; a future reconciliation amendment for chapter-cover-media display; confirm or overturn the conservative delete-policy reading |
| **22** | **Pricing / SKUs / billing SDK / entitlement schema** *(new 2026-08-12)* | Monetization was **100% documentation** until this week: no entitlement field, no billing SDK, no P-8 screen, and the M-7 modal fired only from a dev harness. None of it was tracked as an open decision anywhere on this board, which is how the app came to ship a **false billing claim** (`settings/content.ts:150`, fixed in Phase A) with nothing behind it. **Now decided and locked, recorded here so the decisions are findable rather than buried in a plan file:** **(a) Structure** — Free + Premium + a **Coach AI add-on**, split on the line *your legacy is yours forever; the coach is a service*. `Monetization-Architecture-Amendment-003` (LOCKED) authorizes the add-on that Amendment 001 §4 forbade. **(b) SKUs — 6:** `premium_monthly_1299` · `premium_annual_9999` · `premium_lifetime_299` · `coach_ai_monthly_999` · `coach_ai_annual_8999` · `founder_lifetime_149` (first 100, then delisted). **No AI-inclusive lifetime at any price** (MA3-D1). **(c) Billing SDK — RevenueCat** (P8W-D10), resolving P-8 Architecture open question #1: concurrent entitlements, Restore Purchases and receipt validation in one dependency, free under $2.5k monthly tracked revenue. **⚠ New native dependency ⇒ new iOS build, not an OTA.** **(d) Entitlement schema** — migration `0145`, with **every cap and allowance as server-side config, never a constant in `src/`** (MA3-D16); board finding 07. **(e) Caps** — photos **75**, squads **1 free / 5 paid**, programs **3 lifetime incl. received**, templates 5, video 5 persistent, imports 1, Holt **1 program lifetime + 2 days/month + none in-workout**. | **Open, and these are the parts that are not yet decisions:** (1) **the age floor — 16+ or 18+** — must be set before any photo-AI feature ships, and it is the one item in the plan that could produce serious consequences rather than a fine; (2) **counsel review** of terms + privacy before money changes hands; (3) **trial length** — deferred until Phase-2 analytics exist, since 55% of trial cancels happen on day 0; (4) **every cap number is a guess** — set them from real usage at ~p50–p60 after the 20 testers run uncapped for 60–90 days with metering on |
| 15 | **Workout With Friend management queue + Import Training entry point — no reassigned home** | W-1's retirement (`Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, 2026-07-08) removed the only specced surface for (1) the WwF Claim/Dismiss/Approve/Decline management queue for pending M-8/M-9 items, and (2) the "Import Training" Secondary CTA (`Architecture-Amendment-001-Import.md`). Both explicitly acknowledged as open (WNA-D5), not silently dropped or silently given a guessed-at home. | Decide the new surface for each — candidates include H-1, W-2, or a notification-only surface for the WwF queue; W-2 or H-1 for Import Training — then author a follow-up amendment |
| 16 | **W-1 retirement's full downstream surface — ~25 documents not yet reconciled** | A post-retirement audit found W-1 is a load-bearing navigation target far beyond the 8 documents touched in the 2026-07-08 pass: the post-workout "Done" destination (`Workout-Summary-Spec-W17.md`), the Train Together stack-replace target (`Train-Together-Screen-S10.md`), the WwF notification system's canonical home (`Workout-With-Friend-Spec-WwF.md`, `Squads-Hub-Wireframe-Spec-S1.md`, `Squad-Detail-Wireframe-Spec-S2.md`, `Squad-Management-Permissions-Spec-S3.md`, `P-5-Notifications-Architecture.md` + Wireframe-Spec, `M-7-Premium-Upsell-Spec.md`), the back-stack root for `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md` (indirectly), `Exercise-Library-Wireframe-Spec-W21.md`, `Activity-Type-Picker-Spec-W8.md`, `Workout-Templates-Hub-Spec-W26.md`, `Workout-Builder-Wireframe-Spec-W24.md`; six Challenge-family tab-bar tables (`Challenge-Hub/Detail/Results-Wireframe-Spec-C1/C3/C4.md`, `Hall-of-Champions/Squad-Records/Current-Champions-Wireframe-Spec-C5/C6/C7.md`); Goal Hub's entry point and a pre-existing unresolved routing conflict (`Goal-Hub-Wireframe-Spec-G1.md`); `P-2-Progress-Hub-Architecture.md`/`Spec.md`'s CTA-destination table; and two other active LOCKED amendments that scope rules to W-1 by name (`Amendments/Program-Architecture-Amendment-001-Active-Program-Rule.md`, `Amendments/Monetization-Architecture-Amendment-001.md`). Several of these (the "Done" landing screen, the Train Together stack target) are genuine product decisions, not mechanical W-1→W-2 substitutions. **Concrete confirmed instance (2026-07-09):** `Activity-History-Wireframe-Spec-W18.md`'s own header is LOCK CANDIDATE, not LOCKED — the Documentation Status table previously misstated it as LOCKED; corrected. Because `Activity-Detail-Wireframe-Spec-W19.md` cites `W-18 v1.0 (LOCKED)` as its own authority, W-19 cannot legitimately be marked LOCKED until W-18's stale W-1 entry-point citation is reconciled — this is the actual, previously-undocumented reason W-19 remains a lock candidate, not merely an outstanding sign-off. **Second concrete confirmed instance (2026-07-10):** `Goal-Hub-Wireframe-Spec-G1.md`'s own §23 Conflict 1 already flagged the W-1 Chapter Context Card goal-tap routing as unresolved before retirement; retirement removed that entry point entirely with no replacement decided — corrected in G-1 → v1.2. Same pass also found and fixed an unrelated, longer-standing reconciliation-lag bug in G-1: it still read "post-MVP" throughout for G-2/G-3, even though both are authored and LOCKED (G-2's own spec already stated "G-2 is MVP" and flagged G-1 as needing correction, but this was never propagated back — the exact pattern this Decision Queue row and § Amendments Not Reconciled both describe). | Decide the actual replacement destinations for the ambiguous cases, then run a dedicated follow-up reconciliation pass across all ~25 documents |
| 17 | **"Squad Records" names two different screens** | The design's `Forge Squad Records.dc.html` is a TRAINING record book (heaviest lift, biggest session, longest run, most workouts/PRs per month). `Squad-Records-Wireframe-Spec-C6` + CS-D19 define C-6 as a COMPETITION record book over SQUAD-context `ChallengeResult` history (most challenge wins, consecutive wins, challenges entered, highest challenge score, most PR-challenge victories) — **zero overlap**, and C-6's entry point is the unbuilt Challenge Hub (C-1), not Squad Detail. Under PD-7 the design governs, so the training version SHIPPED 2026-07-28 (migration 0058, `/squad-records`, entry on Squad Detail). **Partly settled 2026-07-29:** Competitions shipped and put challenge history in **Hall of Champions (C-5, migration 0068)**, not folded into Squad Records — so the two surfaces coexist without overlap, which is effectively option (a). The naming collision itself stands: the design's `Forge Squad Records.dc.html` (training records) and CS-D19 (competition records) still share one name. The remaining decision is narrow — amend CS-D19 to redefine Squad Records as training-based, since the competition aggregate it describes now lives in C-5/C-7. | **Decide when Competitions starts:** either (a) rename one surface — training stays "Squad Records", competition history folds into Hall of Champions (CS-D18) / Current Champions (CS-D20); or (b) amend CS-D19 to redefine Squad Records as training-based and drop the challenge aggregate. Also confirms whether CS-D22's Firewall bar on S-1/S-2 applies to a training record book at all — it was written for challenge data. |
| 18 | ~~**Challenge metric table extended beyond CS-D8**~~ **CLOSED 2026-07-29** | `Challenge-System-Architecture` **CS-D8** locks five ChallengeTypes; the build ships fourteen, plus `metric_key` scoping and `challenges.tz`. **Note: this entry and several commit messages cited CS-D9 — the wrong ID. CS-D9 is qualifying-event rules, which the build conforms to unchanged; the metric table is CS-D8. Misattribution corrected.** | **RESOLVED** by `Docs/Amendments/Challenge-Architecture-Amendment-005-Metric-Expansion.md` (LOCKED). CA5-D1 extends the table to 14 types — the four fairness metrics exist because every original metric rewards the biggest/strongest athlete, so a mixed squad's leaderboard is decided before it starts (CC-D3); the four progression metrics (shipped 0063, no longer 'agreed but not built') score absolute gain floored at zero, since percentage gain is unwinnable for anyone with a real baseline and a negative on a leaderboard is a failure marker. CA5-D2 generalizes CS-D8's own `targetExerciseId` into `metric_key`. CA5-D3 adds `tz`. CS-D11's RANK_XP deferral untouched. A superseded banner now sits on CS-D8; three downstream doc edits remain listed in the amendment's §6. |
| 19 | **`deriveFeatured` implements ~15% of a LOCKED spec** | `Featured-Legacy-Moment-Standards.md` v1.0 (LOCKED) defines five tiers, nine event types, a 30-day active window and a fallback chain, cited by the PRD, L-1, L-2, the MVP audit and Transformation-Gallery-Architecture. `src/data/legacy-live.ts` returns the most recent `CHAPTER_SEALED` and stops — no window, no tier priority, no fallback. The hub card therefore looks arbitrary because it is **unfinished**, not misnamed, and the Legacy walkthrough currently has to say "chosen for you" to stay honest | Decide: build the algorithm to spec, or amend the Standards down to what shipped. Not a tutorial-pass decision |
| 21 | **In-app help — nothing, a static help centre, or an AI assistant** | PO review 2026-08-07: *"Chat bot for help? Just an idea I'm toying with."* The only item on that list that is neither a defect nor a spec'd surface, so it was deliberately NOT built and is recorded here instead. Three shapes, very different costs. **(a) Nothing** — the guided tour (94 steps / 27 surfaces) is the current answer and it is a good one; the gap is that it runs once and is not searchable. **(b) A static Help screen** — searchable FAQ entries that deep-link into the tour; ships over the air, no backend, no recurring cost, and goes stale unless someone maintains it. **(c) A Claude-backed assistant** — a Supabase edge function holding the API key (it must never reach the client bundle), which needs a per-athlete rate limit, a monthly spend ceiling, and an explicit decision about what app context it may read: an assistant that can see a chapter, a program and a training history is far more useful and is also a privacy surface P-6 has never been asked about. **Recommend (b) first** — it answers most of the real questions and is the thing (c) would need as a fallback anyway. | PO to choose a shape, and for (c) to answer the context question before any code |
| **23** | **Forge Coach — a fully designed second product with no scope decision** *(new 2026-08-15)* | **The design is complete and the repo does not know it exists.** Five files — `Forge Coach Check-in Review.dc.html` (2,980 lines, desktop 1440×900, canonical, seven screens with all states), `Forge Coach Mobile.dc.html`, `Forge Coach Wireframes.dc.html`, `Forge Client Messages.dc.html`, `forge-coach.js` — describe a coach-facing CRM: a human trainer with paying clients, weekly check-ins, programs, messages and a longitudinal record per client. **This is not Coach Holt.** Nothing about it exists in `Docs/`, in any amendment, in schema, or in git. `Forge-Legacy-Master-PRD.md` lists "Coach / Trainer Accounts" under *Future Roadmap — Not Scheduled*, gated by *"None should be designed or built without a separate, documented scope decision"* — that decision does not exist, and there is no `FC-D##` ID anywhere. Three LOCKED docs pre-cleared pieces of it (`Exercise-001` §16 reserves `visibility: 'COACHED_ATHLETES'`, *"No schema change required"*; `Rank-System` FC-7 rules a human coaching layer **"Compatible"**; `W-28` W28-D9 preserves coach-system `movementPattern` writes) while three others fence it (`Community-System` non-behaviors bar a *"coaching marketplace"*; `Squad-System` §16; `W-2`'s marketplace bans are *"permanent product architecture decisions — not temporary deferrals"*). **Assessment (2026-08-15, approved "approve but don't build"), plan at `~/.claude/plans/i-want-to-make-greedy-sunrise.md`:** the **observation half is largely already collected** — `body_entries`, `transformation_entries` (the exact six poses `rf/rs/rb/ff/su/bf`, plus a working then/now compare), `program_sessions` for adherence, and every set of every lift in `workout_sets` — so the roster, Overview, Lifts, Photos and Program tabs are mostly unwritten queries, not missing data. **The conversation half does not exist at all:** no check-in form, questions, schedule or answers (`athlete_weekly_reviews` is Holt writing *to* the athlete, and `0049` replaced the original squad status+note check-in with a 30-second video), and **no messaging of any kind, either side**. Four hard mismatches: **(a) `load` is a documented refusal, not a gap** — `programs-live.ts:118-133`, *"deliberately NOT an absolute weight"*; loading is `percentOfMax` only, while the design's override headline is a bench drop to 195 lb (`restSec` and `substitution` also exist on the type but are dead — `adopt-core.ts` copies neither). **(b) "Overrides ride on top of the template" has no primitive and no stable address** — every edit is a full `structure` jsonb overwrite, instances are pure copies with non-propagation explicit in `0115` (*"their copy is theirs from the moment they take it"*), and the design's `W<week>\|<code>\|<exercise>` key cannot address anything: `code` is discarded at adoption and re-lettered by position, there is no day or exercise id, and the real address is the 0-based `(weekIndex, dayIndex)` pair. **(c) The sealing rule the design cites is not the app's rule** — `0123`/`0156` freeze sealed states and an active program's session *count* only, so rewriting a week the client already trained is permitted by SQL and blocked solely by TypeScript in `edit-ops.ts`, which a coach RPC bypasses. **(d) Desktop has no home in the Expo app** — zero breakpoints, zero media queries, zero max-width page containers and zero two-pane layouts across 89 route files; type ramp tops at 25px, spacing at 24px, `tapTargetMin: 44`; no table primitive; 11.11 MB single bundle with `asyncRoutes` absent. ⚒ **Recommendation: a separate web app against the same Supabase project**, with `0129_admin_gate.sql` as the guard-table pattern and `ds-bundle/tokens/forge-legacy-tokens.css` ported directly (it is already CSS). Athlete-side surfaces (check-in submission, the client's message thread, consent grant/revoke) still land in the Expo app. **⚠ Prerequisite regardless of scope:** all seven storage buckets are `public: true` and `createSignedUrl` appears **nowhere** in the repo — a coach holding paying clients' physique photos is a different liability class from consumer exposure, already flagged in `FORGE_DELTAS.md:733`. **Two live athlete-app defects surfaced by this assessment, worth fixing whether or not Forge Coach ships:** the `dayIndex` coordinate divergence (`scheduleSlots()` emits filtered indices, `edit-ops.ts materialise()` consumes unfiltered ones — any week with an empty day lands an edit on the wrong day), and the public-bucket exposure above. | **(1)** Make the scope decision the PRD demands. **(2)** Author `Docs/Forge-Coach-Architecture-v1.0.md` with `FC-D##` IDs. **(3)** Answer five questions first, because they change what gets built: the **load model** (percent-native / add `loadLb` / coach-layer-only); **what happens to Coach Holt** when a human coach is present (no document addresses this — `Rank-System` FC-7 treats them as alternatives, not layers); **invite-only vs discoverable** (discoverable collides with `SOC-D15`'s bar on asymmetric relationships *and* three marketplace exclusions; invite-only sidesteps all four); whether the client sees and can revoke the relationship in-app; and whether this is truly a 1440×900 workstation product or a coach on a phone — the last one is what decides (d). **(4)** Frame coach access as **athlete-granted consent, not coach privilege**, so `S-1` §10.3 (*"not overridden for premium users, coaches, or squad admins"* — *"Consent, not privilege, is the gate"*) stands unamended. **(5)** Name every identifier `trainer_*` — `/coach`, `coach_ai`, the `coach_*` migration namespace and `src/domain/coach/**` are all Coach Holt already. **(6)** Note `programs_cap_guard()` fires on the **recipient**, so a coach assigning programs currently spends the client's free cap of 3 lifetime, monotonic, never-reopening. |
| 20 | **Three curation-shaped concepts, all locked, differently named** | Pinned Legacy (max 6, athlete-chosen) · Featured Legacy Moment (1, system-derived) · Featured on Profile (max 3, athlete-chosen, `L-12-Accomplishments-Management-Architecture` LOCKED). Two are called "Featured" and one of those cannot be chosen. Prior notes already record that athletes conflate pinned-vs-featured. **Both names are locked vocabulary**, so a rename is an amendment, not a refactor. Mitigating today: they never appear on the same screen, and the walkthroughs disambiguate them explicitly | Decide whether one gets renamed by amendment, or the vocabulary stands and the tours carry it |

---

## ✅ Recently Completed (last ~20 milestones)

> **✅ DEPLOYED 2026-08-20 — BOTH SURFACES.** Web: `entry-83197669fb7e246e1c801dae902ba7fe.js` —
> `forgelegacy.expo.app` returned **200** twice with a matching hash, and the live bundle was searched for
> five strings only this pass's code contains (`podium-grain`, `podium-halo`, `podium-ambient`,
> `podium-flash`, `podium-tint-`). All PRESENT. Commit `dfce07b` on `feat/route-map`.
> **OTA published to `production`, commit `7d038cc`, iOS update `01a02139-abe9-7dcb-8fc8-78fdac1d9fb3`,
> runtime `411fd2b68cbe11016f037dd7881b3fe813a1e148`** — `fingerprint:compare --build-id 078d2838…`
> matched **build 6 exactly** BEFORE publishing, and the manifest endpoint was then queried as an iOS
> client on that runtime and returned the new update id. **Deliverable, not merely published.**
> (Android also published: runtime `a8afa07c…`, update `01a02139-abe9-7c0b-93a7-5be0d5d34dbb`. No Android
> build exists, so it reaches nobody — recorded only so the id is not mistaken for the iOS one.)
> ⚠ **`fingerprint:compare` needs `--build-id` in non-interactive mode** — bare `--non-interactive`
> exits 1 with "Insufficent arguments", which reads like a failed comparison rather than a missing flag.
> ⚠ **`dist/` now holds the OTA's export (`entry-f3654904…`), NOT what the web is serving.** Same commit,
> different hash. Re-export before any `eas deploy --export-dir dist`, or verify the hash after.
> ⏳ Not yet confirmed on a device.
> ✅ **`0172` + `0173` APPLIED 2026-08-20**, pasted as `supabase/apply/pending-0172-0173.sql`. §3 matched
> all six predicted numbers (46 · 13 · 33 · 0 · 37 · **0 profiles now failing**).
> ⚠ **This deploy had already shipped `0169`'s client half** — `coach-profile-live.ts` was in the tree, so
> the podium publish carried it out before `0172` made its read legal. Degraded, not broken (`42501` →
> `EMPTY_COACH_PROFILE` by design), and now closed: **`0169` is applied AND deployed.**
> ⚠ **A tree-wide publish ships every undeployed client half in the tree.** Check for pending migrations
> before publishing anything, not just before publishing the feature that needs them.

### 0. ⭐ Import a program by photographing it — and the model is not allowed to read a program, only characters (2026-08-20, Import / Coach AI — **MIGRATION `0174` AUTHORED, NOT APPLIED**; Edge Function **NOT DEPLOYED**; client code is OTA-safe)

**`Architecture-Amendment-001-Import.md` §5 named this in June and deferred it** — *"Image Import:
screenshots of training tables from other apps, photos of printed programs. Requires OCR or vision model
parsing. Post-MVP."* It is built, and the interesting part is the shape it had to take to be buildable at
all, because the same document's §4.3 is **LOCKED** and says the opposite: *"Import First, Automate Later.
The MVP focuses on reliable parsing of structured formats. **No AI interpretation. No inference.**"*

**THE RESOLUTION IS THAT THE MODEL NEVER READS A PROGRAM.** It transcribes the pixels to tab-separated
rows and stops. `parseProgramTable()` — the same thousand lines that already read a paste — does every bit
of the interpreting: which column is which, what a scheme means, which numbers were assumed. The transcript
lands in the paste box, goes through the same preview, gets the same − / + corrections. **A photographed
table and a pasted one are identical code from that line onward**, which is what puts this inside §4.3
rather than around it. It is the split `coach-interpret` already runs on: *"Holt does not write programs.
He calls a machine that does."*

**⚠ THE GUARD IS ONE LINE AND IT IS THE WHOLE FEATURE: A KEPT LINE MUST CONTAIN A TAB.**
`domain/program/photo-transcript.ts` runs AFTER the model answers and drops everything else — the same
shape as the acuity override in `coach-interpret`. It matters because the app **cannot enforce what is in
front of the camera**. The guarantee is therefore not that the model will decline to describe a person; it
is that **the function has no channel that carries a sentence**, so it cannot. Prose, a caption, an
assessment of a body: none contain a tab, none come back. Verified in both directions, 17 tests.

**⚠ AND THE KNOWN-GOOD HALF CAUGHT THE REAL BUG, NOT THE KNOWN-BAD HALF.** The first header gate required
an exercise-name column. That rejects **the entire endurance case** — a triathlon plan's header is
`Week · Day · Session`, with no movement column anywhere, and `import-session-text.ts` exists precisely to
read it. A filter that only proves it blocks prose has proved half of nothing. The rule is now *two
distinct training-vocabulary words*, which takes `Week+Day+Session` and still refuses `Name · Email · Phone`.

**⚠ LIBRARY ONLY, NO CAMERA, AND THAT IS A DECISION RATHER THAN AN OMISSION.** Decision Queue #22 lists the
age floor (16+ vs 18+) as **open** and says it must be set *"before any photo-AI feature ships — the one
item in the plan that could produce serious consequences rather than a fine."* The app is rated **13+**.
That gate is about images of PEOPLE; reading a screenshot of a table is not that, and it stays not-that by
never opening a camera. `pickImageFromLibrary()` carries a ⛔ against being "upgraded" later.

**⚠ METERED, NOT CHARGED — and the honest description of it is that sentence, not "free".** PO chose this
over free-and-unmetered once the locked pricing architecture surfaced: photo reads already had a priced
slot (3 credits, capability A4). This is its own action, **`photo_import` at 2 credits**, because
`photo_read` is a model reasoning about a body at ~$0.075 and this is a transcription at roughly half — a
ledger that cannot tell two capabilities apart cannot price either. `metering_only` is already `true`
(0144's default), so spend is recorded and never refused: the plan's uncapped metered-tester posture, and
the reason metering could not be retrofitted later. **Real cost ≈ $0.035 a read.**

**⚠ NONE OF THE THREE COMPLETION TESTS ARE MET YET.** SQL not applied · code not deployed · nobody has seen
it work. `coach_ai_spend_credits` **raises `22023` on an unknown action by design**, so until `0174` runs
every photo import fails at the meter before a model is called — inert, not broken, and failing closed.
**And the Edge Function has to be deployed separately from any OTA**: this project has no linked Supabase
CLI, `eas update` does not carry it, and `program-photo-read` cannot answer until someone deploys it.
⚠ **`coach-interpret` may be in the same state** — it is in the tree and the board still calls the AI layer
"the next real gap"; that was not verified this pass and should be before either is called live.

**Files:** `src/domain/program/photo-transcript.ts` (new, the guard) · `supabase/functions/program-photo-read/index.ts` (new) · `src/data/program-photo-live.ts` (new) · `src/lib/useMediaPicker.tsx` (`pickImageFromLibrary`) · `src/app/program-builder.tsx` (a third way to fill the paste box) · `supabase/migrations/0174_coach_ai_photo_import.sql` + `supabase/apply/pending-0174.sql` · 29 new tests (17 guard + 12 wiring source-guard).


### 0. ⭐ The podium reveal was spoiling its own ending — the champion’s name never actually wiped on (2026-08-20, Podium Reveal / C-3.5 — no migration, ✅ WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6)

**A design-parity pass against `Forge Podium Reveal.dc.html`, pulled from the live Claude Design project
(`b029488a`) rather than the local `design_reference/` copy.** The screen was built to the `.dc` and read as
"close but not it"; twenty-odd deltas, of which three actually broke the ceremony.

**THE ONE THAT MATTERED.** The champion's name is revealed by a `clip-path` wipe in the design. RN cannot
interpolate `clip-path`, and the port animated `width: '0%' → '100%'` instead — against a **content-sized**
parent, which **Yoga resolves to `auto`**. So the wipe clipped nothing, the name was on screen from frame 0,
and a six-second build-up announced its own punchline before the countdown finished. It is now measured off a
hidden copy and wiped with a real pixel width. ⚠ **A percentage dimension against an indefinite parent is not
a smaller version of the same thing — it is silently no constraint at all**, and it typechecks, lints and
renders, so nothing catches it but looking.

**THE TWO POSITIONING BUGS.** The countdown numerals and the champion's impact flash are centred in the design
with `translate(-50%,-50%)`; the port pinned their **top edge** to the design's **centre** coordinate, dropping
the countdown ~58px and the flash 85px. The flash therefore bloomed below the champion instead of behind him.

**MOTION.** All twelve keyframe blocks run `--fl-ease-out` (`cubic-bezier(.16,1,.3,1)`); every one of them was
interpolating linearly. ⚠ **The native driver rejects an `easing` fn on `interpolate()`** (`validateInterpolation`
throws on any param outside input/output/extrapolate), so the curve is now **sampled into the interpolation
range** by a `keyframes()` helper — 8 steps per segment, which is what a CSS `animation-timing-function` does
between keyframes anyway. The rounded-off stops came back with it: `pSlam`'s 88% rebound, `pCrown`'s four stops
instead of three, per-slot pedestal durations (560/520, not one 700).

**THE REST, ALL VISIBLE.** Three radial gradients (ambient glow, victory halo, impact flash) were vertical
`LinearGradient`s and read as bands rather than blooms — now SVG radials at the CSS `farthest-corner` radius ·
the background was `forge-slate2.png`, not the design's `forge-bg-2.png`, **which was already wired as
`SCREEN_BG.bg2`** · the film-grain layer was absent entirely · pedestal numerals floated centre instead of
pinned to the 12px top padding · the champion's avatar rendered at **86px instead of 78** (the `Avatar`
composite inside a padded ring gave a double border and a gap) · the medal glyph was missing its centre dot ·
the crown was 34px, not 42, with no drop shadow · the **You pill was stacked below the name** where the design
has it inline · the three embers shared one clock, so they moved in lockstep, and were anchored inside the
champion's block so they rode the slam · the CTA was a flat `bronzeTint` at radius 12 instead of the forged
`--fl-bronze-fill` at radius 10.

**TWO THINGS THE GRAIN LAYER WOULD HAVE BROKEN if it had gone in naively:** every other child of the ceremony
sets an explicit `zIndex`, so an unranked grain layer slides **under** the podium rather than over it; and a
full-screen overlay that does not set `pointerEvents="none"` swallows both Skip and the CTA. It carries both.

**DELIBERATELY NOT CHANGED.** The `.dc` renders against the Visual Foundation's older bronze ramp
(`--fl-bronze-400: #BF8F4F`, `--fl-bronze-300: #CDA063`); the app's `foundation.ts` is deeper (`#BA8654` /
`#C99767`). Matching the `.dc`'s literal rgba values would make the podium **the one screen wearing a different
bronze**. Palette reconciliation is app-wide work, not podium work — noted in the file header so the next reader
does not "fix" it. Also unchanged: the six data-correctness deviations the port already documented (real
standings instead of the design's invented Marcus Vale, the real unit instead of hardcoded `wkts`, tie/
co-champion handling, variable field size, the reduce-motion rest state).

> **✅ DEPLOYED 2026-08-19.** Web: `entry-69d5be4226aaa8d83f75e397b28f981b.js` — `forgelegacy.expo.app`
> returned **200** twice with a matching hash, and the live bundle was searched for strings only this
> pass's code contains (`Blocked People`, `Harassment or bullying`, `Block this person`, `Send report`).
> ⚠ Two searches first read as MISSING and were not: the minifier escapes `’` as `’`, so any grep
> carrying a curly apostrophe fails against a bundle that contains the string. Search the ASCII portion.
> **OTA published to `production`, commit `731e2dd`, iOS update `01a01bda-3b69-727c-b0b0-7006e229cf1b`,
> runtime `411fd2b68cbe11016f037dd7881b3fe813a1e148`** — `fingerprint:compare` matched build 6
> (`078d2838`, 2026-08-15) exactly BEFORE publishing, and the manifest endpoint was then queried as an iOS
> client on that runtime and returned the new update id. **Deliverable, not merely published.**
> ⏳ Not yet confirmed on a device.

### 0. ⭐ The last two listing blockers close — the age rating is answered against a questionnaire that changed, and the filter list stops being a mechanism with nothing in it (2026-08-20, App Store listing + `0173` — **MIGRATION `0173` AUTHORED, NOT APPLIED**; no client code, nothing to deploy)

**Two items, both of them the tail of `0171`.** The Guideline 1.2 controls shipped and deployed on 08-19, which
unblocked the age rating; and `0171` itself had written into its own header that its filter list was seeded with
impersonation patterns only and that a slur list was **owed**. Both are now done on paper. Neither is live yet, and
the difference is stated below rather than assumed.

**⚠ THE AGE RATING QUESTIONNAIRE IS NOT THE ONE THIS PROJECT WAS WRITTEN AGAINST, AND ANSWERING IT FROM MEMORY WOULD
HAVE BEEN WRONG.** Apple replaced it in 2025. The tiers are now **4+ / 9+ / 13+ / 16+ / 18+** — **12+ and 17+ no
longer exist** — and the form is split into **In-App Controls · Capabilities · Content Descriptors** instead of a flat
content list. Every developer had to re-answer by 31 January 2026. ⚠ **A second change lands in September 2026: the
Social Media questions become REQUIRED to submit** a new app, an update, or a notarisation — and we submit inside that
window, so they are not optional for us. Answered question by question in **`Docs/App-Store-Listing-Copy.md` §6b**,
with Apple's own definitions quoted next to each answer.

**Result: `13+`, and `16+` in Australia.** It is driven **twice over** — by *Social Media = Present* and independently
by *Contests = Frequent* — so the rating does not hang off a single debatable box.

**⚠ TWO ANSWERS ARE JUDGEMENT CALLS AND BOTH ARE ARGUED IN WRITING, because either could be disagreed with later.**
**(1) Social Media = Present.** A real case exists for *Not Present*: squads cap at 50, joining is request-only,
friends are mutual, and **there is no follower system and never will be** (a settled decision, not a gap). It is
answered Present anyway — a reviewer who opens Discover, joins a squad and finds a feed with comments and reactions
will call that a social feed, and understating a capability on an app that **just failed Guideline 1.2 for the same
kind of omission** is the worst available second impression. 13+ costs a strength app nothing. The third option,
*"Social Media Disabled for Users Under 13"*, would be a **false declaration** — it presumes an age gate we do not
have. **(2) Medical or Treatment Information = None**, worth 13+ infrequent / **16+ frequent** if answered otherwise.
`domain/coach/rulebook/limitations.ts` is the only candidate and its own header calls itself *"the closest thing in
the app to health guidance"* — so it was read rather than assumed. It contains **no diagnosis, no treatment and no
injury vocabulary at all**: a grep for medical / injur / pain / doctor / physician / diagnos returns nothing. It is a
mechanical exclusion map. ⛔ **That answer is conditional on it staying that way** — the day any coaching copy tells an
athlete what to do about an injury, the rating moves to 16+.

**Also verified rather than asserted, because that is what a signed declaration requires:** *Unrestricted Web Access =
Not Present* (`components/external-link.tsx` is the only browser path and `openBrowserAsync` opens a fixed set of our
own URLs — this single question forces **16+** on its own if answered wrong) · *Advertising = Not Present* (no ad SDK
in `package.json`, the same evidence that lets the privacy labels claim no tracking and skip ATT) · *Alcohol, Tobacco
or Drug Use = None* (grepped for ten substance terms across the rulebook, settings copy and `exercises.json` — **zero
hits**) · *Messaging and Chat = Present*, but ⚠ **Coach Holt is NOT what makes it Present** — squad post comments are;
Holt is a rulebook with no human on the other end, and there are no DMs.

**`0173` — the filter list, and the eighteen words that are deliberately NOT in it.** 37 patterns across racial,
ethnic, homophobic, transphobic and ableist slurs, hate claims, profanity, sexual solicitation and threats.
⚠ **THE EXCLUSIONS ARE THE HARDER HALF AND THEY ARE DOCUMENTED IN THE MIGRATION HEADER**, because the match is a
**substring** with no word boundary available: **`rapist` is inside `therapist`** and **`pedo` is inside `pedometer`**
— both handles a real athlete on a *fitness* app would pick — and `kike` is the ordinary Spanish nickname for Enrique,
`Nazir` contains `nazi`, `Van Dyke` contains `dyke`, `Cummings` contains `cum`, and this app ships programs with
`Titan` in the name. A blocked signup is **silent**: the person reads "That name or handle is not available." and
leaves, and nobody hears about it. One collision is knowingly accepted and written down instead of hidden: `cunt`
rejects `Scunthorpe`.

**⚠ AND `0171`'S OWN SEED HAD THREE DEAD ROWS, FOUND WHILE DOING THIS.** `_` in a LIKE pattern is a **single-character
wildcard, not a literal** — and the trigger strips every non-alphanumeric from the input *before* comparing. So
`forge_admin`, `forge_support` and `coach_holt` can never match their literal forms. They still match "forgeXadmin"
and friends, which is also impersonation, so they are left alone rather than deleted; the one real gap — nothing
checking the **name** column for `forgeadmin` — is closed. Recorded because the next person to add a pattern will
reach for an underscore.

**The guard is verified empirically in both directions, which is the point.** A blocklist that only proves it catches
slurs has proved half of nothing. `pending-0173.sql` §2 asserts **8 known-bad handles rejected** (including two
punctuation-evasion forms) **and 20 known-good handles untouched** — the exclusion list made executable, so adding a
careless pattern later fails the assertion instead of silently turning athletes away. Re-run locally against the real
patterns: **46 rows, 8 rejected, 30 survive** (the 20 plus 10 realistic product handles).

**⏳ WHAT IS AND IS NOT TRUE, in the three terms this project uses.** `0173`: **SQL not applied** · no client code
changed, so there is **nothing to deploy** — the trigger reading the table has been live since `0171`, meaning the
list takes effect the moment the paste runs · **not observed**. ⏳ **The PO reports both `0172` and `0173` pasted on
2026-08-20; §3's one-row report has NOT been read back, so neither is recorded as applied here.** The prediction to
check it against is in the bundle: **total 46 · both 13 · handle 33 · name 0 · added_here 37 ·
existing_profiles_now_failing 0**.

**✅ THE AGE RATING IS ENTERED, NOT JUST ANSWERED — App Store Connect, 2026-08-20, calculated `13+`.**
⚠ **And Step 1 had a trap that cost an attempt: "Social Media Disabled for Users Under 13" is its own Yes/No row,
it sits BELOW THE FOLD of a scrolling panel, and it must be `No`.** Its own description is what gives it away — it
declares that *"the **Declared Age Range API** is called to check users' age ranges before enabling social media
features."* Forge calls no such API. Set to Yes, **Step 7 refuses to save** and demands Age Assurance = Yes, which
would be a second declaration of a mechanism that does not exist. ⚠ **The failure mode is that everything visible
on screen was correct** — Parental Controls No, Age Assurance No, Web Access No, UGC Yes, Social Media Yes — and the
offending row was simply off-screen. Step 1 is now written out in full, top to bottom, in §6b's click-path so nobody
has to discover what is below the fold.

**⚠ AND A SEPARATE FIND: `0172` IS IN THE TREE, HAS A PASTE BUNDLE, AND IS RECORDED NOWHERE.** It shipped inside
commit `731e2dd` alongside the moderation work, and neither this board nor `GO-LIVE.md` mentions it — so it is
presumed **unapplied**. It is not cosmetic: it re-applies the per-column grants `0169` skipped, and until it runs,
deploying `0169`'s client half raises **42501 on every read of `profiles`**. **Paste `pending-0172.sql` before
`pending-0173.sql`, and before any deploy that carries the Coach Holt onboarding read.**

**⭐ AND SCREENSHOT 05 IS FIXED — BY RECAPTIONING IT, WHICH WAS THE ONLY MOVE LEFT.** The frame showed a rank
pillar under the caption *"Earned once. Yours for good."* illustrated by a rank that had not moved
(*"I've started."*, `LIFETIME 5`, *"0 of the path walked"*). **PO: *"I don't have enough to screenshot the
other ranks."*** So a reshoot was never available, and the fix was the words: the band now reads **"Everyone
starts at zero."** — same capture, and the empty state stops contradicting the caption and becomes the point
of it. `final/05.png` replaced at 1320 × 2868; the old file sits one folder **above** `final/` so the upload
set stays exactly eight.

**⚠ AND THE FRAMES ARE SET IN GEORGIA, NOT PLAYFAIR DISPLAY — WHICH WAS NOT OBVIOUS AND WOULD HAVE SHOWN.**
`--fl-font-display` is `"Playfair Display", Georgia, …`; the machine that framed the set did not have
Playfair, so **every caption in all eight frames is the CSS fallback.** Rendering the replacement in the
*intended* font would have made 05 the one frame in eight with different letterforms — the kind of defect
that is invisible in the file and obvious on the product page. Caught by re-rendering the **old** caption in
each candidate font and pixel-diffing against the real file: Playfair 400/500 peaked at 61–68% ink overlap,
**Georgia at 78 px hit 86.4%** (mean abs difference 4.1/255). ⚠ **The band background is a vertical gradient
PLUS a centred horizontal glow**, so a flat fill leaves a visible patch; it was rebuilt from a text-free
row's horizontal profile, re-levelled per row, verified identical to within 1–2 levels across seven clean
rows. Every constant needed to re-cut a band is now recorded in `Docs/App-Store-Listing-Copy.md` §8.

**Files:** `supabase/migrations/0173_moderation_blocklist_language.sql` · `supabase/apply/pending-0173.sql` (§1 diffed
against the migration — **37 of 37 value rows identical**, one comment line differs by design) ·
`Docs/App-Store-Listing-Copy.md` (**new §6b**; §6's rating row; §7 resolution banner + the requirement table gaining a
*Now* column; §8's three checkboxes) · `Docs/GO-LIVE.md` (**v1.9** — items 4b and 10.4 were stale in the *pessimistic*
direction, which is rarer here than the reverse and still wrong).

### 0. ⭐ The store listing has its screenshots — and the crop is what made four of the eight shippable (2026-08-19, App Store listing — no code, no migration, not an OTA)

**Eight framed screenshots at 6.9" (1320 × 2868), which is the only size Apple needs** — it takes one set and scales the rest itself. Shot on an iPhone 16 Pro Max, whose native resolution **is** an accepted 6.9" size, so nothing was scaled or resampled. Raws in `…/OneDrive/ForgeLegacy-AppStore/raw`, framed finals in `…/final/01–08.png`, uploaded in numeric order. **`Docs/App-Store-Listing-Copy.md` §8 is now the record** for running order, captions and rationale.

**The order follows §5's pillars, and 01–03 carry the pitch because Apple shows only the first three in search results:** 01 active workout *"Log a set in under two seconds."* · 02 a Holt-built 12-week block *"Coach Holt builds the program."* · 03 a sealed chapter *"Seal a chapter. It's permanent."* · 04 Home *"Pick up where you left off."* · 05 rank *"Earned once. Yours for good."* · 06 squad feed *"A few real people. No audience."* · 07 competition standings *"Compete with people who know you."* · 08 exercise detail *"Every movement, demonstrated."*

**⚠ THE CROP IS NOT COSMETIC — IT IS WHAT MAKES FOUR OF THE EIGHT SHIPPABLE.** Every frame is cut below the status bar, which removes a **third-party media-player pill sitting in the Dynamic Island** on four of the captures, and on 02 the pinned **Delete Program** button — red, the most eye-catching thing in the lower half of the frame, and **impossible to scroll away because that footer is fixed**. Cropping a real capture onto a caption band is the art direction the launch docs always meant; the landing page's HTML phone mocks are still never the screenshot.

**⚠ 06 AND 07 ARE THE REVIEWER DEMO ACCOUNT BY DECISION, NOT BY CONVENIENCE.** The PO's own circle is empty — Home renders *"Nothing from your circle yet."* — and real testers' names and handles in a store screenshot are public forever and would need each person's consent. `supabase/seed/reviewer-seed.mjs` builds *Iron Circle* with a second member, posts from both authors and a two-entrant competition: content that is ours to publish.

**⛔ OWED — RESHOOT 05 (RANK).** It reads *"I've started."*, `LIFETIME 5` and *"0 of the path walked"*, which makes it the one frame that argues against the pillar it illustrates. The account simply has no rank history yet and will by launch. The same weakness, smaller, sits on 01 (`LAST —` / `BEST —`, a lift with no history) and 02 (`Workout 0 of 72`).

**✅ CLOSED SAME PASS — §5 DOES NOT OVERCLAIM, AND A LOAD-BEARING CODE COMMENT WAS LYING.** The description's feature list promises *"demonstration loops and coaching cues"*, and `src/app/exercise/[id].tsx`'s header flatly denied it: *"today none of the 556 generated records are approved, so Why-it-matters / How-to / Cues / Mistakes are absent for every exercise."* **The PO confirmed on-device that all four sections render**, and counting the store settles it — `domain/exercise-coaching/content/coaching_content.json` holds **797 records: 735 Published, 62 Needs Review**, which is what this board's Content row has said all along. The serving gate (`toCoachingView`, Published-only) never changed; the comment was written before the publish pass and never revisited. ⚠ **The listing line now rests on that gate** — a mass un-publish would make the App Store description false, so the comment says so. **The claim stands, unedited.**

**✅ SUBTITLE CHOSEN THE SAME DAY — option A, `Workout log & strength tracker`.** 30/30 characters, so **any later edit is a rewrite, not a tweak**. It buys maximum search reach and says nothing distinctive, which is the right trade for an app with no awareness: the *name* carries the brand and the description carries the soul. ⚠ **§2 and §4 are coupled** — the keyword list was written assuming A, which is why `workout`, `log`, `strength` and `tracker` are absent from it, and changing the subtitle without rewriting the keywords in the same pass either duplicates indexed terms or drops terms nothing else covers. Both sections now say so. **Nothing in the listing copy is still owed by the PO.**

**Files:** `Docs/App-Store-Listing-Copy.md` §2 + §8 · `Docs/Launch-Checklist-Free-And-Premium.md` §10.5 (still `[~]` — the app icon and the age rating remain, and the age rating stays blocked until the Guideline 1.2 client half reaches testers) · `Docs/GO-LIVE.md` row 4 · `src/app/exercise/[id].tsx` · this board.


### 0. ⛔ The App Store would have rejected this build, and no launch document said so — Guideline 1.2 (2026-08-19, Moderation — **MIGRATION `0171` APPLIED AND VERIFIED**, client code is OTA-safe, ⏳ NOT DEPLOYED)

**Found while writing the age-rating section of the store listing, which is the only reason anyone looked.** Guideline 1.2 requires an app carrying user-generated content to have **four** things: filtering, reporting **with timely responses**, the ability to **block** abusive users, and published contact info. Forge had the fourth (`/support`, 08-18) and, in the entire binary, **one** report control — `squad-settings.tsx:688`, a toast reading *"Reporting a squad is coming soon."* No report on a post. **No block.** `grep "create table.*(block|report)"` across all 170 migrations returned nothing.

⚠ **"IT IS ONLY A PRIVATE SQUAD" DOES NOT EXEMPT IT** — Discover and request-to-join mean a stranger can enter a squad and post into a feed an athlete reads. ⚠ **AND THE "COMING SOON" TOAST WAS WORSE THAN NO BUTTON**: it demonstrated, inside the shipped app, that the need was known and unmet. A reviewer who tapped it would have found the finding for us.

**Why it was missed for months:** the closest prior record is `project_communities_architecture`'s open gap, *"no platform-level moderation escalation"* — filed against **Communities**, a subsystem that is deferred and unbuilt, so it read as a future problem. **Squads shipped and brought the same gap with them.**

**Built:** `athlete_blocks` + symmetric `is_blocked()` · `content_reports` with an open/actioned/dismissed status · `moderation_blocklist` + a `profiles` trigger · `admin_reports()` / `admin_resolve_report()` · `domain/moderation/` (pure, 11 tests) · `data/moderation-live.ts` · one `ReportSheet` reused by every UGC surface · ⋯ Report + Block on the athlete profile · the report flag on a post · **`/blocked` in Settings → Privacy & Alerts** · a Reports panel in `/admin`.

⚠ **THE ENFORCEMENT IS ENTIRELY SERVER-SIDE, AND THE TWO FEEDS NEEDED DIFFERENT TOOLS.** `squad_feed()` is `security invoker` ⇒ RLS reaches it, so four **`AS RESTRICTIVE`** policies cover it and every direct read — restrictive policies are **ANDed** with existing ones, so they filter everything without touching a single policy written across a dozen migrations. `friends_feed()` is `security definer` ⇒ **RLS does not apply**, so it carries **four explicit `is_blocked` predicates**, transformed from 0113's text rather than retyped (`notification_events_for` lost shipped features to a from-memory rebuild four separate times). Four and not one: the post, the comment count, the reaction count and the **reactor names** — filtering the comment list but not its count renders "3 comments" above two, and a blocked athlete's name would otherwise still appear under *"Acknowledged by"*. `verify-0171.sql` asserts **both** counts are 4.

⚠ **NOTHING IS FILTERED CLIENT-SIDE, DELIBERATELY.** Client filtering only hides content from the person doing the filtering; the blocked athlete's app would carry on rendering everything. That is a mute, not a block, and it is the half of the pair that cannot detect the problem.

**One correction to this session's own claim:** it was reported that squad owners could not remove a member and that this pass built it. **Wrong — `0046` shipped it as an RLS DELETE policy and `squad/[id].tsx:275` has been calling it all along.** The redundant RPC was removed rather than shipped; a second function doing what a working policy already does is the "two answers to one question" failure `lib/billing.ts` names.

**Owed, and written into the migration so neither can pass as done:** the **slur/profanity list is not seeded** — the mechanism is complete and enforced, the list holds impersonation patterns only (9 rows), and real language needs deliberate authoring rather than a guess inside a migration; until then requirement 1 rests on operator takedown. And **blocked athletes still appear in competition standings** — judged deliberately, since standings are a scoreboard of numbers rather than authored content and removing a row would misstate the result for everyone else.

tsc 0 · **2,644 tests green** (11 new, incl. two asserting the copy never promises what `0171` cannot enforce) · lint at baseline — ⚠ it went to **2 errors** mid-pass because a `useEffect` reset trips react-compiler's sync-`setState` rule; fixed by clearing state on successful send instead. `0171` applied and verified 2026-08-19 (all booleans true, both enforcement counts **4**, 9 blocklist patterns). **This unblocks the App Store age rating and §10.**

### 0. ⭐ Referrals finally have the one fact they were missing — and the migration's own self-check found a live privilege escalation (2026-08-19, Phase E 4.4 — **MIGRATION `0170` APPLIED AND VERIFIED**, client code is OTA-safe)

**The referral half.** `0145` shipped the entire economic side of referrals in June — `referral_codes`, `referral_credits`, `my_referral_code()`, and `grant_referral_credit()` with MA3-D19's 12-month rolling cap enforced in SQL — and **nothing in `src/` had ever called any of it.** The gap was one fact: `grant_referral_credit(p_referee, p_code)` takes the code **as an argument**, and the database had never known which code an athlete arrived through. Fine if people pay the instant they are invited; MA3-D20 grants on **first successful payment**, which is weeks later. `0170` adds the attribution store, `record_referral_attribution()` and `my_referral_attribution()`; the client half is the code, the capture off the link, and the flush. **First attribution wins, enforced by a primary key** — last-write-wins would let an athlete about to subscribe paste a different friend's code and move the credit off whoever actually brought them in.

⚠ **NO REWARD IS PROMISED ANYWHERE IN THE COPY, DELIBERATELY.** MA3-D17 makes referral two-sided and the obvious invite line is *"we both get a month free"* — but the credit cannot be granted until §4.2's webhook exists, and `default_tier` is still `PREMIUM` so nobody is paying for anything. That line would be a **new** false billing claim added to the four Phase F is already working through. Attribution records silently in the meantime, which is the conservative order: recording who reached whom before announcing a reward, rather than announcing one against attributions that were never captured. `referralLinkFor()`'s header carries a ⛔ marking Phase F as owing this a revisit.

### ⛔ AND THE SELF-CHECK FOUND A LIVE HOLE — WRITTEN TO ASSERT SOMETHING BELIEVED ALREADY TRUE, IT FAILED ON THE FIRST RUN AND IT WAS RIGHT

`0145` deliberately withheld the `authenticated` grant from five internal functions; `claim_founder_seat` says so in a comment on the line after its own definition — *"Not granted to `authenticated`. Deliberately: seats are claimed server-side after a confirmed payment."* **`0147` §1 then ran `grant execute on all functions in schema public to authenticated`** — correctly, and for the reason its header explains at length — and **its §3 take-back list of twelve functions did not include these five.** A blanket grant silently reversed five targeted revokes two migrations later. Nothing failed. `0147`'s own §4 assertion could not catch it: it counts what **`anon`** can reach, and this was **`authenticated`**.

⚠ **THE SHARP ONE WAS NOT REFERRALS.** `claim_founder_seat(p_athlete uuid)` is `SECURITY DEFINER`, takes the athlete **as an argument**, and never consults `auth.uid()`. **Any signed-in athlete could award themselves — or anyone else — a lifetime Founder entitlement (the $149 SKU) for nothing, and burn all 100 seats doing it.** Invisible today only because `default_tier = 'PREMIUM'` makes everyone Premium anyway, and the `athlete_entitlement` row it writes **survives Phase F** — so it was a hole that pays out precisely when money starts moving. The other four: `grant_referral_credit` (credit without a payment, against MA3-D20), and `athlete_tier` / `athlete_caps` / `athlete_live_counts`, each taking an arbitrary uuid and answering questions about a stranger's subscription and usage.

**Fixed in `0170` §1b, checked the way `0150` says to rather than the way `0147` did** — that migration exists because revoking `evaluate_honors` broke Finish Workout for every athlete with `tsc`, tests and lint all green. Verified before revoking: **zero `src/` RPC call sites for all five**, and every SQL caller (`my_entitlement`, `my_tier`, `athlete_caps`, `consume_holt_allowance`, `programs_cap_guard`, `week_templates_cap_guard`) is `SECURITY DEFINER`, so the permission check runs against the owner and no path can notice the revoke. **Verified after: `client_reachable_fns = 0` and `founder_seats_claimed = 0`** — the revoke held, and nobody had found the hole first.

⚠ **THE GENERALISABLE LESSON, AND IT IS NOT ABOUT REFERRALS:** a targeted `revoke` is only true until the next blanket `grant`, and neither statement fails when the second undoes the first. `0170`'s assertion is deliberately kept broad over all five rather than narrowed back to the one that prompted it, because the failure mode is the blanket grant, not the function.

**Two self-inflicted errors worth the entry, both mine.** The paste bundle ended with `select public.my_referral_code()` — and `0145`'s header says in bold that **the SQL editor has no `auth.uid()`**, so every `my_*` function raises `28000` there. The editor runs a script in ONE transaction, so a failure on the last statement **rolled back the table, both functions and the security fix**, all of which had already succeeded. And the first fix was re-run against the editor's stale buffer rather than the edited file. Then a third, structural one: `pending-0170.sql` ended in several `select`s and **the editor shows only the last statement's result**, so the two security checks ran and were invisible — which is why `supabase/apply/verify-0170.sql` returns **one row, nine columns**.

**One real gap, reported not papered over.** MA3-D21 says attach referrals to *squad and challenge* invites. Squad is done. **Challenge invites never leave the app** — they are `method: 'in_app'` to existing friends, so there is no link to carry a referral and the recipient already has an account. `challenges-live.ts:415` calls a challenge invite *"an install opportunity"*; as built it cannot be one. That needs a product decision, not invented code. **Also still open: no surface yet for typing in a code you were given verbally.**

tsc 0 · **2,633 tests green** (24 new: the alphabet pinned against `0145`'s generator, an ambiguous character rejected rather than repaired, and a guard asserting no message promises a reward) · lint at baseline · `0170` applied and verified · ⏳ **not yet deployed.**

### 0. ⭐ Onboarding asks the three questions Coach Holt was always promised — and the two stores that already held them could not be read (2026-08-19, Onboarding + Coach — **MIGRATION `0169` REQUIRED**, client code is OTA-safe)

**PO report:** *"the flow that's in right now doesn't have them pick their experience level during the initial onboarding… I don't think we collect the equipment or the level."* Correct in effect, and the reason was worse than the report: **the data WAS being collected, into two device-local stores nothing downstream could read.**

⚠ **THE ENGINE HAD BEEN WAITING FOR THIS SINCE IT WAS WRITTEN.** `domain/coach/constraints.ts` opens by stating *"Goal and experience come from onboarding, equipment from the Home Gym profile, units from Settings… `missingFor()` is what decides which questions get asked, so an athlete who has filled their profile in answers three questions and not eight."* `missingFor()` shipped. Nothing ever handed it a profile. **Four surfaces each held part of the answer and none of them met:**

| Store | Held | Lived in | Read by |
|---|---|---|---|
| `lib/home-level.ts` | experience | **AsyncStorage** | `recommendProgram` only |
| `lib/home-intake.ts` | goals + equipment | **AsyncStorage** | `recommendProgram` only |
| `profiles.home_gym_equipment` (0021) | owned gear | Supabase | Coach Holt |
| `app/coach.tsx` | all three, re-asked | — | itself |

So: neither local store survived a reinstall or reached a second device; **Coach Holt could read neither of them** and re-asked experience and equipment on every single build; and both sat behind the quiet link *under* the three doors, so anyone taking the **recommended** door never saw them at all. Meanwhile `complete_onboarding` had been writing **`athlete_type = 'Hybrid'` hard-coded for every athlete in the app** — the value Rank reads — and `environment = null`, a column added by `0007` explicitly *"written at the Equipment step"* that no step ever wrote.

**Onboarding now asks three questions** — Goal (up to 3, first is primary), Experience, Equipment (+ a conditional gear grid for a home setup) — going from 4 steps to 6, or 7 for a home gym. This is **executing the LOCKED `Onboarding-First-Time-Journey-Architecture-v1.0`**, whose arc has specified Goals → Experience → Equipment since June; ONB-Amendment-002 deferred them to opt-in surfaces, those surfaces were built on AsyncStorage, and the deferral is what this closes. *"Amendment locked but never applied"* remains the recurring pattern of this board.

⚠ **THE PAYOFF IS MEASURED IN QUESTIONS REMOVED, PERMANENTLY.** Holt's single-session flow goes **6 → 3** (focus · time · limits) and the program flow **8 → 5**. Deliberately NOT moved into onboarding: days-per-week, split style and limitations — those are per-build, not per-athlete (*a shoulder that hurts this week is not a profile field*), and days-per-week is meaningless for "just today's workout", which is the flow a struggling new athlete actually needs.

⚠ **SKIPPED IS NOT FIXED.** The chooser screen renders **"What I already know"** naming everything carried over, with *"Not right today? Change it"* restoring all three questions. A shorter flow that cannot show its assumptions is indistinguishable from one that decided for the athlete, and the first they would learn of a wrong carry-over is a program built on it. The line renders only when something was genuinely carried — an empty summary would be the generic teaser the coach spec forbids.

⚠ **ONE DESIGN HOLE FOUND MID-BUILD AND CLOSED IN THE SAME MIGRATION:** `athlete_type` was being derived from the primary goal and **the goal itself was not being stored** — and that derivation is lossy (fatloss · health · athletic all → `Hybrid`), so reading the goal back out of it would have been a guess dressed as a lookup and Holt would have opened by asking a fat-loss athlete whether they wanted to build muscle. `0169` adds **`training_goals text[]`** (element 1 = primary, the same rule `home-intake.ts` already used) beside **`experience text`**. Both nullable with **no default, deliberately**: null means *ask*, and a default `'beginner'` would be indistinguishable from an answer and hand a ten-year lifter beginner progressions with total confidence.

**Two refusals kept rather than papered over.** `coachGoalForGoalId` returns **null** for `endurance` (five race goals sit behind one bucket, and the plan is built backwards from a date the athlete has not given) and for `athletic` (spans `conditioning`, which the wizard itself declines to draw). Both still derive an Athlete Type, because that mapping is coarse *by design* and correct at its own grain. A race plan therefore **never** skips the goal question, and there is a test asserting exactly that.

**`StepId` and the step list moved out of the screen into `domain/coach/intake-steps.ts`.** ⚠ The failure this guards against is *a flow that still works*: skipping a step the profile has not answered does not crash, does not fail `tsc`, and simply never asks — the engine then builds on whatever the screen defaulted to. Twelve tests assert the lists directly, including that the survivors keep their **original order** rather than merely their count, and an exhaustive sweep over all 96 flag combinations checking every emitted step is one the screen can draw.

Also closed: `null` vs `[]` is preserved end-to-end (0021's three states — never set up / owns nothing / owns these), de-selecting the home-setup bucket clears the gear list back to `null` rather than `[]`, and the training answers are written **after** the RPC and never throw, because the account is already committed by then and the cost of losing them is precisely that Holt asks two questions he could have skipped — today's behaviour, not a broken one.

**Files:** `0169_athlete_experience.sql` · `app/onboarding.tsx` · `app/coach.tsx` · `domain/onboarding/{derive,service}.ts` · `domain/coach/intake-steps.ts` (new) · `data/coach-profile-live.ts` (new). tsc **0** · **2,585 tests green** (+24) · lint **at baseline** (1 pre-existing error, 13 warnings) · web export clean. ✅ **`0169` APPLIED 2026-08-19** (via `supabase/apply/pending-0169.sql`; §3 returned 25 athletes / 0 / 0 — and the count row is itself the proof both columns exist, since Postgres errors on a column that does not). ✅ **Client DEPLOYED to the web preview 2026-08-19** (`forgelegacy.expo.app`, `entry-7ccc85b78c72d513e7b5c08a4eef33ed.js` — the served hash was checked against the local build, not assumed). ⏳ **NOT published as an OTA**, so phones and TestFlight are still on the old bundle; the answer-counts stay 0 until that ships. Gate before the deploy, over the WHOLE working tree (three sessions' work, since publishing bundles the tree and not the commits): tsc **exit 0** · **2,609 tests green, 0 failing** · lint **at baseline** (1 error, 13 warnings, unchanged) · web export **exit 0** · no changes to `package.json`/`app.json`/`eas.json`, so the batch is **OTA-safe with no new native build**.

### 0. ⭐ "The days have not progressed" — the season was fine and the PICTURE of it was the defect (2026-08-19, C-3 — **`0168` APPLIED, and it disproved the diagnosis rather than fixing it**; client code is OTA-safe)

**PO: *"look at my competition with @kingmo. It doesn't look like the days have progressed and it should've been done by now from when it started."***

⚠ **THE FIRST DIAGNOSIS WAS WRONG, AND `0168`'s REPORT IS WHAT KILLED IT.** The reasoning was that `advance_challenges()` had been reverted to 0059's SQUAD-only body — which fits the symptom exactly and is a genuine unguarded hole (see below). **The database says otherwise.** `0168` §3 returned four FRIENDS competitions, and **both live ones are `ACTIVE`** — a state only 0087's body can produce, because 0059's never promotes a friends competition out of ENROLLMENT. §2's assertions did not raise either. **The lifecycle was healthy the whole time.** Recorded because a plausible mechanism that fits every word of a report is not evidence, and the migration earned its place by *refuting* itself rather than by repairing anything.

**⭐ AND THE COMPETITION IS NOT THE LENGTH IT WAS ASKED FOR.** PO: *"I made a **2 day** competition for me and king mo."* The row says **three** days, and that is the whole of *"it should've been done by now"* — it was built a day longer than requested. `Math.max(3, …)` in Create Challenge's custom-days field moved the `2` to a `3`, **left the `2` sitting in the input**, and said nothing. The only thing that disagreed was the run summary underneath — which is precisely the field-vs-summary split that clamp was written to close, closed for `0` and left open for everything below 3. ⛔ **AND 3 WAS NEVER THE RULE:** `Create-Challenge-Wireframe-Spec-C2` §4.3 says *"Custom range must be ≥ 1 day"* and leads its presets with **Daily**; `challenges` only constrains `end_at > start_at`. The floor was neither a product decision nor a database limit — it was a number in a clamp. **`MIN_DAYS = 1` now, a `Daily` preset chip exists (the spec's first, and it had none), and a clamped entry is STATED next to the field** rather than applied behind it.

**AND EVERY NUMBER THE SCREEN DREW ABOUT IT WAS WRONG TOO**, in a way that reads as a frozen competition rather than as a rendering bug. `Yiiiiiiip` — FRIENDS, roster 2, `ACTIVE`, Aug 17 → Aug 20 — was on day 3 of 3, ending at local midnight:

- **The timeline is a WEEK grid, and Create Challenge sells 3-day runs.** `Forge Challenge.dc.html` draws week segments, and the screen was built to it literally — correct for the 4-week and 8-week presets it was drawn against, wrong for everything shorter. A 3-day duel got `ceil(3/7)` = **one** segment, filled by `elapsed / 7 days`, so **the bar could never pass 43% however far the season ran**, and the caption read **"Week 1 of 1" from the first hour to the last**. Two thirds of the way through, the athlete saw a barely-moved sliver and a line that had not changed since creation. Now: **one segment per day for any run of 14 days or fewer** (14 is where segments stop being legible on a phone), week segments beyond that — `Day 2 of 3 • 1 day remaining`.
- **"final day" was unreachable.** Tested as `ceil((end - now) / DAY) === 0`, true only in the instant of expiry — by which point the state flips to COMPLETED and the line is not drawn. **The branch had never once run**; every competition's last day read *"1 days remaining"*, plural included.
- **The arithmetic sat inline in a `.tsx`**, where nothing can load it under `node --test`. That is how it managed to be wrong three ways at once. It is now `src/domain/challenges/season.ts`, pure, with **13 unit tests written against this competition's real dates** — including one asserting that the three days of `Yiiiiiiip` produce three *different* captions, because one unchanging caption **is** the bug report.

**AND THE THREE STRUCTURAL FAULTS FOUND ON THE WAY, ALL REAL, ALL FIXED.** None caused this report; each would have caused it eventually.

**(1) `0165` SAID "FOUR OBJECTS". THERE ARE SIX.** `0059_challenges.sql` and `0087_friend_challenges.sql` both define the same set, and **0059's are SQUAD-ONLY**. 0165 restated and asserted four of them — `can_read_challenge`, `challenges_select`, `challenges_insert`, `challenge_participants_insert` — and its own header, 0059's ⛔ banner, and `challenge-join-agreement.test.mjs` all name that same four. **The two it missed are `challenge_hub()` and `advance_challenges()`**, and they are precisely the two that decide whether a competition moves at all. 0059's `advance_challenges` carries `and context = 'SQUAD' and is_squad_member(...)` on **both** clauses, so under that body a friends competition is never promoted and never completed: **the days do not progress and no winner is ever written.** Re-pasting 0059 is this project's *documented recovery procedure* — there is no CLI and no service key — so this is a trap, not a risk, and 0165 left two thirds of it open. **`0168` restates 0087's body verbatim (machine-diffed, not retyped) and asserts BOTH missed objects in both directions** — positive (`can_read_challenge` present) and negative (`is_squad_member` absent), because a body could gain the call and keep the gate.

**(2) THE ONE SCREEN IT WAS REACHABLE FROM WAS THE ONE SCREEN THAT COULD NOT FIX IT.** Only `/competitions` and the Trophy Case called `advance_challenges()`. But `challenge_hub()` lists exactly two things: competitions you have **not** joined (ENROLLMENT or ACTIVE) and ones you **have** (ACTIVE only). **A competition you created — so you are a participant — that is stuck in ENROLLMENT matches neither, and vanishes off the hub entirely.** The routes that survive are the inbox row and the push, both of which open `/challenge/<id>` — which advanced nothing. `fetchChallengeDetail` now advances before it reads, so opening the competition is enough to start it, finish it and crown it.

**(3) AND THE ANSWER WAS THROWN AWAY.** `await supabase.rpc('advance_challenges', …)` with no error check, in both call sites. **supabase-js rejects nothing** — it resolves `{ data, error }`. So a revoked grant, a raise inside the function, or a reverted body all rendered as a screen that looked completely healthy sitting next to a competition whose clock never moved. **That is why this survived 0163, 0164 and 0165.** One shared `advanceChallenges()` now *returns* the failure — it must not throw either, because a season you can still read and score is worth showing — and **both** competition screens render it as a plain sentence.

**THE CORONATION FIRES FROM THE SCREEN THAT CLOSES THE SEASON.** Because C-3 now advances on the way in, C-3 is very often the screen that actually completes a competition — an invited friend arrives from the inbox and the season ends as they land. It now opens `/podium/<id>` once per device for a finished, unplayed season, then hands off to C-4. ⚠ **No freshness gate on C-3, unlike the hub, and the difference is deliberate:** `podiumIsFresh` exists so a **list** cannot ambush you with a season that closed last month; opening a competition is not passing through, it is asking about that competition specifically, and its result is the answer. `markPodiumSeen` still holds it to once.

**AND THE HERO STOPPED LYING WHEN THE CLOCK AND THE STATE DISAGREE.** The same frozen-caption failure from the other end: an ENROLLMENT whose start was days ago read **"Starts in 0 days"** indefinitely, and an ACTIVE season past its end read **"final day"** forever. Overdue states are now named (`Starting now`, `The season is over — settling the final standings`, `Season complete`); seeing one should be brief, because the advance runs on the way in, so it usually means the advance **failed** — and the line below the hero now says why.

**WHAT THE `0168` REPORT ALSO SHOWED, for the record:** four FRIENDS competitions, all created 2026-08-17, all by Isa Altamirano. `Yiiiiiiip` (Moses Ruiz, **roster 2** — the only one anybody joined) and `Biiiiiig lifters` (Wes Price, roster 1, ends Aug 24) are ACTIVE; two `Biiiiiig Lifters`/`Biiiiiig lifters` duplicates are CANCELLED with 0 results, which is the 2026-08-17 `42501` story and is correct. **No competition is overdue in either direction.**

`tsc` 0 · **2,609 tests green** (36 new) · lint clean · **thirteen mutations applied, thirteen caught** — four on the lifecycle guards (C-3 stops advancing · the error goes back to being discarded · 0168 reverts to 0059's gate · C-3 stops opening the podium), five on the season clock (revert to the week grid · restore the unreachable final-day test · drop the singular · unclamp the current segment · drop the degenerate-window guard) and four on the duration floor (put 3 back · hardcode it in the clamp · remove the Daily preset · stop detecting a rewritten entry). ⚠ **One assertion was rewritten after it failed on its own documentation** — `doesNotMatch(/Math\.max\(3,/)` matched the comment *explaining* the defect as readily as a relapse, so it now reads the `durationDays` line alone.

⚠ **`0168` IS APPLIED. THE CLIENT IS NOT DEPLOYED** — all of it is OTA-safe and none of it has reached a device or the web preview yet.

**Files:** `src/domain/challenges/season.ts` (new) · `src/domain/challenges/__tests__/season.test.mjs` (new) · `src/app/create-challenge.tsx` · `src/app/challenge/[id].tsx` · `src/app/competitions.tsx` · `src/data/challenges-live.ts` · `src/data/trophy-case-live.ts` · `src/data/__tests__/challenge-lifecycle.test.mjs` (new) · `supabase/migrations/0168_challenge_lifecycle_reassert.sql` (new) · `supabase/apply/pending-0168.sql` (new) · `supabase/migrations/0059_challenges.sql` + `0165_challenge_policy_reassert.sql` (comment corrections — both said "four objects").

⚠ **THE EXISTING `Yiiiiiiip` IS STILL 3 DAYS.** `start_at`/`end_at` are written at creation and nothing here rewrites them — `context` and the window are immutable by design (CS-D5). It closes at local midnight tonight regardless. The fix applies to the next competition; **shortening this one would mean editing the row by hand, and it is on its final day anyway.**

### 0. ⭐ The landing page is Landing v6 — the product now introduces itself before the philosophy (2026-08-18, `site/index.html` — marketing site only, no app code, no migration, **NOT YET RE-UPLOADED to Cloudflare**)

**`site/index.html` was restructured from Landing v5 to Landing v6** against the design project's
`design_handoff_landing_v6/` bundle (`Forge Legacy Landing v6.dc.html` + its README change order).
A **change order, not a rebuild** — the visual language, the phone mocks, the imagery and most copy
are byte-identical; the page was sliced by line range, reassembled in the new order, and 27 asserted
string substitutions applied.

**Ten sections became thirteen, and the order is the point.** A stranger meets the product before the
philosophy: **§ 2 "What Forge Legacy actually is"** (new — four cards naming tracker / chapters /
rank / people) and **§ 3 "The part you use every morning"** (the active-workout mock, moved up from
§ 8) now land in the first two screens instead of two thirds down. **§ 8 Holt is new** — the biggest
gap between the product being built and the product the site sold. **Squads was demoted** out of the
"Difference N" series to § 9, because it was reading as a load-bearing pillar and someone who trains
alone should never wonder whether the app is for them. The old § 8 split in two, its feature grid and
credibility block landing in the new **§ 11 "The rest of it"** with *"What's real today"* demoted from
a card to a quiet rule — the migration and test counts now live only in the FAQ.

⚠ **Moving a section moves its background parity.** Four sections had to flip so `--fl-base` still
lands on 3, 5, 7, 9, 11, 13. ⚠ **`#chapters` / `#squads` / `#final` all still resolve** — they moved
from 3/5/10 to 5/9/13 and the ids travelled with them.

**Two behaviour bugs fixed.** The two decorative phone-scroll loops (44 s and 46 s) had **never been
gated** — they ran from page load, so a visitor reaching the squad mock arrived mid-loop at an
arbitrary frame. Both now declare `animation-play-state: paused` and the scene engine starts them at
frame zero when their section is first seen. And the hero CTA stack was pinned `align-items:
flex-start` on a phone-first page; it now centres below 760px and left-aligns above.

⚠ **TWO v6 ITEMS ARE DELIBERATELY NOT SHIPPED, AND THEY ARE THE SAME DECISION.** The design ships
live `<a href>` CTAs labelled **"Download for iPhone"** plus the sticky bottom bar. **There is still
no App Store listing**, so the 2026-08-16 PO decision stands: both CTAs remain non-interactive
`Coming to the App Store` spans and the sticky bar stays out. *Understating is safe; overstating is a
false claim on a public page.* The v6 labels are recorded in the § 1 comment so the launch swap is
mechanical — and note the hero and the final CTA now want **different** labels ("Download for iPhone"
vs "Start Chapter One", the latter because by § 13 the visitor has read Chapters and Sealed).

✅ **Holt's launch gate is clear**, which is why § 8 is present tense — Holt ships in the build this
page advertises. The gate is written into a comment above the section.

**Verified by rendering, not by reading**: 87 static checks pass; 0 horizontal overflow at 390 and
1280; 0 of 22 images broken; 0 of 41 unresolved tokens; all **98** animated elements settle; both
`--pcols` grids render 1 / 2 / 4 / 4 and never 3 + 1; `prefers-reduced-motion` reduces both loops to
computed `animation-name: none`; JS-off keeps the same height and all 1,472 words. Page is 169 KB
(438 KB with assets) against a 900 KB budget.

⚠ **THE LIVE SITE STILL SERVES v5.** `forgelegacy.app` is a Cloudflare Worker with static assets and
this change is local only. Re-upload the 25-file set (never the whole directory — `_exported-bundle.html`
is 4 MB and git-ignored), then re-verify `/` · `/support` · `/privacy` · `/terms` · `www` all 200.
⚠ **Re-measure the FAQ's 167 migrations / 2,552 tests on publish day** — both move weekly.

See `site/README.md` → *"The v6 restructure — 2026-08-18"* for the full section table, the launch-swap
table, and three headless-rendering traps that each look exactly like a real regression.

### 0. ⭐ Coach Holt answers the door — the new-user backlog closed, and the expert stopped being misjudged (2026-08-18, Home + Coach + Program Detail + Builder — CODE only, no migration, **DEPLOYED** `entry-bc6ff828`)

**Method:** three walkthroughs of the shipping app — cold start across all 87 routes, then as a never-trained / eighteen-month / fifteen-year athlete, then a stress test of the front door those produced. One consolidated backlog; every code item on it is now shipped and live. Each "outstanding" claim was re-verified against the working tree before being acted on rather than carried from notes.

**⚠ THE PASS BEFORE THIS ONE MADE THE EXPERT'S PROBLEM WORSE, AND THAT IS WHY IT LED HERE.** Repairing `CATALOG_ALIAS` turned *"Help me find one"* back on — which promoted the door that hands an advanced lifter **Strength Foundation II**, a block tagged `Intermediate` whose stated goals include *"improve gym confidence"*, from hidden to the second card on Home. The fix for it had been written up and not built.

**Shipped — the front door:**
- **Holt leads the Home starting-point card** — *"Build it with me"*. His open/closed flag moved into a small `CoachDoorProvider` so a screen can open him; the bubble still renders the sheet, because it owns the teaser rules and the workout/ceremony/tour suppression, and a second mounting would give the app two coaches that could both be open.
- **⚠ The door carries an INTENT.** Without it, tapping *"Build it with me"* opened his opener menu and asked somebody to say a second time what they had just said — the same defect already recorded against the old "Build me a program" chip. The opener list is suppressed entirely when the athlete arrived through a door that already answered it.
- **The quiet fallback points at Holt**, not the catalogue, so the app tells one story about who writes programs.

**Shipped — the beginner:**
- **Level asked before block length, and beginners are not asked the block length at all.** *"A block, or one week?"* is a question about programming structure; somebody who has never trained picks one and hopes. `weeks` is left undefined so the engine's own `defaultWeeksFor` decides. ⚠ The session-length question STAYS — *"how long have you got?"* is a diary question anyone can answer, and pruning it would have made their program worse.
- **Starting weights, as a method and never a number** (`startingLoadLine`) — empty bar / lightest pair you could do fifteen with / just you. Written into the build rather than said mid-set, because in-workout coaching is capped at **zero** on Free and anything said there could never reach the athletes who need it. A test fails if any digit or unit enters that copy.
- **"How did that feel?"** on the first set of a movement they have never done (`first-set.ts`) — five gates, once ever. ⚠ It does **not** reach past beginners: `intraSession` is false for every beginner cell on purpose and that decision is untouched. This asks rather than infers, and unlike the nudge it may go DOWN, because the athlete said so.
- **"How To" is loud on a first meeting** and recedes afterwards. 735 exercises carry published coaching and it was styled as a footnote.
- **"Ask me again"** replaces "Adjust it" for beginners — with a real rebuild behind it, not a softer label over the Builder.
- **Change my training level** — `forgetExperience()` had **zero callers**, so the first level an athlete ever gave was permanent.

**Shipped — the expert and the middle:**
- **`catalogServesLevel`** — the recommendation is withheld when the shelf holds nothing at the athlete's level, and the card says so. Data-driven off the program's own `difficulty`, and it only ever looks DOWNWARD (a beginner offered an Intermediate program is normal). A test asserts today's catalogue genuinely fails an advanced lifter, so authoring one turns it red.
- **"I've got a program already" is a door on Home**, straight to the paste importer — *"Build my own"* was the wrong promise for somebody who wants to bring one across.
- **Finishing a program offers what comes next** (`nextAfter`), on the sealed record. ⚠ **Existence-checked**: seven programs name a successor and **six of those names are unauthored**, so a miss hands to Holt rather than promising a program nobody wrote. `graduated`/`finished` only — never `ended_early`.
- **The specialisation blocks are reachable.** Squat Ascent, Bench Approach and Deadlift Measure were returned by **zero** of the 54 intake combinations and could not be — the intake has no *"I want a bigger bench"*. Offered at graduation instead, which is what their own design records call them: standalone blocks run BETWEEN general programs. Identified by `percentOfMax`, not an id list. ⚠ Deliberately **not** ranked into the alternates, which `recommendProgramOptions` documents a decision against.
- **The import counter is wired** — `markFreeImportUsed()` also had zero callers, so the one-import cap could never bite. Spent on a successful save only; an abandoned paste costs nothing.

**Also shipped:** password reset both halves (recovery outranks the session in `routeFor`, or the emailed link lands on Home); Terms/Privacy tappable where consent is given; onboarding's avatar picker and its unreachable back chevron; the handle skip naming its cost; `Difficulty → Technique` on both filter sheets; running experience derived from base mileage rather than one chip setting both.

**Verified:** `tsc --noEmit` clean · **2,544 domain tests, 0 failing** (from 2,497) · `expo lint` at baseline (1 pre-existing error in `use-color-scheme.web.ts`) · deployed and confirmed by hash AND by grepping the served bundle for the new copy.

**⚠ OPEN — decisions, not code.** The free in-workout Holt cap is still **0**, so the one capability that lands at the moment of highest need converts nobody (`entitlement_config.free_caps`, one value, no deploy). The Technique rename covers both filter sheets but not W-22's detail chip, which W22-D15 governs — the two now disagree and an amendment is owed either way.

**⚠ OPEN — content, Production Standard.** **15 of 18** dumbbell answers resolve to Bodyweight Foundation, a program that ignores the equipment they said they own. **1 of 14** programs is tagged Advanced and it is conditioning — the root cause of the expert fix above. The Running family is unauthored, though Holt generates all five race distances with zero refusals, so that gap is the catalogue's alone.

**⚠ PROCESS.** `eas` is on no PATH here — `npx eas-cli@latest deploy --prod` is the working command, and `npx eas` fails with a confusing *"could not determine executable to run"*. **The first deploy of a session reported success and silently did not take** — its own deployment URL 404'd while production kept serving the old bundle. Always verify the served `entry-<hash>.js` against the build; the CLI's 🎉 is not evidence.

### 0. ⭐ The cold start — a new athlete could not be recommended anything, and a forgotten password had no way back (2026-08-17, Onboarding + Auth + Catalog — CODE only, no migration, OTA-safe)

**Method:** the app walked cold as a brand-new user across all **87** routes — boot router, both auth steps, onboarding, every tab's empty state, the first freestyle workout, the social surfaces and the paywall. Every finding was verified against the code rather than reported from reading, and **two of the eight were already fixed** — they are recorded below as such rather than quietly re-done.

**⚠ THE HEADLINE WAS A DATA GAP WEARING A FEATURE GAP'S CLOTHES.** `catalogCanRecommend()` was false, so Home's starting-point card never drew *"Help me find one"* and a beginner's only doors were freestyle, build-your-own and browse — three doors that each assume they already know what to train. The cause was not the guard, which is correct and well argued: `CATALOG_ALIAS` mapped **3 ids, all strength, all gym**, while **14 programs** shipped. Measured before anything changed: **51 of 54** goal × experience × access combinations resolved to a program that does not exist and fell through to Strength Foundation I.

**Shipped:**
- **`CATALOG_ALIAS` extended to the catalog that actually ships** — Bodyweight Foundation, Close Quarters, Muscle Building Intermediate, Frame by Frame, Athletic Conditioning Foundation, Iron & Engine and Mobility Foundation are reachable from the intake for the first time. **All 54 combinations now resolve into the catalog**; `canRecommend()` is true.
- **The home and bodyweight tiers stopped borrowing gym ids** (`intendedProgramId`). `fbh-full-body-3` and `cond-circuit` each meant two access tiers at once, which is precisely why neither could be aliased honestly — one entry cannot answer a dumbbells-only athlete and a commercial-gym athlete. New test: **home and bodyweight access never resolve to a barbell program**.
- **⚠ `canRecommend` now follows the alias to its TARGET.** It accepted the mere *existence* of an alias entry — safe only while the table was nearly empty. Filling the table in to open the on-ramp would have made the guard return true for **any** catalog, including an empty one. It is now stricter than it was, not looser.
- **Endurance resolves to Conditioning — a judgement, recorded as one.** The `run-*` ids have nothing behind them and the Running family is genuinely unauthored. But the intake never asks about running: it offers *"Improve Endurance — go longer. Build your engine and stamina."*, which is the question Athletic Conditioning Foundation and Iron & Engine are written to answer. Re-point three alias lines when the Running family lands.
- **Password reset, both halves.** `resetPassword()` had been wired to Supabase since Gate B with **zero callers** — the screen was never built, so forgetting a password meant abandoning the record the product exists to keep. Added `forgot` / `sent` / `reset` steps. ⚠ **The emailed link SIGNS YOU IN**, so `routeFor` now tests `recovering` *ahead of* every session rule; without it the athlete lands on Home holding a session they cannot reproduce, still not knowing their password. `updatePassword` clears the flag only on success.
- **Terms and Privacy are tappable where consent is actually given** — flat text on the create-account screen, readable only from Account Settings, which needs the account not yet made. Same `LEGAL` copy, same sheet; nothing forked. App Store review asks for this.
- **Create Account says why it will not submit** — the button sat silently disabled behind an 8-character rule stated only in a placeholder that vanishes as you type. Plus a Show/Hide toggle, absent entirely.
- **Onboarding's two dead affordances.** The avatar sat under *"Add a photo"* in a plain `View`, with `photoUri: null` hard-coded and the picker called "a fast-follow" — now wired to `useMediaPicker`. And the progress header rendered on `idx >= 0`, which is `-1` on the transition step: **the back chevron never rendered on the final screen**, making "Enter Forge" a one-way door and its own `step === 'transition'` branch unreachable code.
- **The handle skip names its cost** — handle search is the only way anyone can add you (SOC-D15), and Edit Profile has always said so, *months later*, to somebody who already hit it. The sentence now appears at the decision.
- **`Difficulty` → `Technique` in both filter sheets**, with a hint: *"How demanding the movement is to perform well — not how fit you need to be."* Read as fitness, a beginner filters to `Beginner` on their first visit and removes most of a catalogue that is 590/733 Intermediate. **Data unchanged — the tags are correct, the word was wrong.**

**Checked and already correct — no change made:**
- **The Home Gym prompt at the first picker already exists** — unconditional in the picker header, fires exactly when `ownedGear === null`, dismissible, both doors offered.
- **Both dev harnesses already redirect on `!__DEV__`**, and Metro strips their bodies from the production bundle.
- **The tour is not a gap** — 101 anchors across 28 surfaces, every declared anchor rung by an authored step, replayable from Account Settings, teaching *decisions* rather than button locations.

**Verified:** `tsc --noEmit` clean · **2,518 domain tests, 0 failing** (was 2,497 — the recommendation suite was rewritten to read the catalog off disk instead of asserting a hand-listed idea of it, which is how it drifted in the first place) · `expo lint` at baseline (1 pre-existing error in `use-color-scheme.web.ts`, untouched).

**⚠ OPEN — the next content gap.** **18 of 54** combinations (every dumbbells answer except muscle) resolve to Bodyweight Foundation, because the catalog holds exactly one dumbbell program. The direction is safe — it never prescribes gear they lack — but a dumbbell owner asking for strength is under-served. One dumbbell strength or conditioning block closes it.

**⚠ OPEN — spec amendment owed.** W-21/W-22/W-23 all name "Difficulty" as a filter category and **W22-D15** governs the detail-screen chip, which was deliberately **left alone**. The filter and the exercise-detail row therefore disagree today. Needs a PO ruling on whether the rename extends to W-22.

**⚠ SEQUENCING.** Coach Holt is premium-gated. Flipping `entitlement_config.default_tier` to `FREE` *before* this pass would have left a free new athlete with no recommender **and** no coach.

### 0. ⭐ Business operations — the support channel, and the programs panel that was fabricating drop-offs (2026-08-17, `0166` + `0167` **APPLIED — verified 2026-08-18** · app code OTA-safe · site NOT redeployed)

> **✅ CORRECTED 2026-08-18: BOTH MIGRATIONS ARE APPLIED.** This heading read *"AUTHORED NOT APPLIED"* and was stale in the **"still to do"** direction — the same failure as the eleven applied files once listed as pending, and the reason `supabase/apply/preflight-*.sql` exists at all. Asked of the live catalogue rather than the ledger by `supabase/apply/preflight-0166-0167.sql`: all six objects report `PRESENT` — `admin_feature_adoption` (0166), and `feedback`, `is_app_admin`, `admin_guard`, `feedback_tg_rate_limit`, `feedback_tg_touch` (0167).
>
> It was checked because the web deploy was about to ship `feedback-live.ts` and the "Send Feedback" settings row against them. Had the note been true, that button would have errored on tap for every athlete.

**The ask was "a dashboard for literally everything about the business."** The answer was that four of the six things named — revenue, crashes, support, suggestions — **generate no data at all**, so panels for them would render `0` and a `0` reads as a fact. Order inverted: turn on collection now, build the viewing page after launch. Decisions taken: the business dashboard will live as a password-protected page on **forgelegacy.app** reusing the `app_admins` gate (not in the app); **pre-launch is data-gaps only**; website scope is **traffic visibility only**, no CMS.

**⚠ TWO NUMBERS ON THE SHIPPED DASHBOARD WERE WRONG, AND ONE WAS FABRICATED.** `admin_feature_adoption` (0130:533) still hardcoded the pre-`0155` enum. Completed short programs were invisible — the `finished` key was never emitted and `num()` coerces a missing key to `0` — and worse, the drop-off exclusion read `state in ('graduated','ended_early')`, so **every successfully finished short program untouched for 21 days was counted as somebody who quit**. The panel did not read low; it invented abandonment out of completions. ⚠ The comment at `admin-live.ts:373` promised the fix landed in "migration 0157" and named `admin_program_metrics` — `0157` is `week_templates` and **no such function has ever existed**. It was never written. The on-screen subtitle had meanwhile always claimed *"and not finished"*, so the copy had been describing behaviour the SQL never had.

**Shipped:**
- **`0166_admin_programs_finished.sql`** — `finished` becomes its own bucket and joins the drop-off exclusion. ⚠ Kept **separate from `graduated`, never summed**: D-RCM-30 gives a sub-4-week program no rank credit, and `honor_metrics()` / `rank-live.ts` both filter `state = 'graduated'` — merging them would make the dashboard disagree with the rank engine. Label corrected from "Weeks completed" (which counted *programs*) to "Finished (under 4 weeks)".
- **`0167_feedback.sql`** — `feedback` table, RLS (insert-own/select-own, **no UPDATE or DELETE** so a report cannot be edited after we read it), a 6-per-hour rate-limit trigger that **raises rather than dropping**, an operator push reusing `0137` verbatim, `admin_feedback()` and `admin_feedback_set_status()`. ⚠ **`body` is deliberate free text** — the exact inverse of `app_events`/P6-A1-D3, and the one table in the schema that stores words the athlete wrote. The header says so, twice, because a future reader will otherwise "fix" it with `sanitizeProps`.
- **`/feedback` screen + `site/support.html`** — one work item, two obligations. Apple requires a **Support URL** and rejects a bare `mailto:`; before this the only support touchpoint in the entire binary was a sentence of copy inside the privacy sheet. Settings row added to the **existing `about` section** (relabelled "Help & About") because `content.test.mjs:97`/`:125` assert the exact section-key array.
- **Disclosure shipped FIRST, per P6-A1-D8** — `site/privacy.html` §2 "Support messages and feedback", with the matching in-app summary line, both written before the migration was authored.
- **`Docs/Business-Operations-Map.md`** — identity block, systems map, and the dated deadline calendar (**Zions auto-closes 2026-08-31**, D-U-N-S propagation, Apple conversion, §9b, Utah annual renewal).

**Two pre-existing gaps found and closed on the way:** `admin_recent_signups` (0137) **was never added to `supabase/seed/admin-roundtrip.mjs`** despite 0130's standing rule — the one guard that catches a missing `admin_guard()` had a hole in it for 30 migrations. And Cloudflare Zone Analytics **has been collecting website traffic since 2026-08-16**; that was never a gap, only a discoverability one, so no beacon was added and none should be.

**Gate:** typecheck clean · **2515/2515 tests pass** · lint back at baseline (1 pre-existing error in `use-color-scheme.web.ts`, 13 warnings, none from these files).

⛔ **NOT DONE UNTIL:** `0166` then `0167` are pasted (each self-checks), the site is re-uploaded with the now-**25** staged files, and `curl -I https://forgelegacy.app/support` returns **200**. Nothing here touches `package.json`/`app.json`/`eas.json`, so the fingerprint is unmoved and the app half is OTA-deliverable — confirm with `fingerprint:compare` anyway.

**Still on hold by decision:** crash capture (Tier 1.1 — genuinely lost forever while open, and Apple's free crash reporting sees **no** JavaScript errors), the RevenueCat receiver (RevenueCat's own dashboard records every sale regardless), review fetching (Apple retains the history), and the unified ops page (pointless before revenue exists).

### 0. ⭐ Holt's two-exercise program — the difficulty filter met a catalogue where `Intermediate` means "normal" (2026-08-17, Coach Holt — CODE only, no migration, OTA-safe)

**PO report:** *"I put in to build me a program, home gym with dumbbells and a mat and a bench, and lower back pain, and he gave me two exercises throughout the whole workout… there is plenty to do with body weight and dumbbells."* Reproduced exactly against the real 733-record catalogue before anything was changed.

**⚠ THE EQUIPMENT AND THE BAD BACK WERE BOTH INNOCENT.** That room reaches **214** movements and `lower_back` costs 18 of them. What emptied the program was `difficultyRank` barring anything above the athlete's stated level, meeting a catalogue whose difficulty field is not a readiness scale: **Intermediate 590 · Beginner 121 · Advanced 22**. `Intermediate` is the default bucket — **Push-Up, Plank, Bodyweight Squat and Dumbbell Biceps Curl all carry it** — so `beginner` cut 214 reachable movements to **19**, holding **zero** horizontal push, zero pull of either kind, zero curls, zero triceps, zero calves and zero shoulder isolation. Every one of those slots was dropped and the block shipped as *Box Squat to Bench · Seated Dumbbell Shoulder Press · Dead Bug*, identical on all three days, for eight weeks.

**Shipped:**
- **`STRETCH_CEILING` (`candidates.ts`)** — the floor of the ceiling rises to `Intermediate`, and **only as a SECOND pass**: a beginner is still offered every beginner-tagged movement first and reaches past their level only for a pattern that holds nothing at their level at all. **`Advanced` stays a hard gate** — those 22 records are muscle-ups, levers and one-arm work. ⚠ The difficulty ladder is walked **before** the pattern is relaxed, so an empty beginner push slot gets a *push-up*, not a shoulder press.
- **`stretched` reported, never swallowed** — new `AssemblyNote` kind, `DayResult.stretched`, and a one-sentence line in the wizard naming the movements and saying to start light.
- **The assembler's own floor** — was `main.length === 0`; now `MIN_DAY_MOVEMENTS`, the same constant the single-day path got on 2026-08-14 and the assembler never inherited. ⚠ Honestly a backstop, **not what fixed this report** (a 3-movement day clears a floor of 3 by nothing). ⚠ Deliberately **not** the PAS-D11 floor of 4–5, which `validate-program.ts` already handles as a *deviation*.
- **`LIMITATION_KEEP_KEYS` — PO decision.** `lower_back` banned `Hinge / Hip Dominant` whole, taking **all 13** supine bridge/thrust rows with it: eight weeks for a bad back with zero posterior-chain hip extension. The family is re-admitted; deadlifts, RDLs, sumo, swings, good mornings, back extensions, supermans and all four carries stay out.
- **`LIMITATION_EXCLUDE_KEYS` — PO decision.** Found by measurement: a shoulders-limited athlete at a full gym was prescribed *Band Upright Row · Kettlebell Clean and Press · Barbell Upright Row*. A pattern ban could never reach those — an upright row is filed as a **pull**, and the jerks/snatches/clean-and-presses are filed as **Power**. Both lists now excluded for `shoulders`, the overhead-finishing half also for `no_overhead`. Rear delt flies and plain cleans deliberately kept. That day is now *Face Pull · Rear Delt Fly*. ⚠ This was **live for intermediate and advanced athletes the whole time** — the beginner starvation was hiding it behind a refusal.

**Measured, not asserted:** 54,000 program combinations across six rooms — **0 refusals, thinnest day shipped anywhere = 4**. Thin-day sweep: full gym **0/3,000**, the PO's room **0/3,000**; the only remaining refusals are dumbbells-only-with-a-shoulder-complaint (120/3,000) and the bodyweight pull day the catalogue genuinely cannot fill.

`tsc` 0 · **2,497 tests green** (10 new + 2 inverted). ⚠ Two thin-day assertions **inverted on purpose** and say so inline: the "only full-gym refusal" was a starved filter reading as a coaching decision, not a shoulder judgement.

**Files:** `src/domain/coach/candidates.ts` · `src/domain/coach/day.ts` · `src/domain/coach/assemble.ts` · `src/domain/coach/rulebook/limitations.ts` · `src/app/coach.tsx` · `src/domain/coach/__tests__/difficulty-stretch.test.mjs` (new) · `src/domain/coach/__tests__/limitation-keys.test.mjs` (new) · `src/domain/coach/__tests__/thin-day.test.mjs`.

⚠ **CORRECTED SAME DAY — there is no re-tagging job here, and the first version of this entry claimed there was.** It read *"the real long-term fix is the catalogue… 590 of 733 are Intermediate because that is the import's default, not because somebody judged them."* That was inferred from the distribution alone and it is **wrong**. Reading which records carry which tag shows the field is coherent and encodes **technique demand**, not trainee readiness:

- Barbell **Box** Squat `Beginner` vs Barbell Back Squat `Intermediate` — the box removes the depth judgement. A real distinction, correctly made.
- Smith machine **15/15** Beginner · selectorized **56 Beg / 21 Int** · dumbbell **5/85** · cable **5/80**. Guided path = Beginner; you-control-the-path = Intermediate.
- All 22 `Advanced` are muscle-ups, front/back levers, planches, snatches, pistols, Turkish get-ups, Nordic curls, dragon flag. Not one questionable call.
- Every push-up variant **and** every bench variant is `Intermediate`, consistently.

So a push-up tagged `Intermediate` is not a mistagging — pressing under your own control is a tier above a chest-press machine. **Re-tagging it to `Beginner` would put it level with Machine Chest Press and delete true information**, at a cost of 733 records of judgement against an append/annotate-only dataset, to fix something that was one filter asking the field a question it never claimed to answer. `STRETCH_CEILING` is the correct and complete fix, not a compensation for bad data.

⚠ **The one residual, and it is a LABEL not a value.** `src/app/exercise/[id].tsx:75` renders *"Difficulty: Intermediate"* on a push-up and `src/app/exercise-library.tsx:451` labels the facet "Difficulty" — which reads to an athlete as *"not for beginners"*. "Technique" or "Skill" would be truthful. ⛔ **NOT a free rename:** "Difficulty chip" is specified in Component-Library-Architecture-v1.0 (CLA-D2, colour+label pairing), there is a `color.difficulty.*` token family, and it appears in the `.dc` specs. It is a design-spec amendment awaiting a PO call. (Unrelated to **PAS-R1 Difficulty Calibration**, which is about *program* positioning across the 24-program catalogue, not exercise records.)

### 0. `42501` on Join — RESOLVED: the competition had been CALLED OFF, and the screen was still offering it (2026-08-17, C-1 — CODE only, no migration, OTA-safe; `0165` shipped as hardening and is NOT needed)

**PO screenshot, after 0163+0164 were applied and deployed:** the invitee sees *Biiiiiig Lifters* under **Open to Join** — correctly labelled `underway`, so 0163 works — taps **Join**, and gets `new row violates row-level security policy for table "challenge_participants" (42501)`.

**⚠ THE DATABASE WAS RIGHT.** The diagnostic's §5 returned it in one line: **`Biiiiiig Lifters` — `state = CANCELLED`** (and a duplicate `Biiiiiig lifters`, also cancelled; only `Yiiiiiiip` was ACTIVE). `challenge_participants_insert` allows ENROLLMENT and ACTIVE, so it refused, correctly. **There was never an RLS bug.**

**The actual defect is a stale list plus a raw error.** `challenge_hub()`'s open list is a **snapshot**; the policy is **live**. The creator called the competition off (`cancel_challenge`, 0067) while the invitee's Competitions screen sat open, so the row and its Join button stayed on screen — and the failure then reached the athlete as a Postgres error code, which reads as the app being broken rather than as the answer to a question that had gone stale. ⚠ **Unavoidable by construction and not worth engineering away** — any snapshot can go stale between render and tap. What was wrong is how it was *answered*.

**Fixed at the one place both Join surfaces share.** `joinChallenge` now translates `42501` → *"This competition isn't open any more — it was called off or has finished."* and `23505` → *"You're already in this one."* (the same race from the other side: a double tap, or a join that already landed). Translated in the data layer rather than at the call sites so the hub row and C-3's Join button cannot drift apart. **And both call sites now `refetch()` on failure** — explaining the refusal while leaving the dead row on screen with its button still lit invites the identical tap again, so the refresh is part of the answer, not cleanup after it.

**⚠ THE TRAP THAT WAS FOUND ON THE WAY, AND IT IS REAL WHETHER OR NOT IT CAUSED THIS.** `0059_challenges.sql` and `0087_friend_challenges.sql` **both** define `can_read_challenge`, `challenges_select`, `challenges_insert` and `challenge_participants_insert` — and **0059's four are SQUAD-ONLY** (`c.context = 'SQUAD'`). Both files are idempotent, and **re-pasting an old migration to recover a half-applied run is this project's documented recovery procedure**, because there is no CLI and no service key. So one re-paste of 0059 silently makes **every friends competition in the database unjoinable**, presenting as precisely this error — while the hub keeps offering it, because the hub is a definer function that never asks. ⚠ **Evidence argues against it being the cause here** (0059 would have reverted `challenges_insert` in the same breath, and creating the competition plainly worked), which is why it is hardened rather than declared.

**Shipped:**
- **`supabase/apply/diagnose-challenge-join-42501.sql`** — zero-edit, **read-only**, run it in the SQL editor. §1 settles the 0059-reversion question in one row; §4 evaluates every clause of the policy per invited athlete (`in_invited_ids` · `state_ok` · `can_select_row` · `already_joined`); §6 says what each answer means. The leading remaining candidate is **the device signed in as a different account from the one named in `invited_ids`** — which no migration can or should fix.
- **`0165_challenge_policy_reassert.sql`** — restates 0087's four bodies **verbatim** (machine-diffed against 0087, not retyped) and then **asserts all four still name FRIENDS**, so a reversion can never again be silent. On a healthy database it changes nothing. ⚠ Only worth running if the diagnostic's §1 says ⛔.
- **A ⛔ supersession warning at the top of `0059`** — 14 comment lines, no SQL touched. It is the only guard that reaches somebody about to paste that file.
- **`src/data/__tests__/challenge-policy-supersession.test.mjs`** — the newest definition of each of the four objects must name FRIENDS, the insert policy must keep allowing `ACTIVE` (0163's Join row depends on it), and 0059 must keep its warning. Catches a *future* migration rebuilding one from 0059's body — the 0088/0092/0106 mistake, one table over.

`tsc` 0 · lint clean · **2,497 tests green** (5 new) · **eight mutations applied, eight caught** — after one SURVIVED and was fixed: rewriting the `42501` arm to `throw error` stayed green because a fixed-length slice from `'42501'` ran into the `'23505'` arm below it and matched *its* sentence. The assertion now reads one line per arm. That hole was invisible to everything except mutation.

⚠ **`0165` IS NOT THE FIX AND IS NOT NEEDED HERE** — the diagnostic's §1 would have shown 0087 live. It ships as hardening against the trap found on the way, and can be run at any time or not at all.

**Files:** `src/data/challenges-live.ts` · `src/app/competitions.tsx` · `src/app/challenge/[id].tsx` · `src/data/__tests__/challenge-join-agreement.test.mjs` (new) · `supabase/apply/diagnose-challenge-join-42501.sql` (new) · `supabase/migrations/0165_challenge_policy_reassert.sql` (new) · `supabase/migrations/0059_challenges.sql` (comment only).

**ALSO IN THIS PASS — the crown nobody could see.** PO: *"make the crown 75% brighter cause I can't see it at all."* C-3's `CrownArt` was on the design's **0.34** → now **0.60**. ⚠ **The design's figure was not wrong, it was measured against a flat page**; this hero stacks the crown over `SCREEN_BG`'s stone texture AND under the hero vignette, and the two together ate it on a phone. Noted at both the call site and the prop, because any opacity copied from a `.dc` that assumes a background this screen does not have is a starting point rather than a value. ⚠ **C-4 left at 0.52 deliberately** — nobody has seen a finished season on a device, so C-3 is currently the brighter of the two and the design's "settles more revealed than it emerges" ordering is inverted until somebody looks.

**✅ DEPLOYED AND VERIFIED ON BOTH SURFACES (2026-08-17).** Web: `forgelegacy.expo.app` **200**, `entry-31ed833e01f5d9ac2283a247249e074e.js`, **md5 byte-identical to local `dist`**, live file contains `was called off or has finished`, `already in this one` and `Join This Competition`. Phone: OTA on iOS runtime **`411fd2b68cbe…`** = build 6's; Android on `a8afa07c…`; **`fingerprint:compare` ✅ matched beforehand.** ⚠ **TWO PRE-DEPLOY CHECKS FAILED AND BOTH WERE THE CHECK'S FAULT, NOT THE CODE'S** — worth recording because either could have been "fixed" by breaking something: the 42501 sentence appeared absent because its curly apostrophe (`U+2019`) is escaped in the bundle, and the coach marker appeared absent because the string chosen was an **assertion message in a `.test.mjs`**, which is never bundled. Re-checked against a substring past the apostrophe, and against `limitations.ts`'s object keys (`Shoulder Isolation`, `no_overhead` — property names survive minification, function names do not).

⚠ **THIS DEPLOY ALSO SHIPPED ANOTHER SESSION'S UNCOMMITTED COACH WORK**, with the PO's approval: `limitations.ts`'s keep/exclude tables, `difficultyAllows`/`canStretch`, and `coach.tsx` — 426 lines across 6 files, 424 coach tests green, no TODO/stub/debug markers. **Confirmed NOT in the earlier deploy** (its string literals were absent from that bundle), so this was its first release. Nobody has exercised it on a device — open Coach Holt and check a generated day.

### 0. The competition invite reaches a phone, and accepting one tells the person who sent it — Decision Queue #24 RESOLVED (2026-08-17, P-5 amendment — **MIGRATION `0164` REQUIRED**, code is OTA-safe)

The two halves 0163 deliberately left as a decision rather than a repair. **PO approved both.** ⚠ **`supabase/apply/pending-0164.sql` must be run in the Supabase SQL editor — RUN AFTER 0163.**

**(1) `challenge_updates` (off) is RETIRED; `challenge_invites` (ON) replaces it — a rename, not a split.** The old toggle read *"Invitations and standing changes in your competitions"* and was filed under P-5 §3.2a as ambient. **Wrong shelf: there are no standing-change notifications and there never have been** — no branch of the union emits one. So an ambient-sounding label describing a category that does not exist was what justified silencing the half that is not ambient at all: somebody putting your name in a competition, which is §3.2b's *"a direct request stays on"* exactly. **Splitting it would have left the old key governing nothing**, and `notifications.ts` records inert controls as the reason 0120 deleted four ceremony toggles outright. **Both directions ride one key**, precedent being `friend_request`/`friend_accepted` sharing `friend_requests` since 0073. ⚠ **An explicit opt-out is carried across the rename** (§5 of the migration): an athlete who deliberately switched Challenge Updates OFF is not switched back on by a key change; one who never touched it takes the new default.

**(2) Branch 17, `challenge_joined` — somebody opted into a competition you created.** There was no such event anywhere, push or inbox: from 0087 to 0164 an invitation could be **sent and accepted with the sender told neither**, and the creator found out by opening the competition and counting the roster. **Not fan-out** — one join notifies exactly one person. **Bounded twice:** 14 days like every written branch, AND the competition's own state, or a COMPLETED season would keep its whole roster in the creator's inbox permanently. ⚠ **No `challenge_left`, ever** — CS-D3 says withdrawal leaves no trace, and "somebody quit your competition" is the anti-shame rule broken from the other end.

**⚠ The trigger runs inside somebody else's transaction.** `challenge_participants` is written by the JOINING athlete, so an unhandled raise in the fan-out would roll back their opt-in and present as *"Join does nothing"* — the Finish Workout failure (0150) with a different verb. Exception block, and an early return when the joiner is the creator (`createChallenge` inserts your own row first).

**⚠ FOUND ON THE WAY — 0153's two training kinds have been pushed to devices and dropped from `/inbox` for eleven migrations.** `KINDS` in `notifications-live.ts` is an allow-list and `asKind` silently skips anything not on it; `squad_training_started`/`squad_training_finished` were never added, so every one of them rendered on a lock screen and by nothing in the app. Added, with the omission documented at the list — 0164's kind was one line away from the same fate.

**Test work, because the contract file is the only place the client and the sender meet.** `push.test.mjs` repointed (`SQL` → 0164 for the union/sender/preferences, `SQL_0153` kept for the training triggers and `set_squad_notify`, 0163 + 0164 added to `BUNDLES`), the branch list taken to seventeen, and **two new guards written after mutation-testing showed the gaps**: *every pushable kind has a title and a body in the sender* (title/body have no `else` arm, so a missing kind writes NULL into a NOT NULL column and raises **inside the caller's transaction** — deleting `challenge_joined`'s arms left every other assertion green), and *a competition notifies while it can still be joined, and not one day longer* (reverting 0163's `ENROLLMENT`-or-`ACTIVE` gate, or blowing branch 17's window open, both survived the suite before this).

`tsc` 0 · **2,473 tests green** (2 new) · lint clean · **nine mutations applied to the migration and its bundle together, nine caught** — the first pass reported false confidence because any edit to the migration also failed the verbatim-bundle check, so the bundle was mutated in lockstep to isolate each guard.

**Files:** `supabase/migrations/0164_challenge_joined_and_invite_push.sql` (new) · `supabase/apply/pending-0164.sql` + `pending-0163.sql` (new, paste-ready) · `src/domain/settings/notifications.ts` · `src/domain/notifications/destination.ts` · `src/data/notifications-live.ts` · `src/app/inbox.tsx` · `src/domain/notifications/__tests__/push.test.mjs` · `src/domain/settings/__tests__/ecosystem.test.mjs`.

**✅ 0163 AND 0164 BOTH APPLIED BY THE PO (2026-08-17), AND DEPLOYED AND VERIFIED ON BOTH SURFACES.** Web: `forgelegacy.expo.app` **200**, serving `entry-c2192eafaa51e8a672de8a87abc9a1ab.js` — **md5 byte-identical to local `dist`**, and the downloaded live file contains `challenge_joined`, `challenge_invites`, `Join This Competition`, `underway` and `See the roster`. ⚠ **The deploy log again went `Preparing project → Creating deployment` with no upload step** — this project's recorded tell for an empty deploy — so the deployment-specific URL (`forgelegacy--70a3wm0ytb`) was curled as well as prod; both 200 on the same hash, so it was fine. Phone: `eas update --branch production --environment production` published on iOS runtime **`411fd2b68cbe…`**, which *is* build 6's (`078d2838`, commit `aaee846c`) — the runtime version in the output is the only evidence of deliverability. Android published separately on `a8afa07c…`. ⚠ **`fingerprint:compare` was run BEFORE publishing and reported `✅ matches`** — the trap stayed closed. The `*` on the commit in the publish output is the uncommitted working tree, which is where these changes still live.


### Older entries — `Docs/Status-Archive-2026-08.md`

The 42 entries before this point moved there on 2026-08-18, 2026-08-19 and 2026-08-20, **verbatim**. Nothing was deleted or
summarised.

This section had grown to 48 entries and 4,378 lines — **81% of a dashboard `AGENTS.md` requires every
session to read first**, all of it written in the single week of 11-18 August. Keeping the 15 most recent
is what "recent" means; the rest is history, and history reads better one file back.

> When the dashboard does not explain why something was built the way it was, the answer is very often in
> the archive. Several of those entries are the only record of a decision.

## 🎯 Next Milestones (prioritized roadmap)

Only the highest-value remaining work. Each milestone gates the next.

```
✅ DONE — V1 Architecture Freeze (2026-06-30) · all 21 rows Complete
✅ DONE — App skeleton + core vertical build:
   └─ Supabase backend (auth + core persistence + RPCs, 24 migrations, RLS) · 4-tab shell
   └─ Onboarding (identity-only) + the first-run on-ramp (intake → recommend → guided tour → First Honor Ceremony)
   └─ Home · Workouts · Legacy · Honors Hub · Active-Workout logger + Workout-Complete · Program Builder
   └─ Persisted Initiative honor · web preview live (forgelegacy.expo.app)
        ↓
▶ CURRENT MILESTONE — Social + Goals backends (unblock the built placeholder screens)
   └─ friendships / squad_members tables + RLS + add/join/check-in RPCs → Friends · Squads · Squad/Post/Athlete Detail
   └─ Goals backend (goal CRUD + progress) → Goal Hub + Home's Mission tile
        ↓
■ NEXT MILESTONE — Remaining systems + content
   └─ Progress Hub (P-2) + Rank surfaces · Settings (P-4–P-9) · Exercise Library/Picker (W-21–W-28) · Activity History (W-18/19) · Chapter sealing · Photos/Transformation (L-15/L-17)
   └─ Content: remaining ~22 programs · exercise media/animation · more honor-catalog data
        ↓
□ FUTURE — Challenges/Competition · Notifications · Search · Phase-4 real artwork
```

> **Note:** Architecture is FROZEN and implementation is well underway (Supabase backend + ~18 screens + first-run on-ramp live). The old "do not start code" gate is retired — the sequencing above is the forward build order.

---

## 📈 Project Statistics

| Statistic | Count |
|---|---:|
| Total documentation files (`Docs/**/*.md`) | **257** |
| Docs mentioning LOCKED | ~208 |
| Amendments (`Docs/Amendments/`) | **42** |
| Remaining architecture docs to author (infra) | 0 — all Architecture Freeze rows ✅ |
| **Program packages generated as data** | **2 of 24** ⚠ largest content gap |
| Program family folders populated | 1 of 9 |
| **Exercise catalog** | **797** (was long cited as 794) |
| **Exercise coaching content** | **735 Published · 62 Needs Review** of 797 (92%) |
| Exercise media produced | **0 of 797** ⚠ second-largest content gap |
| Honors — awardable rows in `honor_catalog` | **139** (table-driven; most new honors are ROWS, not code) |
| Honor / badge artwork produced | 7 rank-family badge sets shipped; honor medallions still 0 |
| Screens specified (MVP) / **built** | ~80 / **72** |
| Git commits (total) | **210** |
| Tests (`node --test`) | **508** across 40 files (all green) |
| Source size (tracked) | **430 TS/TSX · 87,450 LOC** |

## 📋 Repository Evidence Snapshot

| Metric | Value |
|---|---|
| `Docs/**/*.md` (all, tracked) | **257** (286 files total under `Docs/`) |
| `Docs/Amendments/*.md` | **42** |
| Docs mentioning `LOCKED` | ~208 |
| Program packages (`.docx`) | 9 family folders (Strength populated; 8 empty) |
| **App screens** (`src/app/**/*.tsx`, excl. layouts + `+html`) | **72** |
| `src/` source | **430 tracked TS/TSX · 87,450 LOC** (150 components · 68 domain modules · 39 data modules) |
| Migrations | **105** (`0001`–`0105`) — **ALL APPLIED** (`0103`–`0105` on 2026-08-03 via `supabase/apply/pending-0103-0105.sql`, one transaction, self-checks green). Anything new starts at **0106**. |
| Git commits | **210 total** · HEAD `d5a0db3` |
| Tests | **819** (`node --test`, all green) |
| Lint (`npx eslint src`) | **1 pre-existing error** (`use-color-scheme.web.ts`, react-hooks/set-state-in-effect — app-shell prereq, not an authored unit) + 13 warnings. This is the known baseline |
| Build gates (fresh, 2026-08-01) | `tsc --noEmit` **0** · `node --test` **508/508** · `expo export --platform web` clean (`Exported: dist`, 11.11 MB entry bundle) |
| Backend / DB / schema | **Supabase, live.** 35 tables, RLS enabled + ≥1 policy on every one; 52/52 `SECURITY DEFINER` functions pin `search_path` |
| Data-layer contract (audited 2026-08-01) | 53 RPC names · 61 call sites · 434 select columns · 119 write payloads — **all resolve against the migrations** |
| Fabricated identity in the web bundle | **0** (verified by grep after rebuild; the only remaining name strings are `placeholder` props on two input fields) |

---

## 🔁 Duplicate / Superseded Docs

| Doc | Status | Action |
|---|---|---|
| `First-Chapter-First-Goal-Wireframe-Spec-O3.md` | Superseded by `Onboarding-First-Time-Journey-Architecture-v1.0` | Mark superseded header / archive |
| `P-3-Retirement-Amendment.md` + any P-3 Rank Detail refs | P-3 **RETIRED**; P-2.2 is sole rank-depth destination | Ensure no live refs remain |
| `Powerbuilding-Intermediate-Blueprint-v1.0.md` | Retired per `Program-Ecosystem-Amendment-001` | Mark retired |
| Pre-rename "Hypertrophy" naming (`Programs/Hypertrophy/` folder) | Renamed to **Muscle Building** (Amendment 001) | Folder name still stale |
| `FORGE_LEGACY_PRD.md` vs `Forge-Legacy-Master-PRD.md` | Two PRD files coexist | Confirm one is canonical / cross-link (Decision Queue #8) |
| Challenge architecture filename vs internal version | ✅ Reconciled 2026-06-30 — `-v1.0` is the initial-publication filename (project convention); internal version v1.5 tracked in header + Amendment Log; versioning note added to doc; all downstream authority references updated | None — resolved |
| `Squad-Architecture-Amendment-001`/`002` | **Superseded for Squad-internal surfaces** by `Squad-System-Architecture-v1.0` (banner added to both files this session; SA-D3/SA2-D3 reinforced, not superseded) | None — banner is the resolution; files retained for historical record |
| `WSR-001-Workout-Share-Result-Architecture.md` §6.1–§6.4 | **Superseded for Squad surfaces** — the bounded share-triggered Check-ins model replaced by the persistent Today's Check-ins card + Squad Feed (`Squad-System-Architecture-v1.0` SQ-D5); rest of WSR-001 unaffected | None — banner added this session (→ v1.2); section retained for historical record |
| `Workouts-Hub-Wireframe-Spec-W1.md` | **RETIRED 2026-07-08** — no longer a live navigational destination; Workouts tab root is now `Program-Browse-Wireframe-Spec-W2.md`. Retirement banner added; content preserved as historical record. See `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`. | None — banner is the resolution for this doc itself; **~25 other documents still reference W-1 as a live destination and need a follow-up pass** (Decision Queue #16) |

> No **code** duplication exists (there is no code). All duplication is doc-side superseded specs lingering alongside their replacements.

---

## 🧩 Amendments Not Reconciled Into Parent Docs

Recurring pattern: **"amendment LOCKED but never merged into base doc."**

- **P-1 Profile** — Amendments 001 (Progress Entry), 002 (Athlete-Type Editability), 003 (Consolidated Correction) merged previously; **004 (Pinned Legacy) merged this session** (`Profile-Wireframe-Spec-P1.md` → v1.3 — Tier 1B + Section 4A, Honors confirmed as a first-class pinnable type). Memory previously noted a LOCKED-vs-LOCKED type-model contradiction here — re-verify on next P-1 touch.
- **O-2** — Amendments 001 + 002 (Athlete-Type) separate from base spec.
- **W-3** — Amendment 001 (per memory) already satisfied in v1.6; verify base reflects it.
- **W-9** — Amendments 001 + 002 (Builder/Active integration, Substitution) integrated per memory; confirm base text current.
- **Rank Computation Model** — Amendment 001 LOCKED; verify merged (lock-audit done).
- **Muscle Building Rename** — Amendment 001 EXECUTED in docs, but `Programs/Hypertrophy/` folder + enum still carry old name (enum `HYPERTROPHY` intentionally kept).
- **Honor Catalog Amendment 001 (Challenge Honors)** — catalog additions LOCKED; confirm folded into `Honor-Catalog-v1.0-LOCKED.md`.

> Reference audits already in repo: `Forge-Legacy-Amendment-Reconciliation-Audit.md`, `Immediate-Repository-Correction-Pass.md`.

> **Counter-example, this session:** the 5 Communities reconciliation amendments (Social-Architecture-001, Challenge-Architecture-004, Honor-Catalog-002, P-5-002, Monetization-002) were each **merged directly into their target document** (version bumped, sections edited, change log updated) in the same pass that locked the amendment file — not left as a separate file pointing at an unedited base doc. This is the discipline the recurring pattern above is missing; it is called out here as the model to repeat for future amendments.

---

## 🕳️ Unresolved Documentation Gaps

1. ~~**App-wide data-model / backend / persistence architecture**~~ — **RESOLVED.** `Backend-Data-Model-Architecture-v1.0.1` LOCKED (2026-06-30).
2. ~~**Rank build blockers**~~ — **RESOLVED.** All 16 TBDs closed; RCM LOCKED v1.0.1; Architecture Freeze row 15 ✅ Complete (2026-06-30).
3. ~~**Standalone Rest Timer spec**~~ — **RESOLVED.** `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); Architecture Freeze Row 19 ✅ Complete.
4. ~~**Global Search spec**~~ — **RESOLVED.** `Global-Search-Architecture-v1.0.md` LOCKED (2026-06-30); entry-point wireframe spec still needed (deferred, non-blocking).
~~5. **Component-library / design-system spec**~~ — **RESOLVED.** `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30); Architecture Freeze Row 18 ✅ Complete.
6. **`.docx` → app-data conversion approach** — programs authored as Word prose with no defined path to structured data.
7. **Activity Detail (W19)** — lock-candidate, not yet LOCKED.
8. **Program catalog content** — 20 of 24 packages unwritten (8 empty family folders).
9. **Exercise content** — all 195 catalog rows narrative-authored (content; reduced from 200 by the 2026-06-30 naming-duplicate reconciliation); `primaryMuscles`/`secondaryMuscles` (Phase 2) and `difficulty` (Phase 3) assigned for all 195; **media is the only remaining unassigned field**, so 0 of 195 are schema-complete and 0 are `isActive: true`. Naming-duplicate pairs resolved (Phase 5) — 0 remaining (Decision Queue #11).
10. **Community platform-level moderation escalation + AI moderation** — `Community-Roles-and-Moderation-v1.0` CRM-D6 builds only a self-moderation model; no Forge-staff appeal path and no AI moderation exist yet (explicit V1 exclusion). Acknowledged, not silent — see Decision Queue #9.
11. **Community wireframes** — no pixel-layout spec authored yet; Communities is architecture-only as of this pass.
12. **L-10 pre-existing staleness (partial)** — this session fixed §5.1's category table and §18's checklist (both were still showing the original 7 categories / 53 types despite the catalog already being at 82/10 last session). §3's ASCII mockup and §7.2's per-category sort-order subsections remain unbackfilled for Partnership/Competition/Communities/Squad — a separate, smaller, still-open gap.
13. **Honors content-authoring pass** — `Honors-Architecture-V1-Final-v1.0` defines all 167 V1 honor types (IDs, categories, thresholds) but authors no L-11 descriptive content; that pass is the next Honors workstream item, governed by `Honors-Authoring-Standards-v1.0`'s Real Athlete Test.
14. **Honors explicit deferrals** — two kinds, tracked separately: (a) **PO scope decision** — Sex-Specific Strength Milestones and Relative Strength Milestones (24 honors, design-complete, ready to merge as-is — see `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2); (b) **genuinely blocked** — Hiking/Rowing Endurance (18 honors, content-ready, blocked on an `ActivityType` enum amendment), Comebacks & Resilience (0 honors, no gap-tracking statistic exists), Bodybuilding volume-PR family (0 honors, no volume-tracking statistic exists). All written, intentional deferrals, not silent gaps; see `Honors-Architecture-V1-Final-v1.0.md` §9.

---

## 🧹 Housekeeping (stray files to remove)

Non-spec artifacts present in the working tree (verified):
- `Scratch/temp_SF1-3D.txt`, `temp_SF1-4D.txt`, `temp_SF2-3D.txt`, `temp_SF2-3D_full.txt`, `temp_SF2-4D.txt`, `temp_catalog_index.txt`
- root `index_extract_tmp.txt`
- `_repo-audit/duplicate-filenames.csv`, `file-inventory.csv`, `messy-file-names.csv`

> Not deleted in this pass (audit-only). Recommend removing before next commit.

---

## ⚠️ Known Risks

**🔴 High**
- **Content backlog** — 20 programs + ~200 exercises + 81 honors-as-data + artwork unwritten; content can become the critical path even after code starts.

**🟡 Medium**
- **Amendment reconciliation lag** — recurring "LOCKED but not merged" pattern (esp. P-1) risks contradictory specs guiding the build; P-1 has a LOCKED-vs-LOCKED type-model contradiction.
- **No `.docx` → app-data path** — programs authored as Word prose with no defined ingestion approach.
- **Two coexisting PRDs** — ambiguity over the canonical source.
- **No component-library contract** — risks inconsistent UI once code begins.
- **Community moderation escalation gap** — self-moderation only (community's own Owner/Admin/Moderator); no Forge-staff appeal path or AI moderation exists yet (acknowledged, Decision Queue #9).

**🟢 Low**
- **Cosmetic stale text** (e.g. P-4 "Account/Auth doesn't exist").
- **Stray working-tree files** (`Scratch/temp_*`, `_repo-audit/*.csv`, `index_extract_tmp.txt`).
- **Stale folder name** `Programs/Hypertrophy/` post Muscle-Building rename.
- ~~**Challenge filename/version mismatch**~~ — **RESOLVED 2026-06-30** (Row 12 reconciliation).

---

## 🎯 Success Criteria

### V1 Ready for Development
- [x] Backend / Data-Model / Persistence architecture authored & LOCKED — `Backend-Data-Model-Architecture-v1.0.1` (2026-06-30)
- [x] Rank readiness resolved — all 16 TBDs closed; RCM LOCKED v1.0.1 (2026-06-30)
- [x] Global Search architecture authored & LOCKED — `Global-Search-Architecture-v1.0.md` (2026-06-30)
- [x] Rest Timer and Component Library specs authored — `Rest-Timer-Architecture-v1.0.md` LOCKED (2026-06-30); `Component-Library-Architecture-v1.0.md` LOCKED (2026-06-30)
- [x] All 21 Architecture Freeze rows ✅ or explicitly deferred (**FROZEN**) — ✅ **FROZEN 2026-06-30** — all 21 rows complete
- [ ] Amendment reconciliation pass complete (P-1, O-2, Pinned Legacy merged)
- [ ] Canonical PRD chosen; ~~Challenge filename/version reconciled~~ ✅ done 2026-06-30
- [x] L-10 honor-category fallback resolved (this session — §5.1/§18 updated to the full 13-category list)
- [ ] W-19 LOCKED
- [x] `.docx` → app-data conversion approach decided — ✅ **decided & executed 2026-07-14**: non-destructive `src/domain/training/ingest/` pipeline promoted the 2 LOCKED Strength programs to `training/programs/*.json` (`.docx` byte-untouched)

### V1 Ready for Alpha
- [~] App skeleton built (auth-gated tab IA + persistence layer; starter removed) — **partial:** Expo starter removed + real product tab IA built (root `Stack` over 4 tabs) ✓; **auth-gating and persistence layer NOT built** ✗
- [ ] First vertical slice working: Auth/Onboarding → Workout Logger → Active Workout → Exercise Library
- [ ] Core data persists across sessions (real DB wired)
- [ ] Program catalog content authored (≥ first families) + ingested as data
- [ ] Exercise library populated as data (initial launch set)
- [ ] Honors → Rank → Legacy systems functional end-to-end
- [~] Test framework in place with coverage on core flows — **framework in place** (`node --test`, 176 tests / 14 files, gates every unit) ✓; **core-flow coverage partial** — invariant/golden/characterization coverage of the built domain/data layers; no auth/logger/persistence flows yet ✗
- [ ] Deployable build (CI + distribution channel) established

---

## 📝 Change Log

Newest first. One line per dashboard revision.

- **v1.31 — 2026-08-03** — **First outside-tester defect pass — the friend loop.** Two reports, both real, both closed: (a) migration **0109** restores the `friend_request` / `friend_accepted` branches to `notification_events()`, lost across **0088** and **0092** because each rebuilt the function from its predecessor after a `42P13` return-type change — the first rebuild copied the pre-friends 0054 body and nothing errored, so the loss ran silent for two migrations and the recipient's notification tab (and bell badge) simply never mentioned a friend request; a `comment on function` now warns the next rebuild to copy from the current body. (b) `/add-friend` renders a resolved handle as a tappable athlete row (face · name · handle · rank → `/athlete/[id]`) instead of one line of status text with nothing to press. Added Recently Completed #1 and renumbered the section (now 16 entries). Gates: `tsc --noEmit` 0 · `eslint src/app/add-friend.tsx` clean. **0109 authored, not yet applied.**
- **v1.30 — 2026-08-01** — **PROJECT AUDIT + CORRECTION PASS.** Five-lens repository audit (inventory · data-layer contract · route-by-route state · correctness/fabrication · docs), then the fixes: migration **0098** (chapter honor tally derived, not a stored zero), the auth guard closed over 17 routes + a filesystem-derived regression test, fabricated identity removed from the production web bundle (verified by rebuild), three silent failures made honest, one dead fixture deleted. Rebuilt Dashboard, Project Health, Current Sprint, Project Statistics, Repository Evidence Snapshot and both Last-Updated headers against measured values; added Recently Completed #1. Three findings recorded as deliberately deferred with reasons. Gates: tsc 0 · 508/508 · eslint baseline · web export clean.
- **v1.22 — 2026-07-15** — **Project Audit — Code/Testing dashboard reconciliation (no product code changed; board stays UNCOMMITTED).** The summary tables still reported the pre-implementation state (Code 0% / Testing 0% / "unmodified Expo starter" / 19 files / zero feature code) after ~45 `src/`-touching commits of shipped, tested app — a source of truth actively misreporting state. Reconciled against fresh evidence, every number cited: 227 tracked TS/TSX files · 33,229 LOC · 56 commits (45 touch `src/`, 17 feature-code this session) · **176 `node --test` green / 14 files** · `tsc --noEmit` 0 · `expo export --platform web` clean · ESLint 1 pre-existing error + 14 warnings (authored surfaces clean). Code Implementation set to **~15%** (explicitly a blend — ~8/80 MVP screens ≈10% + a substantially-built design-system/domain/data foundation; **backend-wired 0%**), Testing to **176 green** with coverage **"not measured"** (not instrumented — reported as such, not guessed). Updated: Dashboard (Code/Testing rows, Current Phase), Project Health (Code/Testing/OVERALL), 30-second read, Current Focus tail, Implementation Status table (Frontend/Navigation/State-Management/Testing/Components), Project Statistics, Repository Evidence (+ new Lint & Build-gates rows), header Last Updated + Audit Basis, Recently Completed (added #1), this Change Log. Flagged secondary staleness: prior Recently-Completed "not yet committed" tags are superseded by git history (`70866df`..`3daedb6`).
- **v1.21 — 2026-07-10** — Documentation-accuracy correction (no product/design behavior changed): `Goal-Hub-Wireframe-Spec-G1.md` → **v1.2**. Fixed a reconciliation-lag bug — G-1 still described G-2/G-3 as "post-MVP" throughout (§4, §12, §16, §18, §22, §24), even though both `Goal-Detail-Wireframe-Spec-G2.md` (v1.0) and `Goal-Create-Edit-Wireframe-Spec-G3.md` (v1.1) are authored and LOCKED; G-2's own spec already stated "G-2 is MVP" and flagged G-1 as stale, but the correction was never applied. Marked Architecture Risk 1 (L-7/L-8 naming) and Risk 4 (goal achievement trigger) RESOLVED — both were de facto resolved when G-2/G-3 shipped but were never marked as such. Also confirmed a second concrete instance of the Decision Queue #16 pattern: G-1's §23 Conflict 1 (W-1 Chapter Context Card goal-tap routing) was already unresolved before W-1's 2026-07-08 retirement, and retirement removed that entry point with no replacement decided — flagged in G-1 §4/§18.1/§23, not silently dropped. Updated: Documentation Status (Goals section), Decision Queue #16, this Change Log.
- **v1.20 — 2026-07-09** — Documentation-accuracy correction (no architecture changed): `Activity-History-Wireframe-Spec-W18.md` was misdashboarded as LOCKED in Documentation Status — its own header reads LOCK CANDIDATE, and its authority citation "Navigated from: W-1 Workouts Hub" is stale since W-1's retirement (2026-07-08, `Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`), never reconciled. Corrected the Documentation Status entries for W18 and W19 and made explicit, for the first time, the concrete consequence of Decision Queue #16 that was previously only implied: `Activity-Detail-Wireframe-Spec-W19.md` cites `W-18 v1.0 (LOCKED)` as its own authority and therefore cannot legitimately be marked LOCKED until W-18's stale entry-point citation is reconciled — this, not an outstanding sign-off, is the actual reason W-19 remains a lock candidate. Also corrected a stale, already-resolved L-10 clause lingering in the Current Sprint task list (Success Criteria already showed it resolved). Updated: Documentation Status (W18/W19 lines), Decision Queue #16, Current Sprint task list, UI/Wireframes dashboard row, Current Focus snapshot, header/snapshot Last Updated, this Change Log.
- **v1.19 — 2026-07-02** — Post-freeze: two stakeholder-directed decisions formalized from `Docs/Forge-Design-Blueprint-v1.0.md` into official architecture. (A) Communities Navigation: new `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (LOCKED) names Home's "Explore Communities" module (primary) and adds a Squads secondary entry point; `Home-Screen-Wireframe-Spec-H1.md` → v1.3 (new Tier 6, Tab Bar corrected from a drifted 5-tab table to 4 tabs); `Squads-Hub-Wireframe-Spec-S1.md` → v1.5 (new Tier 3); `Community-System-Architecture-v1.0.md` COM-D18 pointer added; `Global-Search-Architecture-v1.0.md` "5-tab hierarchy" corrected; `Legacy-Hub-Wireframe-Spec-L1.md`'s stale "Legacy (5th tab)" header also corrected; `Forge-Legacy-Master-PRD.md` §6/§7/§19 updated (Amendment Log 003/004). (B) Transformation Gallery: new Legacy feature, screens L-17/L-18 — `Transformation-Gallery-Architecture-v1.0.md` + `Transformation-Gallery-Wireframe-Spec-L17-L18.md` (both new, LOCKED); `Legacy-Hub-Wireframe-Spec-L1.md` → v1.1 (new §8a entry point); `Photos-Wireframe-Spec-L15-L16.md` differentiation note added. Blueprint reconciled to cite the new official docs; "pending formalization" language removed. Earlier same-day (already reflected in Last Updated/Recently Completed): all 6 committed Forge component libraries reclassified LEGACY/REFERENCE. Updated: header Last Updated/Audit Basis (228 docs), Dashboard snapshot, Documentation Status (Home, Squads, Communities, Chapters/Legacy sections), Content Status (new Transformation Gallery row), Decision Queue (#14 added), Recently Completed (#1 added), this Change Log.
- **v1.18 — 2026-06-30** — **V1 Architecture Freeze officially FROZEN.** Challenge filename/version mismatch (Row 12) reconciled: filename convention documented in `Challenge-System-Architecture-v1.0.md` Status block (versioning note added); stale authority version references updated in 10 downstream docs (C1–C7 footer/header authority lines; Calendar-System-Architecture-v1.0.md; Community-System-Architecture-v1.0.md; Social-System-Architecture-v1.0.md). No architectural decisions changed. All 21 Architecture Freeze rows now ✅ Complete. Updated: Freeze table Row 12 (✅ Complete), Freeze status declaration (FROZEN), Competitions/Challenges Documentation Status item (✅), Duplicate/Superseded Docs row (resolved), Known Risks 🟢 item (struck), Sprint task ticked, Success Criteria checkbox ticked, Dashboard Architecture (~98%→~100%), Project Health Architecture row, Current Focus/Biggest Blocker/Last Updated snapshot, OVERALL health row, Next Milestones (restructured), Recently Completed (added #1), Change Log.
- **v1.17 — 2026-06-30** — Standalone Rest Timer V1 Architecture Freeze complete: `Rest-Timer-Architecture-v1.0.md` authored and LOCKED by PO. 22 decisions (RT-D1–RT-D22): wall-clock differential timer strategy (no background process), 4-state machine (INACTIVE/RUNNING/BACKGROUNDED/RECOVERABLE), single-timer-per-session rule, ProgressRing component contract (accent.primary fill, surface.muted track, 2–3dp, 72–84dp, unmount-not-hide, scope-restricted), Reduce Motion static-arc accessibility, cold-launch recovery with session-ID guard, V1 notifications deferred (framework defined), future platform surface declarations (Live Activities, Watch, widget). Downstream reconciliation applied to `Component-Library-Architecture-v1.0.md` (§1.2/§1.3/§17 — "forthcoming" pointers updated to LOCKED), `Active-Workout-Flow-Spec-W9-W16.md` (§7.6 architecture pointer added), `W9-Amendment-003-Optional-Rest-Progress-Ring.md` (governance note updated). Closes Architecture Freeze Row 19 and Decision Queue #4. Updated Dashboard (Architecture ~98%), Freeze status (0 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, Project Health Architecture row, Sprint task ticked, Documentation Status Standalone Rest Timer item, Decision Queue #4 struck, Unresolved Gaps #3 struck, Success Criteria checkbox ticked, Project Statistics (+1 doc, +1 LOCKED, 0 infra remaining), Recently Completed (added #1), Next Milestones, Change Log.
- **v1.16 — 2026-06-30** — Global Search V1 Architecture Freeze complete: `Global-Search-Architecture-v1.0.md` authored, verified, repaired, and LOCKED by PO. Establishes Catalog Search (Exercises/Programs/HonorType catalog — client-filterable, ownership-filtered) and Discovery Search (Profiles/Communities — server-indexed, discoverability-flag-filtered) as two independent, mutually-exclusive search categories. Explicit Never-Searchable list. Performance Firewall principle adopted by architectural extension. Full reconciliation: `Backend-Data-Model-Architecture-v1.0.1` §14 amended to add `ProgramDefinition` and `HonorType` indexable fields; `Community-Discovery-and-Search-v1.0` §6/header/Non-Behaviors updated to reference this document as the Global Search authority it previously called "still open." Closes Architecture Freeze row 17 and Decision Queue #3. Updated Dashboard (Architecture ~96%), Freeze status (2 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, 30-second read, Health table Architecture row, Sprint task ticked, Global Search Documentation Status (new subsection) + Infrastructure subsection updated, Decision Queue #3 struck, Unresolved Gaps #4 struck, Next Milestones, Success Criteria, Recently Completed (added #1, trimmed oldest 3 entries to hold ~20 cap), Project Statistics (228 docs, ~148 LOCKED, 2 infra docs remaining), Repository Evidence Snapshot (201 root specs, 227 total, ~149 LOCKED), Change Log.
- **v1.15 — 2026-06-30** — Rank V1 Architecture Freeze readiness audit complete: Rank marked **✅ Complete** (Freeze row 15). Audit found `Rank-System-Architecture.md`, `Rank-Computation-Model.md` (RCM), and `Rank-Calibration-Decisions.md` were all already LOCKED but the dashboard had never been updated to reflect it. Formally closed the one remaining genuine gap, **TBD-11 (Legacy display format)**, via new `Rank-Computation-Model.md` → v1.0.1 amendment (governed by already-LOCKED M-1 + L-2, no new computation required). Verified `Backend-Data-Model-Architecture-v1.0.1` §20's "RANK_XP" open item is a Challenge-system type deferral, not a Rank schema conflict — updated §20 item 2 to remove stale "~15 open TBDs" language. Added a superseded banner to `Rank-Implementation-Readiness-Review.md` (its 8 originally-identified blockers are all resolved). Closes Decision Queue #2. Updated Dashboard (Architecture ~95% note), Freeze status (3 Missing + 1 In Progress), Current Focus/Biggest Blocker/Last Updated snapshot, 30-second read, Sprint task ticked, Rank System documentation subsection, Decision Queue #2 struck, Unresolved Gaps #2 struck, Known Risks (removed Rank 🔴 High item), Next Milestones, Success Criteria, Recently Completed (added #1), Change Log.
- **v1.14 — 2026-06-30** — Backend / Data-Model Architecture LOCKED. `Backend-Data-Model-Architecture-v1.0.1` authored, audited, repaired, and locked by PO. Closes Architecture Freeze row 16 and Decision Queue #1. Updated Dashboard (Architecture ~95%, Backend 100%), Freeze status (3 Missing + 2 In Progress), Current Focus/Biggest Blocker snapshot, 30-second read, Infrastructure architecture section, Recently Completed (added #1), Sprint task ticked, Change Log.
- **v1.13 — 2026-06-30** — Exercise Library Phase 5 (Naming Duplicate Resolution) complete: resolved all 5 flagged naming-duplicate pairs, locking one canonical V1 name per pair — Box Step-Up, Back Squat (content relocated to "Bodyweight Squat" rather than lost), Front Plank, Barbell Romanian Deadlift, Barbell Bench Press. Catalog reduced 200→195 exercises; anchors reduced 45→44 (Squat/Back Squat was the only pair where both sides were independently anchor=Y). New `Exercise-Naming-Standard-v1.0.md` locks 4 naming principles plus a governance rule that published canonical names are immutable except through an equivalent formal reconciliation pass. Reconciled into `Exercise-Library-Launch-Catalog-Blueprint-v1.0` (§§1–8, Change Log v1.1), 7 Population Pass docs (relationship-array retargeting, zero broken references re-confirmed), `Exercise-Library-Architecture-v1.0` (→ R1-5), `Anchor-Exercise-Authoring-Framework-v1.0`, `Program-Authoring-Standard-v1.0`, `Exercise-Difficulty-Assignment-Pass-v1.0` (totals recomputed to 195/44), `Exercise-002-Exercise-Substitution-Architecture`, `Exercise-Media-Architecture-v1.0`, and illustrative wireframe-mockup text across 11 W-series/research docs. Updated Content Status Exercise Library row, Decision Queue #11, Unresolved Gaps #9, Project Statistics (doc count 226→227, exercise count 200→195), Dashboard summary, Recently Completed (added #1). **One follow-up remains outside this pass's scope:** the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" and needs a binary-file content correction.
- **v1.12 — 2026-06-30** — Honors System Final V1 Architecture complete: reconciled the locked v1.4 catalog (82 types) with six previously-unmerged Expansion Pass documents into `Honor-Catalog-v1.0-LOCKED.md` v1.5 (167 types / 13 categories / 34 families), via new master synthesis doc `Honors-Architecture-V1-Final-v1.0.md` and companion `Honors-Authoring-Standards-v1.0.md` (Real Athlete Test). Merged Endurance (38, Running/Walking/Cycling/Swimming only), Consistency (5), and Prestige (8, new pipeline step [4.5]); added Hidden category (6, zero new schema). Fixed a recurring family-count arithmetic error. Reconciled into `Honor-Evaluation-Service-Architecture-v1.0` (→ v1.1) and `HonorInstance-Architecture-v1.0` (→ v1.1). Discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (→ v1.1, still showed 7 categories/53 types despite the catalog being at 82/10 before this pass). **Approved with one modification:** two new Strength families designed in this pass — Sex-Specific Strength Milestones, Relative Strength Milestones (24 types) — were deferred to V2 by PO decision before final lock; full design preserved in `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2; `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3 as a result (the two Profile fields they required are deferred alongside them). 42 honors total explicitly deferred (24 by PO scope decision, 18 genuinely blocked — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR), no placeholder logic invented. Updated Honors architecture/content rows, Decision Queue / Unresolved Gaps list (resolved L-10 fallback item, added 3 new tracked items), Project Statistics, Repository Evidence Snapshot, Recently Completed (added #1, trimmed oldest to hold the ~20 cap). Architecture/schema only — zero L-11 descriptive content authored for any merged honor type.
- **v1.11 — 2026-06-30** — `Exercise-Media-Architecture-v1.0.md` → v1.1: added a mandatory anatomical-model-neutrality standard to §3.3 — the muscle target image's reference figure must remain generic/educational and must not depict body fat, muscularity, sex-specific anatomy, skin tone, or other identifying athlete characteristics. Standards-only; no schema change, no assets produced. Added Recently Completed #1 (trimmed oldest entry to hold the ~20 cap).
- **v1.10 — 2026-06-29** — Recorded a full Honors System V1 Completion Audit (architecture/audit only, no `Docs/` edits this pass): confirmed `Honor-Catalog-v1.0-LOCKED.md` (v1.4, 82 types) and a separate, never-merged "Expansion Pass" draft track (53→150 honors) are unreconciled lineages, and that L-10/HonorInstance/Evaluation-Service/L-11/M-2 are all stale against the 82-type catalog. Updated Decision Queue #7 (broadened from "L-10 fallback" to the full 5-doc staleness finding) and added #12 (new — "Strength Standard" sex-specific Honor selector explicitly parked by the PO pending a separate, broader product decision on sex-field collection). PO also approved (not yet authored): a Beginner→Progression→Mastery→Lifetime framework as the governing standard for future activity-based Honors, a Bodybuilding volume-based Honor family, Strength Club ceiling expansion (no duplicate "plate" naming), and promoted Hidden Honors from deferred to a curated V1.x candidate. Authoring is explicitly on hold until the Phase 0 reconciliation (Decision Queue #7) completes. Full detail in memory (`project_honors_expansion_audit`, `project_pinned_legacy_amendment`).
- **v1.9 — 2026-06-29** — Featured/Pinned Honors decision recorded and executed: confirmed Strength milestone Honors stay ordinary Honors (no "Recognition Clubs" system), and realized "Featured Honors" entirely through the existing LOCKED `P-1-Amendment-004-Pinned-Legacy.md` mechanism rather than a new system. Merged that amendment into its base document — `Profile-Wireframe-Spec-P1.md` → v1.3 (new Tier 1B + Section 4A, with Honors explicitly confirmed as a first-class pinnable type, display-only, zero progression effect) — closing a reconciliation gap flagged in § Amendments Not Reconciled. Added a reciprocal pointer in `HonorInstance-Architecture-v1.0.md` (→ v1.0.1, §5.3). Updated § Amendments Not Reconciled (removed the resolved Pinned Legacy row), Recently Completed (added #1, renumbered/trimmed to hold the ~20 cap).
- **v1.8 — 2026-06-29** — Exercise Library Phase 4 (Media Architecture & Standards) complete: new doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group (separate from the existing Media block) and defines production standards for all 5 media/anatomy fields — including a mandatory neutral-stance loop start/end requirement for animations and a mandatory fixed-model/pose/camera/proportions/scale/framing consistency requirement for muscle target images — plus a uuid-keyed naming convention. Reconciled into Exercise-Library-Architecture (v1.2), W-22 (v1.0 R2), Exercise-001, W-28, and Anchor Authoring Framework. Updated Decision Queue #11, Content Status Exercise Library row, Documentation Status Exercise Library subsection, Project Statistics, Repository Evidence Snapshot, and Recently Completed (added #1, trimmed oldest entry to hold the ~20 cap). Architecture-only — zero exercise media assets produced; Decision Queue #11 remains open (media production itself is still entirely unstarted for all 200 exercises).
- **v1.7 — 2026-06-29** — Exercise Library Phase 3 (Difficulty Assignment) complete: new doc `Exercise-Difficulty-Assignment-Pass-v1.0.md` assigns `difficulty` to all 200 V1 exercises (122 BEGINNER / 65 INTERMEDIATE / 13 ADVANCED), with 10 ambiguous cases flagged and resolved. Updated Content Status Exercise Library row (media now the only unassigned schema field), Decision Queue #11, Unresolved Gaps #10, Project Statistics exercise-count row, doc counts (221→222 specs / 222→223 total incl. amendments, root specs 196→197), added Recently Completed #1 and trimmed the 2 oldest entries (Profile & Progress ecosystem, Rank Computation Model) to hold the ~20 cap. Does not change Freeze status (Exercise Library architecture, row 7, remains ✅; the catalog data is still not schema-complete — media remains).
- **v1.6 — 2026-06-29** — Homepage Principles system locked and reconciled: added Freeze row 21 (`Homepage-Principles-Architecture-v1.0` + `Homepage-Principles-Library-v1.0`, both LOCKED); added a new "Home" subsection to Documentation Status; updated Current Sprint objective and Success Criteria to 21 Freeze rows; fixed a stale "19 Freeze rows" reference in Next Milestones; updated doc counts (+2 docs, +2 LOCKED, in both Project Statistics and the Repository Evidence Snapshot); added the new milestone to the top of Recently Completed and trimmed the oldest entry (Honors Expansion) to hold the ~20 cap. The architecture doc deliberately states no fixed library-entry count — the Library doc is the single source of truth for counts, per HP-D10.
- **v1.5 — 2026-06-29** — Exercise Library V1 Freeze reconciliation + audit pass (NOT marked frozen): fixed 5 categories of doc drift (ExercisePrescription field names, stale Hypertrophy(3) checklist line, W-23 stray Hinge row, 3 header/footer version mismatches, a real W-23-vs-Exercise-003 locked decision contradiction over the favorite icon, plus minor wording/reference fixes); audited the 200-exercise catalog (zero broken relationship references confirmed by automated cross-check; all taxonomy ranges satisfied; found 2 new naming-duplicate pairs, now 5 total; confirmed `primaryMuscles`/`secondaryMuscles`/`difficulty`/media unassigned for all 200 rows, 0 active); updated Content Status Exercise Library row, added Decision Queue #11, updated Unresolved Gaps #10, updated Project Statistics exercise-count row, added Recently Completed #1 (trimmed oldest entry, #20 Legacy L-series, to hold the ~20 cap).
- **v1.4 — 2026-06-29** — Squad System Architecture locked and fully reconciled: new governing doc `Squad-System-Architecture-v1.0` (Goals/Missions/Streak/Momentum/Weekly Summary/Feed/Honors/Competition/Notifications/Analytics/Commitment); updated Freeze row 11 note; updated Documentation Status (Squads, Honors, Competitions/Challenges, Notifications subsections); reconciled S-1→v1.4, S-2→v1.6, S-3→v1.3, Honor Catalog→v1.4, P-5 Arch+Wireframe→v1.4, Challenge-System-Architecture→v1.5; added superseded banners to Squad-Architecture-Amendment-001/002 and WSR-001 §6; added Decision Queue #10 (P-5 wireframe drift, discovered not introduced); updated doc counts (219→220 total, ~142→~143 LOCKED); added 2 rows to Duplicate/Superseded Docs.
- **v1.3 — 2026-06-29** — Communities subsystem (V1 Architecture Freeze row 20) locked and fully reconciled: added row 20 to the Freeze checklist; added a Communities subsection to Documentation Status; added Decision Queue #9 (moderation escalation/AI moderation gap, acknowledged not silent); updated doc counts (210→219 total, ~133→~142 LOCKED, 21→26 amendments); added 2 items to Unresolved Documentation Gaps; logged a counter-example note under Amendments Not Reconciled (Communities amendments were merged directly into target docs, not left orphaned).
- **v1.2 — 2026-06-29** — Added Project Health, Current Sprint, Project Statistics, Change Log, Known Risks, Success Criteria, and Workflow sections.
- **v1.1 — 2026-06-29** — Refactored audit into a living dashboard (Dashboard, V1 Architecture Freeze, Documentation/Content/Implementation split, Decision Queue, Recently Completed, Next Milestones).
- **v1.0 — 2026-06-29** — Initial `Forge-Legacy-Master-Status.md` created from repository documentation completion audit.

---

## 🔧 Workflow — How to Maintain This Dashboard

Follow this loop every working session:

1. **Read first** — open this file before any other work; it is the single source of truth.
2. **Complete current sprint** — work the **§ Current Sprint** tasks; do not start unrelated work mid-sprint.
3. **Update percentages** — refresh the six Dashboard metrics, Project Health, and Project Statistics to match reality.
4. **Move completed work** — shift finished items into **§ Recently Completed** (never delete; cap ~20) and tick the relevant Freeze / Success Criteria / Sprint boxes.
5. **Update Change Log** — add a new versioned line (newest first) describing the revision.
6. **Save** — update **Last Updated**, then save. Leave the dashboard accurate for the next session.

---

*This is the permanent source of truth for Forge Legacy. Keep it current. No code written, no app scaffolded, no backend/data-model architecture authored — per task constraints.*
