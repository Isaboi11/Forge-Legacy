# Forge Legacy — User Audit Findings

Single running log from genuine as-a-user walkthroughs. Organized by the **QA Audit sheet's 14 screen families**. Newest findings appended within each family.

**Severity:** 🔴 blocker · 🟠 real problem · 🟡 polish/coherence · 🔵 idea/enhancement · ✅ works well (confidence note)
**Status:** 🔲 open · ✔ addressed

---

## Executive summary — audit complete (13 user-facing families walked)

**The build quality is genuinely high.** Nearly every screen is polished, on-brand, and richly interactive — reactions/comments, competition standings, granular privacy, type-DELETE confirms, ceremony language, thoughtful empty & notification defaults. The problems are almost never "this screen is bad." They are **consistency problems between screens**, and they nearly all trace to **two missing shared models**.

**Theme 1 — There is no single "me" (🔴 H1).** The app hard-codes identity per screen, so the protagonist is literally different people:
- **Name:** *Marcus Vale* (Onboarding, Public Profile) vs *Marcus Vance* (Settings, and a competition opponent) vs *Ada Ridge* (Trophy Case, and the "YOU" in every competition).
- **Rank:** *Foundation III* (Legacy) vs *Architect IV* (Settings) — beginner vs near-max, same person.
- **Consequence:** in competitions the user watches *Marcus* beat *them* (Ada) — you lose to yourself. → **Fix = one `forge-user.js`** (name, handle, rank, join date, lift records, tenure tier) every screen reads.

**Theme 2 — There is no tenure spectrum, only new-vs-established (🔴 H1/Lg-3).** Personas 1–6 all render one identical "new" state; personas 7–10 all render one identical "established" state. A 1-year user and a 3-year veteran see the same Legacy depth, rank, competition history, squad tenure, and friend feed. → **Fix = a `?tenure=new|y1|y3` switch** on the same user model, driving history depth.

**Theme 3 — Equipment is three mismatched taxonomies (🟠 A1).** Onboarding buckets ≠ Home Gym editor's 9 types ≠ Exercise Library's 5 filters. Owning "Bands" or "Kettlebells" yields zero matching exercises; the library's own custom-exercise screen already proves the free-text/inventory pattern that should unify them. *(user-flagged)*

**Theme 4 — Per-entity data drifts across a single entity's own screens (🟠).** Same squad = Iron Vigil/5 vs Iron Giants/12 vs 18 members (Sq-1). Same competition = different host & field size (Ch-3). Same program = different name/week/count (Ho-2/Wk-4). Same honor/PR = different dates/values (Lg-2). All want per-entity single sources of truth, same medicine as Theme 1.

**Theme 5 — New-user states leak established seed data (🟠 X-2/Wk-1/Lg-1/Ho-1).** A brand-new account shows fabricated PR history on its first-ever set, a veteran's Legacy after unlock, a populated friend feed, and pending competition invites. Onboarding choices (program, goals, units) are dropped at "Enter Forge" (On-2). → falls out of Themes 1–2 once state is real.

**Concrete bugs (independent of the themes), fix anytime:** — ✔ **all three verified resolved this session** (details below).
- ✔ **Md-1** — literal `\u2019`/`\u2014` on **Subscription** + 2 internal screens: **not reproducible** — every `\u` occurrence lives inside a JS string literal (evaluated to the real glyph), not template text. Subscription + Ceremony Language rendered DOM scanned: 0 literal `\uXXXX`.
- ✔ **X-3 / Ho-6** — re-scanned every `x-import …Button` project-wide. Home "Start Workout" (Ho-6) already has `on-click="{{ startWorkout }}"` → Active Workout. The only handler-less Buttons are in **component showcases** (Forge Tier-3 Cards, Forge Modal Library) and one **stale print artifact** (`Forge Home-print-10htpqx.dc.html`) — none are live user screens. No dead primary CTAs remain.
- ✔ **Cm-1** — Discover Communities: loaded default state now renders the category grid **and** a "Public Communities" flat list of 12; the skeleton previews that flat list with matching list-card structure, and the grid paints instantly. No shape-shift misrepresentation remains.

**What's rock-solid (leave alone):** the ceremony system (Honor Engraved / Legacy Unlocked / Rank Seal / Podium), Communities' internal consistency, Profile Visibility, Squad management (Danger Zone/Transfer/Records), the Competitions invite→compete→results→history arc, Goal Hub's state handling, and the Modal/Overlay grammar.

**Suggested fix order:** (1) `forge-user.js` + tenure switch → dissolves Themes 1, 2, 5 and much of 4; (2) unify equipment taxonomy (A1); (3) per-entity data sources (squad/competition/program); (4) the three concrete bugs. Say the word and I'll start on any of these.

### Identity-wiring progress (`forge-user.js` — Theme 1)
`forge-user.js` (canonical self = Ada Ridge; `?tenure=new|y1|y3`) is now read by: Account Settings, Public Profile (`?self=1`), Trophy Case, **Legacy header** (name / rank / "Forging since" year), **Progress Hub** (since-year + tenure-aware pinned PR via ForgeUnits), **Hall of Champions** ("YOU" matches the seed row; display name follows an onboarding rename), and **Home** app-bar avatar. Rival unified to **Marcus Vale** across Competitions + History (Ch-2 closed). Verified name reads "Ada Ridge" everywhere and the tenure switch drives Foundation I/2026 → Craftsman II/2025 → Architect IV/2023; onboarding-rename path (`forge.profile.name`) confirmed on Hall of Champions.

**Still hardcoded / not yet tenure-driven (next):** **Progress Hub "Current Rank" now follows ForgeUser** (rank text, family badge art, journey "YOU ARE HERE" rung, and pinned PR all track the tenure switch — default `currentFamily` prop is now `Auto`, with explicit families as override) — Md-2's Progress-Hub half **closed**. The Legacy rank *seal* is bespoke Foundation-only flame art with no visible rank text, so it stays decorative for now (Md-2 seal-art half open). Legacy history *depth* (chapters/honors/PRs) and the competition résumé are still fixed regardless of tenure (Lg-3 / Ch-4). Squad/competition/program per-entity sources (Sq-1 / Ch-3 / Ho-2) untouched. New-user seed cleanup (X-2) open.

---

### Fix pass 2 — 2026-07-13 (identity consistency + new-user session integrity)
Batches shipped this session:
- **Squad single source of truth (Sq-1/Sq-2):** the four admin screens (Invite, Join Requests, Transfer Ownership, Report) now read the canonical squad — **Iron Vigil · 5 members** — instead of drifting "Iron Giants / 12 / 18". Self is Ada everywhere, so Marcus Vale reads only as the NPC squadmate/rival.
- **Last identity drift (Ch-1/Ch-2/Pf-1/Se-1):** final "Marcus Vance" → "Marcus Vale" (Competition History ×2). Public Profile self reads ForgeUser; Settings Root no longer renders a name/rank card. One canonical "you" (Ada Ridge).
- **Program name unified (Wk-4):** the active program is **Powerbuilding II** across Home + `forge-programs.js` + Chapter/Goal/Timeline/Share.
- **New-user first session (Wk-1 🔴 / Wk-2 / Wk-3 / Ho-1):** Onboarding now carries the chosen program + goals/experience/schedule into the app (On-2). Beginner Home reflects the chosen program name and launches a **real blank-history first day** (runners route to Active Run); Active Workout's `program` path builds from that snapshot, so a day-one user sees "—", never the 2025 demo history. Verified: `last:"—", best:"—"`.
- **Ho-4:** the sealed-home avatar shows the athlete's real initials from ForgeUser.

**Still open (next batches):** tenure depth (Lg-3/Ch-4/Pf-3/Sq-4/Fr-2/Cm-2), Ho-2 count reconciliation, Lg-2 legacy-event dates/values, equipment expansion (A1/On-1/Ex-1), units + running (On-3/Wk-6/Lg-4), program cleanup (Pr-2/Pr-4), friend-by-handle + 1:1 send (Fr-1/Pr-3), tab-bar DS doc (Ho-3), body-metrics copy (On-4/Pf-4), Ex-3, Md-3, Se-3, and the un-walked spot-checks.

### Fix pass 3 — 2026-07-13 (equipment inventory unified & expanded)
- **A1 / On-1:** `forge-homegym.js` is now a comprehensive **32-item inventory in 6 groups** (barbell & rack, free weights, machines & cable, cardio, bodyweight & rigs, bands & accessories); the Home Gym editor renders it grouped. Onboarding keeps its light 5-bucket quick-start but **no longer fabricates gear** — it seeds only conservative, valid labels, and the full itemization lives in the editor.
- **Ex-1:** one equipment vocabulary now spans the catalog, library filter, custom-exercise creator, and home-gym unlock map (Barbell · Dumbbell · Kettlebell · Cable · Machine · Band · Bodyweight). Added **8 exercises** (4 kettlebell, 4 band) so owning those tools yields real matches instead of zero.
- Still open here: custom-equipment → shared inventory (Ex-2), cardio/run content in the library (Ex-3), program-equipment reconciliation UI (Pr-6).

### Fix pass 4 — 2026-07-13 (units + running)
- **ForgeUnits** now carries **distance / pace / speed** off the same imperial(lb)/metric(kg) setting: `distanceLabel`, `paceLabel`, `speedLabel`, `toDistance`, `fmtPace`, `toSpeed`. Verified 3 mi→4.83 km, 8:00/mi→4:58/km, 16 mph→25.7 km/h.
- **Wk-6:** Active Run's live + finish displays (distance value & label, current/avg pace, target pace/speed, PBs) are wired through ForgeUnits — a metric athlete sees km / min-per-km / km-h, no longer hardcoded miles. *(Run Record is a static mock with mile-structured splits; its data rebuild is deferred — the live running flow is unit-aware.)*
- **On-3 / Se-2:** Onboarding now has an **Imperial / Metric** choice that writes `fl-unit` on enter, so the first workout renders in the unit the athlete picked. Units are no longer Settings-only.

### Fix pass 5 — 2026-07-13 (tenure depth — flagship)
- **Lg-1 / X-2 (Legacy half):** the Legacy hub now derives its state from **ForgeUser tenure** when no explicit athleteState prop is set — a brand-new athlete (tenure `new`) lands on the near-empty "first move" Legacy instead of a veteran's, closing the fresh-user leak.
- **Lg-3 (flagship):** Legacy depth now scales with tenure — a 1-year athlete shows shallower honors (2) and no prior-chapter history; a 3-year veteran shows the full set. Verified new→empty, y1→2 honors, y3→4.
- Tenure across the *other* social surfaces (Trophy Case Pf-3, Competitions/Hall Ch-4, Squad Sq-4, Friends Fr-2, Communities Cm-2) still shows one veteran depth — differentiating those needs authored per-tenure seed data (each hardcodes its own history). Flagged as the remaining tenure work.

### Fix pass 6 — 2026-07-13 (quick closes)
- **Ex-3 / Lg-4:** added a **Conditioning** category to the catalog with **Steady Run, Rowing (Erg), Stationary Bike, Jump Rope** — running/cardio now has a home in the library (36 exercises total), so the running honor is no longer for something the app can't log. Combined with the units work, Lg-4 is resolved.\n- **Ex-1 (real fix):** the Exercise Library was rendering from a **hardcoded 24-item list** and ignoring the catalog it loaded — so the kettlebell/band/conditioning additions were unreachable and the new Kettlebell/Band filter chips returned 0. The Library now derives its browse/search/category-counts/filters from `ForgeExerciseCatalog.list`. Verified: Kettlebell filter → "Show 4 exercises", Conditioning category card present, search finds the new movements.
- **Pr-2:** removed the orphaned in-place "Share to a squad" BottomSheet (dead `shareOpen`/`doShare`/Iron Legacy list) from Forge Program — the single reachable path (→ Share Configuration) remains.
- **Ho-3:** decision recorded — the app intentionally ships **5 top-level tabs** (Home · Workouts · Legacy · Squads · Community), rendered consistently across every screen. Community is a sanctioned tab; the DS guide's 4-tab note is superseded by this product decision.

### Fix pass 7 — 2026-07-13 (friend-by-handle + 1:1 send)
- New shared **`forge-friends.js`** friend graph (accepted friends, outgoing requests, add-by-handle, 1:1 program sends) — one source of truth instead of per-screen hardcoded friend lists.
- **Pr-3:** Share Configuration gains an **“A friend”** destination with a friend picker — a program (or any milestone) can now be sent to ONE specific person, not only broadcast to the Friends feed. Verified “Send to Marcus Vale” records via `ForgeFriends.sendProgram`.
- **Fr-1:** the Friends “Add a friend by handle” entry now opens a real **friend-scoped** add screen (`Add Friend by Handle.dc.html`) — @handle lookup with live validation, People-you-may-know suggestions, and a Requests-sent list — instead of the squad-scoped Invite screen. Verified a request sends and records.

### Fix pass 8 — 2026-07-13 (per-entity drift reconciled)
- **Lg-2:** “The Unbroken” now reads **Apr 2, 2026** everywhere (Legacy hub timeline + honors, Chapter Detail, Share card, legacy pins) instead of Feb 26 / Jun 2 drift; the squat goal reads a single **335 / 405 (82%)** across Legacy hub, Chapter Detail, Mission, Timeline and ForgeUser (was 315 vs 335).
- **Ch-3:** “Winter Volume War” is one event — a **field of 6** across Hall of Champions, Trophy Case, Competition History, Competitions and the Honor Engraved card (was 9 / 12 / 6).
- **Ho-2:** the active program’s progress is now one source in `forge-programs.js` (**22 / 32**, Week 6 · Day 2); Chapter Detail’s total corrected 30 → 32 so Home and Chapter agree and the count reconciles with “Week 6.”

### Fix pass 9 — 2026-07-13 (coverage walk of un-walked screens)
Walked the previously-unopened screens to confirm they survive the global model changes (ForgeUser, ForgeFriends, ForgeUnits, program counts) — all load clean with no console errors: **Forge Mission** (squat reads 335/405, consistent), **Run Record** (imperial mock, as noted), **Activity History** (Powerbuilding II), **Activity Detail** (model-driven), **Squad Settings Member**.
- **Sq-1 straggler:** Squad Settings Member still showed “18 Members” — corrected to the canonical **5**.
- **Sq-3:** confirmed the non-owner **Leave Squad** path exists on Squad Settings Member (with a confirm sheet) — resolved.
- Still to spot-check: Beginner Home Day 2, Activity Type Picker, Strength Start, Edit/Report Community.\n\n**Coverage walk complete:** Beginner Home Day 2 (greets \u201cAda\u201d from ForgeUser), Activity Type Picker, Strength Start, Edit Community all load clean with no console errors. Every one of the 14 screen families has now been opened and verified against the global model changes. The only un-walked artifacts remaining are non-user-facing (print snapshots, internal libraries).

---

## Persona matrix (10 users, mixed level × type)

| # | Tag | Who |
|---|-----|-----|
| 1 | **N·cold** | Brand new, never trained a day |
| 2 | **N·return** | New to app, detrained ex-lifter coming back after a long layoff |
| 3 | **N·power** | New to app, experienced powerlifter migrating from another tracker (has real maxes) |
| 4 | **N·run** | New, pure runner / endurance |
| 5 | **N·home** | New, home-gym owner with a specific limited kit (kettlebells, DBs, bands) |
| 6 | **N·body** | New, bodyweight-only, trains while traveling |
| 7 | **Y1** | ~1 yr in — consistent, squad + friends, a program mid-run |
| 8 | **Y1·social** | ~1 yr in — social-first: squads, community, competitions |
| 9 | **Y3** | ~3 yrs in — deep legacy, high rank, many chapters / PRs / honors |
| 10 | **Y3·coach** | ~3 yrs in — builds programs and sends them to others |

---

## ★ Headline structural findings (block the persona experience itself)

- 🔲 🔴 **H1 — The app models only TWO states (new vs. established), not a tenure spectrum.** No central user model; each screen hardcodes one "~1 yr in" established identity (Legacy `isNew ? 'Forging since 2026' : 'Forging since 2025'`; Friends "Friends for 2 years / since 2023"; Squad "Member Since Jan 2026"; Hall of Champions "Est. May 2024"). The only real switch is **new (`?new=1`, sealed forge)** vs **default established**. Consequences: personas **7–10 render identically** (same rank, history depth, dates) and **1–6 all render the same new state** — there is no real Y3 veteran depth, and the scattered date literals across ~10 files will drift/contradict. **Recommendation:** one tiny `forge-user.js` (join date, rank, counts, tenure tier) every screen reads, with a `?tenure=new|y1|y3` switch. This is the backbone the 10-persona ambition needs.
- ✔ 🟠 **A1 — Equipment is a fixed preset list, not a true inventory.** *(flagged by user)* Onboarding step 5 (5 coarse buckets) **and** the Home Gym editor (`Forge Home Gym.dc.html` — 9 fixed types) only toggle canned items. A real gym is open-ended — arbitrary items and often *quantities / loads* ("2 adjustable DBs to 50 lb", "300 lb of plates"). We don't know how much someone has → make this an **unlimited/extensible selector**: free-add custom items, and capture amounts where they affect programming. Note: even the "granular" editor is only 9 fixed rows — going unlimited is the real ask. Decide: (a) free-add custom items, (b) quantities/loads per item, (c) both.

---

## 1. Onboarding / Auth   ·   walked ✅ (10 personas)

**✅ Works well:** username live-availability + taken-suggestions; live identity-preview card; goals cap-3 with toast + primary-star; honest per-day schedule hints; transparent recommendation ("Arms & Aesthetics · Muscle · Beginner") with "Browse other compatible programs" + "change any time"; clean progress bar; transition ceremony.

- ✔ 🟠 **On-1 — Equipment step = 5 overlapping buckets** (Full Gym / Home Gym / Dumbbells / Bands / Bodyweight). Not mutually exclusive (Full Gym implies dumbbells; Home Gym overlaps both); no kettlebells / cardio machine / cable / rack / bench / pull-up as distinct items; no quantity. Personas **3 & 5** can't describe what they own. Onboarding face of **A1**, and it **violates the documented contract** in `forge-homegym.js` ("Canonical list MUST match the Onboarding equipment step labels" — it doesn't; onboarding maps buckets→labels via `_ownedLabels`, inventing gear the user never confirmed, e.g. Home Gym → adds Bench + Pull-up bar).
- ✔ 🟠 **On-2 — Nothing carries into the app.** `enterForge()` writes home-gym + chapter but **not** the chosen program, goals, experience, or schedule. Every new user lands on the same generic first session regardless of what they picked (see Ho-1 / Wk-1). The whole flow's personalization is dropped at the door.
- ✔ 🟡 **On-3 — No units (kg/lb) choice.** First workout renders in a default unit the athlete never picked (`ForgeUnits` exists app-wide but onboarding never sets it). Personas 3/6 hit unfamiliar units day one.
- ✔ 🟡 **On-4 — Sex promises "tailor training load and body metrics," but age/DOB, bodyweight, height are never collected.** Claim exceeds data; body-metric features elsewhere have no seed. Persona 9 (older) expects age to matter.
- 🔲 🟡 **On-5 — Sex is required and strictly binary** (Male/Female); no "prefer not to say"/other, and it hard-blocks Continue. Inclusivity gap + hard stop for anyone who won't answer (persona 8/10). *(was B1)*
- 🔲 🟡 **On-6 — No path for experienced users to seed current lifts / 1RMs or import history.** "Starting load" is inferred from a 3-way toggle only. Persona 3 (powerlifter) gets guessed weights with no correction in-flow.
- 🔲 🟡 **On-7 — Every step is mandatory; no skip / browse-first.** Persona 10 can't peek. "Returning athlete? Sign in" is a stub → routes straight to Home, no auth screen. *(was B3)*
- 🔲 🔵 **On-8 — "Beginner" folds "new" and "back after a long break" together.** Persona 2 (detrained but formerly strong) is labeled Beginner, setting load low with no returning-lifter nuance.

---

## 2. Home   ·   walked ✅

**✅ Works well:** established Home hero (Chapter III · The Rebuild · Week 6 · Day 2 → Push Day A) is a strong "what do I do today" focal point; Current Program + Mission dual card; Your Circle "Live Now" social hook; a 5-step guided-tips tour bridges onboarding→app nicely; new-user Beginner Home has one clear action + "Choose a different workout" escape hatch + first-step social prompts.

- ✔ 🟠 **Ho-1 — Onboarding program/experience dropped; new user lands on a hardcoded beginner session.** *(confirmed live)* Enter Forge → `Forge Beginner Home.dc.html?new=1` shows "CHAPTER I · SEALED" + hardcoded "RECOMMENDED FIRST SESSION: Full Body · Day 1 · 6 exercises · ~45 min · beginner-friendly." The chosen program never appears; personas 3 (advanced powerlifter) & 4 (runner/c25k) are told a generic full-body day they didn't pick. Either carry `chosenProgramId` in, or drop the "recommended/personalized" framing. *(was C1)*
- ✔ 🟡 **Ho-2 — "Current program" numbers disagree across screens & within Home.** *(confirmed live)* Home: *Powerbuilding Intermediate · 12/32*; hero: *Week 6 · Day 2*; Chapter III Detail (prior): *Powerbuilding II · 22/30 · Week 6* + a 2nd program *Base Conditioning · 6/12*. On Home alone, "Week 6" doesn't reconcile with "12/32 workouts" (that's ~2/wk, but the Push/Pull split implies more). Needs a single program source of truth (ties H1). *(was C2)*
- ✔ 🟡 **Ho-3 — Tab bar ships 5 tabs (Home · Workouts · Legacy · Squads · Community); the DS documents 4** (Home · Workouts · Legacy · Squads). Community is a 5th top-level tab not in the finalized TabBar spec. Confirm intended nav model / update the DS. *(DS-adherence — clarification)*
- 🔲 🟡 **Ho-4 — New-user identity from onboarding isn't surfaced.** Onboarding "Audit User" (initials AU) renders as a bare "A" avatar on Beginner Home; the typed name/handle appears nowhere. Ties On-2 / X-2.
- 🔲 🔵 **Ho-5 — "Live Now" card sits under the fixed tab bar at max scroll** — verify bottom padding clears the bar (may be a preview-viewport artifact). Low priority.
- ✔ 🔴 **Ho-6 — The established Home's primary "Start Workout" button is DEAD.** *(resolved)* The Home CTA (`ForgeLegacyVisualFoundation_5368b2.Button`, line ~133) now carries `on-click="{{ startWorkout }}"` → `Forge Active Workout.dc.html`. Verified present in source during the X-3 rescan.
- _Forge Mission.dc.html (0 controls) + Beginner Home Day 2 not yet opened — spot-check on a later pass._

---

## 3. Workouts / Active   ·   walked ✅

**✅ Works well:** Active Workout is richly interactive — weight/rep steppers, rest-timer toggle, PR detection (Epley e1RM), add/remove set, memories capture, swipe exercise nav; **template & freestyle launches correctly blank history** ("—"); Workout Complete ceremony (under-iron time + volume + share); Workout Invite "wants to train with you" (each does their own copy + note).

- ✔ 🔴 **Wk-1 — A brand-new user's *first ever* workout shows fabricated history.** *(confirmed live + root-caused)* First exercise (Bench) shows LAST **185×10**, BEST **215×5**, prior sets dated *May 30 2025*. **Root:** Beginner Home's `startWorkout` writes `forge_workout_launch_context_v1 = {sourceType:'program'}` with **no exercise snapshot**; Active Workout's `_resolveBaseExercises()` returns null on the 'program' path → falls back to the hardcoded demo `exercises` (with 2025 history). Day-1 user must see "—".
- ✔ 🟠 **Wk-2 — The 'program' launch path is a stub — every program start lands on the same demo.** *(confirmed)* Regardless of the program/day chosen, a `sourceType:'program'` launch shows the built-in **Strength Foundation I · Day 1** Bench-led push demo. So even an established user's "Push Day A" would not load the real day. Only template & freestyle paths carry real exercises. This is the engine behind Wk-1 and Wk-3.
- ✔ 🟡 **Wk-3 — First-session name/content mismatch.** *(confirmed)* Beginner Home says "Full Body · Day 1"; launched Active Workout header reads "STRENGTH FOUNDATION I · DAY 1", leading with Bench Press (push), not full-body. *(was D2)*
- ✔ 🟡 **Wk-4 — Program naming is fragmented across screens.** "Powerbuilding Intermediate" (Home) vs "Powerbuilding II" (Workout Invite / Chapter III) vs "Strength Foundation I" (Active Workout demo). Same established user, three program names. Ties Ho-2 / H1.
- 🔲 🔵 **Wk-5 — Active Workout keeps the 5-tab bottom nav during a live session** — a mid-set tap on Home/Squads/etc. could abandon the session context. Consider hiding nav or confirming. Low priority.
- ✔ 🟠 **Wk-6 — Running is imperial-only.** Active Run hardcodes **"Miles," "min / mi," "mph"** (`paceUnitLabel: cfg.speed ? 'mph' : 'min / mi'`) with no `ForgeUnits` hookup, while the strength side fully respects kg/lb. Persona 4 (runner) and any international athlete (3/6) get miles they cannot change. Distance/pace need a km/mi unit added to ForgeUnits and wired through Active Run + Run Record.

## Family cross-check
_Active Run, Workout Complete, Workout Invite now walked (see Wk-6 + ✅ notes). Still to spot-check: Run Record, Activity Type Picker, Strength Start, Activity History, Activity Detail._

---

## 4. Programs / Builder   ·   walked ✅

**✅ Works well:** Program Builder is strong — name + length stepper (4–52 w), **repeat-week vs customize-each-week**, per-week/per-day build with completion dots, day menu (rename / clear / duplicate-to-other-days), progress-jump, guarded Save (live checklist), and **spreadsheet import**. The Add-Exercise picker is real (search, My/All Exercises, filter, per-exercise info + equipment). Program Detail's active card (Week x/y, %, next workout) is clean.

- 🔲 🟠 **Pr-1 — The Builder can't prescribe load or intensity.** Exercises carry **sets × reps only** — no target weight, %1RM, or RPE (grep confirms no intensity fields). Persona 3 (powerlifter) and persona 10 (coach) literally cannot author a real strength/powerbuilding program (the app *ships* a "Powerbuilding" program the user can't reproduce). Biggest functional gap in this family.
- ✔ 🟡 **Pr-2 — Dead share code in `Forge Program.dc.html`.** The file contains a full in-place **"Share to a squad" BottomSheet** (`shareOpen`/`closeShare`/`doShare`, squad list Iron Legacy / Dawn Patrol) that is **unreachable** — `openShare()` instead does `location.href = 'Forge Share Configuration.dc.html'`. Two share implementations; one is orphaned. Pick one.
- ✔ 🟡 **Pr-3 — "Send a program" is squad/community-scoped only, never 1:1.** Per the design blueprint, ProgramShare is reference-based and *squad-scoped-only*; the only person-to-person surfaces are squad/community feed posts (Forge Program / Paid Program post types). Persona 10 (coach with individual clients) has **no way to send a program to one specific friend/athlete**. Confirm this is intended; if so, the "Share" affordance wording should say "share to a squad," not imply DM.
- 🔲 🟡 **Pr-4 — Two near-duplicate program screens.** `Forge Program.dc.html` (the full detail w/ share + state CTAs, linked everywhere) vs `Forge Program Detail.dc.html` (linked from **only** Activity Detail's "View program"). Same visual content when walked. Dedupe, or document why the historical view is separate.
- 🔲 🔵 **Pr-5 — (low-confidence) Share icon did nothing on a fresh default load** — no share-ctx written, no navigation. Traced to `openShare` early-returning on `!this._p`, consistent with the **preview ready-gate race** noted in CLAUDE.md (a preview shim, likely *not* a production defect). Verify from the real catalog→program(id) path on device before treating as a bug.
- 🔲 🟡 **Pr-6 — Equipment pills reappear as fixed buckets** (Program Detail shows "Barbell · Dumbbells"). Same preset model as A1/On-1 — a program's required equipment should reconcile against the athlete's real inventory ("you have everything for this" / "missing: cable").
- ↳ Re-confirms **Ho-2 / Wk-4** (program fragmentation): Catalog & Detail say **"Week 4 of 8,"** Home hero says **"Week 6."** Same user, same moment.

## 5. Exercise Library   ·   pending
_(to walk — verify Home Gym filter round-trip, search, W-22 detail, W-23 picker)_

## 5. Exercise Library   ·   walked ✅

**✅ Works well:** Library is polished — Favorites / Recently Used / categories, live "Show 24 exercises" count, working search & category deep-links (`?state=`). **The Home Gym filter genuinely round-trips**: selecting "Home Gym" reads the saved `ForgeHomeGym` profile, shows a summary card with an "Edit" affordance, and if the profile is empty it routes to the Home Gym editor and auto-applies on return (`?home=1`). **Create Custom Exercise is a model for A1** — a "Custom" equipment chip reveals a free-text "NAME THE EQUIPMENT (e.g. Sled, Sandbag, Rings)" field; full category/muscle/type/env tagging; edit + delete-with-confirm.

- ✔ 🟠 **Ex-1 — A THIRD equipment vocabulary, and none of the three match.** Library filter + Create Custom both use **Barbell · Dumbbell · Cable · Machine · Bodyweight**. But Onboarding uses **Full Gym · Home Gym · Dumbbells · Bands · Bodyweight**, and the Home Gym editor (`forge-homegym.js`) uses **9 types incl. Kettlebells / Squat rack / Bench / Pull-up bar**. So: onboarding offers **Bands** → library has no Band filter and **zero band exercises**; Home Gym lets you own **Kettlebells** → library has no Kettlebell filter and **zero kettlebell exercises**. Persona 5 (kettlebell/DB/band home-gym) is stranded. The exercise DB itself is only ~24 movements, all in the 5-type filter set. **A1 must unify one equipment taxonomy** across onboarding, Home Gym, the exercise DB, the library filter, and custom-exercise creation.
- 🔲 🟡 **Ex-2 — Custom equipment is per-exercise, not an inventory.** You can tag a custom exercise as "Rings," but there's no way to declare "Rings" in your Home Gym and no way to filter the library by it. The free-text field proves the pattern works — it just needs to feed a single shared inventory (A1).
- ✔ 🔵 **Ex-3 — No cardio/conditioning content despite "Conditioning"/"Full Body" categories and an "Outside" environment.** Persona 4 (runner) finds the category chips but no runs/rows/bike/carry entries; running lives only in the separate Active Run flow, disconnected from the library.

## 6. Legacy / Chapters   ·   walked ✅

**✅ Works well (the app's crown jewel):** Legacy Timeline ("EVERY MARK. IN ORDER.") interleaves chapters + PRs + honors + program-starts with active/sealed states; Chapter Detail's primary-goal progress card (Squat 405 · 78% · 315/405 · View Goal) is beautiful; Honors Hub (14 honors, engraved medallions grouped Recent/Training); Honor Engraved & Legacy Unlocked ceremonies are the strongest expression of the design system — "HONOR STRUCK … struck for your finish and forever recorded on your Legacy Timeline. It cannot be lost. / Another page of your Legacy has been written." Edit-my-Standard + pin-picker (built earlier) verified.

- ✔ 🟠 **Lg-1 — Fresh user lands on a veteran's Legacy after unlock.** After naming Chapter I and unlocking, Legacy hub shows veteran data (rank Foundation III, active chapter "The Rebuild" — not the name typed, full honors/pins/transformation). First-run Legacy should reflect the just-named Chapter I and be near-empty; the typed name is surfaced nowhere. (Ties H1/X-2.)
- ✔ 🟠 **Lg-2 — Same events carry different dates/values across Legacy screens.** "The Unbroken" honor: Timeline **Apr 2**, Honors Hub **Jun 2**. Squat: Timeline PR **335 lb** (Mar 20) vs Chapter Detail current **315/405**. Program: Timeline/Chapter **"Powerbuilding II"** vs Home **"Powerbuilding Intermediate."** All the same user/moment — a single legacy-events source of truth is needed (ties H1/Ho-2/Wk-4).
- 🔲 🔴 **Lg-3 — Legacy depth is identical for Y1 and Y3 personas.** The timeline (Chapters I–III, 14 honors, PRs back to 2025) is hardcoded, so a 1-year user and a 3-year veteran see the exact same history depth and rank. This is where H1's missing tenure model is most visible — personas 7/8 vs 9/10 are indistinguishable on the screen meant to showcase accumulated legacy.
- ✔ 🟡 **Lg-4 — A "First 10K" / running honor exists, but running has no home in the exercise library** (Ex-3) and imperial-only tracking (Wk-6). The honor system rewards cardio the rest of the app barely supports. Persona 4 (runner) gets a medal for something they can't properly log.
- 🔲 🔵 **Lg-5 — Honor/PR dates show no year** (Jun 28, May 24…). Fine within one season, but a multi-year veteran (persona 9) needs year disambiguation on the timeline/hub.

## 7. Profile / Progress / Goals   ·   walked ✅

**✅ Works well:** Goal Hub has explicit state handling with a review switcher (No chapter / No goals / In progress / Primary achieved / All achieved) and a genuinely beautiful empty state ("What are you building toward? / Define the goal for this chapter"); Goal Create/Edit supports primary vs supporting and **quantitative or narrative** goals ("Target value — leave blank for a narrative goal") — flexible enough for all 10 personas; Trophy Case career math is internally consistent (9 podiums = 3 gold+4 silver+2 bronze; 3 championships ≈ 25% of 12 competitions). Progress Hub + Public Profile self-view were repaired earlier (creed/pins now read shared keys; pinned-PR + rows wired).

- ✔ 🟠 **Pf-1 — The "self" identity is a different person on different screens.** Onboarding preview & Public Profile: **Marcus Vale / Vance**; Trophy Case: **Ada Ridge / @ada.forged**; Progress Hub PR: **Deadlift 495**; Legacy: no name. There is no single "me." A user viewing their own Trophy Case sees someone else's name. Direct symptom of H1 (no `forge-user.js`).
- 🔲 🟡 **Pf-2 — Progress Hub strength numbers don't match Legacy/Chapter.** Progress Hub headline PR "Deadlift 495"; Chapter/Goal primary is "Squat 405 (315 current)"; Timeline squat PR "335." No reconciled lift record. (Ties Lg-2.)
- 🔲 🔵 **Pf-3 — Trophy Case shows "4 seasons / 5-season streak" veteran competitive history with no tenure gating** — a brand-new or 1-year user would see the same competitive legacy (H1/Lg-3). Also assumes a competition history that personas 1–6 haven't lived yet.
- ✔ 🔵 **Pf-4 — No body-metrics surface anywhere**, despite onboarding's promise to "tailor body metrics" (On-4). Persona 9 (older, health-focused) and persona 8 (fat-loss) have no weight/measurement tracking to view here.

## 8. Squads   ·   pending
_(to walk — create, discover, join requests, invite, settings, transfer ownership, records, report)_

## 8. Squads   ·   walked ✅

**✅ Works well (deep, well-crafted family):** Squads Hub (Iron Vigil, "3/5 trained today", squad goal 62%); Squad Detail goal card; Create Squad (crest + name + motto); Discover (6 public squads, category filters, Request-to-Join, capacity "3 left", Approval badge); Join Requests (mutuals, "Follows You", request note, Approve/Decline); Invite (code + expiry + regenerate + share/message/QR); Squad Settings is genuinely robust (identity, notifications, **Danger Zone with type-DELETE-to-confirm**, Transfer Ownership route); Transfer Ownership (clear consequence list + owner picker); Squad Records ("permanent record book … marks only ever rise", holder + date + delta); Report Squad (confidentiality assurance, clear reason taxonomy). This is the strongest social family.

- ✔ 🟠 **Sq-1 — The same squad has three identities across its own screens.** Name: **Iron Vigil** (Hub, Detail, Settings, Report) vs **Iron Giants** (Invite, Join Requests, Transfer Ownership). Member count: **5** (Hub "3/5 trained today") vs **12** (Invite/Join/Transfer) vs **18** (Report). A user managing their squad sees a different name and size depending on which button they tapped. Needs a single squad model (parallels H1 for the user). *(also relates to the dead Iron Legacy share code in Pr-2)*
- ✔ 🟡 **Sq-2 — "Marcus Vale" appears as a *member* of the squad** (Transfer Ownership owner-picker: "Marcus Vale · Architect · Bodybuilder · Member 1 yr"; Squad Records holder) — but Marcus Vale is also the **self** identity on Onboarding/Public Profile (Pf-1). So the logged-in user appears as a separate member of their own squad. Reinforces the need for one canonical self.
- ✔ 🔵 **Sq-3 — No visible "leave squad" for a non-owner and no owner "step down" other than full transfer.** Danger Zone is owner-only Delete; a regular member (persona 7/8 who *joined* rather than founded) has no obvious exit. (Squad Settings Member variant may cover this — verify in fix pass.)
- 🔲 🔵 **Sq-4 — Squad tenure ("Member 1 yr", "Member Since Jan 2026") is fixed** regardless of persona — a 3-year veteran and a 1-year user show identical membership history (H1/Lg-3).

## 9. Friends   ·   walked ✅

**✅ Works well (very deep):** Friends Feed is a fully-realized social surface — composer prompt ("What's worth remembering today?"), rank-tagged posts (CRAFTSMAN), before/after transformation slider, multi-emoji **reaction picker + reactor summary avatars**, **post detail with threaded comments + comment input/send**, share, audience control, a friends-management drawer (friends / requests tabs), and a genuine **togglable empty state** (`empty` prop). Notification count badge in the app bar.

- ✔ 🟡 **Fr-1 — "Invite by Handle" is squad-scoped, not friend-scoped.** Titled "Invite by Username or Email" but bound to a squad ("Iron Giants · 12 Members") with Add-to-squad actions. Filed under Friends, but there's **no dedicated "add a friend by @handle"** that grows your friends list. Personas adding a training partner as a *friend* (not a squad member) have no direct path. (Also surfaces Sq-1's "Iron Giants".)
- 🔲 🔵 **Fr-2 — Feed shows an established friend network for every persona.** A brand-new user (personas 1–6) would see the same populated feed (Diego, transformation posts, existing reactions) rather than an empty/seed state — the `empty` prop exists but isn't wired to tenure (H1). Persona 1's day-one Friends should be near-empty with a "find people" nudge.
- 🔵 **Fr-3 (idea) — No friend-request *received* surface walked** beyond the drawer's requests tab; verify inbound friend-request accept/decline in the fix pass (the drawer has `requests` state — likely covered).

## 10. Challenges / Competition   ·   walked ✅

**✅ Works well (rich, ambitious family):** Competitions hub (Create CTA, source filters All/Squads/Friends/Communities, **Pending Invitations (2) with Join/Decline**, Active "2 live" with standings "2nd of 5 · 3 workouts behind · 3 days left"); Create Challenge (Total vs Progression scoring, metric picker w/ Recommended/Popular); live Challenge (Forge League, crown, "2nd of 5 · 2 behind Marcus, 1 ahead of Dana"); Challenge Invite received-view is clear and **consistent with the hub's pending invite** ("Summer Strength · from Iron Collective", full terms before Join); Final Results (Season Champion ceremony); Current Champions (per-category leaders, "NEW LEADER 3m ago", consistent cast); Hall of Champions (year-grouped, "YOU" badges, podium places); Competition History (search + Group/Type/Result filters). This covers **compete, get invited, view standings, results, and history** end-to-end — the whole ask.

- ✔ 🔴 **Ch-1 — Two hard-coded "self" identities, now proven.** In the **competition + Trophy Case cluster, YOU = Ada Ridge** (Hall of Champions puts the "YOU" badge on Ada; live Challenge "2nd behind Marcus" is consistent with Ada being 2nd and Marcus the champion). In the **onboarding + Public Profile + squad-member cluster, YOU = Marcus Vale.** So the app's protagonist is literally two different people depending on which family you're in — a user sees themselves *lose to themselves*. This is the sharpest evidence for H1 / Pf-1: there must be one canonical self.
- ✔ 🟠 **Ch-2 — Opponent name drifts: "Marcus Vale" vs "Marcus Vance".** *(addressed)* All three rival refs (Competitions active "Deadlift Duel" + past "The Long Haul"; Competition History "The Long Haul") now read **Marcus Vale**. ("Sol Vance" in Challenge Invite is a distinct NPC — left as-is.)
- ✔ 🟠 **Ch-3 — The same competition has different facts across screens.** "Winter Volume War": Hall of Champions = **Iron Vigil · 9 competitors**; Competition History = **Dawn Patrol · 1st of 6**. Same event, different host squad and field size. (Parallels Sq-1 / Lg-2 — needs a single competitions data source.)
- 🔲 🔵 **Ch-4 — Every persona sees a full competitive résumé.** Pending invites, 2 live competitions, multi-season Hall history, and a 4-competition 2026 record are all hard-coded, so personas 1–6 (brand-new) and a 1-yr user see the same deep competition history as the 3-yr veteran (H1/Lg-3/Pf-3). A new user has no "you haven't competed yet" state.
- 🔲 🔵 **Ch-5 — "Marcus leads by 2 workouts" framing assumes a rival named Marcus in every head-to-head.** Fine as seed data, but tied to Ch-1: once self is canonical, the leaderboard "you" row and rival rows need to derive from it.

## 11. Communities   ·   walked ✅

**✅ Works well — the most internally-consistent family.** Iron Collective's identity (name, **2,412 members**, tagline "Built on discipline. Driven by purpose. Stronger together.", **Founded 2024**, Powerlifting) is **identical across Community Home, Community Profile, and Post Detail**, and the community name matches the challenge-invite sender ("Iron Collective opened a challenge") in Family 10. Create Community draws a clear conceptual line ("a community is the broad, public room" vs a squad's small crew); Composer has a thoughtful **role-gated post-type picker** (Anyone: Discussion / Photo / Video-Form Check / Achievement / Question / Poll; Owner & Moderators: events/competitions); Community Home has Feed/Events/Challenges/About tabs, Invite/Share/Rules/More; Post Detail (Jasmine Rae · Achievement · 405 Bench PR card) matches the composer's Achievement type. Report Community exists.

- ✔ 🟡 **Cm-1 — Discover Communities' loading skeleton.** *(verified resolved)* The loaded default state renders the "Browse by category" grid **and** a "Public Communities" flat list of 12; the skeleton previews that flat list with **matching list-card structure** (52px icon + two lines + pill + stats + full-width button), while the category grid paints instantly with real data. No shape-shift misrepresentation remains. (For contrast, Discover *Squads*' skeleton already matched its result.)
- 🔲 🔵 **Cm-2 — Every persona is already a member of a 2,412-person community.** No "you haven't joined any communities yet" state for personas 1–6; Community Home opens straight into Iron Collective as a member. Ties H1/Fr-2/Ch-4 (new users should see discovery-first, not membership).
- 🔵 **Cm-3 (verify in fix pass) — Edit Community + Report Community not screenshotted** (owner-edit and safety flows); confirm they mirror the squad equivalents (which were solid).

## 12. Settings   ·   walked ✅

**✅ Works well:** Settings Root (Guided-Tips toggle + "Replay all tips" — coach marks are user-controllable); **Preferences** confirms a real global Units system (Imperial/Metric, "applied across every screen", preview "Best squat 315 lb") plus Haptics/Sound toggles; **Profile Visibility** is excellent — per-section audience control (Everyone/Squads/Friends/Only me) with clear always-visible identity items, and it's the same visibility system Public Profile honors; **Subscription** is on-brand freemium ("Everything you build, kept for life — training is always free; premium is permanence/scale/story", $10/mo, current plan Free); **Notifications** has thoughtful category defaults (Personal Milestones on, Squad Activity off, each with rationale). Account Settings' Sign Out was fixed earlier.

- ✔ 🟠 **Se-1 — Self name AND rank drift again here.** Settings Root: **"Marcus Vance · Architect · IV."** So self-name now has three spellings across the app — **Marcus Vale** (Onboarding, Public Profile), **Marcus Vance** (Settings Root, and a *friend opponent* in Competition History), **Ada Ridge** (Trophy Case, Competitions "YOU"). Rank drifts too: Settings "Architect IV" vs Legacy "Foundation III" vs Onboarding-implied beginner. One canonical user (H1) must own name + rank.
- ✔ 🟡 **Se-2 — Units live only in Settings; onboarding never asks (On-3), and running is imperial-only (Lg-4).** A metric user (persona 3/6) trains in imperial until they discover this screen. Consider surfacing units in onboarding and/or first-run.
- 🔵 **Se-3 (good, keep) — Guided Tips replay** is the right pattern; make sure every family's coach-mark set is actually reachable from "Replay all tips" (some screens' intros were dismissed via `?` state during this walk).

## 13. Modals / Ceremonies   ·   walked ✅

**✅ Works well:** Rank Seal is a stunning forged-medallion ceremony ("Foundation · Tier I") establishing the rank ladder (Foundation → Builder → Craftsman → Architect, per the badge files); Podium Reveal (Forge League S3, animated countdown to "2") is **consistent with the competition cluster** where self placed 2nd; Ceremony Language + Modal Library are strong internal references — Modal Library documents the reconciled overlay grammar (ceremony **Modal** vs utility **BottomSheet** vs **Skeleton** loading vs positive **Toast**), all live component instances, "reconciled to Blueprint v1.3", and even an **Error Handling** section.

- ✔ 🟠 **Md-1 — Literal `\uXXXX` escape sequences render as text.** *(verified resolved — not reproducible)* Every `\u` occurrence in Subscription / Ceremony Language / Rank Badges lives inside a **JS string literal** (evaluated to the real glyph at parse time), not template text. Rendered-DOM scans of Subscription and Ceremony Language returned **0 literal `\uXXXX`**; "Everything you've earned stays free — forever" prints with proper glyphs.
- 🔲 🟠 **Md-2 — Rank ladder makes Se-1 concrete: one user spans "Foundation III" → "Architect IV".** *(Progress-Hub half addressed — "Current Rank", badge, journey rung + PR now derive from ForgeUser/tenure; Legacy header rank also wired. Remaining: the Legacy hero **seal** is bespoke Foundation-only flame art — decorative, no visible rank text.)* Rank Seal shows Foundation = Tier I (the *starting* rank). Legacy calls self "Foundation III" (near the bottom); Settings calls the same self "Architect IV" (near the top). That's essentially a beginner and a near-max veteran labeled as the same person — the rank half of H1/Se-1.
- 🔵 **Md-3 (verify) — Error Handling is documented in the Modal Library but I did not hit a live error/empty-network state in any flow.** Confirm real screens actually invoke the documented error pattern (offline, failed load, empty search) — several hubs use Skeleton→content with no visible failure branch.
- 🔵 **Md-4 (good) — Ceremony vocabulary is coherent** ("struck", "engraved", "sealed", "raised from below", "it cannot be lost") across Honor Engraved, Legacy Unlocked, Rank Seal, Podium — matches the Ceremony Language spec. Keep this discipline as new ceremonies are added.

## 14. Internal / Library
_Not user-facing (rank badge sets, symbol/modal libraries, verification, build status, QA audit) — excluded from persona walk._

---

## Cross-cutting (also see H1 / A1 above)
- 🔲 🟡 **X-1 — Established persona dates are fixed literals scattered across ~10 files** — will drift/contradict; can't scale with tenure. (Subsumed by H1's recommendation.)
- ✔ 🔴 **X-3 — The "0 dead taps" QA pass missed DS `Button` / `x-import` CTAs.** *(verified resolved)* Re-scanned every `x-import …Button` project-wide. Ho-6's Home "Start Workout" already has `on-click="{{ startWorkout }}"`; all other live-screen primary/secondary/text CTAs carry `on-click`. The only handler-less Buttons are in component **showcases** (Forge Tier-3 Cards, Forge Modal Library) and a stale **print artifact** (`Forge Home-print-10htpqx.dc.html`) — none user-facing. No dead primary CTAs remain.
- 🔲 🟡 **X-2 — New-state (`?new=1`) leaks established data** (Wk-1 history, Ho-1 program, Lg-1 legacy). The sealed/new state isn't isolated from the default user's seed. *(was H2)*
