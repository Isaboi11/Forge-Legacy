# Run Course Builder — Build Plan (Build 10)

**Date:** 2026-09-28 · **Status:** plan only, nothing built · **Target:** native build 10, with parts shippable by OTA first (§9)
**PO request 09-28:** *"put the goal run amount and it shows and build the course for us"*: the athlete types a goal
distance, Forge draws a loop on real roads and paths from where they are standing, and then guides them round it.
**Ships alongside:** the run mile marker (chime, buzz and a spoken split, working with the phone locked) and Live
Activities for runs (`Docs/Live-Activities-Build-Plan.md`). The spoken turn cues use the same `audio` background mode
and the same speech engine as the mile marker. No second native change is needed.

---

## 0 · The short version

- **Provider:** OpenRouteService (ORS, run by HeiGIT) `round_trip` on the `foot-walking` profile. It is the only
  hosted option on the list that generates a loop of a target length from one point and is free at our scale.
- **Always through our own Edge Function `course-build`.** The ORS key stays server-side. ORS never sees who the
  athlete is: no user id, and no phone IP because the request comes from Supabase's server. The function asks for 3
  loops at once and retries any loop that misses the target distance.
- **On the phone:** a pure-TS "course follower" does the work. It tracks how far along the course you are, raises an
  off-course alert with hysteresis so it doesn't flicker, and times the turn cues. It is fed by the fixes
  `useRunTracker` already accepts.
- **Build 10 is needed only for spoken cues with the phone locked.** Everything else can ship by OTA first: build,
  preview, save, follow on the map, the off-course alert, and haptic or notification alerts while locked.

## 1 · What exists today (read, not guessed)

| Piece | Where | What it means for this plan |
|---|---|---|
| GPS track | `src/domain/run/run-core.ts` (`acceptFix`, Kalman-smoothed `TrackPoint`s, `goalProgress`/`goalMet`) | The follower reads the same accepted points. It never starts a second GPS stream. |
| Locked-phone GPS | `src/domain/run/background-task.ts`: `BestForNavigation`, 3 m / 1 s; the task **only buffers** fixes to AsyncStorage; `useRunTracker` drains them | While locked, nothing evaluates fixes yet. §7 adds a small check inside the task. |
| Map | `src/components/workout/RouteMap.tsx` (react-native-maps 1.27.2, Apple Maps, no key) + `RouteMap.web.tsx` (SVG trace, **no tiles** on web) + `RouteSheet.tsx` fullscreen | A second polyline and a "you're here" dot are JS-only changes, so they can go by OTA. |
| Stored route | `workout_sets.route` (0162), encoded polyline from `route-privacy.ts` `encodePolyline` | Reuse the encoder for courses. ⛔ The 200 m trim stays gone (PO veto, Route-Sharing-Amendment-001 D-RS-1). Never reintroduce it for courses or runs. |
| Goal distance | `exercise.targetMi` on the cardio block (`CardioBlockCard.tsx` l.333). Holt's endurance rulebook writes `targetMi` onto plan days (`rulebook/endurance.ts`: easy, long run, race day) | "Today's run is 5 mi" already reaches the card. The builder pre-fills from it. |
| Where runs start | Home "Something else today?" and Workouts "Track a Run" → `/workout` with one cardio block | The builder's entry point is on the cardio block (outdoor run/walk, before Start), plus a standalone door (§2). |
| Proxy pattern | `supabase/functions/food-search/index.ts`: CORS block + `OPTIONS`, signed-in only (`auth.getUser()`), keys from `Deno.env` | `course-build` copies it exactly. ⚠ Without the CORS block, web gets silent empty results. |
| Shared pure TS in functions | `coach-ask` imports `../../../src/domain/coach/*.ts` | The function can import the same `src/domain/run/course/*.ts` the app uses, so there is one rulebook. |
| Speech | `expo-speech` **not installed**; `expo-audio`, `expo-haptics`, `expo-notifications` are in the binary | The speech module and `audio` background mode come with the mile-marker work in build 10. |
| Design | `Forge Active Run.dc.html` / `Forge Run Record.dc.html` cover the live run and the record. **Nothing covers building or following a course** | **Design is owed.** The screens are described in words in §2. |

## 2 · What the athlete sees

Dark Forge theme, with bronze `#BA8654` as the earned accent. Under Alabaster, follow the two-theme rule: layout in
both themes, colour in one, and bronze only on the selected option.

1. **Door.** Before Start on an outdoor run or walk block, a row: **"Build a course"**. If a plan day set
   `targetMi`, it reads **"Build a 5 mi course"**. There is a second door on the run entry in the Create sheet.
   There is no new tab.
2. **Distance.** A number field in the athlete's units (mi/km), pre-filled from the plan day or else the last run,
   with steps of 0.5. Allowed range is 0.5 to 20 mi (ORS caps round trips at 100 km; 20 mi matches
   `LONG_RUN_DISTANCE_CAP_MI`). Toggle: **Loop** (default) / **Out and back**.
3. **Start point.** Defaults to **Current location**, shown as a dot on the map. **Move start** lets them drag a pin,
   for example to start from a park and not the front door (see §8).
4. **Options.** 2–3 loops, each drawn on the map in a different weight. Selected is bronze; the others are muted.
   Each card shows distance, climb (↑ ft/m), and a tag: **Flattest** / **Hilliest** / **Most varied**.
   **Shuffle** fetches 3 new loops. Under the cards is one line: *"Courses use public map data. Check the route
   is safe and lit before you go."*
5. **Start.** Tapping **Run this course** returns to the cardio block with the course attached. **Start** works as it
   does today. The target becomes the course length, and the athlete can still edit it.
6. **During the run:**
   - The map shows the course line (muted) and the part already covered (bronze). The athlete's position is the
     "you're here" dot.
   - A strip above the stats shows the next turn: "↱ Oak St · 400 ft".
   - Progress toward the goal uses the **measured** distance, as today, plus "course 62%".
   - **Off course:** a banner reading "Off course · 60 m from the route", a double buzz, and one spoken line.
     When they are back on the route, one soft buzz and the banner clears.
   - **Spoken cues with the phone locked** (build 10) are about 50 m before each turn: "In 150 feet, turn left onto
     Oak Street." These share one voice queue with the mile-marker splits, so they never talk over each other.
     There is a **Voice cues** switch on the card.
7. **Finish.** The usual run record, plus a course line: "Maple Loop · 5.02 mi course · finished 100% · off course
   once". **Save course** takes a name and marks it as a favourite. The run's own `route` is stored exactly as it is
   today.
8. **Saved courses.** A "Saved" row appears at the top of the builder with name, distance and climb, and the last
   time it was run. Tapping one skips steps 2–4. Saved courses can be renamed and deleted. They are **never shown to
   anyone else** (§8).

## 3 · Provider comparison (web research 09-28; ⚠ = not verified against the provider's own ToS page)

| Provider | Makes loops? | Free tier | Paid | Commercial / storing | Verdict |
|---|---|---|---|---|---|
| **OpenRouteService** | ✅ `options.round_trip {length, points, seed}`. Foot-walking and foot-hiking profiles. Max 100 km | Standard plan: 2,000 directions/day, 40/min (ORS FAQ) | Higher plans on request | ⚠ Commercial use on the free plan is not confirmed; the ToS page did not render. OSM data (ODbL): attribution "© openrouteservice.org by HeiGIT · Map data © OpenStreetMap contributors". Key must stay server-side (FAQ) | **Recommended.** Confirm the ToS before any tester sees it. |
| GraphHopper | ✅ `algorithm=round_trip`, `round_trip.distance`, `round_trip.seed` | 500 credits/day, **non-commercial only** | €69/mo (5,000/day) | ⚠ Storage terms not stated on the pricing page | The fallback, if ORS is not allowed commercially. Best loop quality of the paid options. |
| Stadia (hosted Valhalla) | ❌ No loop endpoint, so we would generate waypoints ourselves (§4.4) | 200k credits/mo, non-commercial | $20/mo Starter, commercial | ⚠ | The second fallback, using our own loop generator. |
| Mapbox Directions | ❌ A→B only; loops via the Optimization API | 100k/mo | per-request | ⚠ Mapbox terms reportedly require showing results on a Mapbox map, and we use Apple Maps | No. |
| Valhalla self-host | ❌ (as Stadia) | Server cost + OSM imports + ops | — | Our own | No. It is ops work we don't have. |
| Apple MapKit `MKDirections` | ❌ A→B walking only | Free | — | Native only; no server and no web | No. It would need a native module and does not make loops. |

**Cost at our scale:** one "Build" costs 3–6 ORS calls, so the free 2,000/day covers roughly 350–600 builds a day.
Our function also caps each athlete per day (§10), so one person cannot use up everyone's quota.

## 4 · How a loop is made (in `course-build` + `src/domain/run/course/`)

1. **Request.** For 3 seeds, send `POST /v2/directions/foot-walking/geojson` with
   `{coordinates:[[lon,lat]], options:{round_trip:{length:L, points:P, seed:S}}, elevation:true, instructions:true, units:'m'}`.
   Seeds are random per build, so each tap of Shuffle gives new loops. `P` = 3 for goals under 3 mi, 4 up to 8 mi,
   and 5 above that; more points make a rounder loop. The 3 requests run in parallel.
2. **Tolerance.** A loop is accepted if its distance is within **±5% of the goal, or ±0.1 mi if that is larger**
   (short runs need the floor). ORS treats `length` as a preference, not a promise.
3. **Retry.** If a loop misses, scale the request: `L' = L × goal / actual`, clamped to 0.7–1.4×, with a new seed.
   A loop gets at most 2 retries, and a build makes at most **8 calls in total**. If fewer than 2 loops pass, return
   the closest ones anyway, marked "4.7 mi — closest we found". Tell the athlete honestly; never pad the line.
4. **Fallback generator (provider-agnostic, pure TS).** If ORS returns nothing, fails, or we switch provider:
   place `P` waypoints on a circle of radius `r = goal / (2π × 1.3)` at a random bearing (the 1.3 is a road-winding
   factor, tuned by retry), route start → w1 → … → start with any A→B foot router, and apply the same tolerance and
   retry. This keeps us from being locked to ORS.
5. **Remove near-duplicates.** Two loops that share more than 70% of their 50 m grid cells count as the same loop,
   so we keep one and try another seed.
6. **Out and back.** Take a passing loop and cut it at `goal/2` along its length. The course is that half and then
   the same half reversed. It costs no extra call. The turn point gets a "Turn around here" cue.
7. **Elevation.** ORS 3D coordinates give gain and loss using the same ignore-small-wiggles idea as
   `CLIMB_THRESHOLD_M` (3 m). Tags come from the ranking: lowest gain is Flattest, highest is Hilliest.
8. **Turn cues.** ORS `steps` (type, street name, distance, `way_points` index) are turned into our own short
   phrases, because theirs are wordy. We drop "continue straight" steps under 30 m and merge two turns less than
   20 m apart ("Left, then right onto Pine"). Each cue records the metre-along-course where it fires.

## 5 · Following the course (`follow.ts`, pure)

- **Progress.** Each accepted `TrackPoint` is projected onto the course polyline, but only within a **window of
  −30 m to +400 m** around the last progress point. Out-and-back courses and figure-8s cross themselves, and a global
  "nearest point" would jump you to the wrong leg. If there is no match in the window for 20 s, search the whole
  course (to rejoin after a detour).
- **Off course.** Off when the distance to the course is **over 40 m on 3 fixes in a row (about 10 s)**. Back on when
  it is **under 25 m on 2 fixes**. The gap between those two numbers is the hysteresis. Fixes with accuracy worse than
  30 m don't count either way. The whole run can raise at most one alert per 60 s.
- **Cues.** A cue fires once, when progress passes `cueAt − lead`. The lead is 50 m, or 25 m when walking. Cues are
  never fired while off course. If the athlete skips a turn, the next cue speaks normally.
- **Finish.** When progress is at least 97% and they are within 40 m of the start or finish point, show "Course
  complete". The run itself is still ended by the athlete, as today.
- **No automatic re-routing in v1.** Re-routing needs a network call mid-run. v2 idea: a "Route me back" button
  that asks for a path to the nearest point ahead.

## 6 · Tuning numbers (all constants in `course/constants.ts`, all tested)

±5% / 0.1 mi tolerance · 8-call cap · 40/25 m off/on · 3/2 fixes · 30 m accuracy gate · 50 m cue lead ·
−30/+400 m window · 97% finish. These are first guesses. Before we trust them, confirm them on a device with a
real run (§11): prove the gap between on-course and off-course readings, don't assume it.

## 7 · Alerts while the phone is locked

Today the background task only saves fixes. Add a small step inside `TaskManager.defineTask`:

1. Load the active course from AsyncStorage (written when the run starts).
2. Run `follow.ts` over the new fixes.
3. Save the follower state.
4. If a cue or an off-course event fires, act on it:
   - **Before build 10 (OTA-able, should work, verify on device):** a local notification from `expo-notifications`
     with sound and vibration, e.g. "Turn left onto Oak St". It shows on the lock screen and buzzes the watch
     wrist. `expo-haptics` does nothing while the app is in the background, so the notification is the buzz.
   - **Build 10:** speak it through the mile-marker speech queue, using the `audio` background mode and ducking
     music. Also post the notification, silently, as a visual record.

## 8 · Privacy

- **Start point goes to ORS through our function.** The function sends only coordinates and length. Coordinates are
  never logged: log `goalM`, call count and status only. Results are not cached server-side.
- **Draft policy sentence** (batch with the Sentry + Apple Health edits in `site/privacy.html`,
  `Docs/Legal/Privacy-Policy.md`; the PO approves the wording, and it is published before build 10 reaches a tester):
  > *"When you ask Forge Legacy to build a running course, we send the starting point and distance you chose, with no
  > name, account or device identifier, from our servers to openrouteservice (HeiGIT gGmbH, Germany) to plan the
  > route. They do not receive who you are, and we do not keep a copy of the request."*
- **Saved courses reveal where you live**, because most loops start at the front door. They are owner-only: RLS lets
  only the owner select, insert, update or delete them. They are not in squad, friend, post or admin views, and they
  are **not shareable in v1**. "Move start" (§2.3) is the athlete's own tool for choosing a different start point.
  Sharing a *run's* route stays exactly as it is today: opt-in per post, full track, no trim (PO veto).
- **Label check:** Precise Location is already declared for App Functionality and not used for tracking
  (`Docs/App-Store-Privacy-Labels.md`). A processor acting for us does not change the label. ⚠ Separately, the
  `NSLocationAlwaysAndWhenInUseUsageDescription` string says *"the route is never shared"*. That has been stale
  since route sharing shipped. Build 10 is the moment to fix it, because it is an `app.json` change. Flagged here, not
  edited.

## 9 · Build 10 vs OTA (honest)

| Piece | Needs build 10? | Why |
|---|---|---|
| `course-build` Edge Function, ORS key secret | No | Server only |
| Builder screen, options on the map, saved courses | **No (OTA)** | react-native-maps is already in the binary; new polylines are JS |
| Follower: progress, off-course banner, on-screen next turn, foreground buzz | **No (OTA)** | JS plus `expo-haptics`, already in the binary |
| Locked-phone alerts as notifications (§7) | **No (OTA)**, verify on device | `expo-notifications` plus the location background mode are already in build 9 |
| **Spoken** turn and off-course cues with the phone locked | **Yes** | Needs the speech module and the `audio` background mode, both arriving with the mile marker |
| Course on the Live Activity ("↱ Oak St · 400 ft") | Yes, optional | Live Activity is build 10. Recommend v2, keeping build 10's Swift minimal |

⛔ Any OTA before build 10 goes on build 9's own branch (`ota/build9-js`), from a clean tree. Spoken cues must be
guarded with `requireOptionalNativeModule`, so the same JS runs safely on build 9 and speaks on build 10.

## 10 · Migration and entitlement (described, not written; use the `migration` skill; number = next free at apply time)

- **`run_courses`:** `id uuid pk`, `user_id uuid → auth.users` (on delete cascade), `name text` (≤ 60),
  `kind text check in ('loop','out_back')`, `activity text` (run/walk), `polyline text` (encoded, precision 5),
  `distance_m int`, `gain_m int`, `loss_m int`, `cues jsonb` (compact `[{atM, kind, street}]`), `provider text`,
  `seed int`, `is_favourite bool default true`, `run_count int default 0`, `last_run_at timestamptz`, `created_at`.
  RLS is owner-only for all four verbs, with no other policy. Index on `(user_id, last_run_at desc)`.
- **Per-athlete build cap:** add `course_builds_per_day` to `entitlement_config` (read through `my_entitlement()`),
  counted by the function in a small `course_build_usage (user_id, day, count)` table written with the service role.
  Changing the number is a SQL update, not a release.
- **Optional, not v1:** a `course_id` column on `workout_sets`, for "you've run Maple Loop 6 times".

## 11 · Web preview

It works, but honestly. The browser's geolocation supplies the start point, and the options draw through
`RouteMap.web.tsx` as a trace with no street tiles. Keep its existing caption and add "Streets show in the app".
Saving and following work in the foreground. On web there are no locked-phone alerts and no voice. The CORS block
is mandatory.

## 12 · Safety

We cannot know whether a road is lit, has a pavement, or is safe at night, and OSM data can be wrong. The one-line
disclaimer in §2.4 covers this. It makes no health, fitness or medical claims, and Holt says nothing about the course.
Out-and-back is offered partly because it keeps the athlete on known ground.

## 13 · Pure TS: buildable and `node --test`-able now (no key, no device)

All files go in `src/domain/run/course/`. Runtime imports use relative paths with `.ts`; `@/` is type-only. The
Edge Function imports the same files.

| File | Does |
|---|---|
| `geometry.ts` | cumulative length, point-to-segment metres (local equirectangular), windowed projection |
| `pick.ts` | tolerance check, retry length scaling, 8-call budget, grid-overlap de-dupe, Flattest/Hilliest ranking |
| `out-and-back.ts` | cut at half, mirror, re-index the cues, add the turn-around cue |
| `waypoint-loop.ts` | fallback circle-of-waypoints generator (§4.4) |
| `elevation.ts` | gain/loss with the 3 m threshold |
| `cues.ts` | ORS step → phrase, drop and merge rules, imperial/metric wording |
| `follow.ts` | follower state machine (§5), replayable from any saved track |
| `constants.ts` | every number in §6 |

Tests go in `course/__tests__/*.test.mjs`: loops, figure-8s, out-and-back overlap, GPS jitter at 35 m (must not
alert), a real 60 m detour (must alert and then clear), a missed turn, and metric vs imperial.
⚠ **Fixtures:** start with made-up geometry, but replace it with a **real saved ORS response and a real recorded
track** before anyone trusts the tuning. Tidy fixtures have fooled us before.

## 14 · Device test plan (TestFlight)

1. Build 3 mi and 5 mi loops at home. Distances should be within tolerance, and Shuffle should give different loops.
2. Run a loop with the phone in a pocket. Take one deliberate wrong turn. The alert should come within about 15 s
   and clear when you rejoin.
3. Walk a 1 mi out-and-back. The turn-around cue should fire and progress should never jump legs.
4. With the phone locked and music playing, cues should duck the music and not overlap mile-marker splits
   (build 10). On build 9 + OTA, notifications should arrive instead.
5. Aeroplane mode at Build: you should see a clear error, and the saved courses should still work.
6. Save a course, re-run it, delete it, and check a second account can't read the row (RLS).
7. On the web preview: build and draw a course, with no crash.

## 15 · Build order and files

| Phase | Work | Files | Ships |
|---|---|---|---|
| **1 · Pure core** | §13 + tests | `src/domain/run/course/*` | now (no user-facing change) |
| **2 · Provider** | Read the ORS ToS; the PO creates the free HeiGIT key; set the `ORS_API_KEY` secret; write the function; save one real response as the fixture | `supabase/functions/course-build/index.ts` | server |
| **3 · Builder UI** | Design pass first (owed), then the builder sheet, options on the map, the cardio-block door | `src/components/workout/CourseBuilderSheet.tsx`, `CourseOptionCard.tsx`, `RouteMap.tsx`/`.web.tsx` (extra `course` + `you` props), `CardioBlockCard.tsx` | OTA (build 9) + web |
| **4 · Save** | Migration, saved-courses row, rename/delete | migration, `src/domain/run/course/saved-courses.ts` (Supabase side, outside `course/` tests) | OTA |
| **5 · Follow** | Follower wired into `useRunTracker`; banner, next-turn strip, haptics, locked notifications from the background task | `src/hooks/useRunTracker.ts`, `src/domain/run/background-task.ts`, `CardioBlockCard.tsx` | OTA, then device test |
| **6 · Voice** | Speak cues through the mile-marker speech queue | the mile-marker voice module (build 10) | **build 10** |

Rough size: phase 1 is 1 day, phase 2 is half a day, phases 3–5 are about 4 days plus a design pass, and phase 6 is
half a day on top of the mile marker.

## 16 · Decisions for the PO

1. **Provider: OpenRouteService (free), called only through our server.** *Recommend yes.* If its terms turn out not
   to allow commercial use, move to GraphHopper Basic (€69/mo) before public launch; nothing else changes.
2. **Ship the builder by OTA before build 10**, with spoken cues arriving in build 10 and notifications standing in
   until then. *Recommend yes.* Testers get it weeks sooner, and the only piece that must wait is the voice.
3. **Free vs Premium:** *Recommend building and following courses be free, with 5 builds a day and 3 saved courses.
   Premium gets unlimited saved courses and 25 builds a day.* The free version is the hook the PO described. Saved
   favourites are a fair Premium reason. Both numbers live in `entitlement_config`, so they are one SQL change.
