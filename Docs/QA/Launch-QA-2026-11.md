# Launch QA — 2026-11 (before pressing Release)

**Why:** Apple approved 1.0.0 (11) and the release is manual. The PO found two real-life failures:
1. Joining a walk opened the exercise picker.
2. A squad photo post went out without its numbers.

This file holds every feature-level defect found before release, triaged. Work from it, and mark each row when it ships.

**Rule (PO 11-08): no second Apple review.** Everything here ships as an OTA to build 11 (`feat/build11`), or as SQL the PO pastes.
- A row marked **Build 12** waits until after launch.
- Before every publish, `eas fingerprint:compare --build-id e16d49b7-1f77-41b7-b9ed-cee331d1b163` must MATCH.

**How it was found (11-08):** 8 read-only code reviews of `feat/build11` @ `294d369b`, one per area. Every row was traced through the code, not run. ⚠ The phone script at the foot is what proves the device.

Status: ✅ shipped (OTA id) · 🔨 in progress · ⬜ open · ⏸ PO decision

---

## ✅ Already shipped — OTA `01a1bce2-0007-7931…` (11-08, lane `294d369b`, served and checked)
- ✅ **Joining someone's walk opens the walk, with GPS already running.** The snapshot used to drop cardio, so the join opened the exercise picker. `1c43e27f`
- ✅ **Inviting someone from inside a walk works.** It used to say "Add an exercise first". `1c43e27f`
- ✅ **A workout photo posts with the numbers ON it by default.** The choice is remembered, and every failure reason is reported. `294d369b`
- ✅ **The phone's picture waits for the photo to load**, instead of a fixed 250 ms. `294d369b`
- ✅ **The join ask reaches a host who hasn't added an exercise yet.** It lands within 8 s and re-reads on return to the app. Supersets travel as supersets. `8c5ddee4`, stranded since 10-07
- ✅ **Exercise search keeps every letter when you type fast.** `77367054`, trunk-only since 10-20

## ✅ Update #10 — OTA `01a1c23b-1eb7-7261…` (11-09, lane `a5deda31`, published) + WEB `index-5d5ba04d…` (trunk `fba67086`, live 14:42)
- ✅ **Deadlift and squat honor medals redrawn** (`dfa9cbb7` lane / `9e21415e` trunk). PO: *"This looks too much like a penis."* The old figures were a round head on one narrow centred column, with plate clusters that filled in as two lumps at its base. Deadlift is now a front view standing at lockout with the bar at the thighs (PO picked option 1 of 3). Squat is now a side view with the bar on the back, like the bench. Same 4 marks plus the × versions; nothing else changed.
- ✅ **UX-123: Exercise Library search no longer stalls on every letter** (`a5deda31` lane / `fba67086` trunk). The rows were a component declared inside the screen, so every letter rebuilt every row, and the list was recomputed on every render. It now uses the Picker's pattern: `renderRow`, a memoised list, and an uncontrolled field with `startTransition`. Not re-timed in a browser.
- ⚠ The web jump from `7364a077` also brings trunk's 17 launch-QA commits since `0148cfa1` to the web; they were already on phones as #2–#5. The boot fixes #6–#9 remain lane-only.
- GitHub `feat/build11` and `main` are at `a5deda31`; `feat/route-map` is at `fba67086`.
- 📱 ⬜ PO: on the phone, the Honors medals for deadlift and squat show the new figures, and typing fast in Exercise Library search keeps up.

## ⛔→✅ B9 — Stuck on the launch splash on every open (11-09, found live by the PO and Kim; updates #6–#9)
- **What happened:** the app sat on the pillars forever, and a force-quit didn't help.
- **Cause:** the 11-08 fix H15 tagged the boot profile read with the phone's stored `session.user.id`. A phone that had held two accounts kept a stale identity, so every read was judged "someone else's" (`read=mismatch`) and thrown away. Web never shows it.
- ✅ #6 `01a1c090` (`43b71a6e`): the launch covers leave on a timer. After 6 s the app says "Still connecting…" with Try again and Sign out. The profile read is time-boxed, and the Holt coin is off the boot screen.
- ✅ #7 `01a1c0a1` (`fc4ce923`) + `d8b90fd9`: the stall reports itself in `client_errors` (`Boot stall · …`).
- ✅ #8 `01a1c0b6` (`3da8f2bb`): **boot rescue.** At 6 s the app reads the profile itself and opens. This got the PO in.
- ✅ #9 `01a1c0e3` (`5ffccf67`): **the fix.** The read is tagged with the server-confirmed account id; a mismatch refreshes the session and reads again (at most 3 times). A profile shows only when both ids agree.
  - Tested on web: a mixed two-account session corrected itself in 2.6 s. The old build opened as the wrong account.
- ✅ PO and Kim confirmed both phones open normally on #9 (11-09). GitHub `feat/build11` and `main` were fast-forwarded to `5ffccf67` the same day; they had been at `3b21a594` since 10-15.
- 📱 Added to the phone script: sign out of A, sign in to B, then cold-start. It must open in under 3 s, as B.

## ✅ Update #5 — OTA `01a1bd86-f78f-70b5…` (11-08, lane `f705f9d2`, served and checked)
- H1, H3, H4, H5, H26, H30, plus the app side of 0260.
- ✅ **`pending-0260.sql` APPLIED 11-08 (PO).** §3 read `1 · 0 · 0 · true`, as predicted: 1 stale ask now hidden, 0 blocks, 0 joined-upcoming entries, refund callable. Because §3 rendered, §2 passed. The app side is already live (update #5). ⬜ Not yet seen working in the app.
- Predicted §3: `stale_asks_now_hidden` ≥ 0 · `blocks_now_enforced_on_profiles` = today's block count · `joined_upcoming_entries_now_listed` ≥ 0 · `refund_callable_by_athletes` = true.
- §2 must print "0260: all seven changes in place."

## ✅ Update #4 — OTA `01a1bd58-ef02-722d…` (11-08, lane `5fb2ec96`, served and checked)
- H9, H15, H20, H33.

## ✅ Update #3 — OTA `01a1bd44-aeaf-7c23…` (11-08, lane `ed02462d`, served and checked)
- H6, H18, H19, H21, H22, H25, H28, H29, H32, H35.
- ⚠ From this update, "Holt, change my program" is Premium AI only (MA8; PO approved 11-08).
- The web does not have update #3 yet; it ships with the next web deploy.

## ✅ Update #2 — OTA `01a1bd1d-38b2-7e9b…` (11-08, lane `cf9d7247`, served and checked) + WEB `index-7364a077…` (trunk `0148cfa1`)
- B2–B8, H7, H10, H12, H14, H16, H23, H24, H27, H36. The web also carries the B6 password-reset fix.
- ⚠ The web was deployed WITHOUT the Forge Coach demo (PO 11-08: "Deploy without the Coach demo"). Rollback: the previous web `index-f89995b2…` from `web/coach-pass1`.
- ⬜ PO, in the Supabase dashboard: Authentication → URL Configuration. `https://forgelegacy.expo.app/sign-in` must be in Redirect URLs, and Site URL must be `https://forgelegacy.expo.app`. Then try "Forgot password" once.

## ⛔ BLOCKERS — fix before Release
| # | Area | What the user sees | Where | Lane | Status |
|---|---|---|---|---|---|
| B1 | Privacy | Every new account's profile is public to everyone, including the live set-by-set view of a workout. Cause: `0189` "testing posture" (PO: "everyone public for right now") set the column default; nothing reverts it, and no launch list had it | `0189_testing_defaults_open.sql:146-182`; code defaults in `src/domain/settings/visibility.ts` | SQL, release day | 🔨 `0259` written (`b9aeb6c4`) — paste on RELEASE DAY; testers untouched (PO 11-08) |
| B2 | Workout | "Continue this workout" past 60 minutes from the first save: every Finish fails ("closed more than an hour ago"), and there is no discard | `0253_continue_into_same_exercise.sql:70-71`; `workout.tsx:2493,2551,2582` | SQL+JS | ✅ fixed `a244ff24` — new sets save as their own workout; not yet published |
| B3 | Cardio | End Walk → Cancel throws the walk away (GPS stopped and the saved run deleted before the form opens) | `CardioBlockCard.tsx:552-558,1156`; `useRunTracker.ts:593,451` | JS | ✅ fixed `d99b7aeb` — "Log walk"; not yet published |
| B4 | Cardio | ⋮ → "Discard workout · Nothing logged yet" deletes a live walk with one tap, no confirm | `workout.tsx:5819-5833` | JS | ✅ fixed `d99b7aeb`; not yet published |
| B5 | Free tier | At the 3-program limit, a Free user gets a developer error ("The pre-action check that should have shown M-7 is missing…"), not the upgrade screen. Start, then cancelling the max-lift or end-current question, still uses up a lifetime slot, so 3 cancels lock them out | `program/[id].tsx:719-790,852-875`; `program-guided.tsx:291-298`; `CoachChatSheet.tsx:3054`; `week-template/[id].tsx:96-102`; `0158:147-150` | JS | ✅ `d94cb0b1` guards + plain message (update #2) · slot refund = 0260 ✅ applied 11-08 |
| B6 | Account | The password-reset email link never reaches "Choose a new password" (`detectSessionInUrl: false`, no `redirectTo`) | `src/lib/supabase.ts:152`; `src/lib/auth.tsx:81,134-137` | JS (+ dashboard Site URL) | ✅ fixed `99ef242c` — ⚠ works only after a WEB deploy, and the Supabase redirect allow-list must hold `https://forgelegacy.expo.app/sign-in` |
| B7 | Workout | Resume prompt → End workout saves an empty 0-set workout into history and the chapter count; a walk in progress is dropped | `workout.tsx:2827-2830,3974-3977` | JS | ✅ fixed `d99b7aeb`; not yet published |
| B8 | Goals | A "lower is better" goal (lose weight to 180, a 5K under 25 min) is marked Achieved, with its ceremony, on its first progress update, and can't be undone | `src/data/goals-live.ts:222`; `chapter/new.tsx:124-131` | JS | ✅ fixed `6776ba3b`; not yet published |

## 🔴 HIGH — fix before Release where possible
**Train Together**
- H1 ✅ update #5 An accepted join reaches the asker only while their wait screen is open. Back out, and the host's "Let them in" never arrives; Join again makes a duplicate request. `workout-join.tsx:71,199-204`; no "accepted" notification for the asker in `0251`.
- H2 ✅ 0260 applied + update #5 Unanswered join requests never expire. A days-old ask pops up during the host's next workout. `0225:739-762` (`pending_join_requests` has no time filter).
- H3 ✅ update #5 A guest already in their own workout can only Resume (the join is silently dropped) or Discard (their sets are lost). `workout.tsx:1095-1106,2791-2855`.
- H4 ✅ update #5 "Never Alone" doesn't award on the shared workout, only on the next one: partners are written after `save_workout` evaluates honors, and the failure is unreported (the try/catch is dead). `save.ts:186-198`; `0242:242`.
- H5 ✅ update #5 One accepted ask credits every workout for 12 hours ("Trained with Sam" on a solo evening run). `partner-credit.ts:41`.
- H6 ✅ update #3 A joined TREADMILL walk doesn't start by itself (auto-start is outdoor only). `CardioBlockCard.tsx:292`.

**Squads / Challenges**
- H7 ✅ update #2 Friends & Squad → Workout post says "Posted" but lands as an empty discussion with no workout. `squad-composer.tsx:566,461-476`; `friends-feed-live.ts:272`.
- H8 ✅ 0260 applied + update #5 A competition that starts later disappears from Competitions and the squad page until it starts. `challenge_hub` in `0163:349+`.
- H9 ✅ update #4 Comments and check-in videos can't be reported, and nobody can delete a check-in video (guideline 1.2). `squad-post/[id].tsx:974-1005`; `squad/[id].tsx:1397+`.
- H10 ✅ update #2 Request to Join skips the free 1-squad limit (join-by-code is gated). `discover-squads.tsx:114`; `squad-preview.tsx:184`.
- H11 ⏸ after launch (Workout Complete, the main path, already works) · Squad composer → Workout Recap has no photo attach, and History → share passes no photo overlay, so neither can put the numbers on a photo. `squad-composer.tsx:664-706`; `activity/[id].tsx:161-173`.

**Friends / Profile / Notifications**
- H12 ✅ update #2 After sign-out, the phone keeps getting that account's pushes (`unregisterPushToken` is never called). `src/lib/auth.tsx:151-166`.
- H13 ✅ 0260 applied + update #5 A blocked person can still search for you and open your profile (`athlete_profile` and `find_athletes` have no block check). `0098:64-173`; `0114`.
- H14 ✅ update #2 Tapping a push with the app closed opens the screen twice, and later re-opens it (the last response is never cleared). `src/lib/push.tsx:168-205`.
- H15 ✅ update #4 Edit Profile → Save / Remove photo flashes the splash and drops you on Home (a refetch re-enters boot loading). `edit-profile.tsx:204,221`; `useQuery.ts:77-79`. Confidence: medium.
- H16 ✅ update #2 The "👊 Got it" cheer-reply push opens an Inbox that doesn't have it; the admin pushes do the same. `destination.ts:167-168`.
- H17 ✅ 0260 applied + update #5 Accomplishments / Chapter History set to "Only me" still show under the profile's "Recent". `0098:154-164`.

**Programs / Templates / Holt**
- H18 ✅ update #3 Holt's Free allowance is never used up (`consumeHoltAllowance` has no callers), so the paywall's "Basic Holt 1 program, 2 days/mo" isn't true. `entitlement-live.ts:153`.
- H19 ✅ update #3 "Change my program" isn't gated on Premium AI (MA8 owed #1). `CoachChatSheet.tsx:1406,1846,2026`; `program/[id].tsx:1184,1543`.
- H20 ✅ update #4 A day Holt writes from typed words loses its warm-up, cool-down, supersets and cardio when started or saved. `CoachChatSheet.tsx:957-962,2939,2963`; `save-shapes.ts:82-120`.
- H21 ✅ update #3 Treadmill / indoor bike blocks in templates start as outdoor GPS runs. `workout-template-rows.ts:32-62`; `workout.tsx:6050`.
- H22 ✅ update #3 Starting a template or program day on weak signal opens an empty Freestyle session with no message. `workout.tsx:1277-1305,1366-1411`; `templates-live.ts:223`.
- H23 ✅ update #2 PRIVACY: a sent program shows the recipient the sender's own words to Holt ("You asked: my knee hurts"). `send-program.tsx:110`; `holt-marks.ts:95`.

**Workout / Cardio**
- H24 ✅ `d99b7aeb` The Outdoor/Treadmill switch still works mid-walk. A mis-tap saves 0 distance with no route. `CardioBlockCard.tsx:1018-1032`.
- H25 ✅ update #3 Continuing a finished walk brings it back as a lift (sets table, no Start). `continue-workout-live.ts:126-141`.
- H26 ✅ update #5 "Log an activity you already did" has no date: yesterday's run is filed as today. `log-activity.tsx`; `save.ts:282`.
- H27 ✅ `d99b7aeb` A treadmill bout loses its exit lock after the app is reopened, so Finish drops it. `CardioBlockCard.tsx:251`; `useWallClockTimer.ts:59-81`.

**Legacy / Goals**
- H28 ✅ update #3 Lift, run, count, volume and PR goals only move while the Goals screen is open; a chapter sealed elsewhere records "In progress". `goals.tsx:121-141`; `chapter/[id].tsx:179-188`.
- H29 ✅ update #3 Home doesn't re-read goals, the chapter line or the friend row on return ("Set a chapter goal" stays after you set one). `(tabs)/index.tsx:496-507`.
- H30 ✅ update #5 "Featured Legacy Moment" and the timeline's Sealed / Achieved / Rank rows never appear (nothing writes them). `legacy-live.ts:148-160`.
- H31 ✅ 0260 applied + update #5 (was the parked 0257) · The public profile's weight-loss goal bar is full on day 1. Branch `wip/goal-direction` `371c066a`; its migration needs a new number (0257 is taken).

**Nutrition**
- H32 ✅ update #3 Workout Complete → Meal → log a food closes Workout Complete; unsent share choices are lost. `food-detail.tsx:243-244`; `create-food.tsx:355`; `meal-photo.tsx:141`.
- H33 ✅ update #4 An under-18 with a manual target can use the meal planner (the birth year is never saved on that path). `nutrition-targets.tsx:213-217`; `nutrition-live.ts:1424`.
- H34 ✅ 0260 applied + update #5 A Free user can't open their own saved recipe (the whole screen sits behind the planner gate); delete is gated too. `recipe.tsx:562-567`; `0244:91-94`.
- H35 ✅ update #3 A cold start with no signal hides the Nutrition tab, so offline logging can't be reached. `app-tabs.tsx:68-92`; `entitlement.tsx:76`.

**Account / Paywall**
- H36 ✅ update #2 Delete Account doesn't say an App Store subscription keeps billing (Apple's deletion guidance). `account-settings.tsx:413-422`.

## 🧭 UX SWEEP 11-09 — new Blockers (B10–B16) and Highs (H37–H70)
Detail, evidence and fix ideas: `Docs/QA/UX-Sweep-2026-11.md` (ids UX-001…). Triage on the sweep triage page.

Found by the 11-09 UX sweep: 24 lanes on `feat/build11` @ `f705f9d2` (update #5) plus the first-launch bundle `e33f79c6`; run live on web in both themes, with fault injection, and re-checked by independent verifiers.

### ⛔ BLOCKERS — rows B10–B16
| # | Area | What the user sees | Where | Lane | Status |
|---|---|---|---|---|---|
| B10 | Privacy | Anyone, with no account, can list the progress-photo files in `transformation-media`, then open each by its public URL. `0044` gave the bucket a select policy with no owner check; P0-6 assumed blind enumeration was impractical, and listing makes it trivial | `0044_transformation.sql:38-39` | SQL | ⬜ UX-007 |
| B11 | Privacy | Deleting a progress set (or a squad post) deletes the row only. Its photos stay at their public URLs, and even account deletion misses them, while the confirm says they "will be permanently removed… This can't be undone" | `transformation-live.ts:256-261`; `transformation.tsx:127-141,322`; `transformation/[id].tsx:108-118,317` | JS + one-time storage cleanup | ⬜ UX-001 |
| B12 | Privacy / Settings | When a settings read fails, Profile Visibility, Preferences and Notifications show the code defaults, and the next tap saves the whole column. Photos "Only me" can become "Friends", and preferences are overwritten. No error is shown | `settings-live.ts:22-28`; `profile-visibility.tsx:43,48,100-106`; `profile-visibility.tsx:54,78` | JS | ⬜ UX-003 |
| B13 | Nutrition | Meal Plan: if the recipes or the stored week fail to load, it draws a new week and saves it over the real one. Locks, logged-meal links and a cleared week are lost; re-logging then double-counts | `meal-plan.tsx:145-149`; `meal-plan.tsx:157-165`; `meal-plan.tsx:175-177` | JS | ⬜ UX-002 |
| B14 | Holt / Programs | Holt's START IT NOW skips the "This ends your current program" question when the active-program read is slow (>4 s) or fails, and permanently ends the running program (same harm as 09-26 F1) | `forge/CoachChatSheet.tsx:2999-3031`; `forge/CoachChatSheet.tsx:1249`; `forge/CoachChatSheet.tsx:1270-1275` | JS | ⬜ UX-006 |
| B15 | Workout | Kg athletes: "Continue this workout" brings saved sets back as pounds in the kg fields; Finish converts them again and writes a false PR (132.28 kg → 291.62 lb). Fix also deletes qa1109-06's false PR | `continue-workout-live.ts:112`; `workout/save.ts:416`; `workout/metrics.ts:171` | JS | ⬜ UX-004 |
| B16 | Workout | "Continue this workout" opened from Activity History overwrites a second workout that is still open, with no prompt; its logged sets are gone | `workout-complete.tsx:1613-1621`; `activity/[id].tsx:214` | JS | ⬜ UX-005 |

### 🔴 HIGH — bullets H37–H70

**First launch / Account**
- H37 ⬜ ⏸ PO decision (build 12 or accept). Every new install runs its whole first session on the 09-29 bundle, so none of the launch fixes reach a brand-new athlete until the second cold start. `app.json:140-142` (updates: url only, so the first launch runs the embedded bundle); embedded `goals-live.ts:222`. (UX-009 · before release)
- H38 ⬜ No signal at launch: the app can't open. Since update #6 it says 'Still connecting…' with Try again, but there is still no way to train offline. `profile.tsx:49-54`; `profile/live.ts:15-18`; `route-for.ts`. (UX-020)
- H39 ⬜ Switching accounts on one phone deletes the previous athlete's unsaved workout, and the Sign Out confirm says nothing is lost. `first-run.ts:90`; `first-run.ts:71-73`; `auth.tsx:104-107`. (UX-041)
- H40 ⬜ Profile Visibility: switching 'Help improve Forge' reverts an Auto-post choice made on the same screen; the server goes back to Off while the row still says Friends. `profile-visibility.tsx:54,88`; `auto-post-live.ts:29-42`; `preferences.tsx:80,95-98`. (UX-036)

**Workout / Cardio**
- H41 ⬜ Regression of 09-26 workout-15. iPhone SE: the first set is hidden under the footer when an exercise opens (the workout-15 fix doesn't hold). `workout.tsx:3495`; `workout.tsx:245`; `workout.tsx:4557-4680`. (UX-008 · before release)
- H42 ⬜ Regression of the 11-08 "Checked and working: finish and save (and the offline queue)". Offline, Finish never reaches the offline queue and says 'Couldn't save — Not signed in.. Try again.'; the same false 'Not signed in.' blocks offline runs, invites, comments, posts and Holt's Save for later. `workout/save.ts:60-63`; `workout/pending-save.ts:113-116`; `workout.tsx:2585-2612`. (UX-016 · before release)
- H43 ⬜ Kg athletes: the set sheet pre-fills last session's POUNDS into the kg field, and real PRs are never celebrated. `workout.tsx:2315-2320`; `workout.tsx:1862-1863`; `workout.tsx:3372`. (UX-021)
- H44 ⬜ One tap on a set's trash deletes a logged set, with no confirm and no undo. `workout.tsx:2220-2227`; `workout.tsx:3854`; `workout.tsx:6676-6688`. (UX-022)
- H45 ⬜ History and Activity Detail show every distance in raw stored miles: a 1000 yd swim reads "0.6 mi · 44:00 /mi", and a metric 5 km run reads "3.1 mi". `activity/detail-core.ts:147-160`; `activity/detail-core.ts:286-321`; `activity/history-core.ts:125-143`. (UX-023)
- H46 ⬜ "Discard this walk / run / ride" deletes a GPS-measured bout in one tap, with no confirm and no undo. `workout/CardioBlockCard.tsx:1378-1388`; `workout/CardioBlockCard.tsx:1181-1189`. (UX-037)

**Whole app**
- H47 ⬜ A failed read looks like a real answer on about 55 screens: Home says 'Nothing planned' to an enrolled athlete, Squads shows the day-0 pitch, the planner sends a planned athlete back to 'Your first plan'. `(tabs)/index.tsx:378`; `(tabs)/index.tsx:406`; `(tabs)/index.tsx:850`. (UX-019)
- H48 ⬜ Every toast freezes the whole screen beneath it for 2–3 seconds, because the toast is a full-screen Modal. `forge/composites/Toast/Toast.tsx:59-75`; `useCeremony.tsx:393`; `home-gym.tsx:221`. (UX-031)
- H49 ⬜ VoiceOver can't reach buttons inside tappable cards: Holt's close and replies, Join, favourites, quick Add, Copy yesterday, and the squad picker (11 places). `forge/CoachSays.tsx:108`; `forge/TrainingNowSheet.tsx:56`; `(tabs)/squads.tsx:217`. (UX-032)
- H50 ⬜ Hold to Seal can't be done with a tap: VoiceOver, Switch Control and Voice Control users have no direct way to seal. `workout-complete.tsx:1093`; `workout-complete.tsx:1186-1191`; `workout-complete.tsx:734`. (UX-015 · before release)
- H51 ⬜ Alabaster: selected chips and pills are dark brown on dark brown and can't be read (Log Food's filter, Food Detail's unit and meal, Log from Photo, the Transformation date picker). `log-food.tsx:711`; `log-food.tsx:753`; `food-detail.tsx:605`. (UX-010 · before release)

**Programs / Templates / Holt**
- H52 ⬜ Two Holt doors on pushed screens do nothing ('BUILD IT WITH ME' on a graduated program, 'Not sure which one? Ask Coach Holt' on All Programs), then Holt pops open by itself on the next tab. `forge/CoachBubble.tsx:37`; `forge/CoachBubble.tsx:453`; `program/[id].tsx:1043`. (UX-011 · before release)
- H53 ⬜ Free athletes lose their one lifetime Holt program by tapping 'Start over', 'Adjust with Holt' or 'Ask me again' on the draft Holt shows them. `coach.tsx:323-332`; `forge/CoachChatSheet.tsx:897-911`; `forge/CoachChatSheet.tsx:3050`. (UX-012 · before release)
- H54 ⬜ Race plans prescribe easy runs as if the athlete runs 7 days a week — sessions add up to ~65–70% of the week's stated miles, and PEAK WEEK is false. `coach/rulebook/endurance.ts:1253-1256`; `coach/rulebook/endurance.ts:1402-1416`. (UX-025)
- H55 ⬜ Max-lift gate loops: "Save what you can and start anyway" can't be done; a %-based program won't start until every max is filled. `program/[id].tsx:820`; `forge/LiftMaxSheet.tsx:115-116`; `forge/LiftMaxSheet.tsx:268`. (UX-038)
- H56 ⬜ Guided "Build my days" and "Change exercises in the full builder" silently overwrite a half-built program draft. `program-guided.tsx:255-265`; `program-guided.tsx:276-283`; `program-import.tsx:374-385`. (UX-039)

**Train Together / Squads / Friends**
- H57 ⬜ Squad invites send everyone to the web preview and never mention the iPhone app; the forgelegacy:// line is raw text. `squad-invite.tsx:59-72`; `app.json:8` (scheme only, no associatedDomains). (UX-013 · before release)
- H58 ⬜ Regression of H5: an accepted Train Together ask that never became a session tags the next solo workout, and the squad post tells the partner "Trained with" them. `workout/partner-credit.ts:60-65`; `train-together-live.ts:378-421`; `workout.tsx:1161-1162`. (UX-018 · before release)
- H59 ⬜ ⏸ PO decision (hide the box for friends, or widen the policy). Join Workout: the message to a training friend always fails unless you share a squad, and the error blames a rate limit. `workout-join.tsx:357-400`; `workout-join.tsx:258-275`; `cheers-live.ts:20`. (UX-024)
- H60 ⬜ Removing a member doesn't keep them out: the invite link they joined with lets them straight back in. `squad/[id].tsx:404-440`; `squad-live.ts:672-675`. (UX-035)

**Legacy / Goals / Progress**
- H61 ⬜ Kg athletes get pound goals: lift, volume and bodyweight goals are saved and tracked in lb, and the typed starting weight is logged as a lb weigh-in. `goals.tsx:80`; `goals.tsx:592`; `goals.tsx:707`. (UX-014 · before release)
- H62 ⬜ A body-measurement goal with no tape reading shows 100% and a full bar from the day it is set. `goals/goals.ts:179-183`; `goals.tsx:592,820`. (UX-026)
- H63 ⬜ A chapter's TIMELINE section shows the athlete's three newest events from any chapter, so a sealed chapter's permanent record lists another chapter's achievements. `chapter-detail-live.ts:130`; `legacy-live.ts:279-286`; `chapter/[id].tsx:460-470`. (UX-027)
- H64 ⬜ Progress-photo card footer collapses ('Clau / de', stats in a 30-pt column) and the exported image overlaps its text. `forge/ProgressPostCard.tsx:84-89`; `progress-image.web.ts`. (UX-028)
- H65 ⬜ A weigh-in can never be corrected or deleted, and the sheet accepts any number (1850 lb saves). `forge/LogWeightSheet.tsx:37-38`; `body-metrics-live.ts:105`; `forge/BodySection.tsx:174,190-205`. (UX-029)

**Free tier / Paywall**
- H66 ⬜ Regression of B5: its guards can never fire. The training-week (short program) allowance is invisible to the app: the 4th one-week program is refused only at Create Copy, with the error off-screen. `0244_nutrition_free_logging.sql:96-150`; `entitlement-live.ts:131`; `program-builder.tsx:306,689`. (UX-017 · before release)
- H67 ⬜ Every Free limit reads usage frozen at app launch: a Free athlete created a 2nd squad, and one with 0 squads was told they had hit the 1-squad limit. `entitlement.tsx:107-146`; `useQuery.ts`; `(tabs)/squads.tsx:80-83`. (UX-030)
- H68 ⬜ P-8 promises a 7-day free trial to everyone, including Apple IDs that Apple will charge at once (lapsed subscribers, Premium → Premium AI upgrades). `billing-store.native.ts:33-52`; `subscription.tsx:315-316,540-544,982`. (UX-040)

**Copy that makes a false claim**
- H69 ⬜ The Auto-post sheet says notes are never auto-posted, but auto-post uses the sealed note as the post's text. `forge/AutoPostSheet.tsx:175-178`; `auto-post-live.ts:159-166`; `share/auto-post.ts:19-31,115-117`. (UX-033)
- H70 ⬜ Regression of 09-26 F5 (fixed in the policy, not the map). Route-map pins still say "the first/last 200 m are trimmed for privacy" on routes that are saved whole. `workout/RouteMap.tsx:133-142`; `activity/[id].tsx:408-413`; `run/route-region.ts:72-90`. (UX-034 · before release)

### Checked and working — corrections
- **Workout: "finish and save (and the offline queue)"** no longer holds offline: Finish never queues (H42 above). Move it out of "Checked and working".

### 📱 Phone script
The sweep's device checks are in its `phone-script-additions.md` (P1 ≈ 44 min: fresh install, no signal, kg account, SE, Alabaster outdoors, VoiceOver, two accounts on one phone).

## 🟡 POLISH — after release unless trivial
- **Train Together:**
  - Inviting from inside a workout tags the person before they answer.
  - Accepting a withdrawn ask still "succeeds".
  - Joining a host with no exercises still opens the picker.
  - Timed holds and sections are lost in the shared copy.
  - A walk invite reads "1 lift · 1 set".
  - The inbox join row's copy is backwards.
  - A failed partner read looks like having no friends.
  - Accepting from a second device fails.
- **Squads:**
  - Acknowledge kinds do nothing on pinned posts.
  - The owner can't call off a member's competition.
  - There is no Leave on a competition.
  - Discover request dead-ends on a commitment.
  - "Request Sent" silently withdraws.
  - A transformation share sends less than its preview.
  - A failed "Remove goal" is silent.
  - "Copy link" claims Copied on failure.
- **Friends:**
  - Friends-feed reaction kinds disagree with the squad feed and Inbox.
  - The "Squad Invitations" switch does nothing.
  - "See what they did" opens the profile, not the workout.
  - There's no banner when iOS notifications are denied.
- **Programs:** the template cap is client-only; it's bypassed by Duplicate and starter templates.
- **Workout:**
  - The seal screen says "Under Iron · Volume 0" for a walk.
  - Library elliptical / stair rows open a Run form.
  - "Continue this workout" can fail silently.
- **Legacy:**
  - A sealed chapter shows a check mark on an unmet goal.
  - Sealed chapters have no dates (`end_date` is never set).
  - A first-ever lift counts as a PR.
  - Seal and achieve play no ceremony until the next workout.
  - A failed transformation read looks empty.
  - A goal save fails silently offline.
  - Progress month and streak use UTC days.
- **Nutrition:**
  - An offline barcode scan says "no match" and invites a duplicate.
  - "Save as meal" on unticked planned food claims saved.
  - A plan meal stays ticked after its row is deleted.
  - A refused meal-photo Log is silent after the credit is spent.
  - Export misses a downgraded athlete's plans.
  - The barcode cache almost never answers.
  - Editing a custom food changes "1 cup" to "240 g".
  - Offline recents say "not in the catalogue".
  - Recipe → "How much did you eat?" logs into the wrong meal.
  - Holt's Kitchen can log past a declined consent.
  - "Add a picture" copy shows to non-AI accounts.
- **Account:**
  - The weekly-review gate has no "See Premium".
  - Web auto-opens a paywall that can't sell.
  - Sign-up stalls silently if email confirmation is on.
  - The onboarding finish error reads badly.
  - Home Gym save fails silently.

## 📅 RELEASE-DAY items found by this pass (add to checklist §6)
- **B1 visibility defaults** back to P-6 for new sign-ups.
- **`0189` also set squad training alerts on for everyone** ("testing posture").
- **"Free during the beta" on the landing site** (`site/index.html:208,228,708,735` + JSON-LD price 0, line 37). `site/terms.html` is already fixed.
- **`LEGAL.membership` "free while testing"** (`content.ts:26-37`) is dead text, and nothing opens it. Delete it with `content.test.mjs:168` in the Phase F pass.

## Checked and working (no action)
- **Train Together:** all five ways to ask to join, and every accept/decline direction. Both phones credit both athletes. The guest gets program credit, and web polls the banner.
- **Squads:**
  - create, invite, request/approve, transfer, remove, leave, delete;
  - discussion / PR / recap / transformation posts, comments, react, pin/edit/delete;
  - report a post or squad, block from a profile;
  - competitions that start now, through to the podium.
- **Notifications:** all 24 Inbox types route to real screens, and deleted targets show a not-found state. Friend requests work both ways.
- **Programs:** catalogue → Start, move/skip/reorder, sharing, form-check and photo-import gates, paste import.
- **Workout:**
  - cardio pills, Build as you go, supersets, finish and save (and the offline queue);
  - a killed GPS walk restores;
  - mile markers.
- **Nutrition:** gates agree with 0244 for Free/Premium, the math, offline writes, the Home card.
- **Account:**
  - sign in/out, delete account, export, legal links;
  - dev screens closed in production;
  - restore purchases.

---

## 📱 Phone script — the PO + one other phone (about 45 min)
Do this on build 11 after the update arrives: close and reopen the app, usually twice. Tick each line, and note what moved or what was wrong.

**Two phones, you (A) and your wife (B)**
- ⬜ A starts an Outdoor Walk → B taps Join on A (Home, Your Circle) → A taps Let them in. B lands on an Outdoor Walk with GPS running and A tagged (not the picker).
- ⬜ The same, but A invites B from inside the walk (⋯ → Invite) → B accepts from the push or Inbox. B opens the walk (B taps Start; invites don't auto-start).
- ⬜ A is lifting (Squat) → B asks to join → B lands on Squat.
- ⬜ Both finish. Each workout says "Trained with" the other.
- ⬜ B force-quits mid-walk and reopens. The walk continues and doesn't double.

**Photo post**
- ⬜ Finish a workout → Photo → add one → tick a squad. "Stats on the photo" is already chosen → SAVE & SHARE. The squad feed shows the picture with the numbers on it.
- ⬜ The next workout starts on the same choice.

**Phone-only features**
- ⬜ A background walk past 1 mile/km: the chime and the spoken split play with the phone locked.
- ⬜ A push arrives for a squad post and a comment; tapping each opens the right screen (once).
- ⬜ Form check on one set (Premium AI account).
- ⬜ Barcode a food, and log a meal by photo.
- ⬜ The watch shows the set; Apple Health import screen.
- ⬜ Share a workout picture to Instagram Stories.
- ⬜ `purchase@test.com` (Free): the paywall shows plans; sandbox buy, then restore.

### ➕ Added by the UX sweep (11-09) — detail in `Docs/QA/UX-Sweep-2026-11.md`
- ⬜ **Two accounts on one phone (B9):** sign out of account A, sign in as B, then force-quit and reopen. It must open on B within about 3 s, with no "Still connecting".
These add to the 45-minute phone script in `Docs/QA/Launch-QA-2026-11.md`. Don't repeat what is already there (two-phone walk join, photo post, background walk chime, push taps, form check, barcode, watch, Instagram, sandbox purchase).

249 device checks came in from 22 lanes. Duplicates are merged here, and each line names the finding it proves.

**What you need:** build 11 on your phone with update #9. An iPhone SE or 13 mini (or Display Zoom on). A QA account set to Kgs. A Free account (`purchase@test.com`). A second phone or account for one check. Network Link Conditioner (Settings → Developer) helps for P1-B.

Tick each line. Note what moved or looked wrong.

---

#### P1 — before pressing Release (about 44 min)

##### A. Fresh App Store install (8 min) — UX-009
- ⬜ Delete the app and install it from the App Store. On first launch, read the Welcome button: "Begin Chapter I" means the 09-29 bundle, "Get Started" means the OTA. Note the update id in diagnostics.
- ⬜ Create an account with a **7-character** password. Note whether it is accepted (09-29 accepts it; the OTA refuses).
- ⬜ Onboard in Forge. Add a goal "Lose weight to 180", then update it to 195. It must **not** show Achieved (B8 is still in the 09-29 bundle).
- ⬜ Force-quit and reopen. The Welcome/Home and diagnostics should now show the OTA. Write down both update ids.

##### B. No signal and weak signal (10 min)
- ⬜ Airplane mode → force-quit → open. Within 6 s it should say "Still connecting…" with Try again. Is there any way to start a workout? (Expect none — UX-020.) Signal on: Home within ~2 s.
- ⬜ Mid-workout with 1 set logged: airplane mode → Finish Workout → End workout. Expect Home and "Workout saved. It'll sync when you're back online." Wrong: "Couldn't save — Not signed in.." (UX-016). Signal on, reopen: the workout is in Activity History **once**.
- ⬜ Airplane mode, cold start, open Nutrition on an account that already agreed. The diary must show, not "Nutrition needs your OK" or a consent sheet (UX-165).
- ⬜ Network Link Conditioner "Very Bad Network", a program running: Holt → A program → build → START IT NOW. The "This ends your current program" sheet must appear (UX-006).
- ⬜ Same network, a Premium planner account with a locked meal and a logged meal: open Meal Plan. The lock and the ✓ must still be there, and the diary must have ONE row (UX-002).

##### C. Kg account (6 min)
- ⬜ An account that lifted in lb, now on Kgs: open a lift and tap Weight on set 1. The sheet must open on last time's kilos (≈61), not 135 (UX-021).
- ⬜ Log 60 kg × 5, Finish → View details → "Continue this workout" → Resume. Set 1 must read 60 (web showed 132.277…). Log another 60 × 5 and Finish: there must be **no** new PR (UX-004).
- ⬜ Goals → Add → A lift → Back Squat, target 100. The goal must read kg, not "100 lb". Bodyweight goal: the starting-weight label must say kg (UX-014).
- ⬜ Activity History → Log a 5 km run. History and Detail must read 5.0 km, not 3.1 mi (UX-023).

##### D. iPhone SE (5 min)
- ⬜ Open any exercise. Set 1's check is visible and tappable without scrolling (UX-008).
- ⬜ Day-0 Home at rest: tap the right end of START A WORKOUT. It must start a workout, not open Holt (UX-044).
- ⬜ Finish a program day with a long name: HOLD TO SEAL on screen without scrolling; View details reachable (UX-116).

##### E. Alabaster, outdoors or by a window (5 min)
- ⬜ Log Food → the selected RECENT filter, Food Detail → the selected unit pill, and "Adding to" → the selected meal. All readable at arm's length? (UX-010)
- ⬜ A friend's profile: Add Friend / Accept / Decline / Train With readable? The tab-bar labels and dates readable? First Workout Complete: HOLD TO SEAL readable? (UX-043, UX-046)
- ⬜ App Alabaster with iPhone Dark Mode, then Forge with iPhone Light Mode: status-bar text readable on Home, a pushed screen and an open sheet; keyboard colour matches the app on Join a Squad's code field; note any dark or white flash at launch (UX-072).

##### F. VoiceOver (5 min)
- ⬜ First Workout Complete: double-tap "Hold to Seal". Does it seal? (Expect no — UX-015.) Then double-tap-and-hold.
- ⬜ Home: can you reach the Close button and the reply chips on Holt's bubble? Squads tab: can you reach a squad card's star? Log Food: can you reach "+ Add"? (Expect no — UX-032.)
- ⬜ VoiceOver off. Settings → Profile Visibility → Reset to defaults → Reset, then tap Back within 1 s. It must respond at once (UX-031).

##### G. Accounts, invites, privacy copy (5 min)
- ⬜ One phone, two QA accounts: as A start a workout and log 2 sets → Settings → Sign Out → sign in as B → sign out → sign in as A. Is A's workout gone? Did the Sign Out confirm warn you? (UX-041)
- ⬜ On a phone **without** the app, tap a squad invite in Messages. Where does it open; is the App Store offered? On a phone **with** the app: does the https link open the app or Safari, and is the forgelegacy:// line tappable? (UX-013)
- ⬜ Activity → a run with a map → full map → tap the start pin and the finish pin. The callout must **not** say "trimmed for privacy" (UX-034).

---

#### P2 — week 1 (about 60 min, any order)

**Logging and cardio**
- ⬜ Three sets showing: tap set 3's trash. Does Holt open instead? Tap the right edge of the live set's check 5 times: is any set deleted? (UX-044, UX-022)
- ⬜ Outdoor walk 0.3 mi → End walk → Cancel. Is "Discard this walk" one tap with no confirm, right under "Log walk"? (UX-037)
- ⬜ After a real outdoor run, compare the card's time and AVG /MI with Activity Detail. Do they match? (UX-112)
- ⬜ iPhone SE: Start a Workout → Treadmill. START TIMER visible without Holt's coin; SAVE RUN reachable after End run (UX-114).
- ⬜ Plank circuit → Start timer; lock the phone 2 min, unlock. It should have advanced, or say it paused (UX-174).
- ⬜ Leave a workout open overnight; next morning Continue → End workout. Check Under Iron and what Apple Health got (UX-111).
- ⬜ Finish workout A; start B and log 2 sets; Back; Activity History → A → Continue this workout. B must not vanish (UX-005).
- ⬜ Start a program day without logging a set; let iOS evict the app; tap the Live Activity. The program day must come back, not an empty Freestyle (UX-173).
- ⬜ Set sheet: decimal pad has no Return key. On SE, can you go Weight → Reps → LOG SET without dismissing the keyboard?
- ⬜ A join request arrives while the set sheet keyboard is up: can you still reach Log Set and the banner's buttons? (UX-082)

**Finish and share**
- ⬜ Auto-post on (Profile Visibility → My Squad). Finish, hold to seal, Seal the Note "QA1109 private line", swipe the app away on the capture stage. Reopen: is there a squad post within a minute, and is the note its text? (UX-083, UX-033)
- ⬜ Outdoor GPS run → capture → tick Friends: is "Include the map" offered? (UX-117)
- ⬜ Share Transformation → Share… on iPhone: does the share sheet carry the picture or only the sentence? (UX-144)
- ⬜ Progress Photo Post with the default chapter name: footer name on one line; Save → Photos shows stats and chapter without overlap (UX-028).
- ⬜ After the UX-001 fix: delete a progress set, then open one of its old photo URLs in Safari. It must not load.

**Free tier and paywall** (`purchase@test.com`)
- ⬜ Squads → Create a squad → Back → Create a Squad again without closing the app. A second squad must not be possible (UX-030).
- ⬜ Form Check → See Premium AI. The Premium AI tab should be selected (UX-146).
- ⬜ Holt → A program → answer → on the draft, tap Start over. Is the lifetime Holt program spent? (UX-012)
- ⬜ A sandbox Apple ID that already used a Premium trial: Subscription → Premium AI. Does the button promise "Start 7-day free trial"? Does Apple charge at once? (UX-040)
- ⬜ Buy Premium yearly (sandbox) from an M-7 → close Subscription. The blocked action works without restarting the app.
- ⬜ Free: start any workout. Is the Holt coin there mid-set? (UX-147, a PO decision)

**Holt**
- ⬜ A graduated program → What's Next → BUILD IT WITH ME, and All Programs → "Ask Coach Holt". Does Holt open on that screen? (UX-011)
- ⬜ Start Squat Ascent; fill only Back Squat; Save; Start again. Does the max sheet come back? (UX-038)
- ⬜ VoiceOver: open Holt's sheet and swipe past CLOSE and the last row. Focus must not reach Home behind it (UX-088).
- ⬜ iPhone SE: Holt → Check my form → choose a clip. Filmstrip and both handles above SEND TO HOLT; both handles drag (UX-179). The trim shows the clip's real length (UX-182 is web-only).
- ⬜ Typed question, force-quit while Holt is thinking, reopen: answered or flagged as lost? (UX-180)

**Builders**
- ⬜ Workout Builder → Add a cardio block (SE and 14): icons drawn, or words like "shoe"? Can you scroll to and add Swim? (UX-124, UX-125)
- ⬜ Full builder: name a program, fill Day A, ✕ → Keep Draft. Then Build a Program → Build from scratch → … → Build my days. Is Day A still there? (UX-039)

**Legacy and goals**
- ⬜ Waist goal (Shrink, start 34, target 32) without a tape reading: Goals and the chapter must not show 100% (UX-026).
- ⬜ Weight goal → Progress → Log weigh-in at the target: Goal Achieved at once? Then what does Home's Mission tile say? (UX-091, UX-051)
- ⬜ Sign up a fresh account after 6 pm local and log a workout. Honors and Chapter I "Began" should show today; next morning Home says Day 2 (UX-045).
- ⬜ iPhone SE, day 0: Legacy → Start Your First Chapter. SAVE NAME stays above the keyboard; save with the shown name (UX-047).

**Squads, friends, invites**
- ⬜ A friend who is NOT in a squad with you is training: Join Workout → type a message → send. It should deliver, or not be offered. Wrong: "You may have sent a few already" (UX-024).
- ⬜ Remove a member, then have them open the old invite link. They must not get back in (UX-035).
- ⬜ As a member: Mute Squad on; the owner posts and comments. Does a push still arrive? (UX-092)
- ⬜ Signed out of A, tap a squad invite, sign in as B. Does B land on the squad? (UX-187)
- ⬜ Accept a Train Together ask but don't train together. Hours later start a solo workout: does it say "Training with …"? (UX-018)
- ⬜ Airplane mode: send a comment and a Train Together invite. It should say you're offline, not "Not signed in." (UX-016)
- ⬜ Settings → Delete Account (SE and 14): tap the DELETE field. Can you see what you type and reach the button with the keyboard up? Do NOT confirm. Same for Delete Squad (UX-159).
- ⬜ A forgot-password email opened on the phone: where does it land, and what does it tell you after saving? Sign into the app with the new password (UX-170).

**Accessibility**
- ⬜ Larger Text at the largest non-accessibility size, then AX5: Home, Workouts, Legacy, Squads, Nutrition, Log Food, the set table, Workout Complete, Subscription, Sign-in. Do tab labels collide, does any main label clip, does Log Food's footer leave the screen? (UX-074)
- ⬜ VoiceOver: change a preference to trigger a toast. Is it spoken? Does focus jump into it? A wrong password on Sign-in: is the error spoken? (UX-151)
- ⬜ iPhone Reduce Motion ON: Competition detail, Current Champions, Discover Squads. Do the ember, shimmer and pulses still move? (UX-089)
- ⬜ VoiceOver rotor → Headings on Account Settings and Progress: any headings? (Polish, S3b-09)

---

#### P3 — when convenient (about 25 min)

- ⬜ SF Pro on the phone: "Competitions" at the foot of a squad page and "Accomplishment" on Legacy don't break mid-word; "SAVE TEMPLATE" fits on one line; "Prefer not to say" fits one line on Edit Profile.
- ⬜ Report squad on SE: Send report on screen without scrolling once a reason is picked.
- ⬜ Display Zoom (320): Home's macros and rank name show in full; the Welcome logo isn't cut off; Recipe servings toggle on screen.
- ⬜ A name starting with an emoji ("🔥 Sam Lee"): the avatar initials look right.
- ⬜ Post page: a quick tap on the flame gives Respect with no sheet; press-and-hold opens the four kinds with a haptic.
- ⬜ Inbox "commented on your post": does it open on the comment? (five-second candidate)
- ⬜ Rest timer expires with the app in the background: haptic, sound and the Live Activity arrive on time.
- ⬜ Two phones in one squad with training alerts: A finishes, then continues within the hour. Does B get a second "started training" push?
- ⬜ Morning briefing on with a running program: is the "Next up" push about running or barbell?
- ⬜ Smart Invert: photos, avatars and exercise loops should not turn into negatives.
- ⬜ Launch: native splash → Home with no frame where the tab bar sits on the splash (the coin half was fixed in update #6).
