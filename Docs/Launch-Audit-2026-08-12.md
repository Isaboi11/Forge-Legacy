# Launch Audit — every feature, end to end

## v1.0 | 2026-08-12 · READ-ONLY AUDIT, NO CODE CHANGED

**Scope:** every user action that persists or transmits something. For each: does it send the way it is
supposed to, save the way it is supposed to, and save **where** it is supposed to.

**Method:** nine parallel auditors, one per domain, each tracing screen handler → data module → table/RPC →
the migration that defines it. Every finding carries a `file:line`. Findings marked **✅ verified** were
re-checked against source by the lead; four were reproduced by executing the real modules under
`node --test`.

**Baseline gates at time of audit:** `tsc` 0 errors · `node --test` 2,068 pass / 0 fail · lint 1 error +
28 warnings (baseline is 1 + ~13; the +15 are one `import/first` block in `useCeremony.tsx:30-43`, caused
by a const splitting the imports — cosmetic).

> **The gates are green and the app has these defects anyway.** That is the single most important sentence
> in this document. Every blocker below lives in the gap between a tested helper and the screen that
> should call it. `customToPickerItem` and `mergeForSearch` have unit tests and **no screen call site**.
> The suite passes because it tests functions, not wiring.

---

## 0 · DO THIS BEFORE ANYTHING ELSE

### 0.1 — ⛔ Do not publish from the current working tree. ✅ verified

Nine `guard()` call sites are live in the tree right now:

| Screen | Line | Blocks |
|---|---|---|
| `(tabs)/squads.tsx` | 78 | opening Create Squad |
| `create-squad.tsx` | 86 | creating a squad |
| `join-squad.tsx` | 96 | joining a squad |
| `add-photo.tsx` | 152, 156 | adding a photo or video |
| `templates.tsx` | 80 | saving a template |
| `program-builder.tsx` | 274, 275, 598 | importing, and building a program |
| `program-share/[id].tsx` | 66 | accepting a shared program |
| `coach.tsx` | 486, 497 | generating a Holt program or day |

They read `my_entitlement`, defined in **`0145_entitlement.sql`, which is not applied**. The chain:

```
fetchEntitlement → my_entitlement (404, PGRST202)
  → caps = null, usage = null
  → gateFor() returns UNKNOWN                          caps-core.ts:169
  → usePremiumGate: if (gate.showRetry) { toast; return false }   usePremiumGate.ts:48
  → the action is BLOCKED
```

Every athlete would be refused squads, photos, templates, the program builder, accepting a shared program
and Coach Holt, with *"Unable to verify your subscription. Try again."* The M-7 "Upgrade" button then
toasts *"Subscriptions open with the next release."* (`useCeremony.tsx:28`, `SUBSCRIPTION_ROUTE_BUILT = false`).

**This is not a defect in the Phase B work** — the code is correct and its own header says Phase B's test is
that nothing changes. It is a **sequencing hazard between two concurrent sessions.** `git status` currently
shows `src/lib/entitlement.tsx`, `src/data/entitlement-live.ts`, `src/domain/entitlement/` and
`src/hooks/usePremiumGate.ts` as untracked — and publishing bundles the working tree, not HEAD. This repo
has already shipped one session's uncommitted work to a phone.

**Action:** apply 0145 **before** any `eas update` / `eas deploy`, or confirm `default_tier = 'PREMIUM'` is
live. Until then, treat the tree as unpublishable and say so to the other session.

### 0.2 — Run the preflight. I cannot reach the database.

`supabase/apply/preflight-launch-audit.sql` (new, read-only, creates nothing). It replaces
`preflight-what-is-applied.sql`, which has three holes:

1. It labels `app_admins` as **0137**. **0129** creates that table; 0137 re-creates it `if not exists`. The
   row goes green when 0129 ran and 0137 did not. The only object unique to 0137 is `admin_recent_signups`;
   the only one unique to 0130 is `admin_overview`.
2. It never checks **0129, 0130, 0134, 0135, 0136, 0143** — and live code calls into every one.
3. It never checks the **push cron jobs**. If `forge-push-drain` is not scheduled, every notification
   enqueues correctly and is never delivered, and nothing in the app reports a problem.

Expect everything APPLIED except the two 0144/0145 rows at the bottom.

---

## 1 · The five root causes

These are not 169 unrelated bugs. Five patterns produce almost all of them, and each has a single fix
strategy. **Fix the pattern by grepping every sibling call site — not the reported instance.**

### Pattern A — a fix landed at one call site, its siblings were missed

In three of these five the migration that made the fix *wrote down the reasoning* that would have found the others.

| Fix | Applied to | Never got it |
|---|---|---|
| `0075` owner-scoped storage | `squad-media` (update/delete) | **`transformation-media`** — body photos |
| `0075` again | update/delete only | **read on `squad-media` is still `PUBLIC`** |
| `0108` trained-today | Squads hub, Squad Detail | **Discover, Squad Preview** |
| `0052` member cap | approve path | **`join_squad_by_code`** |
| `0135` `revoke execute from public` | `notification_events_for` | **`honor_metrics` (0100)** |
| `preferences.tsx:76-85` rollback+toast | Preferences | **Profile Visibility, Notifications, 11 more** |
| `useUnits` conversion | workout, weekly review | **34 of 48 surfaces** |

### Pattern B — indexing a filtered list by an unfiltered position, or by a count

A correct helper exists and is used at some call sites; the others use a shortcut.

| Wrong | Right | Where |
|---|---|---|
| `session.exercises[i]` | `ex.position` | `save-core.ts:63` |
| `nextSession(structure, count)` | `nextOpenSlot(structure, marks)` | `progress-core.ts:188` |
| `computeProgress(s, workouts.length)` | `touchedCount(s, marks)` | `program/[id].tsx:276` |
| `buildLog` positional slot fill | `program_sessions.workout_id` | `progress-core.ts:330` |
| `plannedDays` (unfiltered) | `trainingDays(plannedDays(...))` | `edit-ops.ts:99` |
| positional token↔error mapping | `ORDER BY` on both scans | `0120:637-644` |

### Pattern C — `void promise.then(...)` with no rejection arm

A user-initiated save that fails leaves the UI showing the value the athlete chose and the server holding
the old one. **15 class-(b) sites**, listed in §3.

`preferences.tsx:76-85` is the correct pattern, under a comment reading *"A settings screen that lies about
what it saved is worse than one that fails loudly."* It was applied to exactly one screen.

### Pattern D — a read error rendered as an empty state

`useQuery` sets `data: null` on **both** loading and error (`useQuery.ts:77`). Any screen that does not
destructure `error` renders its empty state on a network failure. There is **no connectivity detection
anywhere in the repo** — no NetInfo, no `expo-network`, no `navigator.onLine`. So no screen can tell "you
have none" from "I could not reach the server."

Worst instances: an entire transformation archive reading "No progress captures yet"; a rank read failing
to "Foundation I" for a Legend athlete; a settings blob reading `null` and then being **written back as
defaults**.

### Pattern E — a control whose backend exists and whose UI never calls it

`unregisterPushToken` (0 call sites), `avoidExercise` (0), `leaveChallenge` (0), `restoreCustomExercise`
(comment only), `customToPickerItem` / `mergeForSearch` (tests only), decline-a-friend-request (no surface),
`cover_photo_id` / `chapter_photos.role` (read, never written).

---

## 2 · P0 — ship blockers

Data loss, privacy, silent failure of a user save, or a wrong number the athlete acts on.

### Data loss

**P0-1 · Continuing a workout can silently discard everything just logged.** ✅ **reproduced**
`src/domain/workout/save-core.ts:60-72`. `buildAppendExercises` maps over `buildSaveExercises(session)` —
the *filtered* list — while indexing `session.exercises[i]`, the *unfiltered* one. With an unlogged cardio
block present:
```
buildSaveExercises   -> [ 'Barbell Deadlift', 'Barbell Row' ]
buildAppendExercises -> []          # three logged sets of Row, gone
```
`continue_workout` returns `sets_added: 0`, raises nothing, and the screen navigates to Workout Complete.
The trap is documented 20 lines below at `:86-88` — *"POSITION IS THE JOIN, and it must be read off the SAME
list"* — and `buildSubstitutions` obeys it.

**P0-2 · Editing a transformation entry during a failed read wipes every photo reference.**
`transformation-add.tsx:56-68,116`. `fetchTransformationEntry` returns `null` on *any* error
(`transformation-live.ts:94`); the prefill is gated on truthiness so the form renders blank; `canSave` is
satisfied by `isEdit` alone; the save writes `photos: {}` and `video_url: null`. Six irreplaceable photos
unreferenced, unrecoverable.

**P0-3 · A save that commits but loses its response duplicates the workout on retry.**
`workout.tsx:1355-1367`, `0124:32-45`. No idempotency key, no client-supplied id, no unique index. A second
tap writes a second `workouts` row, a second chapter-count bump, a second PR set, a second
`evaluate_honors` pass, a second `program_sessions` claim. `continue_workout`'s own header names this
doubling as the reason it exists; the first save has no equivalent guard.

**P0-4 · "Save for later" clears the draft before the write that replaces it.**
`workout-builder.tsx:212` precedes `:217`. The template branch two lines below has the correct order.

### Privacy and access

**P0-5 · Any signed-in athlete can delete or overwrite every other athlete's body photos.** ✅ verified
`0044_transformation.sql:42-45` — `xform_media_update` and `xform_media_delete` scope by `bucket_id` alone,
no owner predicate. `0075_media_owner_scope.sql` found this exact defect in `squad-media`, fixed it, and
wrote down why. `chapter-photos` (`0085:84-86`) and `media` (`0006:24-30`) are correctly scoped.
**`transformation-media` is the only bucket that never got the fix, and it holds progress photos.**

**P0-6 · Sharing one pose hands over the other five and the video.** ✅ verified
Key is `${draftId}/${key}.${ext}` (`transformation-live.ts:169`) where `key` is one of six fixed literals or
`video`, in a `public: true` bucket with unauthenticated read. Blind enumeration is impractical (the prefix
is an epoch-ms) — that is not the risk. Given **one** shared URL, swapping `ff` for `rf` yields the rest.

**P0-7 · Friends-audience post media is world-readable and enumerable.** ✅ verified
`0042_squad_post_media.sql:24-25` — `create policy squad_media_read ... for select using (bucket_id = 'squad-media')`
with **no `TO` clause**, so it binds to `PUBLIC` including `anon`, on a `public: true` bucket. Friends media
is written to `friends/${uid}-…` in that bucket (`friends-feed-live.ts:315`). Anyone with the anon key can
`list` the `friends/` prefix and fetch every friends-only photo in the app. The audience chip reads
*"Never public."* Row-level gating is correct; the bytes are not gated at all.

**P0-8 · Any anon-key holder can read any athlete's training statistics.** ✅ verified
`0100:39` guards with `if auth.uid() is not null and p_uid <> auth.uid()`. Under the `anon` role
`auth.uid()` is null, so the guard short-circuits and the call proceeds for any uuid. `security definer`,
and **no `revoke execute ... from public` anywhere** — Postgres grants EXECUTE to PUBLIC by default.
Chained with `profiles_read using (true)` (`0001:165`), the whole population's lifetime volume, PR count,
training partners and time-of-day patterns are readable without an account. `0135:211` does the revoke
correctly for a different function.

**P0-9 · "Live Workout Status → Only me" restricts nothing.** ✅ verified
`0086:35-36` puts `training_since` and `training_label` directly on `profiles`, and `profiles_read` is
`using (true)`. The visibility gate is real but guards only the definer function; the columns are
selectable straight off the table. `0114:20-23` already records this class of hazard for `discoverable`:
*"Every guard below is ADVISORY UX, not enforcement, and the toggle is a promise this database does not keep."*

**P0-10 · Request-only joining is bypassable for every public squad.** ✅ verified
`0032:23-24` makes `squads_select` row-level (`privacy = 'public' or …`) with no column restriction, and
there is no `revoke` on `invite_code` in 0029–0145. Any signed-in athlete runs
`select id, invite_code from squads where privacy='public'` and `join_squad_by_code` admits them directly —
no request row, no approval. SQ-D16 defeated. "Who Can Invite → Owner Only" is advisory for the same reason;
`0056`'s own header names the risk and then adds a second gated path instead of closing the first.

### Silent failure of a user-initiated save

**P0-11 · "Seal Chapter" silently does nothing on a failed write.** ✅ verified
`chapter/reflect.tsx:96-101` — `void action.then(...).finally(...)`, no rejection arm, on both Seal and
Skip. `saved` is the sole gate on the confirmation overlay. The button un-greys, no toast, no seal; backing
out then offers to discard the reflection. The most ceremonial, least reversible write in the product.

**P0-12 · The settings screens write defaults over the server whenever their own read failed.** ✅ verified
`profile-visibility.tsx:57` writes `{...APP_PREFS_DEFAULTS, ...prefs, analyticsOptOut}` where `prefs` is
`null` while loading **and on error** — so it spreads nothing and persists pure defaults. Units snap to lbs,
coach intensity resets, and **an athlete who opted out of analytics is silently re-enrolled**. Same shape at
`preferences.tsx:63`. `settings.tsx:20-29` documents this exact trap — *"it exists because that bug shipped"* —
and the `loaded` guard built to prevent it is not used on either screen.

**P0-13 · Every settings toggle is fire-and-forget.** Notification switches (`notifications.tsx:44-48`),
visibility audiences (`profile-visibility.tsx:60`), and **"Reset to defaults", whose toast fires
unconditionally at `:70` before the write resolves**. On a privacy screen that is a confident false claim.

**P0-14 · The workout reflection and session note are discarded on failure, and the screen navigates home.**
`workout-complete.tsx:360-368` (`catch {}` then unconditional `goHome()`) and `:720-726`. The one screen
whose copy promises the athlete will read it again someday.

**P0-15 · Log weigh-in failure is invisible.** `LogWeightSheet.tsx:44-49` — no `.catch`.

**P0-16 · "Achieve" on a goal is irreversible and its failure is silent.** `goals.tsx:354-358` —
single-argument `.then`. The confirm sheet says *"there's no undo"*; the athlete will not tap twice.

**P0-17 · A failed goal save strips the chapter of its primary goal.** `goals-live.ts:136-144` — the demote
and the insert are separate statements, not a transaction, and the demote's error is never read. Chapter
ends with no primary goal and nothing says so.

### Wrong numbers the athlete acts on

**P0-18 · Metric athletes' weights are stored as kg labelled `lb`, then converted again on read.** ✅ verified
`save-core.ts:162,166` writes `weight_unit: 'lb'` unconditionally with no conversion, while `units.ts:4-6`
asserts pounds are canonical. Log 100 kg × 5 → Activity Detail reads **45 kg × 5**; Weekly Review volume
reads ~45% of truth. `workout.tsx:1653-1658` states it plainly: *"the number in the table is kilos wearing a
pounds label."* Currently latent because `0139` put everyone on imperial — it arms the moment anyone
switches. **Also corrupts cross-athlete challenge scoring (P0-20).**

**P0-19 · `convertMeasure` mangles any fractional pounds value.** ✅ **reproduced**
`units.ts:57-65`, regex `/(\d[\d,]*)\s*lbs?\b/gi` — no decimal branch, so it matches the fractional digit alone:
```
"Heaviest was Bench Press at 227.5 lb."  ->  "227.2 kg."
"2.5 lb" -> "2.2 kg"      "45.5 lbs" -> "45.2 kg"      "225 lb" -> "102 kg"  (correct)
```
A plausible-looking number that is 2.2× wrong. Half-plates are routine. Producers: `rulebook/review.ts:114`,
`detail-core.ts:185`. Consumers: Weekly Review, the Home card, Activity Detail.

**P0-20 · Challenges rank kilograms against pounds and label the result "lb".**
`0062:67-81`, `0063:59,67` — `sum(ws.weight * ws.reps)` and `max(ws.weight)` with no reference to
`weight_unit`. A metric athlete benching 100 kg loses to an imperial athlete benching 200 lb (≈91 kg). The
wrong winner is then **frozen into `challenge_results` and the Hall of Champions**. The "round-trips
correctly for everyone" defence holds for one athlete's own history and fails for the cross-athlete
comparison a challenge *is*.

**P0-21 · Weight entry silently caps at 500.** `workout.tsx:1284` — `readDraft(..., 500, false)` ends
`Math.min`. Type 585, get 500, no message. `WEIGHT_OPTS` tops out at 500 too. **A 585 deadlift cannot be
logged in this app.** The reps cap directly beside it was deliberately raised past the wheel for this exact
reason (`:115`).

**P0-22 · Program Detail's progress bar cannot see a skipped session.** ✅ **reproduced**
`program/[id].tsx:276` feeds `workouts.length` into `computeProgress` while holding `marks` in state.
`touchedCount` = 2 · `computeProgress(s,1)` = `{completed:1, pct:13, nextDayIndex:1}` — and `nextDayIndex`
names the session just completed. A program graduated by skipping reads 17% forever.

**P0-23 · "Your Log" files sessions under the wrong day after any skip or swap.**
`progress-core.ts:330-331` — `offsets[wi] + di` positional fill, and `buildLog` takes no `marks` at all,
though `program_sessions.workout_id` records exactly which slot a workout satisfied. Produces a row with a
completion tick **and** a "Skipped" chip simultaneously, and hides the untrained day's actions.

**P0-24 · "Next session" names one already trained — and puts it in a Train-Together invite.** ✅ verified
`progress-core.ts:188` is `slots[completedCount]`. After a swap or skip it returns the wrong day, and
`templates-live.ts:142-150` snapshots that into the invite, so **both athletes train a session already
logged**. `nextOpenSlot` (`:551`) is correct and is what Home and the logger use. Their docstrings state
the identical purpose.

**P0-25 · "Training today" reads 0 for a squad where everyone trained.** ✅ verified
`0053:69-71` (`discover_squads`) and `0055:192-194` (`squad_preview`) count `squad_checkins` only. `0108`
fixed exactly this — *"someone in the squad worked out and it didn't update"* — and only the hub and detail
adopted `squad_trained_since`. **These are the two screens a stranger judges a squad by.** Discover also
labels that 24-hour figure "Most active this week."

### Reachability

**P0-26 · Invite links cannot convert a new athlete.** ✅ verified
`squad-invite.tsx:52` builds `forgelegacy.expo.app/join-squad?code=…` — correctly a static route, so it
dodges the dynamic-route 404. But a stranger has no session: `routeFor` returns `'auth'` and
`_layout.tsx:277-279` declares only `sign-in`, so `join-squad` is stripped from the route tree and the
`?code=` with it. A repo-wide grep for any deferred-link mechanism (`pendingInvite`, `returnTo`,
`redirectTo`, stashed params) returns **zero hits**, and neither `sign-in.tsx` nor `onboarding.tsx` reads a
param. They sign up, onboard, and land on Home in no squad.
**The whole year-one plan is 20 testers × 5 people each, and the funnel being instrumented right now
(sent → accepted → installed → converted) cannot structurally complete.**

**P0-27 · A font-load failure is a permanent blank screen.**
`_layout.tsx:40,45-47` — `useFonts` returns `[loaded, error]`; the error is discarded and the app renders
`null` forever. Nothing calls `SplashScreen.preventAutoHideAsync()` anywhere in `src/` (verified by grep), so
the native splash auto-hides on the first JS frame onto that `null`. Web resolves fonts against
`document.fonts` with system fallback; **the device does not.** This is the category of the crash that
already shipped.

**P0-28 · Accepting a shared catalogue program the recipient already has fails with a raw Postgres string.**
`0110:165-167` inserts `source_definition_id` with no conflict handling against
`programs_one_live_per_source` (`0104:237-239`). The toast is
`duplicate key value violates unique constraint "programs_one_live_per_source"`, the share stays PENDING
forever, and the recipient has no route to the program. `runProgramAgain` handles this exact `23505`;
`acceptProgramShare` does not.

**P0-29 · "Send Program" on a catalogue preview dereferences null.** `program/[id].tsx:938` —
`params: { id: program!.id }` in an unconditionally-rendered CTA row, where `program === null` by design on a
preview. `TypeError` in an `onPress` with **no error boundary on the route**. Every other action on the
screen is guarded.

**P0-30 · A future-dated challenge is invisible to everyone, including its creator.**
`challenges-live.ts:366` always writes `state: 'ENROLLMENT'`; the hub's `open` list excludes anyone already
on the roster, `active` requires `ACTIVE`, `history` requires a result row. An ENROLLMENT challenge you are
a participant of matches none of the three — for up to 7 days. A "Today" start masks it.

**P0-31 · Accepting a Train Together invite never broadcasts presence.** ✅ verified
`setTrainingStatus` has exactly one caller (`useWorkoutSession.tsx:51`), reached only via `startWorkout()`,
which is called from just three files. `workout-invite.tsx`, `workout-join.tsx`, `templates.tsx`,
`template/[id].tsx`, `starter-template/[id].tsx`, `workout-builder.tsx` and `program/[id].tsx:385` all just
`router.replace('/workout')`. The guest is invisible in Live Now; nobody can join them.
`program/[id].tsx:391` carries a comment saying `startWorkout` *"is not optional here… it is what sets LIVE
PRESENCE"* — the sibling in the same file proves the omission is a bug.

**P0-32 · The host's "yes" to a join request never reaches the asker who left the screen.**
Delivered only by the `/workout-join` poll, whose cleanup kills the interval on unmount. There is **no
notification branch for "your join request was accepted"** — all 14 branches are recipient-side — and
`/workout-join?id=` is reachable from nowhere. The host's workout is tagged with the guest; the guest never
trains. One-sided attribution, the exact class this domain already had to fix.

**P0-33 · The host tags an invitee as a partner the moment they *send* the ask.**
`workout.tsx:1481` mutates `partnerIds` immediately after `inviteToLiveSession`, on a row still `PENDING`.
`mergePartnerCredits` only ever adds. Declining deletes the row, leaving nothing to react to. Inflates the
24 partnership honors with invitations nobody took.

---

## 3 · P1 — feature does not do what it is specified to do

**Storage orphans.** There is **no `.remove(` call on any storage bucket anywhere in `src/`**, and
`storage.protect_delete()` (`0142:5-12`) blocks the SQL route. Deleting a transformation entry tells the
athlete their photos are *"permanently removed"* and leaves all six JPEGs plus the video in a public bucket
forever. Same for accomplishment media. `0142` built an orphan ledger for squad check-ins; nothing was built
for personal photos. A chapter photo **can never be deleted at all** — no control, no data-layer function.

**Sealing a chapter leaves the athlete with no active chapter, permanently.** `chapter-detail-live.ts:129-142`
creates nothing, and the only `insert into chapters` in the repo is inside the onboarding RPC. Afterwards
Add Photo dead-ends on *"No open chapter"* with no control anywhere that starts one, and every new
transformation entry writes `chapter_id: null`. `photos.tsx:259-261` asserts a premise sealing falsifies:
the partial unique index enforces *at most* one active chapter, not at least one.

**Nothing writes `CHAPTER_SEALED`, `PHOTO_ADDED` or `REFLECTION_ADDED`.** The Legacy "Featured Moment" band
is `timeline.find(e => e.event_type === 'CHAPTER_SEALED')` and no code emits it. The timeline never shows a
seal, a photo or a reflection; `routeFor('photo')` is unreachable code.

**Every PR is announced twice on the timeline, including first-ever marks that are not records.**
`0124:118-124` inserts both a `personal_records` row and an `ACCOMPLISHMENT` event for every PR with no
`isFirst` check, and `legacy-timeline-live.ts` renders both sources with no dedup. `detectPRs` deliberately
marks first lifts `isFirst: true` on the documented rule that they are *"announced to nobody"* — the
completion screen honours it, the timeline does not.

**A rank promotion whose persist fails still fires the ceremony, every 60 seconds, forever.**
`rank-live.ts:192-203` — both writes discard their result and the `promotedFamily` return is unconditional.

**A failed rank read shows a Legend athlete "Foundation I".** `rank-live.ts:112-114` destructures only
`data`; the `?? 'foundation'` fallback makes an error indistinguishable from a new athlete.

**Auto-tracked goal progress is only written when the athlete opens `/goals`.** `syncAutoGoals` has one call
site (`goals.tsx:123`). Legacy shows a stale percentage indefinitely, `achieved_at` stays null, and the
Goals honor family is effectively unearnable.

**Push tokens are never unregistered on sign-out.** ✅ verified — `unregisterPushToken` has zero call sites;
`auth.tsx:89-95` calls `stopAnalytics()` and `signOut()` and nothing else.

**`push_drain` marks a row SENT before knowing whether pg_net delivered it** (`0120:583-592`) — `v_req` is a
request id, not a result. A failed send is never retried; nothing returns a row to PENDING.

**`push_reconcile` maps Expo's error array onto tokens positionally against two unordered scans**
(`0120:637-644` vs `0135:493-511`) — neither has `ORDER BY`, though the comment asserts one does. On a
two-device athlete it can disable the live device.

**A cold start from a tapped push navigates twice** (`push.tsx:156-190`) — the effect re-runs when `ready`
flips, and nothing calls `clearLastNotificationResponseAsync`.

**Custom exercises cannot be found again.** `exercise-picker.tsx:167-169` searches `PICKER_DB` only; customs
never enter the pool. The athlete re-creates them, and PRs key on `catalogKey`, so their history splits
across two rows. Both count toward the 500 cap. `exercise-library.tsx:300` claims they are reachable
*"and by search."*

**Holt's live-program edits index a different day list than the schedule the athlete picked from.**
`edit-ops.ts:99` uses unfiltered `plannedDays`; the tapped schedule comes from `trainingDays(...)`. One empty
day re-points every edit — and because `canEdit` checks the filtered index while the write uses the
unfiltered one, **an edit aimed at an untouched session can land on a trained one**, defeating the first
positional invariant at the write.

**`exercise_avoidance` (0138) has no writer.** No screen calls `avoidExercise`. *The inverse holds correctly*
— nothing reads it as a blocklist — so the "captured but unread" rule is intact; it is capture that is missing.

**There is no way to decline an incoming friend request.** Every surface offers only Accept.
`removeFriendship` — whose own doc reads *"Decline, withdraw, or unfriend — one call"* — is wired only to
withdraw and unfriend. The backend and the whole anti-shame decline design exist and are unreachable.

**C-3 shows a live-recomputed crowned leaderboard for closed and cancelled seasons**, contradicting C-4 one
tap away and violating CS-D17. `0064` has no state filter; its sibling `challenge_results_detail` correctly
returns null outside `('COMPLETED','ARCHIVED')`.

**`challenges_update` lets a creator rewrite a closed season's metric, window and state** (`0059:111-113`) —
the exact hole `0067` was written to close. Adding the RPC did not narrow the policy.

**Current Champions collapses every scoped title of the same metric into one** (`0071:99-105`,
`distinct on (c.type)`), silently un-crowning champions and under-reporting "titles held".

**`createChallenge` writes the challenge and the creator's roster row as two round-trips** with no
compensating delete — a partial failure leaves an orphan challenge its own creator is not enrolled in, and
the retry creates a duplicate.

**Deleting a squad also deletes its members' Friends-feed posts.** `0041:12` cascades on `squad_id`, which a
`BOTH`-audience post also carries since `0074`. The confirm copy does not describe this.

**Per-squad notification switches, including "Mute Squad", write to device storage and nothing on the
delivery path reads them.** `squad-live.ts:646-664`. The data layer's own comment still says *"push isn't
wired yet"*; push has been wired since 0120.

**A weekly review is lost forever if the athlete skips a week** — `ensure_weekly_review` only ever looks at
the immediately-preceding week.

**`/inbox` and `/friends` never refresh.** Acting on a notification leaves the row still saying it needs
answering; the friends badge counts a request that no longer exists. `friends.tsx:89` does not even
destructure `refetch`, and its trailing `.catch(() => null)` renders any read failure as "no friends yet".

**`friends_feed`'s `LIMIT` is a no-op** (`0113:75`) — it sits on a `select jsonb_agg(...)` with no `GROUP BY`,
so every call downloads the entire history. ⚠ **Home depends on the bug**: `index.tsx:387` requests one post
and `:404` filters it out, so repairing the SQL blanks the Circle row.

**Offline, every save says "not signed in".** `save.ts:43-44` — `supabase.auth.getUser()` is a network call
and auth-js returns `{user: null}` on a network failure, so a connectivity problem is reported as a
credentials problem. The likely athlete response is to go check their account.

**No request timeout outside auth** (`supabase.ts:63`) — a stalled connection parks the athlete on an
uncancellable spinner with no back and no AppBar. Only exit is force-quit.

**Nine more** covering unit conversion on 34 of 48 surfaces, day-one empty states, Progress Hub, the
Transformation compare dead end, and Home's blank chapter header are in the auditor transcripts.

---

## 4 · Decisions only you can make

1. **The distance-units doctrine conflict.** `units.ts:8-10` says distance must never convert —
   *"silently reinterpreting a logged 5-mile run as 5 km would be a data lie."* `0139:10-14` says `units` is
   the single switch for km-vs-mi and pace. Both are written down as decisions. `CardioBlockCard` follows
   0139 and converts; `log-activity` and the coach follow `units.ts` and do not. Whichever is chosen makes
   the other document wrong.

2. **Account deletion.** `content.ts:44` promises *"you may export or delete it at any time from Account
   settings."* Neither exists. **App Store Review 5.1.1(v) requires in-app account deletion for any app
   supporting account creation.** This is a submission blocker independent of the copy.

3. **The privacy policy's collection list** (`content.ts:53`) claims to be exhaustive and omits
   product-usage analytics.

4. **Should the storage-orphan ledger be extended to personal photos**, or is dashboard cleanup acceptable
   for launch?

---

## 5 · What is solid

Worth recording, because it is most of the app and it is genuinely well built.

- **`save_workout`'s contract is exact.** All 13 argument names match the SQL signature; every jsonb key
  matches the `->>` reads and the table columns. No column drift anywhere in the save path. Finish is
  awaited before navigation and failure is surfaced.
- **PR detection** is keyed by `catalog_key` with a name fallback, excludes warm-ups, cardio and `weight<=0`,
  and carries forward within a session so 310-then-300 cannot announce twice.
- **Ladders, circuits, AMRAP, supersets, prescribed timed sets and cardio all round-trip correctly.**
- **Ragged weeks are walked, not strided**, in every path that actually launches a workout, with an
  apply-time self-check that the SQL twin agrees.
- **Honors cannot be double-awarded** (two partial unique indexes + `on conflict do nothing`), the
  claim→celebrate dance survives a mid-ceremony crash, and the evaluator is genuinely table-driven and
  fails safe on an unknown metric.
- **Ceremonies never push** — all 14 notification branches are social facts, verified individually.
- **Squad create / join-request / approve / decline / transfer / leave** are correct in every direction,
  each derived from the shared row, with the cap enforced server-side on the approve path.
- **The friend graph is symmetric by construction** — one canonically-ordered row per pair, every
  transition through a definer function with a row-count check.
- **Train Together partner credit is genuinely two-sided**, derived from the shared invite row and
  re-derived at Finish; a shared workout counts toward *each* athlete's own program via coverage matching.
- **Challenge results are read from `challenge_results`, never recomputed** — everywhere except C-3.
- **Program shares are snapshots, not references**, with correct accept-idempotency under `for update`.
- **"Never Charge For History" holds**: `workouts.program_id` and `template_id` are `on delete set null`,
  sealed programs cannot be deleted, and sealed albums render with a dim wash rather than a lock.
- **`useMediaPicker` is the only camera path**, and it downscales photos and transcodes video before upload.
- **Provider and render order are correct** — no context consumed outside its provider; the two risky
  overlays sit inside a real `getDerivedStateFromError` boundary.
- **`src/domain/` import hygiene: zero violations.** No `-core.ts` has a runtime `@/` import.
- **Billing copy is clean.** No false billing language in `src/`; `LEGAL.membership` says there is no
  subscription and a guard test enforces it. App Store 3.1.2 is not at risk — **2.1 completeness is** (§0.1).

---

## 6 · Suggested order

1. **§0.1 and §0.2** — unblock publishing, learn what is applied.
2. **P0-1, P0-2, P0-3, P0-4** — stop losing data.
3. **P0-5 → P0-10** — one migration closes all six privacy holes; they are all `revoke`/`TO`/owner-predicate
   one-liners.
4. **P0-11 → P0-17** — Pattern C. One `.catch` helper applied at 15 sites.
5. **P0-18 → P0-25** — Patterns A and B. Grep every sibling call site per §1.
6. **P0-26 → P0-33** — reachability.
7. **§4** — the four rulings, then P1.

*Audited 2026-08-12 against `feat/home-onramp`. No code was changed. Read-only.*
