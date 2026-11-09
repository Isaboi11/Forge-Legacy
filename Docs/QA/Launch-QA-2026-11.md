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

## ⛔→✅ B9 — Stuck on the launch splash on every open (11-09, found live by the PO and Kim; updates #6–#9)
- **What happened:** the app sat on the pillars forever, and a force-quit didn't help.
- **Cause:** the 11-08 fix H15 tagged the boot profile read with the phone's stored `session.user.id`. A phone that had held two accounts kept a stale identity, so every read was judged "someone else's" (`read=mismatch`) and thrown away. Web never shows it.
- ✅ #6 `01a1c090` (`43b71a6e`): the launch covers leave on a timer. After 6 s the app says "Still connecting…" with Try again and Sign out. The profile read is time-boxed, and the Holt coin is off the boot screen.
- ✅ #7 `01a1c0a1` (`fc4ce923`) + `d8b90fd9`: the stall reports itself in `client_errors` (`Boot stall · …`).
- ✅ #8 `01a1c0b6` (`3da8f2bb`): **boot rescue.** At 6 s the app reads the profile itself and opens. This got the PO in.
- ✅ #9 `01a1c0e3` (`5ffccf67`): **the fix.** The read is tagged with the server-confirmed account id; a mismatch refreshes the session and reads again (at most 3 times). A profile shows only when both ids agree.
  - Tested on web: a mixed two-account session corrected itself in 2.6 s. The old build opened as the wrong account.
- ⬜ PO and Kim to confirm a normal open on #9 (open twice).
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
