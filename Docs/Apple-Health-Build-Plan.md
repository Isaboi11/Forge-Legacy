# Apple Health — Build Plan (Build 10)

**v1.0 · 2026-09-28** · PO decision 2026-09-28: connect to Apple Health in native build 10 · Status: PLANNED, not started
**Why:** runs recorded on a Garmin (Garmin Connect writes them to Apple Health), an Apple Watch or Strava should
show up in Forge without being typed in again.
**Governs:** this plan is the build spec for `External-Activity-Import-Architecture-Evaluation.md` (EAI) and
`External-Activity-Import-Ownership-Deduplication-Note.md` (DEDUP), for one source: Apple Health. It is also the
first P-7 "Connected Apps" spec that `P-4-Settings-Root-Architecture.md` §2.1 reserved for this moment.

---

## 0 · The short version

Forge asks for permission to read workouts from Apple Health. When the athlete connects, it pulls the last
90 days of runs, walks, rides, swims and rows. After that it checks for new ones every time the app opens.
Each workout becomes a normal Forge workout row, marked `source = 'apple_health'`, with "Imported from Garmin
Connect" (or wherever Health says it came from). Forge also writes its own finished workouts back to Health, so
they close rings and show up in Apple Fitness. Duplicates are stopped three ways: by the HealthKit workout ID
(a unique index), by skipping workouts Forge itself wrote, and by a time-overlap check against runs already in
Forge. The native library is `@kingstinct/react-native-healthkit@16.0.0`. Build 9 and web never load it.

## 1 · Locked decisions this plan follows, and where the PO's request runs into them

| Source | What it says | How this plan handles it |
|---|---|---|
| EAI §9 "A: no imports at launch" | Written in June, before any native build existed | **The PO's 09-28 decision overrides the timing.** EAI §9 was about sequencing, and it said "the recommendation is sequencing, not rejection". Its precondition was dedup-first, and §5 of this plan builds dedup before the first import ever runs. |
| EAI §3 fields | Import type, date, distance and duration. Derive pace. Do **not** import heart rate, calories, splits, elevation, route, or social data | Followed exactly. Energy is read only to be thrown away, and is never stored. |
| EAI §3 + Route-Persistence-Amendment-001 line 105 | Routes from external platforms are "untouched", so the avoid-routes finding still stands | **Conflict:** a Garmin run with no map is less than the PO may picture. v1 imports no route. See Decision 3. |
| DEDUP §1–7 | Imports are fully owned native rows. Source is immutable and survives edits. One effort counts once. Manual records win. The most direct source wins. Ambiguous cases go to the athlete | §5 of this plan. |
| RCM R-D46, D-RCM-12, CAL Q7 = A, Q11 | Imported sessions get partial credit at prestige ranks (`IMPORT_PRESTIGE_CREDIT = 0.5`). 50% of active weeks must be Forge-native. The recent-engagement window counts native sessions only | Apple Health rows go into the **imported** bucket (`signals.ts` already has the fields, currently hard-coded to 0). This is a real limit on the PO's goal. See Decision 2. |
| Monetization-001 §8 / EAI §7 | Free one-time history pull, Premium for the ongoing pipeline. EAI §7 calls this a framing, "not a decision" | Not locked, so the PO decides. See Decision 1. |
| P-4 §2.1 | P-7 Connected Apps is a reserved code with no row yet | This plan turns P-7 on, with one row. |
| Route-Sharing-001 | The route trim is vetoed | Not affected, because no routes are imported. |

## 2 · Scope v1

**Read, on iPhone only:** workouts (`HKWorkout`), plus these fields:
- HealthKit UUID
- activity type
- start and end
- duration
- total distance
- the indoor flag (`HKIndoorWorkout` metadata)
- the source name and bundle ID (`sourceRevision.source`)
- the device product type (to tell an Apple Watch from other sources)

**Write** (recommended, and on by default once connected): every Forge workout the athlete saves goes to Health
as an `HKWorkout`, with start, end and distance. It carries metadata `HKExternalUUID = <forge workout id>`.

**Not in v1:**
- heart rate, energy/calories, splits, elevation, steps, sleep and body measurements (EAI §3: no surface reads
  them, and they are a higher biometric tier)
- **routes**, both reading them and writing them (Decision 3)
- strength, HIIT and yoga workouts recorded by the Watch (§4)
- background delivery (§3.4)
- Android Health Connect
- Strava or Garmin APIs directly (Apple Health already brings their data in)

## 3 · How it works

### 3.1 Library: `@kingstinct/react-native-healthkit@16.0.0`, pinned exactly

**Why this library:**
- Released 2026-09-18 and actively maintained.
- It ships an Expo config plugin. The plugin sets `NSHealthShareUsageDescription` and
  `NSHealthUpdateUsageDescription`, adds the HealthKit entitlement, and has an optional `background` flag.
- It covers everything v1 needs: `requestAuthorization`, `queryWorkoutSamplesWithAnchor` (returns `samples`,
  `deletedSamples` and `newAnchor`), `saveWorkoutSample`, `sourceRevision`, `getWorkoutRoutes` for later, and
  `isHealthDataAvailable`.
- Its peer dependencies are react-native ≥ 0.79 and `react-native-nitro-modules` ≥ 0.35. We have RN 0.85.3 and
  nitro 0.36.5, which is **already in the binary** because `react-native-compressor` needs it. No new native
  runtime is added.
- v16 changes: the `@react-native-healthkit/core` version is locked, and an invalid anchor now throws instead of
  silently re-reading everything. The sync code must catch that error and fall back to a date-window query (§3.3).

**Rejected alternatives:**
- `react-native-health`: last release 1.19.0 in October 2024, and no Expo plugin maintenance.
- Community `expo-healthkit` forks: young, single-maintainer.
- A hand-written `modules/health-reader` Swift module in the `label-reader` style. This is viable, and it would
  match `requireOptionalNativeModule`. But anchored queries, the save path and a later background-delivery
  AppDelegate hook add roughly 400 lines of Swift for us to own. **This is the fallback if v16 fails on device.**
  The TypeScript domain in §9 does not change either way.

**Config:** add this to `app.json` plugins:
```
["@kingstinct/react-native-healthkit", {
  "NSHealthShareUsageDescription": "Forge reads your workouts from Apple Health so runs, walks and rides recorded on your watch or other apps appear in your training history.",
  "NSHealthUpdateUsageDescription": "Forge saves the workouts you finish in Forge to Apple Health.",
  "background": false }]
```

**What this does to builds:**
- The fingerprint changes, which is expected: build 10 is a new runtime.
- The HealthKit capability must be on for App ID `com.qest4.forgelegacy`. EAS turns it on from the entitlement
  when it syncs capabilities. Check in the developer portal before the build.

### 3.2 Keeping build 9 and web inert

The library is a Nitro hybrid object, not an Expo module, so `requireOptionalNativeModule` cannot detect it.

**The pattern, in `src/lib/apple-health.ts`:**
- `Platform.OS === 'ios'`
- **and** `NitroModules.hasHybridObject(<name>)`, where the exact name is read from the package's
  `nitro.json` at build time
- **and** a lazy `require('@kingstinct/react-native-healthkit')` inside `try/catch`
- **and** `isHealthDataAvailable()` (false on iPad without Health)

All four decide `appleHealthAvailable()`. When it is false, the Settings row and every sync call are gone.

**Web:** `src/lib/apple-health.web.ts` exports the same API with nothing behind it, so the package never
enters the web bundle.

**OTAs:** build 9 OTAs publish only from `ota/build9-js` (see ONE-OTA-branch rule), so this code never reaches
build 9. The guard is belt-and-braces anyway.

### 3.3 Connect flow and first import

1. **Where it lives:** Settings → **Training** section → new row **"Apple Health"**. The value reads "Connected"
   or "Off".
   - It is added in `settingsSections()` behind a new `hasAppleHealth` flag, which is true only when
     `appleHealthAvailable()` is true.
   - It goes in Training, not Privacy & Alerts, because it is about where workouts come from. This is the P-7
     row.
   - The Health Data & AI screen gets a one-line link to it.
2. **Screen `src/app/apple-health.tsx`, before connecting:** it explains what is read and what is not, and has a
   primary button **"Connect Apple Health"**.
   - Tapping it first records the MHMDA opt-in: `ensureConsent('apple_health')`, a new consent kind, because
     collecting health data from another app is "collecting" under Washington's My Health My Data Act
     (Mock-Legal-Review item 3).
   - It then calls `requestAuthorization({ toRead: [workoutType, distanceWalkingRunning, distanceCycling,
     distanceSwimming], toShare: [workoutType, distanceWalkingRunning, distanceCycling] })`.
3. **HealthKit never tells an app whether read access was granted.** A zero-result query looks exactly like a
   denial. So after the sheet closes, run the first import and report honestly:
   - With results: "Found 23 workouts from the last 90 days."
   - With none: "No workouts found. If you turned off Workouts for Forge, you can change that in the Health app
     → Sharing → Apps → Forge Legacy."
4. **First import window: 90 days** (Decision 4).
   - It uses `queryWorkoutSamplesWithAnchor` with no anchor, filtered to `startDate ≥ now − 90 d`.
   - The workouts go through the §5 dedup. Then one "Review" step lists what will be added, which is the DEDUP
     "confirm" moment of ownership. It has one **Add N workouts** button, and each possible duplicate has its
     own Keep or Skip toggle.
5. **After connecting:** the screen shows "Last checked 2 min ago", a toggle **"Save Forge workouts to Apple
   Health"** (on by default), **Check now**, **Disconnect**, and a list of recent imports.
6. **Disconnect:** it stops syncing and clears the anchor. It asks: "Keep the N workouts already imported?"
   Keeping them is the default, because they are owned records (DEDUP §1). A second option, **Remove them**,
   writes a ledger `deleted` row for each and then deletes them.
   - It also says: "To fully revoke access, open the Health app → Sharing → Apps → Forge Legacy."

### 3.4 Ongoing sync: on app open, not in the background

- **When it runs:** on app start and each time the app comes to the foreground (`AppState` → active). It is
  throttled to once every 10 minutes, and **Check now** also triggers it.
- **How it reads:** an anchored query from the stored anchor. `deletedSamples` are **ignored**, because
  ownership never reverts (DEDUP §1), so a workout deleted in Health stays in Forge.
- **Where the anchor is stored:** per user and per device, in AsyncStorage key `fl_health_anchor_v1:<uid>`. The
  anchor is an opaque string and holds no health data.
- **Why not background delivery:** it needs the `healthkit.background-delivery` entitlement, a headless JS
  launch, and a valid Supabase session while the app is suspended. A run done at 7am appearing when the athlete
  opens Forge at 7:05 meets the PO's goal. Revisit this in the next native build if testers ask for it.

### 3.5 Write-back

- **When it runs:** after `save_workout` succeeds in `save.ts` (live session and `saveActivity`), fire and
  forget, if the athlete is connected and the toggle is on.
- **What it writes:** `saveWorkoutSample` with:
  - the mapped type (§4 in reverse; strength → `traditionalStrengthTraining`)
  - start = `started_at`, end = start + `duration_sec`
  - `totalDistance` for cardio
  - metadata `HKExternalUUID = workout id` and `HKIndoorWorkout`
- **Not written:** no energy (Forge does not measure it) and no route (Decision 3).
- **If it fails:** log it through the existing diagnostics as a code only (§7), and never block the save.

## 4 · Mapping HealthKit workout types to Forge

The DB `modality` enum is: strength, running, walking, cycling, swimming, rowing, mobility, other,
stair_climber, elliptical. The rank enum is mapped from it by `MODALITY_TO_ACTIVITY`.

| HKWorkoutActivityType | Forge `activity_type` | Workout name |
|---|---|---|
| running, wheelchairRunPace | running | "Run" (or "Treadmill Run" when indoor) |
| walking, wheelchairWalkPace | walking | "Walk" |
| hiking | walking | "Hike". There is no HIKE enum; ActivityType-Expansion is still only a recommendation |
| cycling, handCycling | cycling | "Bike Ride" (or "Indoor Ride") |
| swimming | swimming | "Swim" |
| rowing | rowing | "Row" |
| elliptical | elliptical | "Elliptical" |
| stairClimbing, stairs | stair_climber | "Stair Climber" |
| traditional/functionalStrengthTraining, HIIT, yoga, crossTraining, everything else | **not imported in v1** | Watch strength sessions would duplicate Forge's own logged lifts and carry no sets. They are counted and shown as "N other workouts not imported" |

**Filters:**
- Drop workouts shorter than 60 s or longer than 24 h.
- Drop distances over 500 km, workouts that start in the future, and anything before 2014-09-17 (when
  HealthKit launched).

**Storage:**
- Distance is stored as `distance` in miles (`distance_unit 'mi'`), rounded to 3 decimals. This is the same
  shape `saveActivity` writes, and it is what goals (0035), honors (0078) and challenges (0061) read.
- Pace is derived, never imported (EAI §3).

## 5 · Deduplication

**The order a workout is checked in, first match wins** (`src/domain/health/dedup.ts`, pure):

1. **Forge wrote it.** The source bundle ID is `com.qest4.forgelegacy`, **or** the metadata `HKExternalUUID`
   matches a Forge workout ID. → Skip silently. This is the echo check.
2. **Already seen.** The UUID is in the ledger (imported, skipped or deleted) or in
   `workouts.external_id`. → Skip silently (Scenario C). This also stops a deleted import from coming back.
3. **Overlaps a Forge GPS-tracked or live-session workout** of a compatible type, with overlap ≥ 50% of the
   shorter one. → Skip silently. The Forge record wins (Scenario A). Example: a Forge phone run plus an Apple
   Watch run of the same outing.
4. **Looks like a manual log.**
   - `saveActivity` stamps `started_at = now − duration`, so time overlap is unreliable here.
   - The rule is: same type, same local day, and distance within 10% or duration within 10%.
   - → **Possible duplicate:** it appears in the Review list with "Skip" pre-selected, and the athlete decides
     (DEDUP §3.3).
   - During ongoing sync (no review screen), it is held and a badge shows on the Apple Health row: "1 workout
     needs a look".
5. **Two Health workouts of the same effort** (Scenario B), for example Apple Watch plus Garmin Connect, or
   Garmin plus Strava. They overlap by ≥ 50%.
   - Keep the **most direct source** (DEDUP §5): an Apple Watch device, or a manufacturer app (Garmin Connect,
     COROS, Polar, Wahoo), wins over an aggregator (Strava, Nike Run Club and other apps).
   - If both are direct, keep the longer distance and list the other as a possible duplicate.
6. **Otherwise,** import it.

**Server-side guard:** the unique index in §6 makes a double insert impossible even if two devices sync at the
same moment. The RPC uses `on conflict do nothing`.

## 6 · Migrations (describe here; write in the `migration` skill; take the next free number, 0234 today)

**`0234_apple_health_import.sql`** is additive only. The deployed build-9 client never sends these fields,
and the defaults keep it correct.

**1. New columns on `workouts`:**
- `source text not null default 'forge'`, with check `in ('forge','apple_health')`
- `external_id text` (the HealthKit UUID)
- `source_label text` (≤ 60 characters, for example "Garmin Connect" or "Apple Watch")
- Source and external ID are **immutable**. A `before update` guard rejects changes to them (DEDUP §2).

**2. Unique index:** `workouts_external_uniq on (athlete_id, source, external_id) where external_id is not null`.

**3. New table `external_activity_ledger`:**
- Columns: `athlete_id`, `source`, `external_id`, `outcome` (imported | skipped | duplicate | deleted),
  `workout_id` (nullable, no FK, per the WSR-001 pattern), `created_at`.
- Primary key: (athlete_id, source, external_id).
- Owner-only RLS, with delete cascading from `auth.users`.
- **Purpose:** it remembers "skip" and "deleted" decisions, so a re-sync never re-adds them.

**4. New RPC `import_external_workouts(p_source text, p_rows jsonb) returns jsonb`:**
- `security invoker`, at most 200 rows per call.
- Each row is validated server-side (the §4 filters again).
- It inserts with `state = 'saved'`, `started_at = start`, and **`saved_at = end`**, the historical time and
  not `now()`.
  - Every server read (honors `honor_metrics`, goals `goal_metric_value`, competitions, squad totals) keys on
    `saved_at`. Stamping `now()` would put a year of history into this week's goals and streaks.
- **Chapters:** `chapter_id` is the active chapter only if the workout's date is ≥ that chapter's `start_date`.
  Otherwise it is null. A sealed chapter's `workout_count` is never changed.
- It writes the ledger rows.
- It calls `evaluate_honors('import')` **once per call, not once per row**, and returns
  `{inserted, skipped, honors}`.
- ⚠ Check `evaluate_honors` accepts a new context string, or reuse `'live_session'`. Verify by reading the
  source, per the definer rule.

**5. Keep squads quiet about imports:**
- Recreate trigger `push_workout_saved` with `when (new.state='saved' and new.saved_at is not null and
  new.source = 'forge')`.
- Add `and w.source = 'forge'` to the `squad_training_finished` branch of the notification definition.
  **Rebuild it from its newest body (0163:649), never an older one** (0153's own warning).
- Auto-post is client-side, on `workout-complete.tsx`, and imports never pass through it. Nothing to change.

**6. Consent kind:** widen `health_consents_kind_check` to include `'apple_health'`.

**7. Deleting an imported workout:** RLS already allows the owner to delete, and child rows cascade. The client
writes the ledger `deleted` row first.

## 7 · Privacy, Apple rules, Sentry

**Apple rules (Guideline 5.1.3 and HealthKit terms) and how v1 meets each:**
- **No advertising, marketing or data brokers.** Forge has none.
- **No sharing with third parties except to improve the user's health management, with permission.**
  - Imported workouts become training history, so Coach Holt can read them. That is health management, and it
    already sits behind the `ai_sharing` consent.
  - The privacy policy says so (below).
- **No health data in iCloud.**
  - Imported rows go to Supabase, which is our service provider, not iCloud.
  - **Nothing from HealthKit is ever written to AsyncStorage or files**, because those are included in iCloud
    device backups. Only the opaque anchor is stored there.
  - The Review list lives in memory only.
- **Privacy policy URL** is already set.
- **The UI must clearly identify HealthKit (Guideline 2.5.1):** the row is called "Apple Health" and uses
  Apple's wording. Do not use the Health app icon without the Apple marketing guidelines.

**Sentry (build 10) and our own `client_errors` (0176):**
- The health module reports **error codes only** (`hk_auth_failed`, `hk_query_failed`, `hk_save_failed`,
  `hk_anchor_invalid`).
- It never reports a sample, a date, a distance or a source name.
- `apple-health.ts` catches every error before it can reach a global handler.
- A test asserts that the error-report builder rejects objects.
- Sentry's `beforeBreadcrumb → null` already drops the automatic trail.

**Draft wording, which must be LIVE before build 10 reaches a tester** (P6-A1-D8; ship it in the same pass as
the Sentry policy edits):

- **`site/privacy.html` §2**, a new subsection after "Precise location":

  > **Apple Health (iPhone, only if you connect it).** If you connect Apple Health in Settings, Forge reads your
  > workouts from it: the type (run, walk, ride, swim, row), when it started and ended, its distance, and which
  > app or device recorded it (for example "Garmin Connect" or "Apple Watch"). We do not read heart rate,
  > calories, routes, sleep, or any other Health data. Each workout you choose to add becomes part of your Forge
  > training history and is stored with the rest of it. If you turn on "Save Forge workouts to Apple Health",
  > Forge also writes the workouts you finish in Forge to Health on your phone. Data from Apple Health is never
  > used for advertising or marketing, never sold, and never shared except as this policy describes.

- **§4, after the provider list:**

  > Apple Health is on your own phone, not a company we send data to.

  Also add "and workouts imported from Apple Health" to the Anthropic bullet.

- **§6 Deleting your account:**

  > Workouts Forge saved to Apple Health stay in the Health app on your phone. You can delete them there.

- **§7 Your choices, a new bullet:**

  > **Apple Health:** off unless you connect it. Disconnect in Settings → Apple Health, and revoke access in the
  > Health app → Sharing → Apps.

- **Other policy files:**
  - Add a dated "What changed" card.
  - `site/health-data.html` §2: replace "We do not buy health data or get it from other companies." with
    "…and, if you connect it, from Apple Health on your phone. We do not buy health data." Bump the version,
    because CONSENT_POLICY_VERSION re-asks.
  - `Docs/Legal/Privacy-Policy.md` L167 ("We do not read from Apple Health") is stale. Mirror the new text or
    mark the file superseded.

- **Labels (`App-Store-Privacy-Labels.md` v1.3):**
  - No new type is needed. **Health** and **Fitness** are already declared: Linked, App Functionality plus
    Personalization, not tracking. Add "Apple Health (if connected)" to their source cells.
  - Apply the "three move together" rule, which includes `src/domain/settings/content.ts`.

**App Review notes (add to the submission checklist):**

> Forge reads workouts (type, start and end, distance, source app) from HealthKit so runs recorded on a Garmin
> or Apple Watch appear in the athlete's training history. It writes the workouts the user finishes in Forge.
> To test: Settings → Training → Apple Health → Connect. The review device may have no workouts. Record a short
> walk in the Apple Fitness or Workout app, or see the attached screen recording. HealthKit data is not used for
> advertising, is not stored in iCloud, and is described at forgelegacy.app/privacy.

Attach a 30-second recording of connect → review → history.

## 8 · Free vs Premium

The Decision 1 recommendation is **everything free in v1**:
- Reading Health costs us nothing per user: no API fees and no server work beyond one RPC.
- It removes the biggest reason an endurance athlete leaves.
- Charging for "your own runs appear" fights Never-Charge-For-History.

If the PO picks the EAI hybrid instead, gate only the §3.4 foreground sync with `useTier() === 'PREMIUM'`. The
first-connect import stays free, and free users get a **Check now** that is limited to once. Everything else is
unchanged.

## 9 · What is built and tested in pure TypeScript before build 10

Everything below uses relative runtime imports only; `@/` is type-only. Run it with
`node --test --experimental-strip-types`.

- **`src/domain/health/activity-map.ts`:** the HK type identifier → `{ activityType, name, indoor }`, the
  reverse map for write-back, the §4 filters, and the meters → miles conversion. Tests cover every row in §4 and
  every boundary.
- **`src/domain/health/source.ts`:** `sourceLabel(sourceName, bundleId, productType)` gives "Apple Watch",
  "Garmin Connect", "Strava" and so on. `sourceRank()` implements the §5.5 precedence. `isForgeEcho()` is the
  echo check.
- **`src/domain/health/dedup.ts`:** `classify(healthWorkouts, forgeWorkouts, ledger)` returns
  `{ importRows, possibleDuplicates, skipped[{reason}] }`. Tests cover each §5 rule, including real shapes: a
  Forge phone run plus a Watch run, a manual log done 3 hours later, Garmin plus Strava, and a re-sync after
  delete.
- **`src/domain/health/import-rows.ts`:** builds the RPC payload, chunks it into 200-row calls, and makes the
  summary copy ("Found 23 workouts…").
- **`src/domain/health/write-back.ts`:** Forge workout → the save-sample input, with the `HKExternalUUID`
  metadata.
- **`src/domain/health/error-report.ts`:** error-code-only reports. The test proves a sample object cannot pass.
- **`src/domain/consent/consent.ts`:** the `apple_health` kind, its copy, and its version. The existing tests are
  extended.
- **`src/domain/settings/content.ts`:** the `hasAppleHealth` row. `content.test.mjs` pins the new key order.
- **Rank:** in `src/domain/rank/signals.ts`, `RawSession.imported` feeds `importedActiveWeeks` and
  `importedSessions`, and `nativeDates` excludes imported sessions. This follows the file's own warning. Tests
  cover the prestige floor with imports.
- **Also doable now, but not testable until the device:** the migration (apply it early, since it is additive),
  the screen UI (web shows it as unavailable), and the policy text.

## 10 · Build order and files

1. **Pure domain + tests (§9).** No native code. Can be merged and shipped to web at once, where it stays inert.
2. **Migration 0234** (§6), through the `migration` skill.
   - Verify function sources after applying.
   - Proof: insert the same UUID twice (the second is a no-op), and confirm an import raises no push-outbox row.
3. **Native wrapper:**
   - `src/lib/apple-health.ts` (guarded, lazy require) and `src/lib/apple-health.web.ts` (stub)
   - `package.json`: `"@kingstinct/react-native-healthkit": "16.0.0"`
   - the `app.json` plugin entry (§3.1)
4. **Data layer, `src/data/apple-health-sync-live.ts`:**
   - reads the anchor
   - queries Health
   - fetches the Forge workouts in the window and the ledger
   - calls `classify` and then the RPC
   - handles the anchor-invalid fallback
   - Also hook it into the root layout's `AppState` foreground handler.
5. **UI:**
   - `src/app/apple-health.tsx` (connect, review, connected state, disconnect)
   - the Settings row and the link from `health-consent.tsx`
   - an "Imported from {source_label}" line on `src/app/activity/[id].tsx` and a small mark on the
     `activity-history.tsx` row. It is informational only.
   - "Remove from Forge" on imported workouts only
6. **Rank wiring:** `src/data/rank-live.ts` selects `source` and passes `imported`.
7. **Write-back hook** in `src/domain/workout/save.ts` (both save paths).
8. **Policy + labels + review notes** (§7), live before TestFlight. Update `Docs/App-Store-Submission-Checklist.md`
   and the Master Status.
9. **Build 10** (PO runs it; watch for the Apple 401 sign-in). Then the device test in §11.

## 11 · Device test plan (build 10, PO's iPhone plus a Garmin account)

1. **Fresh connect:** the permission sheet lists Workouts plus the distances. After Allow, the Review step shows
   the last 90 days of Garmin runs, labelled "Garmin Connect".
2. **Deny read in the sheet:** you get the "No workouts found… Health app → Sharing" message and no crash.
3. **Add N:** the workouts appear in Activity History on their **real dates**.
   - Progress totals rise.
   - A goal created last week counts only the runs since then.
   - No squad push or feed "finished training" event fires. Check on a second account.
4. **Garmin run synced this morning, then open Forge:** it appears within 10 s of foreground. Do it once more
   and confirm there is no second copy.
5. **Forge phone run with the Apple Watch also recording:** only the Forge run exists. The Watch copy is
   skipped.
6. **Log a run manually, then import the same Garmin run:** it shows as a possible duplicate with Skip
   pre-selected.
7. **Write-back:** finish a Forge strength session and a run. Both appear in the Health app, with Forge as the
   source. Re-open Forge and confirm neither is re-imported (the echo check).
8. **Remove an import, then Check now:** it does not come back.
9. **Disconnect → Keep, then reconnect:** no duplicates (the unique index plus the ledger).
10. **Rank:** a year-long import does not jump past the prestige native floor.
11. **Build 9 device on its OTA, and web:** no Apple Health row, no crash.
12. **Sentry:** force an `hk_query_failed` and confirm the event carries the code only.

## 12 · Decisions for the PO

1. **Free or Premium?** Recommend **all free in v1**: the history pull, ongoing sync and write-back. It costs us
   nothing to run, and the EAI split was a framing, not a lock. The alternative is a free first import plus
   Premium ongoing sync (§8).
2. **How Apple Health runs count toward Rank.** The locked rank rules (R-D46, CAL Q7/Q11) give imported sessions
   half credit at prestige ranks and exclude them from the recent-engagement window. A Garmin-only runner would
   progress more slowly than one who records in Forge. Recommend **follow the lock for v1**: they count fully in
   Progress, Goals, Honors and non-prestige Rank. Revisit with a rank amendment if testers feel punished.
3. **Routes from Apple Health.** EAI §3 and Route-Amendment-001 still say "don't import routes", so Garmin and
   Watch runs arrive with no map. Recommend **no routes in v1**, then a short route-import amendment for the next
   build. The library already supports `getWorkoutRoutes`, and the Route-Sharing rules would apply.
4. **First-import window and honors.** Recommend **90 days**, with honors earned from that history granted
   quietly: one summary line, "3 honors from your history", and no one-by-one ceremonies. The alternative is 12
   months, which is closer to EAI's example. It gives a bigger first-day payoff, but more rank and honor churn at
   once.
