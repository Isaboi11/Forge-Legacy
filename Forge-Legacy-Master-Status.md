# Forge Legacy — Master Status & Project Dashboard

> **🧭 READ THIS FIRST.** This is the permanent source of truth for Forge Legacy. Every Claude session must begin by reading this document before doing any work. It tells you where the project stands, what is already done (so you never duplicate it), what is blocked, and what comes next.
>
> **Maintenance rules (do not skip):**
> 1. Always update this file after major work.
> 2. Never delete completed milestones — move them to **§ Recently Completed**.
> 3. Add newly discovered work to the relevant section.
> 4. Keep all six completion percentages current.
> 5. Keep the **Decision Queue** current — remove a decision only when it is resolved.
> 6. Keep **Recently Completed** current (cap ~20 entries).
> 7. Update **Last Updated** and the **Dashboard** on every edit.

**Type:** Living Project Dashboard + Documentation Completion Audit
**Last Updated:** 2026-08-06 (**Body Recomposition Foundation authored — programs 2 of 24 → 3 of 24, and the first one built from the Stage-2 production plan rather than because somebody wanted to build it.** The PO brought in a free third-party PDF (*8 Week Beginner Fat Loss Workout*, muscleandstrength.com) and asked to tweak it into the catalog; **it was not tweaked**, because a light edit of a published program keeps what is protected (name, session titles, authored sequence, copy) and changes what never was. The METHOD was taken and the program authored — the posture `scripts/bridger-logan/` and Squat Ascent §1 already set. **The slot was already LOCKED and already matched:** the June Blueprint fixes 8 weeks · 4 sessions · 32 workouts · CONDITIONING/BEGINNER/GYM · `LOSE_FAT + BUILD_MUSCLE` · Week-7 deload — the PDF's shape, months earlier and independently, which is why the source was worth a look and also why it was not needed. ⚠ **The source is thinner than our own standard**, which is the substantive reason not to have copied it: **no progression at all across eight weeks** (its 10-rep and 20-rep days are two of the four workouts, not two phases, so the same four sessions repeat for the block), no warm-up, no cool-down, no deload, and 12 MAIN sets — the floor of the 12–24 envelope. Shipped: 5 blocks over all 32 sessions, Upper/Lower ×2 (*Press & Pull · Squat & Stride · Row & Raise · Hinge & Bridge*), **Volume Accumulation** 15→15→18 sets and 10→12→12 reps, **Week 7 stripped to the four compounds at 8 easy reps and a walk**, Week 8 peaking at 18 × 15. Every session resistance-led and closing on one steady bout (bike · incline walk · elliptical) timed via `targetSec`, which `adopt-core.ts` was verified to carry across before a line was authored. **No barbell anywhere** — PAS §11.3 read strictly, because a beginner in a deficit is the worst-placed athlete in the catalog to be acquiring squat technique. All 23 keys resolve against the **visible 721**, not the 797. **14 acceptance tests, each proven by mutation** — a smuggled barbell, a flattened deload, a broken envelope, a misplaced finisher and rest past 90 s all turn the suite red, and the file restores clean. ⚠ **One known standard violation, recorded rather than faked:** nothing prescribes a cool-down, because `ProgramWorkout` has no field for one — Iron & Engine's finding 7, now hit by a **second** CONDITIONING program, which is the point where "recorded as an open gap" stops being enough. ⚠ **Separately surfaced: `svg-gradient-stops.test.mjs` matches its own doc comment** and has failed on every run since it was committed in `157bf34` — `git grep` sees only tracked files, so it passed while the file was still untracked. Left alone; unrelated to this work. tsc 0 · lint at baseline · **1072 of 1073 `node --test`**, the one failure being that guard. NOT committed. See Recently Completed #1.) Prior 2026-08-06 (**the catalog programs prescribed 244 things the app cannot show — 232 warm-ups resolving to nothing, 12 empty-bar ramp sets, and `air-bike` ×7 in Iron & Engine’s circuits. The acceptance gate had been checking `exercises.json` (797 rows) instead of the VISIBLE catalogue (721), so it called them clean. Gate corrected, warm-ups cut to 161 real exercises, Air Bike swapped for Burpee/Ski Erg by PO decision.**) · 2026-08-06 (**migrations 0117–0118 applied — backend now applied through 0118; the three run-time proofs are still unpressed.**) · 2026-08-05 (**PO batch 3 — four items, and two of them were a chart and a link that had looked finished for months while telling the athlete something false.** (1) The **Forge template preview had no Start**, so training one of the 81 shipped sessions meant filing a copy in your library first — now `starterId` on the launch context trains it owning nothing, and *not* via the invite-snapshot field, which would have dropped warm-ups and turned the **29 cardio-finisher definitions** into sets of a run. (2) The **Program Builder's Day Builder can take a whole template** as the day being built — one search over the athlete's own and Forge's, with replace-or-add, name preserved, and **group ids remapped** so appending a template twice cannot fuse two supersets into one. (3) ⚠ **The Progress Hub's lift charts were plotting the wrong thing.** They read `personal_records`, which only gains a row when a set BEATS the best — so a lift trained hard for months without a PR drew a flat line or none, a lift never PR'd could not be charted at all, and **nothing could ever go down**. The value was **Epley e1RM**, a weight nobody ever moved, which `metrics.ts` had already ruled out in this codebase for records. Now **one point per day trained at the heaviest weight actually moved**, carrying its reps; a never-loaded lift charts in reps; record days still marked; gridlines, dated ticks and a scale added from the `.dc`; every logged exercise selectable. (4) ⚠ **A shared workout recap was a dead link for everyone but its author** — `fetchActivityDetail` is `athlete_id = auth.uid()`, so the whole audience a recap was written for got "Couldn't load this session", while the Squad feed sent the same post type somewhere else entirely. **Migration 0117** gates one session read on **the post, not the relationship**, withholding the ordinal, chapter, partners and program id by design. (5) **Accomplishments can carry a photo or a video** — 0023's `photo_url` had been "reserved" and unwritten since it was created; **0118** renames it `media_url` + `media_kind` rather than adding a second column. tsc 0 · lint at baseline · **1057 `node --test` green** · web export clean · **deployed and verified live**. ⏳ **0117–0118 NOT YET APPLIED** — `supabase/apply/pending-0117-0118.sql`; 0118's rename must land with the deploy or accomplishments read empty. See Recently Completed #1.) Prior 2026-08-05 (**The app can now be BUILT — and none of what that requires existed.** No `eas.json`, no `ios.bundleIdentifier`, no `android.package`; both bundle IDs are now `com.qest4.forgelegacy` and permanent from first submission. `slug` deliberately untouched — it is what ties this project to **forgelegacy.expo.app**. EAS environment variables point at the **same Supabase project** as the web app, which is the whole reason a tester can install the store build, log in, and find their history there; a separate "production" project would have handed them an empty app. `appVersionSource` is `local` against the modern default because `account-settings.tsx` reads the build number from `Constants.expoConfig` and remote versioning would have rendered **"Build —"** on every device. ⚠ **The pass found a defect nobody asked about.** `.easignore` REPLACES `.gitignore` rather than supplementing it, and ours was one line written for `eas deploy` — so the first `eas build` would have uploaded **node_modules (646 MB)** and **design_reference (254 MB)**; rewritten to serve both commands. **Over-the-air updates added** (`expo-updates`), without which every one-line copy fix costs a store build and a review — at `runtimeVersion` policy **`fingerprint`**, not the `appVersion` that `update:configure` wrote, because `appVersion` trusts the developer to notice that a change touched the native runtime and the failure mode when that memory slips is a crash on launch for everyone already installed. `update:configure` also wrote a doubled `android.permissions` array (12 entries, 6 unique); deduped. tsc 0 · **996 `node --test` green** · web export clean with the PWA title and manifest verified unchanged. **No build has been run and no store accounts exist yet** — Apple/Google enrolment, privacy-policy URL, screenshots and submit credentials are all still open. See Recently Completed #1.) Prior 2026-08-05 (**The Forge template library went 6 day-sessions → 81** — seven focuses (push · pull · legs · arms · chest-triceps · back-biceps · glutes) × gym/home × three levels, tracked for men and women; **579 rows, 240 distinct catalogue exercises, 29 ending in a conditioning block**. The six originals keep their ids — `push-day`/`pull-day`/`leg-day` are now the gym/Intermediate men’s cells of the grid, so only their display names changed (a name is snapshotted on adopt; an id is not). ⚠ **The pass found a defect nobody asked about.** `schemeText` renders a cooldown row at `targetReps >= 30` as SECONDS, but that convention exists only on the PREVIEW surfaces — `workout.tsx` renders `{targetReps} Reps` flat, so a 45-second stretch would have reached the athlete as **forty-five stretches**. The authoring brief had explicitly permitted it and the agents used it: **24 such rows removed**, and `definitions.test.mjs` now fails any strength row at `targetReps >= 30` — the guard the old file header asserted without enforcing. Cardio finishers round-trip via `targetMi` ONLY: `cardioExercise` never reads `targetDurationSec`, so a duration would be stored, adopted, and silently dropped. `venue` is authored rather than derived, because `equipment.json` calls the barbell home-gym equipment and a bedroom is not a home gym — `HOME_EQUIPMENT` is the product answer and the test holds every home row to it. **The shelf stopped being a list**: W-26 sat above the athlete’s own templates, so 81 cards would have buried them; it now samples one per focus matched to profile sex and links to a new filtered `/forge-templates`, **declared in `_layout.tsx`** since a route here is gated by being declared, not by existing. The audience filter is a default, not a gate — `unspecified` opens on everything, never quietly read as male. tsc 0 · lint at baseline · **994 `node --test` green** (22 in `definitions.test.mjs`, was 10). No migration — 0115 already carries adoption. See Recently Completed #1.) Prior 2026-08-03 (**A program can now be loaded from a tested max — and the first one that is, Squat Ascent Intermediate, is live.** The prescription model had no load field of ANY kind: sets, reps, ladders, timed work, circuits, but nothing that could say *at 75%*, so a peaking block could only be stored as "5 × 5" — the same shape as the session with the training taken out. Migration **0111** adds `athlete_lift_maxes` (what you currently lift) and `programs.lift_maxes` (what THIS RUN was built from, frozen at the gate, because a PR in week 2 raising every remaining prescription would land the week-4 rehearsal somewhere the program never intended). **Two defects the tests caught before anyone ran it**: Epley inflates a true single by 3.3%, so "315 for 1" would have been recorded as **326** with a month of percentages computed off it; and Squat Ascent asked for **five** maxes including a "Tempo Squat max" nobody tests. **Two things needed no code at all** — "changing your max never touches a finished session" fell out of `buildLog`, which already draws completed days from what was LOGGED and future days from the PRESCRIPTION. ⚠ **The ledger is non-sequential: 0111 is APPLIED while 0109 and 0110 are still PENDING** (safe — 0111 depends on neither). tsc 0 · lint at baseline · **955 tests** · deployed and verified live. Commit `35a341e`. See Recently Completed #1.) Prior 2026-08-03 (**Two tester-reported defects in the friend loop, both closed — see Recently Completed #1.** ⏳ **Migration `0109` is authored and NOT YET APPLIED.** (a) **Friend requests notified nobody.** `notification_events()` was dropped and rebuilt for a return-type change at **0088**, and rebuilt *from the 0054 body — which predates friends*, silently losing the `friend_request` and `friend_accepted` branches; **0092** rebuilt again "identical to 0088" and carried the omission forward. Two migrations, no error, no failing test, and no symptom until an athlete with no squads received a request. The `/inbox` client has handled both kinds correctly since 0073 — every one of those branches was unreachable. The bell badge was wrong for the same reason. (b) **`/add-friend` gave you a sentence instead of a person** — a resolved handle rendered as grey status text with nothing tappable, so verifying you'd found the right account meant sending a request and seeing. Now a row that opens `/athlete/[id]`, like every other list on that screen. Gates: tsc 0 · eslint clean on the touched surface.) Prior 2026-08-01 (**PROJECT AUDIT + CORRECTION PASS — this board rebuilt from a fresh measurement, and five defects closed.** Measured ground truth: **72 app screens · 97 migrations (0001–0098, ALL APPLIED) · 508 `node --test` green across 40 files · tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 430 TS/TSX · 87,450 LOC · 210 commits · HEAD `d5a0db3` · 257 `Docs/**/*.md`**, live at forgelegacy.expo.app. **The board was wrong in the project's favour and against it at once**: it claimed 37 screens (72), 28 migrations (97), 411 tests (508), and a social pillar "fully MOCK, quarantined in `*-placeholder.ts`" that has been Supabase-backed for weeks — while its Current Sprint still described the pre-implementation Architecture Freeze that closed 2026-06-30. **The data layer audited clean, verified mechanically rather than asserted**: 53 RPC names, 61 call sites, 434 select columns, 119 write payloads all resolve; RLS on all 35 tables with a policy each; 52/52 `SECURITY DEFINER` functions pin `search_path`. **What the audit found was a class nobody had checked — values displayed from columns nothing writes.** `chapters.honor_count` was written once as a literal 0 and incremented by nothing across 97 migrations, yet displayed as a real tally on Chapter Detail, the Legacy Timeline, the public profile, and the M-5 seal ceremony — which told an athlete they earned "0 honors" in the chapter they were closing (fixed: migration 0098 derives it). Also closed: **17 routes outside the auth guard** (a route is gated by being DECLARED, not by existing), **invented athletes compiled into the production web bundle** (gating a screen does not tree-shake a module; verified gone by rebuild), and three silent failures. Three findings deliberately NOT fixed, with reasons in Current Sprint. **The critical path is now CONTENT — programs 2 of 24, exercise media 0 of 797 — not plumbing.** Commits `8179a10`, `e6fc901`, `d5a0db3`. See Recently Completed #1.) Prior 2026-07-31 (**Ground truth: 71 app routes · 93 migrations (0001–0094, ALL APPLIED) · 411 `node --test` green · tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 416 TS/TSX · 83,329 LOC · 194 commits · HEAD `f3901fe`**, live at forgelegacy.expo.app. **The migration backlog is clear for the first time** — every migration through 0094 is applied and verified against a real account. This session: a **full fabrication sweep** (Recently Completed #1), the **workouts cluster** (#2, migrations 0090–0094), and the **honors chain completed** (#4). The board below still carries pre-implementation Sprint/Freeze language from the design phase and OLDER dashboard cells that a full **Project Audit** should reconcile — the numbers in this line are the measured ones; where a cell disagrees, this line is correct.) Prior 2026-07-25 (**PROJECT AUDIT — reconciled to the committed, tested app after a large build session.** Ground truth: **37 app routes · 28 migrations (0001–0028) · 416 `node --test` green · tsc 0 · lint clean**, live at forgelegacy.expo.app. The prior board (audit basis 07-23) predated this session's shipments, ALL now COMMITTED (~25 commits `8feb8d3`..`cc64f6d`): **Goals G-1** (chapter-scoped, migrations 0025/0026), **Chapter Detail L-3/L-4** + **M-5 seal reflection ceremony**, **Bucket A/B Legacy polish + in-app sheets** (My Standard editor, ConfirmSheet sweep, featured-replace picker), the **entire Rank system** (RCM compute engine `src/domain/rank` + signal aggregation + in-app persist/trigger + M-1 + all 7 families' badge art background-cut & imported + **Rank Progression** screen; migration 0027), and the **full P-2 Progress Hub** (hero · rank journey · strength cards + Metric Detail overlay + Edit Metrics sheet · consistency · body metrics backend migration 0028 + Log Weight · what's next). **The dashboard's old "critical path: Goals + Progress Hub + social backend" is now Goals ✅ / Progress Hub ✅ / Rank ✅ — leaving SOCIAL as the sole fully-mock cluster** (Squads/Friends/Communities/Post/Athlete-detail — no `friendships`/`squads`/`communities`/`posts` tables; full model sits UNAPPLIED in `supabase/design/0002_full_model.sql`; cleanly quarantined in `*-placeholder.ts`), plus **content** (~4/24 programs · 0/195 exercise media · partial honor catalog) and **media** (no photo/video upload → Transformation/Photos/Trophy unbuilt). Doc-vs-build gaps: rank built IN-APP w/ shipped athlete types (Strength/Bodybuilding/Endurance/Hybrid) vs the RCM's server-authoritative Running/Boxing wording — needs an amendment per PD-7. `rank-progression.tsx` now orphaned (badge → Progress Hub). Next: **social backend**, then honors-catalog mapping + media backend.) Prior 2026-07-20 (**P-1 Dissolution Amendment** — docs reconciled to the design layer: P-1 Profile + P-4 Settings Root DISSOLVED, content redistributed to Legacy + Account Settings, 5 orphaned capabilities recorded, My Standard/Trophy Case flagged built-but-unspecced. See Recently Completed #1.) Prior 2026-07-19 (**Project Audit v2 — reconciled to the Supabase-backed, on-ramp-complete app.** The 07-15 audit corrected the "0% code" lie, but the board still predated three big shifts: (1) the **backend pivot to Supabase** — the design doc ratifies Firebase, but the BUILD is Supabase: **24 migrations** (auth · profiles · chapters · workouts+sets · PRs · `honor_instances`+`evaluate_honors` · programs · pins · timeline), RPCs `complete_onboarding`/`save_workout`/`evaluate_honors`/`claim_initiative_honor`, RLS throughout — so **backend-wired is NO LONGER 0%**; (2) **auth + onboarding + a live web preview** (forgelegacy.expo.app); (3) this session's **first-run on-ramp** — guided tour, First Honor Ceremony, persisted **Initiative** honor (3 triggers), **Honors Hub** (L-10/L-11). Fresh evidence: **334 TS/TSX (+20 test files) · 52,713 LOC · 116 commits · 31 app routes · 24 migrations · 385 `node --test` green · `tsc` 0 · ESLint 1 pre-existing error+warnings · 249 Docs.** Core flows (auth/onboarding/workout-save/honors/programs/legacy) read+write real Supabase; **social (friends/squads/communities) + goals backends remain placeholder** — the main gap. Board stays UNCOMMITTED per the established pattern.) Prior 2026-07-15 (**Project Audit — Dashboard reconciled to the real committed tree.** The six-dimension Dashboard + Project Health + Implementation Status + Statistics + Evidence tables all still read **Code 0% / Testing 0% / "unmodified Expo starter" / 19 files** — stale cells that predate the entire design-handoff implementation (the buried narrative paragraphs had been updated; the summary tables never were). Corrected against fresh evidence: **227 tracked TS/TSX files · 33,229 LOC · 56 commits (45 touch `src/`, 17 feature-code this session) · 176 `node --test` green across 14 files · `tsc --noEmit` 0 · `expo export --platform web` clean.** Honesty carry-through: repo-wide **ESLint has 1 pre-existing error** (`use-color-scheme.web.ts`, react-hooks/set-state-in-effect — in an app-shell prereq, not an authored unit) + 14 warnings, authored per-unit surfaces clean; **backend-wired = 0%** (every screen reads placeholder data). Every corrected number cites its derivation; where a coverage % is not instrumented the cell reads **"not measured," not a guessed figure**. Board stays UNCOMMITTED per the established pattern.) Earlier same day: (**Design-handoff — social + squad surfaces + feed system built; peripheral roadmap CLOSED (CODE, COMMITTED to `main`).** This session shipped the social/squad build on `main`: full-screen Home match + **4-tab nav** (Home · Workouts · Legacy · Squads); **Friends Feed** + the shared **`FeedPostCard` (CLA-C34)** every feed surface consumes; the full **Post Detail** viewer; the **Community feed** converged onto the shared card (test-gated model merge) then **SHELVED behind launch** (tab removed → 4 tabs, screen preserved non-routed at `src/deferred/community.tsx`, `/community`→Home redirect, shared card/model/goldens kept live — reversible); **Squad Detail (S-2)** — feed on the shared card with **3 additive content types** (checkin / challengeUpdate / traintogether) + per-squad **firewall goldens**, the check-in strip + active-competition banner, a **single squad-member source** (roster + check-in strip both derive from one list → no same-screen contradiction), a read-only **Squad Records** book (holders ⊆ roster), and **visibly-disabled** settings + composer **inert shells** (the first squad write paths — no fake mutation, no data-layer write path). Correctness carry-forwards closed: **Phase-0 program plates** now carry the real `Program` schema (`durationWeeks/frequencyPerWeek/structure`; renderer formats via a shared `formatProgramMeta`; PRs kept as one uniform display-string convention, **blocked-on** a `PersonalRecord` model); the **comment count derives from the thread** (no phantom count over an empty thread); the handoff's **sex-default bug** confirmed already FIXED + regression-tested (only real neutral artwork remains, **blocked-on** Phase-4 assets). Discipline held throughout — single-source invariants goldened (comment ⊆ thread, check-in ⊆ roster, records ⊆ roster), absent fields omitted not fabricated, no art fabricated, every write path an honest inert shell. Verified across the cluster: **tsc 0 · ESLint clean · 173 `node --test` · `expo export --platform web` clean.** **~15 commits `70866df`..`b35824d`.** Peripheral roadmap **CLOSED**; the only open items are **BLOCKED-ON externals** recorded in `design_reference/…/FORGE_DELTAS.md`: PR-structuring (needs a `PersonalRecord` domain model, §11), neutral artwork (Phase-4 assets, §7), Modal-family verified via temp inline render (§12). ⚠ **The Project Dashboard table below (Code / Testing 0%) is STALE — it predates the entire design-handoff implementation; a full Project Audit is due to reconcile it with the committed, tested app.**) Earlier: 2026-07-14 (**Design-handoff Phase 2 — Home re-layout to `Forge Home.dc.html` (core deliverables) COMPLETE (CODE, working-tree).** Retired the fused, artwork-less `MissionCard` on Home; built a dedicated **resolver-driven `TodaysWorkoutCard` hero** (consumes `resolveHomeWorkoutArtwork` + `enrichSessionExercises`; shows resolved art + title + focus + count) over a separate **`ProgramMissionGrid`** (Program tile = real active program; Mission tile = HOME_DATA placeholder); AppBar avatar now reads `getSelfProfile()` (dropped hard-coded "Ada Ridge"). Imported the 4 resolvable artwork collections (**72 prototype-crop PNGs**, male+female) into `assets/artwork/` + a generated `asset-registry.ts` (`assetPath → require()` map, Metro-static) + `resolveArtworkSource` with a graceful no-image fallback; a **registry-coverage test** fails if any resolver-producible assetPath lacks an entry/file (never a silent broken image). Kept `HomepagePrinciple` + `TrainTogetherCard` as-is; `MissionCard` kept as a marked-legacy file (non-destructive); `HOME_DATA` intact. **Verified:** tsc 0, ESLint clean, **130/130 `node --test`** (incl. 4-case registry coverage); **`expo export --platform web` builds clean (exit 0, 1418 modules)** and Expo static rendering executes the Home route — its HTML contains the REAL data ("Confidence Builder", "Full Body", "7 Exercises", "Strength Foundation I (3-Day)", Program `0 / 18`, "Chapter III"), and all 72 artwork assets (incl. the resolved `training-splits/male/full-body.png`) are bundled. No browser/emulator in this env to capture a live screenshot — run `npm run web` / `npx expo start` to view. Active = Foundation I (3-day) → hero art `training_split:full_body`, neutral. Follow-up = full-screen match (ornate title block, Your Circle, Quick Actions) + Phase 3/4. See Recently Completed #1.) Earlier: 2026-07-14 (**Design-handoff — Programs `.docx` → structured data conversion COMPLETE + PROMOTED (CODE, working-tree).** Non-destructive conversion (Decision Queue #6) of the authored `Programs/*.docx` into structured `ProgramDefinition` JSON, then wired Home's runtime accessors to the real data and deleted the fabricated placeholder. New `src/domain/training/ingest/` pipeline (extract → match → derive → generate; zero-dependency `.docx` ZIP reader; source-verification guard; reuses the Phase-1 muscle bridge for per-workout split). PO-gated decisions applied: only the **2 LOCKED programs** generated — **Strength Foundation I (3-day)** (theme `beginner`, structure `full_body`) and **II (4-day)** (theme `strength`, structure **omitted** — per-workout split, honest about its `upper` accessory day); Foundation I (4-day) **HELD** (DRAFT); Foundation II (3-day) **EXCLUDED** (source file is mislabeled research content). 17 exercise names auto-matched + 10 PO-confirmed; all 27 catalogKeys verified to exist (generator aborts on any dangling key). `getActiveProgram()`/`getPrograms()` now read real definitions via `active-program-core.ts`; active demo program = Foundation I (3-day), next workout "Confidence Builder" (`full_body`) → resolver returns `training_split:full_body`, neutral. Placeholder `training/placeholder-data.ts` **DELETED**. Verified: tsc 0, ESLint clean (new surface), **45/45 domain tests** (one-active invariant + validator + resolver all green against real data), `.docx` byte-untouched. Content gap noted: only Strength programs exist — non-strength theme/modality artwork stays unexercised against real data. See Recently Completed #1.) Earlier: 2026-07-13 (**Design-handoff Phase 1 — Home Workout Artwork Resolver + asset manifest + §16 test matrix implemented (CODE, working-tree).** Ported the handoff's `forge-artwork-resolver.js` to a production, dependency-free TypeScript resolver at `src/domain/home-artwork/` (`resolver.ts` 7-rung precedence, `manifest.ts` registered key→asset with reserved Legacy/Honors guard, `bridges.ts` the two carry-forward lookup tables — MovementPattern→exercise-family and MuscleId→split, `catalog.ts`/`catalog-core.ts` enrichment from the real 794-exercise catalog). Corrected a reference-JS latent bug: `conditioning` art lives in `training_split` on disk, not `workout_modality`, and every rung now validates against the manifest so a missing asset always fails safe. Verified: `tsc` 0 errors, ESLint clean, **40/40 `node --test`** (33-case §16 matrix incl. determinism + "never Legacy/Honors", full bridge coverage over all 18 movement patterns + 29 muscle ids, real-catalog enrichment + seed→resolver e2e). Enabled `allowImportingTsExtensions` in tsconfig so the resolver runs under both Metro (0.84.4, supports explicit `.ts` extensions) and `node --test`. **Gate held — Phase 1 §16 matrix is green, so Phase 2 (Home re-layout) is now unblocked.** Not yet committed. See Recently Completed #1.) Earlier: 2026-07-13 (**Design-handoff Phase 0 — data-model foundation implemented (CODE, working-tree).** First implementation slice of the new high-fidelity design handoff (`design_reference/Forge Modal Library Design/`), building the structured data model the handoff's Home Workout Artwork Resolver depends on. New `src/domain/profile/` (`Sex` incl. explicit `'unspecified'` + `UserProfile`) and `src/domain/training/` (`Program`/`Workout`/`SessionExercise` + the resolver's enums; `targetMuscleGroups` typed to the canonical `muscles.json` vocabulary), each a typed `schema.ts` + placeholder seed mirroring the existing `src/domain/*` idiom. **Non-breaking** — the existing flat `HOME_DATA` is untouched until Phase 2 re-lays-out Home. Fixes the handoff's model-level sex-default bug (missing sex = `'unspecified'`, never `'male'`). Verified: `tsc` 0 errors, ESLint clean, seed test 7/7 (`node --test`), plus an end-to-end run of the handoff's own reference resolver against the seed returning the correct deterministic result (`training_split:lower`, `sexVariant:neutral`, no reserved collection). Two Phase 1 carry-forwards pending: the MovementPattern→exercise-family bridge and the muscle-id→split bridge, both to be explicit unit-tested lookup tables. Source of truth for divergences: `design_reference/Forge Modal Library Design/design_handoff_forge/FORGE_DELTAS.md` + the resolver spec. Not yet committed. See Recently Completed #1.) Earlier: 2026-07-12 (**Onboarding reconciliation** — brought the downstream O-series wireframes + H-1 into conformance with the governing `Onboarding-First-Time-Journey-Architecture-v1.0`: **O-2 → v2.0** [removed Path Selection, the manual Athlete-Type step, and Prior Accomplishments; added the unified Goals/Experience/Equipment/Schedule steps + Sex field + a deterministic, constraint-respecting Recommended Starting Point; replaced the profile-reveal Completion Moment with the readiness Transition + silent Chapter I creation], **O-1 → v1.1** [added the "Your Next Chapter" vision screen; affirmed one unified path; corrected the derived-Athlete-Type / silent-Chapter-I boundary], **O-3 ⛔ superseded** [banner applied; replaced by ONB-D14/D16], **H-1 → v1.6** [added the ONB-D17 "Active Chapter · awaiting first workout" first-run hero sub-state]. Closes the O-2-vs-Onboarding LOCKED-vs-LOCKED contradiction; **no governing product decision changed**. Verified the pass is docs-only: `src/` still contains **no onboarding implementation** [no onboarding routes/store/Chapter service/recommendation engine/test framework], so the task's code-level acceptance criteria are recorded in O-2 §20 as forward Implementation Requirements rather than applied to code. See Recently Completed #1.) Earlier: 2026-07-11 (Exercise Coaching Content System built — new modular `src/domain/exercise-coaching/` layer that generates/validates/scores/reviews/versions/serves coaching content, consuming the canonical datasets read-only; TypeScript 0-errors, ESLint clean, 40/40 tests, validator 0-FAIL/0-VIOLATION over all 794 exercises in dry-run; **SYSTEM ONLY — no coaching content generated, gated on approval**; not yet committed. See Recently Completed #1.) Earlier: 2026-07-09 (Documentation-accuracy correction: `Activity History (W18)` was misdashboarded as LOCKED — its own doc header reads LOCK CANDIDATE, and its "Navigated from: W-1 Workouts Hub" authority citation is stale since W-1's retirement 2026-07-08. Corrected Documentation Status for W18/W19 and added the concrete W-18→W-19 lock dependency to Decision Queue #16 — W-19 cites W-18 as its own authority and cannot legitimately lock until W-18's entry-point citation is reconciled. No architecture changed; bookkeeping correction only.) Earlier session: 2026-07-07 (Communities promoted to the 5th bottom-navigation tab — reverses the 2026-07-02 "Home/Squads discovery entry point, not a tab" navigation model; see Recently Completed #1 for full detail. Earlier session:) 2026-07-02 (Documentation-consistency audit findings applied — see Recently Completed #1 for full detail: `Forge-Design-Blueprint-v1.0.md`'s last remaining internal self-contradiction on the 4-tab nav model removed [→ v1.3]; a cluster of stale version citations across the Squad/Profile/Honor ecosystem corrected; the Card library's systemic `CLA-C07` ID collision fixed in 12 component header comments; `Forge-Design-System-Architecture-v1.0.md` [→ v1.1] backfilled to reflect the already-committed Navigation and Progress libraries as LOCKED; new `Component-State-Language-Reconciliation-Note.md` tracks a non-blocking CLA-D9 conflict in two LEGACY components. Earlier same-day: two stakeholder-directed product decisions formalized post-freeze: (1) Communities navigation finalized — Home's "Explore Communities" module named as the primary discovery surface [H-1 → v1.3, new Tier 6], Squads gains a secondary "Explore Communities" entry point [S-1 → v1.5, new Tier 3], both via new `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md`; also corrected two stray tab-count references [`Home-Screen-Wireframe-Spec-H1.md`'s drifted 5-tab Tab Bar table, `Global-Search-Architecture-v1.0.md`'s "5-tab hierarchy" line, and `Legacy-Hub-Wireframe-Spec-L1.md`'s stale "Legacy (5th tab)" header] back to the confirmed 4-tab model. (2) New Legacy feature **Transformation Gallery** added — `Transformation-Gallery-Architecture-v1.0.md` + `Transformation-Gallery-Wireframe-Spec-L17-L18.md`, screens L-17/L-18, a chapter-organized chronological photo/video archive of physical transformation with zero social/comparison mechanics; `Legacy-Hub-Wireframe-Spec-L1.md` → v1.1 adds its entry point. Both decisions previously existed only in `Docs/Forge-Design-Blueprint-v1.0.md`; now formalized in official architecture, with the blueprint reconciled to cite the new official docs. Earlier same-day work: all 6 committed Forge component libraries — Buttons/Inputs/Cards/Navigation/Modals/Progress — reclassified **LEGACY / REFERENCE**; visual design system is being rebuilt in Claude Design first; no destructive cleanup until the new system is locked and replacement components are verified; also backfilled Navigation/Modal/Progress library commits into Implementation Status, which had drifted behind git history)
**Audit Basis:** Live repository scan, 2026-08-01. `git ls-files` (430 TS/TSX · 40 `*.test.mjs` · 257 `Docs/**/*.md` · 97 migrations), `git ls-files src/app` (72 screens, excl. layouts + `+html`), `git rev-list --count` (210), `node --test` (508 pass / 0 fail), `npx tsc --noEmit` (0), `npx eslint src` (1 pre-existing error + 13 warnings), `npx expo export --platform web` (clean, 11.11 MB entry), `wc -l` (87,450 LOC). Data-layer contract checked mechanically across 53 RPC names · 61 call sites · 434 select columns · 119 write payloads · 35 tables for RLS · 52 `SECURITY DEFINER` functions. Prior basis 2026-07-15 (227 TS/TSX · 33,229 LOC · 176 tests) retained in the Change Log.

---

## 📊 Project Dashboard

| Dimension | Completion | Notes |
|---|---:|---|
| **Architecture Design** | **~100%** | All 21 Architecture Freeze rows ✅ Complete; V1 Architecture Freeze officially **FROZEN 2026-06-30** |
| **UI / Wireframes** | **~95%** | Nearly all screens specced; W18/W19 both lock-candidate (W18 corrected 2026-07-09 — previously misdashboarded as LOCKED; W19 blocked on W18, see Decision Queue #16); no Search/Rest-Timer/Community wireframe yet — Communities is architecture-only in this pass, no pixel layout authored |
| **Content Authoring** | **Split — 92% coaching · 8% programs** | Was a single "~12%", which was wrong in both directions. **Coaching: 735 of 797 exercises Published, 62 Needs Review.** **Honors: data** (`honor_catalog`, **179 awardable** across 14 categories — 0099 filled the five empty ones). **Programs: 3 of the locked 24** — Strength Foundation I (3-day) and II (4-day), generated from `.docx`, plus **Body Recomposition Foundation** (Sort 13, 2026-08-06), the first authored straight against a LOCKED Stage-1 Blueprint rather than converted. Plus **7 authored outside the 24** (Iron & Engine; Squat Ascent, Bench Approach and Deadlift Measure Intermediate; Full Frame; Frame by Frame; Close Quarters) — 10 definitions shipped, but the locked catalog is still the real gap, and shipping outside it does not close it. ⚠ **Full Frame and Frame by Frame are both Muscle Building / Intermediate / 5-day** — a knowing overlap (PO decision 2026-08-06); the locked 4-day **Muscle Building Intermediate (Sort 6) remains UNBUILT**. **Exercise media: 0 of 797**. **Day-workout templates: 81 shipped** (2026-08-05) — 7 focuses × gym/home × 3 levels × men/women, 579 rows over 240 distinct catalogue exercises, every key test-verified against the **VISIBLE** catalogue (721 rows, not `exercises.json`’s 797) — audited again 2026-08-06 and clean 579/579, which is where the 7 catalog programs were not |
| **Backend / Data** | **BUILT (Supabase) — 118 migration files, 0001–0118. APPLIED THROUGH 0118** (0117–0118 applied 2026-08-06, `supabase/apply/pending-0117-0118.sql`); ⏳ **run-time verification still open** — the three button-presses in Recently Completed #1 have not been reported back, and in this repo applying is not evidence of working. 0109–0116 went in as one paste after a first attempt failed on 0109 (`42P13` — `create or replace` cannot change a return type; the revised file DROPs first), which is the same reason **0117 DROPped `squad_feed`/`squad_post_one`** rather than replacing them. ⚠ **0118 renamed `accomplishments.photo_url` → `media_url`** — the one non-additive statement in the pair; the deploy carrying the client half was already live, so this apply is what closed a `42703` the data layer was swallowing into an empty accomplishments list | auth · profiles · chapters · workouts+sets+conditioning legs · PRs · honors (`honor_catalog` + table-driven evaluator) · programs · goals · rank · body metrics · photos · squads+feed+discovery · friends · challenges · notifications · templates · train-together. RLS on all 35 tables; 52/52 `SECURITY DEFINER` pin `search_path`. Design doc still ratifies Firebase — the BUILD is Supabase (PD-7: build governs) |
| **Code Implementation** | **~76%** *(75 screens, essentially all backend-wired)* | **75 screens** — 71 plus `/workout-builder` (W-25) and `/squad/[id]/goal` (S-2b) shipped 2026-08-03 and `/forge-templates` 2026-08-05, and 72 until `/active-run` was retired 2026-08-01 (one run surface, folded onto the workout card). **74 of 75 read real Supabase** — `/forge-templates` browses shipped definitions and reads the athlete’s own templates only to mark what they already own. The whole SOCIAL pillar — Squads · Squad Detail · Friends · Feed · Athlete Profile — is live, not mock; the old "fully MOCK, quarantined in `*-placeholder.ts`" reading was stale by weeks. Remaining: content, media production, and the deferred items in Current Sprint |
| **Testing** | **1057 tests green** *(coverage % not instrumented → not measured)* | All passing. Newest three files guard the 2026-08-05 PO batch: `lift-series` (the chart plots a weight actually moved, a bodyweight lift charts in reps, a lift can go DOWN), `template-day` (a cool-down row does not land in Main; a cardio finisher does not become sets of a run), and `templateIntoDay` (group ids remap, so two templates in one day stay two blocks). Older: Invariant/golden (comment ⊆ thread · check-in ⊆ roster · records ⊆ roster · one-active-program), resolver matrices, domain validators, and four regression guards: `route-guard` (every screen declared, else it answers a URL signed-out), `chapter-tallies` (a chapter with honors never reports 0), **`completionSetCount` (an unweighted set is still a set) and `overlay-branch` (a sheet is mounted in the branch that can open it — verified by removing the fix and watching it fail)**. Newest: percentage-of-max resolution (35 cases, incl. the Epley single-rep inflation) and the program-acceptance rules that caught Squat Ascent asking for two maxes nobody tests. Behavioural coverage of built layers, NOT whole-app coverage |

| Snapshot | Value |
|---|---|
| **Current Phase** | **Post-audit hardening.** 72 screens on a live Supabase backend (97 migrations), 508 tests, live at forgelegacy.expo.app. The 2026-08-01 audit found the build materially healthier than this board claimed — and one class of defect it did not: values displayed from columns nothing writes |
| **Current Focus** | Correctness over breadth. Closed this session: the chapter honor tally (0098), the auth guard on 17 routes, invented athletes in the production bundle, and three silent failures. **Next: CONTENT** — 3 of 24 programs is the largest remaining gap; then the deferred decisions (F7 counter, `rank-progression`, dropping the dead column) |
| **Biggest Blocker** | **Programs content — 3 of 24 authored** (Body Recomposition Foundation added 2026-08-06; Wave 2 of the Stage-2 plan is otherwise untouched). The old entry here ("the Social backend") has been wrong for weeks: Squads, Friends, Squad Detail and the feed are all Supabase-backed. Secondary: 0 of 797 exercises have media |
| **Last Updated** | 2026-08-05 (**Native build config + OTA updates.** Bundle IDs (`com.qest4.forgelegacy`), `eas.json` with three profiles, EAS environment variables on the SAME Supabase project as web, and `expo-updates` at `fingerprint` runtime-version policy. `slug` untouched so forgelegacy.expo.app is unaffected — verified by re-exporting web and reading the PWA title/manifest back. ⚠ `.easignore` replaces rather than supplements `.gitignore`; the one-line version would have uploaded 900 MB on the first build. tsc 0 · 996 tests · web export clean. **No build run, no store accounts yet.** See Recently Completed #1.) Prior 2026-08-03 (**PO TRAINING-SESSION PASS — fourteen items from actually using it, and two of them were not what they looked like.** The active workout screen was fighting the athlete: one Set Input Sheet (weight + reps + Log Set completes it) replaces two single-field pickers and a stray green check, typing is the default and the wheel the opt-in, Add Exercise takes the footer slot that held a duplicate End Workout. **Two silent falsehoods closed**: the wheel wrote `null` for any weight you didn't scroll to, and The Record counted only weighted sets — so three unweighted warm-ups read "0 sets" beside a header that said 3. `weight: 0` is now BW (an answer), `null` is unentered (an absence). **Supersets end to end** on the existing circuit model (migration 0106), **Strength Start's three doors** wired to every entry that had assumed build-as-you-go, **the Free Workout Builder built** (W-25), **token search** unified across picker and library, **a rest-timer ding** (Sound preference became real), **avatar positioning**, and **Squad Goal Detail** to its `.dc` (migration 0107, which also closes the expired-goal contribution drift 0103 recorded and declined to fix). "Save this day as a template" was **never the database** — the naming sheet lived in the wrong render branch, so the button set state nothing rendered; a source guard now catches it. The Legacy Timeline's "weird emblem" was a hand-drawn path where the symbol library's own was three files away. **Apple Watch answered, not built.** tsc 0 · lint at baseline · 878 tests · web export clean. 0106 and 0107 applied same day. See Current Sprint.) Prior 2026-08-03 (**Workout playlist link built — `Workout-Playlist-Amendment-001` had been LOCKED and merged into four base specs since June and implemented on zero surfaces; the W-19 `.dc` drew the row the whole time.** Attach on W-9 ⋯ Options, attach/edit/remove on W-17, read-only on W-19, chip on squad recap cards. Migration **0105** enforces the URL host against the service tag in the database, because the squad card makes this the one column in the app that becomes a tap target for someone who did not type it. tsc 0 · lint at baseline · 819/819. See Recently Completed #1.) Prior 2026-08-01 (**PROJECT AUDIT + CORRECTION PASS** — 72 screens · 97 migrations (all applied) · 508 tests · tsc 0. Five defects closed incl. a chapter honor tally that was always zero on four surfaces, 17 ungated routes, and fabricated identity in the production bundle. Critical path moved from the social backend — long since built — to CONTENT. See Recently Completed #1.) Prior 2026-07-23 (**PROJECT AUDIT** — dashboard reconciled to the built tree. Real state: **334 TS/TSX · 52,713 LOC · 31 routes · 385 tests green · 24 migrations · tsc 0 · lint clean.** Sessions 07-19..07-23 built (all UNCOMMITTED, ~484 working-tree changes): **Home Gym** (owned-equipment gating) · **Exercise Library/Picker → real 794 catalog** · **Coaching content** (732 published) · **Activity History + Detail** · **Program Detail** · **Exercise Detail W-22** · **P-1 DISSOLUTION** (P-1 Profile + P-4 Settings Root dissolved into Legacy + Account Settings; avatar → Account Settings; PD-7) · **Account Settings + Profile Visibility + Notifications + Preferences** (real app-wide Units) · **Accomplishments L-12/13/14 CRUD** · **Pinned Legacy museum + L-13 pin manager** (accomplishments pinnable). Migrations 0021–0024 added. **Biggest findings: (1) the whole build is uncommitted — needs a commit sweep; (2) social/goals remain the only placeholder cluster.** Next: commit, then Goals or the social backend.) Prior 2026-07-14 (Design-handoff — `Programs/*.docx` → structured data conversion COMPLETE + PROMOTED; non-destructive `ingest/` pipeline generated the 2 LOCKED Strength programs to `training/programs/*.json`, wired `getActiveProgram()` to real data, deleted the placeholder; active = Foundation I (3-day) → `training_split:full_body`; tsc 0 / eslint clean / 45 tests; `.docx` untouched; I-4day held (DRAFT), II-3day excluded (mislabeled); Strength-only content gap noted). Prior: 2026-07-13 (Design-handoff Phase 1 — Home Workout Artwork Resolver + asset manifest + §16 test matrix built in `src/domain/home-artwork`; deterministic 7-rung port, reserved Legacy/Honors guard, MovementPattern→family + MuscleId→split bridges, real-catalog enrichment; `tsc`/ESLint clean, 40/40 tests; **§16 gate green → Phase 2 Home re-layout unblocked**; not yet committed). Prior: 2026-07-13 (Design-handoff Phase 0 — data-model foundation implemented (CODE) in `src/domain/profile` + `src/domain/training`; typed schemas + placeholder seed, non-breaking; sex-default bug fixed at model level; `tsc`/ESLint/7-test/e2e-resolver all green; MovementPattern→family and muscle-id→split bridges pending in Phase 1; not yet committed). Prior: 2026-07-12 (Onboarding reconciliation — O-1 → v1.1, O-2 → v2.0, O-3 ⛔ superseded, H-1 → v1.6 conformed to the governing Onboarding architecture; unified path, derived Athlete Type, silent Chapter I; docs-only — no onboarding code exists; see Recently Completed #1). Prior: 2026-07-11 (Exercise Coaching Content System built — `src/domain/exercise-coaching/`, infrastructure only, no content generated, gated on approval). Prior: 2026-07-09 (W18/W19 lock-dependency documentation correction — `Activity History (W18)` was misdashboarded as LOCKED; corrected to LOCK CANDIDATE, and the concrete reason W-19 remains unlocked is now recorded in Decision Queue #16). Prior: 2026-07-07 (Communities promoted to the 5th bottom-navigation tab, reversing the 2026-07-02 Home/Squads discovery-entry-point model — `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`. Prior: 2026-07-02, Communities navigation finalized [Home "Explore Communities" primary, Squads secondary entry point]; new Transformation Gallery Legacy feature [L-17/L-18] added; both formalized from the design blueprint into official architecture. Earlier same-day: all 6 committed Forge component libraries reclassified LEGACY/REFERENCE — visual design system being rebuilt in Claude Design first) |

> **30-second read:** Forge Legacy is a fully-architected fitness-legacy app (257 docs, ~208 mentioning LOCKED) with **a real, backend-wired product** live at forgelegacy.expo.app: **72 screens, 71 of them reading real Supabase data**, over **97 migrations (0001–0098, all applied)** with RLS on all 35 tables. 430 TS/TSX · 87,450 LOC · **508 `node --test` green** · tsc 0 · lint at baseline. *(Two readings that were stale for weeks and are now corrected: the social pillar is NOT placeholder — Squads, Squad Detail, Friends, the feed and Athlete Profile are all live; and this app is Supabase, not the Firebase the design doc ratifies.)* **Content is the critical path now, not plumbing:** exercise coaching is 735 of 797 published (92%) and honors are real data (139 awardable rows), but **programs are 3 of 24** and **exercise media is 0 of 797**. **Open, deliberately deferred** (reasons in Current Sprint): `chapters.workout_count` is a stored counter that is correct only until a delete-workout path ships; ~~`rank-progression` is built but orphaned~~ (**false — corrected 2026-08-02**: the Progress Hub links to it); the dead `chapters.honor_count` column awaits a change that already touches onboarding. **A standing lesson from the 2026-08-01 audit, worth keeping in view: a value that is only ever its default is worse than an absent one — absent renders nothing, a stale default renders a confident, specific, false claim about the athlete.** **The Backend/Data-Model architecture is now LOCKED** (`Backend-Data-Model-Architecture-v1.0.1` — Firebase stack, 12 runtime services, all entity schemas canonical). **Global Search is now also LOCKED** (`Global-Search-Architecture-v1.0.md` — Catalog Search/Discovery Search category split, Never-Searchable list, Performance Firewall-extended ranking/display rules, full reconciliation with both Backend §14 and `Community-Discovery-and-Search-v1.0`). The project can begin implementation as soon as the remaining Freeze rows resolve (Rest Timer, Component Library). **Rank is now ✅ Complete** — all 16 TBDs resolved/closed; RSA, RCM, Calibration Decisions, M-1, P-1, P-2 all LOCKED. Content authoring (programs/exercises) is also early (~12%). **New this session:** the Homepage Principles system is now fully architected and LOCKED — a quiet, rotating "digital inscription" of original Forge Legacy principles and reflection questions on Home (H-1), governed by `Homepage-Principles-Architecture-v1.0` with its canonical content in `Homepage-Principles-Library-v1.0`; the architecture states no fixed entry count so it cannot go stale as the library changes. **Also new this session:** the Communities subsystem (the fourth relationship pillar — Legacy/Friends/Squads/**Communities**) is now fully architected and LOCKED, with `Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`, and a complete downstream reconciliation across Social, Challenge, Honor, Notification, Monetization, and Navigation architecture. **Also new this session:** the Squad System Architecture is LOCKED — Goals, Missions, daily Check-ins, a shared Streak, Momentum, a Weekly Summary, a Squad Feed, Honors integration (new `SQUAD` catalog category), inline Competition standings, and Analytics, all scoped to Squad-internal surfaces only. This **deliberately lifts the Performance Firewall for Squad surfaces alone** — Friends Feed, Communities, and Calendar keep the original no-comparison Firewall unchanged — superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for those surfaces. **Also new this session:** Exercise Library Phase 4 (Media Architecture & Standards) is LOCKED — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group and defines production standards for all 5 media/anatomy fields, including mandatory consistency rules for looping animations (neutral-stance start/end) and muscle target images (fixed model/pose/camera template). This is standards and schema only — media production itself remains entirely unstarted for all 195 exercises. **Also new this session:** the Exercise Library's 5 flagged naming-duplicate pairs are fully resolved (Phase 5) — one canonical V1 name locked per pair (Box Step-Up, Back Squat, Front Plank, Barbell Romanian Deadlift, Barbell Bench Press), catalog reduced from 200 to 195 exercises (44 anchors, down from 45), and a new `Exercise-Naming-Standard-v1.0.md` locks the naming principles and an immutability-after-publication governance rule for future authoring. **Also new this session:** the Honors System Final V1 Architecture is LOCKED — reconciled two previously-parallel, never-merged catalog lineages (the locked 82-type catalog and six unmerged Expansion Pass documents) into one coherent system, merged Endurance/Consistency/Prestige, and added a new Hidden category, reaching **167 honor types across 13 categories**; two brand-new Strength honor families (Sex-Specific Milestones, Relative Strength Milestones — 24 types) were designed in full and then deferred to V2 by PO decision before final lock; also discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (still showing the original 7 categories from before this project's own prior Competition/Communities/Squad work). Architecture and schema only — the full L-11 descriptive-content catalog pass remains a separate, future task.

---

## 🚦 Project Health

| Dimension | Health | Read |
|---|:---:|---|
| **Architecture** | 🟢 | All 21 Freeze rows ✅ Complete; **V1 Architecture Freeze FROZEN 2026-06-30** |
| **Documentation** | 🟡 | 257 `Docs/*.md` (42 Amendments), ~208 mentioning LOCKED. Specs are strong; the lag is in THIS dashboard and in amendments authored but never merged into their parent docs — the recurring pattern |
| **Content** | 🟠 | Mixed, and previously mis-scored as one number. **Coaching content 735 of 797 published (92%)**; honors ARE data (139 awardable rows). **Programs 3 of 24** and **exercise media 0** — those two are the real gap |
| **Backend** | 🟢 | **Supabase, built & live** — 97 migrations (0001–0098, all applied), RLS on all 35 tables with ≥1 policy each, 52/52 `SECURITY DEFINER` functions pin `search_path`. Audit verified 53 RPC names, 61 call sites, 434 select columns and 119 write payloads all resolve |
| **Code** | 🟢 | **72 screens, 71 of them on real Supabase data.** The one fixture-backed screen was deferred out of the routed tree 2026-08-01. ~150 components · 68 domain modules · 39 data modules |
| **Testing** | 🟢 | **508 green** across 40 files (`node --test`) + live Supabase round-trip proofs; gates every unit. Coverage % still not instrumented → not measured |
| **OVERALL** | 🟢 | **A real, backend-wired app.** The social pillar — long carried here as the blocker — has been live for weeks. Critical path is now CONTENT (programs, exercise media), not plumbing |

---

## 🏃 Current Sprint

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
- [ ] Programs content: 3 of 24. **This is still the single largest real gap in the project**

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
| 13 | Notifications | ✅ Complete | P-5 (Arch + Wireframe + Amend 001) LOCKED |
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
- [x] **P-5 Notifications (Arch + Wireframe)** — LOCKED **v1.4** (this session: Squad Feed Activity / Squad Reactions & Mentions relabeled + scope-expanded, new Squad Goal & Mission Updates toggle added per `Squad-System-Architecture-v1.0` SQ-D12)
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
| **Exercise Media** | 0 | 797 | **0%** | ⚠ Second-largest content gap. Standards defined (`Exercise-Media-Architecture-v1.0`), production unstarted |
| **Honors (as data)** | **139 awardable rows** | — | ✅ | `honor_catalog` TABLE + one table-driven evaluator (0077–0083). Most new honors are ROWS, not code. Previously dashboarded as "0 / 167", which predated the build |
| **Badge / Honor Artwork** | 7 rank-family badge sets | 81+ | ~9% | Rank badges shipped and wired; honor medallions still 0 |
| **Transformation Gallery (as data)** | live feature, athlete-authored | — | ✅ | Built (L-17, migration 0044); volume is per-athlete, not an authoring target |

**Content roll-up:** no longer one number — the old "~12% overall" was wrong in both directions. **Coaching content is 92% published and honors are real data**; **programs (3 of 24) and exercise media (0 of 797) are the actual gap.** Averaging those into a single percentage is what let the coaching work stay invisible on this board for weeks. Documentation completeness and content volume remain independent axes.

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
| 14 | **Transformation Gallery — 3 non-blocking open items** | `Transformation-Gallery-Architecture-v1.0.md` (new, 2026-07-02) carries three explicit open questions: (1) whether entries share the existing 50-photo free-tier cap, get a separate cap, or are uncapped; (2) whether "Chapter Cover Media" (`isChapterCover`, reserved field) should render on L-3/L-4/L-1 and how; (3) whether an original (pre-seal) entry should be deletable while its own chapter is still Active — the current wireframe spec takes the conservative "no delete" reading, matching the Photos precedent. None of these block the feature functioning as specced. | PO/stakeholder direction on the monetization limit; a future reconciliation amendment for chapter-cover-media display; confirm or overturn the conservative delete-policy reading |
| 15 | **Workout With Friend management queue + Import Training entry point — no reassigned home** | W-1's retirement (`Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, 2026-07-08) removed the only specced surface for (1) the WwF Claim/Dismiss/Approve/Decline management queue for pending M-8/M-9 items, and (2) the "Import Training" Secondary CTA (`Architecture-Amendment-001-Import.md`). Both explicitly acknowledged as open (WNA-D5), not silently dropped or silently given a guessed-at home. | Decide the new surface for each — candidates include H-1, W-2, or a notification-only surface for the WwF queue; W-2 or H-1 for Import Training — then author a follow-up amendment |
| 16 | **W-1 retirement's full downstream surface — ~25 documents not yet reconciled** | A post-retirement audit found W-1 is a load-bearing navigation target far beyond the 8 documents touched in the 2026-07-08 pass: the post-workout "Done" destination (`Workout-Summary-Spec-W17.md`), the Train Together stack-replace target (`Train-Together-Screen-S10.md`), the WwF notification system's canonical home (`Workout-With-Friend-Spec-WwF.md`, `Squads-Hub-Wireframe-Spec-S1.md`, `Squad-Detail-Wireframe-Spec-S2.md`, `Squad-Management-Permissions-Spec-S3.md`, `P-5-Notifications-Architecture.md` + Wireframe-Spec, `M-7-Premium-Upsell-Spec.md`), the back-stack root for `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md` (indirectly), `Exercise-Library-Wireframe-Spec-W21.md`, `Activity-Type-Picker-Spec-W8.md`, `Workout-Templates-Hub-Spec-W26.md`, `Workout-Builder-Wireframe-Spec-W24.md`; six Challenge-family tab-bar tables (`Challenge-Hub/Detail/Results-Wireframe-Spec-C1/C3/C4.md`, `Hall-of-Champions/Squad-Records/Current-Champions-Wireframe-Spec-C5/C6/C7.md`); Goal Hub's entry point and a pre-existing unresolved routing conflict (`Goal-Hub-Wireframe-Spec-G1.md`); `P-2-Progress-Hub-Architecture.md`/`Spec.md`'s CTA-destination table; and two other active LOCKED amendments that scope rules to W-1 by name (`Amendments/Program-Architecture-Amendment-001-Active-Program-Rule.md`, `Amendments/Monetization-Architecture-Amendment-001.md`). Several of these (the "Done" landing screen, the Train Together stack target) are genuine product decisions, not mechanical W-1→W-2 substitutions. **Concrete confirmed instance (2026-07-09):** `Activity-History-Wireframe-Spec-W18.md`'s own header is LOCK CANDIDATE, not LOCKED — the Documentation Status table previously misstated it as LOCKED; corrected. Because `Activity-Detail-Wireframe-Spec-W19.md` cites `W-18 v1.0 (LOCKED)` as its own authority, W-19 cannot legitimately be marked LOCKED until W-18's stale W-1 entry-point citation is reconciled — this is the actual, previously-undocumented reason W-19 remains a lock candidate, not merely an outstanding sign-off. **Second concrete confirmed instance (2026-07-10):** `Goal-Hub-Wireframe-Spec-G1.md`'s own §23 Conflict 1 already flagged the W-1 Chapter Context Card goal-tap routing as unresolved before retirement; retirement removed that entry point entirely with no replacement decided — corrected in G-1 → v1.2. Same pass also found and fixed an unrelated, longer-standing reconciliation-lag bug in G-1: it still read "post-MVP" throughout for G-2/G-3, even though both are authored and LOCKED (G-2's own spec already stated "G-2 is MVP" and flagged G-1 as needing correction, but this was never propagated back — the exact pattern this Decision Queue row and § Amendments Not Reconciled both describe). | Decide the actual replacement destinations for the ambiguous cases, then run a dedicated follow-up reconciliation pass across all ~25 documents |
| 17 | **"Squad Records" names two different screens** | The design's `Forge Squad Records.dc.html` is a TRAINING record book (heaviest lift, biggest session, longest run, most workouts/PRs per month). `Squad-Records-Wireframe-Spec-C6` + CS-D19 define C-6 as a COMPETITION record book over SQUAD-context `ChallengeResult` history (most challenge wins, consecutive wins, challenges entered, highest challenge score, most PR-challenge victories) — **zero overlap**, and C-6's entry point is the unbuilt Challenge Hub (C-1), not Squad Detail. Under PD-7 the design governs, so the training version SHIPPED 2026-07-28 (migration 0058, `/squad-records`, entry on Squad Detail). **Partly settled 2026-07-29:** Competitions shipped and put challenge history in **Hall of Champions (C-5, migration 0068)**, not folded into Squad Records — so the two surfaces coexist without overlap, which is effectively option (a). The naming collision itself stands: the design's `Forge Squad Records.dc.html` (training records) and CS-D19 (competition records) still share one name. The remaining decision is narrow — amend CS-D19 to redefine Squad Records as training-based, since the competition aggregate it describes now lives in C-5/C-7. | **Decide when Competitions starts:** either (a) rename one surface — training stays "Squad Records", competition history folds into Hall of Champions (CS-D18) / Current Champions (CS-D20); or (b) amend CS-D19 to redefine Squad Records as training-based and drop the challenge aggregate. Also confirms whether CS-D22's Firewall bar on S-1/S-2 applies to a training record book at all — it was written for challenge data. |
| 18 | ~~**Challenge metric table extended beyond CS-D8**~~ **CLOSED 2026-07-29** | `Challenge-System-Architecture` **CS-D8** locks five ChallengeTypes; the build ships fourteen, plus `metric_key` scoping and `challenges.tz`. **Note: this entry and several commit messages cited CS-D9 — the wrong ID. CS-D9 is qualifying-event rules, which the build conforms to unchanged; the metric table is CS-D8. Misattribution corrected.** | **RESOLVED** by `Docs/Amendments/Challenge-Architecture-Amendment-005-Metric-Expansion.md` (LOCKED). CA5-D1 extends the table to 14 types — the four fairness metrics exist because every original metric rewards the biggest/strongest athlete, so a mixed squad's leaderboard is decided before it starts (CC-D3); the four progression metrics (shipped 0063, no longer 'agreed but not built') score absolute gain floored at zero, since percentage gain is unwinnable for anyone with a real baseline and a negative on a leaderboard is a failure marker. CA5-D2 generalizes CS-D8's own `targetExerciseId` into `metric_key`. CA5-D3 adds `tz`. CS-D11's RANK_XP deferral untouched. A superseded banner now sits on CS-D8; three downstream doc edits remain listed in the amendment's §6. |
| 19 | **`deriveFeatured` implements ~15% of a LOCKED spec** | `Featured-Legacy-Moment-Standards.md` v1.0 (LOCKED) defines five tiers, nine event types, a 30-day active window and a fallback chain, cited by the PRD, L-1, L-2, the MVP audit and Transformation-Gallery-Architecture. `src/data/legacy-live.ts` returns the most recent `CHAPTER_SEALED` and stops — no window, no tier priority, no fallback. The hub card therefore looks arbitrary because it is **unfinished**, not misnamed, and the Legacy walkthrough currently has to say "chosen for you" to stay honest | Decide: build the algorithm to spec, or amend the Standards down to what shipped. Not a tutorial-pass decision |
| 20 | **Three curation-shaped concepts, all locked, differently named** | Pinned Legacy (max 6, athlete-chosen) · Featured Legacy Moment (1, system-derived) · Featured on Profile (max 3, athlete-chosen, `L-12-Accomplishments-Management-Architecture` LOCKED). Two are called "Featured" and one of those cannot be chosen. Prior notes already record that athletes conflate pinned-vs-featured. **Both names are locked vocabulary**, so a rename is an amendment, not a refactor. Mitigating today: they never appear on the same screen, and the walkthroughs disambiguate them explicitly | Decide whether one gets renamed by amendment, or the vocabulary stands and the tours carry it |

---

## ✅ Recently Completed (last ~20 milestones)

### 1. Close Quarters (6-Day) — the first program that claims to work at home, and the gate that cannot see a bench (2026-08-06, CONTENT + test — no migration)

**Asked for:** a third free muscleandstrength.com PDF — *Dumbbell Only Workout: 6 Day Split* — with "this
could be an at home workout don't you think?"

**Yes, and it is the first of the three that actually is.** The app already had the deciding rule:
`HOME_EQUIPMENT` in `starter-templates/core.ts` — bodyweight · dumbbell · band · kettlebell · suspension
trainer · med ball — deliberately **narrower** than `equipment.json`'s "Home Gym", which tags the barbell
as home equipment (*true of a home gym and false of a bedroom*, in that file's own words). All 40
prescriptions pass it, checked mechanically.

**⚠ And the gate is structurally blind to the thing that actually blocks a home athlete.** `TWELVE of
these need an adjustable bench` — flat, incline and decline press, chest-supported row, pullover, hip
thrust, skull crusher, incline rear delt fly. `dumbbell-bench-press` is tagged `dumbbell` **because the
equipment field records what you LOAD, not what you lie on.** So a third of the program sails through a
home check while being impossible with dumbbells alone. The source half-knows: it slips a **floor press**
onto day 1 and needs a bench for every other press it prescribes.

**PO decision: keep the bench, state it.** So the requirement lives in `environment` — *"Home — dumbbells
and an adjustable bench"* — the only place the athlete is told, since the gate will not tell them. **A
test asserts that string still contains the word "bench"**; shortened to "Home", the program silently
starts claiming a spare room is enough. **Day F (Legs, Hinge Lead) needs no bench at all.**

**Shipped:** 12 weeks × 6 days = **72 sessions**, push/pull/legs twice through — and the **first program
in the catalog that can honestly set `structure: 'ppl'`** (Full Frame and Frame by Frame both omit it,
correctly). Drawn from the **92 visible dumbbell exercises**; a second test asserts every key is a
*dumbbell* exercise, not merely home-legal, because a band or kettlebell would pass the first check and
would not be this program. **TWO deloads** — weeks 4 and 11, peak week 12 — which PAS-D7 requires of an
11–14 week program and **the source has none of, across twelve weeks at six days a week.** Rest raised
from the source's 45–60 s to PAS §10.3 INTERMEDIATE (150/120/60).

Rep-volume 182 → **138 (deload)** → 220 → 338 → **144 (deload)** → **420 (peak)**, every session inside
PAS-D11, deloads included. 12 acceptance tests, **each verified by mutation** — a cable row, a barbell, a
*kettlebell* (home-legal but not a dumbbell), a dropped "bench", a removed deload and a flat
transcription all turn it red.

**⚠ Recorded in Design Record §8, and it is a catalog question not a program one:** an athlete browsing
the Program Catalog sees name, duration and frequency — **not `environment`** — so a home athlete with no
bench can adopt this and find out on day 1. And this is the **third program shipped outside the locked 24
in one day**; the locked catalog is still **3 of 24**.

tsc 0 · lint at baseline · **1098 of 1098**.

### 2. Frame by Frame (5-Day) — a body-part split, and a guard against the mistake that got Full Frame's first draft rejected (2026-08-06, CONTENT + test — no migration)

**Asked for:** a second free muscleandstrength.com PDF — *M-F Workout Routine: 5 Day Body Part Split* —
with "make a Forge workout program just like this."

**Two collisions were put to the PO before authoring, and he chose knowingly.** The obvious slot,
**Muscle Building Intermediate (Sort 6)**, is LOCKED at **10 weeks × 4 sessions** — the PDF's duration
exactly, its frequency not at all. And the catalog already carries **Full Frame**, a 5-day Muscle
Building / Intermediate program built in August from the PO's own five tables. Offered the 4-day locked
slot, the 5-day overlap, or nothing, **he chose the 5-day.** So this ships **outside the locked 24** with
`successorName: null`, and **Sort 6 remains UNBUILT.** A locked Blueprint outranks a PDF; that is why
this program does not carry that name.

**The overlap is real and is argued from both sides in Design Record §2.** They differ on the thing the
argument is actually about — Full Frame splits by **movement pattern** (~2× per muscle per week, 6
weeks); this splits by **body part** (1× per muscle at much higher per-session volume, 10 weeks with a
deload). ⚠ The honest counter is recorded too: the Program Catalog surface shows name, duration and
frequency, so to an athlete choosing between them these read as "the 6-week one" and "the 10-week one".

**⚠ The reason this one needed its own test file.** Full Frame's first draft was rejected for
transcribing five supplied tables verbatim across six weeks — 35 prescriptions, 25 of which never
changed, with "add weight when you can" living only in prose. *The app renders sets and reps; the load is
whatever the athlete decides*, so week 6 rendered identically to week 1. **The source PDF has the same
defect** ("follow the program as written for 10 weeks, moving up in weight when possible"). A
transcription passes every generic check in `programs.test.mjs` — real keys, real units, real warm-ups,
well-formed blocks — and the only thing wrong with it is invisible unless a test compares blocks to each
other. So one now does: **making all six blocks identical fails three tests.**

Progression lives entirely in numbers the app draws: rep-volume **174 → 212 → 320 → 328**, deload **138**
(week 9), peak **410** (week 10). Every session inside PAS-D11 HYPERTROPHY (5–8 exercises, 18–30 sets)
**including the deload**, which drops volume through reps rather than falling out the bottom.

**Three things the source does that this does not:** no deload (PAS-D7 requires one at week 9); **30–45 s
rest between sets** prescribed against a 4×6 deadlift, replaced with PAS §10.3 INTERMEDIATE ranges; and
**Monday-to-Friday**, which is its whole hook and which Forge cannot express — PAS §2.2 locks
`dayOfWeek` to null because programs are sequential, not calendar-based. Days are A–E, and a test fails
any session named after a weekday.

12 acceptance tests, **each verified by mutation**. 36 catalog keys, all resolving against the visible
721. tsc 0 · lint at baseline · **1086 of 1086**.

### 3. A rule no author could satisfy, and a guard that failed the moment it was committed (2026-08-06, DOCS + test — no migration)

Two defects of the same shape — **something that had been quietly broken since the day it landed, reading
as fine because nothing could see it.**

**PAS-D9 required a cool-down that no program can author.** `ProgramWorkout` has `warmup` and `main`.
There is no third section and never has been, so **no in-repo authored program could satisfy PAS-D9, in
any category** — while the Standard required one for every CONDITIONING, RUNNING, CYCLING and
COMBAT_SPORTS program. It was easy to miss because the vocabulary exists without the storage:
`WorkoutSection` on the *runtime* model has all three, and §9.1 was written against the import pipeline's
enum — a path the authored-in-repo programs, now most of the catalog, never take.

It had **already failed silently twice.** Iron & Engine recorded it as finding 7 and shipped. Body
Recomposition Foundation hit it again and was **LOCKED with it open**, which turned a draft's known gap
into a written contradiction between the Standard and the locked catalog — and that is what finally
forced the question. **PO decision: change the rule.**
`Program-Authoring-Standard-Amendment-003-Cooldown-Not-Required.md` (LOCKED) sets COOL_DOWN to Optional
everywhere. **No JSON changed, no program re-authored, nothing an athlete sees is different.** Body
Recomp goes 10/11 → 11/11; Iron & Engine's finding 7 closes.

Two things deliberately survive the amendment, both now asserted rather than written down: **never fake a
cool-down in `main`** (PAS-A3-D4 — `setCount` counts it as working volume and W-9 logs it as a working
set, inflating every volume figure the program reports), and **a field alone does not revive the rule**
(PAS-A3-D3 — it needs a field *and* a surface that renders it, the same reason `ExercisePrescription`
deliberately has no `notes`). Merged into the parent spec in the same pass — §9.1, §9.4, §20, §19 — per
the standing rule about unmerged amendments.

**`svg-gradient-stops.test.mjs` matched its own doc comment.** `git grep` searches TRACKED files. The
guard was written while the file was untracked, so the search could not see it and the suite was green;
committing it in `157bf34` made it tracked, and the comment explaining the rule contains the literal the
rule searches for. **It reported its own explanation as a defect on every run since.** Fixed with a
pathspec excluding itself — rewriting the comment would have traded a working guard for an unreadable
one. Verified both ways: passes clean, and a probe carrying a real `stopColor="rgba(...)"` still turns it
red. **A source guard that greps for a string it must also SAY has to exclude itself, or it is born
failing.**

Gates: tsc 0 · lint at baseline · **1074 of 1074 `node --test`, nothing excluded** — the first fully
green suite in this working tree. Commits `947a082`, `0b8b179`.

### 4. Body Recomposition Foundation — the first program the catalog plan actually asked for (2026-08-06, CONTENT + test — no migration)

**Asked for:** the PO brought in a free third-party PDF — *8 Week Beginner Fat Loss Workout*
(muscleandstrength.com) — and asked to "tweak it a little" into the catalog.

**It was not tweaked, and the reason is worth keeping.** A light edit of someone's published program is
the one option that keeps what is protected (name, session titles, the authored sequence, the copy) while
changing what never was. This repo had already settled the posture twice — `scripts/bridger-logan/`
and Squat Ascent's Design Record §1 — so the method was taken and the program authored.

**The slot already existed and was LOCKED.** `Body-Recomposition-Foundation-Blueprint-v1.0.md` (June
2026) fixes **8 weeks · 4 sessions · 32 workouts · CONDITIONING / BEGINNER / GYM · `LOSE_FAT +
BUILD_MUSCLE` · Week-7 deload**. The PDF's shape, independently, months earlier. So the source was a
sanity check on the metadata and an input to nothing.

**⚠ The source is thinner than our own standard, which is the substantive reason not to have copied it.**
It has **no progression at all across eight weeks** — its 10-rep and 20-rep days are two of the four
workouts, not two phases, so the same four sessions repeat for the whole block (QC-2 requires visible
overload). No warm-up, no cool-down (PAS-D9 requires both). No deload. 12 MAIN sets, the floor of the
12–24 envelope. Copying it would have been a downgrade, not a shortcut.

**What shipped:** `body-recomposition-foundation.json` — 5 blocks covering all 32 sessions, Upper/Lower
×2 (*Press & Pull · Squat & Stride · Row & Raise · Hinge & Bridge*), **Volume Accumulation**: 15 → 15 →
18 sets and 10 → 12 → 12 reps, **Week 7 strips to the four compounds at 8 easy reps and walks**, Week 8
peaks at 18 sets × 15 reps. Every session resistance-led, closing with one steady-state bout (bike ·
incline walk · elliptical), timed via `targetSec` — which `adopt-core.ts` was verified to carry across
before a line was authored. **No barbell anywhere**, deliberately: PAS §11.3's complex-barbell caution
read strictly, because a beginner in a deficit is the worst-placed athlete in the catalog to be acquiring
squat technique. All 23 keys resolve against the **visible** 721, not the 797.

**14 acceptance tests, each verified by mutation** — smuggling in a barbell, flattening the deload,
breaking the set envelope, moving the finisher before the accessories, and stretching rest past 90 s all
turn the suite red, and the file restores clean.

**⚠ One known standard violation, not papered over:** nothing prescribes a cool-down, because
`ProgramWorkout` has no cooldown field. That is Iron & Engine's finding 7 unchanged — and this is the
**second** CONDITIONING program to violate PAS-D9 for the same reason, which is the point at which
"recorded as an open gap" stops being enough. Either the schema grows a field and a surface that renders
it, or PAS-D9 is amended. Recorded in Design Record §7 and §9 rather than faked by appending a stretch to
`main`, where it would count as a working set.

**⚠ Separately, a pre-existing test defect surfaced by running the full suite:**
`svg-gradient-stops.test.mjs` greps tracked files for `stopColor="rgba(` and **matches its own doc
comment on line 8**. `git grep` only sees tracked files, so it passed when the author ran it untracked
and has failed on every run since it was committed in `157bf34`. Not touched — it is unrelated to this
work and the fix is a pathspec exclusion the PO should land on its own.

Gates: **tsc 0 · lint at baseline (1 pre-existing error + 13 warnings) · 1072 of 1073 `node --test`**,
the one failure being the self-matching SVG guard above. `status` is deliberately **not** `LOCKED` —
Lock Approval is a signature this repo cannot give itself. Not committed.

### 5. The programs prescribed 244 things the app cannot show, and the guard said they were clean (2026-08-06, CONTENT + test — no migration)

**Asked for:** "make sure that only workouts that we have in our exercise list are actually in the
programs. Also, anything like the empty barbell bench just get rid of, people will warm up properly on
their own."

**The catalogue is 797 rows; the app shows 721.** `HIDDEN_EXERCISE_IDS` removes 76 — the cardio
activities conditioning owns, the gymnastics skills and strongman lifts this app cannot coach. That
difference is the whole finding. A program naming a hidden row prescribes an exercise the athlete cannot
open, cannot read coaching for, and cannot swap — a dangling key in every way that matters to the person
training, and invisible to a check written against the file.

**⚠ THE ACCEPTANCE GATE WAS MEASURING THE WRONG SET.** `programs.test.mjs` built `catalogIds` from
`exercises.json` — all 797 — and asserted no dangling keys. It passed for months while Iron & Engine's
Engine circuits prescribed **`air-bike` seven times**, a row hidden from browse, search and the picker.
This is the *same* correction `aliases.test.mjs` already carries, and its comment says why: a test built
from the file "modelled 797 rows the matcher never sees." Two guards, same catalogue, one had been fixed
and the other had not. **When a check names a data source, confirm it names the one the app reads.**

**Warm-ups were never checked at all.** They are freeform prose matched back by NAME
(`structureFromDefinition` → `itemByName`), and the old assertion only asked that an item had `text` and
no `catalogKey` — both true of a line that resolves to nothing. **232 of 405 resolved to nothing:**
"Build-up sets" ×60, "Bike or brisk walk" ×60, "Empty bar squats" ×25, "Light lat pulldown", "Bodyweight
hip hinge". Each entered the session as a row with no demo, no coaching and no logging identity — prose
wearing an exercise's clothes. A further **12 resolved fine and were still ramp sets**: "Barbell Bench
Press — empty bar, 8 reps". That one is the PO's example, and it is the case rule 1 could never catch.

**244 of 405 warm-up items retired; 161 kept, every one a real visible exercise** — Cat-Cow, Dead Bug,
Band Pull-Apart, World's Greatest Stretch, Scapular Pull-Up, Glute Bridge. **19 of 114 sessions now open
with no warm-up at all**, concentrated in Deadlift on the Measure (11 of 20) and Strength Foundation II
(8 of 12), because their entire prep was a bike, an empty bar and build-up sets. That is the instruction
applied, not a gap: people warm up on their own.

**`air-bike` ×7 → Burpee ×5 and Ski Erg ×2, by PO decision** (the alternatives were un-hiding Air Bike or
dropping the station). **The program had already answered this itself** — its own Weeks 5–6 circuits
replace the bike with a Burpee, so five sites took the substitute the author had picked. The two that
could not are the "Rope & Burpee" circuits, where a Burpee is already station two; those took Ski Erg,
which is *kept visible* by the hidden list's own stated exception, no conditioning activity covering it.
Day E stays named "Pull & Bike": in Weeks 5–6 it really does ride, a `cardio:bike` steady bout.

Also fixed: the ingest had split **"Incline Push-Up — 10 reps"** on the hyphen, storing the name as
"Incline Push" and the detail as "Up — 10 reps" — visibly broken text in four places, resolving only by
alias luck.

**Verified independently of the suite** — a script using the production resolvers (`buildPickerDb`,
`itemByName`) over all 7 programs: **568 main entries and 161 warm-ups, 0 unresolved.** The **81 starter
templates were audited too and were already clean, 579/579** — the defect was never in the templates.

**Gates:** tsc 0 · programs suite 33/33 · full suite **1041 of 1042**. The one failure is unrelated and
**pre-existing at HEAD**: `svg-gradient-stops.test.mjs` greps `src` for `stopColor="rgba(` and matches
**its own doc comment on line 8**, so it has been red since it was committed — and a permanently red
guard can never report the violation it exists to catch. Not fixed here; it is not this pass's file.

**Then: "Katana Extension" — a name that was never an exercise, pointing at a clip that does not exist.**
Full Frame's Day A Push carried it three times. `programs.test.mjs` passed it because its key
(`cable-cross-body-triceps-extension`) is a real visible row — but **that row has no demo animation in
the `exercise-media` bucket at all**, checked live, male and female, loop and poster. Swapped to
**`cable-overhead-triceps-extension`**, which has all four assets, and the label now reads *Cable
Overhead Triceps Extension* rather than gym slang. Two wins came free: the Design Record had **already
flagged this exact row as the one place a name was interpreted rather than looked up** ("if it meant an
overhead variant instead, the fix is one key"), and Weeks 5–6 was *already* using the overhead key under
the same label — so the swap also collapsed one of Full Frame's split labels.

⚠ **NINE MORE LABELS IN FULL FRAME NAME TWO DIFFERENT EXERCISES.** "Lunges" is a Bulgarian Split Squat in
one block and a Walking Lunge in another; "Cable Flyes" is a cable fly then a pec deck; "Calf Raises" is
standing then seated. The athlete reads one name and trains a different movement, with nothing saying so.
The Design Record documents **one** variant chosen per family ("Cable Flyes → `high-to-low-cable-fly`",
"Calf Raises → `standing-calf-raise-machine`") — **the data uses two, so the record and the program
disagree.** Reported, not fixed: whether these are intentional progression or ingest drift is a PO call.
Only Full Frame does this; the other seven programs are clean.

**⚠ AN EIGHTH PROGRAM LANDED MID-PASS.** `body-recomposition-foundation.json` appeared in the directory
at 10:01, after this audit had run and reported "all 7 clean". It was re-audited: **692 main entries and
221 warm-ups across 8 programs, 0 unresolved** — the new one already complies, warm-ups included. It is
covered because both the test and the audit script **derive the program list from the filesystem** rather
than a hand-kept array — the fix `programs.test.mjs` already carries for exactly this reason. **A
statement about "all N programs" has a shelf life when someone else is authoring in parallel.**

**Animation coverage, measured against a real LISTING of the bucket** (`storage/v1/object/list`, anon
key): the bucket holds **417 male and 297 female loops**. Of the **97 distinct exercises across the 8
programs: 62 complete · 14 male-only · 2 female-only · 19 with no clip at all** — the machine work in
Body Recomposition Foundation, plus Battle Rope Slams, Forward Sled Drag, Ski Erg and the chest-supported
rows. `barbell-back-squat` is male-only and is used by **7 of the 8 programs**, so it is the single
highest-value clip to add.

**⚠ THE FIRST MEASUREMENT OF THIS WAS WRONG, AND THE WAY IT WAS WRONG IS THE POINT.** Coverage was first
probed with one `HEAD` per URL; that reported 61/15/21. A re-probe with three attempts per URL found
**six exercises reported missing that were actually present** — Side Plank, Sled Push, Split Squat and
three more — so the single-pass numbers were noise, and they had already been reported to the PO as fact.
**A network probe is not a measurement; it is a sample.** The authoritative answer came from listing the
bucket, which is one request and cannot flake per-item. Ask the store what it HAS rather than asking 200
times whether it has each thing.

⚠ **`Forge-Program-Production-Standard.docx` §warm-up now disagrees with the code.** It specifies 1
general + 1–2 pattern prep + 1 rehearsal, and two of those three elements are what the PO removed. The
test that encoded it (`Iron & Engine: the Standard's warm-up shape`) has been amended to a floor of 2
with the reason written in. **The .docx is under the append/annotate-only rule, so it is flagged, not
edited — it needs the PO's amendment.**

### 6. PO batch 3 — four items, and two of them were charts and links that had quietly stopped being true (2026-08-05, migrations 0117–0118 — ✅ APPLIED 2026-08-06)

**Where the batch came from:** the PO used the app and wrote down four things. Two were plain gaps. The
other two looked like missing features and were something worse — a screen and a link that both looked
finished and had each been telling the athlete something false for months.

**1 · A template you are looking at can now be trained.** `/template/[id]` always had *Start Workout*;
the **Forge** preview (`/starter-template/[id]`, 81 shipped sessions) had exactly one action, *Add to My
Templates*. So the only route from "here is a push day" to doing it ran through filing a copy in your
library first. **Start Workout** is now the primary there and trains the definition as it ships,
**owning nothing** — a new `starterId` on the launch context, not `templateId` (there is no row to
attribute to) and not `exercises` (that field carries the four keys an invite snapshots, which would
have dropped the warm-up and cool-down sections and turned the **29 definitions ending in a conditioning
block** into sets of a run). The template→session mapping was extracted so both doors use one code path.

**2 · A template can be dropped into a program day.** The Day Builder could add one exercise at a time,
so building "Push Day" as day A of a program meant rebuilding it lift by lift beside the template that
already described it. **Use a template** now fills the open day from the athlete's own saved workouts or
the Forge library, in one search over both. `templateIntoDay` is pure and tested: an empty day just
takes it, a day with content asks *replace or add to it*, a name you typed is never overwritten, and
**group ids are remapped** — without that, appending the same template twice would put two blocks
carrying one id next to each other and they would fuse into a superset nobody authored.

**3 · ⚠ The lift charts were plotting the wrong thing, and had been since they shipped.** The Progress
Hub's sparklines, tap-to-read chart and "choose your lifts" sheet were all built to the `.dc`. What fed
them was `personal_records` — a table that only gains a row when a set **beats** the standing best. So
the line an athlete read as "how my bench is going" was a plot of the days they broke a record: a lift
trained hard for months without a PR drew a **flat line or none**, a lift never PR'd at all **could not
be selected to chart**, and **nothing could ever go down** — a deload, an injury, a bad month, invisible
by construction. Worse, the value plotted was **Epley e1RM**, which `metrics.ts` had already ruled out
in this codebase for exactly the right reason (*"an athlete told they set a 330 lb record never lifted
330 lb"*) — the chart was showing weights nobody had ever moved. The series is now **one point per day
trained, valued at the heaviest weight actually moved**, carrying the reps it was moved for; a lift that
has never been loaded is charted **in reps** rather than as a flat line at zero, and a loaded lift's
bodyweight days contribute no point rather than a crash to 0. Record days are still marked. The chart
gained the three things the `.dc` had and the build never did — **gridlines, dated x-axis ticks, and a
scale** — and the selectable pool is now every exercise in the log, with a search once it passes eight.
Smoothing stays deferred: a curve through training data draws a Tuesday you did not train.

**4 · ⚠ A shared workout recap was a dead link for everyone but its author.**
`Social-Architecture-Amendment-002` §3 says a recap card taps *"through to the session on Activity
Detail"*, and the Friends feed did route there — but `fetchActivityDetail` reads `athlete_id =
auth.uid()`, so **every athlete who tapped a friend's recap got "Couldn't load this session"**. The
entire audience the post was written for. The Squad feed never tried: a recap opened the post page and
rebuilt a reduced version of the same screen from the `workout_summary` snapshot, which holds no
set-by-set data at all — so the same post type reached two different destinations depending on which
feed you found it in, and neither was the one the amendment specifies. **Migration 0117** adds
`shared_workout_detail`, a `security definer` function gated on **the post, not the relationship**
(SOC-A2-D1: *"friendship still exposes nothing… the athlete does"*) — unfriend, leave the squad or
delete the post and the session stops resolving. An RLS policy was the wrong tool: it would apply to
every query against `workouts`, including the history list and the new set read. A viewer gets the
session in full and is **denied four things by design** — the ordinal (a count of the author's whole
training life), the chapter (their own Legacy prose), the partners (other people who posted nothing),
and the program's id (so it is named but not tappable, since a link to a permission error is worse than
a label). 0117 also gives `squad_feed`/`squad_post_one` the `workout_id` they had stored since 0043 and
never returned — the identical omission 0113 fixed on the Friends side.

**5 · An accomplishment can carry the photo or the video.** 0023 created `photo_url` *"reserved for the
design's optional photo"* and nothing ever wrote it; the screen carried the matching DEFERRED note. Both
had outlived their reason — `useMediaPicker` and 0006's owner-scoped `media` bucket had existed for
months. **Migration 0118** RENAMES `photo_url` → `media_url` and adds `media_kind`, both-or-neither by
check constraint. A rename rather than a second column because two fields meaning "the media on this
row" is the drift this codebase keeps unpicking; safe here because the column has never been written.
**Video too**, which the `.dc` never drew — the PO asked for "the video or the picture".

**Gates:** tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **1057 `node --test` green**
(was 996; +27 across three new files: `lift-series`, `template-day`, and `templateIntoDay`) · web export
clean · **deployed and verified live** — `entry-605337bb…js` matches the build.

✅ **Migrations 0117 and 0118 APPLIED 2026-08-06** — `supabase/apply/pending-0117-0118.sql`, one paste.
The deploy carrying the client half had already gone out, so between 2026-08-05 and this apply the live
site was serving the "app shipped, DB stale" arm of 0118's rename: `media_url` against a column still
named `photo_url` → `42703` → `if (error) return []` → **an accomplishments screen that quietly said you
had none.** That window is closed.

⏳ **Still owed: the three run-time proofs.** Applying proves the bodies parsed; PL/pgSQL binds column
references when a button is pressed. Unverified: (1) a squad recap card opens the **session**, not the
post page · (2) a friend's recap shows their sets under a "shared with you" banner · (3) an
accomplishment saves with a photo and shows it on the detail. Until those are pressed, treat 0117–0118
as applied-but-unproven.

### 7. The app gets a native identity — bundle IDs, EAS build config, and over-the-air updates (2026-08-05, CONFIG — no migration)

**Nothing here is a feature. This is the plumbing that has to exist before a single native build can
start, and none of it existed.** The repo had no `eas.json` at all, and `app.json` carried no
`ios.bundleIdentifier` and no `android.package` — two fields that are required to build and, once
submitted, permanent. Both are now `com.qest4.forgelegacy`; the display name became **"Forge Legacy"**
(with the space); `buildNumber`/`versionCode` start at 1.

**`slug` was deliberately NOT touched.** It stays `ForgeLegacy`, because the slug is what ties this
project to **forgelegacy.expo.app** and to EAS project `c1cd8e3d…`. Renaming it for tidiness would have
moved the live web URL out from under the testers already using it.

**The web app is untouched by all of it, and that was checked rather than assumed.** The PWA's name, icon
and theme come from `public/manifest.json` and `src/app/+html.tsx` — both of which already said "Forge
Legacy" — so the native display-name change cannot reach the browser. Same domain, same localStorage: no
one is logged out, no home-screen icon changes. Verified after the fact by re-exporting web and reading
the title and manifest back out of `dist`.

**Environment variables now live in EAS, pointed at the SAME Supabase project** (`ucqbzoeouvwoyfnnmqoo`),
set plaintext across all three environments. This is the load-bearing decision behind "install the store
app, log in, and your history is there": a separate production Supabase project would have handed every
tester an empty app. The anon key is client-public already — it ships inlined in the web bundle — so
`plaintext` visibility is honest rather than security theatre.

**`appVersionSource` is `local`, against the modern default, because a screen already depends on it.**
`account-settings.tsx` reads the build number from `Constants.expoConfig?.ios?.buildNumber`. Under remote
version management EAS writes that number into the native project and not back into the app config, so
the About footer would have rendered **"Build —"** on every device. The app was written expecting local
versioning; the config now matches the app instead of the app silently lying. Cost: the number is bumped
by hand before each submission.

**⚠ THE DEFECT THIS PASS FOUND, WHICH WAS NOT IN THE REQUEST.** `.easignore` **replaces** `.gitignore` —
it does not supplement it ("If you create a .easignore file, the EAS CLI prioritizes it over the
.gitignore file"). Ours was a single line, written for `eas deploy` so that the exported `dist/` would
actually upload — correct for that job, and quietly catastrophic for the other one that reads the same
file. The first `eas build` would have uploaded **node_modules (646 MB)** and **design_reference
(254 MB)** to the build servers. Rewritten to repeat every `.gitignore` rule and drop the authoring
folders (`Docs/`, `Programs/`, `design_reference/`, `ds-bundle/` — verified by grep that nothing under
`src/` imports them), while leaving `dist/` uploadable so the web deploy keeps working. A native build
still carries `dist/` (~73 MB); that is waste, not breakage, and keeping the live site's assets was worth
more than the megabytes.

**Over-the-air updates added** (`expo-updates` + `eas update:configure`), which closes a gap that would
have been felt immediately: without it, every fix — including a one-line copy change — costs a new store
build and a new review. Update channels are wired to the `development`/`preview`/`production` profiles.

**`runtimeVersion` is `fingerprint`, not the `appVersion` that `update:configure` wrote.** The
`appVersion` policy trusts the developer to remember that a given change touched the native runtime; when
that memory fails, an OTA update reaches a build whose native side cannot run it and the app crashes on
launch **for everyone who already installed it**. `fingerprint` hashes the native inputs and simply does
not serve a mismatched update — the old build keeps running the last bundle that worked. It costs more
native builds, which is the correct thing to pay for. `update:configure` also wrote a **doubled**
`android.permissions` array (12 entries, 6 unique); deduped.

**Gates:** tsc **0** · **996 `node --test` green** · `expo export --platform web` clean, PWA title and
manifest verified unchanged in the output.

**Explicitly NOT done, so the board does not read as further along than it is:** no build has been run,
no Apple Developer or Google Play account exists yet, and `submit.production` in `eas.json` is an empty
object awaiting the Apple credentials. Privacy-policy URL, support URL, store screenshots, and the
privacy-nutrition disclosures are all still outstanding — see § Next Milestones.

### 8. The Forge template library: 6 day-sessions → 81, and the shelf that could no longer be a list (2026-08-05, CODE — no migration)

**PO request: a day-workout template for each common split, for the gym and for home, at three levels,
male and female, with cardio where it fits.** Seven focuses — push · pull · legs · arms · chest-triceps ·
back-biceps · glutes — across two venues and three levels, tracked for men and women, minus the men's
glute day nobody asked for. **75 authored + the 6 that already shipped = 81 definitions, 579 exercise
rows, 240 distinct catalogue exercises, 29 ending in a conditioning block.** Content authored by seven
parallel agents, one per coherent slice, against a pre-filtered catalogue extract so no agent typed an id
from memory.

**The six originals keep their ids.** `push-day`, `pull-day` and `leg-day` are now the gym/Intermediate
men's cells of the grid rather than one-offs, so their DISPLAY NAMES gained "— Intermediate". Renaming a
definition is safe where renumbering an id would not be: `adoptStarterTemplate` snapshots the name into
the athlete's row, so a copy taken yesterday keeps the name it was taken under and only the shelf changes.

**⚠ THE DEFECT THIS PASS FOUND, WHICH WAS NOT IN THE REQUEST.** `schemeText` renders a cooldown row with
`targetReps >= 30` as SECONDS — "2 × 30s" — so a 45-second stretch *looks* authorable as `targetReps: 45`.
That convention exists **only on the preview surfaces** (the starter preview, W-27, program share).
`workout.tsx` renders `{targetReps} Reps` flat, so the athlete who actually starts the session is asked
for **forty-five pigeon stretches**. The authoring brief had explicitly permitted this, and the agents
used it: **24 rows across 24 templates were disguised timed holds.** All 24 removed; every affected
template still carries 6+ movements. `definitions.test.mjs` now fails any strength row at `targetReps >= 30`,
which is the guard the old file header had *asserted* ("a strength row cannot express a hold") without
enforcing. A template genuinely cannot express a hold — the session model has `targetSec`, but
`TemplateExercise` is the layer that would need to carry it.

**A cardio finisher round-trips, and only via `targetMi`.** `cardioExercise` reads `targetMi` and does not
read `targetDurationSec`, so a duration target would be stored, carried into the athlete's row on adopt,
and silently dropped on the way into the session. The test rejects one, and checks every cardio row's name
against the real `deriveName` rather than a copy of it.

**`venue` is authored, not derived.** `equipment.json` tags the BARBELL as available in a "Home Gym",
which is true of a home gym and false of a home — a session opening with a loaded back squat is not a home
session for someone training in a bedroom. `HOME_EQUIPMENT` (bodyweight · dumbbell · band · kettlebell ·
suspension trainer · medicine ball) is the product answer, and the test holds every home row to it against
the catalogue so the two cannot drift.

**The shelf stopped being a list.** "From Forge" on W-26 sat ABOVE the athlete's own templates, so 81 cards
would have buried the list they came for. It now samples **one per focus (4), matched to profile sex**, and
links to a new **`/forge-templates`** browse screen — filters for focus · venue · level · track, sticky
through eighty cards, adopted ones shown greyed rather than missing (an index with holes is worse than one
that says "you have this"). The audience filter is a DEFAULT, not a gate: it opens on the athlete's sex, and
**`'unspecified'` opens on everything**, because the profile model's standing rule is that an unset sex is
never quietly read as male. `/forge-templates` is **declared in `_layout.tsx`** — a route here is gated by
being declared, not by existing.

**Structural change:** `starter-templates/` split into `core.ts` (types + selection rules, no JSON) and
`index.ts` (binds `definitions.json`), because `node --test` rejects a plain JSON import and a test that
imported the wired module would have failed on the import rather than on anything it checked. Same split,
same reason, as `templates-live.ts` → `template-format.ts`. Preview screen also fixed: a cardio row used to
render as "Bodyweight" and "1 × 1"; it now states its ground and its distance, and home previews list the
kit the session assumes.

**➕ SAME-DAY FOLLOW-UP, from PO testing.** (a) **Discover listed programs only**, so the 81 sessions
were reachable from exactly one place — the Templates hub, behind "Browse all". Discover now carries a
**Single Sessions** row. (b) **TWO WHITE-SCREEN CRASHES on Program Detail**, the same shape and neither
related to templates. `sourceDefinitionId` is NULL for a self-built program (`createProgram` inserts
none), and the line read `previewDef!.id` — but an OWNED program reaches it with `previewDef` null,
since `previewDef` resolves only for a non-UUID id. **Every program built in the Program Builder
crashed its own screen.** Second: the "Working from" block renders whenever a program prescribes
percentages — true of three shipped programs since 0111, though its own comment still claimed "no
shipped program today" — and its Change row mounted `LiftMaxSheet` with `program!.id` on a PREVIEW,
which has no row. Change is now owned-only, which is also the honest rule: a max is frozen onto a RUN
at the gate, and a preview has no run to freeze it onto. ⚠ **A production export has no error boundary,
so both surfaced as a blank white screen with no message** — worth its own fix.

✅ **AND THE BLOCKER THIS PASS SURFACED, NOW CLEARED: migrations 0109–0116 were applied 2026-08-05.**
The library shipped into a database that had never seen 0115, so `workout_templates.source_definition_id`
did not exist and `adoptStarterTemplate` threw its explicit 42703 guard on every "Add to My Templates"
tap — browsing and previewing worked, adoption did not. **The first apply attempt failed** on 0109 with
`42P13: cannot change return type of existing function`: it used `create or replace` on the belief that
the live `notification_events()` matched 0092's shape, and it did not. `create or replace` cannot change
a return type — the revised bundle DROPs first, which cannot fail that way whatever shape is really
there. Order mattered too: 0110 rebuilds all three notification functions from 0109's body plus one
branch, so running it first would have re-dropped the friend branches 0088 and 0092 each lost silently.
All eight artefacts verified present after the run.

**Gates:** tsc 0 · lint at baseline (1 pre-existing error, 13 warnings — none in the touched files) ·
**994 `node --test` green**, 22 of them in `definitions.test.mjs` (was 10). No migration — starter
templates are shipped definitions, and `0115` (`source_definition_id`) already carries adoption.

### 9. PO training-session feedback, batch 2 — and three of the eight were not what they looked like (2026-08-04, CODE + migrations 0112–0115) — ✅ APPLIED 2026-08-05

**Eight items from a live session. One was retracted by the PO on investigation** — the squad video
check-in *does* expire after 24h (`squad-live.ts` filters on `created_at >= now − 24h` and refetches on
focus). That leaves seven, and looking at three of them changed what they were:

- **Supersets already worked, and already took 3+ exercises.** `makeSuperset` has no cap and the ⋮ menu
  offers "Add the next exercise to it". What was missing was the entry path the PO went looking for:
  building as you go, "these three are a superset" is known at PICK time, and the ⋮ route meant adding
  three lifts and then restating a decision already made, one pairing at a time. The Picker already
  multi-selected and already handed back a LIST, so this cost one optional field on the inbox
  (`group?: 'superset'`), a toggle in the confirm bar, and one existing `makeSuperset` call in the drain.
- **"End workout" had no confirmation anywhere in its path.** `endFromOptions` called `finishToSeal()`
  on one tap, from a menu opened to do something else, two rows under "Add an exercise" — and the seal
  is irreversible (EL-D6). Now a `ConfirmSheet` that states the cost in numbers: *"You've logged 2 of 4
  sets."* The primary "Finish Workout" button is deliberately NOT confirmed — it only appears once every
  set is logged, so there is nothing left to lose.
- **Name search was never a new decision. It was an unapplied one.**
  `Identity-Amendment-001-Username.md` §4 has specified name+handle search — with its ranking (§4.2),
  row format (§4.3), empty state (§4.4) and no-results copy (§4.5) — since before SOC-D15 narrowed
  discovery to one exact handle. Two LOCKED documents disagreed and **the narrower won by being the one
  that got built**. `Social-Architecture-Amendment-003` settles it for Identity and restates SOC-D15's
  never-list, which is unchanged: no PYMK, no suggestions, no ranking by popularity, nothing for an
  empty query.

**Also shipped.** The Set Input Sheet **raises the keyboard on the tap that asked for it** — `SetField`
had `selectTextOnFocus` set and no ref, so every logged set cost a second tap on the input the athlete
had already pointed at. **M-2 moved to Legacy**: the forged-medallion `HonorCeremony` was built, wired
into `CeremonyProvider`, mounted app-wide, and enqueued **nowhere outside the dev harness** — an honor
got one line of text on the Seal screen. It now fires on the tab W-17 already navigates to, alongside
the rank-up that has used that exact pattern for weeks. **A sealed session can be shared to Friends**
(`Social-Architecture-Amendment-002`) — the post type, the table, the column and the audience all
existed; `friends_feed()` simply never selected `workout_summary`, so a recap arrived with its stats
stripped. **Forge ships six starter templates** (`W26-Amendment-001`) as adopted copies, mirroring
`adoptCatalogProgram` — so a new athlete's first Templates screen is six ready sessions instead of an
empty panel under a heading that promised templates, and `Forge Strength Start`'s "or one built by
Forge" becomes true.

**Verified:** `tsc` clean · lint at baseline (1 pre-existing error, 13 warnings, none in changed files) ·
**989 `node --test` green** (+10 new: a starter-template validator that resolves every `catalogKey`
against the real 794-exercise catalogue, because a typo'd key survives tsc, lint and every other test in
this repo and fails only when a brand-new athlete taps the first thing Forge offered them) · web export
clean, all ten new strings present in the bundle.

**⚠ Migrations 0112–0115 NOT YET APPLIED** — bundled at `supabase/apply/pending-0112-0115.sql`. Three of
the four redefine functions, and PL/pgSQL binds column references at RUN time, so applying proves the
bodies parsed and nothing more. Each has a button to press: land on Legacy after earning an honor (0112);
post a recap to Friends and look for the stats strip, not the bare bronze card (0113); **type `%` into
Add Friend and get "No athletes found" rather than every athlete alive** (0114, the escaping test); adopt
a starter, train it, and see "Times used 1" (0115, which is what proves `save_workout`'s ownership check
passed). Until applied, the app degrades honestly rather than silently: the ceremony doesn't fire, a
recap renders as a milestone card, search reports the real error instead of "no athletes found", and
adopting a starter names the missing migration.

**One more, found by the PO the same day and fixed immediately (CODE only, no migration).** **The
Accomplishments section on Legacy hid itself when empty, and every route into `/accomplishments` was
inside it** — the "View all" action, a card tap, and a pinned-item tap, all three. So an athlete with
zero accomplishments had no door to the screen where you add one: **you needed an accomplishment to add
an accomplishment.** Found by the PO looking for somewhere to record a deadlift he hit months ago, which
is precisely the case L-12 exists for — an accomplishment takes any date, and most of an athlete's best
work predates the app. The section now keeps its header and offers a real invitation ("Add what you've
already done"), with the action reading **Add** instead of **View all** when there is nothing yet.
**Honors below it still hides when empty, deliberately** — the two are not symmetrical: an honor is
earned and cannot be authored, so an empty honors section would be a list of things you haven't done,
which is the same reasoning that keeps the honor-catalogue screen unbuilt.

**Recorded, not fixed:** `profiles_read` is `create policy … using (true)` (0001), so the new
`discoverable` toggle is **advisory UX, not enforcement** — any client with the anon key can already page
the profile table through PostgREST. Its copy must say "hide me from name search" and never an absolute.
Narrowing that policy is its own ruling and is listed in the amendment's open items.

### 10. A program can be loaded from a tested max — and Squat Ascent, the first one that is (2026-08-03, CODE + migration 0111) — ✅ APPLIED

**The prescription model had no load field of any kind.** Sets, reps, per-set ladders, timed work and
circuits — but nothing that could say *"at 75%"*. A peaking block could only be stored as "5 × 5": the
same shape as the session with the training taken out. Governing doc:
`Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`.

**What was added.** `percentOfMax` / `percentScheme` / `percentOf` on a prescription — all optional, all
inside `programs.structure` (jsonb), so **no shipped program changed meaning**. `percentOf` names the
REFERENCE lift, because real programs say *"front squat at 45% **of back squat max**"*, and a model that
assumed otherwise would put a materially wrong bar in front of an athlete with full confidence.
Migration **0111**: `athlete_lift_maxes` (what you currently lift) and `programs.lift_maxes` (what THIS
RUN was built from, frozen at the gate). Two stores because they answer different questions — a PR in
week 2 raising every remaining prescription would land the week-4 rehearsal somewhere the program never
intended. A **max-entry gate on Start** (type it, or give a hard set you remember — the second route is
the one that matters, since most people have never tested a single and it needs no logged history).
Resolved load on the Program Detail day list and in the logger's **Target** column.

**Two defects the tests caught before anyone ran it.** (a) Epley is `w × (1 + r/30)`, so at ONE rep it
**inflates a true single by 3.3%** — "315 for 1" would have been recorded as **326**, a number the athlete
has never lifted, with a month of percentages computed off it. Singles now go in verbatim. (b) Squat
Ascent asked for **five** maxes, including a "Tempo Squat max" and a "Pause Squat max" — nobody tests
those. They are variations and borrow the back squat's number; the gate asks for three. Both have
regression tests.

**Two things that needed no code.** "Changing your max never touches a finished session" fell out of
`buildLog`, which already draws a completed day from what was LOGGED and a future day from the
PRESCRIPTION — percentages resolve at render. And `targetWeight` sits **beside** `weight`, never in it:
seeding the logged weight from a target would record a lift nobody made the moment a session was
finished without touching a set, and could announce a PR for it.

**Squat Ascent Intermediate** — 4 weeks, 5 days, 20 sessions, the squat in every one. Peak climbs
**78 → 85 → 93 → 100%** while volume peaks in week 2 and falls into a rehearsal at 93% five days before
the test; both properties are asserted, not just intended. Method analysed from a publicly-posted
training month; **structure, prescriptions, session names and copy are original and none of the source's
are reproduced** — provenance written down in its Design Record rather than left to memory. The tempo day
needed no rule bent: `barbell-tempo-squat` and `barbell-pause-squat` are already real catalog exercises.
The source's athlete's-choice and density days are **deliberately not authored** — the model cannot
express either, and authoring them in a shape the app renders wrongly is worse than leaving them out.

**⚠ The migration ledger is now non-sequential.** **0111 is APPLIED while 0109 and 0110 are still
pending.** That is safe — 0111 only creates a new table and adds a column to `programs`, and depends on
neither — but its own header says "RUN AFTER 0110", which is no longer what happened. Apply 0109 and 0110
when their features are verified.

**Still open before this capability is finished** (§7 + §10 of the governing doc): a **notes field does
not exist** anywhere in the runtime prescription model, deliberately — which means PAS-D3's
RPE-in-notes accommodation is not implementable in the built app either; no "choose one of N" concept;
and the AMRAP block counts rounds of a circuit rather than sets of a single lift. **Not built on
purpose:** estimate-from-logged-workouts (the remembered-set route covers it and works with no history)
and automatic test-day capture (a test day must be *marked* by a program, and none marks one — building a
detector for a flag nothing writes is the exact defect the 2026-08-01 audit named).

Gate: **tsc 0 · eslint at baseline (1 pre-existing error, 13 warnings) · 955 `node --test` green · web
export clean · deployed and verified live** (live `entry-95187cbe…js` matches the build). Commit `35a341e`.

### 11. Iron & Engine, and the two things "share a program" can mean (2026-08-03, CODE + migration 0110) — ✅ APPLIED 2026-08-05

**A. The catalog could not express its own conditioning.** `ExercisePrescription` held `sets × reps` and
nothing else, and `structureFromDefinition` — the ONLY path from a built-in program to a runnable one —
copied four fields and dropped the rest. The athlete-program model had grown ladders, timed work,
circuits, AMRAPs and cardio bouts; the CATALOG model never did. **So any program whose identity involves
a finisher, a wave or a row erg could be built by an athlete in the builder and could not be shipped by
us.** Extended additively (every new field mirrors one already on `ProgramExercise`, same name, same
meaning); both Foundation programs set none of them and read unchanged. No migration — a catalog program
reaches the database only through `programs.structure`, which is jsonb.

**B. Iron & Engine — the first Forge-original program, and the first hybrid.** 6 weeks · **6 days** · 36
sessions · 18 workouts · 3 blocks · **Advanced**. IRON is four primaries that never change (squat ·
bench · pull-up · deadlift) waving `4×6 → 6-6-4-4 → 5-5-3-3`; ENGINE is a bounded finisher on every
session, converting to steady-state erg work in weeks 5–6 precisely where fatigue is highest. Authored
to `Forge-Program-Production-Standard` with its Design Record and Lock Record
(`Programs/Conditioning/Iron and Engine/`).

> **The six-day week is four IRON days + two ENGINE days, and that is load-bearing.** The PO asked for
> 6 days after the program was first authored at 4. It was NOT scaled up: each primary is still trained
> **once a week** — the two added days (C · Engine: Intervals, F · Engine: Long) carry no barbell
> primary at all, and the IRON days dropped an accessory each to fit. Six heavy days on top of six
> finishers is a program almost nobody completes, and the Standard is explicit about which side of that
> Forge takes. Difficulty moved Intermediate → **Advanced**; the Coaching Audit was re-run at six days
> and now names the single rest day as the program's headline risk, with the mitigations and the
> residual risk both written down. The acceptance test asserts the 4+2 shape and that no primary is
> trained twice in a week — the tempting future edit is to give C and F a barbell primary, which would
> break recovery without changing a rep count.

> **⚠ It is NOT the purchased Bridger Logan program of the same name.** That one stays personal-only,
> outside `src/`, per its own README — shipping a bought program's prescription as a Forge built-in is
> republishing someone else's paid product. **Nothing here is derived from it**: not a session, not a
> scheme, not an exercise order. The PO chose "a Forge-original hybrid" when asked.
>
> **It ships un-LOCKED and says so.** Production-Standard phases 1–8 are complete and written down;
> phase 9 is PO Lock Approval, which this repo cannot sign for itself. The acceptance test asserts the
> status string, so promoting it to `LOCKED` without signing the Lock Record fails the build. **8 of 9
> compliance rows met** — Coaching Notes is not, because `ProgramExercise` has nowhere to put one and a
> field that gets dropped in adoption is worse than an honest gap.

**C. `ShareSheet`'s primary button was a lie, and it was on every ceremony.** `onForgeShare` flashed
"Shared to Squad" on a 900ms timer and inserted nothing. Every "Share …" secondary in the app — rank-up,
honor earned, goal achieved, program graduated — ended there and told the athlete their squad had seen
it. `share-config.tsx` had already made these exact two destinations real for transformation photos;
this applies that fix to the surface everything else goes through (`addSquadPost` / `createFriendPost`,
with a squad picker and a real failure path). **Removed rather than repaired:** Community (no such pillar
in this build) and "Copy link" (flashed "Link copied", copied nothing — there are no public URLs).

**D. Two share verbs, because they are two acts.** Program Detail gains **Share Card** (a keepsake, now
reachable any time rather than only from the graduation ceremony) and **Send Program** (`/send-program`)
— which hands over the PLAN. Migration **0110**: `program_shares` carrying a **snapshot** of the
structure, never a reference, so the sender editing or deleting their copy cannot rewrite or delete a
plan somebody else is running. Recipients are friends and squad-mates only (no send-by-handle — that is
an unsolicited payload from a stranger). Declining DELETES the row, 0073's erasure rule. New
`program_shared` notification kind, wired through `/inbox` to a full read-before-you-take-it screen.

**⚠ 0110 rebuilds `notification_events()` again** (a `share_id` column, so `42P13` forces drop-and-
rebuild — the same step that lost the friend branches twice). It is rebuilt from **0109's** body with all
eight branches numbered in comments.

**E. Percentage loading crosses too.** Another session's work synced into this tree mid-build
(migration **0111**, `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`, `percent-max.ts`) adding
`percentOfMax` / `percentScheme` / `percentOf` to the athlete-program model. They were not on the catalog
model or in the crossing — the identical hole, one day old. Carried through and tested before any
catalog program prescribes a percentage. `accept_program_share` deliberately does **not** copy
`programs.lift_maxes`: the sender's tested max is not the recipient's, and inheriting it would load every
percentage in the plan off somebody else's one-rep max.

**⚠ MIGRATION NUMBERING:** 0110 (this work) and **0111 (the other session's, already on disk)** were
authored independently. They do not conflict — 0111 touches no notification function — and they are
order-independent. But **0111 was numbered as though 0110 existed when it did not**, so confirm both are
applied and in which order.

**Gates:** tsc 0 · eslint at baseline, clean on every touched surface · `expo export --platform web`
clean · **934/934 tests**, including a new acceptance gate that actually covers the new program (the old
one hardcoded two definitions and validated neither of the new ones). Two intermediate runs showed
transient failures in files that passed in isolation and on re-run — consistent with OneDrive rewriting
files mid-run while the other session synced in, not with a defect.

### 12. Two tester reports on the friend loop (2026-08-03, CODE + migration 0109) — ✅ APPLIED 2026-08-05

Both from the first outside tester pair, and they are the two halves of the same journey — finding a person, and being told a person found you.

**A. A friend request notified nobody (migration `0109`).** The recipient's notification tab was empty
while the request sat PENDING in `friendships`. The client was never at fault: `/inbox` has worded,
glyphed and routed `friend_request` / `friend_accepted` since 0073. **The server stopped emitting them.**
0088 needed a `challenge_id` column, and a return-type change is `42P13` under `create or replace`, so it
dropped and rebuilt `notification_events()` — **from the 0054 body, which predates friends.** Both
branches vanished with no error, no failed test and no symptom, because squad notifications kept working.
0092 then rebuilt again for `invite_id` and its own comment locked it in: *"Identical to 0088 apart from
the new branch and column."* It was — including the omission. The bell badge was wrong for the same
reason (`notification_unread_count` reads the same union). Restored, with a `comment on function`
warning the next rebuild to copy from the current body. **Same family as F1/0098:** a surface confidently
reporting on a source that no longer said anything.

**B. A found athlete wasn't a person you could open** (`/add-friend`). Reported as *"it just says send
them a request but doesn't let me view their profile."* Accurate: a resolved handle produced one grey
sentence and an armed Add button, with the athlete's name only inside the sentence and nothing tappable —
so confirming you'd found the right account meant sending a request and seeing. Every other list on that
screen is rows that open `/athlete/[id]`; the search result, the one row you went there for, was the
exception. Now a row like the rest (face · name · handle · rank → profile). Add is unchanged.

**Apply:** `supabase/migrations/0109_restore_friend_notifications.sql`, SQL editor. Verify by having a
second account request you — the bell should count it and `/inbox` should show it.

### 13. The playlist link — an amendment that was LOCKED, merged, and built nowhere (2026-08-03, CODE + migration 0105) — ✅ APPLIED

**`Workout-Playlist-Amendment-001` was LOCKED in June 2026 and merged into four base specs** — W-9–W-16
§8.5, W-17 §8A, W-19 §9A and WSR-001 — each with its own wireframe, tap-target table and validation
checklist. `grep -ri playlist src/` returned **one line**, and it was a comment on W-19 reading
`· Playlist — no such data.` That comment was accurate. This is the data. (The recurring pattern
recorded in the Amendment Reconciliation Audit — *amendment locked but never applied* — again.)

**The design had it the whole time.** `Forge Activity Detail.dc.html` draws the row (`hasPlaylist`,
`playlistName`, `openPlaylist`); only the app was missing it.

**Built, all four in-scope surfaces (§2):**
- **W-9 §8.5** — "Attach a playlist" in the ⋯ Options menu, where the optional extras already live. Rides
  the session (so it survives a crash + resume via autosave) and lands on the row post-commit, the same
  best-effort path `partners` takes — a playlist can never cost a saved workout.
- **W-17 §8A** — attach / edit / remove in the Reflect step, saving immediately rather than on "Done"
  (§8A.2), optimistic with a **revert on failure**: a chip that outlives its failed write is worse than no
  chip. Authored to the app's language — the W-17 `.dc` has no playlist in it.
- **W-19 §9A** — read-only row between Trained With and Chapter, exactly where the `.dc` puts it, with the
  ↗ affordance rather than the chevron. Cover art omitted, not faked: §2 forbids any metadata fetch.
- **WSR-001 §6.3** — the chip on squad recap cards, snapshotted onto the post like every other recap field.

**The one security-relevant column in the app, and it is enforced in the database.** The squad card makes
this value **a tap target for somebody who did not type it** — so a service tag trusted from the client
would let any PostgREST caller render a chip labelled "Spotify Playlist" that opens anywhere. 0105's
`workouts_playlist_pair` CHECK requires the URL's host to *agree* with the service tag, defeating
`open.spotify.com.evil.com`, the `…@evil.com` userinfo trick, and http downgrades. **15 golden vectors,
duplicated verbatim between the migration's self-check and `playlist.test.mjs`**, so SQL and TypeScript
can only drift through a deliberate edit to both. Same test 0104 applied and answered the other way.

**The columns are read in their own tolerant query, never the main select** — a column PostgREST cannot
find is a `42703` that fails the *whole* statement, and naming them inline would have taken W-17 down
entirely on any database where 0105 hadn't run. Follows the `partners`/0016 precedent exactly.

**Verification:** tsc 0 · lint at baseline (1 pre-existing error, 13 warnings — none new) · **819/819
`node --test` green**, 13 of them new.

**The self-check earned its place on the way in.** 0105's first apply **failed loudly and rolled the whole
bundle back**: `expected accepted=f, got t` on the vector *url with no service*. A `CHECK` constraint
rejects a row only when its expression is explicitly FALSE — an expression evaluating to **NULL passes** —
and with a null service tag the disjunction came out NULL, so a half-written link was legal. The
TypeScript twin never had the bug (JS has no third truth value). Two fixes: the explicit `is not null`
arm, and the probe now applies **`pg_get_constraintdef`** of the installed constraint instead of a
hand-typed copy — the copy had inherited the same bug, so probe and constraint agreed while both were
wrong, and only the EXPECTED column caught it. Re-proved against all 15 vectors under real three-valued
logic before re-handing it over. **Nothing reached live data at any point.**

### 14. A program can finally graduate (2026-08-03, CODE + migration 0104) — ✅ APPLIED

**Nothing in this app or this database had ever written `programs.state = 'graduated'.`** Found while
answering "is sharing a program live?" — it is not, and neither was the thing underneath it. The only
client call was `endProgram(id, 'ended_early')`; the only SQL writing the column was 0017, which sets
`active` and `ended_early`. Every other mention of `'graduated'` across 103 migrations is a **read**.

**What that cost, all of it live until now:**
- `programs_graduated` was permanently **0 for every athlete** — so the five Programs honors (0099) were
  rows in a catalog waiting on a number that never moved.
- `programGraduations` gated the rank ladder at Architect and above, so **nobody could pass Craftsman** —
  program athletes included. Yesterday's self-directed blocks were, unknowingly, the *only* working route
  past it.
- The M-4 ceremony — locked copy, queue priority, share plumbing — was fully built and reachable **only
  from a dev harness**. W-17 never consumed the ceremony queue at all.
- `PROGRAM_GRADUATED` timeline events were never written, though the read side renders them correctly.

**Two live violations of the same LOCKED amendment sat in the same code.** `start_program` never checked
the current state, so W-3's "Run Again" on a finished program **reactivated the sealed record** — against
Amendment-001 §1, *"A Graduated program cannot be reactivated… History cannot be rewritten."* And Delete
was offered in every state, against §6, *"may never be deleted."*

**The spec already decided the design**, so none of it was invented: Amendment-001 §4 (*"graduates when
the athlete logs the final scheduled workout"* — automatic, never manual) and M4-D1 (*"at session save…
atomic with workout log persistence"*). Graduation happens inside `save_workout`, **before** the
`evaluate_honors` call — `honor_metrics` is `stable`, so it reads the snapshot after the UPDATE; written
after instead, the five Programs honors would each fire one workout late, forever.

**The rule now exists twice, and that is the interesting cost.** `program_total_sessions(jsonb)` is a
transliteration of `totalSessions`/`weekSizes`. It has to be — a client-supplied "this was my last
session" flag would let anyone assert five permanent honors and a rank family, and a stored
`sessions_total` column was rejected on 0098's own precedent about derived counts that drift. **The
mitigation is that the drift is loud, not that it is impossible:** eight golden vectors are duplicated
verbatim into `progress-core.test.mjs` *and* into a `do $$` self-check that aborts the migration on the
first mismatch, plus a VERIFY query that prints the SQL total beside what W-3 prints.

**The plan's formula was stale and would have shipped wrong.** It said `weeks × sessionsPerWeek`;
`progress-core.ts` had since moved to ragged weeks (`scheduleSlots`), so the SQL is a **sum over each
week's own built-day count**. Caught by reading the file rather than the plan.

**And the first transcription of `save_workout` was wrong in ~15 places** — camelCase JSON keys where the
client sends snake_case, `name` for `workout_name`, `security definer` for `invoker`, a missing
`weight_unit` column. That would have broken **every workout save for every athlete**. Caught by diffing
against 0097 rather than trusting the transcription; the committed version is 0097's body byte-for-byte
with exactly one block added and one return line changed (verified by diff — zero deletions).

**Also fixed:** `programs_one_per_source` **narrowed** rather than dropped, to live states only — 0019's
intent was "don't fork a second LIVE copy", and sealed records accumulate; this also closes yesterday's
noted defect that re-running a program *lost* credit. `adoptCatalogProgram` now resumes only a live copy
(mandatory: `.maybeSingle()` throws on >1 row). A `runProgramAgain` path creates a new Future row keeping
`source_definition_id`, so `distinctProgramCount` reads two graduations of one plan as 2 total / 1
distinct. `programs_owner_delete` gained a state predicate. Home's `builtProgram` fell back to
`myPrograms[0]` — newest-first, i.e. the program that just sealed — and would have offered Day A of a
finished program; now falls back to `future`, else null. `mergeCeremonies` dedupes on the id that
`CeremonyBase` always documented as the dedupe key and nothing ever used.

**Deliberately not built:** M4-D4's deferred ceremony delivery (a durable outbox is its own feature; the
~1s window loses only the modal, never the record) · W-17's own "Program Complete" summary state · W-3's
"What's Next" successor card · any manual graduation affordance — every path that can write `graduated`
is a path that can inflate a permanent honor, which is why `endProgram` was narrowed to `'ended_early'`.

**Verified so far:** `tsc` 0 · **803 `node --test` green** (+52) · `eslint src` at baseline (1 pre-existing
error, 13 warnings). **The migration has NOT been applied and none of the SQL has run** — it carries two
self-checks that abort it on failure, a pre-migration dry run in its header, and a four-step VERIFY
footer. Until it is applied, nothing above is true in the database.

### 15. Self-directed training blocks — the freestyle athlete can climb the whole ladder (2026-08-02, CODE + RCM Amendment 002)

**An athlete who trains day to day and never builds a program could not progress past Craftsman. Ever.**
`programGraduations` was a hard gate at Architect (1), Established (3), Legend (6) and Legacy (10) — so no
quantity of training, no span of years, no sealed chapters and no depth of improvement produced a promotion.
The ceiling was absolute and permanent. This is the same "you don't have a program yet" defect closed on Home
this session, sitting in the permanent record instead of in the copy.

**Two LOCKED documents already disagreed with the shipped behaviour.** RSA §15's Craftsman identity test
reads *"Structured development — meaningful engagement with training structure through programs **or
deliberate programming**"* — a disjunction in the locked architecture whose right branch was never
implemented. RS-D8: *"Programs are major development signals, **not universal gates**… not required at every
rank transition."* The engine required them at four of six transitions. **The RCM is the computational layer
for the RSA and had overshot the architecture it computes — so this shipped as a reconciliation, not a
relaxation.**

**The rule.** A *qualifying week* is a Mon–Sun week with meaningful work on **≥3 distinct days**. A **block**
is **6 qualifying weeks inside any 8 consecutive calendar weeks**, non-overlapping. One block satisfies as
much of the requirement as one graduation. `6 × 3` is calibrated to the shipped catalogue, not invented —
both authored programs are 6 weeks at 3–4/week — so parity is measured against what a graduation actually is
here. **No threshold value moved anywhere.**

**THE WINDOW IS THE WHOLE DESIGN, and the first draft was wrong.** Six *consecutive* weeks was the obvious
rule and fails three ways: it zeroes five weeks of work for one week of flu; it punishes the deload week that
real programs *contain* (5×/week with one light week earned nothing across 11 weeks and 51 sessions, while a
flat 3×/week athlete earned a block); and — decisively — **it is a streak.** "One miss resets" is a forward
counter the athlete must protect, the pattern DNA §10 prohibits and CAL-D19 narrowed only for a
backward-looking view that *"feeds no progression."* Two tolerated weeks in eight means **there is no state
that can be broken** — a gap costs nothing recoverable, the scan re-anchors. That absence, not the copy, is
what keeps this outside the prohibition.

**The honors firewall, which is the part that could not be got wrong.** `honor_metrics()` computes
`programs_graduated` as a live `count(*)` over graduated `programs` rows, and `first_program_graduated` /
`programs_graduated_5|10|25|50` fire off it. Blocks are a **separate `RankSignals` field combined at the gate
only** — never folded into the graduation count, no table, no column, nothing for that metric to be pointed
at. An athlete who reaches Legacy on 10 blocks holds **zero** program honors. Asserted by test: an honor is a
permanent claim about a specific act and, unlike a rank, cannot be quietly recomputed.

**Answering §14.11's "there are no substitute paths."** Read in full, the operative clause is *"exceeding a
threshold does not compensate for a deficit in another"* — a prohibition on **cross-row** compensation, which
this performs none of. The decisive precedent was already locked and shipped: CAL Q11's `effectiveAW =
native + 0.5 × imported` means one row **already** admits two kinds of evidence at different rates. §14.11 now
reads "no substitute paths **between rows**" and names both cases.

**RS-D18 could not be argued away, so it was fixed too.** Established's identity statement literally read
"Multiple graduated programs", and an athlete with zero graduations cannot honestly say it. Restated under
**R-D48** in the same change — it would be incoherent to firewall the honors path against a false permanent
claim and leave a false identity statement standing.

**Two bugs found and fixed in the same code.** (1) `distinctProgramGraduations` was set equal to the total on
a comment claiming no source-template column existed — `programs.source_definition_id` has existed since
migration 0019 and the honors evaluator already groups by it. The partial unique index makes the two counts
agree for *catalog* programs, so the old line was right by accident; it was wrong for athlete-**authored**
ones, where six rebuilds of one plan cleared the Legend "6 different programs" gate. (2) `refreshRank` fired
one ceremony per run, so a multi-family jump silently carried an athlete past the ranks between — violating
RS-D12, and turned from theoretical into likely by this change. Promotion is now clamped to **one family per
refresh**, walking the ladder with a ceremony each.

**Conceded in the amendment rather than papered over:** this is a genuine widening of what one cell admits
(acceptable only because rank never decreases); a 6-week program trained at ≥3 days/week earns a graduation
*and* a block; and at full parity programs barely accelerate any more — the PO was shown the half-credit
lever, mirroring `IMPORT_PRESTIGE_CREDIT`, and declined it.

**Verified:** `tsc` 0 · **747 `node --test` green** (+19) · `eslint src` at baseline (1 pre-existing error,
13 warnings). The screen⟺engine equivalence sweep now runs over **two** clearing baselines — program-earned
and freestyle-earned — because adding the new field to the old baseline alone would have asserted that
breaking nothing changes nothing. **The guard was checked empirically:** reverting the gate to the old rule
fails two tests; restoring it passes.

### 16. The athlete who never builds a program gets a Home of their own (2026-08-02, CODE)

**"There's going to be people that don't want to build a 4-week program and just go day to day"** (PO). Home
did not serve them. It told them what they lacked, withheld the one button they needed, took their goal away
as a side effect, and never showed them around.

**Four defects, one cause — Home read "no program" as "not finished yet."**

1. **"You don't have a program yet" — forever.** `awaiting` goes false the moment an athlete logs a session,
   so this was their permanent Home. It is the message [`Home-Screen-Wireframe-Spec-H1.md`](Docs/Home-Screen-Wireframe-Spec-H1.md)
   §6 forbids in those words — *"No placeholder. No 'no program' message"* — on a screen whose own failure
   list ends *"the screen communicates what the athlete has NOT done."*
2. **No Start Workout button.** H-1 Tier 3 is `Present When: **Always**`, *"never disabled"*, and for a
   program-less athlete routes to the Activity Type Picker — the "What are you training?" sheet Home already
   had. The card was guarded on a program existing, so the always-present CTA was absent for exactly the
   people who had nothing else.
3. **"Continue Workout" was unreachable for them.** `resumeSets` was computed on every focus and its only
   consumer was that same guarded card. An athlete with 12 autosaved sets got no resume offer on Home at all.
4. **Their goal tile vanished.** `ProgramMissionGrid` was guarded on the program's *name*, so one `&&` over a
   two-tile grid took the Mission tile with it. Mission reads live chapter goals and never depended on a
   program. Invisible precisely because nothing was drawn to notice.

**The data layer never agreed with any of this.** `save_workout` bumps `chapters.workout_count` and calls
`evaluate_honors` with no program filter; rank reads every saved workout regardless of `program_id`. A
freestyle session has always counted the same. Only the screen dissented.

**What it is now.** The starting-point question is asked **on arrival and never again**. Everyone past it
gets the hero, which wears three faces decided by a new pure module (`src/domain/home/composition.ts`):
`resume` (unfinished work — named and counted from the *session*, since there may be no program to name it),
`program` (unchanged), `open` ("Train Today · Nothing planned. Build it as you go."). A program is one quiet
line underneath — *"Want a plan? Build or browse programs →"* — not a card competing with training.

**Resume outranks a program day, and that precedence is load-bearing:** the logger reads a launch intent
landing on top of logged work as a conflict and prompts about it, so proposing the program day would walk the
athlete into a question they never asked.

**The tour excluded them too, and that is fixed here (ONB-A3-D8).** The 7-step Home walkthrough was owed only
to the `has-program` face — so a day-to-day athlete was never shown around Home, once, ever. `TourFace` is now
`'first-run' | 'settled'` and `planTour`'s input is `homeHasCards`; each earlier name (`gated`, then
`homeHasProgram`) was an approximation for *"there are cards to ring"*, which is the real dependency. **No new
filtering was needed** — `planTour` already drops unmounted anchors, so their run plans **6 of 7** and says 6.
The `home-workout` step's copy was rewritten state-neutral: it opened *"Your next session, already built"*,
which has no referent on a card reading "Train Today".

**Deliberately not built,** each blocked by a locked authority rather than by scope: a **streak** (DNA §10
bans streak pressure, narrowed only for a Calendar heat-map in CAL-D19; H-1 fails when *"numbers, streaks, or
comparisons appear alongside the chapter context"*), a **recent-workouts list** (`/activity-history` owns that
question), and **"repeat my last workout"** (templates *are* that feature, per `templates.tsx`).

**One latent bug fixed in passing:** `useQuery` starts at `data: null`, so the first frame of every cold load
already flashed "You don't have a program yet" before the chapter query settled. The composition treats the
loading frame as claiming nothing — except resume, which is local and therefore honestly knowable.

**FOLLOW-UP, same day — choosing is the answer.** The first cut read "settled" off the server as *has logged
a workout*, which is one beat after the athlete actually decides. PO caught the consequence: tap "Start a
freestyle workout", train, come back before saving, and Home showed the **Continue Workout** card with **"How
do you want to start?" printed underneath it** — the question asked again, directly over the evidence it had
been answered. Back out without logging a set and the tap was forgotten entirely. The three doors that LEAVE
the chooser (freestyle · build · browse) now record the choice locally (`program-intent.ts`, revived from
dead code that described a card which no longer exists), and Home is settled from that moment: same hero card
a program athlete gets, plus the quiet "Want a plan?" line. "Help me find one" deliberately records nothing —
it opens a stepper that lives on the same slot. Cleared by `resetFirstRunFlags()`, or the next account on the
device inherits the answer. A test asserts the two routes to settled — *chose* and *trained* — produce a
byte-identical composition.

**Verified:** `tsc` 0 · **751 `node --test` green** (+23 over the pre-session baseline: 18 composition, 4
autosave, 3 tour) · `eslint src` at baseline (1 pre-existing error, 13 warnings).

### 17. Home stops offering to find you a program it doesn't have (2026-08-02, CODE)

**The first card on a program-less Home read "Help me find one — a few questions, then a program picked for
where you are."** It then asked three: experience, primary goal, equipment. **Only one combination of those
answers reached a program authored for the goal given.** The catalog holds two programs, both Strength
Foundation, and `recommend-core.ts`'s map covers six goals — so muscle, endurance, fat loss, athletic and
health all fall through `FALLBACK_ID` to Strength Foundation I, as do every home-gym and bodyweight athlete
regardless of goal. **An athlete who answered *I want to run a 10k, bodyweight only* was handed a 3-day
barbell program.** This is the Biggest Blocker on this board — *programs 2 of 24* — reaching the surface.

**What changed.** The guided on-ramp is now conditional, and the slot it occupied offers **"Start a freestyle
workout"** instead (PO call). "Build my own" and "Or browse everything" are untouched — browsing a thin
catalog is honest, because you see what is there; a recommendation over it is not.

**The condition is derived, not a flag.** New `canRecommend(catalogIds)` in `recommend-core.ts` walks all 54
goal × experience × access combinations the intake can produce and asks whether each one's INTENDED program
is real — in the catalog, or deliberately aliased into it. **It could not be written in terms of
`resolveRecommendationId`**, whose own invariant ("always returns a real id") is satisfied *by* the fallback
and is therefore true even in the failing case. Reaching the fallback is precisely what it rules out. When
the Running, Conditioning, Muscle Building and Full Body families land, the on-ramp returns on its own — no
one has to remember it was switched off.

**Nothing was deleted.** The intake stepper, `ExperienceLevelCard`, the recommendation and its tests all
stand. `hasSuggestion` is gated on the same condition so an athlete carrying a level in local storage isn't
left looking at a recommendation reached by a door nobody can open; their answers are still stored and
return with it. The quiet "Or just train today" link is dropped only in the state where the chooser has
already promoted freestyle into the card slot — the same tap twice on one card is not two choices. The card
keeps opening the "What are you training?" sheet rather than starting lifts directly: with no program there
is no hero card, so this is the only door to a conditioning session on Home.

**Verified:** `tsc` 0 · **`node --test` green, +3 tests** on `canRecommend` (false on the real catalog; a
drop-one sweep proving no goal is optional; an alias counts as answered where the fallback does not — the
first draft of that sweep asserted the strength ids too and correctly failed) · `eslint src` at baseline
(1 pre-existing error, 13 warnings).

### 18. The tutorial that kept coming back — a lost-update race in the seen-set (2026-08-02, CODE)

**Reported as "the walkthroughs pop up again after I've already done them."** They did — and the cause was
neither the trigger logic nor the copy. It was that finishing one was sometimes never written down.

**The race.** `markPromptSeen` was an unserialized read-modify-write over ONE array holding all 28 surface
keys. Two marks overlapping — and they overlap routinely; Program Builder hosts two walkthroughs on a single
screen — interleave as read-`[]` / read-`[]` / write-`[a]` / write-`[b]`, and `a` is gone. **Nothing looks
wrong at the time**, because `TourProvider` holds its own in-memory set: both walkthroughs close normally and
neither reappears that session. The loss only surfaces on the NEXT LAUNCH, which is exactly why it read as
random and could never be reproduced on demand. Every operation now serializes through one promise chain
(`src/lib/screen-prompts-model.ts`, extracted on the `program-draft-model.ts` idiom so it is testable against
a fake store). **The suite includes a CONTROL test that runs the previous shape and asserts it still loses
writes** — if the fake store ever stops racing, the test proving the fix has quietly stopped proving anything.

**A second, worse failure mode removed rather than tested.** `screen-prompts.ts` carried its own hand-typed
copy of all 28 keys, kept in step with `ScreenTourKey` by discipline alone. A key present in the tour data but
absent from that validator is filtered out on every READ — so the surface records itself seen, reads back
unseen, and **fires its walkthrough on every visit, forever.** The list is now `Object.keys(SCREEN_TOURS)`:
one source, and the two cannot drift. (Checked before changing — the lists did match, so this closes a hazard
rather than a live defect.)

**Two PO decisions, both narrowing what "shown once" means:**

- **Reaching step two retires a surface.** Finishing and skipping are deliberate exits; *leaving* — tapping a
  card, hitting back, switching tabs — is neither, so the surface stayed owed and the walkthrough returned on
  every visit. Step two is the smallest unambiguous signal the athlete read step one and chose to continue;
  from there it counts as delivered however they leave. **Bailing on step one still keeps it owed**, which
  preserves the accidental-dismissal case, and display alone never retires anything. Recorded at that step
  rather than on unmount, so it survives the app being closed — and `started` latches the overlay open so
  recording it seen mid-walkthrough doesn't pull it out from under someone still reading.
- **"Skip all" → "Skip".** It has only ever retired the walkthrough in front of the athlete, which is correct
  and is what Amendment-003's own reasoning requires ("a walkthrough you were never offered cannot be one you
  declined"). The label was the only thing claiming otherwise, and anyone tapping it expecting silence met the
  other twenty-six surfaces. The genuine global off-switch is **Guided Tips in Account Settings**. Stale
  in-code references swept; Amendment-003 gains a §11 implementation-reconciliation note (PD-7) rather than an
  edit to its locked text.

**Verified:** `tsc` 0 · **704 `node --test` green** (+9, including the control) · `eslint src` at baseline
(1 pre-existing error, 13 warnings).

### 19. The Home gate is gone — full Home from the first launch (2026-08-02, CODE)

**Applying Onboarding-Amendment-002, not amending it.** A fresh athlete used to get a single-card takeover
until they chose a starting point. 002's own origin section names that as the defect it was written to
remove — *"First Home is a pure program funnel … a new athlete dead-ends at 'start a workout'"* — and
ONB-D13 already required the recommendation to be **"an offer, never a gate."** A full-screen takeover that
won't let you past until you answer is a gate however gently it asks. Another **locked but never applied**.

**Home is now full from the very first launch** — chapter, Your Circle, quick actions, Explore Forge — with
the starting-point question living IN it as a card where the Program | Mission grid will go. **"Help me find
one" and "Build my own" are preserved verbatim** (PO), as three states of one slot: chooser → intake stepper
→ recommendation, with "Or just train today" under all three. The freestyle athlete and the brand-new
athlete now get the same card, because they want the same thing.

**What the removal exposed, and what it cost:**

- **The tour's vocabulary was describing a gate.** `TourFace` was `'gated' | 'unlocked'` and `planTour` took
  `homeUnlocked`. Neither named anything real any more — and the Home leg never actually depended on a gate.
  It depends on whether the cards it rings **exist**, and three of its seven (Today's Workout, Current
  Program, Mission) appear only once there is a program. Now `'no-program' | 'has-program'` /
  `homeHasProgram`. **The two tour moments did not move; only their description did** (ONB-A3-D7).
- **The ceremony was claiming an unlock that no longer happens.** *"the full forge is open"* was true only
  while Home withheld itself. It now announces the honor and what actually changed — a program.
- **`FirstSessionCard` retired.** It was already unreachable: it keyed on `homeLevel === undefined`, a
  loading state `useQuery` never produces (it initialises `data` to `null`), and the gate was its only host.
  Went with `startFirst` and six orphaned styles.

Verified: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **695 `node --test` green** · clean
web export. Amendment 003 gains **ONB-A3-D7** and a validation checklist; ONB-A3-D5's table is restated.

### 20. The Squads cluster tutorialized — ten surfaces, 31 spotlit steps (2026-08-02, CODE)

Completes the third and last cluster. Where Workouts teaches mechanics and Legacy teaches ideas, **Squads
teaches a consent model** — one rule the screens genuinely never state out loud:

- **Nobody walks into a squad.** You're invited, or you ask and the owner approves. A public squad is
  *visible*, not *enterable* — the copy says so on the hub, in Discover, and on Preview.
- **The Performance Firewall lifts inside a squad and nowhere else.** Squad-mates see your numbers on the
  record board; a stranger never does. That is the whole privacy model in one sentence, and it had never
  been said to an athlete anywhere in the product.
- **Friendship is mutual and searched by handle.** No browsing, no following — a circle, not an audience
  (FR-D2/D3). Nothing posts itself, in a squad feed or a friends feed.
- **Check-ins are presence, not posts.** Two strips on one screen doing different jobs.
- **Favourites are per-device.** Starring here changes nothing on your other devices.

**Built:** Squads hub (5) · Squad Detail (6) · Discover (3) · Preview (3) · Settings (3) · Requests (2) ·
Records (2) · Composer (2) · Friends (3) · Add Friend (2).

**Friends' walkthrough existed and had never been rendered.** `SCREEN_TOURS.friends` was authored in the
first tour pass; no screen ever mounted it. It is now three spotlit steps and actually on screen — the
walkthrough existed, the line rendering it did not.

**Deliberately untutored, and why:** `create-squad`, `join-squad`, `squad-invite` and `squad-transfer` are
labelled forms and confirm flows that carry their own copy; `squad-recap` and `squad-post` are read-only. A
form that names its own fields does not need a tour, and adding one is noise.

Verified: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **695 `node --test` green, 2 new** ·
clean web export.

### 21. The Legacy cluster tutorialized — ten surfaces, 35 spotlit steps (2026-08-02, CODE)

Where Workouts is mechanics — which control does what — **Legacy is where the product's ideas live**, so
these walkthroughs explain concepts rather than buttons: what a chapter is, what sealing costs you, what you
choose versus what is chosen for you, and the difference between a thing you declare and a thing you earn.

**Ten walkthroughs:** hub (7) · Chapter Detail (5) · Goals (4) · Progress Hub (4) · Transformation (3) ·
Accomplishments (3) · Photos (2) · Timeline (2) · Honors (2) · Trophy Case (2). The hub's previous
walkthrough was three card-only steps; it is now seven spotlit ones.

**The non-obvious things they teach:**

- **Photos are created on a chapter and nowhere else** — which is exactly why the gallery has no add
  button. Someone will hunt for a `+` that was removed on purpose, so both ends now say so.
- **Transformation is not the photo gallery** — a pose-matched progress archive vs chapter albums. Two
  photo features, adjacent in "What Endures", doing different jobs.
- **Honors has no catalogue, deliberately** — a list of the unearned is a checklist, not a legacy.
- **Sealing is permanent** — outcomes freeze; memories can still be added. Enriching is allowed, rewriting
  isn't.
- **Accomplishments vs Honors** — one you write, one you earn.
- **The timeline has no filter or search, deliberately** — significance is carried in material, not labels.

**Two findings surfaced by the scan, logged rather than fixed** — see Decision Queue:

1. **`deriveFeatured` implements ~15% of a LOCKED spec.** `Featured-Legacy-Moment-Standards.md` v1.0 defines
   five tiers, nine event types, a 30-day active window and a fallback chain, and is cited by the PRD, the
   L-1 and L-2 specs, the MVP audit and the Transformation architecture. The code returns the most recent
   `CHAPTER_SEALED` and stops. **The card looks arbitrary because it is unfinished, not misnamed** — which is
   this project's recurring pattern (*locked but never applied*) in a new place.
2. **Three curation-shaped concepts, all locked, differently named** — Pinned Legacy (6, athlete-chosen),
   Featured Legacy Moment (1, system-derived), Featured on Profile (3, athlete-chosen). Two are called
   "Featured" and one of those can't be chosen. Both names are locked vocabulary with standards docs behind
   them, so a rename is an amendment, not a refactor. They never appear on the same screen, which is what
   makes teaching it viable in the meantime.

**The Featured step describes the APP, not the spec** — "the last chapter you sealed, chosen for you" — and a
test asserts it never promises the unbuilt tier system. Copy describing a system nobody has built is exactly
the failure the stale Workouts tour was guilty of, and it is now guarded against rather than merely avoided.

Verified: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **689 `node --test` green, 4 new** ·
clean web export.

### 22. The Workouts cluster tutorialized — seven surfaces, 28 spotlit steps (2026-08-02, CODE)

**The tab that fans out to the two largest screens in the app taught none of it.** Workouts had a two-card
walkthrough; Program Builder (2053 lines) and the live session (1890) had none, and neither did Program
Detail, the Exercise Library or Templates.

Worse, **those two cards described a screen that no longer existed**: they named "My Programs" (the segment
reads *My Workouts*) and pointed at a "Library" section that an earlier pass had split into **Your
Templates** and **Reference**. The tour had been teaching a layout refactored out from under it.

**Seven walkthroughs now, all spotlit:** Workouts (6) · Builder Setup (5) · Day Builder (4) · Active
Workout (5) · Program Detail (3) · Exercise Library (3) · Templates (2).

**What they teach is deliberately not where the buttons are.** Each list leads with a product decision the
screen cannot state about itself:

- **"Build a Workout" is not a builder** — it starts a freestyle session, because a template here is a
  session you ALREADY DID and kept (0091). Sound decision, invisible to the user, and the button name
  implies the opposite.
- **Track a Run vs Log a Run** — one measures as you go, one records one you already finished. The code
  comment says "two different things, deliberately both here"; the sheet said nothing.
- **"Repeat the same week" vs "Customize each week"** — the most consequential control in the builder, a
  radio pair whose effect (the list below becomes Workouts or Weeks) isn't visible until you scroll.
- **Warm-up and Cool-down optional, Main required** — Save silently refuses without a main exercise.
- **Target vs Actual** — log what you lifted, not what was planned.
- **End Program is not Delete** — one keeps everything you logged.

**`SpotlightStage` was extracted so `ScreenTour` can render its own.** Program Builder and the live session
are Stack screens presented OVER the tabs, so the shell-mounted overlay draws behind them — a spotlight
hosted there could never reach the screens that most need one. A screen rendering its own stage is correctly
layered for free, and `TourOverlay` shrank to the run's navigation and nothing else.

**Two decisions worth keeping:**

- **Workouts was REMOVED from `TOUR_COVERED`.** A completed tabs leg pre-marks the tabs it walked as seen —
  fair when the Workouts tour was two cards restating the tab step, wrong now that it is six steps teaching
  what the screen doesn't explain. Suppressing it meant the athletes who asked to be shown around were the
  only ones who never saw it.
- **Anchors release by IDENTITY, not by id.** The builder swaps three views under one route, and an incoming
  view can register an id before the outgoing view's ref cleanup runs; an unconditional delete erased the
  live anchor and the tour silently lost the step. Now the order is irrelevant.

The active-workout tour fires on the first session immediately (PO call — same rule as every other surface;
"Skip all" is one tap). **Deliberately NOT tutorialized: Workout Complete** — it is the earned moment, and
the app's philosophy is against teaching over one. Flagged instead: **"press and hold to seal" is a gesture
with no affordance**, which wants a micro-hint on the button rather than a tour card.

Verified: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **685 `node --test` green, 7 new** ·
clean web export.

### 23. P-1.1 Edit Profile built, and three share destinations that lied were removed (2026-08-02, CODE)

**Pre-tester hardening pass.** Two gaps that a beta tester would hit in their first hour, closed — plus one
board entry that has been wrong for weeks.

**P-1.1 Edit Profile — `src/app/edit-profile.tsx`, new.** Owed since `P-1-Dissolution-Amendment.md` §4, and
named directly by ONB-D8 ("the derivation is a default, never a lock… freely editable later via P-1.1").
Until now every identity field was **write-once at onboarding**: an athlete who mistyped their handle owned
that typo permanently. That is not cosmetic — **handle search is the only way Add Friend resolves a person**
(SOC-D15), so a typo makes you unfindable, which breaks the one flow a paired tester rollout depends on.
Editable: name · photo · handle · sex · athlete type. **Rank, "Forging since" and every earned record are
absent by design** — they are the record, and "History cannot be rewritten" governs this screen too.

Implementation notes worth keeping:
- **No migration.** `profiles_self` (0001) is already `for all … with check (id = auth.uid())`, so the row is
  writable by exactly one person. A `SECURITY DEFINER` RPC would have re-implemented a check the database
  performs anyway.
- **Nothing denormalizes identity** — the squad and friends feeds join `profiles` at query time (0041) — so
  an edit propagates everywhere with no backfill. Verified before building, not assumed.
- `first_name`/`initials` are **derived, not accepted**, by the same helpers `complete_onboarding` uses, so a
  name edited here resolves byte-identically to one typed at onboarding.
- **The handle's unique index is the authority, not the debounced check.** A 23505 between check and write is
  a real race and is reported as `HandleTakenError`, not a generic failure. Your own current handle is
  explicitly exempt from the availability check — otherwise it reads as "taken" and locks you out of saving
  any other field.
- **Avatar cache-busting (`src/lib/avatar.ts`, extracted from the onboarding service so both callers share
  one implementation).** A fixed object path plus `upsert` means the public URL never changes when the image
  does — every URL-keyed cache would keep serving the previous photo. The athlete would pick a new picture,
  be told it saved, and go on seeing the old one: **a save that reports success and displays the opposite.**
  The `?v=` stamp is stored with the row so every reader gets the fresh URL.

**Three share destinations removed rather than left lying (`src/app/share-config.tsx`).** The worst was
**"Message", which toasted "Message ready" with no message and nothing behind it — a surface reporting a
success that never happened**, the exact class the 2026-08-01 audit was built to catch. Removed with it:
Community (not in the app), "A friend" (no direct-message surface exists) and "Copy link" (there are no
public URLs — every post is audience-scoped, so a link needs a sharing model and a privacy decision, not a
clipboard call). Squad and Friends both post for real. **Four destinations that work beats ten where six
lie** — the same reasoning that omitted the Friends chip from Challenges.

**Board correction: `rank-progression` is NOT orphaned, and has not been for some time.** It has one inbound
link — the Progress Hub's "See every rank" closer (`progress-hub.tsx`), added when that screen stopped
withholding requirements; the comment there says so outright. Reached as Legacy → rank badge → Progress Hub →
Rank Progression. The stale claim was repeated in `_layout.tsx` and in this dashboard's Current Sprint; both
corrected. **The open decision "rewire or retire" was answered by a link nobody recorded** — worth noting as a
pattern, since it is the mirror image of the amendment-never-merged problem: work done, never written down.

**Verified:** `tsc --noEmit` 0 · **678 `node --test` green** across 49 files (route-guard derives the screen
list from the filesystem and passes, so the new route is properly declared inside `Stack.Protected`) ·
`eslint src` at baseline (1 pre-existing error, 13 warnings — nothing new) · `expo export --platform web`
clean, `edit-profile.html` rendered among 59 routes.

### 24. The guided tour split into two legs, and Home finally gets explained (2026-08-02, CODE)

**The tour ran at one moment and taught the wrong screen.** The four-tab tour existed only as the honor
ceremony's continuation, so it fired at the exact instant Home un-gated: the athlete was handed a map of four
tabs while the screen in front of them filled with six cards nobody described. `SCREEN_TOURS.home` was
literally `[]` — the one dense surface in the app had no walkthrough at all.

**Now it is two legs at two moments** (`src/domain/onboarding/tour-plan.ts`, pure + node-tested):

- **TABS leg — while Home is still GATED.** The four pillars, one card each, unchanged copy. Reported by Home
  only from the **chooser** face: the athlete has just arrived and touched nothing, which is the one moment a
  map is worth having and costs nothing. Never mid-intake — walking someone away from a half-answered question
  is not guidance. An athlete who skips past that moment keeps the leg owed, and the planner chains it ahead
  of the Home leg later (covered by test).
- **HOME leg — the moment Home opens into full bloom.** Seven **spotlit** steps over the real cards, in the
  order the screen is read: Chapter · Today's Workout · Current Program · Mission · Your Circle · Train
  Together · Competitions. Handed to from the Initiative ceremony's "Keep Building", and auto-fired for an
  existing account whose ceremony was announced long ago.

**The spotlight is the feature, not a flourish** — and it is a PORT, not an invention: `forge-coach.js` in the
design reference is a complete coach-mark engine (Progress Hub, Programs, Legacy and Community all call it),
and the app had never implemented it. `TourOverlay` now reproduces its geometry — per-step `pad`/`radius`, a
96px scroll margin, card below the hole when there's room and above when there isn't, and the dim drawn as one
9999px spread shadow on the ring, which is the trick that gets a **rounded** hole out of a platform with no way
to cut one. A card that says "Mission" to someone who cannot tell which of two identical tiles that is has
taught them nothing.

**Two decisions worth keeping:**

- **A step whose card isn't on screen is dropped from the run, never rung around nothing.** The freestyle
  athlete has no Program | Mission grid, so their tour is five steps and the counter says "of 5" — it does not
  say "of 7" and walk them past two empty rectangles. Same rule the design's engine applies at start.
- **The legs persist separately** (`forge_tour_v1` + `forge_home_tour_v1`, the design's own key name). One flag
  could not express "saw the map, hasn't been shown the screen yet", which is the ordinary state of every
  athlete between sign-up and their first program.

Anchors are registered ref-held, not in state — registering a card must not re-render the app — and are read
only when a run is planned. `useScreenPrompt`, the Guided Tips master switch, the account-switch reset, the
"View Honor" deferral and "Replay all tips" all carry over; replay now replays **both** legs.

Verified: tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · **678 `node --test` green, 11 new** ·
clean web export.

### 25. FULL-APP AUDIT — seven passes, three defects closed, one reported (2026-08-02, CODE)

A deliberate attempt to break the app: reachability · data contract · dangling loops · persona walks ·
computation truth · hostile input · server-side authority. Commit `ce472b8`, migration **0101**.

**Fixed**

- **A record nobody set.** `detectPRs` measured every exercise against `priorBest` — a snapshot taken
  before the session that never moved. A lift appearing twice in one session (two blocks, a re-add, a
  superset) was compared against the same stale number both times: **Squat 310 then 300, against a prior
  of 295, announced BOTH as records.** The 300 is not a record; they had just done 310. The bar is now
  whichever is higher — history, or what they already lifted today. Found by running it, not reading it.
- **`archive_squad_goal` asked nobody who was calling.** Shipped in 0099 as `SECURITY DEFINER` with no
  check, while every sibling (`ensure_weekly_recap`, `refresh_squad_records`) opens with
  `is_squad_member`. DEFINER meant RLS did not apply. Not goal forgery — it archives only a genuinely-met
  goal — but a **disclosure oracle**: the boolean revealed whether an *arbitrary* squad had met its goal,
  and squads are private by design (SQ-D16). Migration **0101** adds the missing guard.
- **Two characters nobody could see.** `src/app/workout.tsx` held two literal NUL bytes as a join/split
  delimiter; `extract.mjs` a literal NBSP inside a regex. Both correct at runtime, both invisible — and
  grep classified `workout.tsx` as a **binary file**, silently returning nothing for several searches
  *during this audit*. Now `\u0000` / `\u00a0`. Third time this session an invisible character hid a real
  answer.

**Verified clean (mechanically, not asserted)** — 54 RPCs · 53 RPC *argument lists* (a renamed parameter
is a 42883 that looks cosmetic; never checked before) · 32 tables · 102 select sites · every insert/update
payload, all against the 101-migration chain. 26 mutating functions swept for an authority decision — one
gap, above. Every route declared under the auth guard; both dev-only screens genuinely redirect. Run and
workout math yield no NaN/Infinity on empty input. Every "orphan" explained.

**Reported, deliberately NOT rushed — the one open defect.** Personal records are identified by **display
name**, not by the `catalog_key` the row already carries. So one lift can hold two histories — "Bench
press" (imported, keeps the athlete's words by design) vs "Barbell Bench Press" (picked). **Proven: 190 lb
announced as a record to an athlete who has benched 225.** The correct fix keys PR identity on
`catalog_key`, which needs a new column *and* a `save_workout` replacement — the RPC with the worst blast
radius in the project (see the 0095–0097 lesson). Designed, not shipped; awaiting a decision.

**Also noted:** ONB-A2-D4(c) — the post-first-workout discovery moment — is specced and unbuilt; (a) and
(b) exist. `profiles.environment` is written by nothing and read by nothing (harmless: unlike
`chapters.honor_count`, no surface displays it). ~69 dangling exports, mostly type-constant arrays, plus
two superseded duplicates (`fetchPublicProfile`, `getNextWorkout`).

### 26. Import from a spreadsheet · PR semantics · Rank standards (2026-08-02, CODE)

**IMPORT IS BUILT.** It was in the design all along — not a screen, a BottomSheet inside the Program
Builder — which is why a search for an import `.dc.html` found nothing. That supersedes
`Architecture-Amendment-001-Import.md` (four screens, W-IM-1..4) which had sat in Decision Queue #15
since W-1's retirement orphaned one of its entry points. PD-7: the design governs.

The design's own copy IS the parser's contract, so it was built to it literally, then attacked. **52
formats now import; 15 of the first 26 broke it and 9 more of the next 20 did.** The ones that mattered:

· MERGED CELLS — a real sheet fills Week and Day once per block. Blank read as "no value", so every
  continuation row landed in a fabricated "Day 1" and one training day silently became two.
· TYPED-OUT WORKOUTS were all rejected. "Import from a spreadsheet" meant "import, but only if you
  already keep a spreadsheet". Bullets, numbering, colons, day headings all read now.
· "Bench press - 4 sets - 6-8 reps" — the single most common hand-written shape — read the sets, lost
  every rep, and welded "- - 6-8 reps" onto each name.
· "135 x 5" READ AS 1 SET OF 35, by slicing two digits off a three-digit weight. Silently, plausibly.
· 5/3/1 and wave loading imported as lifts named after percentages. Each loaded line is now a SET.
· One column per day, markdown tables, semicolon exports, "Week 1: Squat 5x5".

**NAME MATCHING: 0 of 18 → 14.** A real split parsed perfectly and resolved NOTHING — exact-match only,
against a catalogue that says "Barbell Bench Press" while people write "Bench press". Token matching
(every written word must appear) that ABSTAINS on ambiguity: a wrong key is invisible, permanent, and
files PRs against a lift nobody did. Two wrong matches in the first version were caught by measuring —
"Dips" → Bench Dip, and "Lateral Raises" → CABLE. Deliberately not an LLM: the remaining gaps are model
gaps, not parsing ones. **The real fix is data — 797 exercises carry ~3 aliases between them.**

**A PERSONAL RECORD IS A FACT, NOT A CALCULATION.** Three definitions of "PR" were live at once. The
in-app prompt compared a set to earlier sets in the SAME session, so working up 135 → 185 → 225
announced a record on the third set of a warm-up ramp, every session. `detectPRs` compared estimated
1RM against a floor of ZERO, so a beginner's every set was a record — one athlete's history reads
3 lb → 35 → 90, three records in a day. Now: heaviest weight at 1–5 reps, beating a previous 1–5 rep
mark, no estimation anywhere. The FIRST mark on a lift is a baseline — written, never announced.

Also: a warm-up treadmill walk had been recorded as a **40 lb personal record** (cardio and warm-up
sections are now excluded); **Rank Progression states every standard** and is reachable at last (it was
built, guarded, and linked from nowhere, which is why nobody had noticed it stated none); **sharing to
Friends** works — the backend had been finished for weeks and only the caller was missing; **Save image**
composes the card at 1080px rather than screenshotting it; and Workout Complete stopped inventing an
"Up next" from the demo program.

Gate held at every step: tsc 0 · lint at baseline · **635 `node --test` green** · export + bundle grep +
deploy.


### 27. Cardio consolidated onto one surface · the five empty honor categories filled (2026-08-01, CODE + migration 0099)

**Runs.** GPS measured nothing because `ACCURACY_FLOOR_M` was 25 m — right for a phone under open sky, wrong
for a browser geolocating off wi-fi at 30–80 m, so every fix was discarded and the distance sat at 0.00
through a real walk, silently. Floor is 65 m and movement must now clear the device's own error bars.
`signalNote()` is shared by every run surface so a stalled distance can never again be wordless.

**`/active-run` is RETIRED** (72 screens → 71). Two full-screen surfaces measured one activity and wrote to
the record two different ways — a standalone activity row, or cardio legs on a session — so everything
downstream had two shapes for one event. Its distance goal, pace target and cues moved onto the cardio
card; its hold-to-seal did not, because a run-only session already ends at the workout's own Finish.

**Start now starts the run.** `start()` awaited a permission grant and refused on anything less — and on the
web that is the NORMAL path, since `requestForegroundPermissionsAsync` reports state rather than raising the
browser prompt. `phase` (is the athlete running) and `gps` (can we measure it) are now separate.

**A run was being filed as a strength workout.** `activityType` was hard-coded at every construction site, so
Activity History filed runs with the bench presses and the run-records lookup could not see them. Derived
from session content now, and only when the whole session is one kind of cardio.

**Honors 139 → 179** (migration 0099). Programs 5 · Longevity 10 · Squad 15 · Prestige 7 · Hidden 6. Not
built, with reasons: Communities (5, pillar deferred), Family Mastery (2) and Built by the Plan (1) — program
lineage exists only as an unresolved authored string in client code, invisible to the evaluator.

**Two product corrections from the PO mid-build:** squad Missions shipped as squad GOALS (so those three
honors count goals, and `squad_goal_completions` is the archive that makes them countable — nothing had ever
recorded a goal being finished); and Perfect Week as the locked catalog defines it — every member training
all seven days — is a bad honor, earnable only by a squad in which nobody rests and broken for everyone by
one person's Sunday off. The bar is now `squads.weekly_standard`, owner-set in Squad Settings.

**The safeguards earned their keep.** `honor_metrics(uuid)` was extracted from the evaluator specifically so
it could be RUN — and it caught `42703 column ck.checkin_date does not exist` at apply time. `squad_checkins`
was daily trained/rest in 0048; **0049 DROPS that table** and rebuilds it as ephemeral video stories. Reading
the migration that introduces a table is not reading the one that decides what it is, and grep finds the
first. Perfect Week and Squad Streak now derive from logged workouts, which is the better evidence anyway.
`honor_requires` carries foreign keys both ways, so a mistyped Prestige prerequisite cannot be stored.

**A guard that checks nothing is worse than no guard.** The new dropped-table contract test passed twice with
the bug deliberately reintroduced — once because its pattern ended in a bare `
` and these files are CRLF,
once because a heredoc ate a backslash level. It now provably fails with the bug and passes without it.

Verified: tsc 0 · lint at baseline · **540 `node --test` green across 40 files** · export + bundle grep +
deploy. Migration 0099 applied and verified against a real account (179 rows, 14 categories).


1. **Repository audit + correction pass — five defects closed, and this board rebuilt from measurement (2026-08-01, CODE + DOCS)** — A five-lens audit of the whole repository (inventory · data-layer contract · route-by-route state · correctness/fabrication · docs), then the fixes. **The data layer came back clean and it was verified mechanically, not asserted**: 53 RPC names, 61 call sites, 434 select columns and 119 write payloads all resolve against the migrations; RLS is on all 35 tables with a policy each; 52/52 `SECURITY DEFINER` functions pin `search_path`. **What it found instead was a class nobody had checked — values displayed from columns nothing writes.** `chapters.honor_count` had been written once at chapter creation as a literal `0` and incremented by nothing across 97 migrations (`workout_count` has eight increment sites), yet was rendered as a real tally on Chapter Detail, the Legacy Timeline, the public athlete profile, and — worst — the **M-5 seal ceremony**, whose closing line told an athlete they had earned "0 honors" in the chapter they were closing. Migration **0098** derives it from `honor_instances.chapter_id` per 0095's derive-don't-store rule and marks the column dead; the column is NOT dropped, because the only statements naming it sit inside `complete_onboarding`, whose failure mode is "a new athlete can never enter". **Second: 17 routes sat outside the auth guard** — in expo-router a route is gated by being DECLARED, not by existing (verified against the installed 56.2.9 source), so undeclared screens answered a URL while signed out; RLS meant nothing leaked, but a logged-out visitor got an empty Goals/Progress-Hub/Friends/Settings instead of sign-in. **Third: invented athletes were compiled into the production web bundle** — gating a screen does not tree-shake a module, and `app/post/[id].tsx` was a route whose static import pulled the whole fixture chain in; the screen is now deferred out of `src/app/` (the precedent set for Community) and a rebuild proves it (`Ada Ridge` 10 → 0, bundle 11.71 → 11.11 MB). Also: three silent failures made honest (the honors guard caught the impossible case, PGRST205, and missed the real one, 42703; `claimEarnedHonors` turned a schema error into "0 granted"; a failed `saveHomeGym` produced the exact "didn't answer" state its own comment warned against), one dead 186-line fixture deleted, and a comment corrected that overstated a security bypass the server actually prevents. Two new regression guards: `route-guard.test.mjs` derives the screen list from the filesystem, and `chapter-tallies.test.mjs` asserts a chapter holding eleven honors never reports 0. **Three findings were deliberately NOT fixed, with reasons recorded in Current Sprint** — `workout_count` (a stored counter that is correct today and only breaks when a delete-workout path ships), the duplicate `FeedPostCard` (covered by the standing "no deletion until the new component system locks" rule), and the migration-compat guards (genuinely useful on a fresh database). Gates: **tsc 0 · 508/508 `node --test` · eslint at baseline · web export clean.** Commits `8179a10`, `e6fc901`, `d5a0db3`. **This dashboard was rebuilt against a fresh measurement in the same pass** — it had been claiming 37 screens (72), 28 migrations (97), 411 tests (508), a "fully MOCK" social pillar that has been Supabase-backed for weeks, and a Current Sprint describing a pre-implementation phase that closed 2026-06-30.

2. **Full fabrication sweep — no invented claims about the athlete (2026-07-31, CODE)** — A repository-wide pass over every placeholder/fixture module, classifying each as authored content, types only, deferred feature, dev-only, or **a claim about the athlete** — only the last is a defect. Fixed: the **ceremony share card**, which built from a `DEMO` table so a real rank-up produced a keepsake citing "Chapter III · The Rebuild", dated months earlier, signed "Ada Ridge" (`DEMO` deleted; the card now carries the event's own facts, `athlete`/`rank` nullable so an unknown name omits the byline, and an under-supplied card renders SHORTER rather than wrong); **Home's phantom program**, where the hero fell back to `getActiveProgram()` — the CATALOG's demo cursor — so a freestyle athlete who had chosen nothing was shown Strength Foundation I as theirs (no program is now a real state, offering the same two equal-weight doors as the first-run gate via a shared `ProgramPathChooser`); **Home's fixture identity** (the artwork resolver only ever needed `sex`, so it takes the real profile's, defaulting to the deliberate neutral `'unspecified'`); and **`getPublicProfile()`**, dead since 0069 built the real athlete profile, reduced to the type `domain/profile/live.ts` uses. Also found that "reachable only via `router.push`" was **never true on web** — expo-router routes by FILE, so `/ceremony-harness` and `/post/[id]` answered typed URLs on the production domain, showing invented athletes and an invented squad record book; both are now `__DEV__`-gated, and Metro drops the harness body so "The Rebuild"/"Chapter III" are gone from the bundle. Remaining fixture names are inert module data behind those gates plus one input example ("e.g. Iron Vigil"). `home-placeholder.ts` → `home-principles.ts` (it holds only the authored daily principle, which is product content and the same for everyone by design). Commit `e3692d9`.

3. **The workouts cluster — PR photos, templates, Train Together, and the Workouts IA (2026-07-29..31, CODE + DB, migrations 0090–0094)** — Four dangling loops closed. **0090** adds `chapter_photos.exercise` so a PR photo attaches to the *lift*, not just "somewhere in Chapter III" — deliberately one column and not a `personal_record_id`, because PR rows are written by `save_workout` at the END of a session and the moment worth photographing is mid-set, before one exists. **0091** adds `workout_templates` + `save_workout_as_template()`, built from the CAPTURE end (a session you already did and want again), keeping the shape and **dropping the load** — a template is a plan, last Tuesday's weights are a record. **0092** adds `workout_invites` + `training_partners()`: not a shared session but an invite and two ordinary workouts that each name the other in `workouts.partners` — the column that has existed since 0016 and that 0079's **twenty-four partnership honors** count, into which nothing had ever written a real name. **0093** makes an invite carry the workout as a SNAPSHOT rather than a pointer (they may not own your program, and "next session" resolves per athlete, so a pointer opens a different workout for each of you — same reasoning as CS-D17). **0094** fixes a 42703 found only by using it: 0091 read `w.name`, but the column is `workout_name` — PL/pgSQL resolves record fields at run time, so the function compiled, the migration reported success, and it failed when an athlete pressed the button. Also: the Add Photo "Lift" chip named nothing ("Front"/"Side"/"Back" name the pose you can't see; a photo labelled "Lift" tells you what the picture already shows) — it now opens the real 794-exercise `PICKER_DB` and sets both the label and the attachment, so a gallery-added PR shot can carry a lift at all.

4. **Photos Gallery, chapter albums, and the Legacy archive band (2026-07-29/30, CODE + DB, migration 0085)** — `chapter_photos` + the `chapter-photos` bucket + `chapters.cover_photo_id`, with `photo_albums()` resolving a cover through a five-tier waterfall and `chapter_album()` deriving each photo's event from its DATE (chapter opened / sealed / that day's best PR) — so backdating a memory is how it takes its right place in the record. Add Photo grew the details step it needed (label · caption · stepped date floored at the chapter start and ceilinged at today · star), because with no caption the timeline's pull-quote can never appear and with nothing starred three of the five cover tiers never fire — the read side was more capable than the thing filling it. On Legacy, the "What Endures" navigation list became a **3-tile visual archive band**. Follow-up defect: the band was fetched once at mount and never again, so adding a photo and returning showed the boot-time result next to a gallery that now had photos in it — refetched on focus with the rest.

5. **Honors chain completed — the hub could not load (2026-07-31, DB + CODE)** — `fetchHonorCatalog` selects `honor_catalog.display_amount`, a column only **0083** adds, and the applied range had stopped at 0081 — so Legacy → Honors → "View all" returned `42703: column does not exist` on every open. Both catalog reads guard `PGRST205` (table absent) but not a missing COLUMN, which is what a partially-applied chain actually produces. 0082 (the Origin family, 8 honors — including **"Again"**, for your second workout, which nothing in the app had ever marked) and 0083 (wording sweep + `display_amount`, so a swim threshold stops reading "0.311 miles") are now applied. The screen also **swallowed the reason**: it printed only "Couldn't load your honors." while every other screen renders `errorMessage(error)` — an error that names its own cause in eleven words was invisible for want of one line. Now shown.

6. **Trophy Case — an athlete's competitive legacy (2026-07-30, CODE + DB)** — New route `/trophy-case`, built to `Forge Trophy Case.dc.html`: the personal counterpart to the squad's Hall of Champions. Championships as bronze-lit tiles, podium finishes as lighter ring-only chips, a medal tally and a career record, entered from the Legacy tab's long-dead Trophy Case row and from any profile whose owner has cleared you. **Migration 0084 (`athlete_trophy_case`)** exists for three things `challenge_hub()` cannot give: the **winning margin** on a championship tile (which requires reading other athletes' final scores — correctly refused to a direct table read), **the record of an athlete who is not you**, and the **consecutive-title streak**. **TWO GATES DOING TWO DIFFERENT JOBS.** The screen is gated on the subject's own `stats` visibility (default `squads`), because a competitive record is performance data and belongs behind the same audience control as workouts and PRs — a stranger gets `null`, not an empty screen. Each *finish* is separately gated on `can_read_challenge`, so a title won in a squad the viewer isn't in stays unnamed. **The totals stay true either way** and the difference is stated ("3 finishes are in competitions you can't see") — filtering the totals as well would print "1 championship" for someone who has six, and under-reporting on a screen titled Competitive Legacy is its own kind of lie. **The design's own defects, fixed:** all nine trophies called one unparameterized `goResults()` that wrote no payload, so tapping *Winter Volume War* and tapping *Iron Open* both showed whatever the previous screen had left in the store — while the on-screen footnote promised "tap any trophy to revisit the final standings"; every tile now routes by its own challenge id. `totalEntered = 12` was invented against nine results, so Competitions **and** Win Rate were built on a number with no source; `Math.round(0/0*100)` rendered **`NaN%`** for a new athlete; the subline said "4 seasons" while the streak said "5 seasons" 200px away, both hardcoded, as were `bestEvent` and `streak`; and all nine cards carried `role="button" tabindex="0"` with **no key handler**, so a keyboard user could focus nine trophies and activate none. **Anti-shame (CC-D3) shaped what is drawn at zero:** nothing that counts down from an achievement appears before there is one — the tally arrives with the first podium, Championships and Win Rate with the first title, and a run of one is not a streak. Co-won titles read **Co-Champion** and carry no margin (CS-D15) — a shared title was not won *by* anything. **Verified:** tsc 0 · lint at baseline · 416/416 · export clean; deployed. **Migration 0084 must be RUN by hand, after 0083.**
7. **Honors made a real library — 2 awardable → 139, and the Honors Hub (2026-07-29/30, CODE + DB)** — The honor system could grant exactly two things. It now grants **139 across 14 categories**, because the catalog became a **table** (`honor_catalog`, migration 0077) read by one table-driven evaluator instead of a list embedded in a function — so most future honors are rows, not code. **Migrations 0077–0083:** the catalog + evaluator (43), strength · competition · endurance (35, plus `personal_records.catalog_key`), bodyweight ratios · tonnage · partners · comebacks (24), walking · cycling · swimming (28 rows and **zero code**), the category snapshot, 8 Origin honors, and a wording sweep. **A latent bug found on the way:** `evaluate_honors` had been **absent from `save_workout` since migration 0018** — honors were being evaluated nowhere on the path that earns them; restored in 0078. **`Forge Honors Hub.dc.html`** ships as `/honors`, reading the live catalog. Two corrections after use: the Legacy screen drew one hardcoded five-point star for every honor while the Hub drew a per-category medallion, so the same honor had two faces — `honor_instances.category` is now **snapshotted at award time** (0081), the same rule `display_name` already followed (AD-58), so a later catalog rename cannot rewrite what an athlete was told they earned; and `initiative`, granted by its own RPC and never a catalog row, was missing from the Hub entirely. **A full description sweep** (a harness running the real `triggerText()` over every catalog row) found **7 Origin honors with no description at all**, swimming thresholds authored in metres being spoken back as "15.534 lifetime swim miles", and a **"Not Alone" / "Never Alone"** collision authored a day apart — fixed in 0083 with a `display_amount` column and a backfilled rename to **First Connection**. Re-run: 0 of 95 without a description. **Deliberately NOT built: an Honors Catalog screen.** The product owner's read — that 139 visible unearned honors is a list of things you haven't done, and turns a legacy record into a checklist — is right, and the locked catalog already agrees in principle with its `hidden` category ("never surfaced until earned"). **Verified:** tsc 0 · lint at baseline · 416/416; deployed. **Migrations 0077→0083 are a STRICT CHAIN and must be run in order.**
8. **Friends — the graph, Add Friend by Handle, and the Friends Feed (2026-07-29, CODE + DB)** — The first relationship tier below Squads. **Migration 0073** stores a friendship as **one canonically-ordered row** (`primary key (low_id, high_id)` with a `low_id < high_id` check) rather than two mirrored rows, so a pair can never disagree with itself about whether it is friends; `requested_by` is constrained to be one of the two. **0074** gives `squad_posts` an `audience`, with `check ((audience = 'FRIENDS') = (squad_id is null))` making a friends post and a squad post structurally exclusive. `/add-friend` finds people by **exact handle only**; `/friends` is a real feed. **Three things the design draws were refused, each against a named prohibition, each with an honest alternative offered:** the **Follow** button (FR-D2 — no followers; Communities is where a creator's one-to-many audience belongs), **"People you may know"** (SOC-D15 — no friend suggestions; exact-handle discovery instead), and a percentile club. **Two defects shipped and fixed the same session:** 0074's `can_read_post` was used as a SELECT policy on its own table, which breaks `INSERT … RETURNING` (the statement-start snapshot cannot see the row being inserted) → `42501` on every post; and rebuilding the post-type constraint from 0041 silently **dropped `formcheck` and `transformation`**. Both repaired in 0076 by inlining the predicate and restoring the full type list. The squad composer also gained **transformation selection**, so an entry already in your gallery can be posted without re-uploading it. **Communities are deferred indefinitely by decision** — squads first, and communities only if a need appears. **Verified:** tsc 0 · lint at baseline · 416/416; deployed. **Migrations 0073–0076 must be RUN by hand.**
9. **Competition History (2026-07-29, CODE only — NO migration)** — The eighth of nine competition screens, built to `Forge Competition History.dc.html`: a filterable, paginated record of every season the athlete has finished. **No backend work was needed** — `challenge_hub()` already returned the complete, unbounded result history (place, score, roster, type, metric key, context, end date) and the design's entire filter pipeline is client-side, so C-1's five-row preview and this screen read the same data. Faithful: the non-scrolling header (search and filters never leave), sticky year headers pinning beneath it, `border-top` separators so the first row of each year carries the hairline under its header, the champion's bronze-metallic disc against everyone else's recessed place disc, chips resetting pagination on every change, Load More in twelves. **FIVE DESIGN DEFECTS FIXED:** (1) **year counts were wrong** — the design groups by year AFTER slicing to the page limit, so "4 competitions" is what happens to be loaded rather than what the year holds, and 2024 under-reports at the default limit of 12; counts now come from the filtered set and the slice only decides what is drawn. (2) **the Result filter parsed a string** — `resultOf` tests the standing text with `/^1st/` to identify champions, which works until the first tie, since co-winners share place 1 (CS-D15); it reads `isWinner` instead. (3) **`days: 28` was written for every row** regardless of real length, so a 7-day sprint reached the results screen reporting four weeks; nothing is handed over now — the row routes by id and C-4 reads the real season. (4) **type chips were a fixed list of five** while we ship fourteen metrics (CA5-D1) — a type absent from the design's table renders a bare fallback stroke and is unreachable by any filter, so the chip row is built from the types actually present in the history. (5) **one empty state served two situations** — a brand-new athlete saw "No competitions match these filters" with a Clear filters link that cannot help; nothing-yet now reads as an invitation and no-matches offers the reset. **A free win over the web original:** it notes filter state resets on every navigation because it hard-navigates; pushing a route keeps this screen mounted, so returning from a result lands on the same filters and scroll position. Entry is C-1's History header, which also shows the total once there are more than the five that fit. Lint caught a real defect while building: `data?.history ?? []` minted a fresh array every render and defeated both memos — memoized. **Verified:** tsc 0 · lint at baseline · 416/416 · export clean with `/competition-history` emitted; deployed. **Competitions now 8 of 9** — only Challenge Invite remains, and it is mostly about FRIENDS-context challenges, which need the friends graph.
10. **Current Champions (C-7) + three PD-7 rulings + the architecture reconciliation pass (2026-07-29, CODE + DB + DOCS)** — **C-7 (migrations 0070→0071)** completes the seventh competition screen: title tiles with the holder, the winning score, the field size and the crowning date, a featured card carrying the design's 4.5s breathing bronze glow, and a per-title standings sheet. The design's six hardcoded titles become however many the squad has actually earned; an empty category gets no tile (§12) rather than a vacant one inviting you to notice the gap. Entry is from C-1 — `Squad-Architecture-Amendment-002` SA2-D1 bars champion recognition from always-on squad surfaces outright, and SA2-D2 permits only the person-agnostic affordance that Squad Detail's Hall row already is. **THREE SPEC-OVER-DESIGN CALLS REVERSED BY PD-7.** C-7 was first built to its spec (§7/§9/§12: "recognition only — no scores, no ranks, no leaderboard") and the conflict raised rather than resolved silently; the product owner ruled for the design, and then for the two related calls the first amendment had explicitly left open. **Amendment 006 (CA6-D1)** — C-7 renders the winning score and full standings. **Amendment 007 (CA7-D1)** — C-5 names 2nd and 3rd in the design's podium strip, bounded at the top three so no card shows a last place. **Amendment 007 (CA7-D2)** — C-4 shows Longest Streak. In every case the superseded spec lines were STRUCK with pointers and **the spec's original reasoning was preserved, not deleted**, so a future reader can tell these were deliberate trades rather than oversights. What moved each time was a *placement* rule — which surface may host which comparison — never the anti-shame floor: no row is labelled last, no deficit is framed, nobody is annotated for absence, cancelled seasons still never appear, and the Firewall's roster-scoping is unweakened. **A CORRECTION I OWED TWICE:** Longest Streak had been dropped from Squad Records and then from C-4 on the claim that "nothing tracks streaks — no table, no definition of what breaks one". That was overstated. An ALL-TIME squad record does need a definition stable across an athlete's whole history and genuinely has none (CS-D19 still omits it); a CHALLENGE streak is bounded by the season and inside a fixed window is fully determined — a day counts when at least one workout was saved on it in the challenge's own timezone, a streak is a maximal run of consecutive counting days, and streaks of 1 are suppressed. Computed by gaps-and-islands over `workouts` (migration 0072): no table, no stored state, and the value cannot drift because the window is closed. **THE DOC PASS** closed Amendment-003 §5's three outstanding edits (SQ-D1 10→50 with its reasoning retained; S-3's capacity examples and a validation row that wrongly waived enforcement; S-1's "no public visibility" claim, false since Discover) — with historical decision records ANNOTATED rather than rewritten, since editing them would falsify history instead of correcting a rule — and authored **Amendment 005** for the metric table, which also corrects a misattribution I had carried all session: the table is **CS-D8**, not CS-D9 (CS-D9 is qualifying-event rules, conformed to unchanged). Decision Queue #18 closed, #17 partly settled. **Verified:** tsc 0 · lint at baseline · 416/416 · export clean; deployed. **Migrations 0070 + 0071 + 0072 must be RUN by hand, in order.**
11. **Athlete Profile made real, and its privacy gate moved server-side (2026-07-29, CODE + DB)** — `/athlete/[id]` was already built to `Forge Public Profile.dc.html` — sections, components, gating — but its own header recorded the limit: "the app has a per-athlete dataset for exactly ONE subject — the signed-in athlete", so every OTHER athlete rendered identity plus inert actions. Every avatar in the competition standings, the record book and the join-request queue opened a near-empty page. **Migration 0069** is that dataset. **THE SUBSTANTIVE CHANGE IS WHERE THE GATE RUNS.** The old version fetched what it could and decided in the UI whether to draw each section (with `?chapter=private` query overrides to demo it) — which is not privacy: it ships an athlete's training stats to a stranger's device and trusts the interface to look away, and anyone with a network tab has them. `athlete_profile()` evaluates the subject's own `profiles.visibility` map (0022) against the viewer's clearance and does not SELECT a section the viewer cannot see, so a hidden section is ABSENT from the payload. Two consequences held deliberately: **`null` means "not cleared", `[]` means "nothing there"** — never collapsed into one falsy check, because an athlete with no sealed chapters and an athlete who keeps them private are different facts and only one is the viewer's business; and **a hidden section is silent** — no "this athlete's stats are private" placeholder, since that sentence is itself a disclosure of both what they have and that they withheld it. **THE FIREWALL RESOLVED ITSELF:** the C-series specs route row taps to a "performance-free" profile, and `stats` already defaults to the `squads` audience — a stranger never receives training numbers while a squad-mate does, which is exactly what SQ-D2 lifts the Performance Firewall for. `transformation`/`photos` default to `friends` and no friends graph exists, so nobody can clear them — the correct failure direction, where an unbuilt relationship tier withholds rather than leaks. **Also fixed:** rank is the subject's real stored family/level (the design renders Foundation IV for everybody from a literal); shared squad names are real (the design hardcodes "Iron Vigil"); the design's scroll-driven hero is ported (fade, 0.12 parallax, portrait shrinking toward the corner, and the black plate dissolving the artwork). **ROUTED BY ID, NOT NAME** — it took a display name and looked the subject up by it, which cannot identify anybody reliably, and `squad-post` was already passing a real uuid into that name lookup, so two callers disagreed; C-3, C-4, Squad Records and Join Requests all pass ids now. **Not on this surface:** Featured Legacy Moment (needs FLM event data this read doesn't carry) and Honors (no HonorInstance backend) — the Legacy tab stays the rich self surface for both. **Still inert, honestly:** Add Friend, Follow, 1-v-1 Challenge, Train With, Invite to Squad, Report, Block — each needs a system that doesn't exist, so they render visibly disabled with one line saying so rather than as buttons that toast. `friends.tsx` and `post/[id].tsx` remain fixture-backed with names only. **Verified:** tsc 0 · lint at baseline · 416/416 · export clean; deployed. **Migration 0069 must be RUN by hand.**
12. **Onboarding finish made retryable + database errors made readable (2026-07-29, CODE + DB)** — A new account could not enter the app: "Couldn't finish — [object Object]". Two independent defects, both real. **(1) `complete_onboarding` (0008) could only ever succeed once.** It ends with an unconditional `insert into chapters`, and `chapters_one_active_per_athlete` is a unique index over active chapters — so if the write lands but the client doesn't navigate (a failed refetch, a reload, a closed tab, a flaked response), the athlete is stranded on the onboarding screen with a complete profile, an active Chapter I, and an "Enter Forge" button that can now only raise 23505. Pressing it again is the one thing they will do and the one thing guaranteed to fail. **Migration 0066** makes the chapter insert conditional and adds a `not found` guard on the profile update (zero rows = the signup trigger never fired, which should fail loudly rather than silently onboard a nonexistent profile). Atomicity is unchanged — this removes a false failure, not a real one. **(2) Every Supabase error rendered as `[object Object]`.** PostgREST rejects with a plain object (`{message, details, hint, code}`), not an `Error`, so `e instanceof Error ? e.message : String(e)` threw away the only useful part. `errorMessage()` already existed in `src/lib/useQuery.ts` — written for the query path and never shared — and six sites were still blind: onboarding, Program Detail (×3), Program Builder, Active Workout. All six now use it. **Verified:** tsc 0 · lint at baseline · 416/416 · export clean; deployed; user confirmed sign-in restored.
13. **Challenge Detail (C-3) + Challenge Results (C-4) — the standings pair (2026-07-29, CODE + DB)** — Two screens built to `Forge Challenge.dc.html` and `Forge Challenge Results.dc.html`, the latter under `Challenge-Results-Wireframe-Spec-C4` v1.1. **C-3 (migration 0064)** is the live leaderboard: the crown emerging at 0.34, the 7.5s ember, the ~10s glint sweep, a season timeline of week segments, and a race line that is COMPUTED — the design typed `yourRank: '2nd'` and `'Marcus leads by 2 workouts'` as literals that merely happened to agree with the seed roster. Real data exposed four design defects: "WKTS" was hardcoded three times (blocking 13 of our 14 metrics), a tie at 4 workouts was given ranks 3 and 4 by array order with the podium going to whichever sorted first, the roster rendered five blank gradient discs on the one screen whose job is telling competitors apart, and rows were inert. Ties now share a place and read "T-3"; avatars are real; rows open profiles. CS-D3 shows up once: the design greys out athletes who have gone quiet, which is a soft failure marker — momentum is positive-only ("+3 this week" or nothing). **C-4 (migration 0065)** is the frozen result, and reads `challenge_results` rather than recomputing — CS-D17/§8 make the result immutable, so a workout backfilled into a closed season cannot move it. **Four spec requirements the design did not meet:** co-winners (CS-D15 — the design renders `FINAL[0]`, one champion always, silently erasing a co-champion from their own win); full standings (§5 — the design shows top 5 and swaps your row in if you placed lower, so 12th-of-38 renders in the 5th slot, which its own notes flag as misleading); no manufactured loser (CC-D3 — the design's two-athlete case labels your row "Lost the duel"); and **no streak comparison (§6.3, Firewall)** — the design's "Longest Streak" card is precisely the squad-surface streak comparison §6.3 names and forbids, so it is not computed. The other two Season Moments survive as derived badges (§6.1/CC-D4), computed for real: most distinct training days, and biggest climb from the halfway standings. **Two fabricated statistics dropped:** "PRs set" was `3 + hash(name) % 16` and "Honors earned" was `min(3, field)` — PRs are counted for real; the honors tile became athlete-days. **THE HONOR ROW IS DELIBERATELY ABSENT.** The design renders "HONOR EARNED · Forge League — Silver · Added to your Legacy · tap to view" and navigates to Honor Engraved; we have no HonorInstance, no ChallengeEvaluator (`Honor-Catalog-Amendment-001`), and the Honors screen is a stub — that row would promise a record the app cannot show. §9.7 anticipates this state. The generic honors note was also withheld, since "appear on each athlete's record" is still a forward promise; what ships is the one true claim — the result is permanent and stays in your competition history. **Also closed the design's own flagged gap:** a completed season had no route to its final standings — Competitions history cards now open C-4, and C-3 grows a "View Final Standings" button once closed. **Deferred:** the "Hall of Champions ›" link (§7), C-5 unbuilt. **Not ported:** the shimmer's second-asset alpha mask and the crown's radial dissolve (CSS `mask-image` + `mix-blend-mode: screen`, no RN equivalent). **Verified:** tsc 0 · lint at baseline · 416/416 · export clean; deployed. **Migrations 0064 + 0065 must be RUN by hand, after 0063.**
14. **Squad Records (C-6) — the record book (2026-07-28, CODE + DB)** — New route `src/app/squad-records.tsx`, built to `Forge Squad Records.dc.html`, reached from Squad Detail → Options. Faithful: the letterspaced-uppercase record-book AppBar (not the DS title treatment), the "these marks only ever rise" intro + tracked-count line, the two-tier row (bronze border + wash when newly broken, plain charcoal otherwise), 40px icon tile, the NEW plaque pill, holder attribution, right-aligned Playfair value, founded footer, and the history sheet with its newly-broken banner, crowned current holder and previous-holders column. **Migration 0058** stores one row per REIGN rather than per record: the current holder is simply the highest `value` for a (squad, kind) — which is what "marks only ever rise" means — and everything below it, descending, IS the lineage. `refresh_squad_records()` is lazy (no scheduler, same as the weekly recap) and writes a new reign only when the standing mark is beaten; a unique (squad, kind, holder, value) makes re-running idempotent. **TWO HONEST DEPARTURES, agreed before building:** (1) **Lineage starts now** — who held a mark before today was never recorded and cannot be reconstructed; raw workouts say who is best NOW, not who led in March and when they were overtaken. The book begins here and fills over months, and the sheet says so rather than showing a convincing blank. (2) **Five records, not six — Longest Streak is out.** Nothing tracks streaks: no table, no definition of what breaks one. Half-inventing it for one card would put a number on screen no other surface could corroborate; `kind` has room for it when streaks exist. **Design defects not carried over:** holder rows are inert in the `.dc` → they open the athlete's profile here; the `.dc` drops the unit on a newly-broken record leaving the number unitless → both unit and delta shown; avatars are the DS `Avatar` with real photos, not initials-on-gradient; the sheet is the app's drag-dismissable `BottomSheet`; a real empty state replaces none. **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean with `/squad-records` emitted; deployed. **Migration 0058 must be RUN by hand, after 0057.** Design re-verified against the remote via the design MCP — byte-identical to the local mirror.
15. **SQ-D14 Commitment + the join acceptance gate (2026-07-28, CODE + DB)** — Closes a LOCKED requirement the join flows were built without. SQ-D14 states every squad has a short Commitment (values like "Show up. Encourage others. Train consistently") and that "an athlete accepting a squad invitation is shown the current Commitment text and must acknowledge it before completing the join" — flagged in the architecture as "a requirement that flow must satisfy when authored". We authored the flow (0040 code, 0050/0052 request) and didn't satisfy it. **Migration 0055** adds `squads.commitment` (200 chars — SQ-D14 §2 deferred the cap to S-3 implementation, and S-3's 60-char purpose precedent is too tight for the doc's own four-value example at ~62), plus **`squad_by_code()`** — resolve an invite code WITHOUT joining, since 0040's RPC resolved-and-joined in one step and left nowhere to put the gate — and a `p_accept` parameter on both `join_squad_by_code` and `request_squad_join` that **refuses with `commitment_required`**, so the gate is enforced server-side, not merely drawn. Surfaces: join-by-code became two stages (code → squad identity + Commitment + accept → join); Squad Preview shows a Commitment section and requires acceptance inside the request sheet; Squad Settings authors it. A squad with no Commitment skips the gate entirely — nothing to agree to. Shared `CommitmentPanel` / `AcceptCommitment` components so a values statement can't render four slightly different ways across four surfaces. SQ-D14 §4 respected: acceptance, never enforcement — nothing scores or polices behaviour against it afterwards. **Second finding, recorded not resolved:** SQ-D14 §1 says any member may edit the Commitment, "same governance as squad name/purpose (S-3 §4.3)" — and **S-3 §4.3 does say all members can edit squad identity**, which the built app contradicts (owner-only, per `Squad Settings Member.dc.html` rendering the member view read-only). PD-7 makes the design authoritative, so the Commitment follows owner-only and **S-3 §4.3/§6.2/§12 is added to Amendment-003 §5 as a doc correction owed**. **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean; deployed. **Migration 0055 must be RUN by hand, after 0054** (pre-0055 the client falls back to the ungated join it already had).
16. **Notification feed + bell — the first notification surface (2026-07-28, CODE + DB)** — New route `src/app/inbox.tsx` ("Notifications") + a `NotificationBell` AppBar action on Home carrying the unread count, and the Squads tab badge for pending join requests. **NO `.dc` EXISTS** — `Forge Notifications.dc.html` is the P-5 push *preference* set, not an inbox — so this was authored to the app's established language rather than invented: the slate ground + AppBar of every pushed screen, the bronze uppercase section labels (11px/1.6) from Discover/Preview/Join Requests, their divided list card, the 46px leading identity slot from the Join Requests row, and the 76px ringed disc + Playfair 21 empty state copied in proportion so the two read as siblings. **Migration 0054** deliberately has **no `notifications` table**: the feed is DERIVED at read time from rows that are already true (the join-request queue + squad membership), so there's no fanout writer to keep in sync and an event can't outlive the fact behind it. Read state is one timestamp — `profiles.notifications_seen_at` — trading per-item read marks (nothing needs them yet) for having no second table. `notification_events()` is the union; `notification_feed()` and `notification_unread_count()` are thin wrappers over it so the list and the badge can never disagree. Four kinds, all squad-membership for now: join_request · member_joined · request_approved · request_declined. Wording follows the anti-shame guardrail — a decline states the outcome, never a judgement. Seen is marked AFTER items resolve, so the rows you're looking at keep their unread wash and the line moves for next time. **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean with `/inbox` emitted; deployed. **Migration 0054 must be RUN by hand, after 0053** (until then the bell reads 0 and the feed shows its migration message). **NOT built: real push** — no `expo-notifications`, no device tokens, no sender, and push needs a native build; P-5's toggles still record intent only.
17. **Squad-Architecture-Amendment-003 — size ceiling 10 → 50, open joining RETIRED (2026-07-28, DOCS + CODE + DB)** — Two product decisions taken after Discover shipped and made the tension visible. **(1) SQ-D1a: squads hold 50, amending SQ-D1's locked 10** — the 10 figure predates Discover and the design's own public squads run 15–48; SQ-D1's "small is intentional" reasoning is retained, 50 is still an order of magnitude below a Community. **(2) SQ-D16: open (instant, unreviewed) joining is removed** — the invite code (0040) already lets specific people in without ceremony, *including on a private squad*, so open served only "I want strangers but won't review them"; and it contradicts **SQ-D2**, which lifts the Performance Firewall inside a squad precisely because members chose each other. A stranger self-admitting into shared progress/streak/feed/standings with zero owner action is the one case that justification doesn't cover, and the owner's only recourse was removal *after* disclosure. Three doors remain: invite code · request→approval · (retired). **Migration 0053** drops `squads.join_mode` and `join_public_squad()` rather than leaving them inert, bumps `member_cap` default to 50 (and updates existing rows), and redefines `discover_squads` / `squad_preview` / `create_squad` without join_mode. Surface removed across four screens: the green Open pill + bronze-fill "Join Squad" CTA (Discover), the Open pill + two "open squad" note variants (Preview), the Joining segmented control (Create Squad, Settings); **"Request to Join" inherits the primary button weight**, so Discover and Preview now agree. **`Docs/Amendments/Squad-Architecture-Amendment-003-Size-And-Joining.md` (LOCKED)** records it, including a deliberate, documented **departure from PD-7** — both `.dc` files treat Open as first-class and it's being cut anyway, because the design predates the invite-code mechanism it would have been compared against. Flags the consequence to watch: at 50 members SQ-D2's justification rests entirely on per-athlete approval, so reversing SQ-D16 requires re-examining SQ-D2. Names 3 docs still carrying superseded values. **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean. **Migration 0053 must be RUN by hand, after 0052** (the new client degrades safely against a 0052 database — cap reads 10 and Create Squad drops the category, nothing breaks).
18. **Squad Join Requests — the owner's approval queue; the join loop CLOSES (2026-07-28, CODE + DB)** — New route `src/app/squad-requests.tsx`, built to `Squad Join Requests.dc.html`: squad header · "PENDING REQUESTS" + bronze count badge · the request card (46px avatar · name · rank·type line · trust chip · overflow menu · waiting-time pill · the athlete's note as a clamped italic quote with Read more) · Decline/Approve at the design's 1 : 1.7 weighting · the `jrLeave` exit (fade + slide right + measured collapse) · owner-only footer line · empty state with Invite Athletes. Reached from a new **Membership → Join Requests** row in owner Squad Settings, carrying the design's live count badge. **Migration 0052** adds `squad_join_requests.note`, `squad_pending_requests()` (owner-gated definer read — the queue plus "squads you're both in", which needs `squad_members` for squads the owner may not belong to), and owner-gated `approve_squad_join_request` / `decline_squad_join_request`. **Approve is the only path that adds a member without that member acting, so it enforces the size cap itself** — a full squad refuses and the request stays pending rather than overfilling; decline marks the row `declined` (not deleted) so a re-request updates it instead of duplicating. The design's note block had nothing that could write a note, so `request_squad_join` widened to carry one and **Squad Preview's "Request to Join" now opens a short optional-message sheet** (instant joining stays one tap); the client falls back to 0050's note-less signature if 0052 isn't applied. The overflow menu — dead in the design ("More options coming soon") — opens the athlete's profile or declines. **Two trust signals dropped as BLOCKED:** "N Mutual Athletes" and "Follows You" both need a friends/follow graph that doesn't exist; "N Mutual Squads" is real and ships. Presence dot dropped for the same reason as on Preview. **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean with `/squad-requests` emitted. **Migration 0052 must be RUN by hand, after 0051.** With this the Social Part 1 join loop is end-to-end: Discover → Preview → request (with a note) → owner reviews → approve → real membership.
19. **Squad Preview — a non-member's read-only view of a public squad (2026-07-28, CODE + DB)** — New route `src/app/squad-preview.tsx`, built to `Squad Preview.dc.html`; it's where a Discover card now lands (an already-joined card skips it and opens the real Squad Detail). Full design: title-less AppBar · shape-matched skeleton · hero (80px ringed crest · uppercase serif name · motto · join/category/capacity pills) · three-column stat strip (Members · Training Today · Founded) · Current Goal with the `pvBar` grow-in · About under Smart Omission · three-member roster peek with owner pill + activity line · the privacy note in all four variants · fixed commit bar with the same four-way CTA as Discover. **Migration 0051** adds `squad_preview()` — one SECURITY DEFINER read that assembles the whole screen and gates ONCE (public squad, or you're already in it), because every part of it sits behind member-scoped RLS: the roster (`squad_members`), live check-ins (`squad_checkins`), and the cross-member goal total (`squad_metric_total`, which returns 0 to a non-member **by design** — exactly who this screen is for). Rather than reimplement that total, 0051 **splits 0048's function into a gate + a reusable `squad_metric_sum`**, so Preview and Detail can't show different numbers for the same goal; `GOAL_UNITS` moved to `squad-live.ts` for the same reason. **Three design defects fixed because the data is real:** "Open Squad" navigated to a HARDCODED squad id (now opens the squad you're looking at); the crest rendered an empty `image-slot` for every squad while the computed crest was never consumed (now the real photo or chosen glyph); roster avatars were arbitrary gradient tints (now real photos with the design system's initials fallback). **Not carried over:** the roster's green "online" dot — there is no presence subsystem, and a fabricated dot is worse than none; the activity line instead reports what we know (a live check-in, or a workout logged in the last day). **Verified:** tsc 0 · lint at baseline · 416/416 · web export clean with `/squad-preview` emitted. **Migration 0051 must be RUN by hand, after 0050.** Remaining gap: a queued request still has no owner-side approval surface (`Squad Join Requests.dc.html`) — the next build.
20. **Discover Squads — public squad discovery + join/request (2026-07-28, CODE + DB)** — New route `src/app/discover-squads.tsx`, built to `Discover Squads.dc.html` and wired to real data: search · category chip row · "PUBLIC SQUADS · N squads" header · three-card skeleton · squad card (crest disc · name · motto · "Most active this week" · capacity/join tag · members + training-today · four-way action button) · both empty states · Create-a-Squad escape hatch. The Squads Hub search icon now routes here (was a "coming soon" toast). **Migration 0050** adds the three squad fields the design's cards read and nothing could set — `category` (the filter chips), `join_mode` (`open` → instant join / `approval` → request), `member_cap` (default **10**, SQ-D1's durable per-squad maximum, driving the "N left"/"Full" tags and the full-open-squad → approval fallback) — plus `squad_join_requests` (the approval queue) and `discover_squads()`, a SECURITY DEFINER read that resolves member counts + trained-today **for a non-member**, closing the gap 0029 flagged and deferred ("revisit at Discover"). 0050 also **closes a real RLS hole**: `squad_members_insert` checked only `user_id = auth.uid()`, so any authenticated athlete could insert themselves into any squad, private ones included — direct insert is now the founder path only; every other join goes through a definer RPC. Category + Joining authoring added to **Create Squad** and **Squad Settings** (owner) as the prereq; both read the 0050 columns through a separate tolerant fetch so an unapplied migration hides those controls instead of breaking the screen (the containment pattern `fetchSquadInvite` established for 0040). **Verified:** tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 416/416 `node --test`. **Migration 0050 must be RUN by hand, after 0049.** Two honest gaps, both their own next builds: the design's card tap goes to `Squad Preview.dc.html` (unbuilt — a joined card opens the real Squad Detail; an unjoined card isn't itself tappable, its action is the button), and a queued request has no owner-side approval surface yet (`Squad Join Requests.dc.html`).
21. **Project Audit + Legacy/Settings build sweep (2026-07-23, AUDIT + CODE)** — Repository-wide audit reconciled the dashboard to the built tree (was 4 sessions stale at 287 files/40k/18 routes/200 tests/14 migrations → now **334 TS/TSX · 52,713 LOC · 31 routes · 385 `node --test` green · 24 migrations · tsc 0 · lint clean**). Sessions 07-19..07-23 shipped, verified per-unit: **Home Gym** (owned-equipment gating, per-exercise `EXERCISE_GEAR`) · **Exercise Library/Picker → real 794 catalog** (retired the 26-item demo) · **coaching content** 732 published/62 held · **Activity History (W-18) + Activity Detail (W-19)** · **Program Detail** + real progress · **Exercise Detail (W-22)** · **P-1 DISSOLUTION** (`P-1-Dissolution-Amendment.md`; avatar → Account Settings; PD-7 established) · the **Settings ecosystem** — Account Settings + Profile Visibility (P-6) + Notifications (P-5) + Preferences (P-4b) with a **real app-wide Units system** (lb canonical, display-only via `useUnits`) · **Accomplishments L-12/13/14** full CRUD (0023) · **Pinned Legacy museum + L-13 pin manager** (0024, accomplishments pinnable, cap 6). **Two audit findings: (1) the ENTIRE 07-19..07-23 build is UNCOMMITTED — ~484 working-tree changes on `feat/home-onramp` (HEAD still the on-ramp commit `49eac8e`); a commit sweep is owed. (2) Social (Squads/Friends/Communities) + Goals are now the ONLY placeholder cluster.** Migrations 0021–0024 must be RUN by the user in the Supabase SQL editor. Next: commit sweep, then Goals (small) or the social backend (large).
22. **P-1 Dissolution Amendment — docs reconciled to the design layer (2026-07-20, DOCS)** — New `Docs/P-1-Dissolution-Amendment.md` (LOCKED) records a change **the design executed and nobody wrote down**: **P-1 Profile and P-4 Settings Root are dissolved.** Discovered mid-build — two hours of settings planning had proceeded on a documented entry path (avatar → P-1 modal → Settings row → P-4 → P-5/6/8/9) whose **first three hops no longer exist**. Evidence, all in-source: `Forge Settings Root.dc.html:127` redirects to Account Settings before rendering; the App Bar avatar is wired `aria-label="Account settings"` straight to Account Settings on both host screens (`Forge Home.dc.html:354`, `Forge Legacy.dc.html:633`); there is **no `Forge Profile.dc.html` at all**; Account Settings already carries P-1's Tier 1 identity header. Mention-count proof of the content move: **Pinned Legacy** — P-1 spec 20 / L-1 spec 0 / built `legacy.tsx` 5. A repo-wide grep for any amendment covering either change returned **zero matches**. The amendment redistributes all 11 P-1 tiers (§2), reroutes **4 stale L-1 → P-1 destinations** (lines 431/455/874/876 — both fallbacks were already dead: P-3 retired, L-12 since specced), re-parents P-5/6/8/9, and records **5 orphaned capabilities with locked dispositions** (§4). Also flags **My Standard** and **Trophy Case** as built-but-unspecced and **explicitly declines to bless them retroactively**. Supersedes `Profile-Progress-Ecosystem-Audit.md` §1 ("ecosystem health: CLEAN") — that audit compared the docs to themselves, never to the design, which is the exact failure mode this amendment corrects. Establishes **PD-7: where docs and the design project disagree, the design governs and the docs are what get corrected.** §5 names the eight documents needing edits; **this amendment records them, it does not perform them** (tracked in its own §7).

Newest first. Never delete — trim only when over ~20.

23. **First-run on-ramp — guided tour, First Honor Ceremony, Initiative honor, Honors Hub (2026-07-19, CODE + DB + DOC, COMMITTED + PUSHED · `feat/home-onramp`)** — Completes the fresh-athlete on-ramp after Amendment-002. **Guided tour:** on the first move (program built/chosen) the forged **First Honor Ceremony** (Design b029488a "Forge First Honor Ceremony") fires → **"Keep Building"** runs an auto 4-tab tour (Home→Workouts→Legacy→Squads) → auto per-tab first-visit walkthroughs on Workouts/Legacy/Squads/Friends. Device-local flags (`lib/tour`, `lib/screen-prompts`, reset on account switch); `TourProvider` + `TourOverlay` + `ScreenTour`. **Reverses the LOCKED "no feature tour" Non-Behavior** (now post-move, opt-out) — governed by **Onboarding-Amendment-003** (LOCKED). **Initiative honor** — a real persisted honor (the "first move"), earned by program **build** or **choose** (client RPC `claim_initiative_honor`, migration **0014**) **or** first workout (`evaluate_honors` branch, migration **0015**), DB-idempotent to one row; **narrows the binding ONB-D22** for the pick/build early-grant (the workout-first path is D22-compliant) — governed by **Honor-Catalog-Amendment-003** (LOCKED). **Honors Hub** (L-10 + L-11 detail sheet, Design "Forge Honors Hub") reads `honor_instances` live + a code honor catalog (`domain/honor/catalog`, the map's 13 categories/glyphs); ceremony's **"View Honor"** → hub → back → tour resumes. **Verified:** tsc 0 · eslint no-new-findings · **200/200** tests · live at forgelegacy.expo.app; **both honor round-trip proofs PASS against the live DB** (pick/build via `initiative-roundtrip`, first-workout via updated `honor-roundtrip`). **Commits:** `5dc6f29` (feature) · `ceb6432` (amendments) · `49eac8e` (third trigger). **Migrations 0014 + 0015 applied to the DB.** **Parked with the Docs backlog** (not swept into feature commits): the inline count-table reconciliation of `Honor-Catalog-v1.0-LOCKED.md` (v1.6 / +initiative) — the two LOCKED amendments are the governing record meanwhile.

> **⚠ On the "working-tree" / "Not yet committed" tags in the entries below:**

10. **Progressive onboarding — onboarding cut to identity-only + Programs hub (2026-07-19, CODE + DOC, working-tree)** — PO friction pass. Onboarding cut from 7 steps to **2 (Account [name/sex/units] + Username)**; Goals/Experience/Equipment/Schedule/Program/Athlete-Type all removed from the pre-Home flow. The finish now writes **`athlete_type = 'Hybrid'`** (a neutral default — type isn't asked; PO: "I don't even know if we need to know what type of athlete they are") and **`environment = null`** (no migration — column already nullable). **Honesty:** verified nothing user-visible depends on the *self* athlete type in V1 (Home rank medallion off; athlete-type shows only on *other* athletes' placeholder profiles), so the Hybrid default has no visible regression. First-Home awaiting card → **[Start Training] + [Programs]** ("Programs," not "Browse Programs," so build-your-own isn't read as prebuilt-only); Programs tab "Build Your Own" now routes to the Program Builder (express, was a `() => {}` no-op). Dead `build_own`→FirstProgramCard Home branch + `programIntent` read removed (FirstProgramCard.tsx + program-intent.ts now orphaned — reuse candidates for the opt-in recommendation flow, A2). Authority doc `Docs/Amendments/Onboarding-Amendment-002-Progressive-Discovery.md` (LOCKED; ONB-A2-D1…D5) rewritten to the final model. **Verified:** tsc 0 · eslint 0 · **196/196** tests · web export clean · assets 200 on prod. **Live:** isolated fresh-signup round-trip proves the null-environment / Hybrid finish commits + Chapter I active/empty. **Demo account (re)created** — `isaiahaltamirano@gmail.com` didn't exist in the project (that's why sign-in 401'd); created + onboarded + verified. **STILL TO BUILD (opt-in + discovery):** A2 "Get a recommendation" flow (level+equipment → environment → recommend, from Programs tab) · B1 Explore-Forge Home section · B2 per-surface first-visit banners · B3 post-first-workout moment. **ONB-A2-D5 honesty boundary:** discovery nudges ship full-force (copy + routing) but terminal social actions stay inert until the social backend (friendships + squad_members + RLS + RPCs) lands — separate pre-release workstream, not this scope; no fake completion (ONB-D22).
 those are **dated snapshots, accurate at time of writing** — the design-handoff work has since **landed on `main`**. See git **`70866df`..`3daedb6`** for the committed state. Do not re-derive doubt from a stale "not committed" tag.

10. **Project Audit — Dashboard reconciled to the real committed tree (2026-07-15, docs-only, board stays UNCOMMITTED)** — Ran a fresh repository-wide audit against the mandate in AGENTS.md and corrected the board's stalest failure: the six-dimension Dashboard, Project Health, Implementation Status table, Statistics, and Repository Evidence all still read **Code 0% / Testing 0% / "unmodified Expo Router starter" / 19 files / zero feature code** — cells that predate the *entire* design-handoff implementation. (Root cause: prior sessions updated the buried Implementation-Status *narrative paragraphs* — which correctly showed "143 tests", real commits — but never the *summary tables* above them, so the headline numbers drifted into an outright lie about state.) **Every corrected number traces to evidence, derived not guessed:** `git ls-files src/` = **227 tracked TS/TSX (+14 `*.test.mjs`) · 33,229 LOC**; `git rev-list` = **56 commits / 45 touch `src/` / 17 feature-code this session**; `node --test` = **176 pass / 0 fail across 14 files**; `tsc --noEmit` = **0**; `expo export --platform web` = **clean (`Exported: dist`)**. **Honesty carry-through applied to the audit itself:** (1) *shipped ≠ verified* — Code Implementation (~15%, an explicitly-labelled blend of ~8/80 live MVP screens ≈10% + a substantially-complete design-system + typed domain/data foundation) is reported separately from Testing (176 green); neither borrows the other's credibility. (2) *coverage % is genuinely not instrumented* → Testing reports the test count and reads **"not measured"** for a coverage percentage rather than inventing a plausible figure — a fabricated 80% would be the same class of lie as the 0%. (3) *done vs deferred-honest* — inert shells, the ranking-direction seam, and asset-blocked placeholders are reflected as intentional, not as gaps dragging a number down. (4) *the number's denominator is stated* — **backend-wired = 0%** (every screen reads placeholder data), Phase-4 artwork blocked, shelved Community built-not-live, and the untracked Docs/Programs churn are all named as exclusions. Also recorded honestly: repo-wide **ESLint = 1 pre-existing error** (`use-color-scheme.web.ts`, react-hooks/set-state-in-effect — an app-shell prereq, not an authored unit) + 14 warnings, while authored per-unit surfaces are clean — so "ESLint clean" is scoped to changed files, not a blanket repo claim. Cells corrected: Dashboard (Code/Testing rows + Current Phase), Project Health (Code/Testing/OVERALL), 30-second read, Current Focus tail, Implementation Status table (Frontend/Navigation/State-Management/Testing/Components), Project Statistics (commits/tests/coded-areas/LOC), Repository Evidence (files/commits/tests + new Lint/Build-gates rows), header Last Updated + Audit Basis. **Secondary staleness flagged (not mass-edited):** the older Recently-Completed entries below still carry "Not yet committed (working-tree)" tags — that work is in fact committed on `main` (`70866df`..`3daedb6`); the tags are historical-at-time-of-writing, superseded by git history. Board intentionally left uncommitted per its established pattern; no product code touched.
10. **Design-handoff Phase 2 — Home re-layout to the handoff screen, core deliverables (2026-07-14, CODE, working-tree)** — Rebuilt Home ([src/app/index.tsx](src/app/index.tsx)) toward `Forge Home.dc.html`, retiring the fused artwork-less `MissionCard` (PO: "screens win; don't drift toward the fused card"). **New components:** (1) **`compositions/TodaysWorkoutCard`** — the resolver-driven "Today's Workout" hero; consumes ONLY the resolved artwork object (`resolveHomeWorkoutArtwork({ user: getSelfProfile(), workout, program, exercises: enrichSessionExercises(...) })`) + display strings, holds no classification logic; renders the faint top-right art via `expo-image` (RN has no `mix-blend`/`mask`, so opacity + a `LinearGradient` edge-fade — an accepted platform delta) with a graceful bronze-wash fallback when unregistered. (2) **`compositions/ProgramMissionGrid`** — the 2-col Program|Mission grid; Program tile reads the REAL active program (`getActiveProgram()` → name + `completed/total` + `ProgressBar`), Mission tile is a HOME_DATA placeholder (no Goal backend). AppBar avatar now reads `getSelfProfile().name`. **Artwork into the app:** copied the 4 resolvable collections (**72 prototype-crop PNGs**, male+female) from `design_reference` → `assets/artwork/` (same layout, so the resolver's `assetPath` lines up 1:1; Legacy/Honors NOT copied — reserved); generated `home-artwork/asset-registry.ts` (`assetPath → require()` map — Metro needs static literals) + `resolveArtworkSource`. **Registry-coverage test** (`home-artwork/__tests__/asset-registry.test.mjs`) enumerates every manifest-producible assetPath and asserts each has a registry entry AND a real file — fails loudly on any 1:1 drift (never a silent broken image). **Non-destructive (PO):** `HOME_DATA` intact (feeds Mission tile + a compact chapter heading), `MissionCard` kept as a marked-legacy file, `HomepagePrinciple` + `TrainTogetherCard` unchanged, `.docx`/domain-data untouched. **Verified:** `tsc` 0, ESLint clean, **130/130 `node --test`** (incl. the new 4-case coverage test); **`expo export --platform web` builds clean (exit 0, 1418 modules)**, and Expo static rendering executes the Home route without a render crash — its exported HTML contains the real data ("Today's Workout", "Confidence Builder", "Full Body", "7"+"Exercises", "Strength Foundation I (3-Day)", "Current Program" `0 / 18`, "Mission", "Chapter III"), with all 72 artwork assets bundled incl. the resolved `training-splits/male/full-body.png`. **Env limitation:** no browser/emulator to capture a live screenshot — `npm run web` / `npx expo start` to view. **Follow-up:** full-screen match (ornate chapter title-block w/ rank medallion, "Your Circle" presence rework, Quick-Actions row), then Phase 3 (peripheral screens) + Phase 4 (high-res masters + real neutral art). Not committed.
10. **Design-handoff — Programs `.docx` → structured data conversion COMPLETE + PROMOTED (2026-07-14, CODE, working-tree)** — Converted the authored `Programs/*.docx` (the authoritative program content) into structured `ProgramDefinition` JSON and wired Home's runtime accessors to the real data, under a strict **PO data-protection rule** (append/annotate-only; `.docx` never edited/deleted; nothing guessed — ambiguities flagged for PO at a review gate before anything became authoritative). **Pipeline** (`src/domain/training/ingest/`, `.mjs`, non-destructive, zero-dep): `extract.mjs` (own `.docx` ZIP reader → `word/document.xml`; parses metadata + week-blocks + Workouts A–D + warm-up/main + per-exercise sets×reps×rest, incl. the Weeks-5–6 top-set/backoff "intensity" format and inline "Approved substitution"; a **source-verification guard** refuses to emit any file that isn't a real program spec), `match-exercises.mjs` (exercise NAME → catalog `id` by name/alias/token-set/family; unmatched → candidates + recommended pick, never invented), `derive.mjs` (derives the fields the `.docx` don't state — difficulty/structure/per-workout modality+split/theme — each with rule + confidence, **reusing the Phase-1 muscle bridge** for split), `generate.mjs` (emits only PO-approved LOCKED programs; aborts on any dangling catalogKey). **Review gate → PO decisions applied:** generated the **2 LOCKED** programs only — **Strength Foundation I (3-day)** (theme `beginner`, structure `full_body`, 60 prescriptions) and **Strength Foundation II (4-day)** (theme `strength`, structure **omitted** — Workout B is an `upper` accessory day, so per-workout `split` is used instead of asserting a false program-level `full_body`; 81 prescriptions); **HELD** Foundation I (4-day) — Status DRAFT (don't convert unlocked specs); **EXCLUDED** Foundation II (3-day) — its `v1.0.docx` is actually the Foundation **I** Research & Benchmark file (mislabeled source; PO to supply the real spec). 17 exercise names auto-matched + 10 PO-confirmed equipment picks; **all 27 catalogKeys validated to exist** in `exercises.json`. **Promotion:** additive schema (`ProgramDefinition`/`ProgramBlock`/`ProgramWorkout`/`ExercisePrescription`/`WarmupItem` — Phase-0 types untouched); typed loader `training/programs/index.ts`; pure runtime adapter `active-program-core.ts` + app wrapper `active-program.ts` now back `getActiveProgram()`/`getPrograms()`/`getNextWorkout()` with real data (active demo program = Foundation I 3-day; next = "Confidence Builder", `full_body` → resolver `training_split:full_body`, neutral). **Fabricated `training/placeholder-data.ts` DELETED**; the two placeholder-specific tests retargeted to real data (barbell-back-squat → dumbbell-goblet-squat; split lower → full_body). **Verification:** `tsc --noEmit` 0 errors, ESLint clean (new surface; 4 pre-existing warnings in `exercise-relationships/*` untouched), **45/45 `node --test`** (one-active invariant + 7-check program validator + resolver §16 matrix, all green against real content); `git status` shows **0 content changes to any `.docx`**. **Known content gap (not a bug):** only Strength programs are authored — every other family folder is empty — so `program_theme` and non-strength `modality` artwork stay unexercised against real data until more families are authored. **Also flagged (not mine to fix):** a pre-existing uncommitted `Stength`→`Strength` folder-name typo-fix in `Programs/` (git index still has the typo; `.docx` intact). Not yet committed.
10. **Design-handoff Phase 1 — Home Workout Artwork Resolver + asset manifest + §16 test matrix (2026-07-13, CODE, working-tree)** — Production port of the handoff's `forge-artwork-resolver.js` (Spec v1.0) into a new **dependency-free, deterministic** TypeScript module `src/domain/home-artwork/`, consuming the Phase 0 data model (Recently Completed #2). Files: (1) **`resolver.ts`** — the 7-rung precedence entry point (`resolveHomeWorkoutArtwork({user,workout,program,exercises}) → {collection,key,sexVariant,confidence,reason,source,assetPath}`); pure (no JSON/catalog import) so Metro and `node --test` consume it identically; every rung validates its key against the manifest and fails safe to the next, so the card is never blank/broken. (2) **`manifest.ts`** — the registered key→asset registry (keys verified against the delivered artwork on disk; version/aspectRatio/placement metadata), the ONLY place a file path is produced (call sites never build filenames), with **Legacy & Honors guarded as reserved** (FORGE_DELTAS §4) so they can never appear on the workout card even via an override. (3) **`bridges.ts`** — the two **Phase 1 carry-forwards as explicit, exhaustive, unit-tested lookup tables**: `MovementPattern → exercise-family` (all 18 catalog patterns mapped or explicit no-match; `isolation` from the `*-Isolation`/`Elbow Flexion|Extension` patterns; machines/bodyweight from `equipmentId`) and `MuscleId → split bucket` (push/pull/legs/core) → `splitFromMuscles` (broader-category tie-break; Legs-vs-Lower by program structure). (4) **`catalog-core.ts`** (pure) + **`catalog.ts`** (Metro JSON wrapper) — enrich a session's `catalogKey`s into the resolver's `ResolvedExercise` shape from the real 794-exercise catalog + muscle-role data. (5) **`types.ts`** — `ResolvedArtwork`/`ResolvedExercise`/`ResolveContext`. **Corrected a reference-JS latent bug:** `conditioning` artwork lives in `training_split` on disk (not `workout_modality`, which has no conditioning asset), so conditioning sessions route to `training_split:conditioning`; the reference would have returned an unregistered/broken `workout_modality:conditioning`. **Verification:** `tsc --noEmit` 0 errors project-wide, ESLint clean, **40/40 `node --test`** — a **33-case §16 unit-test matrix** (Push/Pull/Upper-Lower/Legs/Full-body/Core/Conditioning/Running/lifting-with-cardio-warmup/machines/bodyweight/isolation/theme-fallback/workout-only/invalid+valid+reserved override/male-female-neutral sex/never-broken-asset/**determinism**/**never-Legacy-or-Honors**) plus bridge-coverage tests (all 18 movement patterns + all 29 muscle ids covered, and every value present in the real catalog is mapped) plus real-catalog enrichment + a seed→enrich→resolver end-to-end (`training_split:lower`, `neutral`, `split:structured`, 0.95). Enabled `allowImportingTsExtensions` in `tsconfig.json` so the resolver's internal value imports carry `.ts` and run under both Metro (0.84.4 — supports explicit `.ts` extensions) and `node --test` (Node 24 type-stripping). **Phase 0 → Phase 1 gate satisfied: the §16 matrix is green (determinism + never-Legacy/Honors included), so Phase 2 (Home re-layout onto the resolver) is unblocked.** Not yet committed (working-tree).
10. **Design-handoff Phase 0 — data-model foundation implemented (2026-07-13, CODE, working-tree)** — First implementation slice of the new high-fidelity design handoff (`design_reference/Forge Modal Library Design/`), whose precedence rule is **built screens > `FORGE_DELTAS.md` > resolver spec > older blueprint/PRD** (divergences are intentional; do not "correct" screens back toward the blueprint). The handoff's centerpiece is the **Home Workout Artwork Resolver** — a deterministic, centralized, 7-rung-precedence function that picks the Home "Today's Workout" card art from structured data — which cannot function until the data model carries its structured fields, so **Phase 0 (data model) was built first per the handoff's own build order.** **New modules** (mirroring the existing `src/domain/*` idiom — typed `schema.ts` + placeholder seed): (1) **`src/domain/profile/`** — `Sex` (`'male' | 'female' | 'unspecified'`) + `UserProfile` + `getSelfProfile()`; **fixes the handoff's model-level sex-default bug (FORGE_DELTAS §7): a missing sex is `'unspecified'`, never `'male'`** (the neutral artwork remains a documented temporary male placeholder at the resolver layer, but the model reports neutral). (2) **`src/domain/training/`** — `Program`/`Workout`/`SessionExercise` interfaces plus the resolver's structured enums (`Modality`, `Split`, `ProgramTheme`, `ProgramStructure`, `ArtworkCollection` with **Legacy/Honors deliberately excluded — reserved, FORGE_DELTAS §4**), a `MuscleId` union mirroring `exercise-relationships/source/muscles.json`, and `getActiveProgram()`/`getNextWorkout()` (one-active invariant enforced). One active program seeded (`usr-active-powerbuilding`, `structure: upper_lower` / `theme: powerbuilding`) with a real "Lower Body A" session whose every `catalogKey` resolves against the real 794-exercise `exercises.json`. **Non-breaking** — the existing flat `HOME_DATA` / `src/types/home.ts` is untouched; migrating Home onto this model is Phase 2. **Verification:** `tsc --noEmit` 0 errors project-wide, ESLint clean, `node --test` seed suite **7/7**, and an end-to-end run of the handoff's own reference `forge-artwork-resolver.js` against the seed returns the correct deterministic result (`training_split:lower`, `confidence 0.95`, `source split:structured`, `sexVariant neutral`, never Legacy/Honors). **Two Phase 1 carry-forwards recorded (both to be explicit, unit-tested lookup tables — never string guessing):** (a) a `MovementPattern → exercise-family` bridge (our 18-value Title-Case taxonomy → the resolver's lowercase families; `isolation` derived from the `*-Isolation`/`Elbow Flexion|Extension` patterns; machines/bodyweight from `equipmentId`), and (b) a `MuscleId → push/pull/legs/core` split bridge so the resolver's muscle-group source doesn't silently miss. **Gate held:** Phase 1 (resolver port + asset manifest + full §16 unit-test matrix) is next; **Phase 2 (Home re-layout) must not begin until the §16 matrix is green — especially the determinism and "never Legacy/Honors" cases.** Not yet committed (working-tree).
10. **Onboarding reconciliation — downstream O-series + H-1 conformed to the governing Onboarding architecture (2026-07-12)** — Resolved a **LOCKED-vs-LOCKED contradiction**: the O-2 First-Time Setup wireframe (v1.1) still described a dual-path onboarding (Path Selection, a manual Athlete-Type tile step, and Prior Accomplishments entry) that the LOCKED governing `Onboarding-First-Time-Journey-Architecture-v1.0.md` (Architecture Freeze Row 4) had already superseded. **No governing product decision changed** — this brings the downstream specs into conformance per the governing §26 Reconciliation Ledger and §27 resolutions. Changes: **O-2 → v2.0** (removed O-2a Path Selection, the manual Athlete-Type step [now derived from primary goal, ONB-D8], and O-2e Prior Accomplishments [relocated to post-onboarding P-1]; added the unified Goals/Experience/Equipment/Schedule steps + the Sex artwork field [ONB-D7] + a deterministic, equipment/schedule-constrained, explainable, never-forced Recommended Starting Point [ONB-D13]; replaced the profile-reveal Completion Moment with the readiness Transition Into Forge + silent "Chapter I — Building Your Foundation" creation [ONB-D14/D16], with the earned payoff withheld to Workout #1 [ONB-D18]; added Removed-Screens traceability, forward Implementation Requirements, and Verification Scenarios A–F). **O-1 → v1.1** (added the "Your Next Chapter" five-card vision screen [ONB-D5]; affirmed one unified path; corrected the "O-2 collects Athlete Type / Chapter Invitation" boundary to derived-type + silent-Chapter-I). **O-3 ⛔ SUPERSEDED** (explicit banner + status; replaced by ONB-D14/D16; chapter naming/rename moves to L-5; retained as historical record — do not implement). **H-1 → v1.6** (added §5.5 — the ONB-D17/D17a "Active Chapter · awaiting first workout" first-run hero sub-state: bronze-outlined empty Chapter I, anticipation copy, returning line, **no progress bar/countdown/streak/shame**, Start Workout primary; O-3 authority citation marked superseded). **⛔ Scope reality (verified, reported honestly):** the reconciliation task also asked for a code refactor (remove dual-path routes/state/schemas, migrate accounts, idempotent Chapter creation, tests). A full `src/` scan confirmed **there is no onboarding implementation to reconcile** — no onboarding routes (only `index`/`workout`/`squads`/`explore`/`legacy-design-test`/`button-library-preview`/`_layout`), no data/service layer (`store`/`services`/`context`/`api`/`db` absent), no Chapter service, no recommendation engine, and no test framework (`package.json` has no test runner). The code-level acceptance criteria (unified flow, idempotent silent Chapter I, state normalization, deterministic-recommendation tests, import boundary, first-Home behavior) are therefore recorded in **O-2 §20 (Implementation Requirements, forward-looking)** so the eventual build cannot resurrect the dual path — they were not applied to code because there is no onboarding code. This pass is **documentation-only**.
10. **Exercise Coaching Content System built — infrastructure only, no content generated (2026-07-11)** — New modular domain `src/domain/exercise-coaching/` that can generate, validate, score, organize, review, version, and serve coaching content for every exercise, consuming the canonical catalog/equipment/muscle/relationship datasets without modifying them. **Mirrors the `exercise-relationships` idiom** (`.mjs` deterministic engine + generate/validate/report CLIs + `node --test` suite; `.ts` schema + query-service + integration app layer; committed JSON store + manifest). Deliverables: (1) **`schema.ts`** — normalized `ExerciseCoachingContent` (per-exercise setup/execution/tips/mistakes+1:1 corrections/breathing/tempo/ROM/cue-hierarchy/beginner/advanced/equipment-setup/spotting/safety/difficulty + editorial metadata) and the UI-safe `ExerciseCoachingView`. (2) **`engine.mjs`** — deterministic risk classifier (Standard/Technical/Specialist), 0–100 confidence engine (editorial-only, never user-shown), 17-code review-flag engine, metadata-driven generator (18 movement-pattern banks × equipment × body-position × unilateral; specific/observable cues, banned generics enforced), cross-record near-duplicate detector (flags copy-paste across *different* families/muscles only — shared-family language allowed), FNV-1a content-hash idempotency, and a workflow state machine (Draft→Auto-Validated→Needs Review→Approved→Published) where **Approve/Publish are human-only — automation never auto-publishes**. (3) **`generate.mjs`** — resumable/idempotent batch generator (10 batches: Machines→…→Specialist). (4) **`validate.mjs`** — tiered validator (FAIL/VIOLATION/WARN) + `--dry-run`. (5) **`report.mjs`** — review reports (lowest-confidence, specialist, needs-review, duplicate-wording, most-edited, missing-content, coverage/flag stats). (6) **`query-service.ts` + `integration.ts`** — W-22 Exercise Detail integration that projects a record onto HOW-TO-DO-IT/COACHING-CUES/WATCH-OUT-FOR (+ optional Safety/Advanced), **serves Published only, and leaks zero internal fields**; `whyItMatters`/`description` deliberately left to `ExerciseDefinition` (Amendment 001), not duplicated. (7) **40 tests** (schema/generation/validation/versioning/confidence/workflow/dup/flags/batch/idempotency/integration). **Verification:** TypeScript 0 errors, ESLint clean, 40/40 tests pass, validator **0 FAIL / 0 VIOLATION** on both the empty committed store and a full-catalog dry-run over all 794 exercises (272 Auto-Validated / 522 Needs Review, nothing auto-Approved; risk split 557/172/65). **⛔ SYSTEM ONLY — the committed store `content/coaching_content.json` is intentionally EMPTY; no coaching content has been generated. The batch production run is gated on explicit approval.** Not yet committed (working-tree). W-22 spec not modified (locked); the two additive Safety/Advanced sections are proposed as a future minor W-22 amendment, not applied here.
10. **W-1 Workouts Hub retired — Workouts tab root becomes W-2 Program Browse (2026-07-08)** — New `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md` (LOCKED): Home (H-1) already carries the primary daily launchpad (Chapter Card, Active Program Card, Workout CTA → W-8 directly), making a separate Workouts-tab dispatch screen redundant. The Workouts tab now opens directly to **W-2 Program Browse** (→ **v1.2** — dual entry context added: no back button as tab root, back button present when pushed from W-17/M-4). W-1's chapter-context/quick-start/next-session/recent-workouts responsibilities are confirmed already covered by H-1's existing tiers and W-2's existing Active Program section — no replacement screen was built to imitate W-1's layout. `Workouts-Hub-Wireframe-Spec-W1.md` marked SUPERSEDED/RETIRED, content preserved as historical record. Reconciled into `Home-Screen-Wireframe-Spec-H1.md` (→ **v1.5**, Risk 1 CTA-redundancy note resolved), `Forge-Legacy-Master-PRD.md` (§5/§6/§8/§17/§19, new Amendment Log row 006), `Global-Search-Architecture-v1.0.md` (§14 tab-root App Bar list), `Calendar-System-Architecture-v1.0.md` (→ **v1.0.2**, CAL-D2 forward-looking entry point retargeted to W-2's header), `Architecture-Amendment-001-Import.md` (pointer note, W-1's Import Training entry point flagged as open), and `Forge-Design-Blueprint-v1.0.md` (→ **v1.5**). **Two acknowledged, unresolved open items (not silently dropped):** (1) the Workout With Friend management queue (Claim/Dismiss/Approve/Decline for pending M-8/M-9 items) had no other specced surface — retiring W-1 removes it without a replacement; (2) the "Import Training" Secondary CTA has no reassigned home. Both tracked in the amendment (WNA-D5) and in Decision Queue below. **A follow-up audit found W-1 is also a load-bearing navigation target in ~25 additional documents** not touched by this pass — including the post-workout "Done" destination (W-17), the Train Together stack-replace target (S-10), the WwF notification system (WwF spec, S-1, S-2, S-3, P-5, M-7), the back-stack root for W-18/W-19/W-21/W-24/W-26/W-8, six Challenge-family tab-bar tables (C-1/C-3/C-4/C-5/C-6/C-7), Goal Hub's entry point (G-1, including a pre-existing unresolved routing conflict), and two other active LOCKED amendments (`Program-Architecture-Amendment-001-Active-Program-Rule.md`, `Monetization-Architecture-Amendment-001.md`) that scope rules to W-1 by name — flagged for a follow-up pass, not resolved here, since several of those destinations (the post-workout landing screen, the Train Together stack target) are real product decisions, not mechanical substitutions.
11. **Communities promoted to the 5th bottom-navigation tab (2026-07-07)** — Stakeholder direction: Communities is designed as a high-frequency, checked-daily feed (announcements, member posts — conceptually a Facebook Group at scale), not the occasional discovery surface `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (2026-07-02) assumed. New `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (LOCKED) reverses that model: bottom navigation is now **5 tabs — Home, Workouts, Legacy, Squads, Communities** (Profile still avatar-only, never a tab). `Community-System-Architecture-v1.0.md` COM-D18 (§15.5) rewritten (→ **v1.1**) to lock the 5-tab position. Home's Tier 6 "Explore Communities" module and Squads' Tier 3 secondary entry point are both **retired** as redundant — `Home-Screen-Wireframe-Spec-H1.md` reverts to its 5-tier model (→ **v1.4**), `Squads-Hub-Wireframe-Spec-S1.md` reverts to its pre-amendment tier model (→ **v1.6**); both retired sections are preserved in-document as struck-through historical record rather than deleted, matching this project's established convention for superseded decisions. Full downstream reconciliation applied: `Component-Library-Architecture-v1.0.md` (CLA-C19 TabBar → five tabs), `Forge-Legacy-Master-PRD.md` (§6/§19, new Amendment Log row 005) and `FORGE_LEGACY_PRD.md` (same sections — this file was discovered to predate the Communities subsystem entirely and was only partially reconciled, flagged for a future full pass), `Onboarding-First-Time-Journey-Architecture-v1.0.md` (Non-Behaviors), `Calendar-System-Architecture-v1.0.md` (CAL-D2 cross-references only — Calendar's own non-tab conclusion is unchanged, → v1.0.1), `Legacy-Hub-Wireframe-Spec-L1.md` (tab-position line), `Global-Search-Architecture-v1.0.md` (§14 Open Question 1, "4-tab" → "5-tab," correctly this time), and `Forge-Design-Blueprint-v1.0.md` (→ v1.4). No Community content/feed/discovery/roles/moderation rule changed — navigation-only. Community Hub itself remains architecture-only; no pixel wireframe authored yet (unchanged open item).
10. **Documentation-consistency audit findings applied (2026-07-02, post-freeze)** — A fresh documentation-consistency audit found and fixed several real propagation gaps the prior sessions' reconciliation passes had missed. **(A) Blueprint self-contradiction removed:** `Docs/Forge-Design-Blueprint-v1.0.md` → **v1.3** — despite the same-day Communities-navigation fix (item below) correcting `Home-Screen-Wireframe-Spec-H1.md` and `Global-Search-Architecture-v1.0.md`, the Blueprint's own §3 (Navigation Map), §6 (Component Usage Rules), and Self-Audit section still described the 4-tab-vs-5-tab Profile conflict as **unresolved**, citing the pre-correction H-1 v1.2 and Global Search wording — contradicting the same document's own §4/§5/§7, which already treated 4-tabs-only as settled. All three sections rewritten to state the single resolved model (4 tabs; Profile via App Bar avatar only; Communities via Home primary / Squads secondary, never a tab) with no remaining internal conflict. **(B) Stale version citations corrected** across the Squad/Profile/Honor ecosystem: `Squad-System-Architecture-v1.0.md` (Authority Chain block + SQ-D10 + footer — S-1/S-2/S-3/Honor-Catalog/Challenge-System/P-5 citations all updated to current versions), `Squad-Detail-Wireframe-Spec-S2.md` (4 stale "S-1 v1.1"/"Honor Catalog v1.4" citations → v1.5/v1.5), `Squad-Management-Permissions-Spec-S3.md` (S-1/S-2 citation), `Social-System-Architecture-v1.0.md` (footer), `P-2-Progress-Hub-Architecture.md`, `P-4-Settings-Root-Architecture.md` + Wireframe-Spec, `P-6-Privacy-Architecture.md` (P-1 and WSR-001 citations), `Profile-Progress-Ecosystem-Audit.md` — all corrected to point to current document versions (P-1 v1.3, Honor Catalog v1.5, WSR-001 v1.2, etc.). **(C) Component-registry ID collision fixed:** the Card library's 12 non-`BaseCard` files (`StatCard`, `ProgramCard`, `WorkoutCard`, `HonorCard`, `ChallengeCard`, `LegacyCard`, `MediaCard`, `FeedPostCard`, `CompactListCard`, `SectionCard`, `BannerCard`, `SkeletonCard`) all mislabeled themselves `CLA-C07` in header comments (correct only for `BaseCard`); each is now corrected to its real registry ID (`CLA-C26`, `CLA-C30`, `CLA-C28`, `CLA-C34`, `CLA-C23`) or marked `Unassigned` where no registry entry exists, with name-mismatch notes where the code name differs from the registry name (e.g. `WorkoutCard`/`WorkoutSessionCard`). **(D) Design System implementation status backfilled:** `Docs/Forge-Design-System-Architecture-v1.0.md` → **v1.1** — §14 was still missing the already-committed Navigation (`9d199a6`) and Progress (`374563f`) libraries, and §15 still listed Navigation, Progress, and Modals as "Not started"/"Remaining" despite all three being LOCKED and committed; both sections corrected, and the `ProgressRing`-owned-by-Rest-Timer exclusion language strengthened. **(E) New tracked, non-blocking item:** `Component-State-Language-Reconciliation-Note.md` (new) records that the committed `WorkoutCard` (`missed`, red-toned) and `ForgeStreakIndicator` (`broken`, "streak lost") components render language/color CLA-D9 prohibits — internal state values are intentionally left unchanged (they are legitimate states), but future revision should move the user-facing label/color to neutral terms ("Not Logged," "Inactive") consistent with Accountability Without Shame; linked from `Component-Library-Architecture-v1.0.md` CLA-D9. **Left for a future pass, by design:** Master PRD screen-inventory expansion (real gap — LOCKED features like Challenges C-1–C7, Exercise Library W-21–28, Goal Hub, Share Config are absent from the PRD's own screen list), the L-2/L-9 Legacy Timeline ID collision, the canonical-PRD decision (Decision Queue #8), and orphaned-document cleanup (2 confirmed: `Friends-Feed-Milestone-Routing-Reconciliation-Amendment-001.md`, `Program-Catalog-Stage2-Production-Plan-v1.0.md`).
10. **Communities Navigation finalized + Transformation Gallery added (2026-07-02, post-freeze)** — Two stakeholder-directed product decisions, previously recorded only in `Docs/Forge-Design-Blueprint-v1.0.md`, formalized into official architecture. **(A) Communities Navigation:** new `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (LOCKED) names Home's Communities entry point "Explore Communities" (primary discovery surface) and adds a secondary "Explore Communities" entry point on Squads — both routing to the same, non-duplicated Community Hub. `Home-Screen-Wireframe-Spec-H1.md` → **v1.3** (new Decision 13, new Tier 6/Section 9a; also corrects a pre-existing internal drift where the Tab Bar table and Section 10 mockup showed Profile as a 5th tab, contradicting Section 4's avatar-only Profile access). `Squads-Hub-Wireframe-Spec-S1.md` → **v1.5** (new Tier 3/Section 9a). `Community-System-Architecture-v1.0.md` COM-D18 gets a pointer to the new amendment (reaffirms, does not reverse, "not a 5th tab"). `Global-Search-Architecture-v1.0.md` §14 corrected ("5-tab hierarchy" → "4-tab bottom-navigation hierarchy"). `Legacy-Hub-Wireframe-Spec-L1.md`'s stale "Legacy (5th tab)" header line also corrected while editing that file for (B) below. `Forge-Legacy-Master-PRD.md` §6/§7/§19 updated (named entry points, screen counts, Amendment Log entries 003/004). **(B) Transformation Gallery:** new Legacy feature — `Transformation-Gallery-Architecture-v1.0.md` and `Transformation-Gallery-Wireframe-Spec-L17-L18.md` (both new, LOCKED), screens **L-17** (chapter-grouped, chronological browse + lightweight Add Entry sheet) and **L-18** (documentary single-entry detail, architecture-gated edit/delete). Supports photo and video; optional title/caption-reflection; a closed six-tag taxonomy (Front/Side/Back/Posing/Competition/Milestone); a reserved-but-undisplayed Chapter Cover Media field; zero likes/comments/feed/comparison/leaderboard mechanics anywhere. Reuses the Photos (L-15/L-16) precedent for chapter-scoping and original-vs-memory mutability rather than inventing new rules. `Legacy-Hub-Wireframe-Spec-L1.md` → **v1.1** (new §8a entry point; also flags, without fixing, pre-existing staleness in that document's Risks/Dependencies sections predating this pass). `Photos-Wireframe-Spec-L15-L16.md` gets a differentiation cross-reference note (no rule changed). Three non-blocking open items tracked at Decision Queue #14. `Docs/Forge-Design-Blueprint-v1.0.md` reconciled: all "pending formalization" language removed, citations updated to point to the new official docs, revision log entry added.
10. **Forge component libraries reclassified LEGACY / REFERENCE (2026-07-02)** — All 6 committed libraries under `src/components/forge/` (Buttons, Inputs, Cards, Navigation, Modals, Progress — 62 components) are now explicitly marked legacy/reference, not current visual source of truth. Reason: the visual design system is being rebuilt in Claude Design first, independent of this code. Banners added to `src/components/forge/README.md` (new top-of-file status block + a "What's actually implemented" section reconciling the real 6 flat libraries against the aspirational CLA-C01–C37 registry table) and `src/components/forge/index.ts` (barrel doc comment). **Explicitly not a deletion or cleanup pass** — nothing removed, no libraries touched beyond the doc comments. Once the new Claude Design system is approved and locked, each library will be replaced one at a time, preserving whatever is still useful: component logic, TypeScript prop contracts, accessibility behavior, barrel exports, and interaction patterns. Also backfilled this dashboard's Implementation Status, which had drifted — it still only listed Button/Input/Card as committed despite Navigation (`9d199a6`), Modals (`39f8529`), and Progress (`374563f`) having been committed since.
10. **Button Library v1.0 — visual & behavioral revision against updated Claude Design source (2026-07-01, uncommitted)** — Re-implemented all 6 button variants (`PrimaryButton`, `SecondaryButton`, `GhostButton`, `DestructiveButton`, `IconButton`, `FloatingActionButton`) under `src/components/forge/buttons/` against a revised `Button.dc.html` spec pulled from claude.ai/design project `7b89a003-0323-4193-af8a-686b1cd65d7d` ("Forge Legacy Button Component Library") — a full visual replacement, same public API (zero prop/export changes). Notable fixes, not just a re-skin: literal CSS `boxShadow`/`filter` strings (RN 0.85 New Architecture supports these natively) replace the original commit's single-layer shadow-prop approximations; corrected default text/icon color on Secondary/Ghost/Icon (was `color.accent.primary`, spec uses `color.accent.highlight`); Destructive's default fill is now a dark gradient (was a flat color); corrected per-state icon-swap semantics (selected/success auto-insert a check icon only when the caller didn't already supply one; error state no longer overrides a text button's icon at all — previously it always forced one); disabled opacity corrected 0.3 → 0.42. Added showcase route `src/app/button-library-preview.tsx` (states × configs gallery, mirrors `ButtonLibrary.dc.html`). TypeScript and lint clean; visually verified per-variant/per-state via a Playwright screenshot pass. **Working-tree changes only — not yet committed** (supersedes the visuals from commit `2d20772` referenced below once committed).
10. **Forge Design System Architecture v1.0 — Engineering Governance Document** — Authored and LOCKED `Docs/Forge-Design-System-Architecture-v1.0.md` (2026-07-01). Permanent engineering authority for all Forge Legacy reusable UI component libraries — past, present, and future. 16 sections: Purpose (authority scope, document relationships), Design Philosophy (11 principles: premium dark / bronze accent / strong hierarchy / soft lighting / minimal clutter / mobile-first / React Native–Expo / reusable primitives / composition over duplication / accessibility first / consistency over customization), Component Hierarchy (4-level model: Design Tokens → Primitives → Composed → Screens, with hard cross-level dependency rules), Repository Structure (required folder layout, mandatory and optional files per library, what must not live in `forge/`), Component Rules (10 hard rules: tokens only / no hardcoded values / context-agnostic / props over content / accessibility required / dark-mode / composition over duplication / no business logic / no API calls / no navigation), Token Rules (global vs. component-helper token split, when to use each), Naming Standards (components / folders / props / private helpers / types / barrel exports / Animated.Value initialization), State Standards (11 states with visual treatment per state), Accessibility Standards (44dp minimum targets / contrast requirements / screen reader labels / focus visibility), Composition Rules (BaseCard as source of truth / specialized components compose primitives / no duplication / slots for flexibility / intra-library imports permitted / no forking), Export Standards (library barrel requirements / root forge index structure / one-name rule / no deep imports in screens), Validation Workflow (12-step sequence: design lock → DesignSync → implementation → TypeScript → lint → export verification → architecture check → targeted commit), Verification Checklist (9 checks any reviewer can run), Current Library Status (Design Tokens + Button v1.0 `2d20772` + Input v1.0 `d309b3b` + Card v1.0 `a91fea7`/`3ac04ce`), Roadmap (9 remaining libraries in priority order), Governance (amendment process, precedence rules, maintenance obligations). Complements `Component-Library-Architecture-v1.0.md` (behavioral contracts) and `Forge-Legacy-Design-System-v1.0.md` (visual identity).
10. **Card Library v1.0 LOCKED and committed** — Authored and committed 13 card components under `src/components/forge/cards/` (commit `a91fea7`; lint fixes `3ac04ce`). **`BaseCard`** is the shared surface primitive: border, radius, padding, top-edge inner-highlight, elevation shadow, `glowing` variant bronze glow, pressed/disabled/selected states. **12 specialized cards** compose BaseCard: `StatCard` (metric/trend), `ProgramCard` (family chip, difficulty dot, progress bar, state-adaptive CTA), `WorkoutCard` (set/rep/volume summary), `HonorCard` (`expo-linear-gradient` bronze tint when earned), `ChallengeCard` (participants, deadline, progress), `LegacyCard` (featured/achieved bronze orb — radial gradient approximation), `MediaCard` (full card surface managed independently — square media area, upload overlay), `FeedPostCard` (avatar, author row, content, reactions), `CompactListCard` (row + optional ForgeToggle/ForgeCheckbox — legitimate intra-library cross-import), `SectionCard` (collapsible with ChevronRight), `BannerCard` (self-dismissing via internal useState, 4 variants with `expo-linear-gradient` tinted backgrounds), `SkeletonCard` (5 variants: base/stat/media/feed/compact, opacity-pulse Animated.loop). Shared types in `types.ts`; card-scoped visual constants in `_cardTokens.ts`. Barrel-exported from `cards/index.ts`; composites/index re-exports `../cards`. TypeScript and lint clean at commit.
10. **Input Library v1.0 LOCKED and committed** — 10 input controls committed under `src/components/forge/inputs/` (commit `d309b3b`). `ForgeTextInput`, `ForgePasswordInput` (eye toggle), `ForgeSearchInput`, `ForgeTextArea`, `ForgeSelectInput`, `ForgeNumberInput`, `ForgeDateInput`, `ForgeCheckbox`, `ForgeRadioGroup`, `ForgeToggle`. Shared token helpers in `_inputTokens.ts`, state utilities in `_inputUtils.ts`, base types in `_types.ts`. All lint-clean (react-hooks/refs useRef→useState fix applied, no-empty-object-type aliases, exhaustive-deps corrected).
10. **Button Library v1.0 LOCKED and committed** — 6 button variants committed under `src/components/forge/buttons/` (commit `2d20772`). `PrimaryButton`, `SecondaryButton`, `GhostButton`, `DestructiveButton`, `IconButton`, `FloatingActionButton`. Scale/shake Animated.Value uses `useState` lazy initializer (lint-clean, semantically equivalent to useRef). All lint-clean.
10. **V1 Architecture Freeze officially FROZEN — Row 12 (Challenge filename/version) reconciled ✅ (2026-06-30)** — The final remaining In-Progress row is now ✅ Complete. **Reconciliation decision:** the `-v1.0` suffix in `Challenge-System-Architecture-v1.0.md` is the initial-publication filename, consistent with the project-wide convention (same pattern as `Exercise-Library-Architecture-v1.0.md` at internal v1.2, `Social-System-Architecture-v1.0` at v1.1, etc.). The internal version header and §19 Amendment Log track the current state (v1.5). **A versioning note** was added to the Status block of `Challenge-System-Architecture-v1.0.md`. **Stale authority references updated** in 10 downstream docs: C1/C2/C3/C4 footer authority lines (`v1.3` → `v1.0.md (v1.5)`); C5/C6/C7 header authority block + footer (`v1.1.md`/`v1.1` → `v1.0.md (v1.5)`); `Calendar-System-Architecture-v1.0.md` inline + footer (`v1.3` → `v1.0.md (v1.5)`); `Community-System-Architecture-v1.0.md` authority block, inline body, reconciliation table, and footer (`v1.3.md`/`v1.3` → `v1.0.md`/`v1.0.md (v1.5)`); `Social-System-Architecture-v1.0.md` authority block (`v1.3.md` → `v1.0.md (v1.5)`). Amendment files 002/003/004 left unchanged — they are historical records of what they were amending. No architectural decisions changed. The V1 Architecture Freeze is now officially **FROZEN** — implementation may begin.
11. **Standalone Rest Timer — V1 Architecture Freeze row 19 marked ✅ Complete** — Authored and LOCKED `Rest-Timer-Architecture-v1.0.md` (Freeze #19, Decision #4). 22 decisions (RT-D1–RT-D22). **Timer mechanism:** wall-clock differential (elapsed = current wall-clock time − `restStartTimestamp`); no background process required. **State machine:** INACTIVE / RUNNING / BACKGROUNDED / RECOVERABLE — covers foreground, backgrounding, app kill, and cold-launch recovery. **Single-timer rule (RT-D22):** only one active Rest Timer per workout session at any time. **ProgressRing component ownership transferred from CLA:** visual contract (arc, `accent.primary` fill, `surface.muted` track, 2–3dp stroke, 72–84dp, linear fill capped at 1.0, unmount when conditions not met), scope restriction (rest-timer-specific only). **Accessibility:** Reduce Motion → static arc; VoiceOver labels on timer and ring. **Notifications:** V1 deferred (framework defined; RT-OQ-1 flagged for PO). **Persistence:** `restStartTimestamp` + `workoutSessionId` durably persisted on start; cold launch recovery with session-ID match guard. **Future platform surfaces declared:** Live Activities/Dynamic Island, Apple Watch/Wear OS companion, home screen widget (all require dedicated amendment; wall-clock strategy and persisted timestamp are the only prerequisites). **4 non-blocking open questions:** RT-OQ-1 (background notification), RT-OQ-2 (notification permission), RT-OQ-3 (max duration display), RT-OQ-4 (catch-up animation on recovery). **Downstream reconciliation applied:** `Component-Library-Architecture-v1.0.md` §1.2/§1.3/§17 pointers updated; `Active-Workout-Flow-Spec-W9-W16.md` §7.6 architecture pointer added; `W9-Amendment-003-Optional-Rest-Progress-Ring.md` governance note updated. Closes Architecture Freeze Row 19 and Decision Queue #4 (2026-06-30).
11. **Component Library / Design System — V1 Architecture Freeze row 18 marked ✅ Complete** — Authored and LOCKED `Component-Library-Architecture-v1.0.md` (Freeze #18, Decision #5). 3-tier component hierarchy: **Tier 1 Primitives** (CLA-C01–C05: Text/Icon/Divider/ProgressFill/AvatarGlyph), **Tier 2 Composites** (CLA-C06–C24: Surface/Card/Button/Chip/Badge/Avatar/ProgressBar/SearchBar/InputField/TextArea/ListItem/SectionHeader/AppBar/TabBar/Modal/BottomSheet/Toast/Skeleton/EmptyState), **Tier 3 Screen-level** (CLA-C25–C37: ChapterCard through HomepagePrinciple). 6 governing principles (CLA-P1 Earned Visual Weight · CLA-P2 Accountability Without Shame · CLA-P3 Performance Firewall at Component Layer · CLA-P4 Every Element Earns Its Place · CLA-P5 Reduce Motion Is First-Class · CLA-P6 Components Own Behavior; Screens Own Composition). 20 CLA-D decisions. Surface/Card split: Surface (CLA-C06) = generic container; Card (CLA-C07) = Surface + 8dp radius + 16dp padding + elevation contract (Card IS-A Surface, does not contain Surface). Modal uses Surface (not Card) at `elevation.modal`. ProgressRing excluded — owned by Standalone Rest Timer Architecture (Freeze Row 19). PO-confirmed: dark-only V1, Phosphor Icons as sole icon library (brand bespoke excepted), system font (SF Pro/Roboto), WCAG 2.1 AA target, semantic tokens only (hex values deferred to Branding Assets doc). 17 wireframe specs + 2 architecture docs receive header pointer. Closes Architecture Freeze Row 18 and Decision Queue #5 (2026-06-30).
11. **Global Search — V1 Architecture Freeze row 17 marked ✅ Complete** — Authored and LOCKED `Global-Search-Architecture-v1.0.md` (Freeze #17, Decision #3). Establishes two independent search categories: **Catalog Search** (Exercises FORGE+CUSTOM, Programs FORGE+athlete-owned, HonorType catalog — all client-filterable) and **Discovery Search** (Profiles, Communities — server-indexed). Governing exclusivity rule: every entity belongs to exactly one category, never both. Explicit Never-Searchable list (Posts, WorkoutSessions, Challenge standings/results, Performance metrics, HonorInstances, private Chapters/Memories/Accomplishments, rest timer history). Adopts Performance Firewall principle (CC-D2) by architectural extension to this always-on surface (CC-D2 itself governs squad surfaces only — this document's own governing decision, not a CC-D2 restatement). Privacy filters: CUSTOM Exercise/athlete-owned Programs use `authorId = :searchingAthleteId` (ownership, not a setting); Communities delegate to COM-D5; Profiles use Identity-Amendment-001 §7.1 discoverability flag (owned by Identity, surfaced by P-6 Settings). Navigation rule: always navigates to the canonical screen — never creates an alternate detail screen. Search history: local-only, query strings only, no analytics. Future Expansion governance checklist (§16) requires all six dimensions (category, privacy model, ranking, navigation target, offline behavior, indexing strategy) to be defined before any new entity may participate. Full reconciliation: `Backend-Data-Model-Architecture-v1.0.1` §14 amended to add `ProgramDefinition` and `HonorType` indexable fields; `Community-Discovery-and-Search-v1.0` §6 updated to reference this document as the now-LOCKED Global Search authority. 3 items PO-confirmed at LOCK (HonorType browsability, sectioned-results UX, entry-point standalone screen); 3 items carried forward non-blocking (entry-point affordance UI deferred to future Search wireframe spec, Program private-by-default assumption low-risk confirmation pending, inherited block-user gap). Closes Architecture Freeze row 17 and Decision Queue #3 (2026-06-30).
11. **Rank — V1 Architecture Freeze row 15 marked ✅ Complete** — Audit found the Rank system was materially closer to LOCK-ready than the dashboard reflected: `Rank-System-Architecture.md` and `Rank-Computation-Model.md` (RCM) were already LOCKED, `Rank-Calibration-Decisions.md` had already resolved Q1–Q14, and TBD-2 (sub-tier surfacing) had already been resolved by the LOCKED `P-2-Progress-Hub-Spec.md` — none of this had been reflected back into the dashboard. The one genuinely open item, **TBD-11 (Legacy display format)**, was formally closed this session via a new `Rank-Computation-Model.md` → **v1.0.1** amendment: governed by the already-LOCKED `Rank-Up-Modal-Spec-M1.md` (ceremony + Timeline Event format) and `Legacy-Timeline-Wireframe-Spec-L2.md` (Legacy display), requiring no new computational decision. Also investigated and ruled out the `Backend-Data-Model-Architecture-v1.0.1` §20 "RANK_XP" open item as a Rank blocker — it is a **Challenge-system** type deferral (per Challenge-System-Architecture's own scope decision), not a Rank schema field; Backend §20 item 2 updated to reflect the RCM's now-LOCKED status instead of "~15 open TBDs." Added a superseded banner to `Rank-Implementation-Readiness-Review.md` noting all 8 of its originally-identified blockers are resolved. **All 16 Rank TBDs are now resolved or formally closed; no Rank build blockers remain.** Closes Architecture Freeze row 15 and Decision Queue #2 (2026-06-30).
11. **Backend / Data-Model Architecture — LOCKED** — `Backend-Data-Model-Architecture-v1.0.1` is the new governing data-model authority for the entire app. Firebase (Firestore + Auth + Storage + Functions) ratified as the stack after a 3-way comparative evaluation vs. Supabase and custom (offline-first requirement was decisive). 12 runtime services defined with single authoritative-writer boundaries. Full entity model: 20+ entities canonicalized and reconciled across ~20 previously-locked specs (Account/Athlete split, AuthSession/WorkoutSession naming, Chapter/Goal/HonorInstance canonical schemas, WorkoutSession.source vs HonorInstance.source distinction, Chapter.honors[] population rule, Goal.isPrimary as source of truth). Previously-undefined entities (`Profile`, `Subscription`, `EntitlementCounter`, `TimelineEvent`, `CeremonyQueueItem`, `Notification`, `NotificationPreference`, `PrivacySettings`, `AthleteShareSettings`) all schema'd or explicitly deferred to governing source docs. Logical/Physical Storage Model split means entity model survives a future stack change. API Philosophy (6 principles: server owns all progression, offline writes provisional, Firewall enforced at query layer). Scalability assumptions documented. 6 remaining open questions tracked in §20 of the doc (Rank TBDs, dual privacy systems, deletion policy branch, RANK_XP dependency, offline sync conflict resolution, community moderation escalation). Reconciliation pointers added to 7 downstream docs (Account-Auth-Architecture, Honor-Evaluation-Service-Architecture, Rank-Computation-Model, Exercise-Library-Architecture, Social/Squad-System-Architecture, Architecture-Amendment-001-Import). Closes Architecture Freeze row 16 and Decision Queue #1 (2026-06-30).
11. **Exercise Library — Phase 5: Naming Duplicate Resolution** — Resolved all 5 flagged naming-duplicate pairs in the Launch Catalog Blueprint, locking one canonical V1 name per pair: **Box Step-Up** (kills generic Step-Up), **Back Squat** (kills generic Squat — its authored content relocated to the existing "Bodyweight Squat" row rather than lost), **Front Plank** (kills generic Plank), **Barbell Romanian Deadlift** (kills generic Romanian Deadlift), **Barbell Bench Press** (kills generic Bench Press). Catalog drops from 200 to 195 exercises; anchor count drops from 45 to 44 (Squat/Back Squat was the one pair where both sides were independently anchor = Y). New `Exercise-Naming-Standard-v1.0.md` locks 4 naming principles (prefer specific over generic; include implement/variation when multiple exist; one canonical name per `ExerciseDefinition`; retired names become aliases/search terms only — aspirational pending a schema field) plus a governance rule that published canonical names are immutable except through an equivalent formal reconciliation pass. Reconciled into the Blueprint (§§1–8, totals/tables, Change Log v1.1), 7 Population Pass docs (`Anchor-Exercise-Population-Pass-01/02/03`, `Exercise-Population-Pass-04/05/06/09/12` — content rename/migration, relationship-array retargeting, zero broken references re-confirmed), `Exercise-Library-Architecture-v1.0` (→ R1-5), `Anchor-Exercise-Authoring-Framework-v1.0`, `Program-Authoring-Standard-v1.0`, `Exercise-Difficulty-Assignment-Pass-v1.0` (totals/distribution recomputed to 195/44), `Exercise-002-Exercise-Substitution-Architecture`, `Exercise-Media-Architecture-v1.0`, and illustrative wireframe-mockup text across `Active-Workout-Flow-Spec-W9-W16`, `W9-Amendment-002`, `W-19`, `Accomplishments-Wireframe-Spec-L12-L14`, `Exercise-Detail-Wireframe-Spec-W22`, `Exercise-Picker-Wireframe-Spec-W23`, `Workout-Builder-Wireframe-Spec-W24`, `Workout-Summary-Spec-W17`, `Workouts-Hub-Wireframe-Spec-W1`, `Home-Screen-Wireframe-Spec-H1`, `Squad-Detail-Wireframe-Spec-S2`, `Challenge-Detail-Wireframe-Spec-C3`, `Strength-Family-Research-v1.0`, `Muscle-Building-Family-Research-v1.0`, and `Exercise-Library-Production-Plan`. **One follow-up remains outside this pass's scope:** the Strength Foundation II (4-Day) `.docx` package still prescribes bare "Step-Up" in its Day-2 Main Workout rows and needs a binary-file content correction (2026-06-30).
11. **Honors System — Final V1 Architecture** — reconciled two previously-parallel, never-merged lineages: the locked `Honor-Catalog-v1.0-LOCKED.md` (v1.4, 82 types) and six unmerged Expansion Pass documents (Strength depth, Endurance, Consistency, Prestige) that a prior audit's blocker (no cardio data model) had obscured — that blocker was separately resolved by `Endurance-Statistics-Architecture-Amendment-001.md` (LOCKED) but nothing ever recorded it, so the Endurance category sat finished but invisible. New master synthesis doc `Honors-Architecture-V1-Final-v1.0.md` and companion `Honors-Authoring-Standards-v1.0.md` (defines the "Real Athlete Test," a 6-item QC checklist for all future Honor authoring). Merged into `Honor-Catalog-v1.0-LOCKED.md` → **v1.5**: Strength depth (Overhead Press, Pull-Up, +8); Training/Chapters/Goals/Programs/Longevity depth (+25); new **Endurance** category (38, Running/Walking/Cycling/Swimming only — Hiking/Rowing explicitly deferred pending an `ActivityType` enum amendment); new **Consistency** family (5, cumulative non-streak Active Weeks); new **Prestige** category (8, requires new pipeline step `[4.5]`); new **Hidden** category (6, zero new schema — reuses L-10's existing zero-count-is-invisible rule for free). Fixed a recurring family-count arithmetic error (header claimed 22, table summed to 25 at v1.4). **PO review removed two brand-new Strength families before final lock:** Sex-Specific Strength Milestones (12, sex-adaptive thresholds) and Relative Strength Milestones (12, bodyweight-ratio) were fully designed — thresholds checked for collisions, metadata shapes specified, evaluator logic written, two new optional Profile fields scoped — and then **deferred to V2 by explicit PO decision**, not a technical blocker. Full design preserved in `Honor-Catalog-v1.0-LOCKED.md` § DEFERRED TO V2 and `Honors-Architecture-V1-Final-v1.0.md` §3 for a future V2 pass. `Profile-Wireframe-Spec-P1.md` ships unchanged at v1.3 as a direct consequence. Reconciled into `Honor-Evaluation-Service-Architecture-v1.0` (→ v1.1, 4 new evaluator families merged, 2 more designed-and-deferred, PR storage extended to 5 lifts) and `HonorInstance-Architecture-v1.0` (→ v1.1, new metadata shapes). **Discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md`** (→ v1.1): §5.1 still showed only the original 7 display categories and 53-type total, never updated for the v1.1/v1.3/v1.4 Competition/Communities/Squad additions from prior sessions — now reflects the full 13-category/167-type list. Final V1 manifest: **167 honor types, 13 categories, 34 families**. 42 honors explicitly deferred (24 by PO scope decision, design-complete; 18 genuinely blocked — Hiking/Rowing Endurance, Comebacks & Resilience, Bodybuilding volume-PR family) — written, intentional gaps, no placeholder logic invented. **Architecture/schema only — no L-11 descriptive content authored for any merged honor type; that full-catalog content pass is the next, separate Honors workstream item** (2026-06-30).
11. **Exercise Media Architecture — Anatomical Model Neutrality Standard** — `Exercise-Media-Architecture-v1.0.md` → v1.1: added a mandatory §3.3 standard, "Anatomical model character," requiring the muscle target image's reference figure to remain intentionally generic and educational — explicitly barred from depicting body fat, muscularity/body composition, sex-specific anatomy, skin tone, or any other identifying athlete characteristic. Clarifies (does not replace) the existing cross-exercise consistency requirement (same model/pose/camera/framing across all 200 exercises). No schema change; standards-only, no media assets produced or assigned.
11. **Featured/Pinned Honors decision + P-1 Amendment 004 merge** — Decision recorded: Strength milestone Honors (225 Bench, 1,000 Club, etc.) remain ordinary Honors — no separate "Recognition Clubs" system exists or was introduced. "Featured Honors" is realized entirely through the existing, already-LOCKED `P-1-Amendment-004-Pinned-Legacy.md` mechanism (max 6, athlete-curated, reorderable, display-only, zero effect on rank/progression/scoring/eligibility) rather than a new parallel system — Honors confirmed as a first-class Pinned Legacy eligible type. Closed the long-standing reconciliation gap: Amendment 004 was LOCKED but never merged into its base document — `Profile-Wireframe-Spec-P1.md` → v1.3 now contains Tier 1B and a full Section 4A specifying the mechanism, with explicit language confirming Honors' first-class status and that no new reward type/flag/screen was added. Added a reciprocal pointer in `HonorInstance-Architecture-v1.0.md` (→ v1.0.1, §5.3). No Honor Catalog edit required (already compliant) (2026-06-29).
12. **Exercise Library Phase 4 — Media Architecture & Standards** — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group on `ExerciseDefinition` (kept separate from the existing Media block; bespoke per-exercise anatomical diagram, FORGE-required before `isActive: true`, CUSTOM-optional) and defines production standards for all 5 media/anatomy fields: resolution/aspect/duration/fps/file-size/codec for the GIF-primary looping asset and its video/image fallbacks, with a **mandatory rule that every looping animation begin and end in the same neutral stance** to guarantee a seamless loop; resolution/style/highlight-color-convention/format for the new muscle target image, with a **mandatory rule that every muscle target image use the exact same anatomical model, pose, camera angle, proportions, scale, and framing — only the highlighted musculature changes**; plus a uuid-keyed file/CDN naming convention chosen specifically to be collision-proof against the 5 known naming-duplicate pairs. Reconciled into Exercise-Library-Architecture (→ v1.2, schema + §8.1/§8.3/§16 updates), W-22 (→ v1.0 R2, new §6.3a/§6.3b placed within the Identity block per the locked content-order constraint — no top-level section reordering), Exercise-001 (→ v1.0 Media Field Reconciliation, §5.1/§5.2 CUSTOM field updates), W-28 (→ v1.0 Media Field Reconciliation, W28-D7 deferral note + excluded-fields list), and Anchor Authoring Framework (→ v1.0 Media Cross-Reference, fulfilling its own §7 "one-line confirmation" invitation). **Standards and schema only — zero exercise media assets produced or assigned; Decision Queue #11 remains open** (2026-06-29).
13. **Exercise Library Metadata Completion — Phase 3: Difficulty Assignment** — `difficulty` assigned to all 200 V1 exercises (`BEGINNER`/`INTERMEDIATE`/`ADVANCED`, locked enum) in new doc `Exercise-Difficulty-Assignment-Pass-v1.0.md`, organized by the same Category/MovementPattern structure as the Launch Catalog Blueprint. Rated on technical skill/safety/coordination/learning curve, not load capacity, with consistency enforced across exercise families (e.g., machine-supported squat variants = BEGINNER, free-weight bilateral/split-stance = INTERMEDIATE, single-leg/free-balance = ADVANCED). Validated distribution: 122 BEGINNER (61%) / 65 INTERMEDIATE (32.5%) / 13 ADVANCED (6.5%) = 200; per-category counts cross-checked against the Blueprint's category totals with zero omissions or double-assignments. 10 genuinely ambiguous cases (e.g., Nordic Hamstring Curl, Sissy Squat, Yoke Carry as ADVANCED outliers within otherwise-BEGINNER patterns) flagged and resolved with documented rationale. Does not modify muscle assignments, taxonomy, media fields, exercise names, or architecture. **Media is now the only unassigned `ExerciseDefinition` field across all 200 exercises** (2026-06-29).
14. **Exercise Library Metadata Completion — Phase 2: Muscle Assignment** — `primaryMuscles` and `secondaryMuscles` assigned to all 200 V1 exercises across 14 population-pass docs using the locked 14-value `MuscleGroup` taxonomy. All 200 exercises satisfy the 1–4 primary / 0–4 secondary cardinality rule; zero invalid enum values; zero exercises missing a primary muscle. Architecture §5.3 canonical examples verified: Deadlift = `[LOWER_BACK, GLUTES]` primary / `[HAMSTRINGS, CORE]` secondary; Plank = `[CORE]` primary / `[LOWER_BACK]` secondary. Four exercises use closest-available enum by intentional V1 design (Adductor Machine → `HIP_FLEXORS`; Butterfly Stretch → `HIP_FLEXORS`; Neck Mobility Flow → `SHOULDERS`; Lacrosse Ball Foot Release → `CALVES`) — V1 does not distinguish adductors, cervical musculature, or intrinsic foot musculature (PO decision 2026-06-29). Remaining unassigned fields at the time: `difficulty`, all four media URLs. No architecture or schema change (2026-06-29).
15. **Exercise Library Metadata Completion — Phase 1: Muscle Taxonomy Lock** — verified the existing LOCKED 14-value `MuscleGroup` taxonomy (`Exercise-Library-Architecture-v1.0.md` §5) is canonical and sufficient to classify all 200 V1 catalog exercises; reconciled a brief calling for a singular-required primary + 0–5 secondary cardinality against the locked 1–4 primary array / 0–4 secondary array rule and **kept the locked rule unchanged** (owner decision, 2026-06-29) rather than reopening the W-22 display contract. Repo-wide audit found zero synonym conflicts and zero cardinality inconsistencies across all architecture/wireframe/population-pass docs. Fixed a cosmetic-only inconsistency in `Exercise-Picker-Wireframe-Spec-W23.md` §14.1/§15.2 (ASCII mockups used informal "Arms"/"Legs" groupings not in the 14-value enum). New doc: `Exercise-Library-Muscle-Taxonomy-Readiness-Report-v1.0.md` — verdict GO, taxonomy ready for the per-exercise assignment pass. **No schema or architecture amendment was needed** (2026-06-29).
16. **Homepage Principles system (V1 Architecture Freeze row 21)** — LOCKED; new governing doc `Homepage-Principles-Architecture-v1.0` establishes the Homepage Principle as a **digital inscription, not a motivational widget** — quiet reflection, not motivation — placed on Home (H-1) below the status area and above the primary action cards, explicitly not a sixth H-1 tier; deterministic per-athlete-and-day rotation (same entry on every device) with a 14-day no-repeat window and graceful fallback; never AI-generated at runtime (HP-D11); states no fixed entry count so it cannot go stale (HP-D10 — `Homepage-Principles-Library-v1.0` is the single source of truth for counts; existing entries may be revised or retired in future versions if they no longer satisfy the Editorial Standard). Canonical content (105 Principles + 22 Reflection Questions, imported verbatim from the approved design session) ships in the companion Library doc. Reconciled into `Home-Screen-Wireframe-Spec-H1` (→ v1.2) and the Master PRD Amendment Log (2026-06-29).
17. **Exercise Library V1 Freeze reconciliation + audit pass** — Phase 1 fixed 5 categories of documentation drift across the Exercise Library doc set: canonicalized `ExercisePrescription` field names (`setsTarget`/`repsTarget`/`weightTarget` → `sets`/`reps`/`weightValue` in Exercise-001); corrected the stale "Hypertrophy (3)" validation-checklist line in Exercise-Library-Architecture (now Hypertrophy (5), Cycling (0), Combat (0), Full Body/Home (5) = 24, matching Program-Ecosystem-Architecture); removed a stray "Hinge" 7th-row from W-23's category list (HINGE is a MovementPattern, not one of the 6 locked ExerciseCategory values); fixed header/footer version-stamp drift in Program-Authoring-Standard (v1.1→v1.3), Active-Workout-Flow-Spec-W9-W16 (v1.4→v1.5), and Workout-Builder-Wireframe-Spec-W24 (v1.0→v1.2, newly discovered); found and fixed a real locked-vs-locked contradiction — W-23 showed a visible tap-to-toggle heart icon that directly violated Exercise-003's EX-003-D4 (no visible favorite icon on W-23 rows; long-press contextual action sheet only); fixed inaccurate "W-21 has an inline creation sheet" wording in W-28; fixed a stray "W-24" reference in Exercise-003 that should have read "W-28". Phase 2 audited the 200-exercise catalog: confirmed zero broken relationship references (automated cross-check of every progression/regression/alternative target against the canonical 200-name Blueprint), confirmed all 6 categories/21 movement patterns/18 equipment tags populated within locked ranges, but found 2 previously-unflagged naming-duplicate pairs (Romanian Deadlift/Barbell Romanian Deadlift, Bench Press/Barbell Bench Press — corrected into the Launch Catalog Blueprint's own duplicate registry, now 5 pairs not 3) and confirmed `primaryMuscles`/`secondaryMuscles`/`difficulty`/media are unassigned for all 200 rows. **Verdict: NOT marked V1 COMPLETE/FROZEN** — architecture remains ✅ (Freeze row 7, unchanged), but the exercise data layer needs a muscle/difficulty/media assignment pass before any row can go active (2026-06-29).
18. **Squad System Architecture** — LOCKED; new governing doc `Squad-System-Architecture-v1.0` locks Squad Goals, Missions, daily Check-ins (+ optional video), Squad Streak, Squad Momentum, Weekly Summary, Squad Feed, Honors integration (new 15-type `SQUAD` Honor Catalog category), inline Competition standings, Notifications, Analytics, and Commitment. **Deliberately lifts the Performance Firewall for Squad-internal surfaces only**, superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for S-1/S-2 (Friends Feed/Communities/Calendar Firewall unchanged). Reconciled into S-1 → v1.4, S-2 → v1.6 (major layout: Goal/Mission/Check-ins/Feed/Competitions/Honors/Analytics sections), S-3 → v1.3 (Commitment field, Goal/Mission edit rights), Honor Catalog → v1.4, P-5 Notifications → v1.4 (Arch + Wireframe), Challenge-System-Architecture → v1.5 (CS-D2/CS-D22 narrowed for SQUAD-context) (2026-06-29).
19. **Communities subsystem (V1 Architecture Freeze row 20)** — LOCKED; fourth relationship pillar (Legacy/Friends/Squads/**Communities**). 4 new governing docs (`Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`) + 5 reconciliation amendments applied directly into their target documents: Social-System-Architecture → v1.1 (Communities peer layer + Post audience extension), Challenge-System-Architecture → v1.4 (new `COMMUNITY` roster context, reusing the existing engine), Honor Catalog → v1.3 (found + fixed a `COMMUNITY`/`COMMUNITIES` category-name collision; +5 honors), P-5 Notifications → v1.3 (Section E), Monetization Amendment 001 (+Amendment 002, 1 free / unlimited premium community memberships), Master PRD §6/§19 (Home entry point, not a 5th tab) (2026-06-29).
20. **Workout Playlist Amendment 001** — LOCKED; optional Spotify/Apple Music playlist link attachable to a workout (no playback/sync/API integration in V1); merged into Active-Workout-Flow-Spec-W9-W16 (→ v1.5), Workout-Summary-Spec-W17 (→ v1.3), Activity-Detail-Wireframe-Spec-W19 (→ v1.4), and WSR-001 (→ v1.1) (2026-06-29).
21. **W9-Amendment-003 (Optional Rest Progress Ring)** — LOCKED; Active-Workout-Flow-Spec-W9-W16.md → v1.4; thin bronze ring fills (never drains) toward an opt-in personal or program `restSeconds` reference; off by default; preserves the count-up-only "Accountability Without Shame" rest philosophy (2026-06-29).
22. **Master Status dashboard** — refactored this file into the permanent project dashboard (2026-06-29).
23. **Repository Status Audit** — full code+docs audit; confirmed code = 0%, docs ~95% (2026-06-29).
24. **Pinned Legacy (P-1 Amendment 004)** — LOCKED; new Tier 1B reference-only PinnedLegacyItem. (Merged into base `Profile-Wireframe-Spec-P1.md` this session — see entry #1.)
25. **Challenge System** — private opt-in squad ranked competition; 4 LOCKED amendments.

---

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
