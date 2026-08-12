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
**Last Updated:** 2026-08-12 (**⚠ THE 24-PROGRAM CATALOGUE IS RETIRED AS A TARGET — PO: *"We are no longer doing 24 programs. That is least of ours right now since we have Coach Holt."*** This board had been calling 7-of-24 the largest remaining gap, which measured against a goal the product no longer has. Holt generates a program per athlete deterministically across 10 goals, so the catalogue is a Discover shelf and 14 definitions populate it adequately. **The content investment moved rather than disappeared:** `rulebook/skeletons.ts` already says *"THIS FILE IS THE COACHING"*, so the rulebook tables ARE the authored content now — and `limitations.ts` is flagged in its own file as the closest thing to health guidance in the app and still unreviewed. Also corrected two rows that had drifted badly: **Backend said 125 migrations when 143 had shipped**, and **Testing said 1,616 when 2,002 were green**. Shipped since the last entry: coach intensity with a mid-set weight nudge; the coin as Holt's single surface; tutorial phasing 23 → 11 steps on day one with the first tour telemetry this app has ever had; the weekly review on Home; swap + intensity capture; sharing made findable; the honor card saying WHY; and every athlete back on pounds and miles. **Migrations 0137–0143 applied and verified by the PO.** — Earlier: **Five more from a real training session, and t**Five more from a real training session, and the two worst were both the same shape: a feature that ran on only ONE of the two devices it was for.** A workout done together **never counted toward the guest's program** — the invite snapshots its shape for a good reason and dropped the guest's own `programId` along with the sender's, so Home offered a day they had already trained and one athlete re-logged an entire session by hand. And **only one of the two athletes was ever named** — every path that wrote `workouts.partners` ran on the device that RECEIVED something, so the person who SENT the invite and then went and trained tagged nobody; both sides now derive it from the accepted invite, the one row both can read. **"Log Set needs two taps"** was the sheet sliding 300px out from under the finger when the keyboard closed — `useKeyboardInset` now holds a shrink for one beat. **Coach Holt had no label**, so the athletes who never guessed the medallion was tappable never met him. And **signup alerts**, both halves — ⚠ a named list is a ROSTER, which AA-D2 forbids, so it is recorded as `Admin-Analytics-Amendment-001` (AA-D8/AA-D9) rather than broken quietly. Migration **0137** is self-contained and NOT YET APPLIED; nothing here is deployed yet. — Earlier the same day: **Three things the PO found by using it, and two were bugs this project had already fixed once.** The **Friends composer could not attach a photo or video and left the screen frozen** — it was the only capture surface in the app that opened a media picker from INSIDE a sheet, and the only one broken; `useMediaPicker` waits for the chooser IT owns to dismiss and knows nothing about a caller that is itself a modal, so the picker was dropped with nothing thrown and an invisible overlay kept swallowing taps. **`/squad-composer` is now the one composer for both feeds**, the audience picking the writer per Amendment 002 §4. **Nobody was ever notified that somebody answered them** — twelve notification branches and not one read the comments or reactions tables, so the app announced that you POSTED and never that anybody ANSWERED; SOC-D11 has locked "comments generate notifications" since the document locked and it was never built (0135, two branches, two different locked defaults — comments ON, reactions riding the `squad_reactions` toggle that has been inert for thirteen migrations, and the OFF default governs PUSH while the inbox always shows them). **A workout that moved the squad goal was a dead link for everyone but its author** — 0117 one door over: the goal screen lists the sessions that moved the number, but a contribution is not a POST, so the gate refused a row the listing had just offered (0134). Deployed to the web preview, `entry-18a2c2ead296c028102611448d51be56.js`, verified 200. **Migrations 0134 + 0135 NOT YET APPLIED** — `supabase/apply/pending-0134-0135.sql`. See Recently Completed #1. — previously: **One stalled socket could freeze the app forever.** The PO tapped a friend-request push and landed on the boot spinner, permanently. **Push routed correctly — the app never finished booting.** `getSession()` does not read storage and return: it awaits `initializePromise` → `_recoverAndRefresh()` → `POST /auth/v1/token` whenever the stored access token is inside its expiry margin, and **auth-js passes no timeout to fetch** while bounding its retry loop by *elapsed* time — so a request that never settles is never retried and never abandoned, holding `initializePromise` and every later auth call behind it. `AuthProvider` maps that to `loading`, `routeFor` maps `loading` to `'splash'`, and `BootLoading` **declares no screens and offers no retry**, so the app froze with a bronze spinner as the only symptom and could not recover even once the network returned. **A push tap is the reliable way to reach it** — the phone has been asleep long enough for the token to expire, and the first request goes out over a radio still coming up. Fixed in two places: `supabase.ts` supplies a `global.fetch` putting a **10s deadline on `/auth/v1/` URLs and nothing else** (supabase-js hands the same wrapper to PostgREST and Storage, so a blanket deadline would abort video check-in and transformation uploads mid-flight; `auth.fetch` is not an option — `_initSupabaseAuthClient` destructures a fixed list and drops it), and the boot `getSession()` gained a **rejection arm**, having been a bare `.then(fn)` that left `loading` true forever on any rejection, silently. **The standing lesson in a new costume: a loading state with no timeout and no escape is a crash that does not report itself** — tsc, lint and 1,716 tests were all green through it. **JS-only, so it is OTA-deliverable** (`eas update`, fingerprint unchanged) — it does not need a new build. Not yet deployed. See Recently Completed #1. — previously: **A lift you add yourself is for something.** Add-as-you-go had no way to say what an exercise was FOR: the Picker hands back **three sets of eight** for everything, which is a reasonable guess for a row and nonsense for a plank or a dead hang — and the guess was **unreachable**, because the only editable number on the card is "Actual", which records what you DID. Now the card asks, once, before the first set: `SetGoalPanel` between the hero and the set table, **above the Target column it writes to**, so question and answer are in one glance. **Reps** opens on 8 with − / +, and the value is a **live TextInput** rather than a `Text` that swaps to one on press — the swap needs `autoFocus`, a focus issued after mount and therefore outside the gesture stack iOS Safari requires before it will raise a keyboard. **Time** is typed as `MIN:SEC` with ± 15s, and **⚠ a bare number there is SECONDS — the opposite of `parseClock`**, where "30" is thirty *minutes*; both are right (a cardio bout is written in minutes, a set's work time in seconds), so neither can be shared. Writes go **straight through** to every unlogged set — no Apply to forget, `Done` only dismisses — and it is **reopenable** from the Goal figure, which now carries a pencil. **A time goal writes `targetReps: 1`, one held effort, never 0** (zero is the to-failure marker, reads as "you did nothing", and would put a zero-rep set into the volume behind a record), and **logged sets keep the target they were performed against**, which also protects rows a continued workout already committed. **⚠ Deliberately NOT built: the seconds actually held are still recorded nowhere** — `buildSaveExercises` sends `duration_sec` for cardio only and the completion screen recognises a bout BY that column, so a plank's clock would repaint three sets of planks as one cardio leg. tsc clean · lint at baseline · **1,716 tests**, 18 new; ⚠ the previous figure below is 18 high (1,716 with these, 1,698 without). Not yet deployed. See Recently Completed #1. — previously: **Progress Photo Post — a capture becomes a card you lay out.** Built to the `design_handoff_progress_photo_post` bundle (24 sections, 13 screenshots). Progress photos went out as one long vertical card that reads badly in an Instagram or Facebook feed, with no say in the layout. Now: **output format** (1:1 → 1080×1080 · 4:5 → 1080×1350, chosen with proportion chips above a live preview), **style** (Grid, up to 4 photos, **column count derived from how many are chosen** — 3 photos are a 3-up row, never a 2×2 with a hole; or Hero, one photo per swipeable slide, up to 6, dots derived from scroll position and never a control), **which poses**, **which entry**, **what is printed on the card**, and **where it goes**. **The preview IS the post IS the export**: one renderer draws the card in the composer, the squad feed and the post detail, and the exporter redraws the same geometry at **3.6×** onto a canvas — a Hero carousel exports **one image per slide, in order**. `checkin` is **retired from the squad composer** and replaced by **Progress Photos** as the first member type; every historic check-in still renders, because retiring a type changes what the composer OFFERS, never what the feed can READ. A Transformation entry's **Share** now opens this screen; **Compare is unchanged** and still ends at Share Configuration. **No migration** — `progress` has been an allowed `squad_posts.type` since 0074/0076, and the card rides in the untyped `layout` jsonb both feed RPCs already return. **Instagram and Facebook render the real image first and open the app second** — and if the render fails the app is NOT opened, because sending someone to Instagram with nothing on their camera roll is the same lie as a fake "Message ready" toast. tsc clean · lint at baseline · **1,716 tests**, 23 new, **7 mutants killed** (never-empty, cap-refusal, derived columns, footer collapse, the 3.6× scale, the default cap, index clamping). See Recently Completed #1. — previously: **"Weight" is a quantity, not a direction.** The PO set weight as a goal and was never asked which way — some athletes are adding 15 lb. Direction was **inferred** from `target < latest weigh-in`, a comparison with nothing to compare against before the first weigh-in: it fell to the column default `'up'` and **recorded a cut as a gain**. `syncAutoGoals` then re-inferred on the first real reading, so a "gain to 180" goal whose first weigh-in came in at 190 was **silently rewritten into a cut**. A goal that disagreed with itself — *Lose*, goal 200, from a 185 lb athlete — was saved as the opposite of what was typed, with no error. Now: **Lose · Gain** (Shrink · Grow for a tape measure), **required and unanswered by default**, Save held until it is answered, and `syncAutoGoals` back-fills only the baseline — **it no longer touches the direction**. The number can also be said either way — *a goal weight* or *an amount to change* — with the change **resolved against the baseline at save time and stored as the reading it means** (kept as a delta it would chase a moving weigh-in), stating the journey first: `165 lb → 180 lb · gain 15 lb`. A body goal **needs somewhere to start**, so with no weigh-in the editor takes one and logs it as a real `body_entries` row; if that write fails the goal isn't saved either. **Found while wiring:** the editor passed `metricKey` for `exercise_max`/`distance_total` only, so every *"shrink your waist"* goal saved `metric_key = null` and 0039's `case` on that key returned 0 — **those goals tracked nothing**. **No migration** — `metric_dir`/`metric_start_value` have existed since 0039; what was missing was anyone asking. tsc clean · lint at baseline · **1675 tests**, 8 new, the two carrying the fix **mutation-tested red**. Deployed and verified live. See Recently Completed #1. — previously: **A progress post is the capture, not one frame of it.** The PO shared a progress update from the Transformation tab and got back one photo. A COMPARE share had a Layout picker and a pose selector; an ENTRY share had neither — `firstPhoto()` took the pose you happened to be viewing when you tapped Share, posted it, and said nothing about the other five. **Not a limitation the athlete could see**, which is the part that matters: no picker, no count, no "1 of 6". The archive's unit is the CAPTURE — six guided poses shot together — and the share flow was the one place treating it as loose photos. Now: **All poses · Full width · Single photo**, defaulting to the gallery whenever there is more than one pose, with the same chip row acting as a chooser under Single and include/exclude toggles under the others. `TransformationLayoutData` gained `shots` beside `pairs`, and `EntryTemplate` is deliberately **disjoint** from `ShareTemplate` so one stored `template` never means two things and no reader infers "capture" from an empty `pairs`. Three surfaces had to stop drawing `media[0]` or the fix would have been invisible where it was reported: the saved card (`poseBlock`, every pose labelled — a capture has no first row that speaks for the rest), the **Friends feed** (new `gallery` shape; `shapeOf` returned `photo` for anything with media), and the **Squad feed card** (thumbnail row with the remainder counted). tsc clean · lint at baseline · **1651 tests**, 8 new. See Recently Completed #1. — previously: **Migrations 0119–0122 APPLIED and verified.** All five schema markers read `true` and `notification_events_for` is still unreachable from PUBLIC, so the SECURITY DEFINER revoke survived both rebuilds. Getting there cost two failed runs and exposed a real defect: 0120 created its union function with a bare `create function`, so the file raised 42723 on a second run — and a migration that cannot be re-run cannot be resumed, which is the only recovery this project has. Fixed, and `push.test.mjs` now asserts every migration in the set survives a second run (mutation-tested). — previously: **PO feedback batch 4 — ten items, and the QR code was never a QR code.** Two were live defects: check-ins read the entire video into the JS heap before a byte moved, with no progress, timeout, retry or size guard — which is why "taking long to post" and "not even posting" were the same picture — and the squad invite link was built from `window.location.origin`, so an invite generated on a throwaway `--hash` deploy URL pointed at a deployment that stops existing. **`buildQr` was not an encoder at all**: an LCG seeded from the invite code, three finder squares painted on, and four hundred coin flips — no format information, no timing pattern, no error correction, and seeded with the code rather than the link, so a working encoder in that slot would still have gone nowhere. Replaced with a real byte-mode encoder written in-repo, because a dependency would have moved the fingerprint. **Three spec'd surfaces were built**: joining a workout in progress (0121 — a snapshot join, not a shared session; the prerequisite was getting `exIdx` out of screen state, which also fixes resume), naming your first chapter AND renaming any chapter (there was no rename path anywhere, ever), and squad post/check-in notifications (0122 — the first fan-out branches, windowed at 14 days so the inbox does not become a second feed). **One item was already built** (playlist on the post) and **one was a decision** (help chat bot → Decision Queue #21). ⏳ 0119–0122 all await application, in order. — previously: 2026-08-07 (**Push notifications built — and four of the nine preferences turned out to be inert.** Nine push toggles had persisted since 0022 with no `expo-notifications`, no token column and no sender. The blocking question was that `notification_events()` is a *derived* read — nothing is ever inserted, so there was no moment to hang a send on. PO chose **triggers over a parameterised union**: `notification_events_for(p_user)` holds the body, `notification_events()` wraps it at `auth.uid()`, so the eight branches are defined **once** and the six triggers only ever decide *who* to re-scan. Only the delivery ledger is stored; the feed stays derived. **The brief's "seven branches" was stale — 0110 made it eight**, and rebuilding from the older list would have deleted `program_shared` as the fourth repeat of that failure. **Goal Completed / Honor Earned / Chapter Sealed / Rank Up were removed**: P-5 §1 (LOCKED) audited ceremonies out of push before it locked, and those four could never have fired. A `SECURITY DEFINER` escalation opened by parameterising the union was found and revoked **from PUBLIC**. Migration 0120 + paste bundle await application; push needs a **new iOS build** and cannot be tested on the web preview. — previously: **The workout preview summarised a session it could not have been describing.** PO review of the Today's Workout sheet: the visual design was not the problem, the information architecture was. **"6 EXERCISES · 19 SETS" sat over a day showing eight movement names** — both numbers arithmetically correct, both describing a session the athlete could not see. `main.length` counted the three stations of the Engine circuit as peers of the three lifts while the screen correctly drew them inside **one** bordered card, and excluded the two warm-up rows, so it matched neither the rows above it nor below it; `plannedSetCount` folded 3 rounds × 3 stations into nine "sets" — right about **volume**, which is what Program Detail asks it for, and wrong as a **description**. The summary now counts what the sheet **draws**: Squat & Sled reads **`~40 MIN · 3 EXERCISES · 10 SETS · 3-ROUND FINISHER`**, every number pointable at on screen, and `plannedSetCount` still answers 19 for the same day. **Duration leads** because it is the question actually being asked — an athlete at 6:40 wants to know whether this fits before work, not how nineteen compares to eleven — via a new `estimatedSessionMinutes` sharing **one** `MINUTES_PER_SET` with the template-side estimator, guarded so the program side cannot grow its own. **Start Workout was one of three peer buttons whose consequences are not peers**: "Skip this one" WRITES to the program schedule, so an inspection sheet was asking for a scheduling decision. Start is now the sole button with one subdued borderless line under it, and skipping was dropped on the reasoning that "Choose another workout" landed on Program Detail, which lists every outstanding session with its own Train and Skip. **⚠ A concurrent commit (`dbb70a2`) has since repointed that button at a same-week swap picker that stays on Home and does not skip — so the preview flow no longer reaches skip at all. The capability survives on the program screen; the gap is recorded in code and is OPEN.** **And the title was printed twice** — the hero passed `focus: day.name`, so the sheet opened the name over the name, **and the Home hero card had been doing the same thing above it**. **⚠ Deliberately not added:** thumbnails, muscle diagrams, coaching notes (this is decision support, not Workout Detail), and no "LOWER BODY · STRENGTH" subtitle — `split` and `modality` exist in the definitions but `adopt-core` drops both at `workoutToDay` and every adopted program's stored `structure` lacks them, which is a plumbing change of its own. tsc 0 · lint at baseline · **1266/1266**, with the five new sheet guards and the per-set drift guard each **mutation-tested red** first. **⏳ Not yet deployed.** See Recently Completed #1.) Prior 2026-08-07 (**Three real training programs were pasted into the importer and all three came apart.** A coach's spreadsheet imported as **23 days of exercises named after the whole spreadsheet row**, because the header row was assumed to be line one and a real sheet puts it on line five — so the Exercise column was never found and the whole thing fell through to the freeform reader, **which does not split cells**. The same sheet at three weeks **lost week 2 entirely**: its banner was indented one cell further than week 1's, which put "WEEK 2" *under the Exercise column*, so it imported as a lift and week 2's work folded silently into week 1. A program lifted out of a **PDF** read as one week of sixteen days — **the weekdays starting over is the only thing marking the boundary**, and `FOCUS:`/`TARGET:` labels sitting among the exercises split every day in half, three of them named "BACK" where the PDF wrapped the label. **Every guard is mutation-tested from both sides** — the day-heading test that separates "MONDAY" from "WARM-UP" fails if it is loosened *or* tightened. tsc 0 · **1238/1238** · deployed and the live bundle grepped. **⚠ Unchanged: an imported exercise holds only sets and reps, so minutes, metres and per-side counts still have nowhere to go.** See Recently Completed #2.) Prior 2026-08-06 (**The blue flash on launch was Expo’s brand blue, and the update that fixed it could reach nobody.** `AnimatedSplashOverlay` filled the screen with `#208AEF` for 600ms on every launch — `create-expo-app` template code covering the gap between the native splash and the first frame, in a colour that IS the gap. Now `#0E0E12`, guarded against drift from `app.json` and mutation-tested. **It survived because `animated-icon.web.tsx` returns `null`**: the overlay does not exist on web, and the web preview is where every review happens — **a `.web.tsx` that renders LESS than its native twin is a blind spot, not a simplification.** **⚠ `eas deploy` is WEB ONLY.** The phone needs `eas update`, and the one published today landed on runtime `356ebf69` while the TestFlight build is `d2cdb7b5` — a green "✔ Published!" that reached zero devices. `fingerprint:compare` named the whole native delta as **`eas.json`**, whose only change was `submit.production.ios` gaining `ascAppId`/`appleTeamId` — **submission-only fields with no effect on the binary**, because `@expo/fingerprint` hashes the entire file. Reverted, fingerprint matched exactly, republished; the live update is now on `d2cdb7b5`. **⚠ It also surfaced that the 2026-08-05 SVG-glow fix went to BUILD 1 (`75e9448e`) when build 2 already existed — it may never have reached anyone.** Also fixed: `ScreenBackground` passed an rgba string into an SVG `<Stop>`, so the 6% apex haze painted as solid #587CA0 on Friends Feed and Squad Detail. New `Docs/Release-And-OTA-Runbook.md`. tsc 0 · lint at baseline · **1206/1206**. See Recently Completed #1.) Prior 2026-08-06 (**THE STANDARDS AUDITED AGAINST EACH OTHER — four conflicts closed, one handed back, one of mine withdrawn.** New `Docs/Program-Authoring-Standard-Reconciliation-2026-08-06.md`: every PAS decision D1–D12 read against `src/domain/training/schema.ts` and measured against all 14 shipped definitions. **⛔ The finding that reframes the others was not on the list of five: the Standard governs a product that was never built.** §2.3 specifies an `ExercisePrescription` with `exerciseName`, `order`, `weightValue` and a 200-char **`notes`** field; the shipped model has none of them, has **no `notes` field at all — deliberately, and documented as such** — and has ten fields the Standard never mentions (`repsMax`, `per`, `repScheme`, `percentOfMax`, the five group fields, the cardio fields). **`ProgramSlot`, specified in detail in §2.2, appears nowhere in `src`.** The Google Sheets template (§12), the import tool (§16 Group A, "Automated — Import Tool Will Catch These") and the import-to-publish workflow (§17) do not exist: 2 of 14 programs came through the `.docx` ingest and **the other 12 were authored as JSON and gated by `programs.test.mjs`, a suite the Standard has never heard of.** Three separate rules — RPE, rep-range upper bounds, superset encoding — all depend on that one absent field. **Not amendable; it needs a PAS v2.0**, and until then the Standard is authoritative on POLICY and unreliable on MECHANISM — which is the real hazard, because an author cannot tell which half they are reading. **✅ Amendment 005 (warm-ups):** the PO’s 2026-08-06 instruction retired 244 of 405 warm-up items, was carried out correctly, and §9 was never updated — leaving **114 of 244 non-MOBILITY sessions, 47% of the catalog, in breach of a LOCKED standard**. Required → **required where authorable**; count 3–6 → **1–4**; plus two new binding rules that catch different things (must resolve to the **visible** 721; **no ramp sets** — "Barbell Bench Press, empty bar" resolves perfectly and is still one). This is the recurring failure in its purest form: not an amendment left unmerged, but a decision made, implemented and test-guarded that never reached the rulebook. **✅ Amendment 006 (deload vs volume floor):** PAS-D7, PAS-D8 and PAS-D11 **cannot all be obeyed** — clearing an 18-set floor after a 45% cut needs working weeks at 33 sets, above the band ceiling of 30. Live in **7 sessions across 2 programs, one LOCKED with it open.** The floor is now scoped out of deload weeks; the ceiling still applies everywhere. **✅ Amendment 001 found UNMERGED** since 2026-08-03 — §10.3 still told authors to declare supersets in `notes`, a field that does not exist, for a feature the model has supported since migration 0106. The audit found it; nobody had reported it. **⚠ Handed back — a product decision, 34 live sessions:** 41 sessions sit below their PAS-D11 floor and only 7 are deloads. The rest are programs training **five and six days a week**, where 14 sets × 5 sessions is 70 sets a week — more than a 3-day program at 22 a session that passes comfortably. **PAS-D11 is a per-session rule measured against per-week training, so it penalises frequency for being frequency**, and none of the four filed the deviation note §10.1 requires. Recommendation: read the floor per week above a frequency threshold, keep the per-session ceiling. Not decided here — it changes a locked guardrail for the whole catalog. **↩️ WITHDRAWN, mine, same day:** Mobility Foundation’s 8.0–9.6-minute week 1 is **not** a Standard conflict — §10.2 calls its own ranges "quality-review guidelines, not import rules" and asks for a written note when a program falls outside, which the Design Record §7 is. Corrected in all three places the claim landed. A finding argued down is worth more than one that quietly disappears, and that has to apply when the finding is mine. **Also recorded:** `PAS-Amendment-002` is cited three times with no amendment document behind it, and the change log had no entries for Amendments 003 or 004 — both backfilled as v1.5. PAS → **v1.6**. No program content changed, no JSON re-authored, nothing an athlete sees is different. tsc 0 · lint at baseline · 1197/1197. See Recently Completed #1.) Prior 2026-08-06 (**Mobility Foundation authored — programs 6 of 24 → 7 of 24, and the sixth and final family opens.** It is the first program in the catalog that is not sets and reps: MOBILITY is MAIN-only (PAS-D9), so all 20 sessions carry `warmup: []` — the one place in the repo where an empty warm-up is a SPECIFICATION rather than the 2026-08-06 sweep having stripped a session bare — and the progressed variable is **hold duration**, 20s in week 1 to 50s in week 4, while the dynamic drills stay frozen for all four weeks. **⚠ It could not be authored until a THIRD write-only field was fixed.** `ExercisePrescription.per` — "3 × 10 **per leg**" — was authored on **142 prescriptions across all thirteen existing programs and read by nothing**, so every Bulgarian split squat, walking lunge, dead bug and single-arm row reached the athlete as half of itself. Same shape as `repsMax` and the rep ranges before it, and the worst of the three: a dropped range shows LESS than was asked for, a dropped side shows a DIFFERENT, complete-looking prescription. Fixed end to end (carry · `schemeText` · `SessionExercise` · the three places the logger states the ask), with `reps` staying per side because doubling it would corrupt every e1RM and PR. **The guard was mutation-tested and the first attempt lied** — the mutation had not applied (CRLF file, LF pattern) and all nine tests stayed green. **Two things recorded rather than smoothed over:** week 1 runs 8.0–9.6 min against §10.2 own 10-minute floor and is LEFT there (padding it would bend the training to hit a table — the fourth Standard conflict of that shape), and **15 of its 29 positions have no demo clip**, measured by ONE bucket listing rather than per-id HEAD requests; they were deliberately NOT queued in `pending-clips.json` because `process_pending.py` silently skips null-src entries. Design Record recommends **HOLD, not LOCK**. Also committed: the **244-warm-up cleanup** and the **duplicate-row catalogue audit**, both of which this board had already claimed while they sat uncommitted in the working tree. tsc 0 · lint at baseline · **1197 of 1197**. See Recently Completed #1.) Prior 2026-08-06 (**Body Recomposition Foundation authored — programs 2 of 24 → 3 of 24, and the first one built from the Stage-2 production plan rather than because somebody wanted to build it.** The PO brought in a free third-party PDF (*8 Week Beginner Fat Loss Workout*, muscleandstrength.com) and asked to tweak it into the catalog; **it was not tweaked**, because a light edit of a published program keeps what is protected (name, session titles, authored sequence, copy) and changes what never was. The METHOD was taken and the program authored — the posture `scripts/bridger-logan/` and Squat Ascent §1 already set. **The slot was already LOCKED and already matched:** the June Blueprint fixes 8 weeks · 4 sessions · 32 workouts · CONDITIONING/BEGINNER/GYM · `LOSE_FAT + BUILD_MUSCLE` · Week-7 deload — the PDF's shape, months earlier and independently, which is why the source was worth a look and also why it was not needed. ⚠ **The source is thinner than our own standard**, which is the substantive reason not to have copied it: **no progression at all across eight weeks** (its 10-rep and 20-rep days are two of the four workouts, not two phases, so the same four sessions repeat for the block), no warm-up, no cool-down, no deload, and 12 MAIN sets — the floor of the 12–24 envelope. Shipped: 5 blocks over all 32 sessions, Upper/Lower ×2 (*Press & Pull · Squat & Stride · Row & Raise · Hinge & Bridge*), **Volume Accumulation** 15→15→18 sets and 10→12→12 reps, **Week 7 stripped to the four compounds at 8 easy reps and a walk**, Week 8 peaking at 18 × 15. Every session resistance-led and closing on one steady bout (bike · incline walk · elliptical) timed via `targetSec`, which `adopt-core.ts` was verified to carry across before a line was authored. **No barbell anywhere** — PAS §11.3 read strictly, because a beginner in a deficit is the worst-placed athlete in the catalog to be acquiring squat technique. All 23 keys resolve against the **visible 721**, not the 797. **14 acceptance tests, each proven by mutation** — a smuggled barbell, a flattened deload, a broken envelope, a misplaced finisher and rest past 90 s all turn the suite red, and the file restores clean. ⚠ **One known standard violation, recorded rather than faked:** nothing prescribes a cool-down, because `ProgramWorkout` has no field for one — Iron & Engine's finding 7, now hit by a **second** CONDITIONING program, which is the point where "recorded as an open gap" stops being enough. ⚠ **Separately surfaced: `svg-gradient-stops.test.mjs` matches its own doc comment** and has failed on every run since it was committed in `157bf34` — `git grep` sees only tracked files, so it passed while the file was still untracked. Left alone; unrelated to this work. tsc 0 · lint at baseline · **1072 of 1073 `node --test`**, the one failure being that guard. NOT committed. See Recently Completed #1.) Prior 2026-08-06 (**the catalog programs prescribed 244 things the app cannot show — 232 warm-ups resolving to nothing, 12 empty-bar ramp sets, and `air-bike` ×7 in Iron & Engine’s circuits. The acceptance gate had been checking `exercises.json` (797 rows) instead of the VISIBLE catalogue (721), so it called them clean. Gate corrected, warm-ups cut to 161 real exercises, Air Bike swapped for Burpee/Ski Erg by PO decision.**) · 2026-08-06 (**migrations 0117–0118 applied — backend now applied through 0118; the three run-time proofs are still unpressed.**) · 2026-08-05 (**PO batch 3 — four items, and two of them were a chart and a link that had looked finished for months while telling the athlete something false.** (1) The **Forge template preview had no Start**, so training one of the 81 shipped sessions meant filing a copy in your library first — now `starterId` on the launch context trains it owning nothing, and *not* via the invite-snapshot field, which would have dropped warm-ups and turned the **29 cardio-finisher definitions** into sets of a run. (2) The **Program Builder's Day Builder can take a whole template** as the day being built — one search over the athlete's own and Forge's, with replace-or-add, name preserved, and **group ids remapped** so appending a template twice cannot fuse two supersets into one. (3) ⚠ **The Progress Hub's lift charts were plotting the wrong thing.** They read `personal_records`, which only gains a row when a set BEATS the best — so a lift trained hard for months without a PR drew a flat line or none, a lift never PR'd could not be charted at all, and **nothing could ever go down**. The value was **Epley e1RM**, a weight nobody ever moved, which `metrics.ts` had already ruled out in this codebase for records. Now **one point per day trained at the heaviest weight actually moved**, carrying its reps; a never-loaded lift charts in reps; record days still marked; gridlines, dated ticks and a scale added from the `.dc`; every logged exercise selectable. (4) ⚠ **A shared workout recap was a dead link for everyone but its author** — `fetchActivityDetail` is `athlete_id = auth.uid()`, so the whole audience a recap was written for got "Couldn't load this session", while the Squad feed sent the same post type somewhere else entirely. **Migration 0117** gates one session read on **the post, not the relationship**, withholding the ordinal, chapter, partners and program id by design. (5) **Accomplishments can carry a photo or a video** — 0023's `photo_url` had been "reserved" and unwritten since it was created; **0118** renames it `media_url` + `media_kind` rather than adding a second column. tsc 0 · lint at baseline · **1057 `node --test` green** · web export clean · **deployed and verified live**. ⏳ **0117–0118 NOT YET APPLIED** — `supabase/apply/pending-0117-0118.sql`; 0118's rename must land with the deploy or accomplishments read empty. See Recently Completed #1.) Prior 2026-08-05 (**The app can now be BUILT — and none of what that requires existed.** No `eas.json`, no `ios.bundleIdentifier`, no `android.package`; both bundle IDs are now `com.qest4.forgelegacy` and permanent from first submission. `slug` deliberately untouched — it is what ties this project to **forgelegacy.expo.app**. EAS environment variables point at the **same Supabase project** as the web app, which is the whole reason a tester can install the store build, log in, and find their history there; a separate "production" project would have handed them an empty app. `appVersionSource` is `local` against the modern default because `account-settings.tsx` reads the build number from `Constants.expoConfig` and remote versioning would have rendered **"Build —"** on every device. ⚠ **The pass found a defect nobody asked about.** `.easignore` REPLACES `.gitignore` rather than supplementing it, and ours was one line written for `eas deploy` — so the first `eas build` would have uploaded **node_modules (646 MB)** and **design_reference (254 MB)**; rewritten to serve both commands. **Over-the-air updates added** (`expo-updates`), without which every one-line copy fix costs a store build and a review — at `runtimeVersion` policy **`fingerprint`**, not the `appVersion` that `update:configure` wrote, because `appVersion` trusts the developer to notice that a change touched the native runtime and the failure mode when that memory slips is a crash on launch for everyone already installed. `update:configure` also wrote a doubled `android.permissions` array (12 entries, 6 unique); deduped. tsc 0 · **996 `node --test` green** · web export clean with the PWA title and manifest verified unchanged. **No build has been run and no store accounts exist yet** — Apple/Google enrolment, privacy-policy URL, screenshots and submit credentials are all still open. See Recently Completed #1.) Prior 2026-08-05 (**The Forge template library went 6 day-sessions → 81** — seven focuses (push · pull · legs · arms · chest-triceps · back-biceps · glutes) × gym/home × three levels, tracked for men and women; **579 rows, 240 distinct catalogue exercises, 29 ending in a conditioning block**. The six originals keep their ids — `push-day`/`pull-day`/`leg-day` are now the gym/Intermediate men’s cells of the grid, so only their display names changed (a name is snapshotted on adopt; an id is not). ⚠ **The pass found a defect nobody asked about.** `schemeText` renders a cooldown row at `targetReps >= 30` as SECONDS, but that convention exists only on the PREVIEW surfaces — `workout.tsx` renders `{targetReps} Reps` flat, so a 45-second stretch would have reached the athlete as **forty-five stretches**. The authoring brief had explicitly permitted it and the agents used it: **24 such rows removed**, and `definitions.test.mjs` now fails any strength row at `targetReps >= 30` — the guard the old file header asserted without enforcing. Cardio finishers round-trip via `targetMi` ONLY: `cardioExercise` never reads `targetDurationSec`, so a duration would be stored, adopted, and silently dropped. `venue` is authored rather than derived, because `equipment.json` calls the barbell home-gym equipment and a bedroom is not a home gym — `HOME_EQUIPMENT` is the product answer and the test holds every home row to it. **The shelf stopped being a list**: W-26 sat above the athlete’s own templates, so 81 cards would have buried them; it now samples one per focus matched to profile sex and links to a new filtered `/forge-templates`, **declared in `_layout.tsx`** since a route here is gated by being declared, not by existing. The audience filter is a default, not a gate — `unspecified` opens on everything, never quietly read as male. tsc 0 · lint at baseline · **994 `node --test` green** (22 in `definitions.test.mjs`, was 10). No migration — 0115 already carries adoption. See Recently Completed #1.) Prior 2026-08-03 (**A program can now be loaded from a tested max — and the first one that is, Squat Ascent Intermediate, is live.** The prescription model had no load field of ANY kind: sets, reps, ladders, timed work, circuits, but nothing that could say *at 75%*, so a peaking block could only be stored as "5 × 5" — the same shape as the session with the training taken out. Migration **0111** adds `athlete_lift_maxes` (what you currently lift) and `programs.lift_maxes` (what THIS RUN was built from, frozen at the gate, because a PR in week 2 raising every remaining prescription would land the week-4 rehearsal somewhere the program never intended). **Two defects the tests caught before anyone ran it**: Epley inflates a true single by 3.3%, so "315 for 1" would have been recorded as **326** with a month of percentages computed off it; and Squat Ascent asked for **five** maxes including a "Tempo Squat max" nobody tests. **Two things needed no code at all** — "changing your max never touches a finished session" fell out of `buildLog`, which already draws completed days from what was LOGGED and future days from the PRESCRIPTION. ⚠ **The ledger is non-sequential: 0111 is APPLIED while 0109 and 0110 are still PENDING** (safe — 0111 depends on neither). tsc 0 · lint at baseline · **955 tests** · deployed and verified live. Commit `35a341e`. See Recently Completed #1.) Prior 2026-08-03 (**Two tester-reported defects in the friend loop, both closed — see Recently Completed #1.** ⏳ **Migration `0109` is authored and NOT YET APPLIED.** (a) **Friend requests notified nobody.** `notification_events()` was dropped and rebuilt for a return-type change at **0088**, and rebuilt *from the 0054 body — which predates friends*, silently losing the `friend_request` and `friend_accepted` branches; **0092** rebuilt again "identical to 0088" and carried the omission forward. Two migrations, no error, no failing test, and no symptom until an athlete with no squads received a request. The `/inbox` client has handled both kinds correctly since 0073 — every one of those branches was unreachable. The bell badge was wrong for the same reason. (b) **`/add-friend` gave you a sentence instead of a person** — a resolved handle rendered as grey status text with nothing tappable, so verifying you'd found the right account meant sending a request and seeing. Now a row that opens `/athlete/[id]`, like every other list on that screen. Gates: tsc 0 · eslint clean on the touched surface.) Prior 2026-08-01 (**PROJECT AUDIT + CORRECTION PASS — this board rebuilt from a fresh measurement, and five defects closed.** Measured ground truth: **72 app screens · 97 migrations (0001–0098, ALL APPLIED) · 508 `node --test` green across 40 files · tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 430 TS/TSX · 87,450 LOC · 210 commits · HEAD `d5a0db3` · 257 `Docs/**/*.md`**, live at forgelegacy.expo.app. **The board was wrong in the project's favour and against it at once**: it claimed 37 screens (72), 28 migrations (97), 411 tests (508), and a social pillar "fully MOCK, quarantined in `*-placeholder.ts`" that has been Supabase-backed for weeks — while its Current Sprint still described the pre-implementation Architecture Freeze that closed 2026-06-30. **The data layer audited clean, verified mechanically rather than asserted**: 53 RPC names, 61 call sites, 434 select columns, 119 write payloads all resolve; RLS on all 35 tables with a policy each; 52/52 `SECURITY DEFINER` functions pin `search_path`. **What the audit found was a class nobody had checked — values displayed from columns nothing writes.** `chapters.honor_count` was written once as a literal 0 and incremented by nothing across 97 migrations, yet displayed as a real tally on Chapter Detail, the Legacy Timeline, the public profile, and the M-5 seal ceremony — which told an athlete they earned "0 honors" in the chapter they were closing (fixed: migration 0098 derives it). Also closed: **17 routes outside the auth guard** (a route is gated by being DECLARED, not by existing), **invented athletes compiled into the production web bundle** (gating a screen does not tree-shake a module; verified gone by rebuild), and three silent failures. Three findings deliberately NOT fixed, with reasons in Current Sprint. **The critical path is now CONTENT — programs 2 of 24, exercise media 0 of 797 — not plumbing.** Commits `8179a10`, `e6fc901`, `d5a0db3`. See Recently Completed #1.) Prior 2026-07-31 (**Ground truth: 71 app routes · 93 migrations (0001–0094, ALL APPLIED) · 411 `node --test` green · tsc 0 · lint at baseline (1 pre-existing error, 13 warnings) · 416 TS/TSX · 83,329 LOC · 194 commits · HEAD `f3901fe`**, live at forgelegacy.expo.app. **The migration backlog is clear for the first time** — every migration through 0094 is applied and verified against a real account. This session: a **full fabrication sweep** (Recently Completed #1), the **workouts cluster** (#2, migrations 0090–0094), and the **honors chain completed** (#4). The board below still carries pre-implementation Sprint/Freeze language from the design phase and OLDER dashboard cells that a full **Project Audit** should reconcile — the numbers in this line are the measured ones; where a cell disagrees, this line is correct.) Prior 2026-07-25 (**PROJECT AUDIT — reconciled to the committed, tested app after a large build session.** Ground truth: **37 app routes · 28 migrations (0001–0028) · 416 `node --test` green · tsc 0 · lint clean**, live at forgelegacy.expo.app. The prior board (audit basis 07-23) predated this session's shipments, ALL now COMMITTED (~25 commits `8feb8d3`..`cc64f6d`): **Goals G-1** (chapter-scoped, migrations 0025/0026), **Chapter Detail L-3/L-4** + **M-5 seal reflection ceremony**, **Bucket A/B Legacy polish + in-app sheets** (My Standard editor, ConfirmSheet sweep, featured-replace picker), the **entire Rank system** (RCM compute engine `src/domain/rank` + signal aggregation + in-app persist/trigger + M-1 + all 7 families' badge art background-cut & imported + **Rank Progression** screen; migration 0027), and the **full P-2 Progress Hub** (hero · rank journey · strength cards + Metric Detail overlay + Edit Metrics sheet · consistency · body metrics backend migration 0028 + Log Weight · what's next). **The dashboard's old "critical path: Goals + Progress Hub + social backend" is now Goals ✅ / Progress Hub ✅ / Rank ✅ — leaving SOCIAL as the sole fully-mock cluster** (Squads/Friends/Communities/Post/Athlete-detail — no `friendships`/`squads`/`communities`/`posts` tables; full model sits UNAPPLIED in `supabase/design/0002_full_model.sql`; cleanly quarantined in `*-placeholder.ts`), plus **content** (~4/24 programs · 0/195 exercise media · partial honor catalog) and **media** (no photo/video upload → Transformation/Photos/Trophy unbuilt). Doc-vs-build gaps: rank built IN-APP w/ shipped athlete types (Strength/Bodybuilding/Endurance/Hybrid) vs the RCM's server-authoritative Running/Boxing wording — needs an amendment per PD-7. `rank-progression.tsx` now orphaned (badge → Progress Hub). Next: **social backend**, then honors-catalog mapping + media backend.) Prior 2026-07-20 (**P-1 Dissolution Amendment** — docs reconciled to the design layer: P-1 Profile + P-4 Settings Root DISSOLVED, content redistributed to Legacy + Account Settings, 5 orphaned capabilities recorded, My Standard/Trophy Case flagged built-but-unspecced. See Recently Completed #1.) Prior 2026-07-19 (**Project Audit v2 — reconciled to the Supabase-backed, on-ramp-complete app.** The 07-15 audit corrected the "0% code" lie, but the board still predated three big shifts: (1) the **backend pivot to Supabase** — the design doc ratifies Firebase, but the BUILD is Supabase: **24 migrations** (auth · profiles · chapters · workouts+sets · PRs · `honor_instances`+`evaluate_honors` · programs · pins · timeline), RPCs `complete_onboarding`/`save_workout`/`evaluate_honors`/`claim_initiative_honor`, RLS throughout — so **backend-wired is NO LONGER 0%**; (2) **auth + onboarding + a live web preview** (forgelegacy.expo.app); (3) this session's **first-run on-ramp** — guided tour, First Honor Ceremony, persisted **Initiative** honor (3 triggers), **Honors Hub** (L-10/L-11). Fresh evidence: **334 TS/TSX (+20 test files) · 52,713 LOC · 116 commits · 31 app routes · 24 migrations · 385 `node --test` green · `tsc` 0 · ESLint 1 pre-existing error+warnings · 249 Docs.** Core flows (auth/onboarding/workout-save/honors/programs/legacy) read+write real Supabase; **social (friends/squads/communities) + goals backends remain placeholder** — the main gap. Board stays UNCOMMITTED per the established pattern.) Prior 2026-07-15 (**Project Audit — Dashboard reconciled to the real committed tree.** The six-dimension Dashboard + Project Health + Implementation Status + Statistics + Evidence tables all still read **Code 0% / Testing 0% / "unmodified Expo starter" / 19 files** — stale cells that predate the entire design-handoff implementation (the buried narrative paragraphs had been updated; the summary tables never were). Corrected against fresh evidence: **227 tracked TS/TSX files · 33,229 LOC · 56 commits (45 touch `src/`, 17 feature-code this session) · 176 `node --test` green across 14 files · `tsc --noEmit` 0 · `expo export --platform web` clean.** Honesty carry-through: repo-wide **ESLint has 1 pre-existing error** (`use-color-scheme.web.ts`, react-hooks/set-state-in-effect — in an app-shell prereq, not an authored unit) + 14 warnings, authored per-unit surfaces clean; **backend-wired = 0%** (every screen reads placeholder data). Every corrected number cites its derivation; where a coverage % is not instrumented the cell reads **"not measured," not a guessed figure**. Board stays UNCOMMITTED per the established pattern.) Earlier same day: (**Design-handoff — social + squad surfaces + feed system built; peripheral roadmap CLOSED (CODE, COMMITTED to `main`).** This session shipped the social/squad build on `main`: full-screen Home match + **4-tab nav** (Home · Workouts · Legacy · Squads); **Friends Feed** + the shared **`FeedPostCard` (CLA-C34)** every feed surface consumes; the full **Post Detail** viewer; the **Community feed** converged onto the shared card (test-gated model merge) then **SHELVED behind launch** (tab removed → 4 tabs, screen preserved non-routed at `src/deferred/community.tsx`, `/community`→Home redirect, shared card/model/goldens kept live — reversible); **Squad Detail (S-2)** — feed on the shared card with **3 additive content types** (checkin / challengeUpdate / traintogether) + per-squad **firewall goldens**, the check-in strip + active-competition banner, a **single squad-member source** (roster + check-in strip both derive from one list → no same-screen contradiction), a read-only **Squad Records** book (holders ⊆ roster), and **visibly-disabled** settings + composer **inert shells** (the first squad write paths — no fake mutation, no data-layer write path). Correctness carry-forwards closed: **Phase-0 program plates** now carry the real `Program` schema (`durationWeeks/frequencyPerWeek/structure`; renderer formats via a shared `formatProgramMeta`; PRs kept as one uniform display-string convention, **blocked-on** a `PersonalRecord` model); the **comment count derives from the thread** (no phantom count over an empty thread); the handoff's **sex-default bug** confirmed already FIXED + regression-tested (only real neutral artwork remains, **blocked-on** Phase-4 assets). Discipline held throughout — single-source invariants goldened (comment ⊆ thread, check-in ⊆ roster, records ⊆ roster), absent fields omitted not fabricated, no art fabricated, every write path an honest inert shell. Verified across the cluster: **tsc 0 · ESLint clean · 173 `node --test` · `expo export --platform web` clean.** **~15 commits `70866df`..`b35824d`.** Peripheral roadmap **CLOSED**; the only open items are **BLOCKED-ON externals** recorded in `design_reference/…/FORGE_DELTAS.md`: PR-structuring (needs a `PersonalRecord` domain model, §11), neutral artwork (Phase-4 assets, §7), Modal-family verified via temp inline render (§12). ⚠ **The Project Dashboard table below (Code / Testing 0%) is STALE — it predates the entire design-handoff implementation; a full Project Audit is due to reconcile it with the committed, tested app.**) Earlier: 2026-07-14 (**Design-handoff Phase 2 — Home re-layout to `Forge Home.dc.html` (core deliverables) COMPLETE (CODE, working-tree).** Retired the fused, artwork-less `MissionCard` on Home; built a dedicated **resolver-driven `TodaysWorkoutCard` hero** (consumes `resolveHomeWorkoutArtwork` + `enrichSessionExercises`; shows resolved art + title + focus + count) over a separate **`ProgramMissionGrid`** (Program tile = real active program; Mission tile = HOME_DATA placeholder); AppBar avatar now reads `getSelfProfile()` (dropped hard-coded "Ada Ridge"). Imported the 4 resolvable artwork collections (**72 prototype-crop PNGs**, male+female) into `assets/artwork/` + a generated `asset-registry.ts` (`assetPath → require()` map, Metro-static) + `resolveArtworkSource` with a graceful no-image fallback; a **registry-coverage test** fails if any resolver-producible assetPath lacks an entry/file (never a silent broken image). Kept `HomepagePrinciple` + `TrainTogetherCard` as-is; `MissionCard` kept as a marked-legacy file (non-destructive); `HOME_DATA` intact. **Verified:** tsc 0, ESLint clean, **130/130 `node --test`** (incl. 4-case registry coverage); **`expo export --platform web` builds clean (exit 0, 1418 modules)** and Expo static rendering executes the Home route — its HTML contains the REAL data ("Confidence Builder", "Full Body", "7 Exercises", "Strength Foundation I (3-Day)", Program `0 / 18`, "Chapter III"), and all 72 artwork assets (incl. the resolved `training-splits/male/full-body.png`) are bundled. No browser/emulator in this env to capture a live screenshot — run `npm run web` / `npx expo start` to view. Active = Foundation I (3-day) → hero art `training_split:full_body`, neutral. Follow-up = full-screen match (ornate title block, Your Circle, Quick Actions) + Phase 3/4. See Recently Completed #1.) Earlier: 2026-07-14 (**Design-handoff — Programs `.docx` → structured data conversion COMPLETE + PROMOTED (CODE, working-tree).** Non-destructive conversion (Decision Queue #6) of the authored `Programs/*.docx` into structured `ProgramDefinition` JSON, then wired Home's runtime accessors to the real data and deleted the fabricated placeholder. New `src/domain/training/ingest/` pipeline (extract → match → derive → generate; zero-dependency `.docx` ZIP reader; source-verification guard; reuses the Phase-1 muscle bridge for per-workout split). PO-gated decisions applied: only the **2 LOCKED programs** generated — **Strength Foundation I (3-day)** (theme `beginner`, structure `full_body`) and **II (4-day)** (theme `strength`, structure **omitted** — per-workout split, honest about its `upper` accessory day); Foundation I (4-day) **HELD** (DRAFT); Foundation II (3-day) **EXCLUDED** (source file is mislabeled research content). 17 exercise names auto-matched + 10 PO-confirmed; all 27 catalogKeys verified to exist (generator aborts on any dangling key). `getActiveProgram()`/`getPrograms()` now read real definitions via `active-program-core.ts`; active demo program = Foundation I (3-day), next workout "Confidence Builder" (`full_body`) → resolver returns `training_split:full_body`, neutral. Placeholder `training/placeholder-data.ts` **DELETED**. Verified: tsc 0, ESLint clean (new surface), **45/45 domain tests** (one-active invariant + validator + resolver all green against real data), `.docx` byte-untouched. Content gap noted: only Strength programs exist — non-strength theme/modality artwork stays unexercised against real data. See Recently Completed #1.) Earlier: 2026-07-13 (**Design-handoff Phase 1 — Home Workout Artwork Resolver + asset manifest + §16 test matrix implemented (CODE, working-tree).** Ported the handoff's `forge-artwork-resolver.js` to a production, dependency-free TypeScript resolver at `src/domain/home-artwork/` (`resolver.ts` 7-rung precedence, `manifest.ts` registered key→asset with reserved Legacy/Honors guard, `bridges.ts` the two carry-forward lookup tables — MovementPattern→exercise-family and MuscleId→split, `catalog.ts`/`catalog-core.ts` enrichment from the real 794-exercise catalog). Corrected a reference-JS latent bug: `conditioning` art lives in `training_split` on disk, not `workout_modality`, and every rung now validates against the manifest so a missing asset always fails safe. Verified: `tsc` 0 errors, ESLint clean, **40/40 `node --test`** (33-case §16 matrix incl. determinism + "never Legacy/Honors", full bridge coverage over all 18 movement patterns + 29 muscle ids, real-catalog enrichment + seed→resolver e2e). Enabled `allowImportingTsExtensions` in tsconfig so the resolver runs under both Metro (0.84.4, supports explicit `.ts` extensions) and `node --test`. **Gate held — Phase 1 §16 matrix is green, so Phase 2 (Home re-layout) is now unblocked.** Not yet committed. See Recently Completed #1.) Earlier: 2026-07-13 (**Design-handoff Phase 0 — data-model foundation implemented (CODE, working-tree).** First implementation slice of the new high-fidelity design handoff (`design_reference/Forge Modal Library Design/`), building the structured data model the handoff's Home Workout Artwork Resolver depends on. New `src/domain/profile/` (`Sex` incl. explicit `'unspecified'` + `UserProfile`) and `src/domain/training/` (`Program`/`Workout`/`SessionExercise` + the resolver's enums; `targetMuscleGroups` typed to the canonical `muscles.json` vocabulary), each a typed `schema.ts` + placeholder seed mirroring the existing `src/domain/*` idiom. **Non-breaking** — the existing flat `HOME_DATA` is untouched until Phase 2 re-lays-out Home. Fixes the handoff's model-level sex-default bug (missing sex = `'unspecified'`, never `'male'`). Verified: `tsc` 0 errors, ESLint clean, seed test 7/7 (`node --test`), plus an end-to-end run of the handoff's own reference resolver against the seed returning the correct deterministic result (`training_split:lower`, `sexVariant:neutral`, no reserved collection). Two Phase 1 carry-forwards pending: the MovementPattern→exercise-family bridge and the muscle-id→split bridge, both to be explicit unit-tested lookup tables. Source of truth for divergences: `design_reference/Forge Modal Library Design/design_handoff_forge/FORGE_DELTAS.md` + the resolver spec. Not yet committed. See Recently Completed #1.) Earlier: 2026-07-12 (**Onboarding reconciliation** — brought the downstream O-series wireframes + H-1 into conformance with the governing `Onboarding-First-Time-Journey-Architecture-v1.0`: **O-2 → v2.0** [removed Path Selection, the manual Athlete-Type step, and Prior Accomplishments; added the unified Goals/Experience/Equipment/Schedule steps + Sex field + a deterministic, constraint-respecting Recommended Starting Point; replaced the profile-reveal Completion Moment with the readiness Transition + silent Chapter I creation], **O-1 → v1.1** [added the "Your Next Chapter" vision screen; affirmed one unified path; corrected the derived-Athlete-Type / silent-Chapter-I boundary], **O-3 ⛔ superseded** [banner applied; replaced by ONB-D14/D16], **H-1 → v1.6** [added the ONB-D17 "Active Chapter · awaiting first workout" first-run hero sub-state]. Closes the O-2-vs-Onboarding LOCKED-vs-LOCKED contradiction; **no governing product decision changed**. Verified the pass is docs-only: `src/` still contains **no onboarding implementation** [no onboarding routes/store/Chapter service/recommendation engine/test framework], so the task's code-level acceptance criteria are recorded in O-2 §20 as forward Implementation Requirements rather than applied to code. See Recently Completed #1.) Earlier: 2026-07-11 (Exercise Coaching Content System built — new modular `src/domain/exercise-coaching/` layer that generates/validates/scores/reviews/versions/serves coaching content, consuming the canonical datasets read-only; TypeScript 0-errors, ESLint clean, 40/40 tests, validator 0-FAIL/0-VIOLATION over all 794 exercises in dry-run; **SYSTEM ONLY — no coaching content generated, gated on approval**; not yet committed. See Recently Completed #1.) Earlier: 2026-07-09 (Documentation-accuracy correction: `Activity History (W18)` was misdashboarded as LOCKED — its own doc header reads LOCK CANDIDATE, and its "Navigated from: W-1 Workouts Hub" authority citation is stale since W-1's retirement 2026-07-08. Corrected Documentation Status for W18/W19 and added the concrete W-18→W-19 lock dependency to Decision Queue #16 — W-19 cites W-18 as its own authority and cannot legitimately lock until W-18's entry-point citation is reconciled. No architecture changed; bookkeeping correction only.) Earlier session: 2026-07-07 (Communities promoted to the 5th bottom-navigation tab — reverses the 2026-07-02 "Home/Squads discovery entry point, not a tab" navigation model; see Recently Completed #1 for full detail. Earlier session:) 2026-07-02 (Documentation-consistency audit findings applied — see Recently Completed #1 for full detail: `Forge-Design-Blueprint-v1.0.md`'s last remaining internal self-contradiction on the 4-tab nav model removed [→ v1.3]; a cluster of stale version citations across the Squad/Profile/Honor ecosystem corrected; the Card library's systemic `CLA-C07` ID collision fixed in 12 component header comments; `Forge-Design-System-Architecture-v1.0.md` [→ v1.1] backfilled to reflect the already-committed Navigation and Progress libraries as LOCKED; new `Component-State-Language-Reconciliation-Note.md` tracks a non-blocking CLA-D9 conflict in two LEGACY components. Earlier same-day: two stakeholder-directed product decisions formalized post-freeze: (1) Communities navigation finalized — Home's "Explore Communities" module named as the primary discovery surface [H-1 → v1.3, new Tier 6], Squads gains a secondary "Explore Communities" entry point [S-1 → v1.5, new Tier 3], both via new `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md`; also corrected two stray tab-count references [`Home-Screen-Wireframe-Spec-H1.md`'s drifted 5-tab Tab Bar table, `Global-Search-Architecture-v1.0.md`'s "5-tab hierarchy" line, and `Legacy-Hub-Wireframe-Spec-L1.md`'s stale "Legacy (5th tab)" header] back to the confirmed 4-tab model. (2) New Legacy feature **Transformation Gallery** added — `Transformation-Gallery-Architecture-v1.0.md` + `Transformation-Gallery-Wireframe-Spec-L17-L18.md`, screens L-17/L-18, a chapter-organized chronological photo/video archive of physical transformation with zero social/comparison mechanics; `Legacy-Hub-Wireframe-Spec-L1.md` → v1.1 adds its entry point. Both decisions previously existed only in `Docs/Forge-Design-Blueprint-v1.0.md`; now formalized in official architecture, with the blueprint reconciled to cite the new official docs. Earlier same-day work: all 6 committed Forge component libraries — Buttons/Inputs/Cards/Navigation/Modals/Progress — reclassified **LEGACY / REFERENCE**; visual design system is being rebuilt in Claude Design first; no destructive cleanup until the new system is locked and replacement components are verified; also backfilled Navigation/Modal/Progress library commits into Implementation Status, which had drifted behind git history)
**Audit Basis:** Live repository scan, 2026-08-01. `git ls-files` (430 TS/TSX · 40 `*.test.mjs` · 257 `Docs/**/*.md` · 97 migrations), `git ls-files src/app` (72 screens, excl. layouts + `+html`), `git rev-list --count` (210), `node --test` (508 pass / 0 fail), `npx tsc --noEmit` (0), `npx eslint src` (1 pre-existing error + 13 warnings), `npx expo export --platform web` (clean, 11.11 MB entry), `wc -l` (87,450 LOC). Data-layer contract checked mechanically across 53 RPC names · 61 call sites · 434 select columns · 119 write payloads · 35 tables for RLS · 52 `SECURITY DEFINER` functions. Prior basis 2026-07-15 (227 TS/TSX · 33,229 LOC · 176 tests) retained in the Change Log.

---

## 📊 Project Dashboard

| Dimension | Completion | Notes |
|---|---:|---|
| **Architecture Design** | **~100%** | All 21 Architecture Freeze rows ✅ Complete; V1 Architecture Freeze officially **FROZEN 2026-06-30** |
| **UI / Wireframes** | **~95%** | Nearly all screens specced; W18/W19 both lock-candidate (W18 corrected 2026-07-09 — previously misdashboarded as LOCKED; W19 blocked on W18, see Decision Queue #16); no Search/Rest-Timer/Community wireframe yet — Communities is architecture-only in this pass, no pixel layout authored |
| **Content Authoring** | **Coaching 92% · Programs REFRAMED** | **Coaching: 735 of 797 exercises Published, 62 Needs Review.** **Honors: 179 awardable** across 14 categories. ⚠ **THE 24-PROGRAM CATALOGUE IS NO LONGER THE TARGET (PO, 2026-08-12): *"We are no longer doing 24 programs. That is least of ours right now since we have Coach Holt."*** This board previously read **8% programs** and called 7-of-24 *"the largest remaining gap"*; that measured against a goal the product no longer has, and the number was misleading in the direction that matters — it described a shelf as unfinished while the thing that replaced it shipped. **Holt generates a program per athlete from `rulebook/`, deterministically, across 10 goals** — so the catalogue is now a DISCOVER shelf rather than the supply of training, and **14 shipped definitions populate it adequately**. ⚠ **THE CONTENT INVESTMENT MOVED, IT DID NOT DISAPPEAR.** `rulebook/skeletons.ts` says it in its own header — *"THIS FILE IS THE COACHING"* — so the tables in `domain/coach/rulebook/` (skeletons, volume, preferences, limitations, cues, endurance) are now the authored content, and their quality is the product. `limitations.ts` in particular is flagged in its own file as the closest thing to health guidance in the app and **not yet reviewed by anyone**. **Exercise media: 703 loops + 703 posters live in the `exercise-media` bucket** (`project_exercise_media_animations`) — the older *"0 of 797"* on this row was stale. **Day-workout templates: 81 shipped**, 579 rows, audited clean |
| **Backend / Data** | **BUILT (Supabase) — 143 migration files, 0001–0143. ✅ APPLIED AND VERIFIED THROUGH 0143** (2026-08-12) | ⚠ **This row read "125 files, applied through 0125" while eighteen more had shipped** — the drift is recorded because it is the recurring failure of this board, not a one-off. 0137 signup alerts · 0138 substitution + avoidance capture · 0139 every athlete to imperial · 0140 athlete weekly reviews · 0141/0142 squad check-in video prune + orphan ledger · 0143 coach intensity signals. **Verified by the PO from the SQL editor**, not assumed: `exercise_avoidance`, `athlete_weekly_reviews` and `coach_intensity_signal` all return 0 rows without error, and `profiles` off imperial = **0**. ⚠ **0141 shipped able to run only ONCE** — `create or replace` cannot change a return type and 0142 changes it, so a re-run died on `42P13`; fixed to DROP first, because with no CLI and no history table, re-running from the top is the only recovery this project has. RLS on every table; every `SECURITY DEFINER` pins `search_path` |
| **Code Implementation** | **~78%** *(77 screens + the coach chat sheet, essentially all backend-wired)* | **77 screens** — 71 plus `/workout-builder` (W-25) and `/squad/[id]/goal` (S-2b) shipped 2026-08-03, `/forge-templates` 2026-08-05, **`/workout-join` 2026-08-07** (batch 4 shipped it; this row was never updated for it) and **`/coach` 2026-08-08**, and 72 until `/active-run` was retired 2026-08-01 (one run surface, folded onto the workout card). **74 of 75 read real Supabase** — `/forge-templates` browses shipped definitions and reads the athlete’s own templates only to mark what they already own. The whole SOCIAL pillar — Squads · Squad Detail · Friends · Feed · Athlete Profile — is live, not mock; the old "fully MOCK, quarantined in `*-placeholder.ts`" reading was stale by weeks. Remaining: content, media production, and the deferred items in Current Sprint |
| **Testing** | **2,002 tests green** *(coverage % not instrumented → not measured)* | ⚠ This row read **1616**. Newest, all from the 2026-08-11/12 passes: `shared-session` (12 — a partner's workout counts toward YOUR program, matched by coverage of the prescribed main lifts and catalogue-key identity), `partner-credit` (15 — both athletes named from the one row both can read, and a removal that survives the second pass), `intensity` (21 — ⚠ the DIAGONAL invariant: `beginner@drive` is bounded by `intermediate@push` on every lever that touches training content, and `back_off` is identical across all twelve cells), `intra-set` (18 — the five gates on the mid-set nudge, and a grading regex over every in-workout line that **rejected one of my own**), `tour-phases` (14 — ⚠ every surface still teaches something at phase 1, which is what makes thinning safe rather than a slower version of gating), `review` (11 — a banned-word list so a weekly summary cannot drift into a scoreboard), `intensity-learning` (15 — up is offered, down applies itself, and nothing moves on one session), `superset-labels` (16) and `substitution-capture` (11). Behavioural coverage of built layers, NOT whole-app coverage |

| Snapshot | Value |
|---|---|
| **Current Phase** | **Post-audit hardening.** 72 screens on a live Supabase backend (97 migrations), 508 tests, live at forgelegacy.expo.app. The 2026-08-01 audit found the build materially healthier than this board claimed — and one class of defect it did not: values displayed from columns nothing writes |
| **Current Focus** | **Coach Holt is the product; the catalogue is a shelf.** Closed 2026-08-11/12: the shared-workout program credit and partner symmetry, the Log-Set double tap, coach intensity + the mid-set nudge, the coin as the single coaching surface, tutorial phasing (23 steps → 11 on day one) with the first tour telemetry, the weekly review, swap/intensity capture, sharing discoverability, and every athlete back on imperial. **Next: the avoidance surface** — CL-D3 makes a visible, reversible list a PRECONDITION of `assemble()` reading the signals now being captured, so Holt records swaps and avoidances and is forbidden to use them until it exists |
| **Biggest Blocker** | **⚠ REFRAMED 2026-08-09 by PO decision: "we don’t need that many programs now that we have Coach Holt." The 24-program catalogue target is no longer the blocker it was.** Holt builds a program for any goal, room, session length and limitation, plus five race distances — so nobody is waiting on authored content to get a block. Authored catalogue programs remain valuable as *curated, named* work with Forge’s voice on them, and the locked roster still stands, but the COUNT stops being the critical path. The next real gap is the AI layer (the Edge Function that lets Holt read a sentence), which is what the paid tier is actually selling. Historical note: **Programs content — 7 of 24 authored** (Body Recomposition Foundation added 2026-08-06; Wave 2 of the Stage-2 plan is otherwise untouched). The old entry here ("the Social backend") has been wrong for weeks: Squads, Friends, Squad Detail and the feed are all Supabase-backed. Secondary: 0 of 797 exercises have media |
| **Last Updated** | 2026-08-09 (**Minutes, a coaching cue, and the pool gets its own scale.** Three gaps found by holding the app against a real 15-week 70.3 plan, all the same shape: *a field the model already had, with no way to put anything in it.* **Cardio can be prescribed in MINUTES** — `targetSec` existed and Coach Holt wrote it on nearly every session, but the builder had no control, so an athlete could prescribe a ride only as a distance while every endurance plan in the world is written in minutes. **The pool is measured in YARDS** — the 0.5 mi stepper could express 880/1760/2640 and nothing a swimmer would ever write; storage stays canonical miles. **An exercise carries the author's cue** — "4 seconds down, then push up" — shown on the card in the active workout and in its ⋯ menu, and kept strictly distinct from the athlete's own log note. ⚠ `ExercisePrescription`'s comment saying a notes field was *deliberately absent* was RIGHT and is now answered rather than overruled: the rule was never "no notes", it was "nothing write-only". Reshaping the cardio card also closed a live contradiction — it showed a **per-mile pace stepper for swims, rows and ellipticals**, which `RATE_KIND` and EPS-D12 both forbid. Found and fixed en route: `templateToSessionExercises` **dropped `targetDurationSec`**, so a template's "Row 20 minutes" started as an open row. Two near-misses caught before shipping: the mile-bound parser would have discarded a typed 1200 yd, and `+mi.toFixed(2)` is **35 yards** of granularity. **And the spreadsheet goes in:** a second table reader handles a sheet kept ONE ROW PER DAY with the session as prose — "75min bike Z2 + 30min upper strength" becomes a 75-minute ride and a strength block, "Full Rest Day" becomes nothing. ⚠ It is a heuristic and is built to admit it: the source sentence rides along as the coaching note, a figure behind a multiplier is never claimed as the bout (`5x(3min jog)` is not a 3-minute run), and the preview shows the sentence under the reading. ⚠ **The first real phone paste still failed**, and the fixture was why: a real clipboard breaks rows on newlines inside cells, drops the checkbox column so the body sits one cell left of its own header, and carries an unheaded notes column. All three handled; the fixture is now a real paste. One self-inflicted bug worth the entry — a `` written through a shell heredoc reached the file as a literal **backspace byte**, invisible, passing tsc and lint, breaking only the sheets with a checkbox column. Also fixed: **the BottomSheet body would not scroll on a touch screen**, because the backdrop `Pressable` WRAPPED the sheet and swallowed the drag; they are siblings now. tsc 0 · **1,593 tests** · lint at baseline · **deployed (web) AND published as an OTA to `production`**. The fingerprint was compared against build 3 BEFORE publishing — `791bacda…` on both — and the manifest endpoint was then queried as an iOS client and returned the new update id, so this one is genuinely deliverable rather than merely published. ⏳ Not yet tested on device. See Recently Completed #1.) Prior 2026-08-09 (**Workout notes — finishing two columns empty since the first migration.** `workout_exercises.notes` has been in the schema since `0001_spine.sql` and `workouts.notes` has taken a `p_notes` argument since 0010 that **every client path passed as a literal `null`** — a field accepted but never sent, beside a column written by nothing, for 114 migrations. Now: a note on the lift from the ⋯ menu, a note on the session at the finish, both rendered in history, and **the last thing you said about a lift shown as you set up for it again** — same data, different timing, and the timing is the product. Notes are kept distinct from `reflection` (the permanent keepsake) and are **withheld from a shared session**, because sharing a workout is not consenting to publish your remarks about it. Migration 0124 is 0119's `save_workout` body copied whole with two lines changed and **not retyped** — this schema has lost branches four times to partial rebuilds — with a test asserting every 0119 branch survives. tsc 0 · **1,479 tests** · lint at baseline; the trim and the migration's `nullif` were both mutation-tested. ⏳ 0124 not applied. See Recently Completed #1.) Prior 2026-08-09 (**The endurance rulebook — Holt stops refusing 5k through Ironman.** Research → **thirteen PO decisions (EPS-D1…D13, all approved)** → code, because the numbers that decide a running plan are exactly where the sources disagree and a wrong one is consistently wrong for everybody. 80/20 easy-hard · long run 25–30% with a 3-hour and 20-mile cap · taper 2 weeks (3 for the marathon) cutting volume by half with **intensity retained** · beginners at 3 days · run/walk for anyone who cannot yet run continuously · **real paces only from a real race result, never invented**. All five goals run through one machine differing only by rows in `RACE_SPEC`. ⭐ **Four defects were found by reading the plans, not by testing them** — a 17-week marathon block whose longest run was 7.3 miles (and which passed every structural check), volume that sawtoothed without growing, a 40-minute tempo in race week, and a non-runner handed a "Long Run". ⚠ Two locked PAS rules contradict each other (the 10%/week cap vs mandated deload weeks); the reading is recorded in the standard §6.1 and wants a nod. Reported not papered over: `ProgramExercise` has **no `notes` field** the PAS says pace lives in, and the catalogue has **no dynamic warm-up drills**. tsc 0 · **1,471 tests** · lint at baseline. See Recently Completed #1.) Prior 2026-08-08 (**Coach Holt — a rule-based program builder, and a shipped Edit button that could delete your history.** One machine with **zero per-goal branches**: pick a skeleton → fill each slot from the 721-exercise catalogue → prescribe → validate, with everything goal-specific in `src/domain/coach/rulebook/`. Builds programs *and* single days, reads your last two sessions of a lift to say add-weight/add-reps/hold/back-off, and **edits a program you are already running** through a mutation layer that keeps every position and the session count invariant and refuses, in terms, to touch a session you already trained. **Endurance goals refuse rather than guess** — that rulebook is unwritten. Found while auditing: the **Edit button was live on active programs** against LOCKED W-5 Decision 1, and saving through it could truncate a ragged program's days or force an **irrevocable graduation** — closed at three levels, the third being migration 0123 (⏳ not applied). Also found and fixed, both silent: the workout builder's save **dropped cardio blocks** and `template-day-core` **dropped `targetDurationSec`**. 🔴 **And one regression of mine that shipped:** `CoachBubble` called `useSafeAreaInsets()` with no provider above it, which throws — the app would not launch on device while `tsc`, 1,420 tests, lint and the web build were all green, because web has a DOM fallback that does not throw. Rolled back both OTAs, then fixed with a root `SafeAreaProvider` and an `OverlayBoundary`. tsc 0 · **1,447 tests** · lint at baseline. See Recently Completed #1.) Prior 2026-08-05 (**Native build config + OTA updates.** Bundle IDs (`com.qest4.forgelegacy`), `eas.json` with three profiles, EAS environment variables on the SAME Supabase project as web, and `expo-updates` at `fingerprint` runtime-version policy. `slug` untouched so forgelegacy.expo.app is unaffected — verified by re-exporting web and reading the PWA title/manifest back. ⚠ `.easignore` replaces rather than supplements `.gitignore`; the one-line version would have uploaded 900 MB on the first build. tsc 0 · 996 tests · web export clean. **No build run, no store accounts yet.** See Recently Completed #1.) Prior 2026-08-03 (**PO TRAINING-SESSION PASS — fourteen items from actually using it, and two of them were not what they looked like.** The active workout screen was fighting the athlete: one Set Input Sheet (weight + reps + Log Set completes it) replaces two single-field pickers and a stray green check, typing is the default and the wheel the opt-in, Add Exercise takes the footer slot that held a duplicate End Workout. **Two silent falsehoods closed**: the wheel wrote `null` for any weight you didn't scroll to, and The Record counted only weighted sets — so three unweighted warm-ups read "0 sets" beside a header that said 3. `weight: 0` is now BW (an answer), `null` is unentered (an absence). **Supersets end to end** on the existing circuit model (migration 0106), **Strength Start's three doors** wired to every entry that had assumed build-as-you-go, **the Free Workout Builder built** (W-25), **token search** unified across picker and library, **a rest-timer ding** (Sound preference became real), **avatar positioning**, and **Squad Goal Detail** to its `.dc` (migration 0107, which also closes the expired-goal contribution drift 0103 recorded and declined to fix). "Save this day as a template" was **never the database** — the naming sheet lived in the wrong render branch, so the button set state nothing rendered; a source guard now catches it. The Legacy Timeline's "weird emblem" was a hand-drawn path where the symbol library's own was three files away. **Apple Watch answered, not built.** tsc 0 · lint at baseline · 878 tests · web export clean. 0106 and 0107 applied same day. See Current Sprint.) Prior 2026-08-03 (**Workout playlist link built — `Workout-Playlist-Amendment-001` had been LOCKED and merged into four base specs since June and implemented on zero surfaces; the W-19 `.dc` drew the row the whole time.** Attach on W-9 ⋯ Options, attach/edit/remove on W-17, read-only on W-19, chip on squad recap cards. Migration **0105** enforces the URL host against the service tag in the database, because the squad card makes this the one column in the app that becomes a tap target for someone who did not type it. tsc 0 · lint at baseline · 819/819. See Recently Completed #1.) Prior 2026-08-01 (**PROJECT AUDIT + CORRECTION PASS** — 72 screens · 97 migrations (all applied) · 508 tests · tsc 0. Five defects closed incl. a chapter honor tally that was always zero on four surfaces, 17 ungated routes, and fabricated identity in the production bundle. Critical path moved from the social backend — long since built — to CONTENT. See Recently Completed #1.) Prior 2026-07-23 (**PROJECT AUDIT** — dashboard reconciled to the built tree. Real state: **334 TS/TSX · 52,713 LOC · 31 routes · 385 tests green · 24 migrations · tsc 0 · lint clean.** Sessions 07-19..07-23 built (all UNCOMMITTED, ~484 working-tree changes): **Home Gym** (owned-equipment gating) · **Exercise Library/Picker → real 794 catalog** · **Coaching content** (732 published) · **Activity History + Detail** · **Program Detail** · **Exercise Detail W-22** · **P-1 DISSOLUTION** (P-1 Profile + P-4 Settings Root dissolved into Legacy + Account Settings; avatar → Account Settings; PD-7) · **Account Settings + Profile Visibility + Notifications + Preferences** (real app-wide Units) · **Accomplishments L-12/13/14 CRUD** · **Pinned Legacy museum + L-13 pin manager** (accomplishments pinnable). Migrations 0021–0024 added. **Biggest findings: (1) the whole build is uncommitted — needs a commit sweep; (2) social/goals remain the only placeholder cluster.** Next: commit, then Goals or the social backend.) Prior 2026-07-14 (Design-handoff — `Programs/*.docx` → structured data conversion COMPLETE + PROMOTED; non-destructive `ingest/` pipeline generated the 2 LOCKED Strength programs to `training/programs/*.json`, wired `getActiveProgram()` to real data, deleted the placeholder; active = Foundation I (3-day) → `training_split:full_body`; tsc 0 / eslint clean / 45 tests; `.docx` untouched; I-4day held (DRAFT), II-3day excluded (mislabeled); Strength-only content gap noted). Prior: 2026-07-13 (Design-handoff Phase 1 — Home Workout Artwork Resolver + asset manifest + §16 test matrix built in `src/domain/home-artwork`; deterministic 7-rung port, reserved Legacy/Honors guard, MovementPattern→family + MuscleId→split bridges, real-catalog enrichment; `tsc`/ESLint clean, 40/40 tests; **§16 gate green → Phase 2 Home re-layout unblocked**; not yet committed). Prior: 2026-07-13 (Design-handoff Phase 0 — data-model foundation implemented (CODE) in `src/domain/profile` + `src/domain/training`; typed schemas + placeholder seed, non-breaking; sex-default bug fixed at model level; `tsc`/ESLint/7-test/e2e-resolver all green; MovementPattern→family and muscle-id→split bridges pending in Phase 1; not yet committed). Prior: 2026-07-12 (Onboarding reconciliation — O-1 → v1.1, O-2 → v2.0, O-3 ⛔ superseded, H-1 → v1.6 conformed to the governing Onboarding architecture; unified path, derived Athlete Type, silent Chapter I; docs-only — no onboarding code exists; see Recently Completed #1). Prior: 2026-07-11 (Exercise Coaching Content System built — `src/domain/exercise-coaching/`, infrastructure only, no content generated, gated on approval). Prior: 2026-07-09 (W18/W19 lock-dependency documentation correction — `Activity History (W18)` was misdashboarded as LOCKED; corrected to LOCK CANDIDATE, and the concrete reason W-19 remains unlocked is now recorded in Decision Queue #16). Prior: 2026-07-07 (Communities promoted to the 5th bottom-navigation tab, reversing the 2026-07-02 Home/Squads discovery-entry-point model — `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`. Prior: 2026-07-02, Communities navigation finalized [Home "Explore Communities" primary, Squads secondary entry point]; new Transformation Gallery Legacy feature [L-17/L-18] added; both formalized from the design blueprint into official architecture. Earlier same-day: all 6 committed Forge component libraries reclassified LEGACY/REFERENCE — visual design system being rebuilt in Claude Design first) |

> **30-second read:** Forge Legacy is a fully-architected fitness-legacy app (257 docs, ~208 mentioning LOCKED) with **a real, backend-wired product** live at forgelegacy.expo.app: **72 screens, 71 of them reading real Supabase data**, over **97 migrations (0001–0098, all applied)** with RLS on all 35 tables. 430 TS/TSX · 87,450 LOC · **508 `node --test` green** · tsc 0 · lint at baseline. *(Two readings that were stale for weeks and are now corrected: the social pillar is NOT placeholder — Squads, Squad Detail, Friends, the feed and Athlete Profile are all live; and this app is Supabase, not the Firebase the design doc ratifies.)* **Content is the critical path now, not plumbing:** exercise coaching is 735 of 797 published (92%) and honors are real data (139 awardable rows), but **programs are 7 of 24** and **exercise media is 0 of 797**. **Open, deliberately deferred** (reasons in Current Sprint): `chapters.workout_count` is a stored counter that is correct only until a delete-workout path ships; ~~`rank-progression` is built but orphaned~~ (**false — corrected 2026-08-02**: the Progress Hub links to it); the dead `chapters.honor_count` column awaits a change that already touches onboarding. **A standing lesson from the 2026-08-01 audit, worth keeping in view: a value that is only ever its default is worse than an absent one — absent renders nothing, a stale default renders a confident, specific, false claim about the athlete.** **The Backend/Data-Model architecture is now LOCKED** (`Backend-Data-Model-Architecture-v1.0.1` — Firebase stack, 12 runtime services, all entity schemas canonical). **Global Search is now also LOCKED** (`Global-Search-Architecture-v1.0.md` — Catalog Search/Discovery Search category split, Never-Searchable list, Performance Firewall-extended ranking/display rules, full reconciliation with both Backend §14 and `Community-Discovery-and-Search-v1.0`). The project can begin implementation as soon as the remaining Freeze rows resolve (Rest Timer, Component Library). **Rank is now ✅ Complete** — all 16 TBDs resolved/closed; RSA, RCM, Calibration Decisions, M-1, P-1, P-2 all LOCKED. Content authoring (programs/exercises) is also early (~12%). **New this session:** the Homepage Principles system is now fully architected and LOCKED — a quiet, rotating "digital inscription" of original Forge Legacy principles and reflection questions on Home (H-1), governed by `Homepage-Principles-Architecture-v1.0` with its canonical content in `Homepage-Principles-Library-v1.0`; the architecture states no fixed entry count so it cannot go stale as the library changes. **Also new this session:** the Communities subsystem (the fourth relationship pillar — Legacy/Friends/Squads/**Communities**) is now fully architected and LOCKED, with `Community-System-Architecture-v1.0`, `Community-Feed-Specification-v1.0`, `Community-Discovery-and-Search-v1.0`, `Community-Roles-and-Moderation-v1.0`, and a complete downstream reconciliation across Social, Challenge, Honor, Notification, Monetization, and Navigation architecture. **Also new this session:** the Squad System Architecture is LOCKED — Goals, Missions, daily Check-ins, a shared Streak, Momentum, a Weekly Summary, a Squad Feed, Honors integration (new `SQUAD` catalog category), inline Competition standings, and Analytics, all scoped to Squad-internal surfaces only. This **deliberately lifts the Performance Firewall for Squad surfaces alone** — Friends Feed, Communities, and Calendar keep the original no-comparison Firewall unchanged — superseding `Squad-Architecture-Amendment-001`/`002` and WSR-001's bounded Check-ins model for those surfaces. **Also new this session:** Exercise Library Phase 4 (Media Architecture & Standards) is LOCKED — new governing doc `Exercise-Media-Architecture-v1.0.md` adds `muscleTargetImageUrl` as a new "Exercise Anatomy" schema group and defines production standards for all 5 media/anatomy fields, including mandatory consistency rules for looping animations (neutral-stance start/end) and muscle target images (fixed model/pose/camera template). This is standards and schema only — media production itself remains entirely unstarted for all 195 exercises. **Also new this session:** the Exercise Library's 5 flagged naming-duplicate pairs are fully resolved (Phase 5) — one canonical V1 name locked per pair (Box Step-Up, Back Squat, Front Plank, Barbell Romanian Deadlift, Barbell Bench Press), catalog reduced from 200 to 195 exercises (44 anchors, down from 45), and a new `Exercise-Naming-Standard-v1.0.md` locks the naming principles and an immutability-after-publication governance rule for future authoring. **Also new this session:** the Honors System Final V1 Architecture is LOCKED — reconciled two previously-parallel, never-merged catalog lineages (the locked 82-type catalog and six unmerged Expansion Pass documents) into one coherent system, merged Endurance/Consistency/Prestige, and added a new Hidden category, reaching **167 honor types across 13 categories**; two brand-new Strength honor families (Sex-Specific Milestones, Relative Strength Milestones — 24 types) were designed in full and then deferred to V2 by PO decision before final lock; also discovered and fixed significant pre-existing staleness in `Honors-Spec-L10.md` (still showing the original 7 categories from before this project's own prior Competition/Communities/Squad work). Architecture and schema only — the full L-11 descriptive-content catalog pass remains a separate, future task.

---

## 🚦 Project Health

| Dimension | Health | Read |
|---|:---:|---|
| **Architecture** | 🟢 | All 21 Freeze rows ✅ Complete; **V1 Architecture Freeze FROZEN 2026-06-30** |
| **Documentation** | 🟡 | 257 `Docs/*.md` (42 Amendments), ~208 mentioning LOCKED. Specs are strong; the lag is in THIS dashboard and in amendments authored but never merged into their parent docs — the recurring pattern |
| **Content** | 🟠 | Mixed, and previously mis-scored as one number. **Coaching content 735 of 797 published (92%)**; honors ARE data (139 awardable rows). **Programs 7 of 24** and **exercise media 0** — those two are the real gap |
| **Backend** | 🟢 | **Supabase, built & live** — 133 migration files (0002 lives in `supabase/design/`); **0001–0130 applied, 0131–0133 authored and pending**. RLS on every table, and every `SECURITY DEFINER` function pins `search_path`. **One deliberate exception to "≥1 policy per table": `app_admins` (0129) and `metrics_daily` (0133) have RLS ENABLED WITH ZERO POLICIES** — that is deny-by-default and is the point, since `profiles_read` is `using (true)` and the operator roster must not be enumerable. Do not "fix" it (AA-D6) |
| **Code** | 🟢 | **72 screens, 71 of them on real Supabase data.** The one fixture-backed screen was deferred out of the routed tree 2026-08-01. ~150 components · 68 domain modules · 39 data modules |
| **Testing** | 🟢 | **1,822 green** (`node --test`) + live Supabase round-trip proofs; gates every unit. Coverage % still not instrumented → not measured |
| **OVERALL** | 🟢 | **A real, backend-wired app.** The social pillar — long carried here as the blocker — has been live for weeks. Critical path is now CONTENT (programs, exercise media), not plumbing |

---

## 🏃 Current Sprint

**Sprint:** **PO training-session feedback, batch 3** (2026-08-11) — three things found by using it

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
- [x] **P-5 Notifications (Arch + Wireframe)** — LOCKED **v1.4** (Squad Feed Activity / Squad Reactions & Mentions relabeled + scope-expanded, new Squad Goal & Mission Updates toggle added per `Squad-System-Architecture-v1.0` SQ-D12)
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
| 20 | **Three curation-shaped concepts, all locked, differently named** | Pinned Legacy (max 6, athlete-chosen) · Featured Legacy Moment (1, system-derived) · Featured on Profile (max 3, athlete-chosen, `L-12-Accomplishments-Management-Architecture` LOCKED). Two are called "Featured" and one of those cannot be chosen. Prior notes already record that athletes conflate pinned-vs-featured. **Both names are locked vocabulary**, so a rename is an amendment, not a refactor. Mitigating today: they never appear on the same screen, and the walkthroughs disambiguate them explicitly | Decide whether one gets renamed by amendment, or the vocabulary stands and the tours carry it |

---

## ✅ Recently Completed (last ~20 milestones)

### 0. The app can tell Free from Premium — and every cap is built, dark (2026-08-12, CODE + migration `0145` — ✅ **APPLIED**)

**Launch Checklist Sections 1, 2 and 3 complete.** Monetization was 100% documentation this morning: no entitlement field, no billing SDK, no P-8, and the M-7 modal fired only from a dev harness. It is now plumbed end to end, **and nothing is felt by anyone** — `entitlement_config.default_tier` ships as `PREMIUM`, so every athlete resolves entitled and every gate below opens. **Phase F is one UPDATE against one row.**

**`0145` applied and verified 2026-08-12** via `preflight-what-is-applied.sql` — all five rows `APPLIED`, **`programs_cap_guard_trg` included**, which is the one worth checking rather than assuming: the tables can exist without the trigger if a paste is truncated, and the program cap then silently never fires. **`0144` correctly still MISSING** — Coach AI stays unapplied by PO decision.

**⚠ TWO PRE-FLIGHT BUGS OF MY OWN, RECORDED RATHER THAN QUIETLY FIXED.** (1) The new `default_tier` check `select`ed FROM `entitlement_config`, and Postgres resolves relation names at **parse** time — so it raised `42P01` and took the whole report down in exactly the case the report exists for. A pre-flight that only runs once the migration is applied answers a question nobody has; every check is now a catalogue lookup and the rule is written into the file. (2) The migration's own VERIFY footer told the reader to run `my_entitlement()`, which **cannot work in the SQL editor** — it runs as `postgres` with no `auth.uid()`, so every `my_*` function raises `28000`. That is the guard working, and a footer that reads as a failure is a trap for the next person. Both fixed; the footer now lists four session-free checks instead.

**Three states, not two, and the third is the whole reason M-7 can be trusted.** M-7 §10 forbids an upsell when entitlement cannot be verified, so `unknown` is a distinct outcome from `blocked` throughout — collapsing them would produce exactly the upsell that rule exists to prevent. **Cap gates fail CLOSED** (block + retry, no modal, because failing open lets a Free athlete start a flow the server refuses halfway through — the dead end M-7 §2 forbids). **Feature display fails OPEN**, because failing closed shows a paying athlete a locked card when their train goes into a tunnel. Both directions are deliberate and both are commented.

**⚠ THE IN-WORKOUT HOLT CAP CANNOT FIRE M-7, AND DOES NOT TRY.** §12 has banned M-7 during an active workout since it was written; that rule is older and locked and it wins. So the cap is enforced by **not rendering the control on Free** (M7-D13) — there is no tap, so there is no modal. An upsell interrupting a working set is the single worst place in this product to ask for money. **Manual substitution stays free mid-session**; nobody is stranded.

**Two counting rules decide whether four of the caps are right, and both were nearly wrong.** **Program slots do not reopen on delete** (MA3-D9) — without it the cap never fires for an athlete running one four-week block at a time, which is the most common real behaviour in the product; `programs` has no soft delete, so this is a monotonic counter maintained by a **BEFORE INSERT trigger** rather than by the five call sites that create programs. And **squad check-ins must never count toward the 5-video cap** (MA3-D14) — which is why the video gate is deliberately **not** in `useMediaPicker`, the obvious place the checklist named: enforcing there would have taken a free athlete's ability to check in with their squad away on the strength of five gallery clips. **Enforcement matches the count**, at the two screens that actually write `chapter_photos` and `transformation_entries`.

**The "X of 75" photo counter is back on `photos.tsx`.** It had been withheld with a good reason — *"a limit nobody can pay to remove is a threat, not a counter"* — and the condition that justified withholding it is gone. It renders **only when a cap applies**: a Premium athlete's 1,000 is an abuse guard nobody reaches, and showing it would turn the guard back into the threat.

**Share-card export: the checklist named the wrong file.** `share-image.ts` is not a stub — a parallel session already ported it. The remaining stub was **`progress-image.ts`**, the Progress Photo Post card, which is the one actually built to be posted to Instagram. Fixed via **route (a)** — an off-screen `react-native-svg` rasteriser reading the same geometry module the web canvas does, so the two cannot drift in placement. **No new native module, so it delivers over the air.** ⚠ **It COPIES rather than saves**, because `expo-media-library` would change the fingerprint — and `progress-photo-post.tsx` now phrases its toast from the result rather than the hope. It previously said *"Saved — attach it in Instagram"* on every platform, which on device would have sent somebody to Instagram to attach a file that was never written.

**Also landed:** the invite funnel (`sent`/`accepted` wired across program shares, squad invites, challenges and friends — `installed`/`converted` declared and waiting on Phase E), reusing the existing privacy allowlist rather than widening it. The whole year-one plan is 20 testers × 5 people each, and it was unmeasurable.

**Gates: `tsc` 0 · `node --test` 2,087 green (19 new) · lint at baseline (1 error + 13 warnings).** Still owed and not claimable from here: the force-to-Free device walkthrough of all nine limits, and applying `0131–0133` and `0145`.

### 0. The paperwork that made the add-on legal to build — and four locked docs that had been quietly wrong (2026-08-12, DOCS only, no code, no migration)

**Launch Checklist Section 0, complete.** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` is LOCKED, and — the part this project keeps skipping — **it has been applied into every document it amends, in the same pass.** Amendment 001 §4 stated *"there is no higher tier to sell"*, which forbade the Coach AI add-on outright; that sentence was load-bearing and it is now scope-narrowed rather than deleted, because the behaviour it governs is still correct: **Coach AI raises no ceiling, so a paid athlete who reaches one still gets a plain explanation and never an upsell** (MA3-D2).

**The organising principle, locked:** *your legacy is yours forever; the coach is a service.* Everything the athlete builds costs ~$0.35/athlete/year, so it can honestly be sold once and kept forever. Conversational AI costs money on every use, so it is a subscription. **MA3-D1 forbids an AI-inclusive lifetime SKU at any price** — lifetime buyers are by selection the heaviest users, and that is the one combination that loses money indefinitely.

**Four documents were wrong before this pass, and three of them were wrong in ways only a reader comparing two files would catch.**

1. **Amendment 001's own §11 and §13 had contradicted its §4 since 2026-08-05** — the same day. §11 said *"photo limit (50) already correct"* after the revision had moved it to 100; §13 still checked for *"Unlimited custom programs / photos / squads"* that §4 had replaced with finite numbers hours earlier. **The project's documented failure mode, inside the document that defines it.**
2. **`Critical-Decisions-Amendment-001` Decision 4** had raised free squads 1 → 2 and explicitly superseded Amendment 001 to do it. **MA3-D7 reverses it to 1** (paid: unlimited → 10 → **5**), and the reversal is written into Decision 4's own section with the full chain — a locked document is only worth something if what overrode it is findable *from that document*. Decision 3's photo figure was corrected in place too: the account-wide *ruling* stands, the number 50 does not.
3. **`M-7-Premium-Upsell-Spec` v1.1** — 4 triggers → **9**, photos 50 → **75**, squads 2 → **1**. ⚠ **The in-workout Holt limit is enforced by SUPPRESSION, not by an upsell** (M7-D13): §12 has always banned M-7 during an active workout, that rule is older and locked and it wins, and an upsell interrupting a working set is the worst place in the product to ask for money. The Free in-session Holt control is simply not rendered. **Manual substitution stays free mid-workout** — nobody is stranded.
4. **`P-8-Subscription-Wireframe-Spec` v1.1** — open question #2 resolved. The single-SKU assumption is superseded by a four-option picker (**annual pre-selected**, monthly, Founder while seats remain, lifetime last and never pre-selected). **The disclosure line *"The app and your legacy, forever. Coach AI is a separate subscription"* sits above the buy button in every Free state — that is the legal defense, not copy.** Billing SDK resolved to **RevenueCat**.

**Three rules came out of this that the build has to honour, and each closes a hole the caps would otherwise have.** **Program slots do not reopen on delete** (MA3-D9) — without it the cap never fires for an athlete running one four-week block at a time, which is the most common real behaviour in the product. **A received program consumes the recipient's slot** (MA3-D10), and **sending stays free** (MA3-D13), so the gate fires on the recipient's device and never taxes the distribution surface. And **workouts logged against a deleted program are kept forever** (MA3-D11) — the seam where the first rule could have quietly broken Never Charge For History, closed explicitly.

**Also recorded honestly rather than glossed:** lowering free squads 2 → 1 and photos 100 → 75 is a **reduction** in a tier that a locked document had already granted. Amendment 003 §11 answers Amendment 001's own §10 decision framework question-by-question and says so in those words. Both land on numbers no current athlete has reached, both are server-side config reversible by SQL, and Amendment 001 §3 flags every limit as provisional — which is the clause being exercised. **Decision Queue row 22 opened** (pricing / SKU / billing SDK / entitlement schema, with the age floor, counsel review and trial length still genuinely open); **row 14 item (1) closed** — Gallery entries share the one photo counter.

### 0. The weekly review's design pass — and volume had been showing pounds to metric athletes (2026-08-12, CODE only, no migration)

**Both surfaces of the weekly review (`cd1d9b3`, migration `0140`) went out for design and came back restructured.** `Docs/Weekly-Review-Design-Brief-v1.0.md` describes what exists and, more importantly, the rule the whole feature is built around: *it states what happened and, where there is one, what it sets up — it never grades the week and never compares it to another one.* The returned design honoured that completely — no comparison, no ring, no grade, no streak. What it also did was rebuild **Your Week**'s stat block: Sessions promoted to a 58pt figure, Days demoted to a caption beneath it. Rejected, and `Docs/Weekly-Review-Design-Revision-Notes-R1.md` records why in the form the second round could act on.

**⚠ THE PROMOTED FIGURE BREAKS ON THE COMMON WEEK, WHICH IS THE ONLY WEEK THAT MATTERS HERE.** Most weeks are three sessions, no PR, no honor, one heaviest lift — and **volume is legitimately 0** on a bodyweight or cardio week. The design's own "plainest week" state rendered a giant **2** beside a **0**. Four stats of equal weight carry a zero; a promoted one broadcasts it. The four are back, as **two rows of two** rather than one row of four — at 390pt a quarter-width column cannot hold `5:38:22` at a legible size — which keeps the parity that matters and drops the ranking that does not.

**Three violations of the design system, in the design.** (1) Holt's 2–3 sentences were set in `--fl-font-display`, the Playfair serif whose own token file reserves it *"for hero names, screen titles, and the legacy statement"* — a paragraph in it reads as a pull quote, which is the one thing a quiet weekly read must not be. (2) He was drawn with the generic **honor insignia**, which on Your Week put the coach and an award on screen as the same component one section apart; he is `HoltMark` and nothing else. (3) The card's title was 13px in `--fl-text-tertiary` — roughly 3:1, under the contrast floor, and *dimmer and smaller than the bronze eyebrow above it*.

**⚠ AND THE REAL BUG UNDERNEATH THE COSMETICS: VOLUME NEVER CONVERTED.** `fmtVolume` in `squad-feed-live.ts` returns a bare comma-grouped number — `24,180`, no unit — so `convertMeasure` had no `lb` to recognise and returned it untouched. **A metric athlete read pounds, unlabelled, on both surfaces.** The Home card converted nothing at all; the screen converted only Holt's sentence, so the same figure had two different answers one tap apart. Both now go through **`displayWeight`**, the one conversion the rest of the app uses, and the unit is rendered beside the figure. ⚠ Note `progress-core.ts` exports a *different* `fmtVolume` that renders `0` as `'—'` — correct there, wrong here, where zero is a real and unremarkable answer.

**`formatWeekRange` replaces the raw ISO pair** (`2026-08-03 — 2026-08-09` → `3 – 9 August 2026`, naming the month once when both ends share it). ⚠ **It parses by hand and must keep doing so.** `new Date('2026-08-01')` is specified as UTC midnight, so west of Greenwich every `getDate()` off it returns the day before — 0140 buckets these dates in `profiles.tz` precisely so the week belongs to the athlete, and a UTC parse would undo that at the last step. A test asserts the first of a month stays the first, and fails loudly if anyone "simplifies" it back to a `Date` constructor.

Kept from the design: the labelled stat cells with units, the real date format, and skeletons in place of the centred spinner (the frame and app bar are already true — only the contents wait). Skip returns to a bare text action **beside** the primary rather than a second full-width button stacked 2px under it; two stacked buttons read as two equal choices.

**⚠ THERE IS NO MONTHLY REVIEW.** The Premium line in § Pricing above says *"personal weekly/monthly recap (in build)"*. The weekly one ships; the monthly one has no table, no RPC, no screen, no component and no copy anywhere in the repository. It is also not a copy of the weekly one — a month is the first window where *trend* is legible, and trend is a comparison, which is exactly what the governing rule bars. §9 of the brief lists the four questions that need answering before it can be specced.

**Gates:** tsc **0** · **2,068 `node --test` green** (6 new on `formatWeekRange`) · eslint at baseline (1 error + 13 warnings), none in the touched files. Files: `WeeklyReviewCard.tsx` · `app/weekly-review/[week].tsx` · `rulebook/review.ts` · `review.test.mjs`.

⚠ **Count the whole suite, not `src/domain/**`.** That glob matches 22 of the repository's 132 test files and reports **1,711** — it was written into this entry before being caught. `find src -name "*.test.mjs" -print0 | xargs -0 node --test` is the honest command; the 1,987 and 2,049 figures in the two entries below were produced by different globs again and should not be read as a trend.

**Shipped:** commit `de8e592` on `feat/home-onramp`, **deployed to `forgelegacy.expo.app`** — root 200 and the live `entry-3916e693…js` matches the local build byte for byte. ⚠ The commit was scoped to seven files by hand: a parallel session's Coach AI work (`coach-interpret-live.ts`, `medical-routing.ts`, `0144`, `supabase/functions/`, `tsconfig.json`) was in the tree uncommitted and was deliberately left there — the fourth such collision, and concurrent sessions still want separate branches. It is reachable from nothing, so the deploy does not surface it.

⚠ **A dynamic route 404s on direct load in the web preview, and always has.** `/weekly-review/2026-08-03` returns 404 because the static export writes the literal `dist/weekly-review/[week].html` and cannot prerender an arbitrary segment. `/squad-recap/abc`, `/transformation/abc` and `/program/abc` behave identically — this is the export mode, not this screen. **Reaching the review by tapping the Home card works**, because the SPA router resolves it client-side without a server request. Test it that way; a pasted deep link will look broken and is not.

### 0a. Holt learns what you reach for — swaps teach preference, never avoidance (2026-08-12, CODE only, no migration)

**THE SIGNAL WAS BEING WRITTEN AND READ BY NOBODY.** `0138` has captured `workout_exercises.prescribed_catalog_key` — what the plan asked for next to what the athlete actually did — and `exercise_avoidance` since it shipped. Neither reached the engine. So when the PO asked whether Holt learns *"what that person likes and doesn't like, what they swap for"*, the honest answer was that the data existed and the coach ignored it.

**⚠ THE FRAMING IS THE WHOLE DESIGN, AND THE PO'S IS THE SAFER ONE.** PO: *"it's more just to help Holt learn of what people like and help him build better programs for them."* The first reading of that data was AVOIDANCE — *stop giving me this* — which is a blocklist, and a blocklist silently shrinks somebody's training: swap away from squats twice and the pattern quietly disappears, the athlete never learns what they stopped doing, and the program degrades toward whatever was easiest. That is precisely the failure `CL-D3` was written against, which is why CL-D3 makes a **visible, reversible list a PRECONDITION** of `assemble()` ever reading an avoidance. **PREFERENCE has no such failure mode.** It re-ranks *within* a movement pattern and can never remove one, so a knee-dominant slot is still filled by a knee-dominant exercise — just the row this athlete actually does. Nothing can be lost, so nothing needs to be visible first. `exercise_avoidance` therefore stays captured and unread, exactly as CL-D11 left it.

**Only a substitution counts, and only twice.** `prescribed_catalog_key` is non-null only where the athlete was offered one movement and did another — a stated comparison. Counting what was merely *logged* would measure what the PROGRAM chose and file it as what the athlete prefers, which is backwards. A swap to the same lift (a renamed movement) is not a choice. **Two occurrences before anything moves** (CL-D3): one swap is a busy rack or an occupied station.

**⚠ The engine still reads no database, and that is what makes this safe to ship.** `learnPreferences()` is pure; the caller resolves the swaps at the boundary and hands the map into `CoachConstraints.learned` / `DayRequest.learned`, so `assemble()` stays a pure function of its arguments. **The pattern comes from the catalogue, not the row** — storing a copy at save time would have created a second answer to "what pattern is this". An unapplied migration, a dropped request, or an athlete who has never swapped all resolve to `{}`, and `{}` builds exactly what was built before any of this existed. `learnedRank` is **negative by construction** so a learned choice sorts ahead of the rulebook's canonical order without a second sort key, and there is **no return value meaning "remove this"** — asserted by test.

**And he says it, but only when it is true.** CL-D2 requires every adaptation be explicable *and* the sentence shown. `appliedSentence()` reads the keys the assembler **chose**, not the ones it was told to favour, so a preference the equipment could not honour is never claimed — a coach who says *"I picked your hack squat"* over a program without one makes everything else he explains unbelievable. At most two are named. **Recorded as CP-D1…CP-D6 in `Coach-Adaptive-Learning-Amendment-002`.** 18 tests on the new module; **2,049 green**, tsc 0, lint at baseline.


### 1. Pricing structure locked, and two live bugs the app was telling people about (2026-08-12, CODE + migrations 0141 · 0142 — ✅ BOTH APPLIED)

**⚠ THE MIGRATION LEDGER IN THIS DOCUMENT WAS WRONG, AND IT COST A SESSION.** Eight migrations were recorded as pending — `0131–0133`, `0137–0140`, `0142`. Every one of them was already applied. The cause is structural: entries are appended at the top and older paragraphs keep their original claims, so the same migration reads both "0134 + 0135 APPLIED" and "NOT YET APPLIED" depending which one you land on. **`supabase/apply/preflight-what-is-applied.sql`** now exists to ask the database instead — read-only, one row per group, probing an object each migration *creates* rather than a version number, because all three of this project's recorded "a migration lied about having worked" failure modes survive a version check. **Applied and verified through `0142`.** Anything new starts at `0143`, and `ls supabase/migrations | tail` comes before authoring — this plan first said "0137" when the tree was already at 0140.

**⚠ THE APP TOLD EVERY TESTER THEY HELD A SUBSCRIPTION THAT DOES NOT EXIST.** `src/domain/settings/content.ts` shipped design-comp copy asserting *"Subscription: Founder… every training, Legacy, and competition feature is unlocked, with no tier above it… Your plan renews yearly. Billing is handled through your app store, where you can review the next charge or cancel at any time."* There is no entitlement, no billing integration, no `Founder` tier in any locked document, and no money has ever changed hands. An inaccurate subscription disclosure (App Store 3.1.2) shown to the exact cohort we intend to charge $149. Now reads **"Free while testing"** with copy that is true, keeping the two lines that always were: Forge is not pay-to-win, and everything logged stays free when paid plans arrive. A guard test asserts the absence of all five original claims (*renews yearly · billing is handled · next charge · cancel at any time · Founder*) and was verified to trip on the old copy rather than passing for the wrong reason. ⚠ **Swept into a parallel session's commit `cd1d9b3`** rather than committed on its own — the third such collision; concurrent sessions want separate branches.

**⚠ CHECK-IN VIDEOS NEVER EXPIRED — A READ FILTER IS NOT A LIFETIME.** 0049 re-modelled check-ins as ephemeral 24h stories and every read path honours that window (`created_at >= now() - interval '24 hours'` in 0050 · 0051 · 0053 · 0055 · 0108). Nothing ever deleted anything. The ≤30s video sat in the public `squad-media` bucket forever, for a feature the athlete believes is gone by tomorrow — an unbounded storage cost and a broken promise, and **the only per-use cost in the product.**

**The obvious fix would have broken an honor, silently.** `squad_checkins` is read by two systems with *no* 24h window: 0099/0100 count distinct check-in **days** per athlete and `team_player` needs **fifty** of them, so pruning rows caps that count at 1 and makes the honor permanently unearnable with nothing raising; 0130 counts check-ins "ever" for admin metrics. **So `0141` destroys the media and keeps the row** — `video_url` → NULL, `video_pruned_at` records when — scheduled hourly at :17 as `forge-checkin-prune` (nightly would leave a video live up to a day past its window). Client-side, `fetchSquadCheckins` also filters `video_url is not null`, because the cutoff is computed from the **device** clock and a slow phone would hand a null into `videoUrl: string`.

**`0142` corrects `0141`, which was wrong about a permission that is actually an impossibility.** 0141 wrapped its `delete from storage.objects` on the theory the privilege "may or may not be granted." It is neither: Supabase installs `storage.protect_delete()`, which raises **42501 on any direct delete from a storage table**. Verified empirically — `select` succeeds and shows the rows, `delete` raises. **SQL can never reclaim these bytes**; only the Storage API can, and that needs a service key this project deliberately does not hold. Worse, nulling the url destroyed the only record of *which* file the row had pointed at, so every prune minted an untraceable orphan. The first run orphaned four (~40 MB, since removed by hand). `0142` adds **`video_object_path`** — a durable, queryable ledger of what is owed to the bucket — plus `squad_checkin_orphans()` to read it and `squad_checkin_mark_reclaimed(text[])` to settle it. That function takes an explicit array with **no all-rows default**, because marking the ledger clean asserts the files are gone and a shorthand would make losing the list one keystroke while the bytes stayed billed. Reclamation stays manual until volume justifies pg_net + Vault; at four files that trade is not worth making, at ~0.5 TB/yr it plainly is, and the ledger is what says when. **0141 carries a SUPERSEDED banner — re-pasting it reinstates the broken body.**

**PRICING STRUCTURE — LOCKED (plan at `Docs/` pending; currently `~/.claude/plans/`).** Reviewed line by line, 26 Free lines and 12 Premium lines. The organising principle is *Never Charge For History* pointed the other way: **your legacy is yours forever, the coach is a service.** Everything an athlete builds costs ~**$0.35/athlete/yr** to keep, so it can honestly be sold once; conversational AI costs real money per use, so it is metered.
- **Free** — unlimited logging, history, PRs, rank, 179 honors, chapters, goals, timeline, 721 exercises, 81 templates, 14 programs, friends, feed, *joining* challenges, push. **Share-card export and sending a program moved here** — both are distribution, not features to sell. **No ads, ever, any tier.** Coach Holt: 1 four-week program lifetime + 2 single days/month refilling; no mid-workout Holt. Capped: 1 squad · **3 programs lifetime (built, generated, *or received*)** · 75 photos (= 12 monthly gallery entries at 6 poses, "a full year of progress photos, free" — **closes Decision Queue #14**) · 5 persistent videos (check-ins never count) · 5 templates · 1 import.
- **Premium** — $12.99/mo · $99.99/yr · **$299 once.** No limits on anything built. **Coach Holt unlimited is what makes $99.99 hold** — any goal × 2–6 days × 4 rooms × 6 limitation sets, five race distances, mid-workout help, adapts a running program, none of it needing AI. *Fitbod charges $95.99/yr for algorithmic generation and little else.* Plus personal weekly/monthly recap (in build), Transformation Compare, Legacy Export, squad records/recaps, challenge creation.
- **Coach AI** — $9.99/mo · $89.99/yr add-on. Conversational Holt, programs from a description, photo coaching, form check from video. **Metered in credits, not per-feature counters** (message 1 · photo 3 · form check 6; **150/month**) so any future capability gets a weight instead of a fifth meter. ≈$45/yr worst case, ≈$15 typical, on **Sonnet 5** with the rulebook prompt cached.
- **Founder** — **$149 once, first 100 new signups**, then delisted, with a visible counter. Coach AI 30% off for life. **The 20 OG testers do not occupy seats.** ≈$12,665 up front — this, not the subscription, is the year-one revenue plan.
- **Photo coaching passes the DNA by construction: it produces a program change, never an assessment.** Four binding rules — always paired with an action · additive never deficit-framed · only when asked · **muscle development only, never body composition.** That last is a wall, not tone: it is where training advice becomes a body-image judgment. **Minimum age 18** (PO, 2026-08-12). Needs a formal DNA amendment on the CC-D1 / SOC-D4 / CAL-D19 precedent, and **Monetization Amendment 003** (Amdt 001 §4 currently forbids a tier above Premium; the squad cap also reverses Critical-Decisions Amdt 001's 1 → 2).
- Legal brief for counsel is in the plan. Highest actual risk is **minors + body photos**, now closed by the 18 floor; structural risk is **"lifetime" + a separate AI subscription**, which requires the disclosure *above the buy button*, not in the terms.

**Gates:** tsc **0** · **1,987 `node --test` green** · eslint at baseline (1 error + 13 warnings). Commits `a8a12b3` · `e65a094` · `215e8af` on `feat/home-onramp`.

**⚠ STILL OPEN.** **Share-card export does not work on device** — `src/lib/share-image.ts` is a deliberate native stub whose stated reason ("no way to produce or verify an iOS build") is now out of date, and the web path is a 269-line HTML Canvas composition with no React Native equivalent. Two routes, and they differ on deliverability: port the card to `react-native-svg` + `toDataURL` (no new native module, **OTA-safe**), or capture the preview with `react-native-view-shot` (**new native module → fingerprint change → new iOS build**, and it contradicts 0049-era "compose, don't capture" reasoning). It became load-bearing the moment export moved to Free.

### 0. RELEASE STATE — 2026-08-11 (read this before shipping anything else)

**⚠ UPDATED 2026-08-11, later the same day — the OTA block below is CLEARED and an update has shipped.**

| | |
|---|---|
| **OTA** | ✅ **PUBLISHED — Phase 1 + Phase 2, at commit `eb95051`.** Branch `production`, iOS runtime `74a9a86b…`, latest group `f52dfb73-ac3a-4195-a979-20723a3ed03d` ("clean republish"). `fingerprint:compare` matched build `5de44367` exactly before each publish. ⚠ **The phone and the web preview are at `eb95051`, NOT at HEAD** — see the note below |
| **iOS build in the field** | `5de44367`, production, **1.0.0 (build 4)**, commit `651fd80`, runtime `74a9a86b…` — this supersedes `0d07a777` (build 3) and is what the OTA targets |
| **Android** | An Android update group was published (`961ff3c8…`, runtime `ca025e7e…`) but **there are no Android builds at all**, so it reaches nobody. Harmless; noted so nobody reads it as coverage |
| **Migrations** | **0129 + 0130 APPLIED by the PO 2026-08-11**, and the `app_admins` grant ran |

**Why the earlier block below is now stale:** it recorded the OTA as undeliverable because the live build
was `2511c478` (runtime `791bacda…`) while local was `3508eed9…`. Build 3 then shipped, then build 4
(`5de44367`, runtime `74a9a86b…`), and local now matches build 4. The previous OTA — "Squad settings:
Edit Identity scrolls" — was stamped `3508eed9…`, i.e. **build 3's** runtime, so it stopped reaching the
phone the moment build 4 was installed. This update is the first one build 4 can actually receive.

---

| | |
|---|---|
| **Commit** | `d199c45` on `feat/home-onramp` (not pushed, not merged) — superseded; HEAD is now `2a5dcce` |
| **Web preview** | **LIVE at commit `eb95051` (Phase 1 + Phase 2)** — forgelegacy.expo.app, root 200, `/admin` 200, serving `entry-d9c52505d8b342f7b31cecec2b1ff0ac.js`, hash verified against the clean-worktree build. ⚠ Also NOT at HEAD — see the note below |
| **iOS build** | `0d07a777-5829-43d6-8a23-63de2cdf7455`, production, **in progress** — commit `d199c45`, runtime `3508eed9…`, build number 3 |
| **Migrations** | 0126 · 0127 · 0128 **APPLIED** by the PO. **0129 + 0130 authored 2026-08-11, NOT applied** — paste `supabase/apply/pending-0129-0130.sql`, then run its STEP 2 to grant yourself admin |
| **OTA** | **NOT PUBLISHED — and must not be until 0d07a777 is installed.** See below. |

**⚠ WHAT IS ON THE PHONE IS `eb95051`, NOT HEAD — AND ONE OTA WENT OUT THAT SHOULD NOT HAVE.**

`eas update` and `expo export` bundle the **working directory, not the commit**. An OTA published at
16:xx bundled a concurrent session's uncommitted notification work (`post_comment` / `post_reaction`,
migrations 0134/0135) — code that had never been through a gate, since the test run predated the files.
It degraded rather than broke (the client reads the new fields with `?? null`, and the un-migrated
`notification_feed` never emits those kinds), but the net effect was a notification toggle that did
nothing.

Corrected by republishing from a **clean `git worktree`** at `eb95051` — group `f52dfb73` — and
redeploying web from the same tree. The concurrent session's files were never touched; it has since
committed that work itself as `efd42d0`.

**So `efd42d0` (the Home on-ramp + the notification feature) is NOT on any device or on the web
preview.** Whoever ships next should `fingerprint:compare`, confirm `git status` is clean, and publish
from HEAD.

Two traps found while doing it, both recorded in `feedback_publishing_from_a_dirty_tree`:
a `node_modules` **junction** changes every hashed path and silently breaks the fingerprint (use a real
copy), and a fresh checkout rewrites `.easignore` / `eas.json` with **CRLF** where the main working copy
has LF — identical to read, different bytes, different fingerprint.

**⚠ WHY THIS RELEASE COULD NOT BE AN OTA, AND WHY THAT WAS CHECKED RATHER THAN ASSUMED.**

`runtimeVersion` is `{ policy: "fingerprint" }`. Adding `react-native-compressor` +
`react-native-nitro-modules` for video compression changed the native fingerprint, so
`fingerprint:compare` against the live build was decisive:

```
live iOS build (2511c478, Aug 7) : 791bacda…
local project                    : 3508eed9…
sole difference                  : the two compressor packages
```

An `eas update` published in that state would have uploaded fine, reported success, and been
**delivered to nobody** — the standing trap in this project's history. Forcing a matching
`runtimeVersion` would have been worse: JS calling a native module the installed binary does not
contain is a crash on any screen with a camera.

PO decision, 2026-08-11: **new build, ship everything together** — rather than stripping the compressor
to make the OTA deliverable. So nothing reached existing phones this pass; the web preview is the
surface to test on, minus video compression, which is native-only by nature.

**ONCE 0d07a777 IS INSTALLED**, runtime `3508eed9…` becomes the OTA target and ordinary
`eas update` resumes for JS-only work. Re-run `fingerprint:compare` before the next one anyway.

### 0. OTA PUBLISHED — the phone has it too (2026-08-11)

**⚠ `eas deploy` IS WEB ONLY. It had shipped nothing to anybody's phone.** Every item in 0a/0b below was
live on `forgelegacy.expo.app` and invisible on device until this step.

| | |
|---|---|
| **OTA** | ✅ Branch `production`, commit `e42f4f9`. iOS group `c14c51e6-435c-4a9b-9f91-62d6f1bf1a9f`, runtime `74a9a86b…` |
| **Deliverable?** | ✅ `fingerprint:compare` against build `5de44367` returned an EXACT match — `74a9a86b…` both sides. Everything this pass changed is JS-only |
| **Android** | Group `b2e77975…`, runtime `ca025e7e…` — still reaches nobody, there are no Android builds |
| **Web** | `forgelegacy.expo.app`, `entry-a316550d699c4f6b3aacad7cb664efbe.js`, verified 200 + grepped live |

**Push registration IS in the field build** — `9fa0da7` ("push notifications, joining a live workout…")
is an ancestor of `651fd80`, which build 4 was cut from. So 0137's signup alert needs only the migration
and a registered device, not a new build.

**Still server-side and outstanding: migrations 0137 then 0138.** Until they run, the signup list shows a
"migration not applied" message and substitution capture is a silent no-op — which costs the signal,
never a workout.

### 0aa. DEPLOYED — and a new deployment failure mode, recorded (2026-08-11)

**Live:** `forgelegacy.expo.app` serving `entry-b6b2319ef4aa662e06642f2c158d17d1.js`, verified 200 on
`/`, `/admin`, `/workouts`, `/legacy`, `/privacy`. Branch `feat/home-onramp` pushed through `3a71297`
(7 commits: the five PO items, the coach capture layer, and the Home splash work that had been sitting
uncommitted in the tree).

**⚠ THE "DEPLOY 404" HAS TWO DIFFERENT CAUSES AND THE RECORDED FIX ONLY ADDRESSES ONE.** The dashboard
note has said "a successful deploy serving 404 has happened twice; re-run fixes it". That is the
**empty-upload** fault. This was the other one: the upload was perfect and **the production alias never
moved**, while the CLI printed `Promoting deployment to production ✔` and the production URL. Three
consecutive `eas deploy --prod` runs each produced a healthy new deployment and left prod pointing at an
old one.

**Tell them apart by curling the DEPLOYMENT-SPECIFIC URL, not just prod.** Deployment URL also 404 →
empty upload, re-run. Deployment URL 200 while prod 404s → alias, and re-running cannot fix it:
`npx eas-cli deploy:alias --prod --id <deploymentId>`.

The giveaway here was that `/privacy` and `/manifest.json` (both `public/` assets) served 200 off prod
while every expo-router page 404'd — prod was pinned to a deployment old enough to predate those routes.
`npx expo export` vs `--platform web` is a red herring; both produce identical output.

### 0b. Coach Holt does not learn — the capture layer (2026-08-11, CODE + `Coach-Adaptive-Learning-Amendment-001`; migration 0138 NOT YET APPLIED)

**Gates:** tsc **0** · **1,884 `node --test` / all green** (11 new) · eslint baseline.

PO: *"Is Coach Holt learning? … what they swap for, how long they take, everything about them."*

**Answer: no, and it is stark.** `src/domain/coach/**` reads **no database at all**. `assemble()` receives
only what the athlete typed into the questionnaire plus one remembered fact (experience level) — same
answers, same program, forever. The one exception is `progression.ts`, which does read logged sets and
picks the next weight, but runs **only** as a prefill in the live logger and never reaches what Holt builds.

**⚠ THE BIGGEST GAP WAS AN UNIMPLEMENTED LOCKED SPEC, NOT A MISSING FEATURE.**
`Exercise-002-Exercise-Substitution-Architecture` §10.1–10.2 has required *"both the substitute and the
original name … captured at write time and permanent"* since substitution shipped. There is no
`prescribed_*` column anywhere in 137 migrations. **Every substitution this app has ever recorded threw
away the half that says what was replaced** — the clearest signal an athlete ever gives about their
training, discarded at the moment they gave it.

Built: `workout_exercises.prescribed_catalog_key` / `prescribed_name` + `record_substitutions()` (written
post-commit beside `partners` and the playlist, because `save_workout`'s 11 args have been frozen since
0095 and every path calls it); `exercise_avoidance`, the negative counterpart `exercise_favorites` has
lacked since migration 0020. The first swap wins (A→B→C was prescribed A); a swap back to the same
movement records nothing.

**⚠ NOT BUILT, DELIBERATELY (CL-D11):** `assemble()` still ignores every signal — Holt's output is
unchanged by this pass. **CL-D3 makes a visible, reversible avoidance list a PRECONDITION of the engine
reading it**: an avoidance the athlete cannot see silently narrows their training and nobody ever finds
out why. Wire the surface before the engine. Duration (CL-D4) and skip (CL-D5) adaptation unimplemented.

### 0a. PO training-session feedback, batch 4 — five items, four of them one tap deep (2026-08-11, CODE; migration 0137 NOT YET APPLIED; NOT YET DEPLOYED)

**Gates:** tsc **0** · **1,873 `node --test` / all green** (27 new) · eslint **1 error + 13 warnings, the
pre-existing baseline**. ⚠ **Not yet exported or deployed** — the web preview is still at `eb95051`.

**1 · A workout done with a partner never counted toward the program.** Reported from the field: two
athletes finished Week 2 · Day 1 "Legs" together and Home still offered Week 2 · Day 1 "Legs — Start
Workout" afterwards. One of them re-logged the whole session by hand because the app told him it had not
happened — the 29-set, 5-minute row in his history is that re-log.

An invite SNAPSHOTS its workout rather than pointing at one, and 0093's reasoning for that is correct:
"the person you ask may not own the program, and 'next session' resolves from each athlete's own
completed count." It went one step further than the reasoning did and dropped the GUEST'S program too.
`writeWorkoutLaunch` carried a shape, a name, a partner and a start index and **no `programId` at all**,
so `save_workout` wrote no `program_sessions` row and the day stayed open forever.

Fixed by asking the guest's OWN schedule (`matchSharedShapeToSlot`, `resolveSharedSessionSlot`): a slot is
satisfied when every main lift it prescribes was in the workout they just did. Coverage rather than
equality, because a live-session snapshot carries warm-ups too; catalogue-key identity first, because the
invite renames every lift through `exerciseNameFor`. No match → saves exactly as it did before.

**2 · Only ONE of the two athletes was ever named.** Every path that wrote `workouts.partners` ran on the
device that RECEIVED something — the guest accepting an invite, the host accepting a join request, the host
inviting from inside a live session. The ordinary case (send an invite from `/train-invite`, pocket the
phone, go and train) tagged nobody, because the sender was not in a session when they asked. So one
athlete's history said "with Selene" and Selene's said nothing, for the same hour in the same gym.

Both devices now derive the credit from the ACCEPTED INVITE, which is the one row both can read and the
only thing either agreed to (`partner-credit.ts`, 12-hour window since an accepted invite is never
consumed). Applied at session start AND at Finish, so an accept that lands mid-workout still counts — and
`partnerIdsDeclined` keeps the second pass from undoing a tag the athlete removed. Name resolution no
longer depends solely on `training_partners()`, which returns `[]` on ANY failure by design and was
silently costing the tag.

**3 · "I have to click Log Set twice."** Nothing was wrong with the button. The set sheet is
`position:absolute; justify-content:flex-end` with `paddingBottom: keyboardInset`, so tapping it blurs the
field → the keyboard closes → the inset drops to 0 → **the sheet slides ~300px down between the finger
landing and the finger lifting**. The press-out lands on empty space and the Pressable cancels. True of
every panel `useKeyboardInset` positions, which is nine screens. The hook now holds a SHRINK for one beat
and applies a GROW at once — which is also the truer animation, since `keyboardWillHide` and Safari's
first `visualViewport` resize both fire at the START of a ~250 ms close.

**4 · Nobody knew who Holt was.** The whole coach sat behind an unlabelled bronze medallion; an athlete who
never guessed it was tappable never met him. `hasMetHolt` has existed since the sheet was built, recording
an introduction most people were never in a position to receive. The bubble now carries a one-time named
teaser that retires on the first tap. It does not breach §3.5 ("never generic, never a nag") — that rule
bars the app talking to fill a silence; this is a label on an unlabelled control, true exactly once, and
dismissed by the very tap it asks for.

**5 · "Notify me when someone signs up, with the name."** Both halves built. ⚠ **A signup list is a
ROSTER, which AA-D2 forbids** — recorded as `Docs/Admin-Analytics-Amendment-001.md` (**AA-D8**: the
operator may see who has an account and *nothing else about them*; **AA-D9**: AA-D2's performance
prohibitions are unamended and absolute) rather than broken silently. `/admin`'s footer claimed "no
athlete is named on this screen" and has been corrected in place.

⚠ **The trigger fires on being NAMED, not on INSERT.** `handle_new_user()` mints every profile as
`name = 'Athlete'` because the sign-in screen collects only email and password — a trigger on INSERT would
have pushed "Athlete signed up" every single time, which is the count again with a sound on it.
`event_at` is pinned to `created_at` so 0120's unique index dedupes every later rename for free. It writes
`push_outbox` directly (AA-D10 — a signup belongs in no athlete's `/inbox`) and **swallows every
exception** (AA-D11 — it runs inside onboarding, and an alert that raises is a lost athlete).

**Migration 0137 is SELF-CONTAINED**: it restates 0129's `app_admins` / `is_app_admin()` / `admin_guard()`
verbatim, so it runs correctly whether or not 0129 is in. Push half no-ops until 0120 is applied and says
so via `raise notice`.

### 1. PO training-session feedback, batch 3 — three things found by using it (2026-08-11, DEPLOYED; migrations 0134 + 0135 NOT YET APPLIED)

**Gates:** tsc **0** · **1,832 `node --test` / all green** (10 new) · eslint **1 error + 13 warnings, the
pre-existing baseline** · clean web export, `entry-18a2c2ead296c028102611448d51be56.js`, verified live on
`forgelegacy.expo.app` (200).

**A. The Friends composer could not attach media, and left the screen unusable.**
*"I clicked on the text bar at the top and it won't let me add a video or a picture. And now I'm frozen
on the friends feed page."*

`friends.tsx` held its own `Composer` inside a `BottomSheet`. **It was the only capture surface in the
app that opened a media picker from inside a modal, and the only one broken** — every other one (profile
photo, transformation capture, create squad, accomplishments, squad composer) is a pushed route with
nothing above it. `useMediaPicker` presents its own sheet and then a system picker; its header already
documents, from a tester report, that iOS silently refuses to present a view controller while another is
on screen. The wait it carries covers **the chooser it owns**, not a caller that is itself a modal. So
the sheet stayed up, the picker was dropped with nothing thrown, the buttons read as dead, and an
invisible overlay went on swallowing taps — the freeze.

**`/squad-composer` is now the one composer for both feeds.** The audience picks the writer, per
`Social-Architecture-Amendment-002` §4: `addSquadPost` for SQUAD, `createFriendPost` for FRIENDS and
BOTH, because `addSquadPost` never sets `audience` and so can only ever produce a SQUAD row. Unavailable
destinations are **shown disabled with the reason** (SOC-A2-D3), not hidden.

The mapping between the two feeds' post types moved into `domain/squad/post-audience.ts` with six tests,
because **its failure mode is silence**: a comparison written under the squad's own `transformation` name
renders on the friends side as an ordinary gallery — a before/after with no "before" — and nothing
throws. That is precisely what `shapeOf`'s header warned any future friends-audience writer about.
Progress Photos is excluded from a friends-only post for a different reason: it leaves for
`/progress-photo-post`, which posts through `addSquadPost` and refuses without a squad.

**B. Nobody was ever notified that somebody answered them.**
*"I got reactions and comments on my last post, but I wasn't notified."*

True on **both** feeds. `notification_events_for` had twelve branches and not one read
`squad_post_comments` or `squad_post_reactions`. The app told your squad when you **posted** (0122) and
told nobody when they **answered** — the half of a conversation that makes it one.

**SOC-D11 has locked "Comments generate notifications (to the post author; new P-5 row, §13)" since the
document locked, and it was never built.** The recurring pattern, in a new costume.

Migration **0135** adds branches 13 and 14 with two different locked defaults:
- `post_comment` → new `post_comments` toggle, **default ON**. P-5 §3.2: something aimed AT you defaults on.
- `post_reaction` → the **existing** `squad_reactions` toggle, **default OFF**, exactly as SOC-D11 locks
  it. That control was locked by P-5 §3.1, shipped in 0022 and has been **inert for thirteen migrations**;
  this is the branch it was always waiting for.

**⚠ The default-OFF governs PUSH, not the inbox.** `push_prefs_allows` is read only by
`push_enqueue_for`; `notification_feed` never consults it. So a reaction always appears in `/inbox` and
reaches a lock screen only if asked — P-5 §4's standing rule, and what lets this answer "I should be
notified" **without overriding a locked default**.

Notifies the **post author alone** (SOC-D11) — deliberately not a comment on a thread you also commented
on, which is a separate feature with its own volume problem. Both branches windowed at 14 days.

**⚠ A new `post_id` OUT column forced a DROP** (42P13), **and a DROP resets 0120's revoke from PUBLIC** on
a SECURITY DEFINER function that answers for *any* user id. Re-revoked in the migration. The test that
banned drops outright was **rewritten to assert what it actually protects** — a blanket ban would have
pushed the column in through some other door (overloading `share_id` was the tempting one) to satisfy a
test rather than a property.

**C. A workout that moved the squad goal was a dead link for everyone but its author.**
*"I clicked on goal progress, went down to the bottom to see recent updates, and clicked on a workout
someone logged but it said it couldn't load it."*

**0117's bug, one door over.** That migration fixed the dead link on a **feed card** by adding
`shared_workout_detail`, whose gate is "a post exists carrying this workout on an audience you are in".
The goal screen (0107) lists the sessions that moved the number and links each one — but a goal
contribution is **not a post**, so the gate refused it and the owner read (`athlete_id = auth.uid()`)
refused it too.

**The listing and the gate had different answers, which is the actual defect.** 0134 makes the gate agree
with the listing that offered the row. Permitted by **SQ-D2**, which lifts the Performance Firewall for
squad-**internal** surfaces — and narrowed to `is_squad_member` deliberately, because
`squad_goal_detail` also answers for a **non-member of a public squad**, and mirroring its predicate
exactly would have let a stranger open a member's every logged set. Also requires the squad to actually
have a goal: `goal_started_at` is null when none was set, and `coalesce(…, '-infinity')` would otherwise
have admitted every workout its members had ever saved.

*(Recorded, not fixed: a public squad's `events` list still shows non-members the workout names and
durations of that squad's members. That is 0107's question, not 0134's.)*

**What this batch keeps confirming:** all three were found by a person using the app, and none was
reachable by grep, tsc or the test suite as it stood. Two of the three are the same shape as a bug this
project had already fixed once — a picker that cannot open over a modal, and a gate that refuses a row
its own screen just offered.

---

### 1b. Creator Dashboard — Phase 1 (2026-08-11, CODE + migrations 0129 + 0130, NOT YET APPLIED)

PO: *"Is there a way I can make a dashboard to see what everyone is using and how often?"*

There was not. 128 migrations of fully-timestamped, user-scoped state and **no telemetry of any kind** —
no Sentry, no Amplitude, no PostHog, no event table, no `last_active` column, no admin concept, and
deliberately no service-role key. Every number worth having existed only as raw rows nothing aggregated.

**What shipped.** `/admin` — a standalone screen, reached from **one row in Account Settings that renders
only for an operator**. Not a tab; the tab bar is still four for everybody including the PO. It reports
growth, an onboarding funnel, weekly retention cohorts, DAU/WAU/MAU, a churn-risk histogram, adoption
across 20 features, program adherence and drop-off week, most-trained exercises, session source, and
squad/friend/challenge/push health — **all of it retroactive over every athlete already in the database**.

**The gate is Postgres, not the URL.** expo-router compiles every route into the bundle and `web.output`
is `"static"`, so `/admin` exists as a public file on forgelegacy.expo.app no matter what the client does.
0129 creates `app_admins` (**RLS enabled with ZERO policies** — deny-by-default, so the roster is not
enumerable through the world-readable `profiles` table) plus `is_app_admin()` and one shared
`admin_guard()`, which is the first statement of all seven read models. A signed-in non-admin gets `42501`,
never an empty result — an empty result is indistinguishable from "no data yet" and would hide a broken
guard for months. `supabase/seed/admin-roundtrip.mjs` loops every function by name and asserts the refusal;
**adding an eighth RPC means adding its name to that script in the same commit.**

**Governance first, code second.** `Docs/Admin-Analytics-Architecture-v1.0.md` (LOCKED, AA-D1..D11) sets
out why an operator surface is outside CS-D22.4 and SQ-D13 rather than in breach of them — both bind
*athlete-facing* surfaces, which they enumerate by name — and pins the three constraints that keep that
true: **no per-athlete drill-down, no admin metric may flow back into a product surface** (which would
breach Social-Amendment-003's ban on popularity ranking in discovery), **no widened read path**.

**Four ways this class of screen lies, all handled in the payload rather than the renderer.** A cohort
cell beyond `max_k` is UNKNOWN, not 0% (bare surface, no number — a 0% cell prints its zero). The current
week is partial and is labelled, because otherwise it always dips and reads as collapse on a Tuesday. The
week-2 funnel stage carries its **own denominator**, or the last stage becomes a function of growth rate.
And `active_def` is stated on screen: **"active" means saved a workout**, because there is no app-open
signal until Phase 2.

**Also caught:** a repo guard (`catalog-contract.test.mjs`) rejected the first draft of 0130 for binding
alias `c` to both `cohorts` and `squad_checkins` — the scanner reads that as a dropped-column reference,
and so would a person. Renamed rather than suppressed. `squad_checkins` genuinely has no `checkin_date`
(0049 dropped and rebuilt it), `goals` has no state column, and `challenges.state` is UPPERCASE while
`programs.state` is lowercase; all three are recorded in 0130's header.

**Files.** `Docs/Admin-Analytics-Architecture-v1.0.md` · `supabase/migrations/0129_admin_gate.sql` ·
`0130_admin_metrics.sql` · `supabase/apply/pending-0129-0130.sql` · `supabase/seed/admin-roundtrip.mjs` ·
`src/domain/admin/{chart-core,series}.ts` + tests · `src/data/admin-live.ts` ·
`src/components/forge/admin/charts.tsx` · `src/app/admin.tsx` · `_layout.tsx` · `domain/settings/content.ts`.

**Gate:** tsc clean · **1,807 tests** (91 new: 28 chart/series, 3 settings, the rest existing) · lint at
baseline · route-guard green with `admin` declared.

**⚠ NOT DONE:** the migrations are authored, not applied. And Phase 1 measures *what people did*, never
*what they liked* — screens visited, features tapped, session length and where people abandon a flow all
wait for Phase 2, which cannot ship before its privacy disclosure does.

### 1a. Creator Dashboard — Phase 2: what people OPEN (2026-08-11, CODE + migrations 0131·0132·0133, NOT YET APPLIED)

Phase 1 measured what athletes **did**. It could not distinguish somebody who opens Forge every day and
logs nothing from somebody who left — screens opened, features used, session length and the point at
which a flow is abandoned were not recorded anywhere in the product.

**The disclosure ships first, and that ordering is the deliverable, not a formality.**
`P-6-Amendment-001-Product-Analytics` closes **P-6 § 6 Open Question 3**, which had recorded in as many
words that there was *"no existing authority either way"* on analytics disclosure. `Privacy-Policy.md`
§ 2 now lists every stored field at granularity, what is never in one, the 90-day retention and the off
switch. **The "no third-party analytics" claim STAYS** — it is still true and is the strongest sentence
in the document. An event row in our own database follows nobody anywhere; an SDK does.

**`domain/analytics/props-core.ts` is what turns that promise into a property of the code.** An
allowlist, applied at the boundary, tested — because `track('workout_saved', { name: workout.name })` is
the most natural line in the world to write and no amount of care prevents it. A second pass drops prose
handed to an *allowlisted* key (`{ category: workout.name }`), which a key check alone cannot catch.
Route paths reduce to their shape, so `/squad/[id]` is stored and *which* squad is not, and the query
string is dropped because that is where a search term would ride in.

**Three decisions that are load-bearing rather than stylistic:**

- **`app_events` has no UPDATE and no DELETE policy.** An append-only log its subject can rewrite is not
  a log. Deletion happens by FK cascade, which is the deletion the policy actually promises.
- **Two clocks.** `occurred_at` is the device's and can be wrong by years; `received_at` is the server's
  and **every metric computes from it**.
- **Presence went on its own table, not `profiles`.** `profiles_read` is `using (true)`, so a
  `last_active_at` there would publish every athlete's app-open time to anyone holding the anon key.
  Also fixed on the way: the existing sync returned early when `Intl` yielded no timezone, which would
  have silently skipped the stamp and reported those athletes as never opening the app.

**The dashboard now carries two definitions of "active" at once and labels both** — Phase 1's sections
count a saved workout, "What people open" counts an app open. Silently mixing them would make one word
mean two things in a single scroll. The section also reports its own coverage (how many athletes opted
out), so a partial sample cannot read as the population.

**Gate:** tsc clean · **1,822 tests** (15 new) · lint at baseline · commit `2d0a5e3`.

**⚠ NOT DONE:** migrations not applied, and **the privacy policy is still not published to any URL** —
see the Current Sprint block and Decision Queue #22. The policy must be live before 0131 runs.

### 2. The four open decisions from the PO review, all built (2026-08-10, CODE + migration 0128 + a native dependency)

**A. EZ BAR — 12 movements, and a checkbox that stopped lying.** Not one of the 797 records named an EZ
bar and no alias mentioned one, so "ez bar curl" returned nothing. Worse: Home Gym had always *offered*
"EZ-curl bar" as ownable, and `EQUIP_UNLOCK.barbell` listed `ezbar` — **so ticking it told the app you
could Back Squat and Deadlift.**

Twelve rows under a new `ez_bar` equipment id: the ten barbell counterparts (biceps · preacher · reverse
· drag · spider curl, skull crusher, overhead extension, JM press, upright row, pullover) plus **both
wrist curls, which did not exist on any implement**. Each joins its existing FAMILY, so the relationship
generator gave them alternatives for free (5,722 → 5,806 edges, **0 exercises newly orphaned**). `ezbar`
now unlocks EZ work and nothing else. Catalogue 797 → **809 in the file, 733 visible**.

`trapbar` deliberately still maps to `barbell`: it has the same flaw, but with no trap-bar movement to
point at, removing it takes an owner from "too much" to "nothing at all". That is an argument for a
trap-bar pass, not for a change now.

**B. TIMED EXERCISES — the catalogue can say so, and the logger runs a clock.** `unit: 'reps' | 'time'`
annotated onto **82 records** (27 holds, 25 carries, 30 held mobility) — absent means reps, so 727 rows
are untouched and every pre-existing reader is unaffected. The other 22 mobility entries are deliberately
reps: CARs are counted rotations, Cat-Cow is a rep, World's Greatest Stretch is a flow you move through.

`HoldTimer` is the new control: tap to start, ring fills, dings and completes. **Stopping early records
what you held** — 40 of a prescribed 60 is a forty-second set, not a failure — while a timer that *ran
out* records the target exactly, because the 250ms tick would otherwise log 60s planks as 60 and 61 at
random and an athlete would read scheduling jitter as progress. A sub-second hold is a mis-tap and
records nothing.

**C. VIDEO — on-device transcode before upload.** `react-native-compressor` (+ nitro), 720p / 2 Mbps,
compressing only above 4 MB. The reported case — 16s of iPhone 4K60 ≈ 120 MB against a 50 MB ceiling —
now uploads at a few MB. Two rules carry the weight: an **unknown** `fileSize` compresses (Android
frequently omits it, and the unmeasured library clip is exactly the case this exists for), and a result
that came back **bigger, or less than 10% smaller, is discarded** — re-encoding an already-efficient clip
routinely inflates it. A progress overlay lives in `useMediaPicker`, so all seven capture sites get it.

⚠ **NATIVE-ONLY — needs a new build, no OTA.** The web preview keeps the old behaviour by design, so a
"too large" there is not evidence of a regression.

**D. CUSTOM EXERCISES — Exercise-001 and W-28 finally have code.** Both specs LOCKED for months with no
table; the Library and the Picker each carried a standing note saying the section was omitted because
there was nowhere to save. **Migration 0128** adds `custom_exercises`: name the only required field
(EX-001-D3), private RLS (EX-001-D2), soft delete so template references tombstone rather than dangle
(EX-001-D7), and the 500 cap enforced in a **trigger** — a cap living only in a screen is no cap, since
import auto-creates rows and never opens one.

Three surfaces: `/custom-exercise` (W-28, create+edit off one route), **My Exercises** in the Library —
rendered even when empty, because the athletes who most need to know the door exists are the ones with
nothing in it — and **inline creation from the Picker's empty state**, which turns "it isn't in the list"
into one tap with the name already typed. Custom rows carry `unit`, so an athlete's own hold gets the
same countdown a catalogue plank does, and a `custom:<uuid>` key namespace keeps them recognisable to the
logger, PR detection and lift history.

**Verified:** 1,773 tests (+47), tsc clean, lint at baseline, **web bundle builds** and correctly excludes
the native compressor. A repo guard caught the one real miss — the new screen was missing from
`_layout`, which would have shipped a route the auth guard could not reach.

⚠ **THREE MIGRATIONS PENDING, IN ORDER: 0126 → 0127 → 0128** (`supabase/apply/pending-012*.sql`).
Custom exercises degrade honestly until 0128 (My Exercises reads empty; creating one says the migration
has not been applied), but **0127 must land with the app build** or the first hold logged reads back as
cardio.

### 2. Three PO-reported bugs, each a comparison that was right until it wasn't (2026-08-10, CODE + migrations 0126–0127)

From a single PO review pass. Three unrelated screens, one shared shape: a predicate that was sound when
it was written and quietly stopped being sound when something beside it changed.

**A. Your own template opened somebody else's shelf.** `(tabs)/workouts.tsx` gave every row in "Your
Templates" `onPress={() => router.push('/templates')}` — the HUB, not the template. The hub's first
section is the "From Forge" suggested shelf, so the app answered *"open my template"* with four sessions
written by somebody else. Every other entry point was already correct (`/templates` itself routes to
`/template/[id]`; duplicate and adopt both land on the copy). One row, one line.

**B. The squad weekly review had never notified anybody.** `ensure_weekly_recap` (0057) writes the summary
as an **authorless** `squad_posts` row — the column was made nullable for exactly that purpose. 0122 then
fanned `squad_posts` into the notification union with `where sp.author_id <> p_user`, and the push trigger
with `m.user_id <> new.author_id`. **`x <> NULL` is NULL, never true**, so the recap was excluded from the
inbox by the union and from push by the trigger, silently and in both directions at once. Nothing errored;
the row simply never became an event.

**Migration 0126** adds branch 12 `squad_recap` rather than merely repairing the comparison: letting it
through as a `squad_post` would word it *"An athlete posted in your squad"* about a summary no athlete
wrote. Branch 10 narrows to `author_id is not null`, branch 12 takes the authorless weekly row — a total,
disjoint partition of one table, asserted by a new test. The trigger becomes `is distinct from`. Rides the
existing `squad_feed` toggle; no fifth preference.

**C. A 60-second plank was stored as "10 reps".** `repTargets` fills an item prescribing no reps out to
`DEFAULT_REPS` — correct when AUTHORING, a fabrication for a hold. So a timed item arrived at the logger
with `targetReps: 10`, the Target column drew "1m" over a ten-rep set, completing back-filled the actual
to 10, and `save_workout` wrote a rep count nobody performed into the athlete's history.

`session-core` now gives a timed set `targetReps: 0` — the same treatment to-failure already had, and it
falls out correctly on both arithmetic paths (`effectiveReps` → no invented volume; `bestRecordWeight`
skips `reps < 1` → a weighted carry cannot announce a one-rep max). Completing back-fills the **clock**,
never the reps. `save-core` writes `duration_sec` (on `workout_sets` since 0096) with `reps: null`.

**Migration 0127 is the read side, and it exists because that write breaks an inference.** 0106 derived
"cardio" from *distance OR duration* — sound while duration meant cardio and nothing else. It now narrows
to **distance or modality**, which only a conditioning bout has ever carried; otherwise saving a session
as a template would turn every hold into a run. `shared_workout_detail` (0117) gains `duration_sec` per
set, which it never returned, so a shared plank rendered as a blank line under its own name.

⚠ **Neither migration is applied yet** — `supabase/apply/pending-0126.sql` and `pending-0127.sql`.
0126 must run after 0122; 0127 after 0125. 1,726 tests green, tsc clean, lint at baseline.

**Still open from the same review, awaiting decisions:** a `unit: reps/time/distance` field on the
exercise catalogue (≈87 exercises are timed — 28 holds, 25 carries, ~34 held mobility — and the catalogue
has no way to say so, which is what a real countdown UI needs); **12 EZ-bar rows** (the catalogue has
ZERO, yet Home Gym offers `ezbar` as ownable and `EQUIP_UNLOCK` lets it unlock Barbell Back Squat);
**on-device video compression** for check-ins (nothing transcodes anywhere — a 16s iPhone 4K clip is
~120 MB against a 50 MB cap at both client and bucket, which is the reported "too big"); and **custom
exercises** (Exercise-001 + W-28 both LOCKED, no table, nothing built).

### 2. One stalled socket could freeze the app forever (2026-08-10, CODE — no migration, OTA-deliverable)

**Reported live:** the PO tapped a friend-request push and landed on the boot spinner, permanently. Not a
push bug — push routed correctly. **The app never finished booting.**

`getSession()` does not read storage and return. It awaits `initializePromise` → `_recoverAndRefresh()` →
`POST /auth/v1/token`, whenever the stored access token is inside its expiry margin. **auth-js passes no
timeout to fetch**, and its retry loop is bounded by *elapsed* time — so a request that never settles is
never retried and never abandoned. It holds `initializePromise`, and every later auth call queues behind it.

`AuthProvider` maps that to `loading`; `routeFor` maps `loading` to `'splash'`; `BootLoading` **declares no
screens and offers no retry**. So the app froze with a bronze spinner as the only symptom, and could not
recover even once the network came back. **A push tap is the reliable way to reach it:** the phone has been
asleep long enough for the token to expire, and the first request goes out over a radio still coming up.

**Two fixes.** `supabase.ts` now supplies a `global.fetch` that puts a 10s deadline on `/auth/v1/` URLs
**and nothing else** — supabase-js hands the same wrapper to PostgREST and Storage, and a blanket deadline
would abort video check-in and transformation uploads mid-flight. (`auth.fetch` is not an option:
`_initSupabaseAuthClient` destructures a fixed list and drops it.) And the boot `getSession()` grew a
**rejection arm** — it was a bare `.then(fn)`, so any rejection left `loading` true forever, silently.

**The standing lesson, in a new costume: a loading state with no timeout and no escape is a crash that
doesn't report itself.** tsc, 1,716 tests and lint were all green through this.

### 2. A lift you add yourself is for something (2026-08-10, CODE — no migration)

Add-as-you-go had no way to say what an exercise was FOR. `pickedToExercise` stamps **three sets of eight**
on everything that comes back from the Exercise Picker — a reasonable guess for a row, and nonsense for a
plank, a farmer's carry or a dead hang. **And the guess was unreachable:** the only editable number on the
card is "Actual", which records what you DID, so a freestyle session's targets could not be set at all.

**The card asks, once, before the first set.** `SetGoalPanel` sits between the hero and the set table —
above the Target column it writes to, so the question and its answer are in one glance rather than behind a
sheet that covers the thing it describes. **Reps** opens on 8 with − / +, and the value is a **live
TextInput**, so "12" is a tap and two keystrokes instead of four presses of +; **Time** is typed as
`MIN:SEC`, with ± stepping 15s. Every change writes **straight through** to the session — there is no Apply
to forget, and `Done` only dismisses. Queued per added lift, so three new exercises are asked three times;
skipped for a run, whose own block card already asks for a distance and a clock. It is also **reopenable**
from the Goal figure on the hero, which now carries a pencil — a goal is a decision, and until now it was
settable only by catching the panel in the seconds after the exercise was added.

**⚠ A bare number in the time field is SECONDS, which is the opposite of `parseClock`** in
`conditioning.ts`, where "30" means thirty *minutes*. Both are right: that field logs a cardio bout, which
is written in minutes, and this one sets the work time of a set, which is written in seconds. A shared
parser would have to be wrong for one of them, so the field is labelled `MIN:SEC` and the rule stays local.

**A time goal writes `targetReps: 1` — one held effort — and never 0.** Zero is the to-failure marker, it
reads as "you did nothing" in the Actual column, and it would put a zero-rep set into the volume behind a
personal record. **Logged sets keep the target they were performed against**, which also protects the rows
a continued workout has already committed.

**⚠ Deliberately NOT built: the seconds actually held are still not recorded anywhere.** A time goal is the
ASK. `buildSaveExercises` sends `duration_sec` for cardio only, and the completion screen recognises a bout
**by that column** — `completionSetCount` collapses any exercise carrying one to a single set and draws it a
pace — so sending a plank's clock through it would repaint three sets of planks as one cardio leg. Logging
strength work in seconds is a change to the save path *and* the completion screen, and it is recorded here
rather than half-done.

tsc clean · lint at baseline (1 pre-existing error, 13 warnings) · **1,716 tests**, 18 new. ⚠ The figure the
entry below gives is 18 high: the suite measures 1,716 **with** these and 1,698 without. Not yet deployed.

### 2. Progress Photo Post — the capture becomes a card the athlete lays out (2026-08-10, CODE — no migration)

Built to `design_reference/Forge Modal Library Design/design_handoff_progress_photo_post` — a 24-section
prompt, a README of decisions, 13 screenshots and the `.dc` itself.

**The problem it was handed.** A progress capture shared as one long vertical card. It reads badly in an
Instagram or Facebook feed, and the athlete had no say in how it was laid out.

**The screen.** Output **format** — 1:1 (1080×1080) or 4:5 (1080×1350), picked with chips whose glyphs are
the literal proportion of the output. **Style** — *Grid* (up to four photos on one card) or *Hero* (one
photo per slide, swiped like an Instagram carousel, up to six). **Photos** — all six poses of the entry,
tap to include, order preserved and it is the card's order. **From entry** — switch which capture you are
posting from. **On the card** — Date · Stats · Chapter · Name · Pose labels, the last defaulting off.
**Send** — Instagram · Facebook · Save · More, with the primary CTA becoming *Post to {squad}* when the
squad composer opened it.

**The column count is derived, never hardcoded 2×2.** Three photos are a 3-up row, two are side by side,
one fills the card. The cells go narrow at 3-up in a 4:5 frame and that is correct: a standing figure is
vertical and survives a centre crop. Four is the only arrangement that is a 2×2, and it is a consequence
rather than a template.

**The preview IS the post IS the export.** One renderer (`ProgressPostCard`) draws the card in the
composer, in the squad feed and on the post detail — there is no separate in-app layout, so nothing can
look one way while composing and another once posted. The card is authored at 300pt and scales by the
width it is given, which is why it survives being dropped into a feed row instead of becoming a smaller
card with the same 9px type. The exporter redraws the same geometry at **3.6×** onto a canvas
(`domain/share/progress-card.ts` is the shared half, and the half that can be tested).

**Three edges that are product decisions, not view code**, and all three live in the domain module with
tests that were mutation-tested red: the card can **never be empty** (deselecting the last photo is a
no-op), going **over the cap refuses the tap with a toast** rather than silently dropping the oldest — a
silent drop is indistinguishable from the tap not registering — and **Date-only still looks composed**,
because the footer's height is measured from the toggles and gives its space back to the photos when
they are all off.

**The carousel's dots indicate; they do not control.** The active slide is derived from scroll position
on every scroll event. Making the dots a control would let the two disagree the moment a swipe lands
between them. Slides are sized in points rather than `100%`, because a horizontal ScrollView's content
box is unbounded on the main axis and a percentage there has nothing to resolve against.

**Check-in is retired, and nothing broke.** `progress` replaces `checkin` as the first member post type;
the composer's check-in form is **gone**, because a branch nothing can reach is not a safety net, it is a
second description of the product that will drift. What is not gone is everything that READS one:
`LEGACY_SQUAD_POST_TYPES` keeps the definition resolvable, `leadFor` keeps its sentence and the feed keeps
its glyph, so every historic check-in renders exactly as it did. **Retiring a type changes what the
composer offers, never what the feed can read.** Found on the way past: the feed printed *"Checked in —
trained today."* directly under a lead reading *"checked in — trained today."* — a body this codebase
wrote is not an excerpt of anything, and `detailFor` now suppresses it (the author's own words always
survive).

**No migration.** `progress` has been an allowed `squad_posts.type` since 0074, restored with `formcheck`
and `transformation` by 0076. The card payload rides in the **untyped `layout` jsonb** (0045) that both
`squad_feed` and `squad_post_one` already return, discriminated from the transformation layout by a
`kind` field — a row written before this existed has no `kind`, which reads correctly as "a comparison".
It is **snapshotted**, like the recap summary beside it: the entry can be edited or deleted afterwards
and a card squadmates have already commented on must not rearrange itself.

**Instagram and Facebook render first and open second.** Neither has a share intent this stack can call —
Instagram's needs a native SDK and a registered Facebook app id. So the tiles compose the real image at
the chosen format, hand it over, and then open the app so it is one paste away. **If the render fails the
app is NOT opened** and the reason is shown: sending someone to Instagram with nothing on their camera
roll is the same class of lie as the "Message ready" toast that was deleted from Share Configuration. On
a device the render is the honest native stub — no `expo-media-library`, no canvas — so Save · Instagram ·
Facebook all say they need the browser today, matching `share-image.ts`. **More** works everywhere.

**⚠ One thing handed back to the PO.** #2 below shipped the entry-share format picker (*All poses · Full
width · Single photo*) inside Share Configuration **yesterday**. The handoff (§19) routes a Transformation
entry's Share to this screen instead, and §2 says not to touch Share Configuration — so that branch is
intact, still reached by **Compare**, but its entry path now has no caller. The handoff calls the merge of
the two screens a later pass. Flagged rather than decided.

`tsc` clean · lint at baseline · **1,716 tests**, 23 new. Seven mutants introduced and all seven caught:
allowing an empty card, dropping the oldest photo instead of refusing, hardcoding the 2×2, reserving
footer space that is not needed, exporting at 3.5× instead of 3.6×, an uncapped default selection, and
dropping the carousel's index clamp.

### 2. "Weight" is a quantity, not a direction (2026-08-10, CODE — no migration)

The PO set weight as a goal and the app never asked which way. **Some athletes are adding 15 lb.**

**Direction was INFERRED, and the inference has no answer in the case that matters.** `saveGoal` decided
`metric_dir` by comparing the target to the latest weigh-in — so before there IS a weigh-in it compared
against nothing, fell to the `not null default 'up'` column, and **recorded a cut as a gain**. Worse,
`syncAutoGoals` re-inferred on the first real reading: a "gain to 180" goal whose first weigh-in came in
at 190 was silently **rewritten into a cut**, overturning an answer the athlete was never asked for in
the first place. And a goal that disagreed with itself — *Lose*, goal 200, from a 185 lb athlete — was
not an error; it was quietly saved as the opposite of what was typed.

**It is a question now, it is required, and nothing overwrites it.** *Lose · Gain* for weight
(*Shrink · Grow* for a tape measure), unanswered by default, with the Save button held until it is
answered. `syncAutoGoals` still back-fills the baseline on the first reading and **no longer touches the
direction** — a goal that disagrees with its own weigh-in is now something to show, not to correct behind
the athlete's back.

**And the number can be said either way.** *A goal weight* (200) or *an amount to change* (15), because
"add 15 lb" is how the goal is actually held in the athlete's head. The change is **resolved against the
baseline at save time and stored as the reading it means** — kept as a delta it would re-derive from a
moving weigh-in and chase the athlete up the scale. The editor states the resolved journey before it
saves: **`165 lb → 180 lb · gain 15 lb`**.

**A body goal needs somewhere to start**, so when there is no weigh-in the editor takes one — a single
number, logged as a real `body_entries` weigh-in, because that is exactly what it is and the goal reads
nothing else. If that write fails the goal is not saved either, rather than anchored to a reading that
does not exist. (A tape measurement rides on an entry that also requires a weight, so those are still
sent to Progress Hub — the goal saves and starts counting from the first reading that arrives.)

**Found while wiring, unreported:** the editor passed `metricKey` for `exercise_max` and
`distance_total` **only**, so every *"shrink your waist to 32""* goal ever saved carried
`metric_key = null` — and 0039's `body_measure` branch is a `case` on that key, so it returned null → 0
and **the goal tracked nothing**. One word in a ternary, invisible from the screen.

Also: `latestBodyReading` now lives beside the data it reads and mirrors 0039's rule (the latest entry
**with a value in that column**, not the latest entry), so the "starting from 185 lb" the editor shows
and the baseline the server tracks cannot drift apart.

**No migration** — `metric_dir` and `metric_start_value` have existed since 0039; what was missing was
anyone asking.

`tsc` clean · lint at baseline · **1675 tests**, 8 new, and the two that carry the fix were **mutation-tested
red**: ignoring the direction fails 3, and letting a self-contradicting goal through fails 1. Deployed and
verified on the bundle actually served.

### 2. A progress post is the capture, not one frame of it (2026-08-10, CODE — no migration)

The PO shared a progress update from the Transformation tab and got back **one photo**. The capture had
more; the share had never offered a choice.

**What it was doing.** `share-config.tsx` split into two worlds. A COMPARE share had a Layout picker
(slider · side-by-side · stacked · grid) and a pose selector. An ENTRY share had neither: `firstPhoto()`
took the pose you happened to be looking at when you tapped Share — or, failing that, whichever key
`Object.values()` returned first — posted that one, and said nothing about the other five. **It was not
a limitation the athlete could see, which is the part that matters**: no picker, no count, no "1 of 6".
The archive's own unit is the CAPTURE — six guided poses, deliberately shot together — and the share
flow was the one place that treated it as a pile of loose photos.

**Now it picks a format, and the default is every pose.** *All poses* (2-up gallery) · *Full width* ·
*Single photo*, defaulting to the gallery whenever there is more than one pose to show. The same chip row
serves both jobs — a chooser under Single photo (seeded from the pose you were viewing, so that path is
unchanged for anyone who wanted it), include/exclude toggles under the others, never able to exclude the
last one.

**The layout model gained a second shape rather than a second meaning.** `TransformationLayoutData` now
carries `shots` — a capture's poses — beside `pairs`, and `EntryTemplate` (`single` · `gallery` ·
`column`) is deliberately **disjoint** from `ShareTemplate`, so one stored `template` value never means
two things and no reader has to infer "capture" from an empty `pairs` array. One renderer draws both
families; the preview on the share sheet IS the post, in the same component.

**Three surfaces had to stop showing the first photo of a set**, or the fix would have been invisible
where it was reported:

* **The share card image** (`card-layout.ts` → `poseBlock`) — geometry for a flat, unpaired photo list,
  where **every** pose is labelled, because unlike a comparison grid there is no first row that speaks
  for the rest. `PlacedPhoto.poseLabel` (a presence marker the drawer resolved via `index / 2`) became
  `labelIndex`, which says what it means.
* **The Friends feed** — a new `gallery` shape. `shapeOf` returned `photo` for anything with media and
  the card drew `media[0]`, so a six-pose post rendered as one.
* **The Squad feed card** — several photos become a thumbnail row with the remainder counted (`+3`).
  A card showing only the first reads as a post that HAS one photo.

`tsc` clean · lint at baseline · **1651 tests**, 8 of them new around `poseBlock` (every pose placed, in
the card, non-overlapping, and `single` proven byte-identical to the band the card already drew).

**Deliberately unchanged:** per-pose alignment still lives only in the archive's Compare screen — a
gallery posts the photos as shot, and nudging six frames into register is a different feature, not a
smaller one.

### 2. Last, Best, and a coach who tells you what to put on the bar (2026-08-10, CODE — no migration)

**W9-Amendment-005 Part A.** The PO asked whether Last / Best / the coach's suggestion / the weight
prefill were actually connected on the Active Workout. None of the four were, and the way each one failed
is the story:

* **Last and Best were hard-coded em-dashes.** Best in particular was *fetched on mount, held in state,
  and read three lines away* to decide the PR moment — while the column beside it claimed there was
  nothing to show. `fetchPriorRecords` also discarded `load_reps` and `achieved_on`, so it could not have
  drawn the design's "215 × 5" even if someone had tried.
* **The coach's suggestion was built, tested, and wired to the wrong screen.**
  `domain/coach/progression.ts` — add weight / add reps / hold / back off, with the sentence and the
  evidence — had exactly one caller, the Coach wizard's *preview*, where the message was rendered once and
  then dropped, because the draft it saved carried no field for it. The Active Workout had zero references
  to it. The design's Goal sub-line is literally `'+5 lb from last week'`; nothing rendered it.
* **The weight box always opened empty.** Spec §6.3 already located the fix correctly — the *sheet input*
  pre-populates, the *row* stays null, because a weight on an untouched set records a lift nobody made and
  can announce a PR for it. Only the in-session rule was implemented.
* **Three reads, three different answers to "which lift is this."** The notes read matched by catalogue
  key, the Coach's history read and PR detection matched by name — inside one file, `continueWorkout`
  matched key-first while the PR path five hundred lines away did not. Now one read
  (`data/lift-history-live.ts`), one identity rule, one place to change it.

Found while building, and NOT papered over: **logged weights are not unit-normalised** — `save-core`
stamps `weight_unit: 'lb'` on whatever the athlete typed, with no conversion, so a metric athlete's stored
figure is kilos wearing a pounds label. Everything renders as stored rather than converting, because
converting on read would halve their own logged lift in front of them to fix a bug on the write path.
Logged as an open item, needs a migration.

Also closed a live coaching defect the wiring exposed: `weight: 0` is a real logged answer in this app
(bodyweight), and the engine read it as a load — three sets of twelve push-ups produced *"go to 2.5 lb"*.
Bodyweight lifts now progress in reps, full stop.

**Decisions (PO, same day):** coach's number outranks last session's in the prefill · the coach is the
floating bubble bottom-right, ⋮ untouched · spec §6.2's ban on mid-workout prior-performance comparison
amended — it was written against *scoring*, and a coach telling you what to do next is the opposite ·
Part A ships alone.

**PART B, same day — Holt on the bar.** A bubble bottom-right and a sheet of *situations* rather than
operations: felt heavy · was easy · can't do this one · short on time · want more · move past. ⋮ is
untouched and nothing is reachable only from Holt — an athlete who already knows they want to swap has the
menu; this is for the one who knows something is wrong and not what to do about it.

**Mounted inside `workout.tsx`, not by adding `/workout` to `CoachBubble`'s allow-list**, and that is the
load-bearing detail: `CoachBubble` renders *outside* the navigator, so it cannot see this screen's rest
overlay, seal, PR prompt, ⋮ or set-entry sheet — a bubble mounted a level up would float over the number
pad mid-set, which is the exact "it blocks things on screens" complaint that shrank the coach's reach in
the first place.

"That felt heavy" moves the bar by what a coach would add to *that* movement (2.5 on a lateral raise, 10 on
a deadlift), on the **undone sets only** — a finished set is a record of something that happened — and it
writes `weight`, never `targetWeight`, so a percentage program's prescription survives the athlete
deviating from it. With nothing to move it says so rather than confirming work it did not do.

`tsc` clean, lint at baseline, **1651 tests pass**. Live and verified on the bundle actually served.
**Deferred on purpose:** "I've got 20 minutes" (needs a rule for which movement a session cannot lose) and
form cues (the `exercise-coaching` committed store is empty — a door onto nothing reads as broken).

### 2. Minutes, a coaching cue, the pool's own scale — and an importer that can read a training sentence (2026-08-09, CODE — no migration)

**PO PASS 2 (same day, after the first device test).** Five things, all from actually using it:

* **A race in the strength column is a run.** "Utah Valley Marathon 26.2 miles" was filed as a lift at
  3 × 10. `strengthOnly` exists so "1-arm DB **row**" stays a lift — but an explicit TARGET is the
  discriminator: a phrase naming an activity AND stating a distance or a clock is a bout. Every real lift
  in the sheet carries sets and reps rather than miles, so none are caught.
* **A cardio target is TYPED, not stepped.** Tapping the number opens a number pad. Stepping was the only
  way in, and a 3200 yd swim is twenty-two taps from the seed while the five-minute grain cannot state a
  12-minute brick at all. The steppers stay for the nudge, which is what they are good at.
* **The logged clock says what it is.** "45:00" is forty-five minutes and "1:05:20" is an hour and five,
  and nothing on the card said which — so an athlete typing a number had to guess how it would be read.
  The field is hinted `min:sec` / `h:mm:ss`, the value is spelled underneath ("1h 45m"), and a prescribed
  clock gets its own TARGET TIME cell.
* **The keyboard no longer covers the paste box.** `BottomSheet` is `KeyboardAvoidingView` on iOS — a
  sheet is pinned to the bottom of the screen, which is exactly where the keyboard opens. Fixes every
  sheet with a field in it, not just the importer.
* **⚠ And the sheet body would not scroll on a touch screen at all** — the backdrop `Pressable` WRAPPED
  the sheet, so RN's responder system claimed the drag as a press before it reached the ScrollView. Fine
  with a mouse, fatal on a phone, and it made a 191-row import preview unreviewable. Siblings now.

**PO PASS 3 — the same control, in all three places you can add a run.** Pass 2 put the clock in the
Program Builder only. The **Free Workout Builder** (W-25) and the **live cardio card's "Set a target"**
both still offered distance and pace and no time — so "go ride for forty minutes", the commonest
intention there is, was the one thing an athlete could not say in two of the three places they might say
it. Both now carry it, and the live card's `prescribed` test was widened to include `targetSec`: an
imported "75 min ride" prescribes no distance, so the card had decided nothing was prescribed and offered
a "Set a target" link over the top of the plan's own target.

⚠ **Published as an OTA and it is deliverable** — fingerprint compared against build 3 first
(`791bacda…` both sides), then the manifest endpoint queried as an iOS client and it returned the new
update id. `eas deploy` is WEB ONLY; the first three passes never reached the device at all.

Three gaps found by holding the app up against a real 15-week 70.3 plan a PO was handed. All three were
the same shape: **a field the model already had, with no way to put anything in it.**

**⭐ A cardio bout can be prescribed in MINUTES.** `targetSec` has been on `ProgramExercise` since cardio
blocks existed, and Coach Holt writes it on nearly every session he generates — "Ride · 75 min steady".
The Program Builder had no control for it, so an athlete authoring their own plan could prescribe a ride
only as a DISTANCE. Every endurance plan in the world is written in minutes; the builder could not state
the ordinary case while the engine beside it wrote that case all day. Five-minute steps from Open, capped
at eight hours — which reaches 45min, 1h45, 2.5h and the 4h race rehearsal exactly.

⚠ **The cardio card had to change shape to hold it.** Three meters on one row leaves each about 110 px
and the value between the steppers is 58 px of that, so cardio now stacks: distance and time on the first
row, the rate on the second. **Which meters appear is read from the model rather than assumed** — and
doing that closed a live contradiction: the card showed a **per-mile pace stepper for swims, rows and
ellipticals**, all three of which `RATE_KIND` says carry no pace and `EPS-D12` says explicitly must not.
A swimmer could author a pace-per-mile for a set measured in yards.

**⭐ The pool is measured in yards, not half-miles.** The distance stepper moved in 0.5 mi steps, so the
only swims authorable were 880, 1760 and 2640 yd. A real swim set is "1200 yd", "2600 yd", "3200 yd" —
none reachable, and no swimmer converts in their head. Distance now displays and STEPS in the unit the
activity is written in (yards, or metres for a metric pool — a 25 m lane is not 27.3 yd), stepping in
hundreds. **Storage never moved: canonical miles throughout**, exactly as weight stays pounds.

Two things that would have quietly corrupted it, both caught before shipping: `parseDistance` **rejects
anything over 500**, which is right for miles and would have silently discarded a typed `1200` and left
the old value standing; and the save rounded with `+mi.toFixed(2)` — two decimals of a mile is **35
yards**, so a 1200 yd swim would have been stored as 0.68 mi and read back as 1197. Both bounds now
belong to the unit.

**⭐ An exercise can carry the author's coaching cue** — "4 seconds down, then push up", "calf check,
stop if pain climbs", "hold Z2". Written in the Program Builder or the Workout Builder; shown on the
exercise card in the active workout and restated in its ⋯ menu.

⚠ **`ExercisePrescription` carried a comment saying this field was deliberately absent, and that comment
was RIGHT.** It said: the PAS asks for coaching notes, `ProgramExercise` has nowhere to put one, so a
`notes` here would be dropped on the way across and rendered by nothing — the write-only-field failure
this repo has shipped more than once. All three clauses were answered rather than overruled, and the
comment now records why. **The rule was never "no notes"; it was "nothing write-only".**

It is kept strictly distinct from the athlete's own note, which already existed: that one is a log entry
("shoulder felt off"), written during a session and read back the next time. This one is the
prescription. Merging them would let a log entry overwrite a coaching cue. The cue is deliberately **not**
written to `workout_exercises` — it belongs to the PLAN, which already stores it, and copying it onto
every row would duplicate one sentence across a season of history. No migration: `programs.structure` and
`workout_templates.exercises` are both jsonb.

**Found while tracing the crossings, and fixed:** `templateToSessionExercises` **dropped
`targetDurationSec`** — `cardioExercise` had no key to put it in — so "Row for 20 minutes", saved as a
template and started again, arrived as an open row with no target. The program-day crossing carried it
the whole time, so the two consumers of one type disagreed about what it meant.

**Reported, not silently widened:** `ExercisePrescription` has no `targetPaceSec`/`targetSpdMph`, so a
catalog program can prescribe a distance and a duration but not "3 mi at 8:15" — a real gap, and a
separate decision. `templateToSessionExercises` also drops `per`, so a template of split squats reaches
the logger showing half the prescription. Neither was in this pass's scope.

The tour copy was corrected in the same pass — it told athletes a cardio block "is measured in distance
and pace", which describes a card that no longer exists.

**⭐ AND THE SPREADSHEET GOES IN.** With the three fields above built, the remaining cost of that 70.3
plan was labour: ninety sessions, by hand, because the importer could not read the sheet. It now can.

The old reader assumes **one row per EXERCISE** with Sets and Reps in columns — how a lifting program is
kept. An endurance plan is the other way round: **one row per DAY**, the session written as a sentence,
and the numbers that matter are minutes and yards. Pasted in, it fell through to the freeform reader and
produced ninety "exercises" named things like `75min bike Z2 w/ 3x8min Z3` at a fabricated 3 × 10.

`import-session-text.ts` reads the sentence. `75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength`
becomes a 75-minute ride and a strength block; `SWIM 1200yd: …` becomes a 1200 yd swim; `Full Rest Day`
becomes **nothing**, which is the correct reading and is also what keeps a Mon–Sun plan inside the
six-day ceiling. Week banners split the weeks though there is no Week column to read.

⚠ **THE PARSER IS A HEURISTIC AND THE DESIGN ADMITS IT.** Three rules keep that honest:

* **The source sentence is kept on every item, whole**, as its coaching note — which is what the cue
  above was built for. Structure is laid ON TOP of text that is never discarded, so an interval, a zone
  or a "calf check" that no field can hold still reaches the athlete in the coach's words.
* **A number is claimed only when it is unambiguous.** `5x(3min jog / 2min walk)` is an interval set and
  **not** a three-minute run, so no duration is claimed at all — a multiplier standing before a figure
  disqualifies it. `75min bike w/ 3x8min Z3` still claims the 75, because it comes first and is the ride.
* **The preview shows the sentence under the reading**, so a confident wrong answer cannot look like a
  right one.

Two classification traps, both found by running the real sheet: `1-arm DB **row**` was read as a rowing
machine, and `**Bike**-based strength today` as a ride — so a bulleted cell and a column headed
Strength/Mobility are never keyword-classified at all. And a cardio block's name is **derived**, not
taken from the sheet, because `build-session` renames every cardio block on its way into the logger —
prose here would have the builder and the session disagreeing about one block.

Also fixed: `findHeaderRow` rejects any header without an Exercise column, so the session reader could
never have run behind it; it needed its own search. A nearly-right exercise table still gets the "name
your Exercise column" error rather than being silently read a completely different way.

**Still not expressible, by decision:** intervals inside one continuous effort. A ride with three hard
blocks in it is ONE ride; modelling it as five cards would ask the athlete to log five things they did as
one. The note carries it. (Of the 90 sessions in that plan, ~3 are the genuinely-separate run/walk shape.)
Also still open: calendar dates and weekly hour totals have no field.

**⭐ AND THEN THE REAL PASTE ARRIVED, AND IT DID NOT WORK.** The synthetic sheet imported perfectly; the
same plan copied out of Google Sheets on an iPhone still produced ninety junk rows. A real clipboard is
deformed in three ways at once, and the fixture was not:

* **A cell containing a newline breaks its row across several physical lines.** The strength cell nearly
  always contains one, so one row arrives as three or four — a day, a lift called "UPPER: …", and a lift
  called "1.8". A row STARTS at a date or a weekday; everything else is a continuation and is rejoined.
* **The checkbox column does not come across** — boxes are a control, not a value — so every data row
  sits one cell LEFT of the header naming it, and `Workout` read at the header's index returned the Day
  cell for the whole sheet. The WEEKDAY is now the anchor: wherever "Monday" really sits measures the
  shift, once, and the header keeps deciding what each column MEANS.
* Some rows carry a **seventh, unheaded column** of loose notes ("Foot strain, recovering from marathon"),
  which is not training and is not imported.

The `speaks` check also had to scan every cell rather than the header's own columns — for exactly the
misalignment above, it found nothing but empties and declined the sheet.

⚠ **AND ONE SELF-INFLICTED BUG WORTH RECORDING.** The date-cell regex was written through a shell
heredoc, which ate the escape: `` reached the file as a literal **backspace byte (0x08)**, so the
pattern demanded a control character after every date and matched nothing. It is invisible in a terminal,
`tsc` and lint both pass it, and it only broke the sheets *with* a checkbox column — the real-paste tests
went green while the synthetic ones failed, which is what exposed it. A tree-wide scan for control
characters is now part of the check. Same family as `feedback_edits_that_silently_dont_apply`.

**The fixture is now a real clipboard** (`__tests__/fixtures/tri-sheet-ios-paste.txt`), not a tidied one.
Both are kept: the tidy sheet and the deformed one fail in different places, and only having both caught
this.

tsc 0 · **1,593 tests** (+74: the pool scale, the duration stepper, the unit-bounded parse, the cue's two
crossings, and 27 on the session reader — **every fixture quoted verbatim from the real plan**, because
the failure mode here is not a crash but a plausible, confident, wrong reading) · lint at baseline
(1 error, 13 warnings, all pre-existing) · **deployed, live bundle verified byte-identical**.
⚠ **Not yet verified on device** — the PO has not tested it.

### 2. Coach Holt as a conversation, the endurance rulebook locked, and the migrations verified (2026-08-09, CODE + DOCS + migrations 0123/0124 — ✅ APPLIED)

The largest single day of work on the coach. Five distinct pieces, and the honest through-line is that
**most of the defects were found by reading output or using the app, not by running tests.**

**⭐ The chat surface — Coach Holt as a conversation.** The bubble grows into a sheet over whatever screen
you were on; Holt asks one locked question at a time and the engine hands back a real object. Built to
`design_handoff_coach_holt_chat/PROMPT.md`: the sheet 64px from the top so a sliver of the app stays
visible, the mark's three states (it *warms* while thinking, a ring *sweeps* while building), the
bronze-tinted athlete bubble, chips read from the wizard's own question set, four composer states, the
building card with named steps and a progress rail, and every card — program, day, edit, refusal,
explainer, the medical stop, and the one red failure state.

⚠ **No model is involved, and that is the design's own instruction** — *"the locked wizard questions, one
per turn."* Every question comes from `chat-core`, every program from `assemble()`. The paid tier
replaces exactly one function, `interpret()`: text in, `Partial<CoachConstraints>` out. A test asserts it
can return nothing else, **which is what stops a model ever authoring training** — it fills the same
fields a tap fills.

**Three things I got wrong on that surface, recorded because they are the reusable lessons:** I built
from the HTML prototype when the handoff's README says in as many words not to; I skipped the
design-system files twice after being handed their paths twice, which left every surface FLAT when
`foundation.css` says the system never does that; and Holt shipped with the letter **"C"** for a face
when `coach-holt-mark.png` — a struck bronze medallion — was in the repo the whole time.

**⭐ The endurance rulebook — 🔒 LOCKED.** Research → thirteen PO decisions → code, in that order,
because the numbers that decide a running plan are exactly where the sources disagree. All five goals run
through one machine differing only by rows in `RACE_SPEC`. **Four defects were found by reading the
generated plans**, including a seventeen-week marathon block whose longest run was 7.3 miles — which
passed every structural check there was. Both build findings are confirmed: the 10%/week cap governs NEW
territory (an interpretation of a locked PAS rule, recorded as one, PAS unamended), and the marathon
entry raised 10 → 15 mi/week.

**Workout notes and per-side volume.** Two columns empty since `0001_spine.sql`; `p_notes` accepted since
0010 and passed as `null` by every caller for 114 migrations. Now: a note on a lift, a note on a session,
both in history, and **the last thing you said about a lift shown as you set up for it again**. Volume
counts both arms (480 lb, not 240) while reps stay as logged, because doubling reps would corrupt every
e1RM and PR.

**A PO batch.** The notification tap was never about notifications — `PushProvider` navigated the moment
a session existed, while `RootNavigator` had declared no screens yet. Forge programs now offer Duplicate
rather than Edit. A `ScreenBoundary` so a crashing screen prints its error instead of taking the error
with it. And a dead back button: the chat handed off with `router.replace`, which is correct for the
wizard (a route) and wrong for a sheet (an overlay) — it swapped out the tab underneath.

**⚠ A near-miss worth keeping.** `Docs/Endurance-Programming-Standard-v1.0.md` was truncated to **zero
bytes** by my own edit script: `open(path, 'w')` empties a file before writing, and the exception between
the two was a `print` failing to encode `⚠` to cp1252. A diagnostic killed the file it was diagnosing.
It survived only because it had been committed minutes earlier.

**Migrations 0123 + 0124 applied and verified** by reading the INSTALLED definitions — including that
`save_workout` still carries its `PROGRAM_GRADUATED` branch, which 0106 once silently deleted. ⚠ 0124's
own self-check was broken in the safe direction: its LIKE pattern lost the empty-string literal during
assembly and would have reported **false on a perfect apply**.

**Two PO decisions recorded:** the chat is **unlimited** (no model call, no marginal cost, nothing to
meter — `FREE_EXCHANGES = null` with a test that fails if a ceiling reappears), and the **24-program
catalogue target is no longer the blocker** now that Holt builds programs on demand.

`npx tsc --noEmit` clean · **1,512 tests green** · lint at baseline · web live and OTA published at build
3's runtime version. Commits `d047cec` → `f5ba06e`.

### 3. Workout notes — finishing two columns that have been empty since the first migration (2026-08-09, CODE + migration 0124 — ✅ APPLIED 2026-08-09)

The PO asked for a place to write notes during a workout. **Both columns already existed and neither had
ever been written.** `workout_exercises.notes` is in `0001_spine.sql` line 94; `workouts.notes` has taken
a value through `save_workout`'s `p_notes` since 0010, and every client path in this app has passed that
argument as a literal `null`. So this is a field being **finished**, not added — one `create or replace`,
no new columns, and the session note needed no migration at all.

That is exactly the write-only-field failure the `ProgramExercise` schema comment cites as its standing
warning, sitting in the schema for 114 migrations.

**What was built**

| | |
|---|---|
| **A note on the lift** | From the ⋯ menu in the active workout — "shoulder felt off", "belt on from set 3". Scoped to the exercise the menu was opened from, so it cannot drift onto another movement if the index moves while the sheet is up |
| **A note on the session** | On The Record step of the finish screen — "felt flat, slept badly" |
| **Both in history** | Activity Detail. The session note sits **above** the numbers, because "felt flat" is the context the sets are read in; underneath them it reads as a footnote to data rather than the reason the data looks like it does |
| **⭐ Carried forward** | The last thing you said about a lift appears **as you set up for it again**. Same data, different timing — and the timing is the entire product: a note you can only find by digging through history is a diary, the same note in front of you at the bar is coaching |

**Blank clears, and that differs from the workout name one row above it — deliberately.** A name has no
empty state this screen can render, so clearing it there would leave a hole in the header. A note has
one: no note. Deleting what you wrote has to be possible, or the first typo is permanent.

**⚠ `notes` is not `reflection`, and the two are not interchangeable.** `workouts.reflection` (0011) is
the keepsake — one line, permanent, shown back months later, and already wired. `workouts.notes` (0001)
is the training log. Writing "slept badly" into `reflection` would put it in the place the app treats as
a legacy artifact. They are a page apart in the flow for the same reason: two boxes asking the same
question on one screen would be worse than either; two boxes asking different ones is the honest split.

**A note is withheld from a shared session**, on both the session and the lift. Sharing a workout is not
consenting to publish your private remarks about it — the same reasoning that already withholds the
chapter from a shared recap.

**Migration 0124 is 0119's `save_workout` body copied whole with two lines changed, and it was not
retyped.** This schema has lost function branches four separate times by rebuilding a body from a partial
reading — 0088 and 0092 each dropped the friend branches, 0103 zeroed two totals, 0106 silently deleted
the entire graduation block. The file was generated by slicing 0119 and diffing the result; a test
asserts every branch of 0119 still appears in 0124, and that it `create or replace`s rather than DROPs,
because a drop would silently restore PUBLIC EXECUTE with nothing following to revoke it.

**Verification.** tsc clean · **1,479 tests green** (+8 in `notes.test.mjs`) · lint at baseline. The two
guards that could pass for the wrong reason were **mutation-tested**: removing the client-side trim, and
removing `nullif` from the migration — each broke the tests that claim to cover it. One lint fix worth
recording: hydrating the note box from stored data in an effect is a sync `setState` in an effect body,
which react-compiler rejects outright; it is now **derived** (`draft ?? stored ?? ''`) with no effect at
all, which is both shorter and correct.

**✅ Applied 2026-08-09**, with 0123, as one paste. ⚠ The bundle’s own self-check for this was BROKEN — the empty-string literal in its LIKE pattern was eaten during assembly, so it would have reported false on a perfect apply. The migration was right; the verification of it was wrong. Re-verified with `supabase/apply/verify-0123-0124.sql`, which reads the installed body.

### 4. The endurance rulebook — Holt stops refusing 5k through Ironman, and reading the plans is what found the bugs (2026-08-09, CODE + DOCS — no migration)

Holt refused every running goal, in terms, because the knowledge was not in the repo:
`Running-Family-Research-v1.0.md` is DRAFT and its own Finding B says the running journey **ends at
intermediate aerobic base** — there is no race-preparation program anywhere in the locked catalog. That
refusal was correct for as long as it stood. It is now a build.

**Research first, then thirteen decisions, then code.** Endurance methodology is public and settled in
outline; the disagreement is entirely in the numbers, and a wrong number is *consistently* wrong for
every athlete who asks. So `Docs/Endurance-Programming-Standard-v1.0.md` puts each contested call to the
PO with a recommendation and the argument behind it — **EPS-D1 … EPS-D13, all thirteen approved
2026-08-09.** The headline calls: 80/20 easy-hard (90/10 for beginners) · long run 25–30% of the week
with a 3-hour and 20-mile cap · taper 2 weeks, 3 for the marathon, volume cut by half with **intensity
retained** · beginners at 3 days · run/walk for anyone who cannot yet run continuously · **real paces
only from a real recent race result, never invented**.

**The engine's promise survives.** All five goals run through one machine differing only by rows in
`RACE_SPEC`. What was added is a single per-*family* branch in `assemble()`, because a plan built
backwards from a race date and measured in weekly miles is a different product from a week of
slot-filled training days — not a variation on one.

**⚠ Two locked rules contradict each other and the reading is recorded, not buried.** PAS §11.4 caps
weekly growth at 10% week-over-week; PAS §7.1 mandates Block Periodization, which alternates down weeks
with the ramp. Read literally, a deload to 75% followed by a return to where you were is a +33% week and
therefore forbidden — so every deload would permanently cost a quarter of the ramp and a 16-week plan
with three of them would **end lower than it started**. The cap is applied to **new territory**: no week
exceeds 110% of the highest week already trained. The test names itself as the place that changes if the
PO reads it the other way. **Needs a nod before this doc goes LOCKED.**

**⭐ The part worth keeping: four defects were found by reading the output, not by running the tests.**

1. **A seventeen-week marathon plan whose longest run was 7.3 miles.** Every structural check passed —
   weeks present, caps never breached, validator happy. Deriving the long run as a *share* of weekly
   volume caps it at whatever the athlete already runs. The dependency is inverted now: the long run
   climbs toward what the race needs and weekly volume is pulled up behind it.
2. **Volume that never grew.** Deload weeks were resetting the ramp, so seventeen weeks sawtoothed
   between 20 and 24 miles and the last one was labelled the peak.
3. **Race week held a 40-minute tempo and a long run — in the same week as the marathon.** Taper
   arithmetic cuts volume and keeps intensity, and has no concept of the race being in it.
4. **A non-runner was handed a "Long Run"** on the last day of every week — a plan that stopped
   believing its own premise on day four.

And one found by reading the plans *after* they were correct: a 12 mi/week athlete passed the marathon
gate and got a block peaking at a 12.4-mile long run, because the spike cap rightly will not take a
4.8-mile long run to 20 in sixteen weeks. **The cap was right; the door was too wide** — the entry
threshold went 10 → 15 mi/week, and someone below it is offered the half, which is their real race.

**Two content gaps reported rather than papered over.** `ProgramExercise` has **no `notes` field** — the
PAS says running pace guidance "lives in `notes`", describing a field that was never built, and the
schema's own comment cites its absence as the standing warning against write-only values. Cues live in
the row's name instead. Separately, **the catalogue has no dynamic warm-up drills** — no leg swings, hip
circles or high knees, which is exactly what PAS §11.4 requires; it has the static stretches for the
cool-down but not one drill. Running days warm up with a progressive easy jog and the drills are named
in the label. Closing it properly means appending to `exercises.json`, which pulls coaching content,
media and relationships along behind it.

**The wizard asks the four questions it was missing** — race date (as weeks-to-race, which is the number
the plan is built from and the one an athlete can answer without opening a calendar), current weekly
mileage, whether they can run twenty minutes continuously (asked only of someone whose mileage has not
already answered it), and an optional recent result for paces.

**Verification.** `npx tsc --noEmit` clean · **1,471 tests green** (+24 in `endurance.test.mjs`) · lint
at baseline. The matrix test was scoped to the split-based goals and its "running is refused" test was
**inverted rather than deleted** — the refusal was a real product decision and what matters now is that
the no became a yes for the right reason. Plans were read across all five goals and a range of starting
bases; §6.2 and §6.5 of the standard were found that way and only that way.

**⏳ Open:** confirm the two items in §6.1 and §6.2 of the standard, then DRAFT → LOCKED.

### 5. Coach Holt — a program builder that assembles, and the shipped Edit button that could delete your history (2026-08-08, CODE + migration 0123 — ⏳ NOT YET APPLIED)

**Testers kept asking for a coach.** Not a template picker — a thing that asks what you want and builds
it. This is that, rule-based and free, with the AI layer deliberately left for the paid tier and the
seams cut so it can be added without rewriting anything.

**The architecture, in one line: the engine is small, the rulebook is the product.** One machine —
pick a skeleton → fill each slot from the catalogue → prescribe → validate — with **zero per-goal
branches**. Everything goal-specific is a table in `src/domain/coach/rulebook/`. A new goal is an
authoring job, not a code change, and the whole thing is pure functions, so **~1,800 combinations run
as a test in under six seconds**.

| Piece | What it is |
|---|---|
| `constraints.ts` | The one shape everything downstream reads. Goal · per-discipline experience · days · session length · environment · owned gear · limitations · split style |
| `candidates.ts` | Slot → ranked candidates. Preference rank first, then difficulty fit, then breadth. Walks a relaxation ladder before it gives up |
| `prescribe.ts` | Sets, reps, holds, and cardio distance/duration/pace. No rest field — `ProgramExercise` has none, and inventing one would have been a lie in the data |
| `assemble.ts` | The four steps, plus refusals and the full-body restructure |
| `validate-program.ts` | Three gates: catalogue · structure · policy (PAS-D11 bands, Builder clamps) |
| `day.ts` | Single-day workouts — split or body parts, arms split into biceps and triceps |
| `progression.ts` | Reads your last two sessions of a lift and says add weight / add reps / hold / back off. Working weight is the **mode**, not the max — one heroic single is not what you train at |
| `edit-ops.ts` | The safe-mutation layer. Swap a movement · change the prescription · change a cardio target · rebuild a day. Asserts the `totalSessions` invariant and refuses to touch anything already trained |

**The rulebook holds the decisions, not the code.** `volume.ts` is PAS-D11 verbatim. `limitations.ts`
derives its equipment removals from `EQUIP_UNLOCK` rather than listing ids by hand — the first version
listed them, and `no_barbell` silently did nothing, because removing three of the six ids that unlock a
barbell leaves `plates` and `rack` unlocking everything anyway. The matrix test caught it.

**`coherence.ts` is the one worth reading.** The PO's review found a *Sliding Hamstring Curl* prescribed
as biceps work and a static stretch prescribed for sets and reps. Both were the catalogue's own tagging
— 23 of the 721 visible exercises carry a movement pattern that is wrong for how they are actually used
(12 leg curls filed under Elbow Flexion, 5 rear-delt flies under Horizontal Push, 5 upright rows under
Horizontal Pull, 1 medicine-ball throw). `exercises.json` is **append/annotate-only** by
DATA-PROTECTION, so this is a **rule in the coach's own layer** — a plausibility check between the
pattern and the muscle — rather than a blocklist of 23 keys or an edit to the catalogue.

**⚠ The thing this pass found that was already shipping.** Auditing the safe-edit path turned up a live
defect in `program/[id].tsx`: the **Edit button was gated on `terminal`**, so it rendered on an *active*
program, which `Program-Fork-Edit-Wireframe-Spec-W5` Decision 1 says it must never do. Two consequences,
both silent:

1. **Opening Edit and saving could delete sessions.** The draft hydrator normalises through `makeDays`,
   which *truncates*. A ragged program — weeks of 6, 6, 5 days with `daysPerWeek: 5` — loses the sixth
   day of every week just by round-tripping through the Builder.
2. **Shrinking a live program could force an irrevocable graduation.** `fetchProgramCompletedCount`
   counted every row with no slot validation while `program_total_sessions` recomputes from the *new*
   structure. Shrink 8 weeks to 4 after 20 logged sessions and the next save fires
   `v_done (21) >= v_total (12)`: state `graduated`, a timeline event, and five never-revocable honors.
   Amendment-001: *a Graduated program cannot be reactivated.* There is no undo.

Fixed at three levels, because one was not enough: the **UI gate** (`state === 'future'`, per W-5), a
**slot-validated count** so an orphaned mark cannot graduate anyone, and **migration 0123** — a trigger
that rejects a structure change that would drop a week or a day out from under a logged session. Active
programs now route to Ask Holt instead, which was the better answer anyway.

**What Holt can change on a program you are already running**, and why each is safe: progress is
**positional** — `program_sessions` is keyed by `(program_id, week_index, day_index)` and `ProgramDay`
has no id — so any edit that shifts an index re-points a record at a workout you never did. Every
operation therefore keeps the count and the position identical, and scopes to *this week* by default by
materialising `weekPlans` exactly as the swap feature does. Changing a session you already trained is
**refused in terms**, which is History Cannot Be Rewritten doing its job rather than a limitation to
apologise for.

**The wizard is Holt, one question per card.** Persistent identity header, an acknowledgement beat
between answers, a reveal that opens with BUILT BY HOLT and a *Why I built it this way* written from the
constraints — then **Final touches**, which hands the draft to the Program Builder so nothing is ever
saved unreviewed. Endurance goals (5k → Ironman) **refuse in terms** rather than shipping a
plausible-looking marathon table written from memory; the rulebook for those is the next authoring wave.

**Limited Equipment** closes the middle ground the environment question could not express — a garage
with three things in it is neither a full gym nor a bare floor, and it is the commonest real answer.
Naming your gear in the wizard overrides the saved Home Gym for that build only, and `null` (never
asked) stays distinct from `[]` (asked, and the answer is nothing), the same distinction the Home Gym
profile itself keeps. Wiring the picker exposed one honest gap: `airbike` is its own gear id because it
unlocks different catalogue exercises, so someone whose only machine was a fan bike and who could not
run was being prescribed a **walk**. It is a bike.

**🔴 And one failure of mine, which shipped.** `CoachBubble` called `useSafeAreaInsets()` as a sibling of
the navigator, where **no `SafeAreaProvider` existed** — every screen gets one from react-navigation
*inside* the navigator, and nothing outside it had ever needed insets. It throws. The app would not
launch on device.

**Every check was green.** `tsc` clean, 1,420 tests passing, lint at baseline, the web build perfect —
because `react-native-safe-area-context` ships a DOM implementation that reads real metrics instead of
throwing, so it **did not reproduce on web at all**. The PO found it by opening the app. Both OTAs were
rolled back first, then fixed: a `SafeAreaProvider` at the root, an `OverlayBoundary` around anything
rendered beside the navigator so a decoration can never take the app down again, and
`root-overlays.test.mjs` — a **static assertion about the shape of the tree**, deliberately, because the
property that matters cannot be observed anywhere the test runner can reach.

**Also in this pass, both found while wiring and both silent:** the workout builder's save hardcoded
`kind: 'strength'` and nulled the targets, so a cardio block added to a one-off workout **saved as an
empty strength row**; and `template-day-core` dropped `targetDurationSec`, so a template's timed
finisher arrived as a distance-less, duration-less run. W-25 now has the cardio path the Program Builder
has had since August.

**Verification.** `npx tsc --noEmit` clean · **1,447 tests green** (+104: 38 matrix, 15 candidates, 17
edit-ops, 12 progression, 6 handoff, 4 root-overlays, plus additions to four existing files) · lint at
baseline (1 pre-existing error, 13 warnings). The guards that matter were **mutation-tested** — the
equipment gate, the airbike row, the cardio save and the `targetDurationSec` carry-through were each
broken deliberately and the tests watched to fail.

**⏳ Open: migration `0123_program_structure_guard.sql` has not been applied.** The UI gate and the
slot-validated count are live; the database guard is not until it is pasted into the Supabase SQL editor.

### 6. PO feedback batch 4 — ten items, and the QR code was never a QR code (2026-08-07, CODE + migrations 0121 & 0122 — ✅ APPLIED 2026-08-08)

The PO filed ten notes after a review pass. Investigation reclassified them before any code was written,
and two of the ten turned out not to be builds at all.

**Already built: the playlist on a post.** `0105`'s three columns → `src/domain/workout/playlist.ts` →
the post snapshot (`squad-feed-live.ts`) → rendered as a `PlaylistChip` on `/squad-post/[id]` and as an
attribution row on `/activity/[id]`, with `0117`'s `shared_workout_detail` carrying it to a viewer who
does not own the workout. Nothing to build. **Verify on device and close** — if it did not show, the
workout had no playlist attached, or the post predates 0117.

**A decision, not a build: the help chat bot.** *"Just an idea I'm toying with."* Logged as **Decision
Queue #21** with three shapes costed (nothing / static help centre / Claude-backed edge function) and a
recommendation, and no code written. An AI assistant is the only one of the ten that would open a new
privacy surface, and P-6 has never been asked about it.

#### The two live defects

**Check-ins were reading the whole video into the JS heap.** `uploadCheckinVideo` was `fetch(uri)` →
`.blob()` → one shot at `storage.upload`, and `uploadPostMedia` was the same four lines again. That is
tens of megabytes of base64-shaped memory on a phone that has other plans for it, and when it goes wrong
it does not throw — the app dies, or the promise never settles. There was also no progress, no timeout,
no retry, no cancel and no size check, so *"taking long to post"* and *"not even posting"* were
genuinely the same picture from the athlete's side. New `src/lib/storage-upload.ts` streams from disk
through `expo-file-system`'s upload task, with a **stall timeout rather than a deadline** (twenty seconds
without a progress tick, reset per tick — a wall-clock limit would kill a large file on a
slow-but-working connection, which is the exact upload this exists to rescue), three attempts for
transient failures only, a real Cancel, and a 50 MB pre-flight guard that names the actual size.

Two traps had to be coded around explicitly, and both are the kind that pass every test. **The web stub
RESOLVES** — `expo-file-system`'s browser implementation returns `{ status: 0 }` after a console warning,
so a `try/catch` fallback would never fire and every upload on `forgelegacy.expo.app` would report
success and store nothing. The platform branch is chosen up front, never in a catch. And
**`uploadAsync()` resolves on non-2xx** — a 413 or a 403 is a resolved promise, which is exactly the
"silently failing" the PO reported, waiting to happen again in new code. `classifyStatus` is the guard,
with a test asserting status 0 is never a success.

`expo-file-system` is deliberately **not** added to `package.json`: it ships as a dependency of `expo`
itself and is already in build 3, so importing it is not a native change — but *listing* it edits a file
`@expo/fingerprint` reads, and that is the whole lesson of 2026-08-06.

**The invite link pointed at a dead origin.** `joinLink` preferred `window.location.origin` over the
canonical alias. Every `eas deploy` publishes to a throwaway `…--<hash>.expo.app` as well as to
`forgelegacy.expo.app`; generate an invite while sitting on one of those and the link you hand someone
points at a deployment that stops existing — *"link doesn't produce anything."* Now always the alias,
`/join-squad` **auto-resolves** on arrival instead of demanding a Continue tap, and the share text also
carries `forgelegacy://join-squad?code=…`, which opens the app in the build people are running today.

#### The one that was worse than reported

**`buildQr` was not a QR encoder.** It seeded an LCG from the invite code, drew three finder squares,
and filled the remaining ~400 cells with coin flips — no format information, no timing pattern, no
alignment pattern, no error-correction codewords. Nothing a decoder looks at beyond the corners. It could
not have scanned, ever, and the sheet's caption *"Point a camera at the code"* had never been true. It
was also seeded with the bare **code** rather than the join **link**, so a working encoder dropped into
that slot would still have sent a scanner nowhere.

Replaced with a real one: **`src/lib/qr.ts`** — byte mode, error-correction level M, versions 1–10, pure
TypeScript, no dependency (adding `react-native-qrcode-svg` would have edited `package.json`; see above).
Rendered as run-length SVG rects at a whole number of pixels per module, because an anti-aliased module
edge is precisely the ambiguity a decoder's binarisation step has to resolve.

**21 tests, three of them independent of the implementation entirely:** the published ISO/IEC 18004
level-M format table, the algebraic property that defines a Reed-Solomon codeword (every syndrome zero),
and a hand-computed codeword stream for `"HI"`. Plus a decoder that recovers the mask from the format
field, unmasks, walks the zigzag, de-interleaves the blocks and parses the header — and gets the exact
URL back, at every version from 1 to 10, with no error correction needed. **That test suite caught a real
bug**: the format-area reservation was blanking one module of each timing pattern, which a scanner locks
onto to establish the module grid.

#### Three surfaces that were spec'd and never built

**Workout Together — joining at the host's position** (migration **0121**). PO: *"in the middle of a
workout you should be able to invite someone and have them join where you're at… or if someone sees you
working out and wants to join they can click 'join' on the active tab (right now it says view and it
doesn't really benefit anything)."* The `.dc` had always labelled that button **"Join workout"**; the RN
build shipped "View" because there was nothing to join.

Chosen shape: **a snapshot join, not a live shared session.** No realtime exists anywhere in this app and
building a transport for one banner would be a subsystem. `workout_invites` gains `kind`
(`INVITE` | `JOIN_REQUEST`) and `start_index` — not a new table, because a new one would duplicate five
decisions this one already makes (the friends-or-squad-mates insert predicate, the two-party read, the
recipient-decides update, the either-party delete, the reader), and its existing policies already say the
right thing about both directions. **No `DECLINED` status**: 0092 is explicit that declining deletes, so
nothing records that someone said no; the gap that leaves is closed by anchoring the notification branch
to the host's own presence, so an unanswered ask expires with the workout it is about rather than needing
a tombstone.

**The prerequisite was moving `exIdx` out of screen state.** It lived in `workout.tsx` as `useState`,
was not on `ActiveSession` and was not autosaved — so nothing outside the logger could know where a
session had reached, *including the logger's own resume*, which always dropped you back at exercise one
however far in you were. That fix is a user-visible win on its own. `taggedPartners` moved for the same
reason: a crash mid-session silently dropped every tag, and a host could not credit someone joining from
another screen.

⚠ The subtlety worth recording: **the join index is into the SNAPSHOT, not the session.**
`sessionToTemplateExercises` drops cardio blocks — a leg is a distance and a clock, not a list of sets —
so the two lists diverge the moment a session contains a run, and passing the session's own index would
land the guest on the wrong lift by exactly the number of runs above the host. Eight tests cover it.

**Naming your first chapter** — and renaming any chapter. `complete_onboarding` has taken
`p_chapter_name` as a parameter since 0008, so no migration was needed; the ask was simply never on the
screen. A new onboarding step explains what a chapter *is*, offers four suggestions and takes free text.
**The larger gap was that no chapter could be renamed, ever** — the only `insert into chapters` in the
repo is the onboarding RPC, and the only two writers touch `is_active`/`sealed_at`/`reflection`, so a
name chosen in an athlete's first minute was permanent. `renameChapter` + an Edit affordance on the
chapter hero close that.

⚠ The athlete types the **title only**; `Chapter N — ` stays machine-generated. A chapter name is parsed
in two places by two different rules — the Home hero splits on an em-dash, `detail-core.ts` on an em-dash
**or** a middle dot — with nothing in the database enforcing either, so a typed delimiter would be cut in
half by one parser and not the other. `sanitizeChapterTitle` strips them as a second line of defence,
because a paste is not a keystroke.

**Notifications for squad posts and check-ins** (migration **0122**). The `squad_feed` toggle had sat in
Settings since 0022 with no branch, no trigger and no route: switching it on did nothing, and had done
nothing for a hundred migrations.

⚠ **These are the first FAN-OUT branches**, and that is a real difference. Every branch before them
answers "a row about me" and is self-limiting; these join through `squad_members` over append-only
tables. Unwindowed they would fill all fifty inbox slots from one chatty squad, make the unread count a
number nobody reads, and make `push_enqueue_for` re-scan a squad's entire history **once per member,
inside the insert's own transaction**. `push_baseline_at` bounds what is *enqueued*, not what is
*scanned*. Both branches are therefore windowed at **14 days**, in the union — one predicate at the one
place the definition lives, hit by the viewer and the sender alike. Recorded honestly: a very chatty
squad can still dominate fourteen days of one member's inbox; a per-squad cap would bound that properly
and a `union all` cannot express one cleanly.

`squad_invites` stays inert and correctly so — **there is no squad-invite table**. Invites are code-only.
That is a feature, not a wiring job, and the header now says so.

#### The three UI fixes

**The Legacy "Progress" pill, third attempt.** It was a hard `width: 76` (the word wrapped, final S
alone on line two), then `minWidth` + `numberOfLines={1}` — but the pill's intrinsic width is ~81pt, so
the minimum protected nothing and the label ellipsised to "PROGRES…" instead. Both fixes missed the same
thing: the flex child of the row is the `TourAnchor` wrapper, not the pill, and the name column beside it
is `flex: 1`, so the squeeze arrives from outside anything either fix could reach. `flexShrink: 0` on the
anchor plus `adjustsFontSizeToFit` — the pair `LegacyArchiveBand` has used for "TRANSFORMATION" all along.

**The pinned-legacy video.** Three things were wrong at once: no `fullscreenOptions`, so `nativeControls`
drew a control bar without the expand button; `contentFit="cover"` at a fixed 220pt, centre-cropping a
portrait clip to a landscape strip; and nothing escalating on play. All three fixed, and playing now calls
`enterFullscreen()`. The missing preview frame turned out **not** to need `expo-video-thumbnails` after
all — `expo-video`'s own player has `generateThumbnailsAsync` in SDK 56 and returns a native image
reference `expo-image` takes directly. So the poster is real, extracted on device, with no new package
and no fingerprint change. (Native-only; the web player throws, and the paused `VideoView` fallback is
kept for it.)

**Typing a value instead of tapping ±170 times.** *"Mainly a factor when making big adjustments."* The
race time stepped in fixed 15-second jumps and the value was a `<Text>` — there was no `TextInput`
anywhere in `CardioBlockCard`. `Field` now takes an optional `parse`/`onCommit` pair and becomes
tap-to-type in place, fixing **six call sites** in one edit (TIME · PACE · DISTANCE · SPEED · INCLINE,
target and log). A bare number in a time field is read as **minutes**, deliberately: reading `45` as
45 seconds would be arithmetically defensible and would file a marathon as a warm-up. A rejected parse
leaves the previous value standing rather than clamping to a guess.

#### Queued for build 4 (native, cannot ship over the air)

- **Universal links** — `ios.associatedDomains` + `android.intentFilters` + a hosted
  `apple-app-site-association`, so a scanned https invite opens the *app* rather than the browser. Until
  then the QR still decodes and the web app still joins; the sheet's caption says so plainly.
- **Video compression for check-ins** — nothing in this stack transcodes, and the libraries that would
  are native. The OTA-safe levers are the existing 30-second cap, the iOS record quality, the new size
  guard, and streaming from disk. That last one is most of the win.

#### Gate

`npx tsc --noEmit` **0 errors** · `node --test` **1347 green** (was 1339; +21 QR, +14 chapter-name,
+15 upload-classification, +8 session snapshot, +4 typed-parse, minus consolidation) · `npx expo lint`
**at baseline** (1 pre-existing error, 13 warnings).

Two guards earned their keep during the pass: the route-declaration test caught `/workout-join` missing
from `_layout`, and `push.test.mjs` had to be **repointed from 0120 to 0122** — it was parsing 0120 and
only 0120, so the moment 0121 redefined `push_pref_key` the client/SQL parity assertion was comparing the
client to a function body the database no longer runs.

#### ✅ Applied 2026-08-08 — and a migration that could only be run once

`pending-0119-0122.sql` applied through the dashboard in one paste. Verified by schema query rather than
by assumption: `program_sessions`, `push_tokens` and `notification_events()` all present, the union body
carrying both `workout_join_request` and `squad_checkin`, and — the one that matters —
`has_function_privilege('public','public.notification_events_for(uuid)','execute')` returning **false**,
so 0120's revoke survived two `create or replace` rebuilds exactly as designed.

**⚠ THE LESSON, AND IT COST TWO FAILED RUNS.** 0120 created `notification_events_for` with a bare
`create function` and no matching drop, so the file raised **42723: function already exists with same
argument types** the second time it was run — and a migration that cannot be re-run cannot be RESUMED
either, which is the only recovery available in a project with no CLI and no service key, where the
dashboard is the whole deployment mechanism. Every other statement across all four migrations was
already guarded (`if not exists`, `drop policy if exists`, `drop trigger if exists`,
`cron.unschedule … where exists`, constraints behind a `pg_constraint` lookup); this was the single
exception, and the bundle header had asserted idempotence that was therefore not true.

`push.test.mjs` now asserts the property directly, for every migration in the set: a bare CREATE of
anything that can already exist must be preceded by a DROP or carry its own `IF NOT EXISTS`. It was
mutation-tested — removing the fix makes it fail with the 42723 message, so the guard is load-bearing
rather than decorative.

**Still outstanding: a new iOS build.** Push is a native change (`expo-notifications`), so 0120's sender
is live server-side and reaches nobody until a build is installed. Everything else in this batch is
deliverable over the air; run `eas fingerprint:compare` against build 3 before publishing.

---

### 7. Push notifications — the preferences finally have a sender, and four of them turned out to be inert (2026-08-07, CODE + migration 0120 — ⏳ NOT YET APPLIED, NEEDS A NEW iOS BUILD)

**Status: code complete, gates green, deployed to the web preview. Migration 0120 awaits paste; push itself awaits a new TestFlight build and cannot be tested on the web preview.**

`profiles.notif_prefs` had stored nine push preferences since 0022, and the P-5 screen had saved them on every toggle since. There was no `expo-notifications`, no token column in any migration, and no sender. **Nine controls recorded intent for a delivery mechanism that did not exist.**

**The architectural problem that had to be settled first.** `notification_events()` is a DERIVED read — a union over source tables that are already true. Nothing is ever inserted as an event, so there was no row and no insert moment to hang a send on. The fork (triggers / a stored events table / a scheduled diff) went to the PO, who chose **triggers over a parameterised union**: `notification_events_for(p_user)` now holds the real body and `notification_events()` is a one-line wrapper at `auth.uid()`. The eight branches are defined **exactly once**, and both the viewer and the sender read that one definition. The six triggers are deliberately stupid — each knows only WHO to re-scan, never WHAT an event is, which is the drift that cost this schema its friend branches (0088, 0092) and program graduation (0106). The rejected alternative, triggers computing their own recipients, would have copied every branch's `WHERE` clause into trigger logic and reopened exactly that failure mode.

**What stays derived.** Only the delivery ledger (`push_outbox`) is stored. A push is not a derivation — once delivered it cannot be withdrawn the way a derived row vanishes when its fact stops being true — so it needs a record that it happened. `/inbox` is untouched and the property 0109 and 0110 both defend (withdraw the request and the notification disappears, so it can never lie) survives intact.

**⚠ The brief this work started from was stale, and the stale part was the dangerous part.** It described `notification_events()` as having **seven** branches and listed them. **0110 (applied 2026-08-05) rebuilt it with eight** — adding `program_shared` and a `share_id` column — and its own comment says *"All EIGHT branches are below — count them before editing this again."* Rebuilding from the seven-branch list would have silently deleted `program_shared`: the **fourth** instance of this exact failure. 0120 was rebuilt from 0110's body, and `notification_events_for still has all eight branches` is now a test.

**⛔ Four toggles removed — ceremonies never push.** The shipped screen carried Goal Completed / Honor Earned / Chapter Sealed / Rank Up, defaulting ON, ported from `Forge Notifications.dc.html`. **`P-5-Notifications-Architecture.md` §1 (LOCKED) audited all four out before it locked** — M-1, M-2 and M-4 each list "fire as a push notification" under their own Non-Behaviors. They had no event source, no sender branch and no route: switching one on could never have produced a notification. PO decision: **the doc governs; the four are gone.** A test now asserts no ceremony can be offered as a push preference.

**The nine keys and the eight event kinds were nearly disjoint sets** — exactly one (`workout_invite`) had a preference to honour. Four new keys close it: `friend_requests` (ON, P-5 §3.2b), `challenge_updates` (OFF, P-5 §3.2a), `program_shares` (ON), `squad_activity` (OFF). Four keys remain with no emitter yet (`squad_feed`, `squad_reactions`, `squad_goals`, `squad_invites`) — locked by P-5 §3.1/§3.2 but produced by no branch of the union; the file says so rather than implying they send.

**`request_declined` is never pushed**, by design — 0073's rule is that a notification whose entire content is a small rejection is worse than none. It stays a real `/inbox` row, where the athlete went looking for it.

**No backlog blast.** Every pending friend request and shared program in the database is a live event in that union right now. `profiles.push_baseline_at` is stamped once, on first device registration, and only events newer than it are ever enqueued — otherwise registering a device would replay an account's whole history as one burst.

**Security finding, closed.** Parameterising the union removed the thing that made it safe: `notification_events()` could only ever answer for `auth.uid()`, but `notification_events_for(p_user)` is `SECURITY DEFINER` and answers for anyone named. Postgres grants EXECUTE to PUBLIC on every new function, so without a revoke any signed-in athlete could have read every friend request, squad invitation and competition belonging to anybody else by passing their id. Revoked **from PUBLIC** — revoking from `authenticated` would have removed nothing, since that role never held a direct grant, and would have read as protection while granting none. Guarded by a test and by a row in the bundle's verification query.

**The sender is SQL.** There is no Supabase CLI and no service key here, so an Edge Function was not applicable-by-paste. `pg_cron` drains `push_outbox` every minute through `pg_net` to Expo's push endpoint (which needs no credential — the token is the address, so this migration stores nothing secret), and a second job reconciles the responses and retires tokens Expo answers `DeviceNotRegistered` for.

**Tap-through shares one destination function.** `/inbox`'s per-kind routing moved into `domain/notifications/destination.ts` and is now used by both the feed row and the push, so the two cannot land in different places. One behaviour change: a missing id falls back to `/inbox` instead of building a route with an empty segment.

- **Migration:** `supabase/migrations/0120_push_notifications.sql` · paste bundle `supabase/apply/pending-0120.sql` (**byte-identical body, guarded by a test**) — ⚠ enables `pg_net` + `pg_cron`; ⚠ **0119 is still unapplied** and should go first
- **Client:** `expo-notifications@~56.0.23` · `app.json` plugin + `POST_NOTIFICATIONS` · `src/lib/push.tsx` (permission, token, tap-through; every entry point returns early on web) · `src/data/push-live.ts` · `src/domain/notifications/destination.ts`
- **Release:** ⚠ **native change — OTA cannot deliver this.** Needs `eas build -p ios --profile production` + `eas submit`. `buildNumber` → **3**; `eas.json`'s `submit.production.ios` block **re-added in this same pass**, which is the free moment the runbook describes (a build re-baselines the fingerprint). Testers need no new link — TestFlight updates in place.
- **Gates:** tsc **0** · **1277 tests / all green** (14 new) · eslint **1 error + 13 warnings = the pre-existing baseline, nothing added** · clean web export, `entry-a3d956aab43c87daf0dfdf889157076b.js`, `push_register_token` present and the retired ceremony keys absent
- **14 guards proved by mutation** — each made red on purpose and confirmed red *by the expected test*, including branch deletion, client/server default drift, a weakened `revoke`, and bundle drift

### 8. The workout preview summarised a session it could not have been describing (2026-08-07, CODE — no migration)

**PO review of the Today's Workout preview sheet. The visual design was not the problem — the information
architecture was.** Three findings, all of them real.

**"6 EXERCISES · 19 SETS" over a day showing eight movement names.** Both numbers were arithmetically
correct and both described a session the athlete could not see. `main.length` counted the three stations
of the Engine circuit as peers of the three lifts — while the screen correctly drew them inside **one**
bordered card — and it excluded the two warm-up rows, so the number matched neither the rows above it nor
the rows below it. `plannedSetCount` folded the circuit's 3 rounds × 3 stations into nine "sets": right
about **volume**, which is what Program Detail and the builder ask it for, and wrong as a **description**,
because nobody calls a round of sled-swing-burpee three sets and no set count appears anywhere on that
card. The summary now counts what the sheet **draws** — loose exercises are exercises, their sets are
sets, and a grouped block is described in its own words. Squat & Sled reads
**`~40 MIN · 3 EXERCISES · 10 SETS · 3-ROUND FINISHER`**, and every number in that line is a thing you can
point at on screen. `plannedSetCount` is untouched and still answers 19 for the same day.

**Duration leads, because it is the question being asked.** An athlete standing in the kitchen at 6:40 is
not weighing nineteen sets against eleven — they are asking whether this fits before work, and a set count
cannot answer that. `estimatedSessionMinutes` prices loose sets, timed efforts, circuit rounds, an AMRAP's
own clock and a cardio bout by time or distance, with the warm-up charged flat rather than as working sets
(two bodyweight-squat prep rows are not six minutes). It shares **one** `MINUTES_PER_SET` with the
template-side `estimatedMinutes` — a template claiming "~45 min" beside a program day claiming "~30 min"
for the identical ten sets would be two answers to one question — and a test fails if the program side
grows its own constant.

**Start Workout was one of three peer buttons, and their consequences are not peers.** Start is the
expected path; "Choose another" is a deviation from today's programming; "Skip this one" **writes to the
program's schedule** and carries the athlete a session further along it. Drawn as three siblings, an
inspection sheet was asking for a scheduling decision. Start is now the overwhelming action with one
subdued borderless line under it — **Choose another workout** — and skipping moved into the deviation it
belongs to — at the time, Program Detail, which lists every outstanding session with its own Train and
Skip. Home's `nextSlot` memo and `skipFromHome` helper retired with it.

**⚠ OPEN GAP, introduced by a concurrent commit and not by this pass.** `dbb70a2` (another session, same
branch, landed mid-pass) repointed `onChooseAnother` at a new same-week **SwapWorkoutSheet** that stays on
Home and only swaps — it does not skip. So the reasoning that justified removing Skip no longer holds and
**the preview flow reaches no skip affordance at all**. Skipping still works from the program screen. The
PO's original note offered two homes for it — an overflow menu **or** the Choose Another flow — and with
the Choose Another flow now being the swap picker, that choice is open and unmade.

**And the title was printed twice.** The hero passed `focus: day.name` — the same string as `name` — so
the sheet opened "Squat & Sled" over "Squat & Sled" over the meta line, **and the Home hero card had been
doing the same thing above it**, which is where it came from. Fixed at the source; the sheet keeps a guard
because it cannot know what a future caller will hand it.

**Deliberately NOT added:** exercise thumbnails, muscle diagrams, coaching notes. This is decision support
before starting, not Workout Detail — it answers *what am I doing*, *how big is it*, *do I want to start*,
and stops. **⚠ Also not added: a "LOWER BODY · STRENGTH" subtitle.** The definitions carry `split` and
`modality`, but `adopt-core` drops both at `workoutToDay` and every already-adopted program's stored
`structure` is missing them — that is a plumbing change of its own, not a rename in the hero.

tsc 0 · lint at baseline (1 error, 13 warnings, all pre-existing) · **1266/1266**. The five new sheet
guards and the per-set drift guard were each **mutation-tested red** before being trusted.


### 9. Three real training programs pasted into the importer, and all three came apart (2026-08-07, CODE — no migration)

**Found by running the actual pastes through the parser, not by reading it.** Every failure below is a
real program the PO pasted in, and every fix is pinned by a test that was mutation-tested.

**A COACH'S SPREADSHEET — 23 days, and not one usable exercise name.** The header row was assumed to be
line one. A training sheet never puts it there: it opens with a week title, a phase banner and a running
prescription block, and names its columns on line five. So the Exercise column was never found, the sheet
fell through to the **freeform reader — which does not split cells** — and every tab-joined row became one
exercise named after the whole row: `"Barbell bench press –10 RPE 6–7 3-1-2 tempo. Control the eccentric…
☐* Last 160 x 8"`. The header is **searched for** now, guarded so it needs an Exercise column plus one
more match — a typed-out workout containing a line reading "Name" must not be mistaken for a header with
everything above it discarded. Day banner rows ("MONDAY — Upper Strength + Zone 2") were dropped as
spacers, **welding four training days into one of fifty lifts**; they are read now, and the guard is
strict enough that WARM-UP, ACCESSORIES and CORE — in that same column, equally short and shouted — stay
sections rather than becoming the twenty-three days they briefly were. **The guard is mutation-tested from
both sides**: one too loose is as wrong as one too strict. And `"Hip-90/90 mobility"` parsed as ninety
sets of ninety, handing back `"Hip- mobility"` — a name is no longer rewritten when the columns already
answered.

**THE SAME SHEET, THREE WEEKS AT A TIME — and week 2 vanished.** Only week one's preamble sits above the
header; every later week's lands in the body, header row and all. **Week 2's banner was indented one cell
further than week 1's, which put "WEEK 2" under Exercise** — so it imported as a lift, the week never
advanced, and week 2's work folded silently into week 1 (Monday came out with 24 exercises). Week 3
survived only because its banner was indented *past* the Exercise column. A week banner now opens a
preamble that the next header row or day banner closes, and rows inside one are dropped **only when they
prescribe nothing**, so a Zone 2 run given minutes instead of sets still imports. Result: 2 weeks · 5 days
· 140 exercises · 5 junk rows → **3 weeks · 4 days · 135 exercises · 0 junk**.

**A PROGRAM LIFTED OUT OF A PDF — two weeks read as one of sixteen days.** No columns, no sets, no reps,
and nothing announcing the second week. **The weekdays starting over is the boundary** — and repetition
rather than order, deliberately: these PDFs interleave columns, and this one lists SUNDAY between TUESDAY
and WEDNESDAY, so a rule watching for the days going backwards would have cut week 2 in half. `FOCUS:` /
`TARGET:` labels sit *among* a day's exercises and were read as days, **splitting every day in half**;
where the PDF wrapped `"TARGET: ARMS, CHEST, AND"` onto a second line, three days came out named
**"BACK"**. A weekday carrying the day's first exercise on one line kept only the name, losing the
exercise — split now, guarded so `"WEDNESDAY — REST DAY"` stays a day called Rest Day rather than
becoming a rest-day exercise.

**Verified:** tsc 0 · **1238/1238** · 20 new tests, each mutation-tested. Committed `adde26d`, exported,
grepped, deployed — live `entry-b6329ddc78e2afb690efe4376a1a6ebf.js` confirmed serving the fix on
forgelegacy.expo.app.

**⚠ STILL TRUE, AND NOT A PARSER BUG:** an imported exercise holds **only sets and reps**
(`ImportedExercise`), so **minutes, metres and per-side counts have nowhere to go** — `6×20s / 10s rest`
imports as 20 *reps*, `4×40m` as 40 *reps*, `3×10/side` as 10 total. Closing that means widening the
import structure and the builder draft model. **Open decisions:** whether an explicit `WARM-UP` banner
should route to `warmup` (today everything lands in `main` by documented design, so mobility work counts
toward PR detection), and whether a leading `"Arms/Chest: "` category prefix should be stripped so those
names match the catalogue — both reverse a stated never-guess rule and are the PO's call.

### 10. The blue flash was Expo's, and the update that fixed it could reach nobody (2026-08-06, CODE + RELEASE — no migration)

**Reported from the tester build:** *"I open the app, the first splash screen, then a blue splash, then
the home screen."*

**It was `#208AEF` — Expo's brand blue — from the `create-expo-app` template.** `AnimatedSplashOverlay`
fills the screen for 600ms to cover the gap between the native splash disappearing and the first painted
frame. It can only do that in the splash's own colour; in any other it **is** the gap. Now `#0E0E12`,
the same value the OS paints. **It survived six months because `animated-icon.web.tsx` returns `null`**
— the overlay does not exist on web, and the web preview is where every review happens. **A `.web.tsx`
that renders LESS than its native twin is a blind spot, not a simplification.** Guarded: the overlay's
exported constant is asserted equal to `app.json`'s splash colour, mutation-tested both ways. The
template also left an `AnimatedIcon` rendering **expo-logo.png** — imported by nothing, now deleted
with its assets, because shipping another company's logo is its own kind of defect.

**⚠ AND THE UPDATE THAT CARRIED IT REACHED ZERO DEVICES — twice over.** `eas deploy --prod` publishes
**web hosting only**; the phone needs `eas update`. Published one — green **"✔ Published!"** — at
runtime `356ebf69`, while the TestFlight build is `d2cdb7b5`. `fingerprint:compare` named the entire
native-affecting delta: **`eas.json`** — and the only change in it was `submit.production.ios` gaining
`ascAppId`/`appleTeamId`, two fields that exist so `eas submit` can run unattended and have **no effect
on the binary**. `@expo/fingerprint` hashes the whole file. **A submission convenience had silently cut
every build off from over-the-air updates.** Reverting it returned the fingerprint to `d2cdb7b5`
exactly; republished, and the live update now matches the build.

**⚠ It also surfaced that the 2026-08-05 SVG-glow fix went to runtime `75e9448e` = BUILD 1.** Build 2
already existed. **That fix may never have reached anyone**, and the same is true of anything published
between them — worth re-checking before assuming a recent JS fix is live on a phone.

**Also fixed en route:** `ScreenBackground` passed a `.dc`-transcribed rgba string straight into an SVG
`<Stop>`, and react-native-svg drops the alpha — so the 6% cool apex haze painted as **solid #587CA0**
on Friends Feed and Squad Detail. Split through a new `svgStop()`; the guard now also rejects a computed
`stopColor` with no declared opacity, and **filters comment lines** so it stops going red on the files
that explain it.

**New:** `Docs/Release-And-OTA-Runbook.md` — the three things "shipping" means, and the
`fingerprint:compare` check that must precede every OTA. **"✔ Published!" is not evidence anybody
received it.**

tsc 0 · lint at baseline · **1206/1206** · OTA live at `d2cdb7b5`.

### 11. The Standards audited against each other — four conflicts closed, one handed back, one of mine withdrawn (2026-08-06, DOCS — no code, no migration)

**Asked for:** *"I've now found five places where your own Standards contradict each other. Each got
patched locally. Nobody has looked at them together."*

**New:** `Docs/Program-Authoring-Standard-Reconciliation-2026-08-06.md` — every PAS decision (D1–D12)
read against `schema.ts` and **measured against all 14 shipped definitions** where the rule was
measurable. Numbers counted, not estimated.

**⛔ THE FINDING THAT REFRAMES THE OTHERS, AND IT WAS NOT ON THE LIST OF FIVE: the Standard governs a
product that was never built.** §2.3 describes an `ExercisePrescription` with `exerciseName`, `order`,
`weightValue`, `distanceValue` and a 200-character **`notes`** field. The shipped model has none of
those, has **no `notes` field at all — deliberately, and documented as such** — and has ten fields the
Standard has never heard of (`repsMax`, `per`, `repScheme`, `percentOfMax`, the five group fields, the
cardio fields). **`ProgramSlot`, specified in detail in §2.2, appears nowhere in `src`.** The Google
Sheets template (§12), the import tool (§16 Group A, *"Automated — Import Tool Will Catch These"*) and
the import-to-publish workflow (§17) do not exist: 2 of 14 programs came through the `.docx` ingest and
**the other 12 were authored as JSON and gated by `programs.test.mjs`, a suite the Standard has never
heard of.** Three separate rules — RPE, rep-range upper bounds, superset encoding — all depend on that
one absent field. **Not amendable; it needs a PAS v2.0**, and until then the Standard is authoritative
on POLICY and unreliable on MECHANISM, which is the actual hazard: an author cannot tell which half
they are reading.

**✅ CLOSED — Amendment 005 (warm-ups).** The PO's 2026-08-06 instruction retired 244 of 405 warm-up
items, was carried out correctly, and **§9 was never updated** — leaving **114 of 244 non-MOBILITY
sessions, 47% of the catalog, in breach of a LOCKED standard** (19 with no warm-up against "Required",
95 below §9.3's floor of three). Required → **"required where authorable"**; count 3–6 → **1–4**; two
new binding rules that catch different things (must resolve to the **visible** 721; **no ramp sets** —
"Barbell Bench Press, empty bar" resolves perfectly and is still a ramp set); PAS-D10 reconciled to
`WarmupItem`. **This is the recurring failure in its purest form** — not an amendment left unmerged, but
a decision made, implemented, and test-guarded that never reached the rulebook, so §9.3 went on telling
authors to write six of the thing that had just been deleted.

**✅ CLOSED — Amendment 006 (deload vs volume floor).** PAS-D7 mandates a deload, PAS-D8 cuts sets
40–50%, PAS-D11 sets a floor — and **no set count satisfies all three**: clearing an 18-set floor after
a 45% cut needs working weeks at 33, above the band's ceiling of 30. Live in **7 sessions across 2
programs, one of them LOCKED with it open.** The floor is now scoped out of deload weeks; the ceiling
still applies everywhere. Same move Amendment 004 had already made for the per-muscle bands (PAS-A4-D3).

**✅ CLOSED — Amendment 001, found unmerged by the audit.** §10.3 still instructed authors to declare
supersets in `notes` — a field that does not exist, for a feature the model has supported since 0106.
The amendment had been LOCKED since 2026-08-03 and never merged. **Nobody reported it; the audit found
it**, which is the argument for auditing on a schedule rather than when somebody notices five things.

**⚠ HANDED BACK — one product decision, 34 live sessions.** Measuring the deload conflict surfaced a
bigger one: **41 sessions sit below their PAS-D11 floor and only 7 are deloads.** The other 34 are the
three specialization blocks and Iron & Engine — programs that train **five and six days a week**, where
14 sets × 5 sessions is 70 sets a week, more than a 3-day program at 22 a session that passes
comfortably. **PAS-D11 is a per-session rule measured against per-week training, so it penalises
frequency for being frequency** — and none of the four filed the deviation note §10.1 requires.
Recommendation: read the floor per week above a frequency threshold, keep the per-session ceiling. **Not
decided here** — it changes a locked guardrail for the whole catalog including the 10 unbuilt programs.

**↩️ WITHDRAWN — mine, from this morning.** Mobility Foundation's 8.0–9.6-minute week 1 was written up
as "the fourth Standard conflict". It is not a conflict: **§10.2 calls its own ranges "quality-review
guidelines, not import rules" and asks for a written note when a program falls outside**, which the
Design Record §7 is. The program is compliant by the route the Standard specifies. Corrected in all
three places the claim landed. **A finding argued down is worth more than one that quietly disappears,
and that has to apply when the finding is mine.**

**Also recorded:** the per-muscle band vs the coaching cap is a *Blueprint* conflict, not a PAS one; and
`PAS-Amendment-002` is cited three times in the Standard with **no amendment document behind it** — the
opposite of the usual failure. The change log had no entries for Amendments 003 or 004 either; both
backfilled as v1.5.

**The systemic finding, sharpened.** The old phrasing — *the Standards encode volume and frequency and
nothing encodes stimulus quality* — survives. Underneath it: **the Standard describes a product that was
never built, so its mechanism rules decay into fiction while its policy rules stay live.** When a
compliance table contains a row nobody can satisfy, authors learn to skip rows — and the next genuine
violation looks exactly like the impossible one. Amendment 003 said this about the cool-down; it turned
out to be the general case.

PAS → **v1.6**. No program content changed, no JSON re-authored, nothing an athlete sees is different.
tsc 0 · lint at baseline · 1197/1197.

### 12. Mobility Foundation (Sort 23) — the sixth family opens, and the field that had to be fixed to author it (2026-08-06, CODE + CONTENT + test — no migration)

**Asked for:** the next program, choosing Mobility Foundation over Muscle Building Foundation and a spec
reconciliation pass — because it is the most structurally different thing left, and a model that cannot
hold it is better discovered on program seven than program fifteen.

**⚠ IT COULD NOT BE AUTHORED UNTIL A THIRD WRITE-ONLY FIELD WAS FIXED.** `ExercisePrescription.per` —
"3 × 10 **per leg**" — was authored on **142 prescriptions across all thirteen existing programs** and
read by nothing: not `adopt-core`, not `schemeText`, not a single screen. Every Bulgarian split squat,
walking lunge, dead bug and single-arm row in the catalog reached the athlete as half of itself. It is
the same shape as `repsMax` and the rep ranges before it, **and it is the worst of the three**: a
dropped range shows LESS than was asked for, while a dropped side shows a *different, complete-looking*
prescription. There is no reading of "3 × 10" that recovers the other leg. Fixed end to end — the
carry, `schemeText`, `SessionExercise`, and the three places the logger states the ask. `reps` stays
per side, because doubling it would write twenty into the reps column for a set of ten-a-side and
corrupt every e1RM and PR downstream. **The guard was mutation-tested and the first attempt lied** —
removing the carry left all nine tests green because the mutation had not applied (CRLF file, LF
pattern); re-run properly, two go red.

**The program:** 4 weeks · 5 sessions · **20 sessions · 140 prescriptions · 29 exercises**, to
`Mobility-Foundation-Blueprint-v1.0.md`. Five rotating sessions — *Breath & Spine · Open Hips ·
Shoulders & Upper Back · Ground Up · Full Body Flow*. **76 of its 140 prescriptions are per side**,
which is why the fix came first.

**It is the first program in the catalog that is not sets and reps.** MOBILITY is MAIN-only (PAS-D9),
so all twenty sessions carry `warmup: []` — the one place in the repo where an empty warm-up is a
specification rather than the 2026-08-06 sweep having stripped a session bare, and the test asserts the
emptiness on purpose. Its progressed variable is **hold duration**: 20s in week 1 → 50s in week 4,
while the dynamic drills keep their sets and reps for all four weeks. **That last part is the most
load-bearing decision in it** — Blueprint §9 rests the entire Mobility Foundation ↔ Mobility
Intermediate distinction on the successor introducing harder variations, so a well-meaning edit
swapping a couch stretch into week 4 would read as good coaching and would spend the successor's only
means of being a different program. Two tests stop it. Three positions (couch stretch, sleeper stretch,
Cossack drill) are **deliberately left unspent**.

**⚠ TWO THINGS RECORDED RATHER THAN SMOOTHED OVER.**
1. **Week 1 runs 8.0–9.6 minutes, under §10.2's own 10-minute floor, and is left there.** Reaching 10
   would mean lengthening a beginner's holds past what they should be asked to hold, or adding drills
   that then cannot progress — bending the training to hit a number in a table, which is exactly the
   error the coaching audit found in Muscle Building Intermediate's twelve sets of lateral raises. The
   ceiling is asserted exactly, because the ceiling is the half that protects the athlete. ↩️ **This
   was written up as "the fourth Standard conflict" and it is not a conflict — claim WITHDRAWN the same
   day.** §10.2 calls its own ranges "quality-review guidelines, not import rules" and asks for a
   written note when a program falls outside; the Design Record §7 is that note, so the program is
   compliant by the route the Standard specifies. See Recently Completed #1, Finding 8.
2. **15 of its 29 exercises have NO demo clip at all** (9 complete · 3 male-only · 2 female-only),
   measured with **one bucket listing**, not per-id `HEAD` requests — the method that reported six
   false negatives last time. This matters more here than anywhere else: a missing clip for a barbell
   row is a disappointment, but for a Half-Kneeling Hip Flexor Stretch the picture *is* the
   instruction, and the fallback is an engraved dumbbell icon. **The fifteen were deliberately NOT
   appended to `pending-clips.json`** — `process_pending.py` silently skips null-src entries, so
   queuing them with the drive disconnected would look like work queued and be work skipped.

**Design Record recommends HOLD, not LOCK** — over its own §7, on §11: locking would sign off a
beginner mobility practice that shows a beginner an icon of a dumbbell where a hip stretch should be.

Also committed this session, both stranded in the working tree while this board already claimed them:
the **244-warm-up cleanup** (Recently Completed #10 — the dashboard had said it shipped since morning
while HEAD still held all 40 "Build-up sets") and the **2026-08-05 duplicate-row audit** (one lift filed
twice, twice; "barbell shoulder press" returning zero of 723 because search is token-AND and no field of
`barbell-overhead-press` contains the word "shoulder"). The intermediate state was verified green in a
throwaway worktree before the split.

tsc 0 · lint at baseline · **1197 of 1197**.

### 13. A coaching audit — read as a coach, not an engineer — and a lock withdrawn hours after it was signed (2026-08-06, CONTENT + test — no migration)

**Asked for:** *"Do a full audit as a fitness coach. Are they good? Are they helpful for clients?"*

**The answer: structurally excellent, coached inconsistently, and one program was actively working
against its own goal.** Three defects, all the same shape — **every number individually legal, and no
test asking which DIRECTION the numbers moved or whether the direction served the purpose.**

**⛔ BODY RECOMPOSITION FOUNDATION — LOCK WITHDRAWN.** It shipped as `3 × 10 @ 90 s` in week 1 and
`3 × 15 @ 60 s` in week 8. **Rising reps with shrinking rest is a metabolic stimulus**, and this program
exists to retain muscle in a caloric deficit — where the driver is *intensity*. It prescribed the reverse
of its own purpose: the "high reps to tone" error, in the one program whose justification is that it is
not that. On top: four sessions, rising volume, and a finisher climbing to 22 min — **88 minutes of
steady cardio a week on a beginner in a deficit.** **Fourteen acceptance tests passed it**, because all
fourteen measured the *envelope*. Now: rest **constant** at 90/75 with a test asserting it never falls,
every prescription a **rep range**, volume progressing through sets, finisher capped at 18 min. The Lock
Record is annotated, not deleted — a lock granted and revoked is a thing that happened.

**The effort problem, solved with zero new UI.** The audit's headline was that **not one of the thirteen
programs tells the athlete how hard to push** — and for hypertrophy and fat loss, proximity to failure is
the primary driver. The first proposal was a per-exercise effort field; **the PO's objection that it
would clutter the workout screen was right and changed the answer.** The **rep range already is the
instruction** — *8–12, and if you can beat 12 the weight is too light* — rendered by machinery that
shipped the same morning. The programs missing effort guidance were exactly the ones with flat reps.

**⚠ MUSCLE BUILDING INTERMEDIATE — volume capped.** Peak ran to **30 sets** (five sets of bench then five
of barbell row, ~70 min, sets 4–5 junk). And **12 sets of lateral raises a week — a number that existed
to land inside a band in a Blueprint table, not because a coach would prescribe it.** The clearest case
in the catalog of fitting the training to the spec. Lateral raise → 4; restructured to three working
blocks so a real deload fits. Ceiling 30 → 28, **stated honestly as a smaller win than it sounds.**

**⚠ BODYWEIGHT FOUNDATION — the featured front door.** An athlete with no bar did **18 sessions with no
pulling at all**; sessions A and C had zero ungated upper-back work. The PO ruled out recommending
equipment, so the fix is a **band substitution** on the optional pull (a band is already in
`HOME_EQUIPMENT` and the Blueprint already permits one) plus **scapular work in every session**, which
replaced calf raises that occupied two of three sessions. And the ladder asked a beginner for **3 × 12–20
diamond push-ups** in week 5 — anyone who can do that is not a beginner. Rescaled.

**Athletic Conditioning Foundation:** the farmer carry was prescribed in **reps**. You walk until the
clock stops. Now timed. The "week 1 is thin" finding was **withdrawn on a second read** — the Blueprint
specifies beginner density deliberately, and an argued-down finding beats one that quietly disappears.

**⚠ THREE MORE STANDARD CONFLICTS, recorded not contorted around.** PAS-D8's 40–50% deload cannot coexist
with PAS-D11's 18-set floor (half of 26 is 13). The capped lateral raise now sits at 8/week against a
10 floor — **the band is a guideline and the coaching cap is the judgement; the judgement wins.** And
`rep-range.test.mjs`'s "no ranges" control *was* Body Recomp: giving it ranges turned that test red
immediately, which is exactly what a control should do.

**The systemic finding:** the specs encode volume and frequency and **nothing encodes stimulus quality**,
which is how a program can be 100% compliant and wrong. tsc 0 · lint at baseline · **1174 of 1174**.

### 14. Athletic Conditioning Foundation (Sort 12) — a convergence verdict that was on paper, now in code (2026-08-06, CONTENT + test — no migration)

**Asked for:** a fifth free muscleandstrength.com PDF (*Spring Shred*, 8wk / 5d / ADVANCED / fat loss).
**Declined, with reasons, and Wave 1 built instead** — the PO's call.

**Why that PDF was the wrong build.** No slot: the 24 has three ADVANCED programs and **none is fat
loss** — the Recomposition ladder stops at Intermediate. And **four of its five intensity methods cannot
be expressed at all**: drop sets, rest-pause, forced reps and holds have no field, and there is no
`notes` field by design. Only supersets survive. Its own copy says *"outside your warm-up sets, there
isn't a single straight set"* — so authoring it would have stripped the thing that made it that program,
leaving a 5-day body-part split that overlaps Frame by Frame. **Its rest taper (2min → 90s → 60s → 45s)
is worth keeping** — a progression axis nothing in the catalog uses — and is noted for a future program.

**Built instead:** Sort 12, the Conditioning family's BEGINNER rung and **the family's only 3-day
program**. 8 weeks, 24 sessions, deload week 7, peak week 8.

**⚠ The reason this one was chosen over its two Wave 1 siblings: it is the only unbuilt program whose
distinction from a shipped program can be MEASURED.** Its Blueprint set a four-part **convergence test**,
and Body Recomposition Foundation — locked this morning — was written to pass it. The two share
CONDITIONING / BEGINNER / GYM and differ only on goal. Body Recomp's §11 recorded *all four parts PASS*
and the pair RESOLVED — but only one of them existed, so the verdict rested on a description of a program
nobody had written.

**Both now ship, so the test is asserted against the sibling's actual JSON, in both directions:**
this program **opens** every session on the bout while the sibling **opens on resistance and closes** on
its finisher (Part A); resistance is ≤ 2 standalone lifts here and ≥ 4 there (Part C); and they differ on
**four independent axes** — 3 days vs 4, 24 sessions vs 32, modality `conditioning` vs `strength`, and
circuits here and none there (Part D). Moving the bout to the end, flattening the circuit, relabelling
sessions `strength`, or adding four standalone lifts each turns it red — **and so would the sibling
drifting toward this one.**

Work capacity accumulates as **rounds and minutes** (3→4→5 rounds, 10→12→15 min), deload 3 rounds /
8 min, peak 6 rounds / 18 min. **No rep ranges** — Double Progression belongs to Conditioning
Intermediate and a test forbids it here. Volume measured with **`plannedSetCount`, not a raw sum**: a
three-move circuit run five times is fifteen sets, and counting the raw field would report the program at
under half its size and pass an envelope it fails.

11 acceptance tests, **each mutation-verified**. tsc 0 · lint at baseline · **1159 of 1159**.
Catalog: **13 definitions, 4 locked, 6 of 24 planned.**

### 15. Bodyweight Foundation (Sort 18) — the featured front door, and the pull nobody can do with nothing (2026-08-06, CONTENT + test — no migration)

**The first of the five to be authored from nothing but its own Blueprint** — the previous four each
began with a PDF someone brought in. It is one of only **two featured programs** (with Strength
Foundation I), which the Stage-2 plan calls *the launch front door*, and it opens the **Full Body & Home**
family — the fourth of six, and the first new family in the catalog since Conditioning.

Six weeks, three days, **18 sessions**, full body every time. **No deload** — PAS-D7 mandates one only at
7 weeks and over, and inventing one would cut a six-week block to five weeks of training; a test fails any
block labelled as one.

**⚠ The one real design problem, measured rather than assumed: every pull in the catalogue needs
equipment.** 4 horizontal and 11 vertical, **all fifteen gated** on a bar, rings, straps or a rack. There
is no row, chin or pulldown an athlete can do owning nothing. Omitting the pattern ships a
push-dominant beginner program; requiring a bar breaks the featured promise of *"no equipment, train
anywhere."* So the pull is prescribed and marked **`optional`** — which the model already defines as
*"prescribed, but the athlete owes nothing by skipping it."* **Both halves are asserted**: a pull must be
present in every session, and it must be the *only* prescription needing gear. Adding a required pull-up
turns three tests red.

**Handled differently from Close Quarters' bench, on purpose** — there, twelve of forty prescriptions
needed one and the PO chose to require it and say so; here it is one in six and the program is *featured*
on needing nothing.

**Progression is the bodyweight mechanic, not the barbell one:** each slot is a **three-rung variation
ladder**, one rung per block, with the rep range (**8–12 → 10–15 → 12–20**) as the gate between rungs —
knee push-up → push-up → close-grip push-up. **Sets stay at 3 for all six weeks deliberately**, because
the Blueprint prescribes Linear rep progression and *not* Volume Accumulation, which is Muscle Building
Intermediate's model one family over and the obvious-looking edit for anyone who just read it. A test
pins the set count.

**It only became authorable today** — the rep range it depends on was being dropped between the catalog
and the athlete until this morning's fix.

Also asserted: **a held position carries `durationSec`, never a high rep count** — a 45-second plank
written as `reps: 45` reaches the athlete as forty-five planks, which the starter-template library was
corrected for once already.

**⚠ Recorded as the reason to hold:** an athlete who owns nothing gets **no pulling at all** for six
weeks. The optional pull plus posterior-chain work is not a substitute for a row and is not claimed to
be. *"Buy a cheap door-frame bar"* is advice this program cannot give and probably should — a product
decision about what a featured program may recommend, and one worth making before the front door locks.

11 acceptance tests, **each mutation-verified**. tsc 0 · lint at baseline · **1148 of 1148**.
Catalog: **12 definitions, 4 locked, 5 of 24 planned, 4 of 6 families open.**

### 16. Muscle Building Intermediate (Sort 6) — and the rep range that was authored and thrown away (2026-08-06, CODE + CONTENT + test — no migration)

**Asked for:** a fourth free muscleandstrength.com PDF, 4 days a week. The first of the four whose
**frequency matched the unbuilt Sort 6 slot** — the one flagged twice as the locked catalog's real gap.

**⚠ It could not be authored, and finding out why exposed a live defect.** The Sort 6 Blueprint requires
**Double Progression** — a rep range, load rises when the athlete tops it. `ExercisePrescription.repsMax`
existed on the CATALOG side and nowhere else: `structureFromDefinition` never copied it, `ProgramExercise`
had no field for it, nothing rendered it. **A write-only field** — the exact failure the schema's
deliberately-absent `notes` field exists to warn about.

**Full Frame had authored a range on 105 of 105 prescriptions and lost every one.** "4 × 10–12" reached
the athlete as "4 × 10", in a program whose entire premise is *work the range, add weight when you top
it*. Its first draft was rejected for progression that "existed only in prose nobody reads mid-set"; the
rebuild shipped with the same defect in a different costume.

Fixed end to end, following the model's own convention — the ask beside the answer, like `targetWeight`
beside `weight`: `ProgramExercise.repsMax` → `adopt-core` → `schemeText` → `SessionSet.targetRepsMax` →
the Target column. **`reps` stays ONE NUMBER and stays the FLOOR**, because it feeds volume, the e1RM
behind PR detection, and the reps column written at save; widening it would put reps nobody performed
into an athlete's history. Full Frame's 105 ranges came back.

**Then Sort 6:** Upper/Lower × 2, 10 weeks, **40 sessions**, sets accumulating 19 → 21 → 24 → 26, deload
week 9 (primaries cut exactly 40%), peak week 10 at 29–30. The first program in the catalog that can
honestly say "4 × 6–10".

**⚠ Then the balance table turned out to be hiding an untrained muscle — PAS Amendment 004.**
§4 sets weekly per-muscle bands and §1 calls balance the program's identity, but the Standard **never
said what counts as a set for a muscle.** A 5-set bench press is 5 chest sets — and 5 triceps sets, or 0?
The two readings disagreed on **six of twelve** groups, so the band could be asserted but never checked.
**Five Blueprints carry such a table**, making it a Standard-level gap rather than one document's.

**What the gap was hiding is the point.** The Blueprint's single *"Shoulders 10–16"* row is
unsatisfiable by construction — pressing feeds the front delt whatever the program does, and **nothing
but direct work feeds the lateral or the rear.** It read a healthy **26 while the rear delt sat at 5**:
an actually under-trained muscle, invisible behind a total that looked fine. The first draft had dropped
direct rear-delt work while balancing everything else, and the combined row is why that passed. The
Blueprint had also **narrowed PAS's own 10–20** to 10–16/12–18 with no rationale — the program failed
those numbers, not the Standard's.

**Amendment 004** (LOCKED, merged into §11.2 and the Blueprint's §4 in the same pass): a set counts
**1.0 for PRIMARY, 0.5 for each SECONDARY** (PAS-A4-D1); the **delts are three groups, never one row**
(D2); the band applies to **working blocks**, since an accumulation ramp-in and a deload are *supposed*
to sit below it (D3); and **10–20 governs** — a Blueprint may not narrow it without a stated reason (D4).
Half-weighting was chosen because it is the only one of the three candidates under which a normal,
balanced 4-day program lands in band on every group, which is the test of a counting rule. The four other
Blueprints with per-muscle tables are **flagged, not edited** — Stage-1 docs for unbuilt programs.

**The program was rebalanced with it:** direct rear-delt work on both upper days, isolation raised in
weeks 3–4 and week 10. **All twelve major groups now sit inside 10–20 across weeks 3–10**, asserted — and
a second test asserts the ramp *is* a ramp, so "below the band" cannot quietly become an excuse.

**A test caught a real thing about the program:** the deload check read `main[0]` as the primary and
reported Day D at a 25% cut. Day D opens on the hack squat at a *secondary* dose and carries its primary
load on the hip thrust behind it — Blueprint §3 fixes the order, not the dose. The test was measuring
position and calling it weight.

14 acceptance tests here, 10 on the range, **all mutation-verified**. tsc 0 · lint at baseline ·
**1137 of 1137**. Catalog: **11 definitions, 4 locked, 4 of 24 planned.**

### 17. Close Quarters (6-Day) — the first program that claims to work at home, and the gate that cannot see a bench (2026-08-06, CONTENT + test — no migration)

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

### 18. Frame by Frame (5-Day) — a body-part split, and a guard against the mistake that got Full Frame's first draft rejected (2026-08-06, CONTENT + test — no migration)

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

### 19. A rule no author could satisfy, and a guard that failed the moment it was committed (2026-08-06, DOCS + test — no migration)

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

### 20. Body Recomposition Foundation — the first program the catalog plan actually asked for (2026-08-06, CONTENT + test — no migration)

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

### 21. The programs prescribed 244 things the app cannot show, and the guard said they were clean (2026-08-06, CONTENT + test — no migration)

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

### 22. PO batch 3 — four items, and two of them were charts and links that had quietly stopped being true (2026-08-05, migrations 0117–0118 — ✅ APPLIED 2026-08-06)

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

### 23. The app gets a native identity — bundle IDs, EAS build config, and over-the-air updates (2026-08-05, CONFIG — no migration)

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

### 24. The Forge template library: 6 day-sessions → 81, and the shelf that could no longer be a list (2026-08-05, CODE — no migration)

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

### 25. PO training-session feedback, batch 2 — and three of the eight were not what they looked like (2026-08-04, CODE + migrations 0112–0115) — ✅ APPLIED 2026-08-05

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

### 26. A program can be loaded from a tested max — and Squat Ascent, the first one that is (2026-08-03, CODE + migration 0111) — ✅ APPLIED

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

### 27. Iron & Engine, and the two things "share a program" can mean (2026-08-03, CODE + migration 0110) — ✅ APPLIED 2026-08-05

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

### 28. Two tester reports on the friend loop (2026-08-03, CODE + migration 0109) — ✅ APPLIED 2026-08-05

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

### 29. The playlist link — an amendment that was LOCKED, merged, and built nowhere (2026-08-03, CODE + migration 0105) — ✅ APPLIED

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

### 30. A program can finally graduate (2026-08-03, CODE + migration 0104) — ✅ APPLIED

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

### 31. Self-directed training blocks — the freestyle athlete can climb the whole ladder (2026-08-02, CODE + RCM Amendment 002)

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

### 32. The athlete who never builds a program gets a Home of their own (2026-08-02, CODE)

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

### 33. Home stops offering to find you a program it doesn't have (2026-08-02, CODE)

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

### 34. The tutorial that kept coming back — a lost-update race in the seen-set (2026-08-02, CODE)

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

### 35. The Home gate is gone — full Home from the first launch (2026-08-02, CODE)

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

### 36. The Squads cluster tutorialized — ten surfaces, 31 spotlit steps (2026-08-02, CODE)

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

### 37. The Legacy cluster tutorialized — ten surfaces, 35 spotlit steps (2026-08-02, CODE)

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

### 38. The Workouts cluster tutorialized — seven surfaces, 28 spotlit steps (2026-08-02, CODE)

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

### 39. P-1.1 Edit Profile built, and three share destinations that lied were removed (2026-08-02, CODE)

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

### 40. The guided tour split into two legs, and Home finally gets explained (2026-08-02, CODE)

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

### 41. FULL-APP AUDIT — seven passes, three defects closed, one reported (2026-08-02, CODE)

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

### 42. Import from a spreadsheet · PR semantics · Rank standards (2026-08-02, CODE)

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


### 43. Cardio consolidated onto one surface · the five empty honor categories filled (2026-08-01, CODE + migration 0099)

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
