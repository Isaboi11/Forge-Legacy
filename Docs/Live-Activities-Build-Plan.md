# Live Activities — Build Plan (Build 10)

**v1.0 · 2026-09-28** · Queued PO 09-27 · Status: PLANNED, not started
**PO decisions 09-28:** built with `@bacons/apple-targets` (as the Watch) · read-only in build 10, buttons next native build · ⭐ **RUNS TOO** (distance, pace, elapsed — overrides the strength-only recommendation in §9) · ⭐ NEW: a **mile marker** on runs — a sound + buzz each mile — PO 09-28: build the full version (chime + buzz + spoken split) and ship it IN build 10, not as an early OTA.
**What:** during a workout, a Live Activity shows the current exercise and set, plus the rest countdown, on the
lock screen and in the Dynamic Island. The athlete never has to unlock the phone.
**How:** a new `widget` extension target (`@bacons/apple-targets@5.0.0`, the same plugin that builds the Watch)
and a small new Expo module that starts, updates and ends the activity. It gets its data from the
**same projection the Watch uses** (`projectWatchState` in `src/domain/workout/watch-projection.ts`).
**Governs:** this plan is the amendment `Rest-Timer-Architecture-v1.0.md` §13.1 asks for (the attributes schema,
the layout and the lifecycle). When it is signed off, file it as *Rest-Timer Amendment 002*.

---

## 0 · The one-paragraph version

The phone already works out, every time something changes, what the Watch should show: the phase
(idle / active / rest / finished), a ready-to-display target line, and `restEndsAt`. The Live Activity is a
second listener for that same data. The screen hands it to one more function next to `pushWatchState`. A new
module turns it into an ActivityKit `ContentState`. SwiftUI draws the countdown with `Text(timerInterval:)`,
so it runs while the app is suspended and needs no push. The v1 card is **read-only**. Nothing is added to the
server and nothing changes in the logger.

## 1 · What the athlete sees

| Surface | Active (on a set) | Rest | Finished |
|---|---|---|---|
| **Lock screen / banner** | Exercise name (large) · "Set 3 of 5" · target "185 lb × 8" · set bars · workout elapsed (counting up, small, top right) | "REST" label · big bronze countdown `1:24` · a thin bronze bar that drains · "Next: Bench Press — 185 lb × 8" | "Workout complete" · name · "18 sets · 52:10" |
| **Island, compact** | Leading: Forge mark. Trailing: "3/5" | Leading: Forge mark. Trailing: bronze `1:24` countdown | Leading: mark. Trailing: ✓ |
| **Island, minimal** (shared with another app) | Forge mark | Countdown ring (`ProgressView(timerInterval:)`, bronze) | ✓ |
| **Island, expanded** (long-press) | Centre: exercise · Bottom: set label + target + set bars | Centre: countdown · Bottom: Next line | Centre: summary line |

- **Starts** the first time the projection leaves `idle`, which is the first strength set on screen. It does not
  start for a cardio-only session: the projection already stays `idle` for cardio, the same rule as the Watch.
- **Rest ends while the phone is locked:** the countdown stops at `0:00` by itself. `staleDate` is set to
  `restEndsAt`, so once it passes, the view shows "Rest done · Set 3 of 5 next" without the app having to wake.
- **Paused rest:** shows the frozen `restRemainingSec` as static text ("Paused · 1:05"). There is no timer while
  paused.
- **Workout finished:** one update to the Finished content, then the activity ends and is removed 5 minutes later.
- **Workout discarded:** the activity ends and is removed straight away.
- **App killed mid-workout:** iOS keeps the card. It goes stale, and iOS removes it after its 8-hour limit.
  On the next launch the module reconciles. If the session resumes, it re-adopts the running activity with
  `Activity<…>.activities` and does not start a second one. If there is no session, it calls `endAll()`.
- **Tap the card:** opens the app on the workout screen (`widgetURL` → `forgelegacy://workout`).
- **Settings:** v1 has no in-app toggle. iOS already gives a per-app Live Activities switch. If it is off,
  `areActivitiesEnabled` is false and nothing starts.

**Design:** no `.dc.html` covers this. There are no hits for live activity, Dynamic Island or lock screen in
`design-drafts/`, so **the artboards are owed**. Until they exist, the table above is the layout, in the Watch's
visual language. Ground is Forge dark `#0E0E12`. Bronze `#BA8654` is for the countdown and the "Next" line
only, because bronze is earned: no bronze borders and no card-inside-card. Text is Forge primary/secondary, and
digits are tabular. The Island is always black (the system decides that), so it uses the Forge palette whatever
the theme. The lock-screen card uses `theme` from the projection, with the same `Palette` values as
`targets/watch/Theme.swift`, so Alabaster users get a light card.

## 2 · Data model

The static data is set once at start. `ContentState` changes on every update and must stay under ActivityKit's
4 KB limit (it will be about 400 B). Every `ContentState` field is optional except `phase`, for the same reason
`WatchState.swift` gives: a build-11 phone must not break a build-10 extension. Adding a field is fine;
repurposing one is not.

```swift
struct ForgeWorkoutAttributes: ActivityAttributes {
  var workoutName: String
  var startedAt: Date                  // workout elapsed: Text(startedAt, style: .timer)
  struct ContentState: Codable, Hashable {
    var phase: String                  // "active" | "rest" | "finished"; unknown → drawn as active
    var theme: String?                 // "forge" | "paper"
    var exercise: String?; var setLabel: String?; var target: String?; var perLabel: String?
    var setsDone: Int?; var setsTotal: Int?
    var restStart: Date?; var restEnd: Date?   // running rest → Text(timerInterval: restStart...restEnd, countsDown: true)
    var restPausedSec: Int?            // paused rest → static text
    var nextExercise: String?; var nextTarget: String?
    var totalSets: Int?; var elapsedSec: Int?
  }
}
```

`restStart` is `restEnd − restTotalSec`. JS sends epoch milliseconds, the same as `WatchState`, and Swift
divides by 1000. `startedAt` comes from the session's start time. It is not in `WatchState` today, so
`live-activity.ts` passes it separately. `WatchState` is not changed, so there is no watch protocol bump.

**⚠ The struct has to exist twice.** ActivityKit matches the app's and the extension's attributes by type name
and Codable shape. The local Expo module is its own pod, so it cannot see Swift that lives in the main app
target. That means the `targets/…/_shared` folder does not solve this. Put identical copies in
`modules/live-activity/ios/` and `targets/live-activity/`. A `node --test` guard should compare the two struct
blocks as text. If they drift, the activity silently never renders, and Windows cannot catch that any other way.

## 3 · How JS drives it: a new module, `modules/live-activity/` (recommended)

Don't extend `watch-bridge`. It links WatchConnectivity, while this needs ActivityKit. They fail
independently: a paired watch with Live Activities switched off, or the other way round, is normal. Each
module's comment says it moves strings and refuses nothing, and that should stay true of both. Use the same
shape as the Watch module:

| Layer | File | Contract |
|---|---|---|
| Native | `modules/live-activity/ios/ForgeLiveActivityModule.swift` (+ podspec, `expo-module.config.json`) | `isEnabled(): Bool` · `start(attrsJson, stateJson): String?` · `update(stateJson, staleAtMs: Double?)` · `end(stateJson?, dismissAfterSec: Double)` · `endAll()` · `activeId(): String?` |
| TS, native | `src/lib/live-activity.ts` | `requireOptionalNativeModule('ForgeLiveActivity')`. Every call is a no-op when the module is null. Drops byte-identical payloads (the screen re-renders every second during rest). Every call is wrapped in try/catch, because the card is a convenience |
| TS, web | `src/lib/live-activity.web.ts` | A true no-op with the same exports |
| Domain | `src/domain/workout/live-activity-plan.ts` + `.test.mjs` | Pure: `(prevPhase, WatchState) → 'start' \| 'update' \| 'end-soon' \| 'end-now' \| 'none'`, plus the `WatchState → ContentState` mapping. No `@/` runtime imports (it runs under `node --test`) |
| Screen | `src/app/workout.tsx` | One `useEffect` next to the `pushWatchState` effect (around line 1898) that feeds the same `watchState` memo. It also needs one call in `discardSession` → `end-now` |

**Build 9 and web:** without the module, `requireOptionalNativeModule` returns null, so build 9 and the web
preview behave exactly as they do today. The TS half can ship to both before build 10, the same way Watch
Phase 2 did.

**Background:** updates come only from JS. The app is suspended while locked, except during a run with
location on. That's why everything time-based is drawn natively with `Text(timerInterval:)`,
`ProgressView(timerInterval:)` and `staleDate`. A **Set done from the Watch** wakes the phone app in the
background (WCSession `sendMessage`), so the logged set reaches the Live Activity too. Watch and lock screen stay
in agreement without extra work.

## 4 · Interaction and push: both out of v1

| Item | v1? | Why |
|---|---|---|
| **Buttons** ("Set done", "Skip rest", "+15s") via iOS 17 `LiveActivityIntent` | **No, v1.1** | The intent runs in the app process and has to get into JS. The watch command path (`handleWatchPayload` → `dispatchWatchCommand`) already does this, and every guard is tested, so it is roughly 2 days of wiring. But it needs `if #available(iOS 17)` branches, `_shared` intent files in both targets, and a second device round. Ship the read-only card first and add buttons in the next native build |
| **Push-token updates** (`pushType: .token`, APNs from an Edge Function) | **No** | All the state is on the phone. The server does not know the current set, and the only thing that changes while the phone is locked (the countdown) is drawn locally. Push would add an APNs key, a Live Activity token table, an Edge Function, the `aps-environment` entitlement on the extension and Apple's update budget, and it would buy nothing. The one real case, the Watch logging a set, already wakes the app |
| Rest-end alert (screen lights up at `0:00`) | No | It needs an update sent at the end time, which a suspended app can't do. That is a local notification, `Rest-Timer-Architecture` RT-OQ-1, a separate decision |

## 5 · Config, entitlements, fingerprint

| Item | Value |
|---|---|
| Target folder | `targets/live-activity/` · `type: 'widget'` · `name: 'ForgeLegacyLive'` · `displayName: 'Forge Legacy'` |
| Bundle id | `bundleIdentifier: '.liveactivity'` → `com.qest4.forgelegacy.liveactivity`. This is a **new App ID and provisioning profile**, and the first EAS build asks for Apple credentials, so the PO has to be at the keyboard (same as build 8's watch App ID; see `project_build9_apple_401`) |
| ⚠ `deploymentTarget` | **Set it to `'16.4'` explicitly.** The plugin defaults widgets to **18.0** (`with-widget.js`), which would quietly leave iOS 16–17 phones without the card. 16.4 is the app's own minimum (ExpoModulesCore). ActivityKit needs 16.1, and the `ActivityContent`/`staleDate` API needs 16.2 |
| Main app Info.plist | `app.json` → `ios.infoPlist.NSSupportsLiveActivities: true`. The plugin does **not** add it (checked: no occurrence in `@bacons/apple-targets/build`). Without it, `Activity.request` throws. Leave out `NSSupportsLiveActivitiesFrequentUpdates`, which is only for push |
| App Group | **None.** All data travels in `ContentState`. The plugin will print a "may require App Groups" warning; that is expected, and the warning should be noted in `expo-target.config.js`. Only add a group if v1.1 intents need shared storage |
| Entitlements | None on either side for v1. With no push, there is no `aps-environment` |
| Colours | `colors: { $accent: '#BA8654', $widgetBackground: '#0E0E12' }`. Everything else goes in a Swift `Palette` copied from the Watch's `Theme.swift` |
| Watch coexistence | The plugin excludes watchOS targets from the iOS widget extension point (`target.js` around line 723). **Do not** put anything in a root `targets/_shared/`, because that links into *every* target, including the Watch |
| Fingerprint | New module + new target + `app.json` change means the fingerprint moves, so this is **build 10 only**. Build 10 gets its own OTA branch (⛔ one OTA branch per build). Run `eas fingerprint:compare` before any publish after this lands |

**Alternative considered: `expo-widgets`** (first-party in SDK 56, JSX layouts via `@expo/ui/swift-ui`,
including `Text timerInterval`). It is viable, but it generates its **own** widget target next to
`@bacons/apple-targets`. Layouts run in an isolated runtime that can't reference module scope, so they can't
share the Watch's palette. It also pulls in `@expo/ui`. One target plugin and one Swift idiom across Watch and
Live Activity is simpler to own, so this plan recommends staying on `@bacons` (see PO decision 1).

## 6 · Risks

| Risk | Mitigation |
|---|---|
| ⛔ **No Swift compiles locally.** Windows can't prebuild, so every Swift file is first compiled by EAS, at about 20 minutes per round trip | Keep the Swift small (1 module file, 1 attributes file ×2, 1 widget file, 1 palette). Put all logic in tested TS. Run `npx expo export --platform ios` before the build. Consider the cloud-Mac rental (`Apple-Watch-Companion-Build-Plan.md` §7) |
| Duplicate attributes structs drift, so the card never appears and nothing reports an error | Text-diff guard test (§2). Also log `Activity.request` errors with `NSLog`, and send them to the in-app reporter as `live_activity_start_failed` |
| Widget deploymentTarget left at 18.0 | Set it explicitly (§5). Confirm in the IPA's extension `Info.plist` (`MinimumOSVersion`) with `zipfile`+`plistlib` |
| Missing `NSSupportsLiveActivities` | Read it from the built IPA's main `Info.plist` before submitting |
| Orphaned cards after a crash or kill | `endAll()` on boot when there's no active session, `staleDate`, and the 8-hour system cap |
| Two activities for one session (a resume, or a remount) | `activeId()` adoption, and `start` refuses when one exists |
| The PO's phone has no Dynamic Island | Lock screen is the primary surface. Test the Island on a 14 Pro or newer, or in the simulator via the cloud Mac |
| New App ID or credentials prompt blocks an unattended build | Run build 10 with the PO present, and pin eas-cli **22.3.0** |
| Sentry (also build 10) and this land in one build | That's fine, they're independent. If build 10 fails, read the log for which target failed before assuming anything |

## 7 · Device test (build 10, TestFlight)

1. Start a strength workout. The card appears on the lock screen with the right exercise, "Set 1 of N", the
   target in the athlete's units, and elapsed time counting up.
2. Log a set on the phone and lock it. The rest countdown runs and the bar drains. Wait past zero: it shows
   `0:00`, then the stale "Rest done" state, **without unlocking**.
3. Pause, +15, and Skip on the phone: each change shows within a second. A paused rest shows static text.
4. Log a set from the **Watch** while the phone is locked in a pocket. The card moves to Rest.
5. Finish the last set of an exercise. "Next" shows the next exercise.
6. Finish the workout: summary, gone about 5 minutes later. Discard a workout: gone at once.
7. Force-quit mid-rest and relaunch. There is one card, not two, and it is re-adopted or cleared.
8. Turn Live Activities off in Settings → Forge Legacy, then start a workout. No card, no error toast.
9. Switch the units to kg mid-session, and change the theme to Alabaster (then relaunch): the card follows.
10. Island: compact, minimal (start a timer in Clock at the same time), expanded (long-press), then tap the card
    and it opens the workout.
11. Web preview and a build-9 phone: nothing changes and there are no errors.

## 8 · Build order and files

| Phase | Work | Files | Est. |
|---|---|---|---|
| **0 · Design** (owed) | Artboards: lock screen × 4 states × 2 themes, Island compact, minimal and expanded | `design-drafts/ForgeLiveActivity.dc.html` | 0.5 d |
| **1 · TS** (can ship to web and build 9, inert) | Planner + mapping + tests. Bridge + web no-op. Wire into `workout.tsx` (effect + discard). Struct-drift guard (skips until the Swift exists) | `src/domain/workout/live-activity-plan.ts`, `…/live-activity-plan.test.mjs`, `src/lib/live-activity.ts`, `src/lib/live-activity.web.ts`, `src/app/workout.tsx` | 1.5 d |
| **2 · Native** | Module + attributes. Widget target: bundle, `ActivityConfiguration` (lock screen + Island regions), palette, attributes copy. `NSSupportsLiveActivities` | `modules/live-activity/{expo-module.config.json, ios/ForgeLiveActivity.podspec, ios/ForgeLiveActivityModule.swift, ios/ForgeWorkoutAttributes.swift}`, `targets/live-activity/{expo-target.config.js, index.swift, WorkoutLiveActivity.swift, ForgeWorkoutAttributes.swift, Palette.swift}`, `app.json` | 2 d |
| **3 · Build 10 + device** | PO present for the new App ID. Read the IPA. Run §7 | none | 1 d + fix rounds |
| **4 · v1.1** (next native build) | `LiveActivityIntent` buttons (Set done / Skip rest) routed through `dispatchWatchCommand` | `targets/live-activity/_shared/WorkoutIntents.swift`, module event | 2 d |

After each phase, update `Forge-Legacy-Master-Status.md` (the build-10 row) and `Docs/App-Store-Submission-Checklist.md`
if the card appears in screenshots or listing copy.

## 9 · Decisions for the PO

1. **Tooling:** `@bacons/apple-targets` widget target with SwiftUI (same as the Watch), or Expo's own
   `expo-widgets` (JSX layouts)? **Recommend `@bacons`.** It means one target plugin and one palette, and it's
   already proven on build 8/9.
2. **Buttons in v1?** "Set done" and "Skip rest" on the card are iOS 17+. **Recommend no: ship a read-only card in
   build 10 and add buttons in the next native build.** The command path already exists, so it's a small, safe
   second step, and it keeps build 10's Swift minimal.
3. **Runs too?** v1 follows the Watch projection, which shows nothing for cardio. A run card (distance, pace,
   elapsed) needs its own layout. **Recommend strength-only for v1.** Runs are a later extension that adds a
   phase value, without changing the protocol.
