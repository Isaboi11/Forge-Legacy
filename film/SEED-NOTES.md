# Film seed — demo athlete Jordan (notes for the PO)

**Status:** written, **not applied**. Nothing has been run against any database. The SQL was checked with the real
PostgreSQL parser (libpg_query 17, including every PL/pgSQL body and the SQL inside it); the semantics were checked by
hand against the migrations and the client code cited below. All §3 "expected" values come from a JS mirror of the
same logic (PR detection, `evaluate_honors`, rank-live).

Timezone: **America/Chicago**. Every timestamp in the files has an explicit offset (CST −06 until Sun Mar 8 2026,
CDT −05 after). Sessions start at 06:15–07:30 local, so the UTC date always equals the local date (rank-live and
`honor_metrics` bucket by UTC date) and nothing starts before 06:00 (no hidden "Early Forge" honor).

## 1. Order of operations

| Step | Paste | Then capture (Playwright, `timezoneId: 'America/Chicago'`, clock frozen) |
|---|---|---|
| 0 | `supabase/apply/seed-demo-jordan-0-accounts.sql` (edit the password line first) | — sign in once as jordan.demo@forgelegacy.app |
| 1 | `seed-demo-jordan-1-jan.sql` | **Shots 1–2 · Mon Jan 19 2026**, e.g. 06:20 CST. Today card = "Lower A". Log Back Squat sets; set 4 = 225 × 5 fires NEW PERSONAL RECORD. Do **not** tap Finish (if you do, stage 2 removes it). Clear `forge.activeWorkout.v1` afterwards. |
| 2 | `seed-demo-jordan-2-feb.sql` | **Shot 3 · Tue Feb 10 2026**, e.g. 06:10 CST. Today = "Upper A" (Barbell Bench Press first). Holt chat (live AI, ~2¢ per take). |
| 3 | `seed-demo-jordan-3-mar.sql` | **Shot 4 · Mon Mar 16 2026**, e.g. 08:00 CDT. Newest workout is Sun Mar 8 07:30 → 8 days → Welcome back card: **"Builder II · 47 workouts · 18 honors"**. Calendar: Mar 9–15 bare. |
| 4 | `seed-demo-jordan-4-year.sql` | **Shot 5.** See §6 (rank) before choosing the clock. |
| — | `seed-demo-jordan-REMOVE.sql` | When the film is done. |

Each stage refuses to run before the previous one, and refuses to run after a later one. Re-running the same stage is
safe: it first **rewinds** Jordan to the end of the previous stage, which also removes anything the app wrote during a
capture (a finished live workout, its PR row, a live honor). Seeded rows carry ids starting `f11de000` (RFC-4122 v4
shape, md5 of a label); the rewind deletes Jordan's workout / PR / timeline / program-session / accomplishment rows that
do **not** have that prefix, plus his rows dated on/after the stage's start. It never touches the program row, so
Holt's Feb 10 change (stored in `programs.structure`) survives later stages.

## 2. What each stage writes, and its predicted §3 (the one result the editor shows)

### Stage 0 — accounts
- `auth.users` ×6 + `auth.identities` ×6 (provider `email`, `provider_id` = user id). Jordan: bcrypt password from the
  `fl_secret` line (refuses `CHANGE-ME` or < 10 chars), `email_confirmed_at` set. Squadmates: random unusable passwords.
  The four GoTrue token columns are written as `''` (GoTrue fails sign-in on NULL there).
- `profiles` ×6 minted by `handle_new_user()` (0001:185, trigger 0001:196) from `raw_user_meta_data`
  (name, first_name, handle, initials), then completed: `onboarded_at` — the **only** boot gate
  (`src/lib/route-for.ts:31-37`, read by `src/domain/profile/live.ts:19-23`) — plus athlete_type, environment,
  experience, training_goals, `tz = America/Chicago`, `app_prefs` (imperial, forge theme, holtTips off, autoPost asked),
  `standard`, `discoverable = false`, `created_at` backdated to the signup (Sun Jan 4 2026 20:05 CST).
- `chapters`: each account's Chapter I (as `complete_onboarding`, 0199). Jordan's = **"Chapter I — The Return"**,
  start 2026-01-05 (name format `chapterNameFrom`, `src/domain/legacy/chapter-name.ts:71`).
- `athlete_entitlement` (Jordan): PREMIUM / GRANT / `coach_ai = true` / `coach_ai_until = null` (0203:125 pattern).
- `health_consents` (Jordan): `ai_sharing` + `nutrition` granted at policy `2026-09-25`
  (`src/domain/consent/consent.ts:41-45`). Without these every AI call stops at the MHMDA consent sheet (`gate.ts`).
- `athlete_rank_state` (Jordan): Foundation I.

§3: 6 rows (one per account), every one `confirmed · identity · onboarded · active Chapter I`; Jordan `PREMIUM + AI`,
`consents = 2`; `push_rows = 0` everywhere.

### Stages 1–4 — the year

| | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|---|---|---|---|---|
| Window | Jan 5 → Sun Jan 18 | Mon Jan 19 → Mon Feb 9 | Tue Feb 10 → Sun Mar 8 | Mon Mar 16 → Thu Oct 1 |
| Workouts in stage | 11 | 16 (incl. Jan 19 Lower A, the session filmed live) | 20 | 148 |
| §3 row 1 · saved workouts | 11 | 27 | 47 | 195 |
| row 2 · runs · miles | 3 · 7.1 | 6 · 16.5 | 11 · 33.8 | 47 · 205.3 |
| row 3 · PR rows | 10 | 20 | 30 | 48 |
| row 4 · squat · bench best | 215 · 215 | 250 · 225 | 265 · 230 | 315 · 235 |
| row 5 · honors · uncelebrated | 11 · 0 | 17 · 0 | 18 · 0 | 38 · 1 |
| row 6 · chapters | Chapter I — The Return: 11 active | …: 27 active | …: 47 active | I: 82 sealed · II: 89 sealed · III: 24 active |
| row 7 · program | active · 8 · week 3 Lower A | active · 21 · week 6 Upper A | active · 36 · week 10 Lower A | graduated · 48 · none |
| row 8 · newest workout | Sun Jan 18 07:30 | Mon Feb 09 06:30 | Sun Mar 08 07:30 | Thu Oct 01 06:30 |
| row 9 · stored rank | Foundation II (level 2) | Builder I (level 5) | Builder II (level 6) | Builder IV (level 8) |
| row 10 · Ironside members | 6 | 6 | 6 | 6 |
| row 11 · push rows (demo) | 0 | 0 | 0 | 0 |
| row 12/13 | — | Back Squat 225 × 5 | Back Squat 225 × 5 | 1,000 Pound Club · 2026-05-12 / Back Squat 225 × 5 \| Bench Press 235 |

Every row also shows a `verdict` column (`ok` / `CHECK`). Rows 1, 3, 6, 7, 8, 9, 11 and the stage-4 ceremony honor are
also **hard assertions in §2** (a mismatch raises and rolls the stage back). The honor count (row 5) is a prediction
only: if the live evaluator awards something my mirror did not, row 5 says `CHECK` rather than blocking the stage.

**Story data in the files**

- Program **"Return to Strength"**, 12 weeks × 4 (48 sessions), started Mon Jan 5: A Lower A (Barbell Back Squat 5×5,
  Barbell Romanian Deadlift 3×8, Dumbbell Split Squat 3×8/leg) · B Upper A (Barbell Bench Press 5×5, Barbell Bent-Over
  Row 4×8, Pull-Up 3×8) · C Upper B (Barbell Overhead Press 4×5, Barbell Bench Press 3×8, Cable Face Pull 3×15) ·
  D Lower B (Barbell Back Squat 4×5, Barbell Deadlift 3×5, Lying Leg Curl Machine 3×10). Every key exists in
  `src/domain/exercise-relationships/source/exercises.json` and none is in `HIDDEN_EXERCISE_IDS`
  (`src/domain/exercise-picker/catalog-core.ts:228`). Sessions are mapped Mon/Tue/Thu/Sat in slot order; the program
  graduates on Sat Apr 4 (slot 48). After that Jordan trains the same split freestyle (`program_id` null).
- **Prescribed squat on Lower A**: `percentScheme [54,74,82,90,90]` against `lift_maxes` back squat = 250 lb (entered)
  → **135, 185, 205, 225, 225** (5 lb rounding, `src/domain/program/percent-max.ts:175-211`). The logger prefills a
  percentage set from its own prescription first (`src/app/workout.tsx:2216-2228`, step 0). The PREV column on Jan 19
  shows Sat Jan 17's Lower B squat (135, 185, 215, 215 × 5; set 5 blank) — it reads the newest workout containing the
  lift by `started_at` (`src/data/lift-history-live.ts:143-211`).
- **Back Squat** PR rows: Jan 5 185×5 (baseline), Jan 10 195, Jan 12 205, **Jan 17 215×5** → on Jan 19 the stored best
  is 215. Then Jan 19 225×5 (seeded in stage 2), 235, 245, 250 (Feb 9), 255, 260, 265 (Mar 2); after the break 270,
  275, 280, 290×3, **300×3 (May 4)**, 305×3 (May 18), 310×2 (Jul 13), 315×2 (Aug 3 → "Squat 315").
- **Bench**: 205×5 (Jan 6, baseline) → 215 (Jan 13) → **225×5 (Jan 20)**; then **stuck at 225**: Jan 27 225×5,4,3 ·
  Feb 3 225×4,4,3 (Upper B volume at 195×8 failing reps) — the three weeks Holt reads on Feb 10. Feb 10 225×5,5,4;
  Thursdays become **Paused Bench 4×4 @ 205–215** (notes "Paused — 2-count on the chest") from Feb 12 to the end of the
  block; Feb 17 225×5×3 completed; **Feb 24 230×5**; then 230 holds until **Tue May 12 235×3** (PR row 235 × 3). Bench
  never exceeds 235 afterwards, so "Bench Press 235" stays the record.
- **Deadlift** (Lower B): 275 (baseline) … 315×5 (Jan 24) … 375×5 (Mar 7) … 405×3 (Apr 18) … **465×1 (May 9)**, 475×1
  (Jul 25).
- **Runs**: Wednesdays every training week + 9 Sundays (Jan 18, **Mar 8**, Apr 5, May 10, Jun 7, Jul 5 (6.2 mi),
  Aug 2, Aug 30, Sep 27). 47 runs, **205.3 mi**. Pace 9:45/mi → ~8:52/mi. `activity_type running`, distance in `mi`,
  no exercise rows (the Log-a-Run shape, `src/domain/workout/save.ts:268-291`).
- **No workouts Mon Mar 9 – Sun Mar 15**; the last before the gap is the Sun Mar 8 run; none on Mar 16 in stage 3.
  Stage 4 opens with **Mon Mar 16 Lower A at 06:30 CDT** — Jordan saw the card and trained that day, which is what
  the film implies; shot 4 is captured before stage 4 is pasted.
- Skipped days for realism: Mon May 11, Sat Jul 11, Thu Aug 20.
- **Chapters**: I "The Return" Jan 5 → Apr 30, sealed Fri May 1 19:00 with the reflection *"Came back slower than I
  wanted. Came back anyway."*; II "Stronger Than Before" May 1 → Aug 31, sealed Tue Sep 1 05:45 (*"Stronger than
  before. The numbers say so too."*); III "Still Writing" Sep 1 → active. Every workout is attached to the chapter that
  was active when it was saved; `workout_count` is kept exactly as `save_workout` does (0242:162).
- **Squad Ironside** (private, owner Jordan, motto "Show up.", weekly standard 3). Joined: Jordan Jan 10 12:00, Dre Jan
  10, Sam Jan 11, Alex Jan 12, Taylor Jan 14, Morgan Jan 16. Inserted at the **end** of stage 1. Jordan's
  `notifications_seen_at` is set to Jan 16 08:00 so the five `member_joined` inbox rows (0251:395, unwindowed for the
  owner) do not put a badge on the bell (`notification_unread_count`, 0110).
- **Accomplishments** (athlete-authored, `accomplishments`, 0023): "Back Squat 225 × 5" (Jan 19, Chapter I) and
  "Bench Press 235" (May 12, Chapter II, featured). No notes, so they move no honor metric.

## 3. Tables touched — column evidence

| Table | Columns written | Evidence |
|---|---|---|
| auth.users | instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change | GoTrue schema (not in repo); `handle_new_user` reads raw_user_meta_data (0001:185-194) |
| auth.identities | provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at (`email` is generated, not written) | GoTrue schema (not in repo) |
| profiles | created_at, updated_at, onboarded_at, sex, athlete_type, environment, experience, training_goals, tz, discoverable, app_prefs, standard, rank_family, rank_level, notifications_seen_at | 0001:35-49 · 0007:7-8 · 0022:22 · 0054:20 · 0099:76 · 0114:33 · 0169:31,67 (+checks :39,:75) · `standard` read by honor_metrics (0100) and written by `updateStandard` (`src/data/legacy-live.ts`) |
| chapters | id, athlete_id, name, start_date, end_date, sealed_at, is_active, reflection, workout_count, honor_count, created_at | 0001:52-64 (one active: 0001:66) |
| workouts | id, athlete_id, chapter_id, program_id, workout_name, activity_type, started_at, saved_at, duration_sec, state, distance, distance_unit, created_at (`source` defaults 'forge') | 0001:69-83 · 0018:12 · 0234:72 |
| workout_exercises | id, workout_id, catalog_key, name, section, position (0-based), notes | 0001:87-95 · position base: `src/domain/workout/build-session.ts:40` |
| workout_sets | id, workout_exercise_id, set_index (0-based), weight, weight_unit 'lb', reps | 0001:99-107 |
| personal_records | id, athlete_id, exercise (display name), catalog_key, achieved_on (UTC date), measure_kind 'load', load_value, load_unit 'lb', load_reps, workout_id, created_at | 0001:111-137 · 0078:37 · 0242:42; insert shape 0242:154-155 |
| timeline_events | id, athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type, source_entity_id, created_at | 0001:140-150; ACCOMPLISHMENT shape 0242:156-158; PROGRAM_GRADUATED 0242:215-217; HONOR_EARNED written by evaluate_honors (0099) |
| honor_instances | written by evaluate_honors; then awarded_at, date_earned, celebrated_at updated | 0012:9-20 · 0081:23 · 0112:23 |
| programs | id, athlete_id, name, structure, state, started_at, ended_at, created_at, updated_at, lift_maxes | 0013:9-16 · 0017:21-24 · 0111:106; structure shape `src/data/programs-live.ts:227-244`, `draftToStructure` `src/lib/program-draft-model.ts:776-785` |
| program_sessions | id, program_id, athlete_id, week_index, day_index, state 'completed', workout_id, created_at | 0119:156-169; insert shape 0242:197-199 |
| squads | id, name, description, privacy, owner_id, motto, weekly_standard, created_at, updated_at (invite_code by trigger) | 0029:11-20 · 0030:8 · 0099:95 · 0040:74 |
| squad_members | squad_id, user_id, role, joined_at (notify_* defaults) | 0029:23-29 · 0153:76-77 |
| accomplishments | id, athlete_id, name, date, chapter_id, featured, created_at | 0023:17-27 |
| athlete_rank_state | athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date, updated_at | 0027:14-23 |
| athlete_entitlement | athlete_id, tier, premium_kind, premium_until, coach_ai, coach_ai_until, grant_note, updated_at | 0145:133-161 · 0214:98 |
| health_consents | athlete_id, kind, action, policy_version, platform | 0224:42-50 (+ checks :56-68) |
| push_outbox | only DELETEs (stage 0: the signup alerts filed in the same transaction; REMOVE: rows about demo accounts) | 0120:82-104 |
| athlete_usage | written by the programs cap trigger, Jordan's own row | 0145 / 0158:105-155 |

## 4. Every trigger that fires, and what it does here

| Trigger (latest definition) | Fires on | Effect in this seed | Outside Jordan's rows? |
|---|---|---|---|
| `on_auth_user_created` → `handle_new_user()` (0001:185-197; restore-only in 0199:216) | stage 0 auth.users insert | mints the 6 profiles | no |
| `profiles_moderation_check` (0171:487) | profile insert (handle/name) | passes (no blocked pattern) | no |
| **`push_athlete_signup` → `push_tg_athlete_signup()` (0137:150-205)** | profile insert with name ≠ 'Athlete' | **files one "New athlete — <name> just signed up (@handle)" row per `app_admins` user with a live device — i.e. the PO**, ×6 accounts | **YES — the PO's outbox.** Deleted in the same transaction (`actor_id` = demo, `kind = 'athlete_signup'`, PENDING) before commit, so the 1-minute drain (`forge-push-drain`, 0120:664) never sees them. §2 asserts none remain. |
| `programs_cap_guard_trg` → `programs_cap_guard()` (0145:482; body 0158:105) | stage 1 program insert | upserts/increments Jordan's `athlete_usage.programs_created` (Premium cap 500) | no |
| `push_workout_saved` → `push_tg_training_finished()` (0234:343-348; body 0153:535-560) | every workout insert (state saved, source forge) | stage 1: Jordan is in no squad yet → nothing. Stages 2–4: calls `push_enqueue_for(squadmate)` ×5; each returns 0 because the squadmate has no `push_baseline_at` and no push token (0246:33-36) | no |
| `push_squad_members` → `push_tg_squad_members()` (0120:422-444) | stage 1 membership inserts | `push_enqueue_for(owner = Jordan)` → 0 (no baseline, no token; web never registers a token, `src/lib/push.tsx:57-58`) | no |
| `squads_set_invite_code_trg` (0040:74; definer 0161) | squad insert | sets `invite_code` | no |
| `squads_tell_members_deleted` (0251:266) | squad delete (stage-1 re-run, REMOVE) | members are deleted first, so it finds nobody to notify | no |
| `programs_guard_structure_trg` (0123:126), `programs_live_edit_guard` (0175:88) | `update of structure` only | **never fires** — the seed writes structure on INSERT and only updates `state/ended_at` (graduation) | — |
| `workouts_source_immutable` (0234:121) | `update of source, external_id` | never fires | — |
| `push_training_started` (0153:529) | `update of training_since` | never fires (the seed never touches it) | — |
| `squads_goal_lifecycle` (0200:527) | `update of goal…` | never fires (no goal) | — |

**Functions called**: `public.evaluate_honors(p_source text default 'live_session') returns jsonb` (latest body
0099:544, grant 0150:64), called acting as Jordan once after every seeded workout / seal / the squad. Side effects: it
inserts `honor_instances` and (for `'live_session'`) one `HONOR_EARNED` timeline row per honor, and calls
`archive_squad_goal()` per squad, which returns false without a goal (0101:39-75). Nothing else. Act-as: transaction-
local `set_config('request.jwt.claim.sub', …)` + `request.jwt.claims`, cleared after each call (the
`squad_goal_act_as` shape, 0200:174-186). `honor_metrics.account_days` is `current_date − profiles.created_at` (0100),
so `created_at` is shifted for the length of each call to make "90 Days Forging" land on the day Jordan actually hit
90 days (Apr 5), then restored. New rows are found by `awarded_at = now()` (the transaction start, which no backdated
row can equal), backdated to the triggering workout's `saved_at` (what the Workout Complete screen matches on,
`src/data/workout-complete-live.ts`), marked celebrated at that moment — **except `club_1000`** — and the timeline rows
are moved and re-keyed to a seeded id.

**Other things that are NOT side effects but you should know**: `/admin` signups and the daily metrics rollup will count
six more athletes (there is no exclusion flag). `discoverable = false` keeps all six out of athlete search; the squad is
private.

## 5. Honors (all genuinely earned by the evaluator's rules; dates = when the threshold was crossed)

Stage 1 (11): First Workout Logged · First Personal Record · My Standard (Jan 5) · Again · Bench 135 (Jan 6) · First
Week · First Mile Run (Jan 7) · Overhead Press 95 (Jan 8) · Squad Founder · Not Alone (Jan 10) · 10 Workouts in a
Chapter (Jan 17).
Stage 2 (+6 = 17): Squat 225 (Jan 19) · Bench 225 (Jan 20) · First 5K Run (Jan 21) · Deadlift 315 (Jan 24) · 25 Workouts
Logged · 25 Workouts in a Chapter (Feb 5).
Stage 3 (+1 = 18): Overhead Press 135 (Feb 12).
Stage 4 (+20 = 38): 10 Active Weeks (Mar 16) · 50 Workouts Logged · 50 Workouts in a Chapter (Mar 18) · First Program
Graduated (Apr 4) · 90 Days Forging (Apr 5) · Deadlift 405 (Apr 18) · First Chapter Sealed · First Reflection (May 1) ·
**1,000 Pound Club (Tue May 12 — left uncelebrated)** · 10 Workouts in a Chapter, Ch II (May 14) · 100 Workouts Logged ·
100 Squad Workouts (May 26) · 25 Workouts in a Chapter, Ch II (Jun 4) · 100 Hours Forged · 100 Lifetime Running Miles
(Jun 10) · One Million Pounds (Jun 30) · First 10K Run (Jul 5) · 50 Workouts in a Chapter, Ch II (Jul 7) · Squat 315
(Aug 3) · 10 Workouts in a Chapter, Ch III (Sep 14).

**The ceremony honor:** display_name **`1,000 Pound Club`** (honor_type `club_1000`, category Strength, metric
`combined_lifts` ≥ 1000 = best bench + squat + deadlift from `personal_records`, `lift_best_lb` 0078:119). Before May 12:
230 + 300 + 465 = 995. The bench 235 × 3 on Tue May 12 makes it 1,000 exactly — the honor is genuinely *caused* by the
bench 235. (No bench milestone exists at 235: the ladder is 135/225/315/405.) No evaluation awards ≥ 3 new honors across
≥ 3 categories at once, so the hidden "Triple Threat" is never triggered.

## 6. Rank — predicted on each capture date (rank-live, `src/data/rank-live.ts:52-115`, thresholds `src/domain/rank/thresholds.ts:126-175`)

| Capture | Computed (frozen clock) | Stored by the seed | Ceremony? |
|---|---|---|---|
| Mon Jan 19 | Foundation II (2 active weeks) | Foundation II | none |
| Tue Feb 10 | Builder I (6 AW, 27 sessions) | Builder I | none |
| Mon Mar 16 | **Builder II** (9 AW) — the Welcome back line | Builder II | none |
| Tue May 12 (frozen) | **Craftsman I** (18 AW, 127 days, 48 PR rows) | Builder IV | **RANK ASCENDED · Craftsman I** (previous Builder IV) |
| ~Oct 2 (real) | **Craftsman IV** (38 AW) | Builder IV | RANK ASCENDED · **Craftsman IV** |

**Craftsman I on ~Oct 2 is impossible with this year.** Craftsman I = 18–21 active weeks; Jordan has 38 by Oct 1
(Craftsman II starts at 22, IV at 32). Architect is blocked only by `goalEvents ≥ 1` (a goal on a sealed chapter), and
no goals are seeded. A one-family-per-refresh cap (`rank-live.ts:232-236`) lands on the earned sub-tier, so stored
Builder IV → computed Craftsman IV shows "Craftsman IV".

**Closest honest option (what the files are built for):** Jordan genuinely crosses Builder IV → Craftsman I in the week
of May 11: Builder IV from Apr 27 (16 AW), and his first session of the week of May 11 is the Tue May 12 bench 235 —
the same session that earns the 1,000 Pound Club. So:

1. After stage 4, capture shot 5's **two ceremonies with the clock frozen at Tue May 12 2026, 08:30 CDT** (any time from
   07:30 May 12 through Sun Jun 7 computes Craftsman I: rank-live clamps every later session onto "today",
   `rank-live.ts:58-59`). Both ceremonies fire on the first tab focus (`src/hooks/useEarnedMoments.ts:77-132`); their
   order is whichever read returns first. Use only the ceremony overlay — the screen behind it will show data dated
   after May 12.
2. Then, before the Oct 2 Legacy capture, store the rank Jordan really holds on Oct 2 so no second ceremony plays:

   ```sql
   update public.athlete_rank_state set family = 'craftsman', sub_tier = 4, rank_level = 12, family_entry_date = date '2026-05-12', updated_at = now()
    where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app');
   update public.profiles set rank_family = 'craftsman', rank_level = 4
    where id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app');
   select family, sub_tier, rank_level from public.athlete_rank_state
    where athlete_id = (select id from auth.users where email = 'jordan.demo@forgelegacy.app');   -- expect craftsman · 4 · 12
   ```
3. Capture the Oct 2 Legacy pull-back at the real date.

Alternatives (PO decision): (a) capture at Oct 2 as-is → the ceremony reads "Craftsman IV"; (b) add one goal on a
sealed chapter → **Architect I** computes on exactly Fri Oct 2 2026 (Jan 5 + 270 days is the Architect time gate) —
honest, but it changes the line to "Craftsman IV → Architect I" and adds goal honors. Not seeded.

## 7. PRs — what "stored best" the app reads

- Live pop-up (`src/app/workout.tsx:1797-1823`): fires when a set with ≤ 5 reps is **strictly heavier** than the stored
  best, first time per exercise card. "Stored best" = the heaviest `personal_records` row with `measure_kind = 'load'`,
  `load_reps` 1–5, matching `catalog_key` (or, if the row has no key, the exercise name)
  (`src/data/lift-history-live.ts:214-240`, `src/domain/workout/records-core.ts:100-141`). **workout_sets history is not
  consulted**; a first-ever lift has no row and never fires. Seeded: 215 × 5 → 225 × 5 fires.
- Saved PR rows mirror `detectPRs` (`src/domain/workout/metrics.ts:141-206`): main section, load > 0, 1–5 reps, strictly
  heavier than the stored best; the first mark is written as a baseline (counted by `prs_recorded` and by rank as a PB,
  shown by the app as a baseline, not a record — `records-core.ts:152-173`). Each row gets the ACCOMPLISHMENT timeline
  event `save_workout` writes ("Barbell Back Squat — 225 lb PR"); the Legacy timeline itself builds PRs from
  `personal_records` (`src/data/legacy-timeline-live.ts:214-217`).
- Sets above 5 reps (RDL, rows, 3×8 bench, face pulls, leg curls) never create PR rows; pull-ups are bodyweight
  (`weight` null).

## 8. Device-local state for the Playwright script (web = `window.localStorage`, raw keys, no prefix)

Set **`forge_device_owner_v1` = `f11de000-e9a1-42f7-8fa2-073670fb48dc`** (Jordan's id) *before* anything else: on every
auth event the app wipes first-run flags when this key names someone else (`src/lib/auth.tsx:101-105`,
`src/lib/first-run.ts:66-153`).

| Key | Value | Why |
|---|---|---|
| `fl_theme_v1` | `forge` (dark) or `paper` (Alabaster) | read synchronously at boot (`src/constants/theme-choice.web.ts:77-91`) |
| `forge_coach_met_v1` | `1` | skips Holt's "I build the training…" intro |
| `fl_holt_intro_closed_v1` | `1` | same family |
| `forge_coach_intro_seen_v1` | `1` | coach screen intro (`src/app/coach.tsx:88`) |
| `forge_swipe_hint_seen_v1` | `1` | logger swipe hint (shot 2) |
| `forge_tour_v1`, `forge_home_tour_v1` | `completed` | tours are retired (`TOUR_RETIRED`), harmless belt-and-braces |
| `forge_unlock_announced_v1` | `1` | same |
| **must be ABSENT** | `forge.activeWorkout.v1` (except during shot 2), `forge_welcome_back_closed_v1` (shot 4), `forge_holt_welcome_owed_v1`, `forge_onboarding_plans_pending_v1` | an autosave hides Welcome back and shows the resume face; the others open sheets |
| optional | `forge_weekly_review_retired_v1` = JSON array of week starts | hides a weekly-review card. On Oct 2 the real previous week (Sep 21–27) has workouts, so Home will offer one — it is honest |

Sign in through the UI (supabase-js keeps the session in localStorage). **Token expiry with a frozen clock:** the server
issues a 1-hour JWT on the real clock; a client frozen in January never thinks it has expired, so it never refreshes.
Sign in fresh for each capture and keep each session under ~50 real minutes.

## 9. Photos (not seeded — files cannot be uploaded from SQL)

Upload **after the final stage-4 run** (a stage-4 re-run deletes Chapters II/III, and `chapter_photos` cascades).
- Bucket `chapter-photos` (public; insert allowed for any authenticated user, owner = uploader — 0085:71-86).
- Path convention: `<chapter_id>/<epoch-ms>-<random>.<jpg|png|webp>` (`src/data/photos-live.ts:323-336`); URL stored is
  the public URL.
- Table `chapter_photos` (0085:38-50, + `exercise` 0090:26): `athlete_id`, `chapter_id`, `url`, `taken_on` (date),
  `pose`, `caption`, `is_video`, `is_starred`, `role` (`'final'` = a sealed chapter's closing shot), `exercise`,
  `created_at`. Cover choice: `chapters.cover_photo_id` (0085:65).
- Easiest: sign in as Jordan (real clock), Legacy → chapter → add photo, and set the date in the details step. For a
  4-photo album: Chapter I `f11de000-b9a5-451e-81de-115bdd7cd24d` (e.g. Jan 19, Apr 4), Chapter II
  `f11de000-6d5a-49ec-8121-ea6254007fd2` (May 12, Aug 3), Chapter III `f11de000-2514-4dd1-8c10-547349e8bffb`.
- REMOVE cannot delete storage objects (`storage.protect_delete`): empty those three folders in the dashboard first.

## 10. Risks and open questions

1. **Rank** — §6. Decide: frozen May 12 capture (recommended), Craftsman IV on Oct 2, or Architect I via a goal.
2. **Bench 235 moved to Tue May 12** (inside "by early June") so the honor and the Craftsman crossing happen in the same
   honest week. Say if you want it in June instead (then the rank capture still works frozen anywhere May 11–Jun 7, but
   the stored Builder IV is stale by a few weeks).
3. **Holt's Feb 10 change** is live and unknown in advance. Stage 3 logs Thursdays as Paused Bench 4×4 for the rest of
   the block ("The rest of the block"). If the take you keep says "Just this week", only Feb 12 should be paused — a
   one-line change in the generator. Holt's edit must not change the session count (the 0123/0175 guards would refuse it).
4. **Featured moment card** on Legacy needs a `CHAPTER_SEALED` timeline row (`src/data/legacy-live.ts:147-158`), and
   nothing in the current app writes one (sealing writes only the chapter, `chapter-detail-live.ts:220-233`). Not seeded,
   because no real athlete can reach that state. The timeline itself shows the seals from `chapters`.
5. **Squadmates never train**, so Ironside's squad screens look quiet (no feed, no streak). The phone shots do not show
   the squad.
6. **Stage 4 runtime**: ~151 `evaluate_honors` calls (each runs `honor_metrics`, including the squad streak
   generate_series). Expected seconds; `statement_timeout` is raised to 15 min inside the transaction. Untested.
7. **The `fl_honors` shift of `profiles.created_at`** happens inside the transaction only; a reader in another session
   never sees it.
8. **Consent version**: if `CONSENT_POLICY_VERSION` moves past `2026-09-25` before capture, the grant reads as "none"
   and Holt asks once.
9. **Do not tap Finish in shot 2** (or open the Honors screen during shots 1–4): a live save runs the evaluator at the
   real date, awards honors with `celebrated_at` null and would put a ceremony on camera. The next stage removes it.
10. Admin metrics and the signup list include the six accounts until REMOVE.

## 11. Not verified

- Nothing was executed against a database (by instruction). Syntax only via libpg_query 17; semantics by reading.
- GoTrue's `auth.users` / `auth.identities` column set is not in this repo; the files use the long-standing columns
  plus the `''` token workaround. If sign-in fails with "Database error querying schema", a token column is NULL.
- That production has every migration through 0253 applied (the files rely on 0224, 0234, 0242, 0246, 0251).
- The honor count (row 5) is a JS mirror of `evaluate_honors`; the hard §2 checks do not depend on it, except that
  `club_1000` must be the only uncelebrated honor and be dated 2026-05-12.
- No dashboard-created triggers on `auth.users` / `profiles` beyond the migrations were checked (none can be seen from
  the repo).
