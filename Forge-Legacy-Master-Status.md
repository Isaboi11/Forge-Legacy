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
**Last Updated:** 2026-08-26 (**⭐ THE COIN'S RIM STOPPED FLOATING, AND HOLT STOPPED REPEATING HIMSELF TO AN EMPTY HISTORY.** Two unrelated PO reports, both worse than reported. ⭐ **The "sliver outside the outline" is SHADING, not an edge** — measured outward from the coin's fitted centre there is a **dark bevel trench at R 153–157, median luminance 4 of 255**, between the field and the rim; where the light catches it the rim reads as part of the coin, where it does not the rim's highlight floats free. **A crop was tried first and did nothing, because there is no stray geometry to crop.** The trench is filled and the rim redrawn as one flat ring. ⭐ **Alabaster had collapsed the figure into the field at 1.58:1 where Forge sits at 3.89:1** — the same day's earlier ramp improved it but never measured it; the new ramp lands **4.08:1** and the disc gains presence on cream (**5.6:1, up from 4.9**) rather than punching a hole. ⚠ **The light end stops at warm ivory on purpose**: near-white scores better and renders the coach in PEWTER. ⚠ **NOTHING WAS REDRAWN** — eight vector reconstructions of the folded arms were rendered at 52/36/24 and all lost to the master's own artwork. **Home's lead mark 54 → 44**, which was the largest Holt in the app while its own comment called it low visual weight. ⭐ **AND THE NUDGE WAS SPENT ON THE TAP, NOT THE READ** — a line that was read and not tapped left no trace, and the effect keys on `pathname` across FOUR home surfaces, so switching tabs re-asked it. ⚠ **The half that is not obvious: it starved the whole catalogue.** `honors` is eligible whenever `honors > 0` — forever — and sits third in a strict order, so `program`, `templates`, `progress`, `squads` and `metrics` were **unreachable**, not used up. ⛔ **NOT VERIFIED: whether the writes land at all** — `markNudge` swallows every failure, so a missing grant on `coach_nudge_state` would look identical from the client; owed to the next pass. ✅ **WEB DEPLOYED** `index-3fefea43a5f60eadb8d1d4e555d3abfc`, alias 200 and hash-matched on the first probe, both marks fetched by their content-hashed URLs · ✅ **OTA PUBLISHED** to runtime `411fd2b6…`, build 6's own fingerprint · tsc 0 · nudge domain 12/12 plus 4 new. Prior entry follows.) (**⭐ ALABASTER'S LAST FROZEN GROUNDS — AND A HOUSEKEEPING LINE THAT HAD STRANDED EVERY OTA.** Four PO reports in one sitting, all the same shape: **a hard-coded GROUND under role tokens that flipped correctly**, which the compiler cannot see because a frozen ground is not a missing token, it is a present literal. ⭐ **The disabled FINISH WORKOUT button** — PO: *"it's showing that I can't click it, but it should be a better color than that still"* — was Forge's near-black slab, so the one button that could NOT be pressed was the highest-contrast object in the footer, out-ranking ADD EXERCISE, which could; Paper now draws a **recessed plate** at 1.23:1 with a label measured to match Forge's presence (3.67 vs 3.70). ⭐ **Coach Holt** was a bronze relief struck on a near-black field (median luminance 11/255) inside a black ring — a hole punched in the cream page — and is **restruck in `bronzeMetallic`'s own metal** by a versioned script, after four candidate ramps were rendered at the real 52px and compared. ⭐ **The cardio block** kept `#0D1116` while its title flipped to dark ink, so *"Outdoor Run"* was invisible — and it was never running-specific, every cardio activity draws it. ⚠ **A DARK-THEME REGRESSION NOBODY HAD SEEN because only the light theme was being reviewed**: `paperScrim` is a pure function that cannot know the theme, its gate lived privately in ONE file, and **fifteen call sites across fourteen screens** were painting a cream commit bar over Forge's near-black. ⭐ **The map now draws the whole run** — from the finished track still in memory, **without touching D-RTE-1**: nothing extra is persisted, the front door still never reaches the database. ⛔ **AND THE PUBLISH FOUND TWO DELIVERY DEFECTS.** `fingerprint:compare` refused the OTA — this morning's animation-tooling commit added three lines to `.gitignore`, which `@expo/fingerprint` hashes, moving the runtime off every tester's build; **the third time a housekeeping file has stranded the phone**. And a 22.3.0 deploy **landed an empty worker and printed success** — 404 for twelve minutes with a payload verified healthy beforehand, so **a good payload is necessary and not sufficient**; the runbook now carries the probe that tells propagation from an empty worker. ✅ **WEB DEPLOYED** `index-4d3adbd886e3bc5a38a9ced52c38dac1`, verified against production by fetching the live bundle and finding all eight new strings · ✅ **OTA PUBLISHED** to runtime `411fd2b6…`, build 6's own fingerprint · **2,858 tests pass**, every Forge value asserted byte-identical.)
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
| **Testing** | **2,849 tests green** *(coverage % not instrumented → not measured)* | ⚠ Newest: the theme guards — `paper-tokens` (10, parsing the DESIGN file so a hand-transcribed palette cannot drift from the artboards it came from), `paper-scrim` (5, the darkening→lightening flip, whose margin assertion CAUGHT a threshold that would have turned every modal backdrop cream) and `on-bronze` (4, asserting white-on-bronze clears AA and that the second bronze token is earning its place). Prior text: ⚠ Newest: `recommend` (19 — Holt reading the catalogue shelf, run against the REAL 16 program JSONs read off disk rather than a fixture, so a seventeenth program either keeps the assertions true or turns one red). Its load-bearing cases are the REFUSALS: every endurance goal refuses because the shelf has no Running family, and a cold-start race is proven to report ready with no experience recorded — the exact shape that crashed the first cut. ⚠ This row read **2,756**, and before that **1616**. Newest, all from the 2026-08-11/12 passes: `shared-session` (12 — a partner's workout counts toward YOUR program, matched by coverage of the prescribed main lifts and catalogue-key identity), `partner-credit` (15 — both athletes named from the one row both can read, and a removal that survives the second pass), `intensity` (21 — ⚠ the DIAGONAL invariant: `beginner@drive` is bounded by `intermediate@push` on every lever that touches training content, and `back_off` is identical across all twelve cells), `intra-set` (18 — the five gates on the mid-set nudge, and a grading regex over every in-workout line that **rejected one of my own**), `tour-phases` (14 — ⚠ every surface still teaches something at phase 1, which is what makes thinning safe rather than a slower version of gating), `review` (11 — a banned-word list so a weekly summary cannot drift into a scoreboard), `intensity-learning` (15 — up is offered, down applies itself, and nothing moves on one session), `superset-labels` (16) and `substitution-capture` (11). Behavioural coverage of built layers, NOT whole-app coverage |

| Snapshot | Value |
|---|---|
| **Current Phase** | **Post-audit hardening.** 72 screens on a live Supabase backend (97 migrations), 508 tests, live at forgelegacy.expo.app. The 2026-08-01 audit found the build materially healthier than this board claimed — and one class of defect it did not: values displayed from columns nothing writes |
| **Current Focus** | **Coach Holt is the product; the catalogue is a shelf.** Closed 2026-08-11/12: the shared-workout program credit and partner symmetry, the Log-Set double tap, coach intensity + the mid-set nudge, the coin as the single coaching surface, tutorial phasing (23 steps → 11 on day one) with the first tour telemetry, the weekly review, swap/intensity capture, sharing discoverability, and every athlete back on imperial. **Next: the avoidance surface** — CL-D3 makes a visible, reversible list a PRECONDITION of `assemble()` reading the signals now being captured, so Holt records swaps and avoidances and is forbidden to use them until it exists |
| **Biggest Blocker** | **⚠ REFRAMED 2026-08-09 by PO decision: "we don’t need that many programs now that we have Coach Holt." The 24-program catalogue target is no longer the blocker it was.** Holt builds a program for any goal, room, session length and limitation, plus five race distances — so nobody is waiting on authored content to get a block. Authored catalogue programs remain valuable as *curated, named* work with Forge’s voice on them, and the locked roster still stands, but the COUNT stops being the critical path. The next real gap is the AI layer (the Edge Function that lets Holt read a sentence), which is what the paid tier is actually selling. Historical note: **Programs content — 7 of 24 authored** (Body Recomposition Foundation added 2026-08-06; Wave 2 of the Stage-2 plan is otherwise untouched). The old entry here ("the Social backend") has been wrong for weeks: Squads, Friends, Squad Detail and the feed are all Supabase-backed. Secondary: 0 of 797 exercises have media |
| **Last Updated** | 2026-08-26 (✅ **COACH HOLT'S COIN — rim rebuilt, Alabaster re-measured, and the repeating nudge fixed. Web `index-3fefea43…` + iOS OTA `01a03fd3-3e7f-7e7c…` on build 6's runtime, fingerprint matched before publishing; pushed to `origin/feat/route-map` at `453d769`.** The medallion's "sliver outside the outline" was its own 3D bevel trench, not stray geometry — filled, and the rim redrawn flat. Alabaster's figure-to-field separation goes **1.58 → 4.08:1** (Forge 3.89 → 6.48) while the disc GAINS presence on cream. Nothing redrawn; the pristine artwork moved to `coach-holt-mark.master.png` and `holt-mark-paper.py` is superseded because both shipped files are now generated output. Holt's nudge recorded `shown` on the TAP rather than the READ, so it repeated on every tab switch **and made every lower-priority invitation unreachable**. ⛔ Unverified: whether `coach_nudge_state` writes land at all. ⏳ `site/README.md`'s `coach-mark.webp` not regenerated. Prior entry follows.) (✅ **ALABASTER SHIPPED — web `index-a2457608…` + iOS OTA `01a03b5e-3ea4-76be…` on build 6's runtime, fingerprint an exact match before publishing and the manifest serving the new id after; pushed to `origin/feat/route-map` at `b312a43`.** The app has a second theme. ⚠ **The V1 architecture still forbids it on paper — CLA-D12 / §5.6 / §567 — and the authorising amendment is NOT written.** ⭐ The mechanism is a RELOAD, not a live toggle: 277 module-scope stylesheets freeze their colours on first require, so `foundation.ts` became a selector and all 184 consumers compiled untouched, with **all 77 dark tokens byte-identical**. ⚠ **One bug found five times — a ROLE token flipping under something**: `cream100` means "primary text" and is near-white in Forge, dark ink in Alabaster, so it went invisible on a bronze button, on a media scrim, and over artwork. ⛔ **Two defects the theme only revealed, neither of them a theme bug**: the 72 artwork PNGs were never actually cut out (luminance used directly as alpha), and `pins.poster_url` has existed since `0005` with nothing ever writing it. ⭐ The phone needed a BOOT GATE — AsyncStorage is a promise, so `main` now points at `src/boot.tsx`; the fingerprint was checked BEFORE writing it. ⏳ **~1,130 raw colour literals in 178 files still do not follow the theme**, the promised lint rule is unwritten, and the exercise animations need drive `F:`. Gates: tsc 0 · **2,849/2,849** · lint at baseline. Prior entry follows.) (✅ **DEPLOYED — web `entry-9df51193…` + iOS OTA `01a035ce-ddd5-7c6f…` on build 6's runtime, both verified against the live host rather than against the deploy's own output.** ✅ **`0177` APPLIED AND VERIFIED** — the squad-consent hole is closed, proven in both directions by re-running the probe and the full two-account harness. **Holt can answer "I don't know which of these to choose" — and he answers it off the shelf, not by replacing the question.** The PO asked for a subtle link on the program catalogue and then, offered the choice between wiring it to the existing build flow or teaching Holt to recommend from the catalogue, said ***"I say build both."*** Both shipped: a quiet row under Discover's family chips, and a new pure `domain/coach/recommend.ts` that ranks the 16 shipped definitions and **refuses** rather than naming its least-bad row — every endurance goal, because there is not one Running program on the shelf, plus a match floor. Every card names what it got WRONG at the same weight as what it got right, and the limitations question is never asked because a fixed catalogue program cannot honour the answer. Three defects found and fixed on the way, one of them a **TypeError** on the coldest path (a brand-new athlete whose first tap is "Run a race" has no remembered level). Gates: tsc 0 · **2,785 tests green** (+19) · lint at baseline. ⏳ **NOT DEPLOYED and the card has never been rendered on any surface.** Prior entry follows.) (**Holt's mid-workout sheet gets a hierarchy — and his recommended weight is now takeable in one tap.** ⛔ Correction: the earlier claim that a "Use 50 lb" button would be a no-op was wrong — `suggestedWeight` only ever reached the athlete as a placeholder, so his advice had to be typed. Second pass adds the exercise-family artwork, `50 LB × 8`, `SWAP MOVEMENT`, `CHANGE THE PLAN`. Every function was a pill at the same visual level, so the coach's recommendation read like "Move past this". Now a statement card, pills only where a small closed set fits, and borderless rows elsewhere. ⚠ Designed on paper first, which caught two defects in the plan: a primary button that would have applied the weight already on the bar, and a "too easy" number *below* the stated weight. ✅ **Web + OTA deployed and verified** (`entry-83c2c18d…`, seven new strings confirmed live · iOS `01a02cd3…` on build 6). ⏳ Visual — not device-confirmed. Prior entry follows.) (**Ten finished fixes had never been committed.** A whole pass — the multi-injury chat, the weight-loss lifting split, the Transformation reminder that wrote a key nothing read, mid-session suggestions, and six active-workout fixes — sat green in the working tree and invisible on both surfaces. ⚠ The tell was `git status`, never empty. One real gap found: the rest-timer migration would have switched every athlete who enabled the timer back to OFF and had no test; now a pure model with 11, proven by mutation. ✅ **Web + OTA deployed and verified** (`entry-88b79f30…`, seven new strings confirmed in the live bundle · iOS `01a02ba4…` on build 6's runtime, manifest served it). ⏳ Five of the ten are UI-only and untestable here. Prior entry follows.) (**The "frozen app" was three controls that silently did nothing.** Onboarding had no way out — no sign-out, no account switch, `Back` hidden on step one — so anyone who stopped partway was returned there forever; **3 of the first 28 accounts**. Plus the squad photo and Replace check-in, both the Friends-feed picker defect one screen over. ✅ **Web + OTA deployed and verified** (`entry-78230c2c…` · iOS `01a02293…` on build 6's runtime). ⏳ **`0174` still not applied and `program-photo-read` not deployed — the photo-import button is live and dead until both.**) |

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
| **Testing** | 🟢 | **2,756 green** (`node --test`, measured 2026-08-22) + live Supabase round-trip proofs; gates every unit. Coverage % still not instrumented → not measured |
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
| ~~25~~ | ~~**`approve_squad_join_request` grants membership with no request — fix now, or ship it?**~~ *(raised and resolved 2026-08-24)* | ~~Proven: zero rows in `squad_join_requests`, `{"ok":true,"already":false}`, membership created, target's Live Now then readable with no notification to them.~~ | **RESOLVED — PO said fix it before submission. `0177` AUTHORED, NOT YET APPLIED** (`supabase/apply/pending-0177.sql`). One condition: a `pending` row must exist before the insert. **No client change needed** — `squad_pending_requests` already filters to `pending`, so every approval the UI can produce still succeeds, and `approveSquadJoinRequest` already handles an unrecognised `ok:false`. Verification is behavioural, not a green paste: re-run `supabase/seed/qa-consent-probe.mjs` after applying — it must report `Is B a member? no`. |
| **26** | **Alabaster shipped ahead of the amendment that permits it — and left four asset gaps behind** *(new 2026-08-25)* | ⛔ **Three LOCKED documents still say the app is dark-only**: `Component-Library-Architecture` **CLA-D12** (*"Light mode is explicitly deferred to a future version"*), `Forge-Design-System-Architecture` §5.6 (*"Do not add conditional light/dark logic unless an Architecture Amendment explicitly introduces a light mode"*) and `Forge-Design-Blueprint` §567. The theme is live on both surfaces and the amendment does not exist, which is this board's recurring *"amendment locked but never applied"* failure running BACKWARDS — code ahead of doc rather than doc ahead of code. **The remaining work is real and none of it is blocked by the amendment:** **(a) ~1,130 raw colour literals across 178 files** do not follow the theme, and the `no-raw-color-literals` lint rule promised in `tokens.ts`'s own header (*"Raw hex values … are prohibited"*, unenforced since day one) is still unwritten — that rule is what stops the next feature adding a 1,131st. **(b) The exercise animations are not re-rendered**: the colour is solved (`FL_THEME=paper`, measured to `#82693E` against a `#836A3E` target across 12 real frames) but the ~9k-MP4 source library is on `F:\Forge Legacy Animations` and the drive is not mounted; `media.ts` is deliberately NOT given its theme path yet, because pointing at objects that do not exist would turn every demo into a 404. **(c) 32 rank badges** are opaque saturated cutouts (measured 0.95 fully opaque, chroma 37.6) and need a light art pass — PO chose re-render over a dark medallion. **(d) Ceremonies re-theme by decision but have NO Paper artboard**, and they are the hardest surfaces to make work light: a bronze glow cannot glow on ivory. **⚠ And one measured regression left unfixed on purpose:** bronze-400 as SMALL text is **3.74:1** on the card surface, down from **5.78** in Forge — below AA for the 8–12px eyebrows and section labels it carries. The design's own `--fl-bronze-600` measures **4.74** and fixes it, but bronze-400 is the PO's accent and moving it shifts the whole look. *(gray-600 tertiary is 3.62 and also large-only — but Forge's is 2.97 and already fails, so that one is inherited, not introduced.)* | **(1)** Author `Docs/Amendments/Design-System-Architecture-Amendment-001-Light-Theme.md` with `DSA1-D##` IDs covering: CLA-D12 superseded, the reload-on-switch mechanism, ceremonies included, share cards following the theme, the new `--fl-surface-hero` tier, the dual-asset convention, and the native splash staying dark for everyone. Banner CLA-D12 and CLA-OQ-3. **(2)** PO to rule on the bronze-400 contrast regression — accept, or move small-text labels to bronze-600. **(3)** Mount `F:` and run `FL_THEME=paper`. **(4)** Write the lint rule once (a) is paid down, or it lands as 1,130 errors. |
| 20 | **Three curation-shaped concepts, all locked, differently named** | Pinned Legacy (max 6, athlete-chosen) · Featured Legacy Moment (1, system-derived) · Featured on Profile (max 3, athlete-chosen, `L-12-Accomplishments-Management-Architecture` LOCKED). Two are called "Featured" and one of those cannot be chosen. Prior notes already record that athletes conflate pinned-vs-featured. **Both names are locked vocabulary**, so a rename is an amendment, not a refactor. Mitigating today: they never appear on the same screen, and the walkthroughs disambiguate them explicitly | Decide whether one gets renamed by amendment, or the vocabulary stands and the tours carry it |
| **27** | **Persist the untrimmed route — "store the front door"** | **PO APPROVED 2026-08-26, BUILD EXPLICITLY DEFERRED** (*"yes store the front door. not yet."*). Today's pass made the map show the whole run from the **in-memory** track, which needs no decision because nothing extra is stored — but that lasts only while the card is mounted. Making HISTORY whole means writing the untrimmed polyline, which reverses **D-RTE-1**, the load-bearing condition under which `Route-And-Elevation-Persistence-Amendment-001` lifted `Endurance-Statistics-Architecture-Amendment-001` §9's outright ban on storing route data at all. D-RTE-1's own reasoning is that *"a display-time rule protects the athlete from the screen; a write-time rule protects them from the system"* — the front door would then exist at rest, recoverable by any bug, export or breach. Also interacts with **D-RTE-5** (never shared by any surface), which is what keeps `External-Activity-Import-Architecture-Evaluation` §3's objection inapplicable. ⚠ **Existing runs cannot be recovered either way** — their ends were never written. | Write the amendment that reverses D-RTE-1 before any code: it must re-answer §3's objection, restate the D-RTE-5 sharing bar under the new storage model, and say what happens to `ROUTE_TRIM_NOTE`. `route-privacy.test.mjs` mutation-tests the trim, so the tests are the spec and both move together. |
| **28** | **Check-in video: sound and picture drift apart on playback** | PO 2026-08-26: *"I did a check in and then went to watch it back and the sound and video were off from each other."* **Diagnosed, not fixed.** A captured clip is re-encoded **twice** before upload: once by the iOS picker (`videoQuality: IFrame1280x720` in `useMediaPicker`, an old editing-intermediate preset) and again by `react-native-compressor` in `manual` mode (`video-compress.ts`). iPhones record **variable frame rate**; a re-encode that re-times the video track while audio keeps its own duration drifts progressively, which matches the report. The picker preset is now **redundant** — `video-compress-core.ts` says its own 720p target was chosen *to match* it — so dropping it leaves one encode instead of two. ⚠ **Not changed on a hypothesis**: it cannot be verified from a web preview and **needs a new native build either way**, so shipping it blind would have meant reporting a fix nobody had seen work. | Approve dropping the picker's `videoQuality` preset, then verify on the next TestFlight build with a clip long enough to drift. If it persists, the compressor is the culprit and the options are `auto` mode, a pinned/patched version, or a different transcoder — `react-native-compressor` 2.0.3 exposes no frame-rate or audio-sync option. |

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

> **✅ DEPLOYED 2026-08-25 — BOTH SURFACES, AND BOTH MIGRATIONS APPLIED FIRST.**
> Web: `entry-3a0a84f8218e98874aea6eb8d971a0fe.js` — `forgelegacy.expo.app` returned **200 twice** with a
> hash matching `dist/index.html`, and the live bundle was searched for **nine** strings only this pass's
> code contains (`Add a note for next time`, `that holds for every set`, `Add a coaching note`,
> `Underhand close grip`, `Measured by GPS as you go`, `rank building whether you look at it`,
> `Minimise`, `Say it better`, `built something real`). **All nine PRESENT.**
> **iOS OTA `01a039a8-f8d2-74e9-a13e-79dd7fc490cf`** on runtime `411fd2b68cbe11016f037dd7881b3fe813a1e148`,
> commit `0db5868`. `fingerprint:compare --build-id 078d2838-ce5c-476a-8527-35d186343bf5` returned an
> **exact match** BEFORE publishing, and the manifest endpoint was then queried as a build-6 iOS client
> and returned this update's id. **Deliverable, not merely published.**
> (Android also published — runtime `a8afa07c…`, update `01a039a8-f8d2-774c-93e7-74d765955f99`. No Android
> build exists, so it reaches nobody; recorded only so the id is not mistaken for the iOS one.)
> ✅ **`0178` + `0179` APPLIED AND VERIFIED BY THE PO BEFORE THE DEPLOY**, which was the required order:
> the squad post screen reads `squad_post_comments.edited_at` and `squad_post_reactions.kind`, so shipping
> first would have made every post read "Post not found". `0178` reported **10 acknowledgements, all
> `respect`** (so `non_respect_kinds: 0`, exactly as predicted); `0179` reported `policies: 3`,
> `signals_ok: true`, `nudge_rows: 0`.
> ⚠ **`my_signals` CAME BACK ALL ZEROS AND THAT IS NOT A DEFECT — THE PREDICTION WAS WRONG.** The bundle
> said `sessions` would roughly match the PO's finished workouts. The Supabase SQL editor has no
> authenticated user, so `auth.uid()` is NULL and every `athlete_id = auth.uid()` matches nothing. The
> check was designed wrong and told us nothing. What it was meant to prove is verified by a better route:
> §2 **called** `coach_nudge_signals()` and got all eight keys back, and a mistyped column would have
> raised there rather than returning a zero. **Do not repeat this shape of sanity check in a paste bundle.**
> ⚠ **`fingerprint:compare` STILL NEEDS `--build-id` IN NON-INTERACTIVE MODE** — bare `--non-interactive`
> exits 1 with "Insufficent arguments", which reads exactly like a failed comparison.
> ✅ **`0177` APPLIED 2026-08-25, AFTER the deploy** — `fn_exists: true`, **`guard_present: true`**, which is
> the assertion that matters: it reads `pg_get_functiondef` on the LIVE function rather than the file, so
> the consent check is genuinely in the database. ⭐ **AND THE HOLE WAS NEVER USED** —
> `requests_approved_historically: 0` across 4 squads and 16 memberships, so every membership that exists
> was somebody adding themselves. No client change was needed: `approveSquadJoinRequest` already surfaces
> an unrecognised `ok:false` as a plain failure, and `squad_pending_requests` only ever hands the screen
> ids that are already `pending`.
> ⭐ **RSA AMENDMENT 002 — the rank card fires on EVERY rank and sub-rank, all 28 steps** (PO, 2026-08-25:
> *"Yes I want the card to fire off on every rank and subrank"*). ⚠ **NO CODE CHANGED, AND THAT IS WHY THE
> AMENDMENT EXISTS.** `useEarnedMoments` has always enqueued on `promotedFamily || promotedSubTier`, while
> RSA §13.2 said *"There is no ceremony for sub-tier advancement"* — the DOCUMENT was the stale half, and a
> future reader finding that clause would have deleted the branch as a defect. §13.2 and §5 now carry the
> amendment pointer, **TBD-2 is resolved** (M-1 + the Progress Hub Rank Journey are the surfaces) and §22's
> C-3 is closed. ⚠ **§13.1 stays locked** — sub-tiers are not separate identities, so the card shows the
> FAMILY's §2.2 statement and per-sub-tier statements must never be authored.
> ⏳ **NOT YET CONFIRMED ON A DEVICE**, and most of this pass is visual — the cue lines, the note row, the
> Stay control, the rank badge, the acknowledgement sheet and the nudge have never been seen by a human.

### 0. ⭐ The coin's rim stopped floating, and Holt stopped repeating himself to an empty history (2026-08-26, Coach Holt medallion / CoachBubble nudges — **no migration**, ✅ **WEB DEPLOYED** `index-3fefea43a5f60eadb8d1d4e555d3abfc` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03fd3-3e7f-7e7c-a06e-f9f86336286e`)

Two PO reports in one sitting, unrelated to each other and both worse than reported.

**⭐ THE SLIVER IS SHADING, NOT AN EDGE.** PO: *"I don't know if I like the 3d look of it. The sliver on
the right side that's outside of the outline."* Measured outward from the coin's fitted centre
(192.5, 207.0 in master pixels): field and figure to R 152, then a **dark ring at R 153–157, median
luminance 4 of 255**, then the rim at R 159–173, then nothing. That trench is the 3D disc's own bevel and
it runs the whole way round — where the light catches it, lower-left, it fills with bronze and the rim
reads as part of the coin; where it does not, upper-right, it stays black and the rim's highlight floats
free as a crescent. **A crop was tried first and did nothing, because there is no stray geometry to
crop.** The trench is filled with the field's own colour and the rim redrawn as one flat ring lit from a
single direction, butted against the field with a 1 px seam.

**⭐ AND ALABASTER HAD COLLAPSED THE FIGURE INTO THE FIELD** — the light-mode complaint from earlier the
same day, which the ramp in **Recently Completed #1** improved but did not measure. Relief against field,
inside the coin:

| | shipped | now |
|---|---|---|
| Forge | 3.89 : 1 | **6.48 : 1** |
| Alabaster | **1.58 : 1** | **4.08 : 1** |

The old ramp squeezed the whole medallion into luminance 95–158. `#745730 → #F7E9D0` lands Paper on
Forge's separation, and the disc measures **5.6:1 against the cream page, up from 4.9** — it gained
presence rather than punching a hole. ⚠ **The light end stops at warm ivory on purpose**: near-white
scores *better* on separation and renders the coach in **pewter**, which `holt-mark-paper.py` had already
recorded once and which was confirmed again by rendering it.

⚠ **NOTHING WAS REDRAWN.** Same coach, same folded arms, same bubble — only the ring around him is new.
Eight vector reconstructions of the folded arms were drawn and rendered at 52/36/24 first and all were
worse than the original (chevron, slash, lectern, nameplate); the master's own artwork wins.

**⚠ THE PRISTINE ARTWORK MOVED to `coach-holt-mark.master.png`.** Both shipped files are now generated
output, so `holt-mark-paper.py`'s *"the Forge master, never written"* premise had quietly become false —
it would re-ramp a ramp. Superseded by `scripts/artwork/holt-mark.py` (both variants, one master) and its
entry point now hard-exits. ⏳ **`site/README.md` derives the landing page's `coach-mark.webp` from the
Forge file and has NOT been regenerated.**

**Home's lead mark 54 → 44.** It was the largest Holt in the app — bigger than the floating coin that is
his actual tap target — while its own comment called it low visual weight, and closing the artwork's 9%
dead margin made the same number read a tenth larger again. The ladder is now hierarchy rather than
drift: **52** floating coin · **44** lead card · **40** chat gutter · **34** session sheet. 52 was already
correct and stays; it simply now draws a coin that fills its box instead of one inset by 9%.

**⭐ AND THE NUDGE WAS SPENT ON THE TAP, NOT THE READ.** PO: *"coach holt as prompted me the same prompt
about honors about three times now… why it's repeating even after I clicked on it, and why other things
haven't come up (is it because I've used everything?)"* `CoachBubble` rendered the invitation on every
arrival at a home surface but only wrote `shown` from `openCoach` — so a line that was **read and not
tapped left no trace**. The effect keys on `pathname` and there are **four** home surfaces, so switching
tabs re-asked the same question.

⚠ **AND IT STARVED THE REST OF THE CATALOGUE**, which is the half that is not obvious and is the answer to
the second question. `honors` is eligible whenever `honors > 0` — **forever, once earned** — and it sits
third in a strictly ordered list. An un-retired nudge at the head is not merely repetitive: **nothing
below it is ever reachable.** `program`, `templates`, `progress`, `squads` and `metrics` were all waiting
behind one row that was never written. **Nothing had been "used up".** The write moves to the display and
is guarded by every suppression that follows it — a session, a ceremony, the tour, or a route off the four
home surfaces — because a nudge recorded while invisible is one the athlete never got, spent.

⛔ **NOT VERIFIED — whether the writes are landing at all.** `markNudge` is best-effort by design and
swallows every failure, so a missing grant or an RLS refusal on `coach_nudge_state` would look **identical
to this bug** from the client. `0179` grants `execute` on `coach_nudge_signals()` but nothing on the table,
relying on Supabase default privileges as every other table migration here does. If `coach_nudge_state` is
empty for an athlete who has tapped through a nudge, there is a second defect and this fix will not hold.
Query recorded in the session; **owed to the next pass.**

Gates: tsc **0** · lint at baseline · nudge domain **12/12** still green (the cadence was always right —
the caller was not doing its part) plus **4 new** in `nudge-repeat.test.mjs` holding both halves.
✅ **Verified against the live host**, not the deploy's own output: alias 200 with a matching bundle hash
on the first probe, and both marks fetched by their content-hashed URLs (`c0c05900d3…`, `d1676d3e77…`) —
the filenames *are* the md5 of the files in the repo, so the served bytes are provably the new artwork.
`fingerprint:compare --build-id 078d2838…` matched build 6 exactly before publishing, and the OTA went out
on runtime `411fd2b6…`. Commit `453d769` on `origin/feat/route-map`.
⏳ Not yet confirmed on a device.


### 0. ⭐ Alabaster's last frozen grounds — four surfaces kept Forge's colours under Paper's ink, and a housekeeping line had stranded every OTA (2026-08-26, Design System / Button / Coach Holt / Cardio Block / 14 screens — **no migration**, ✅ **WEB DEPLOYED** `index-4d3adbd886e3bc5a38a9ced52c38dac1` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03e67-50f5-7e57-8bdb-174baa84b6b2`)

**A correction pass on the light theme, from four PO reports in one sitting.** Every defect was the same
shape and the shape is worth naming: **a hard-coded GROUND under role tokens that flipped correctly.**
The compiler cannot see it — a frozen ground is not a missing token, it is a present literal — and
`foundation.paper.ts`'s shape types only catch a one-sided *addition*, never a one-sided *omission*.

**⭐ THE DISABLED FINISH WORKOUT BUTTON.** PO: *"that color I gave you for the finish workout is because I
hadn't completed any set. So it's showing that I can't click it, but it should be a better color than
that still."* `DISABLED_FILL_COLORS` was `['#1C1E22','#15171B']` — the only hard-coded colour left in the
composite — so on cream the button that could NOT be pressed became the highest-contrast object in the
footer, out-ranking ADD EXERCISE, which could. Paper's answer is a **recessed plate**: its top stop is
`surfaceRecessed` exactly, measuring **1.23:1** against the action bar. The label is measured rather than
picked — Forge's composites to **3.67:1** on its own fill, Paper's `#756D60` lands at **3.70**. The same
sweep took the `destructive`, `secondary` and `text` disabled roles, all of which were pale-on-dark.

**⭐ COACH HOLT.** PO: *"evaluate coach holt and his coloring to make him fit more with the light mode."*
The mark is a bronze relief struck on a **near-black field** (measured: median luminance 11/255), so
cover-filled into a 52px circle on cream it read as a hole punched in the page — wearing a hard black ring
and a black drop shadow besides. A second asset was generated rather than a `tintColor`, which would
flatten the relief that makes it read as struck: `scripts/artwork/holt-mark-paper.py` maps the master's
own luminance onto `bronzeMetallic`'s endpoints (#765B44→#C99767), the one gradient Paper deliberately
refuses to invert. **Four ramps were rendered at the real 52px on the real ground and compared** — two
came out pewter, one olive-brass. His in-session sheet was separately dropping a near-black curtain over
a cream app, having hand-rolled `flShadow.sheet` instead of using it.

**⭐ THE CARDIO BLOCK — and it was never running-specific.** PO: *"This is supposed to be the light version
for running, but I'm sure is all the cardio."* Correct: every cardio activity draws this card.
`backgroundColor: '#0D1116'` was frozen while the title, sub-line, segmented control and stat tile all
flipped — so Paper's **dark ink title was written onto Forge's black slab** and "Outdoor Run" was
invisible. The card now joins the ivory card family and the band across its top becomes a recess
(`surfaceRecessed`), which is how Forge's own below-the-card relationship reads on paper. Apple Maps tiles
were pinned `userInterfaceStyle="dark"` under a comment reading *"the app is dark everywhere"* — true when
it was written, false since Alabaster shipped.

**⚠ AND A DARK-THEME REGRESSION NOBODY HAD SEEN, BECAUSE ONLY THE LIGHT THEME WAS BEING REVIEWED.**
`paperScrim` is a PURE function that cannot import `IS_PAPER` — it is deliberately runtime-import-free so
`node --test` can reach its classifier — so it flips any near-black rgba to cream **in either theme**. The
gate lived at exactly one call site, privately, inside `screen-background.tsx`. **Fifteen other call sites
across fourteen screens** therefore painted a cream commit bar, footer or sheet backdrop over Forge's
near-black: Create Squad, Log Activity, Program Builder, Workout Builder, both Chapter screens, Create
Challenge, Squad Preview, Squad Transfer, Template Detail, Transformation Detail, Progress Photo Post and
Holt's chat sheet. Now `@/constants/theme-scrim`, shared, so skipping the gate is the odd case rather than
the majority — which is the actual fix, since a helper nobody could import from is how this happened.

**⭐ THE WHOLE RUN ON THE MAP — without touching D-RTE-1.** PO: *"I want the whole run on the map. The whole
cutting off part of the run I don't want that."* The stored polyline is trimmed 200 m at each end **before
it is written**, which is the condition under which `Route-And-Elevation-Persistence-Amendment-001` lifted
the outright ban on storing routes at all. Nothing about that changed and the mutation-tested suite still
proves it. What changed is that the card stopped discarding what it already had: `useRunTracker.stop()`
leaves the finished track standing, so after a tracked bout the **whole untrimmed run is in memory** — and
the card was drawing the stored shape anyway, showing the athlete less than the app was holding for no
privacy gain. Caption, sheet footer and map pins all now say which of the two shapes they are showing;
`WHOLE_RUN_NOTE` joins `ROUTE_TRIM_NOTE` rather than replacing it. Re-open the workout tomorrow and it
falls back to the stored shape, because the ends were never written down.

**⛔ THE PUBLISH ITSELF FOUND TWO DELIVERY DEFECTS, AND BOTH WOULD HAVE SHIPPED SILENTLY.**

  1. **`fingerprint:compare` refused the OTA.** `9f68311` (this morning, animation tooling) added a
     three-line ignore for `scripts/animation-processing/out/` to `.gitignore`. `@expo/fingerprint` hashes
     `.gitignore` ITSELF, so the runtime version moved off `411fd2b6…` — the runtime every tester's build
     is on — and **every OTA published after that commit would have reported a green publish to nobody.**
     ⚠ **THIS IS THE THIRD TIME** (`eas.json`'s submission block, then `2439b11`'s landing-page lines,
     fixed in `e3eba5e` — whose own message says *"any housekeeping commit can strand the phone, and the
     only way to know is to run the compare"*, eight days before it happened again). Same fix: the rule
     moved to `.git/info/exclude`, which is not hashed. `git check-ignore` confirms it still bites and
     `.gitignore` is byte-identical to build 6's.
  2. **A 22.3.0 deploy landed an EMPTY WORKER and printed success.** 404 for twelve minutes — on the alias,
     on the deployment's own URL, and on a direct asset path — with a `--dry-run` payload verified healthy
     immediately before (20,102 bytes of real `assets.json` entries, not 22.4.0's 295-byte empty object).
     **A good payload is necessary and not sufficient.** The runbook now carries the test that separates
     the two 404s: the alias lags, a deployment's own URL does not — *deployment 200 + alias 404* is
     propagation and must not be re-deployed, *both 404* is an empty worker and waiting cannot fix it. A
     re-deploy of the byte-identical `dist` was live and hash-matched on the first probe.

**Verified, not assumed:** every Forge value asserted byte-identical to the literal it replaced (14 colour
values plus all 10 distinct scrim strings, all OK); `tsc` clean; eslint clean; **2,858 tests pass**. The
live bundle was fetched from production and searched for eight distinct new strings — all found.

**A guard earned its place mid-pass.** `svg-gradient-stops.test.mjs` failed the first `<Stop stopColor={}>`
edit, because `react-native-svg` silently drops the alpha out of an rgba string and paints the stop opaque
on device. The tokens are alpha-free hex, so the fix was to say `stopOpacity={1}` out loud.

**Files:** `src/constants/foundation.forge.ts` + `foundation.paper.ts` (14 new tokens, both sides) ·
`src/constants/theme-scrim.ts` (new) · `Button.tsx` · `HoltMark.tsx` + `assets/images/coach-holt-mark-paper.png`
+ `scripts/artwork/holt-mark-paper.py` (new) · `SessionCoachSheet.tsx` · `CardioBlockCard.tsx` · `RouteMap.tsx`
+ `RouteMap.web.tsx` · `RouteSheet.tsx` · `src/domain/run/route-region.ts` · `screen-background.tsx` +
`CoachChatSheet.tsx` + 12 screens · `.gitignore` · `.claude/skills/deploy-web/SKILL.md` · this board.


### 0. ⭐ Alabaster — the app has a second theme, and the whole colour system had to become one (2026-08-25, Design System / every screen — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**Status: SHIPPED, BOTH SURFACES.** Web `index-a2457608…` (200 twice, matching hash, `Alabaster` and
`THEME_IS_SYNC` found in the LIVE bundle) · iOS OTA `01a03b5e-3ea4-76be…` on build 6's runtime,
`fingerprint` an EXACT match before publishing and the manifest endpoint served the new id to an iOS
client afterwards. Pushed to `origin/feat/route-map` (`b312a43`).

⚠ **THE V1 ARCHITECTURE FORBADE THIS AND STILL DOES ON PAPER.** `Component-Library-Architecture`
**CLA-D12**, `Forge-Design-System-Architecture` §5.6 and `Forge-Design-Blueprint` §567 all lock the app
dark-only. ⛔ **The amendment authorising it is NOT written** — the code shipped ahead of the document,
which is this board's recurring failure running in the opposite direction from usual. `Docs/Amendments/
Design-System-Architecture-Amendment-001-Light-Theme.md` with `DSA1-D##` IDs is **owed**.

⭐ **THE MECHANISM IS A RELOAD, AND THAT IS THE DESIGN.** All 277 `StyleSheet.create` calls sit at
MODULE SCOPE — they freeze their colours the moment a module is first required — so a live toggle would
have meant rewriting 240 files into style factories. Instead `foundation.ts` became a SELECTOR over
`foundation.forge.ts` / `foundation.paper.ts` with its public shape unchanged, so **all 184 consumers
compile untouched**. Gate for the split: **all 77 original dark tokens byte-identical**, 0 changed.

⭐ **ONE FILE RE-THEMED 205 SCREENS.** Every caller passes a hardcoded darkening scrim;
`ScreenBackground` flips them centrally, PRESERVING THE ALPHA — that number means *how much of the
plate is suppressed*, which holds in either theme.

⚠ **THE SAME BUG FOUND FIVE TIMES: A ROLE TOKEN FLIPPING UNDER SOMETHING.** `cream100` means "primary
text" — near-white in Forge, DARK INK in Paper. It was used for the Workouts toggle label on a bronze
fill, for titles over a 0.92 black media scrim (the Legacy cards read as blank rectangles — reported as
*"not showing any picture"*), for text over background artwork (a *"weird smear"*), and for a title
with TWO grounds at once. Each needed a fixed-in-both-themes token: `onBronze`, `onMedia`, `textHalo`.
⚠ In Forge every one of those grounds is dark, which is exactly why one value was right for years.

⛔ **AND TWO DEFECTS THE THEME ONLY REVEALED, NEITHER OF THEM A THEME BUG.** (1) The 72 artwork PNGs
were **never actually cut out** — the original pass used luminance directly as alpha, so the dark
background survived at ~40/255 over 87% of every asset. Invisible on black, a warm rectangle on cream.
Re-cut from the opaque masters by `scripts/artwork/alpha.py`. (2) `pins.poster_url` has existed since
`0005` and **nothing ever wrote it**, so video pins fall back to a bare `.mp4` — which native can draw
and **a browser on iOS cannot**, because iOS refuses to fetch video data without a gesture.
`ensurePinPoster` now extracts and stores the frame; ⏳ **native-only and unverified from here.**

⭐ **THE PHONE CAME LAST AND NEEDED A BOOT GATE.** PO: *"I clicked on Paper and it didn't change
anything."* AsyncStorage is a promise, so native could not know the theme before the stylesheets froze.
`expo-router`'s route modules are LAZY, so holding the first render holds the whole token layer:
`package.json` → `main` now points at `src/boot.tsx`. ⚠ **Verified the fingerprint does NOT move before
writing it**, or the fix would have needed a new TestFlight build.

⭐ Also shipped: the wordmark + page title unified across **all 214 AppBar titles** (`serif` removed,
not left inert); **drag-to-dismiss on every sheet that draws a grabber** (the shared composite had none
and 49 files use it); **Squads reordered** to Now → Together → Progress → History, with the guided tour
re-sequenced to match; 15 sticky bottom bars; Coach Holt 48 raw colours → 1.

⚠ **NOT DARK-NEUTRAL, DELIBERATELY.** White-on-bronze and the AppBar change alter Forge too, on the
PO's *"that should be for everything"*. Alabaster itself is **opt-in, Forge stays the default** — no
tester's app changes theme without them choosing it.

⏳ **OPEN:** the amendment above · **~1,130 raw colour literals in 178 files still do not follow the
theme** and the promised `no-raw-color-literals` lint rule is unwritten · the exercise animations need
drive `F:` mounted to re-render (the pipeline is correct and proven on frames, `FL_THEME=paper`) ·
32 rank badges need a light art pass · ceremonies re-theme but have no Paper artboard · bronze-400 as
small text measures **3.74:1** on cream (was 5.78 in Forge) — `--fl-bronze-600` fixes it at 4.74 and is
NOT applied, because it is the PO's accent.

**Gates:** tsc **0** · **2,849/2,849** · lint **at the pre-existing baseline (1 error + 13 warnings)** ·
fingerprint matched build 6 · web export clean, 96 routes prerendering through the new entry.


### 0. ⭐ A coaching cue can finally be written where a workout is built — and three doors were eating the ones Holt already wrote (2026-08-25, W-25 Workout Builder / Active Workout / Coach Holt — **no migration**, ⏳ **NOT DEPLOYED**)

**PO:** *"When I'm either doing final touches on a coach holt program or building a program, I should be
able to leave a note here like 'underhand close grip' that shows up during my active workout either from
coach holt or on the card."*

**The model was already right and had been for a while.** `ProgramExercise.coachNote` /
`TemplateExercise.coachNote` / `SessionExercise.coachNote` exist, are documented at length, and are
emphatic about the one distinction that matters: **the author's cue is not the athlete's log note.** One
is the prescription, written into the plan and shown to whoever trains it every time; the other is
"shoulder felt off", written during a session. Merging them would let a diary entry overwrite a coaching
instruction. Nothing here changes that separation — this pass finishes the field rather than adding one.

⭐ **THE AUTHORING GAP WAS EXACTLY ONE SCREEN.** The Program Builder has had the editor since cues
existed. The **Workout Builder (W-25, "Build a Template")** — the screen in the PO's screenshot — has
**round-tripped `coachNote` through `toTemplateExercises` and `hydrate` the whole time and never had
anywhere to type one.** ⚠ **And it was specified**: `Docs/Free-Workout-Builder-Spec-W25.md` §3.5 draws
`[Notes: Add a note for this exercise...]` in the exercise-card wireframe, §5.3 specifies the interaction,
§5.2 says it is shown for every activity type, and it sits **unticked in the spec's own build checklist**
(§ "Exercise rows", § "Notes: all activity types"). This is the board's recurring pattern — *specified,
locked, never applied* — in its quietest form, because the field round-tripped so nothing looked broken.

⚠ **THE CAP IS 280, NOT THE 200 §5.3 NAMES, AND THAT IS DELIBERATE.** Both builders write the **same
field**, and a program day authored at 280 reaches this screen through a saved template. A shorter cap
here would silently truncate a cue on the way past. §5.3's 200 predates `coachNote` existing.

⛔ **THEN THE READ SIDE, WHERE THE REAL LOSSES WERE — THREE LAUNCH DOORS DROPPED THE CUE ENTIRELY.**
`WorkoutLaunch.exercises` was declared inline as **four fields** (`catalogKey`/`name`/`sets`/`targetReps`)
and its consumer read exactly those and stamped `section: 'main'` on every row. Honest for an **invite**,
which snapshots a workout to its bones. But three other things travel that field:

1. **Home → "Build for later" → Save & Start**, and
2. **Home → the parked hero → start it**, both handing over a whole `TemplateExercise[]`, which arrived
   with **warm-up and cool-down flattened into main, supersets dissolved, cardio blocks turned into sets
   of reps** — and, once cues could be authored, the cue gone too.
3. ⭐ **Coach Holt's chat → "Start it now"**, which is the PO's *"from coach holt"* half. `save-shapes.ts`
   **declared this gap in its own header** — *"The coaching cue does NOT travel… Starting a day Holt built
   loses his cue; saving it as a template keeps it. That is a real gap and it is stated rather than papered
   over."* ⚠ **And `buildDayWorkout` writes cues onto Holt's rows already**, which the rewritten test
   proves — so **every cue he wrote was being thrown away on Start and kept on Save. Same day, same coach,
   two answers, and the athlete got the empty one at the rack.**

⚠ **THE FIX IS A WIDENING, NOT A NEW MECHANISM.** `TemplateExercise` requires precisely the four fields
that were declared inline and makes every other one optional, so **every existing writer type-checks
unchanged** and the four-field invite row is already a valid value. The consumer now runs
`templateToSessionExercises` — the crossing that already existed for this shape — whose set construction
is character-for-character what it replaced (`Math.max(1, e.sets)`, `targetReps || 8`, the same `'main'`
default), so **an invite builds byte-for-byte the session it built before.** `starterId` exists in that
same file specifically to avoid this trap; the planned workout was walking into it anyway.

⭐ **AND ON SCREEN — A LINE, NOT THE CARD THAT WAS DELETED.** `THE PLAN SAYS` used to be a hero card here
and was removed in the 08-24 *"cards are for things you act inside of"* pass — correctly, and its styles
carry a warning against rebuilding it. ⚠ **A cue is information, so it gets a line.** Cream italic under
the exercise name, no border, no background, **no bronze**, in the same voice the ⋯ menu and both builders
already show a cue in. ⚠ **Drawn in BOTH hero faces**, which is the whole point: the hero auto-collapses
on the first resolved set, so from set two onward the collapsed strip is all of the lift the athlete can
see — and *"underhand close grip"* is exactly as true then as it was walking up.

⚠ **HOLT KEEPS HIS ARRIVAL RULE AND CHANGES HIS WORDING — the PO's call.** `coachLine` retires the plan
cue once a set is logged, which is right for *"go up to 95 lb"* (a sentence answered by doing it) and
reads as a broken coach for a grip cue. Rather than exempt it, **he now says it covers the whole
exercise** — `"<cue> — that holds for every set."` — then retires on the first set or the X, as before.
⚠ Added in the **render**, beside `inUnits` and for the same reason: `coachLine` returns the sentence the
plan holds, and stitching presentation into it would put the suffix into the unit tests and the chat
sheet. ⚠ And added **before** the dismiss comparison, which keys on the final text — suffixing after would
mean the athlete closed one string while the next render produced another, and the X would stop working.

⛔ **AND THE ATHLETE'S OWN NOTE HAD THE SAME DISEASE, ONE SCREEN LATER.** PO, on seeing the pass:
*"It doesn't show up anywhere in the active workout though. Like, there's no place to type and leave a
note that's obvious for me."* ⚠ **The field was not missing — it was finished, saved, read back, and
unreachable.** `ex.note` writes to `workout_exercises.notes`, `fetchLastNotes` reads it, and it returns
as the **LAST TIME** block on the hero next session. The only way in was the ⋮ sheet, **eleven rows down
and below the fold**. ⚠ **That is the worst version of the failure**: the OUTPUT was visible and the
INPUT was not, so the app showed the athlete notes with no evident way to have written one.

⭐ **It is now a row on the card**, under Add Set / Remove Set — *"Add a note for next time"*, and the
note itself in cream italic once written. ⚠ **Placed BELOW the three mutually-exclusive bodies, not
inside the set table**, which is the part worth keeping: the table draws for a strength lift, a
`CardioBlockCard` draws for a run, and a superset member draws **neither** — so a row inside the table
would have shipped on exactly one kind of exercise and been missing from every run and every superset.
One instance below all three covers each. ⛔ **The one honest exclusion is the FUSED superset card**,
which merges two exercises, so *"a note about this exercise"* has no referent; tapping a member's name
opens it on its own card, where the row is. ⚠ **And the sheet now says what the note is FOR** — *"How it
went, for next time — you'll see this when this lift comes round again"* — because the note's whole
value is that it comes back, and an athlete who does not know that has no reason to write one.

**Gates:** tsc **0** · **2,328 / 2,328** (2,326 baseline + **2 new**) · eslint **1 error + 13 warnings =
the pre-existing baseline, nothing added** (the error is `use-color-scheme.web.ts`, untouched).

⚠ **ONE TEST NOW ASSERTS THE OPPOSITE OF WHAT IT USED TO, AND THAT IS THE FINDING.** `"the launch shape is
exactly four fields"` guarded the old gap and was correct when written. It had to be **rewritten rather
than relaxed**, because running it against the real `buildDayWorkout` fixture is what proved Holt's cues
were being dropped — the fixture rows carry cues. It now asserts they survive, plus that a row with no cue
grows no key (absent, never `''` — an empty cue would draw an empty italic line for the whole lift).

⏳ **NOT DEPLOYED, AND VISUAL — no test in this repo can see the cue line or the strip.** The authoring
sheet, both hero faces and the coin's new suffix have never been rendered for a human. Needs a web deploy
and an OTA (no native code, so it is OTA-safe on build 6).

### 0. ⭐ Cards are for things you act inside of — Home stops being a stack of rounded rectangles (2026-08-24, Home / ProgramMissionGrid / YourCircleCard — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO, and it is a RULE rather than a screen fix: *"Cards are reserved for things the user acts inside of. Information doesn't automatically get a card."*** The diagnosis that produced it is worth keeping whole: *"the top of the screen does not feel AI generated"* — the chapter's editorial serif, the diamond rule, the bronze quote line — *"then you get down into the product UI and it gradually becomes more like a premium component library."* Home was running `container → label → content → divider → container` three times, so Today's Workout, Program/Mission and Your Circle all said **"I am a card"** when they are an action, an objective and a group of people.

⚠ **THE FIX IS SUBTRACTION, NOT MORE DESIGN.** PO: *"Don't add more design. Remove some componentization."*

⭐ **PROGRAM + MISSION LOSE THEIR SURFACES IN BOTH STATES.** With a program they are an open two-column region with a single centre hairline — no outer border, no per-column background, no radius, no shadow; without one, Mission stands alone at full width under a section label instead of leaving *"an awkward missing card"*. **Both halves stay independently tappable and keep their chevrons**, so the usability of the tiles survives without their surfaces. ⭐ **The proof it is real is mechanical: `flRadius` and `flShadow` are now unused imports in that file** — nothing left has a corner or an edge to cast one. The `0 / 36` unit label also moved from beside the count to under the bar, because pushing it to the far right was only ever balancing the container.

⭐ **THE HOLT PROMPT BECOMES THE JOINT.** It was a centred 12.5sp line of bold sans reading as a footnote to Mission. It now runs **edge to edge** — `marginHorizontal: -18` cancels the content padding and pays it back inside, so the rules reach the screen edge while the mark stays on Home's left margin — separating the athlete's own material above (chapter · today · objective) from other people below (circle · train together). ⚠ **Its hairlines are NEUTRAL on purpose.** Bronze is Home's "do this now" signal and it was already edging nine separate things; PO: *"if everything receives bronze edging, it starts behaving like a default border colour rather than an accent."*

⭐ **YOUR CIRCLE DROPS THE ROUNDED RECTANGLE INSIDE THE ROUNDED RECTANGLE.** The live session sat in its own bordered, filled, rounded box inside the card's own bordered, filled, rounded box. ⚠ **Nothing is lost by removing it** — the presence dot, the LIVE NOW label, the pulsing avatar ring and the Join button are four signals saying someone is training, and none of them was the border; the card's own edge already warms to bronze (`cardLive`) when the block is present, which is the lighting the box was standing in for.

⚠ **NO COLOUR CHANGED, AND THAT WAS CHECKED MECHANICALLY** — the diff contains **zero new colour literals**, every value being an existing token. **One consequence flagged for veto rather than buried:** the column eyebrows moved `gray600` → `bronze400`, because they are section labels now and that is what `SectionHeader` already uses for every other section on Home (CLA-D14, the one sanctioned all-caps scale).

⛔ **TWO THINGS IN THE MOCKUPS WERE DELIBERATELY NOT BUILT.** A **fifth "Friends" tab** appears in both — it has **never existed in this repo** (four tab files; the layout's own comment says *"the 4-tab bronze shell"*), and bundling an IA change into a layout pass is how one gets approved by accident. And the *"extremely faint gradient behind the whole region"* was offered as a *perhaps* and is a style addition, not layout; the region sits on flat ground below the hero, so it is one line to add if legibility ever suffers against the stone.

⏳ **Visual only — no test in this repo can see it.** tsc **0** · **2,795/2,795** · lint at baseline. ✅ **BOTH SURFACES** — web `entry-3b607e682445b33323b709b2a0ca9166.js` (prod **200** on the first check, live bundle **MD5-identical** to `dist/`, five new style names found in the **LIVE** bundle) + **iOS OTA `01a03706-9c5a-7a69-ad99-d0d92e84dc2c`** on runtime `411fd2b6…`, `fingerprint:compare --build-id 078d2838…` an **exact match before publishing** and the manifest served this update's own id to an iOS client afterwards. Commit `8341f4d`.

### 0. ⭐ Five of the seven cardio activities could not be found at all — and every machine was offered a road (2026-08-24, Exercise Picker / Conditioning / both Builders — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO: *"when I search for any of the cardios they don't come up while I'm adding an exercise"*** and ***"stair climber should only be indoor so there doesn't need to be a toggle."*** Both were worse than reported, and the second turned out to be a comment the code had never honoured.

⚠ **THE SEVEN ACTIVITIES ARE THE ONLY WAY TO LOG CONDITIONING** — the 49 catalogue rows that duplicated them are hidden by decision (2026-08-03), because picking "Interval Run" built three sets of eight reps of a run. So a search term that reaches none of the seven is not a near miss; it is the app stating it has no rowing machine.

⛔ **TWO FAULTS COMPOUNDING, AND THE SECOND IS THE ONE THAT HID THE FIRST.** The picker matched conditioning on `name` **alone**, so **Ride** never answered to *"bike"*, **Row** never to *"rowing"*, **Swim** never to *"swimming"*, and nothing at all answered to *"treadmill"* or *"cardio"*. Worse, the section was rendered **inside the `hasResults` branch** — and `hasResults` is computed from the catalogue only. Whenever the catalogue returned nothing, the screen took the **"No matches" empty state** and the section holding the answer was never drawn. ⭐ **Measured over 30 real search terms before touching anything: 27 found no cardio at all.** Run, Walk and Row appeared only by **luck** — unrelated lifts kept the results list non-empty for them (*"row"* alone hits **81** catalogue rows). After: **0 of 30 dead.**

**The fix is a match, moved.** `CARDIO_SEARCH_ALIASES` gives every activity what people actually type, and the rows are matched on `searchFields` — the same token-AND rule the catalogue runs — **before** anything decides the screen is empty. Every activity also answers to *"cardio"* and *"conditioning"*, so the category is findable by its own name. ⚠ **A second, quieter defect fell out of reading it:** with the CARDIO chip applied, `buildSections` widens the pool for that one filter, so those same seven rows were **already in the results and drawn a second time below**. Now suppressed.

⚠ **THE STAIR CLIMBER'S TOGGLE WAS NEVER GATED, AND TWO COMMENTS SAID IT WAS.** `OUTDOOR_CAPABLE` has said since it was written that a machine has no outdoors, and `deriveName`/`deriveEquip` both honour it — but nothing in the UI ever asked. **A rower, an elliptical, a pool swim and a stair climber each drew an Outdoor/Treadmill segment**, in the Active Workout card *and* the Program Builder, and its indoor half was **labelled "Treadmill"** because the label only special-cased the bike. Tapping Outdoor on a stair climber saved the bout as outdoors. `resolveModality` replaces four separate `?? 'outdoor'` fallbacks, and the toggle is gated on `OUTDOOR_CAPABLE` — which is also what makes the label correct **with no second special case**, since only run, walk and ride now reach it.

⛔ **AND MAKING CARDIO FINDABLE EXPOSED THE TRAP REBUILT ONE DOOR OVER.** Both builders mapped **every** picker hand-off to a strength row, so picking "Run" produced *3 × 8 reps of a run* — precisely what hiding the 49 catalogue rows removed. It had been reachable all along for Run, Walk and Row; this pass would have opened it to all seven. Both now read the key with `activityFromKey` and build the same `newCardioBlock` their own cardio sheets do, so **both doors produce the identical row**. The Active Workout always did this correctly (`pickedToExercise`); only the builders did not.

⚠ **The baseline this board recorded was already stale** — it read **2,782**; the suite was at **2,785** before this pass. Now **2,795/2,795** with **10 new**, tsc **0**, lint at the real baseline (1 pre-existing error + 13 warnings). ⭐ **Guards proven by mutation in both directions**: restoring `?? 'outdoor'` and stripping one activity's aliases fails **4** tests; removing the cardio branch from the builder hand-off fails **2**. ⏳ **The empty-state fork itself is JSX and no test here can see it** — the 27→0 figure comes from running the real matcher over the real catalogue, not from the screen.

✅ **WEB DEPLOYED AND VERIFIED** — `entry-a1eabe43da69d8e09241a0b2db6a45c2.js`, prod **200** on the first check (no alias fault this time), live bundle **MD5-identical** to `dist/`, and six strings only this code contains found in the **LIVE** bundle. Commit `3848650`. ✅ **OTA PUBLISHED AND PROVEN DELIVERABLE ON BUILD 6** — iOS update `01a036aa-a5a8-774d-a200-471e8e3c7a33`, group `220ea088…`, on runtime `411fd2b6…`. `fingerprint:compare --build-id 078d2838…` was an **exact match BEFORE publishing**, and the manifest endpoint was then queried as an iOS client on that runtime and returned **this update's id** — delivered, not merely published. (Android also published, `01a036aa-a5a8-75c1…` on runtime `a8afa07c…`; no Android build exists, so it reaches nobody — recorded only so the id is not mistaken for the iOS one.)

### 0. ⭐ The goal form now says what a goal can be — and what its number means (2026-08-24, G-3 Goal Create/Edit — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO: *"people are getting confused on what they can put as a goal."*** The form asked for a "Goal" and offered one placeholder — `e.g. Squat 405 lb` — which reads as **the** permitted shape rather than one example of many. ⚠ **Neither the G-3 spec nor `Forge Goal Create Edit.dc.html` has ever carried an explanation under a field label**, so the omission was faithful to both and still wrong in front of a real athlete. Nothing was contradicted; a slot was added.

`Field` gains an optional `hint` — one plain line between the label and the input. **Goal** names the four kinds *before* it gives examples (*a lift, a bodyweight, a distance, a habit*), then spans the range with three: *"Squat 405 lb" · "Run 100 miles" · "Train 3× a week"*. Kinds first is the point — a list of examples alone just invites pattern-matching on the examples, which is the failure that was already happening against the placeholder.

⚠ **The target field explains itself in whichever form it is currently in**, because that one box holds four different things depending on state: an amount to lose or gain, a goal weight, a goal measurement, or a free number. It now also states that **leaving it blank is a choice** — a narrative goal you mark achieved yourself — which the form had only ever implied through a placeholder.

The target label and its hint are computed as a **pair**. They have to agree or the number is misread; the label was previously a nested ternary inline in the JSX with nowhere to put a second string beside it.

**Not touched, deliberately:** `chapter/new.tsx`'s first-goal step already explains itself (*"One goal, and it can be a number or just a sentence"*). The confusion is specific to G-3, which had no such line.

⏳ **Copy and layout only — no test in this repo can see it.** tsc **0** · eslint **clean on the file** · no domain change, so no test moved. ⏳ **Still open by decision:** typing a number reveals **nine** "Track Progress" chips at once; that row is the next-largest source of stall on this screen and was left for a separate pass.

✅ **WEB DEPLOYED AND VERIFIED** — `entry-0a48500ea73c7f347b2e3b1b4b97bf04.js`, prod **200**, live bundle **MD5-identical** to `dist/`, and three strings only this code contains found in the **LIVE** bundle. Commit `13b3a4c` on `feat/route-map`. **Shipped to the phone in the same OTA as the entry above** — one update carries both passes, published from `923a4ae`.

⚠ **THE DEPLOY TOOK THREE COMMANDS AND TOOK PROD DOWN IN BETWEEN — BOTH KNOWN FAULTS IN ONE PASS.** The first `eas deploy --prod` was an **empty upload** (`kvfkwn5b6l` 404s *everything*, `/manifest.json` included), and promoting it took `forgelegacy.expo.app` from working to **404**. The second uploaded correctly — deployment URL 200 on the right hash — but **the production alias never moved**, despite the log printing `Promoting deployment to production ✓`. `eas deploy:alias --prod --id 5ifqglltbd` fixed it. ⚠ **CORRECTION TO THE RUNBOOK: the alias fix is NOT "effective within ~10s."** Six checks across ~60s were still 404; it came good somewhere past two minutes. **Do not re-deploy inside that window** — that is precisely what manufactures the orphaned deployments the runbook then blames on the upload.

### 0. ⭐ Two PO reports, and both were worse than reported — a list that never looked again, and a feature with no door (2026-08-24, Workouts tab / Program Builder — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO: *"When I build a template it says saved but doesn't pop up on my saved templates right away. There is a delay."*** ⚠ **There was no delay and nothing was slow.** The Workouts tab read the template list ONCE per tab mount and never again — `useQuery` runs on mount and on a deps change, and `[]` means neither ever happens twice. "Your Templates" showed whatever was true when the tab first rendered, **for the life of the session**; the "delay" was however long it took for something to unmount the tab.

⚠ **THE LINE DIRECTLY ABOVE IT ALREADY DID THE RIGHT THING, AND SAID SO.** `myPrograms` has been refetched on focus since it was written, with a comment reading *"so a program just built ... shows up the moment they come back to this tab."* The templates query sat one line below that sentence and did not do it. **`/templates` — the hub — was always correct** and refetches both lists on focus, so the same athlete saw the template in one place and not the other. That is what made it read as a delay rather than as a screen that never looked again. ⚠ **Same shape as the coach bubble's stale draft name** (a `[]` effect reading a fact that changes on another screen); this is the recurring version of that bug here.

**PO: *"Right now I had to really search for the use a saved week feature in building a program. Should just be a subtle button under the days of the week."*** ⚠ **In the default program shape it was not hard to find — it was UNREACHABLE.** The only two doors were the `⋯` in a week's AppBar and the `⋯` on a row of the WEEKS list, and **both exist only when `vary` is true. `vary` defaults to false.** So an athlete building an ordinary program — one week's shape, repeated — had no path to it at all, and "I searched and could not find it" is exactly what happened.

**The draft model was never the problem.** `weekTemplateIntoWeek` has handled repeat mode since it was written (*"the index is meaningless there and is ignored"*) and `chooseWeekTemplate` already resolves the non-vary target. **Only the door was missing** — the feature shipped the week before with its own logic complete and its entrance behind a menu that half the athletes never see.

Now a subtle row under the day list, where the PO asked for it: in `WeekDaysView` for the open week, and in `SetupView` for repeat mode. **Deliberately NOT in vary's `SetupView`**, where the list is WEEKS and one row could not say which week it meant — that shape already has its own doors. Measurably quieter than the same action in the sheet: hairline charcoal border, no fill, one line, because the sheet's version is the first of three offers and this one sits under a half-built workout list it must not compete with.

**Files:** `src/app/(tabs)/workouts.tsx` · `src/app/program-builder.tsx` (`UseSavedWeekRow`).

**Gates:** tsc **0** · **2,785 tests green** · lint **at baseline**. ⚠ **NEITHER FIX HAS A TEST** — both are wiring (a focus refetch and a render path) and this suite is domain-level. Recorded rather than glossed.

✅ **WEB + OTA DEPLOYED AND VERIFIED 2026-08-24.** Web `entry-17bd86b829cbd32a073ce8149f437481.js` — 200 with a matching hash, and the served 13.4 MB bundle was searched for `Use a saved week` and `Fill this week from a week you have saved`; both **PRESENT in the live JS**. **OTA `01a035e2-f8c4-7ea0-8c2c-5154f59b4bb4`, commit `8ae07d6`, runtime `411fd2b6…`** — `fingerprint:compare` matched build 6 exactly before publishing and the manifest endpoint returned this id to an iOS client on that runtime. ⏳ **Still not looked at by a human on a device.**

### 0. ⭐ "I don't know which of these to choose" — Holt can finally answer it, off the shelf he did not write (2026-08-24, Coach Holt / W-2 Discover — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**, ⏳ never rendered for a human)

**PO:** *"should we have a button in the program that says (and it would be a subtle button) don't know
which to choose? Let us help"* — then, offered the choice between shipping the link against the existing
build flow or teaching Holt to recommend from the catalogue: ***"I say build both."*** Both are built.

**The gap was real and it was one-directional.** Home already carried this door — the lead card of the
first-program block is Coach Holt — but only for an athlete with NO program. The moment somebody was
stood in Discover comparing fourteen named programs, the help disappeared, and the only thing on that
screen that could help was a door OUT of it: *let me write you a different one*. That replaces the
athlete's question rather than answering it, and the shelf is real, authored, locked work.

**A — the link.** A row under the family chips on Discover: *"Not sure which one? Ask Coach Holt."* No
border, no fill, no icon — subtle was the ask and it is also correct, since a card there would compete
with the programs it is offering to help choose between. It opens the coach that already exists
(`openCoach('recommend')`), **not a second picker**: Home's own note records the decision this would
otherwise undo, that "Build it with me" and "Help me find one" were collapsed because they were two
doors to the same room.

**B — Holt reads the shelf.** New pure domain module `domain/coach/recommend.ts`. Ranks the 16 shipped
definitions on a goal→family table (primary and secondary), an editorial theme bonus, sessions-per-week,
and room. Returns ONE recommendation and at most one runner-up, because the athlete's problem was too
many options and a ranked list of fourteen is the same problem in a new order.

⚠ **THE PART THAT MATTERS IS THAT IT REFUSES.** There is **not one Running program on the shelf** —
`ProgramFamily` carries the value and nothing populates it — so a scorer with no floor answers "Run a
marathon" with a six-day barbell block, confidently, because it was the least-bad row in the table. Every
endurance goal refuses on the goal alone, before a single program is scored, and `MATCH_FLOOR` refuses
again when nothing clears a defensible stretch. Same rule `rulebook/endurance.ts` already keeps: **refuse
rather than guess.** A refusal is never a dead end — it hands over to the thing that CAN help.

⚠ **AND EVERY CARD NAMES WHAT IT GOT WRONG.** A shelf program is FIXED: it cannot drop a movement for a
bad shoulder, cannot become four days because that is the athlete's week, cannot move down a rung. Each
of those is rendered at the same size and line height as the reasons — shrinking a caveat is how it
becomes small print, and a recommendation that quietly swallows a mismatch is the app asserting a fit it
did not achieve. **The limitations question is never asked**, deliberately: `constraints.ts` already
refused that shape once for the absent `wrists` flag — *"a checkbox that changes nothing is worse than an
absent one"* — so the limit is stated instead, and doubles as the honest reason to have him write one.

**Three defects found while building it, each fixed:**

1. ⚠ **A CRASH ON THE COLDEST PATH.** `askShelf` short-circuits an endurance goal without asking about
   level, so it reports READY with `experience` unset — and the first cut read `merged.experience!.lifting`
   straight off it. Fine for a returning athlete, whose level is remembered; a **TypeError** for a brand-new
   one whose very first tap is "Run a race". Now defaulted, with the defaults provably unreachable, and a
   test that walks the questionnaire from cold to prove the premise still holds.
2. **A full-gym athlete was recommended a no-equipment program** on an id tie-break. Trainable, and still
   the wrong answer — they had just said which room they were stood in. Room alignment now breaks ties.
3. **Holt would recommend the program you are already four weeks into**, since `recommend.ts` is pure and
   knows nothing about what the athlete owns. The active program comes off the shelf at the boundary.

**The rung penalty is asymmetric, and that is the safety property.** A program below the athlete is
unexciting; one above them is a block they cannot finish, and for a beginner one they can get hurt in.
Beginner→Advanced is vetoed outright. The visible consequence: a **beginner who wants to build muscle
gets Strength Foundation I, not Muscle Building Intermediate** — every Muscle Building program on the
shelf is Intermediate and one of them literally reads *"Arrive ready for the block periodization of
Muscle Building Advanced"*.

**Also:** a sixth opener and a **third Coach Home row** — a delta from `Coach Holt Chat v2.dc.html` §3
(three cards, two rows), recorded rather than slipped in. The test one file over states the principle it
would otherwise violate: *"A missing one is a capability with no way to reach it from Home."* A door
reachable from exactly one screen is the same defect the Discover link was added to fix, one level up.
That test asserted "all five" by count, which meant the sixth door could only be added by editing the
guard; it now asserts the invariant that was always the real one — that the two sets are equal.

**Files:** `src/domain/coach/recommend.ts` (new) · `src/domain/coach/__tests__/recommend.test.mjs` (new,
19 tests) · `src/domain/coach/chat-core.ts` (`ChatMode`, `askShelf`, `PickCard`/`pickCardFor`, the
`pick` opener + Home row, `Chip.startsBuild`) · `src/components/forge/CoachChatSheet.tsx` (`pick` mode,
`PickCardView`, the `reading` status, the shelf glyph) · `src/hooks/useCoachDoor.tsx` (`recommend`
intent) · `src/app/(tabs)/workouts.tsx` (the link) · `chat-core.test.mjs` + `voice.test.mjs` (opener
tests).

**Gates:** tsc **0** · **2,785 tests green** (+19) · lint **at baseline** (1 pre-existing error, 13
warnings, unchanged). ⚠ **The 19 new tests run against the REAL 16 programs read off disk**, not a
fixture — a hand-written shelf would let the scorer be graded against programs invented to flatter it,
and would go stale the day somebody authors a seventeenth.

✅ **WEB + OTA DEPLOYED AND VERIFIED 2026-08-24.** Web `entry-9df51193f361711c72f48b85601def94.js` — `forgelegacy.expo.app` returned **200** twice with a matching hash, and the live bundle was fetched (13.4 MB) and searched for five strings only this pass contains: `Not sure which one?` · `FROM THE FORGE SHELF` · `Use a saved week` · `Which one should I pick?` · `Two sizes: a day, or a week`. **All PRESENT in the served JS**, not merely in `dist`. **OTA published to `production`, commit `b6f4b54`, iOS update `01a035ce-ddd5-7c6f-98fc-bb4e51816f5a`, runtime `411fd2b68cbe11016f037dd7881b3fe813a1e148`** — `fingerprint:compare --build-id 078d2838…` matched **build 6 exactly** BEFORE publishing, and the manifest endpoint was then queried as an iOS client on that runtime and **returned this update id**. Deliverable, not merely published. (Android also published — runtime `a8afa07c…`, update `01a035ce-ddd5-718a-8622-e5de3595ae17`. No Android build exists, so it reaches nobody; recorded only so the id is not mistaken for the iOS one.) ⏳ **Still not confirmed on a device, and the card has never been looked at by a human on any surface** — every check above is a string search, which proves the code shipped and says nothing about whether it looks right.

⚠ **One pre-existing hazard noticed and NOT fixed, because it is not this pass's:** `openCoach` during a
live workout sets the flag while `CoachBubble` returns null, so nothing opens and the sheet may appear
later. Home's three existing doors have it identically.


### 0. ⭐ A saved week can be dropped into a program week — and two builder defects the walkthrough found on the way (2026-08-24, Program Builder / Templates / Tour — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6** — same publish as the entry above, `entry-9df51193…` · iOS `01a035ce-ddd5-7c6f…`)

**Method:** a walkthrough review of all three builders before a line was changed — every screen, route, sheet and draft-model function read end to end, written up in `Docs/Builder-UX-Review-2026-08-24.md`. The PO answered its three open questions the same day and all three were built. **The review keeps its original wording on purpose**: it is the record of why each change was made, with the fix named beside each finding.

**⭐ THE FEATURE: WEEK TEMPLATES COMPOSE NOW.** A day template could fill a program day; a week template could only ever be run on its own, which made the two libraries read as different KINDS of thing when they are the same idea at two sizes. The Week sheet's "Use a saved week" closes that. It is `weekTemplateIntoWeek` + `weekFit` in `program-draft-model.ts`, a `WeekTemplateSheet` chooser, and a confirmation.

**⚠ IT REPLACES THE WEEK, AND THERE IS NO APPEND — that is not a shortcut, it is the honest shape.** `templateIntoDay` offers append because a day can genuinely be built from two shapes stacked together. A week cannot: appending would have to mean "add days to the end", and the end is fixed by `daysPerWeek`. So the only question worth asking is what the replacement COSTS.

**⚠ AND THAT COST IS ARITHMETIC, SO IT IS COMPUTED AND STATED RATHER THAN DESCRIBED.** `weekFit()` returns `{ taken, dropped, emptied }` and it surfaces **twice**: on every row of the chooser (*"fits exactly"* · *"2 days won't fit"* · *"leaves 1 day empty"*), so a choice BETWEEN saved weeks can be made before tapping one — and again in the confirmation, as a sentence carrying its reason: *"This week has 5 days and your program trains 3 — only the first 3 come in."* A bare "2 days won't fit" reads as a bug in the import rather than as two day counts that were authored independently and are under no obligation to agree.

**⚠ POSITION OWNS THE LETTER, THE TEMPLATE OWNS EVERYTHING ELSE.** Slot 0 stays `A` however the template named it, because `lockedCells` and the schedule both address days BY POSITION. The day NAME travels — "Push" is content, not an address.

**⚠ A SHORTER WEEK EMPTIES THE DAYS IT DOES NOT REACH.** A 3-day template into a 4-day program leaves day D blank rather than keeping what was there. Keeping it produces a hybrid week nobody authored, with no visible seam — the worse of the two failures and the one found weeks later.

**⚠ IT DELIBERATELY DOES NOT CHANGE `daysPerWeek` TO MAKE A TEMPLATE FIT.** That value governs every week in the program, so importing one week would silently restructure all of them. The confirmation names the mismatch and leaves the decision with the athlete.

**⚠ PA2-D8 IS NOT CONTRADICTED, AND THIS WAS CHECKED BEFORE BUILDING.** `Program-Architecture-Amendment-002` argues a week template is a thing you RE-RUN — "the same week, run four times, is four honest records" — and `Week-Template-Detail-Spec-W29` never mentions composition. So the absence was a decision, not an oversight, and it was put to the PO as one. It is now **also** a building block; the two models do not conflict and `Start This Week` is untouched.

**⛔ DEFECT 1 — CUSTOMIZE → REPEAT WAS SILENT DATA LOSS, AND IT WAS THE ONE STRUCTURAL CONTROL THAT NEVER ASKED.** Shrinking the week count has confirmed since the first build (*"Weeks N–M will be removed… This can't be undone"*). Flipping to "Repeat the same week" did not — and it costs more. `setRepeatMode` only sets `vary: false`, so eight built weeks merely VANISH FROM THE SCREEN; then `draftToStructure` writes `weekPlans: d.vary ? … : null`, so the next Save makes it permanent, and the draft is cleared after save so there is no undo. Hidden-then-silently-discarded is the worst combination: nothing looks destructive at the moment the athlete chooses it. `requestRepeat` now confirms when any week PAST THE FIRST holds work — past the first, because week 1 is what the repeating template would be built from anyway. ⚠ **The sheet is worded differently for this case and titled differently** (*"Use one repeating week?"* / **Switch**, not *"Remove content?"* / **Remove**): shrinking removes content NOW, this sets it aside and only discards on Save, and titling it as a removal would be a threat the app does not carry out.

**⛔ DEFECT 2 — THE TEMPLATES WALKTHROUGH WAS ARGUING AGAINST A SHIPPED FEATURE.** Step `tp-new` read *"New ones come from training. **There's no blank template to fill in.**"* — while its anchor, `templates-new`, wraps the two buttons that build one from blank. True when templates could only be CAPTURED (0091); false since W-25 shipped the Free Workout Builder, and never revisited. A walkthrough that talks the athlete out of the control it is spotlighting is worse than no walkthrough. **It survived because copy is not typechecked and nothing fails when a feature outgrows its own tour** — the maintenance gap, not a coverage gap. Both steps rewritten; the second now names both sizes and the new week-into-program move.

**⚠ THREE OF THE REVIEW'S FIRST FOUR "PROBLEMS" WERE THE REVIEW'S OWN, AND THE WRITE-UP SAYS SO.** `request_squad_join`-style false alarms are cheap to publish and expensive to act on. (a) The `workout_join_request` notification is correctly gated on the host actually training. (b) `pb-details` describing a weeks control in week mode is real but minor. (c) The `display: none` program CTA is deliberate. Only the two above were defects.

**Deliberately NOT done, and recorded so absence reads as decision:** the `week-builder` tour key (week mode still inherits the program tour, whose first step describes a length control that is not there); an entry point for Repeat mode (`weekTemplateIntoWeek` already handles it — the Week sheet is simply unreachable outside Customize); a template picker in the standalone Workout Builder; and the `display: none` CTA, left as found.

**Gates:** `tsc --noEmit` — **0 errors in any file this pass touched** ⚠ (2 errors exist in `CoachChatSheet.tsx`, which is being edited concurrently in the working tree by another session and was never touched here) · `eslint` clean on all three changed files · **2782/2782 tests pass**, including **10 new ones** covering the day-count seam in both directions, letter preservation, re-idding, double application, clamping, Repeat mode and the no-op cases. ⚠ One earlier full run showed a single transient failure — a source-scanning test read `CoachChatSheet.tsx` mid-save; it passes on a quiet tree.

**⏳ NOT DEPLOYED. ⚠ AND THE TREE IS NOT CLEAN** — `workout.tsx` and `CoachChatSheet.tsx` carry uncommitted work from another session. A tree-wide publish ships every undeployed client half in the tree, so check `git status --porcelain` before publishing this.

### 0. ⭐ Every two-person feature was driven end to end — and an owner can put you in a squad you never asked to join (2026-08-24, QA / Squads / Competitions / Train Together / Presence — **no migration, no client change**; one defect found, one cleanup owed)

**Method:** `supabase/seed/two-account-roundtrip.mjs` — a harness that signs in as **both** review accounts through the anon key and drives every feature that cannot exist for one person. **181 checks, and every one is read through both JWTs**, because a row that exists is not a row the other athlete can see. It works inside a throwaway `QA Roundtrip <stamp>` squad, never `Iron Circle`, and tears itself down. **180 passed, 1 failed.** `reviewer-verify.mjs` was re-run afterwards and reports every reviewer surface intact.

**What is now proven to work between two people, in both directions:**
- **Squads** — create → invite code → join → leave → request → owner's queue → approve → member again. The invite code is confirmed **unreadable off `squads`** (0149 held: `42501` for the whole statement).
- **Posting** — A posts / B sees, B posts / A sees; reactions in **both** systems (`squad_post_reactions` counts, 0074's named `set_post_reaction`); comments; `squad_post` fan-out reaches B and **not its author**; an announcement is refused for a member and allowed for the owner; a `SQUAD` post stays out of the Friends feed while a `BOTH` post reaches it.
- **Squad goals, start to finish** — owner sets it, a member cannot move the target, both sessions land, **both contributions and both events are visible from both sides**, `archive_squad_goal` banks it and B sees it in past goals.
- **Competitions, start to finish, both contexts** — SQUAD (enrol → hub → `challenge_joined` → ACTIVE → standings → COMPLETED → frozen podium → champions → Hall) and **head-to-head FRIENDS** (`challenge_invite` → B opens before joining → joins → final result). ⭐ **The frozen result is now asserted to AGREE with the leaderboard it froze** — C-4 reads `challenge_results` and never recomputes, so a disagreement there would be permanent and unfalsifiable. The 1v1 crowned one winner at **4440 vs 3240**, and CS-D3 held: second place is *"place 2"*, never a loser.
- **Train Together, all four directions** — invite; join-request with the host's snapshot and `start_index`; pull-into-live-session; and decline, which **deletes the row so nothing records the refusal**. Both athletes derive the same credit from the same row, and `workouts.partners` carries the other's name on both histories.
- **Presence** — A starts → B's Live Now carries the real label → `squad_training_started`; **A is never notified about themselves**; A finishes → `squad_training_finished` → A drops out of Live Now.
- **Notifications** — every kind the server returned was compared against the `KINDS` allow-list in `notifications-live.ts`. **Clean on both accounts.** This is the check that would have caught 0153's two training kinds sitting invisible for eleven migrations.

**⛔ THE ONE FAILURE IS A CONSENT DEFECT, AND IT IS NOT COSMETIC.** `approve_squad_join_request` (0052) checks that the caller owns the squad, that the target is not already a member, and that the roster has room — and then **inserts the membership. It never checks that a request exists.** Measured end to end by `supabase/seed/qa-consent-probe.mjs`: zero rows in `squad_join_requests`, `{"ok":true,"already":false}` returned, membership created, and then — because `profiles.visibility.training` **defaults to `squads`** (0086) — the target's Live Now became visible to the owner, **label and start time**, with **no notification of any kind** to the person added. They can leave, but nothing tells them there is anything to leave. Handle search returns ids, so the whole path is: find a handle → make a squad → "approve" them → watch when they are at the gym. ✅ **APPLIED AND VERIFIED 2026-08-24.** §3 returned `fn_exists true · guard_present true` — asserted against `pg_get_functiondef`, so it is the DEPLOYED BODY that carries the guard, not merely a migration that ran without error. ⚠ **And the guard was proven in BOTH directions, because one that refused everything would pass the negative test too**: `qa-consent-probe.mjs` now reports `{"ok":false,"reason":"no_request"}` · `Is B a member? no` (it reported `{"ok":true}` and an exposed Live Now before), while `two-account-roundtrip.mjs` still passes the legitimate path end to end — `B requests to join {"ok":true}` → `1 pending in A's queue` → `A approves` → `B is told they were approved`. 180 passed, 2 failed, and both failures are the `challenges` teardown issue below rather than this fix. One condition: a `pending` row must exist before the insert. ⚠ **The already-a-member branch deliberately stays ABOVE it** — that is the double-tap, it inserts nothing, and moving the guard above it would break approving the same request twice. **No client change is needed**, and this was checked rather than assumed: `squad_pending_requests` is the only source of the ids the approve screen passes and it already filters to `q.status = 'pending'`, so every approval the UI can produce still succeeds; `approveSquadJoinRequest` already throws a plain message for an unrecognised `ok:false`. ⚠ **There is no second door** — every other `insert into public.squad_members` in the schema (0029, 0030, 0040, 0050 ×2, 0053, 0055) inserts the CALLER, so 0052 is the only place one athlete's membership is created by somebody else. ⚠ **The paste is not the proof**: re-run `qa-consent-probe.mjs` afterwards and it must report `Is B a member? no`.

⏳ **The `requests_approved_historically` count came back 0, which looked wrong and is not:** the harness deletes its throwaway squad and the request rows cascade with it. 15 memberships across 4 squads, all from invite codes or squad creation — the normal case, and the reason the bundle deliberately reports no "exploit count" (a membership with no request row is the legitimate shape, so a number there would be alarming and meaningless).

**⚠ A SECOND FINDING, FROM THE TEARDOWN RATHER THAN THE TESTS.** `challenges` has select, insert and update policies and **no delete policy at all**, so a client delete matches zero rows and **resolves without an error** — it reports success and removes nothing. A SQUAD competition still disappears (it cascades with its squad); a FRIENDS competition has none, so **six completed `QA Head to Head` rows accumulated in both athletes' history** behind a teardown reporting *"every competition removed"*. `cancel_challenge` is no escape either — it refuses terminal states (CS-D14). ⭐ **The teardown now reads back after every delete instead of trusting `!error`**, which is what turned this from a silent leak into a finding. **`supabase/apply/qa-cleanup-roundtrip-competitions.sql` names the six ids and is NOT yet pasted** — `February Volume` is deliberately untouched.

**⚠ THREE OF THE FIRST FOUR "FAILURES" WERE THE HARNESS, NOT THE APP, AND SAYING SO MATTERS.** (a) `request_squad_join` **answers `{ok:false}` rather than raising**, so a private squad's correct refusal read as a successful request and three downstream checks failed for a reason that was not their own. (b) The `workout_join_request` notification is gated on the **host actually training** (`notification_events` branch 9) — correct, since the only route to the ask is the `squad_training_started` push — and the harness had asked before starting the session. (c) Closing a competition by backdating `end_at` a minute **retroactively excluded the sessions saved thirty seconds earlier**, freezing every podium at zero and crowning both athletes; one second instead was inside the **clock skew** between this machine and Postgres and the competition would not complete at all. It is now anchored to `workouts.saved_at` — the **server's** clock — which is provably after the work and provably in the past.

**Cleanup honesty.** Teardown deletes the squad, competitions, invites and both logged workouts, then restores `chapters.workout_count` and removes the honors `evaluate_honors` awarded during the run (`first_challenge_won`, `first_challenge_joined`, `origin_first_week`) — **neither of which reverses when a workout row is deleted**. It then re-reads for its own leftovers rather than trusting its own writes. Residual: **Sam Torres has no active chapter** (pre-existing, not caused here) so his counter could not be restored, and the six stranded competitions above.

**Gates:** no product code changed — `node --check` on all three new scripts; `reviewer-verify.mjs` green on all 13 reviewer surfaces after the run.

### 0. ⭐ Holt makes a call, instead of offering twelve buttons — the mid-workout sheet gets a hierarchy (2026-08-22/23, Coach Holt / W-9 — no migration, ✅ WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6)

**PO: *"in active workout with coach holt it feels really busy… every function is being presented at the
same visual level."*** That was literally true of the markup. Every group in `SessionCoachSheet` was a
`groupLabel` over a `chipRow` of identical bronze-edged pills — seven groups, one treatment — so the
coach's actual recommendation carried exactly the visual weight of *"Move past this"*. Nothing was
louder than anything else, which is what made a coach read as a settings panel. ⚠ **THE FIX IS
HIERARCHY, NOT FEWER FEATURES.** Every function the sheet had, it still has.

**⚠ THE PO'S OWN PLAN WAS RIGHT ABOUT THE DIAGNOSIS AND WRONG ABOUT ITS CENTREPIECE, AND THAT IS THE
FINDING WORTH KEEPING.** It proposed a prominent recommendation card headed by a **"Use 65 lb →"**
button. But `currentLoad` (`/workout` 2165) is the first unlogged set's weight — **it IS the
prescription**, so that button would have applied the weight already on the bar: a no-op as the most
prominent control in the sheet. Worse, the mockup stated **65 lb** and offered **62.5** as *"Too
easy"* — tapping *up* would have moved the athlete *down* — because `coachLighter`/`coachHeavier` are
both derived from `currentLoad` while the headline showed something else. **The card ships as a
STATEMENT with no CTA**, and the two pills read as corrections to it.

**Three treatments where there was one.** ⭐ **A statement card**, one per sheet and the only
bronze-tinted surface in it: the weight at 38pt in Playfair, the verdict over it, the evidence under it.
⭐ **Pills, kept for the two places a small closed set is the right shape** — the weight correction and
the intensity dial. ⭐ **Borderless rows** for everything that navigates or applies one named thing, a
hairline and a chevron; **this is where most of the noise went** (56pt not 44, because rows stack
against each other where chips sit in spaced pairs). The eyebrow reads `progression.action`, which
already names which of five things the engine is doing — ⚠ **deriving it from the numbers instead would
be a second copy of a decision that already exists**, and the two would disagree the first time the
rulebook changed.

**⚠ HOLT'S REASONING MOVES BEHIND "WHY THIS WEIGHT?" — AND THE ADAPTATION SENTENCE IS EXEMPT.** The
routine `progression.message` restated the number the card now shows in 38pt, and reading it every
visit was the tax the old layout charged. But **CL-D2 is locked**: *every adaptation must be explicable
in one sentence, and the sentence must be shown.* So the A THOUGHT / EASING OFF block keeps its
sentence visible **and moves to the TOP**, above the card — it used to render below every chip in the
sheet, where an athlete who had just been eased down read the new number first and the reason last, if
they scrolled. ⚠ **That block was missing from the PO's plan and from the mockup entirely.**

**The balance suggestion collapses to one line** (PO: *"I like this feature. I don't like it being
permanently exposed here"*) — the gap is named, the movements that fill it wait behind a tap.
⚠ **THE SWAP SUGGESTIONS DID NOT MOVE A LEVEL DEEPER, ON PURPOSE** — against the plan's "everything else
one level deeper". The value of a named alternative is applying it standing at a rack with one hand
free; a tap spent opening a list is the tap that made the Exercise Picker the wrong answer in the first
place. Hierarchy here is carried by **visual weight, not depth**.

**⭐ Designed on paper first.** Four artboards (default · easing off · nothing-to-suggest · a treatment
key) drawn from the real `foundation.ts` values and reviewed before a line of the component changed —
which is how the no-op CTA and the contradictory pill were caught at zero cost.

**`weight-bracket.test.mjs` (5 tests)** guards what the card now depends on: **the two corrections must
BRACKET the stated weight.** Nothing in the codebase would have caught the mockup's defect — the card
and the chips come from `progression.ts` through two different functions, each tested only against its
own examples. ⚠ **Proven by mutation**: a `backOffTo` returning a heavier weight fails 4 of the 5.

⚠ **A lift with no number to build a card around** — a run, a plank, a set to failure — falls back to
Holt's line as plain text, exactly as it rendered before.

**Gate:** `tsc --noEmit` **0** · **2,756/2,756** (+5) · lint **at baseline** (1 pre-existing error in
`use-color-scheme.web.ts`, 13 warnings, none from these files).

══════════════════════════════════════════════════════════════════════════════════════════════════════

**SECOND PASS, 2026-08-23 — the PO sent a reference photo: *"follow the reference photo. I want it more
lively like this. It should feel interactive and not like a spreadsheet."*** Commit `db74a77`.

⛔ **AND IT CORRECTED THE PARAGRAPH ABOVE, WHICH WAS WRONG.** This entry argued a "Use 50 lb" button
would be a no-op *"because `currentLoad` IS the prescription"*. **That is false in the case that
matters.** `progression.suggestedWeight` is a genuinely different number, and until this pass it reached
the athlete **only as the placeholder in the weight field** (`placeholderWeight`, rung 2) — a grey hint
that disappears on the first keystroke and that nothing ever committed. So Holt could say *"go to 50"*
and **the only way to take his advice was to type it.** The PO's original instinct was right and the
argument against it was based on reading one variable and not the other. The card now states
`suggestedWeight`, and `onUseWeight` applies it — ⚠ **passed as `null` unless it differs from what the
sets already carry**, which is what keeps the no-op I wrongly warned about from ever rendering.

⚠ **THE PILLS HAD TO BE RE-ANCHORED WITH IT.** `coachLighter`/`coachHeavier` were computed from
`coachLoad`; with the card showing `suggestedWeight` they would have bracketed a number nobody was
looking at — **the exact "50 stated, 47.5 offered as too easy" defect** the first pass caught on paper.
One anchor (`coachAnchor`) now feeds the card and both corrections.

**Following the reference:** `HOLT RECOMMENDS` over **`50 LB × 8`** (reps from `suggestedReps`); the
engraved **exercise-family artwork** bleeding off the card's right edge — ⚠ **resolved through
`manifest.ts`, never by building a filename**, because the canonical keys are underscored (`hip_hinge`)
and the files hyphenated, so a concatenating call site would miss on exactly one family and look like a
missing asset rather than a bug; `basis` rewritten as a sentence (*"You completed 45 lb × 8, 8, 8 last
time."*); `Why 50 lb?` naming the number; **`SWAP MOVEMENT`** replacing the dynamic
`swapPicks.reason` — ⚠ **reversing a decision made one commit earlier in the same file**, because
"Instead of Alternating Dumbbell Curl" read long and robotic when the header names the exercise two
inches above; and **`CHANGE THE PLAN`** for `ADJUST TODAY` (PO: *"sounds more like you're talking to a
coach rather than operating workout software"*).

**Three zones, expressed as enclosure:** what Holt THINKS is tinted (bronze card, green observation),
what this EXERCISE could be is bare rows in no container, what you can do to the WORKOUT is boxed. Same
Row component throughout — the container is what separates coaching from utilities.

⚠ **ICONS ONLY WHERE THEY CARRY MEANING TEXT CANNOT** — PO: *"don't add icons beside every row… let the
hierarchy do the work."* The reference photo showed icons on every row; the four intensity pills and the
balance row got them (the pills are a SCALE and the glyphs climb with it), **every plain row stayed
icon-free**. Asked rather than guessed, because the photo and the note disagreed.

**Gate:** tsc **0** · **2,756/2,756** · lint at baseline.

✅ **DEPLOYED AND VERIFIED ON BOTH SURFACES.** Web `entry-b7b3c042757f9afd471bacd7e884808c.js` — 200 on
six consecutive checks, and the **live bundle searched for the new strings** (`HOLT RECOMMENDS`, `SWAP
MOVEMENT`, `CHANGE THE PLAN`, `Balance today`, `last time.`, and 20 `exercise-families` asset paths) —
all present. iOS OTA `01a02f8d-496e-7ac1-a68c-641d53dba67f` on runtime `411fd2b6…`,
`fingerprint:compare` an **exact match with build 6 before publishing**, manifest endpoint then queried
as an iOS client and **returned the new id**.

⚠ **THE WEB DEPLOY TOOK THREE ATTEMPTS AND TOOK PRODUCTION DOWN IN BETWEEN.** This is the known
empty-upload fault in `project_web_preview_deployment`, but it **did not open with a 404**: the first
deploy reported success and prod served the **PREVIOUS hash at 200**, which reads exactly like alias
lag. The second deploy took prod to a **full 404** (*"the worker has no matching route handler"*, every
path including `_expo/static/*`). The third took. **The tell is the deployment-specific URL — check it
on the FIRST failed hash comparison, not after several polls.**

⏳ **Not device-confirmed.** Still a visual change **no test in this repo can see**.

**⚠ OPEN — deliberately not built.** The plan's *"Something else…"* menu (Weight · Reps · Sets ·
Exercise · Order · Length) is a **new screen**, and several of those targets have no mid-session entry
point yet. It stays a row that opens the Exercise Picker, as before.

### Older entries — `Docs/Status-Archive-2026-08.md`

The **60** entries before this point moved there on 2026-08-18, 2026-08-19, 2026-08-20, 2026-08-22, 2026-08-24 (five times) 2026-08-25 and 2026-08-26 (twice), **verbatim**. Nothing was deleted or
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
- **⛔ An owner can add any athlete to a squad without a request, and it exposes their Live Now** *(found 2026-08-24, `two-account-roundtrip.mjs` + `qa-consent-probe.mjs`)* — `approve_squad_join_request` (0052) checks ownership, non-membership and roster room, then **inserts the membership without checking that a request exists**. Because `profiles.visibility.training` defaults to `squads` (0086), the added athlete's session label and start time become visible to the squad, and **they are told nothing**. Handle search returns ids, so the whole path is reachable by any authenticated athlete. **Pre-submission**, and it is the shape App Review reads as data collection without consent. ✅ **PO decided 2026-08-24: fix before submission. `0177` is authored — `supabase/apply/pending-0177.sql` — and is NOT YET APPLIED.** This row stays 🔴 until the paste lands *and* `qa-consent-probe.mjs` reports `Is B a member? no`; a clean paste is not the proof, the probe is.
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

- **v1.34 — 2026-08-25** — **Coaching cues finish the field they were already carrying.** The W-25 Workout Builder gains the per-exercise note editor its own spec drew in §3.5/§5.3 and left unticked in its build checklist — the screen had round-tripped `coachNote` the whole time with nowhere to type one. Cap 280 rather than §5.3's 200, because both builders write the same field and a shorter cap here would truncate a Program Builder cue in transit. `WorkoutLaunch.exercises` widened from four inline fields to `TemplateExercise[]` and its consumer routed through the existing `templateToSessionExercises`, closing three doors that dropped the cue — Home's "Build for later" on both its Save & Start and parked-hero paths (which were also flattening warm-up/cool-down into main, dissolving supersets and turning cardio blocks into sets of reps), and **Coach Holt's "Start it now"**, a gap `save-shapes.ts` had declared in its own header and which cost every cue `buildDayWorkout` writes. On screen: a cream-italic cue **line** — not the hero card deleted in v1.33 — under the exercise name in **both** hero faces, since the hero auto-collapses on the first set; and Holt's coin now says the cue *"holds for every set"* before retiring on the first set or the X, per the PO. One test rewritten to assert the opposite of what it did, because running it against the real fixture is what proved the cues were being lost. **Then the same disease one screen over**: the athlete's own note was written, saved and read back as LAST TIME while its only entry point sat eleven rows down the ⋮ sheet — output visible, input hidden — so it is now a row on the exercise card, placed below the three mutually-exclusive bodies (table / cardio / superset member) rather than inside the set table, which would have shipped it on lifts only. Archived one entry (54 → 55) to hold the 15-entry cap. tsc 0 · 2,328/2,328 (2 new) · lint at baseline. ⏳ Not deployed; visual and unseen.

- **v1.33 — 2026-08-24** — **The three builders reviewed, then three answers built.** Walkthrough review of the Program Builder, the Workout (day template) Builder and the Week Builder written up FIRST, before any code changed, as `Docs/Builder-UX-Review-2026-08-24.md`; the PO answered its three questions the same day. Built: **week templates now compose into program weeks** (`weekTemplateIntoWeek` + `weekFit` in `program-draft-model.ts`, "Use a saved week" in the Week sheet, a `WeekTemplateSheet` chooser, and a confirmation that states the day-count cost in numbers on both the row and the sheet). Fixed: **Customize → Repeat was silent data loss** (hidden by `setRepeatMode`, then discarded permanently by `draftToStructure`'s `weekPlans: null` on Save) — now confirmed, and worded/titled apart from the shrink case because it sets aside NOW and discards only on Save; and **the Templates walkthrough was arguing against a shipped feature** (*"There's no blank template to fill in"*, anchored to the two buttons that build one — true before W-25, never revisited, survived because copy is not typechecked). The review keeps its original wording with the fix named beside each finding, so it stays the record of WHY. Added Recently Completed #1 and archived the oldest entry ("The landing page is Landing v6") **verbatim**, holding the section at 15. Still open and recorded as decisions: the `week-builder` tour key, a Repeat-mode entry point, a template picker in the standalone Workout Builder, and the `display: none` program CTA. Gates: tsc **0 errors in every file touched** (2 sit in `CoachChatSheet.tsx`, edited concurrently by another session) · eslint clean on all three · **2782/2782**, +10 new tests. **No migration. NOT DEPLOYED, and the working tree is not clean.**

- **v1.32 — 2026-08-24** — **Two-account QA pass: every feature that cannot exist for one person, driven end to end.** New `supabase/seed/two-account-roundtrip.mjs` (181 checks, both JWTs, isolated throwaway squad, self-verifying teardown), `qa-consent-probe.mjs` and `qa-residue.mjs`; `_with-qa-env.mjs` loads the gitignored credentials so a password containing `&` never has to survive shell quoting. **180 passed, 1 failed.** Added Recently Completed #1 and archived the oldest entry ("Coach Holt answers the door") to `Docs/Status-Archive-2026-08.md` **verbatim**, holding the section at 15. Added Known Risks 🔴 entry and Decision Queue **#25** for `approve_squad_join_request` granting membership with no request — proven to expose the target's Live Now with no notification. Recorded the second finding (`challenges` has no delete policy, so client deletes silently no-op and stranded six FRIENDS competitions) and wrote `supabase/apply/qa-cleanup-roundtrip-competitions.sql`, **not yet pasted**. No product code changed; `reviewer-verify.mjs` green on all 13 reviewer surfaces after the run. **PO resolved #25 the same day — fix before submission — so `0177_approve_requires_a_request.sql` + `supabase/apply/pending-0177.sql` are authored (§1 verified verbatim, 44 of 44 non-comment lines; §2 asserts the guard against `pg_get_functiondef` rather than against a clean run; §3 deliberately reports NO exploit count, because "a membership with no request row" is the normal shape of an invite-code join and a number there would be alarming and meaningless). **NOT YET APPLIED**, and the proof of it working is `qa-consent-probe.mjs`, not the paste.

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
