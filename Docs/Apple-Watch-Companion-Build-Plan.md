# Apple Watch Companion — Build Plan

**Type:** Build plan (start → vet → ship)
**Status:** 📝 PROPOSED — awaiting PO scope sign-off (Decision Queue #29)
**Date:** 2026-08-27
**Supersedes the "not now" in:** `Wearable-Integration-Feasibility-Note.md` (2026-08-03) — its gate was "no native build exists". Build 7 is on TestFlight, so the gate is open.
**Governing clause:** `Rest-Timer-Architecture-v1.0.md` §13.2 — *"Mirror RUNNING state to a wearable companion … Amendment needed to define: WatchConnectivity protocol, watch UI layout, and session state synchronization."* This plan produces that amendment in Phase 2.

---

## 0. The one-paragraph version

The watch app is a **remote for the phone**, not a second logger. The phone stays the source of truth for the whole session (it already is — `forge.activeWorkout.v1` in AsyncStorage). The watch shows *what set you are on and what the target is*, has one big button — **Set done** — and runs the rest countdown on the wrist with a haptic at zero. It is written in **SwiftUI** (React Native does not run on watchOS), talks to the phone over **WatchConnectivity**, and ships **inside the existing iOS binary** under the same App Store listing and the same Apple Developer account. No new account, no new listing. It needs a **new native build** (no OTA can carry it) and it cannot exist on the web preview at all.

## 1. V1 scope — what the wrist does and does not do

| On the wrist in V1 | Deliberately NOT in V1 |
|---|---|
| Current exercise name, **set N of M**, target weight × reps (in the athlete's units) | Starting a workout from the watch alone (needs the whole session builder) |
| **Set done** → phone logs the set with the planned weight/reps and starts rest | Editing weight/reps on the wrist (crown-scrolling numbers is V2 — the phone is a foot away) |
| Rest countdown (ring + seconds), haptic at 0, **±15 s**, **Skip** | Heart rate / HealthKit workout session (a separate route — see Feasibility Note §1) |
| Superset awareness: "next: Row" during rest when the block is a superset | Running / GPS from the watch (the phone's `expo-location` session stays the runner) |
| Idle screen: "Start a workout on your phone" | A watch-face **complication** (`watch-widget` target — cheap to add in V2 once the app exists) |
| Finished screen: duration + sets, "Finish on your phone" | Android / Wear OS |

Why this line: every item on the left is a *projection* of state the phone already holds plus three commands the phone already handles. Everything on the right requires new domain logic on a device we cannot compile locally.

## 2. What already exists that this leans on

- **The session is already a serialisable object.** `ActiveSession` (`src/domain/workout/types.ts`) — `workoutName`, `startedAt`, `exercises[].sets[]` with `done`, `weight`, `reps`, `section` — is persisted to AsyncStorage on every set change (`src/domain/workout/autosave.ts`). The watch payload is a *slimmed* copy of exactly this.
- **Rest is wall-clock already.** `restEndsAt` (epoch ms), `restPaused`, `pausedRemaining`, `restTotal` in `src/app/workout.tsx:488-513`. The watch computes remaining time from `restEndsAt` and its own clock — the RT-D2 strategy §13.2 says makes this a no-architecture-change feature.
- **Units** — `displayWeight`/`unitLabel` in `src/domain/settings/units.ts`; the projection sends the *display* string so the watch never converts.
- **Platform-split file pattern** — `ding.ts` / `ding.web.ts`. The watch bridge follows it: `watch-bridge.ts` (native) / `watch-bridge.web.ts` (no-op). The web preview is untouched.
- **EAS + TestFlight lane** — `eas.json` production profile, `ascAppId 6798436104`, team `G722GV8H8C`. A watch app embedded in the iOS build rides to TestFlight automatically.

## 3. The one real engineering problem

**All active-workout state lives inside one 5,364-line screen component** (`src/app/workout.tsx`) as `useState`. Nothing outside that component can say "the current set is done" or "start rest". Before a watch can drive it, the screen has to expose a small **command surface** — `setDone()`, `restSkip()`, `restAdjust(±15)`, `restToggle()` — and a **projection** the bridge can read. This is a *registration* pattern (the screen registers its handlers with a tiny module while mounted; the bridge calls them), **not** a state-management rewrite. It is also the only piece of this plan that touches the strength logger, and it is test-covered in isolation. Estimate: 2 days, and it is worth doing even if the watch never ships — Live Activities (§13.1) needs the same surface.

## 4. Technical decisions (proposed, to be confirmed in the Phase 1 spike)

| Decision | Choice | Why / fallback |
|---|---|---|
| How the watch target gets into the Xcode project | **`@bacons/apple-targets`**, target type `watch` ("Watch App with companion iOS App"); Swift lives in `targets/watch/` | Keeps Continuous Native Generation — no committed `ios/`. Requires Expo SDK 53+, Xcode 16 (EAS cloud has it). ⚠ `watch` is the **least-documented** target type in the plugin; the spike exists to prove it. **Fallback:** a custom config plugin using `withXcodeProject` to add the target by hand — heavier but fully in our control. |
| Phone ↔ watch bridge | **Own local Expo Module** (`modules/watch-bridge/`, ~150 lines Swift wrapping `WCSession`) | Zero third-party new-arch risk on RN 0.85. `react-native-watch-connectivity` is the alternative; its new-architecture support must be checked before trusting it. |
| Transport semantics | State → `updateApplicationContext` (latest-wins, survives unreachability). Commands ← `sendMessage` with reply, falling back to `transferUserInfo` when unreachable | Application context is the correct primitive for "current state"; message for "the athlete tapped a button". |
| Source of truth | **Phone.** The watch never logs a set itself; it asks the phone to. If the phone is unreachable the button shows "Phone not reachable" — it does **not** queue a log it cannot verify | A queued set that lands twice is worse than a missed tap. Same rule as the consent defect: never act on the athlete's behalf without a verified round trip. |
| Bundle ids | `com.qest4.forgelegacy.watchkitapp` (+ extension id if the template needs one) | EAS "theoretically" signs multi-target apps; the spike proves it. Two new App IDs on the developer portal — EAS creates them or we do. |
| Minimum watchOS | **watchOS 10** | SwiftUI-only app lifecycle, `TimelineView` for the ring, no WatchKit storyboards. Anything older is a support burden with no testers. |
| Standalone flag | `WKRunsIndependentlyOfCompanionApp = NO` | It is a companion by design; App Review accepts dependent watch apps. |
| Design | Forge dark only on the wrist (the watch is always OLED-black; Alabaster does not apply) | Tokens ported by hand from `tokens.ts`: bronze accent, Playfair for the exercise name if it renders legibly at 45 mm, else system serif. |

## 5. Phases, gates, and what "done" means for each

### Phase 0 — Scope + assets *(PO, 1 day)*
- [ ] Sign off §1 (or redraw the line).
- [ ] Watch app icon: 1024×1024 PNG, **no transparency, square** — the system applies the circular mask. Can be derived from `assets/images/icon.png`; needs a check that the pillars survive the crop.
- [ ] Which Apple Watch + watchOS version is on the PO's wrist (sets the test device).
- [ ] Mac decision (§7).

**Gate:** scope written into this doc as LOCKED.

### Phase 1 — Spike: an empty watch app reaches the wrist *(2–3 days)* — STARTED 2026-08-27
- [x] Add `@bacons/apple-targets`, `targets/watch/expo-target.config.js`, a one-screen SwiftUI "Forge Legacy" app. **Done 2026-08-27:** `@bacons/apple-targets@5.0.0` pinned exact; `targets/watch/` = `expo-target.config.js` (type `watch`, product `ForgeLegacyWatch`, display "Forge Legacy", bundle `.watchkitapp`, watchOS 10.0, icon from `icon.png`, bronze `$accent` + `ForgeGround` colour sets) + `index.swift` (`@main`) + `IdleView.swift`. `app.json`: plugin registered, `ios.appleTeamId = G722GV8H8C`. `expo config` resolves; `tsc` and `eslint` green. The icon was scanned pixel-by-pixel: **0 transparent pixels**, so the plugin's flatten-to-white step never fires.
- [x] `expo prebuild` succeeds; the generated project contains the target. **PROVEN ON EAS 2026-08-28** (build `121b116d`): the worker compiled `IdleView.swift` + `index.swift` for `arm64` and `arm64_32` in target `ForgeLegacyWatch`, produced `ForgeLegacyWatch.app` with its own `embedded.mobileprovision`, Info.plist and asset catalog, and linked it into the phone app. Zero watch-related errors. (It cannot be run on this Windows machine — Expo skips iOS generation here and there is no WSL/Docker — so EAS was the first look, and it was clean.)
- [~] `eas build -p ios --profile production` signs **both** targets. **Credentials done 2026-08-28** with the PO present: both bundle ids registered, the existing distribution certificate reused, a new provisioning profile generated for `com.qest4.forgelegacy.watchkitapp`. **Two failed attempts, neither the watch's fault:** (1) `638ca282` died in `npm ci` — `@bacons/apple-targets` nests an `@expo/require-utils` whose optional `typescript ^5` peer makes EAS's npm 10.9.4 demand a lock entry our npm 11 never wrote; the lock was regenerated with npm 10 and now passes `npm ci --dry-run` under both. (2) `121b116d` died in `hermesc` on the JS bundle — `pdfjs-dist` (the PDF program import from the other pass) has `await import(this.workerSrc)`, a dynamic import with a variable specifier that Metro passes through and Hermes cannot parse; the existing `babel.config.js` plugin now also rewrites non-literal `import()` to a rejected promise (the branch is never reached — the worker is evaluated on the main thread first). **⚠ THE PRECHECK, from now on, before any native build: `npx expo export --platform ios --output-dir <scratch>` must exit 0.** It runs the same `hermesc` the EAS worker does; the web export never does, which is why both failures shipped green on the web preview. Third attempt pending.
- [ ] TestFlight install → the watch app appears in the Watch app on the phone → opens on the wrist.
- [x] Web export still builds; the web bundle contains nothing watch-related. **Verified 2026-08-27:** `expo export --platform web` to a scratch dir, exit 0, zero references to the plugin or target in `_expo/`. Not deployed — nothing user-facing changed.

**Gate: GO / NO-GO.** If the plugin cannot produce a signed, installable watch target in three days, switch to the `withXcodeProject` fallback and re-estimate before writing any UI. No UI work starts before this gate.

### Phase 2 — The bridge *(3–4 days)*
- [ ] `modules/watch-bridge/` local Expo Module: `pushState(json)`, `onCommand(cb)`, `isReachable()`; `.web.ts` no-op.
- [ ] `src/domain/workout/watch-projection.ts` — pure function `ActiveSession + rest state → WatchState`; **unit-tested** (`node --test`, relative imports only — see the `@/` rule).
- [ ] Command surface extracted from `workout.tsx` (§3); the screen registers on mount, unregisters on unmount.
- [ ] Write **`Rest-Timer-Amendment-001-Watch-Companion.md`** — the protocol (message shapes, versions), sync rules, failure semantics. §13.2 requires it; this is where it gets written, not after.

**Gate:** projection tests green; a debug log on the watch shows live state changing as sets are logged on the phone.

### Phase 3 — Watch UI *(4–6 days, SwiftUI)*
Four screens, one `WatchState` enum driving them: **Idle · Active · Rest · Finished** (§1). Haptic on rest-zero (`WKInterfaceDevice.play(.notification)`), Reduce-Motion static arc (the RT accessibility rule carries over), Digital Crown adjusts rest ±15 s. Design artboards first (§6), then code.

**Gate:** every §1 left-column row demonstrated on the PO's watch during a real session.

### Phase 4 — Vetting *(1 week of real training)*
The PO trains with it. The checklist is failure modes, not features:
- [ ] Phone locked in a pocket for a whole set → tap on wrist still logs.
- [ ] Walk out of Bluetooth range mid-rest → ring keeps counting (wall-clock), command shows "not reachable", nothing is logged twice on return.
- [ ] Phone app killed mid-rest → watch falls to Idle within seconds; resume on the phone re-syncs.
- [ ] Double-tap Set done → exactly one set logged (the phone's command handler is idempotent on `setIndex`).
- [ ] Watch rebooted mid-session → re-opens to the correct set.
- [ ] Superset round → "next" label is right at every step of the round.
- [ ] Units switched to kg mid-session → the wrist shows kg on the next state push.
- [ ] A cardio-only session → Idle (strength-only V1 is honest about it) — not a crash.

**Gate:** all rows ticked by the PO on device, with the build number recorded. *"It worked on my phone" is not a pass — date the binary.*

### Phase 5 — Store readiness *(2 days)*
- [ ] watchOS screenshots for App Store Connect (required once a watch app is embedded — 410×502 for 45 mm, plus the Ultra size).
- [ ] `App-Store-Listing-Copy.md` gains a "Works with Apple Watch" line; `App-Store-Reviewer-Notes.md` gains a paragraph on what the watch app does and that it needs an active phone session (reviewers test without one and will otherwise see only Idle).
- [ ] `buildNumber` bump, `fingerprint:compare`, `eas build` + `eas submit`; the Master Status Recently-Completed entry records the build number.

**Gate:** App Review approval.

**Calendar total: ~4–5 weeks with a rented Mac.** Without any Mac, Phase 3 roughly doubles — every Swift compile is a ~20-minute cloud build.

## 6. What the PO provides

1. **Scope sign-off** on §1 — the single most important input; everything else follows from it.
2. **Watch icon** — or approval to derive it from the existing icon (a crop will be proposed).
3. **Design review** of four watch artboards (Idle / Active / Rest / Finished) at 45 mm. They are drafted from the Forge tokens in the design canvas; the PO edits/approves. There is no `.dc` for a watch surface today, so this becomes the first one and the design-gate runs against it.
4. **The Mac decision** (§7).
5. **A week on the wrist** for Phase 4 — real sessions, not a demo.
6. *(Not needed)* a new Apple account, a new App Store listing, a watch developer certificate — the existing Individual membership and `G722GV8H8C` cover all of it.

## 7. The Mac question, answered

- **Compiling:** not needed — EAS builds iOS + watchOS in the cloud on Xcode 16 workers.
- **Authoring Swift:** not needed — it is text; VS Code on Windows is fine.
- **Iterating:** needed. Without Xcode there is no watch simulator and no compiler feedback short of a cloud build. For an app written from scratch in a language nobody here can compile locally, that loop is the difference between a 5-day Phase 3 and a 2-week one.
- **Recommendation:** rent a cloud Mac for Phases 1 and 3 only — MacinCloud / MacStadium / an AWS `mac2` instance, roughly $1–2 per hour or $30–60 per month. Keep EAS for every build that goes to a device. Total added cost for the whole plan is well under $100.

## 8. Risks, named

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@bacons/apple-targets` `watch` type does not produce a signable target on EAS | Medium — least-trodden path in the plugin | Phase 1 is a hard gate before any UI; `withXcodeProject` fallback costed at +3 days |
| EAS multi-target credential generation fails | Low–medium ("theoretically handled") | Manual App IDs + profiles on the developer portal, fed via `credentials.json` |
| `workout.tsx` command extraction regresses the logger | Low if done as registration, not refactor | Projection + commands unit-tested; the existing Finish flow untouched; web preview deployed and PO-tested before the native build |
| Set logged twice via wrist + phone race | Medium in real use | Command carries `exerciseIndex/setIndex`; the phone ignores a `setDone` for a set already `done` and replies with the resulting state |
| Watch and phone clocks disagree on `restEndsAt` | Low (both NTP-synced) | Ring tolerates ±2 s; the phone's ding is authoritative for the sound, the watch's haptic is independent |
| App Review rejects a companion that shows only Idle | Low | Reviewer notes explain the dependency and give a demo account with a program; Phase 5 |
| A native change ships as an OTA by mistake | Known trap | `fingerprint:compare` before every publish — the existing rule |

## 9. Out of scope, so nobody expects it

HealthKit / heart rate, Wear OS, complications, standalone runs from the wrist, editing numbers on the wrist. Each is a follow-up with its own note. The HealthKit *import* route from the Feasibility Note is independent of this plan and can proceed in parallel or after.
