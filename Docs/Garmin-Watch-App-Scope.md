# Garmin Watch App — Scope

**Type:** Scoping document (options and costs, not a build plan)
**Status:** 📝 PROPOSED — awaiting PO decisions (§9)
**Date:** 2026-09-28
**Question (PO, 2026-09-28):** what would it take to have Forge Legacy *on* Garmin watches, the way the Apple Watch companion is on Apple Watches?
**Reads with:** `Apple-Watch-Companion-Build-Plan.md` · `Rest-Timer-Amendment-001-Watch-Companion.md` · `Wearable-Integration-Feasibility-Note.md` · `External-Activity-Import-Architecture-Evaluation.md` · `External-Activity-Import-Ownership-Deduplication-Note.md` · `Android-Build-Plan.md`

---

## 0. The short version

There is nothing Garmin in the repo today. There are four ways to put Forge in front of a Garmin owner, and they cost very different amounts:

- **(A) Apple Health import** (already planned for build 10): Garmin runs reach Forge after the fact, iPhone only.
- **(B) Garmin Connect API**: our server pulls finished activities straight from Garmin **and pushes Forge workouts and run plans onto the watch**, where Garmin's own workout player runs them. No watch code and no native build.
- **(C) Connect IQ widget or data field**: a small Forge glance on the watch. Cheap, but it does little.
- **(D) Full Connect IQ companion app**: the Apple Watch app again, in a second language (Monkey C), with a second native bridge. The most expensive by a wide margin.

**Recommendation: A (already happening), then B, and hold C and D.** B gets most of what a Garmin owner wants, which is "my Forge workout is on my watch and my Garmin run lands in Forge". It also works for Android and web users, needs no App Store build, and costs roughly half of D. D only makes sense once Android ships and real Garmin demand shows up.

> ⚠ **Discrepancy to note:** the brief says Apple Health import is being built for build 10. `Forge-Legacy-Master-Status.md` does not list it in the Build 10 queue, and its Mandatory Work item still reads "Apple Health import: still not built". This doc assumes A is happening. The dashboard should say so, or say it isn't.

---

## 1. What our Apple Watch companion actually is (the thing we'd be copying)

- **A remote for the phone, not a second logger** (RTW-D1). The phone owns the session; the wrist shows exercise, "Set 3 of 5", target ("185 lb × 8"), a **Set done** button, and a rest ring with ±15 s / Skip / pause, haptic at zero.
- **The protocol lives in TypeScript and is transport-neutral.** `src/domain/workout/watch-projection.ts` builds one JSON `WatchState` (v1: idle/active/rest/finished, theme, finished display strings, `restEndsAt` epoch ms). `watch-commands.ts` guards the four commands (`setDone`, `restSkip`, `restAdjust`, `restToggle`). `workout.tsx` calls `pushWatchState()` in `src/lib/watch-bridge.ts`, which hands a string to the native module `ForgeWatchBridge` (WatchConnectivity).
- **What this means for Garmin:** the projection, the command guards and the screen wiring could all be reused unchanged. A Garmin companion would need **a second transport** (the Connect IQ Mobile SDK in place of WatchConnectivity), and **a second watch app** in Monkey C in place of SwiftUI. It would not need a second protocol.
- Cost of the Apple one, for scale: planned at ~4–5 weeks with a rented Mac; Phase 1 on the wrist 2026-09-02; the bridge and views are **still unverified on device** (build 9).

---

## 2. What Apple Health import (A) does and does not give a Garmin owner

Garmin Connect on iPhone can write finished workouts into Apple Health, so A reaches Garmin users with zero Garmin work. Its limits:

| Gets through Apple Health | Does NOT get through |
|---|---|
| Finished runs/rides/walks: type, time, distance, calories, heart-rate summary | **Anything going *to* the watch.** No Forge workout or run plan appears on the Garmin |
| Other Garmin activities as generic workouts | **Strength sets.** A Garmin strength session arrives as "a workout", with no exercises, reps or weights |
| | **Android users**, who have no Apple Health at all. Forge has no Android build yet either (§6) |
| | Probably not the GPS route or per-mile splits. *Unverified*: I could not confirm what Garmin Connect writes to HealthKit today. Test it on the PO's phone before relying on it |
| | Anything live during the session |

So a Garmin watch app, or B, adds three things beyond A. The first is **workouts onto the wrist**. The second is **richer imports** (route, splits, strength sets), and for Android users any import at all. The third, which only D can do, is **live set logging and rest from the wrist**.

---

## 3. Research findings (verified vs. not)

**Verified (developer.garmin.com, Garmin's GitHub, 2026-09-28):**
- **Connect IQ** is Garmin's on-watch platform, and apps are written in **Monkey C**. App types: *device app* (full screen, what D is), *widget/glance*, *data field* (a tile inside Garmin's own activity screens), and *watch face*. You build in **VS Code with Garmin's Monkey C extension and SDK Manager**, and the **device simulator runs on Windows**. Unlike the Apple Watch, the watch half can be built and tested on this machine.
- **Fragmentation is real.** You pick the target devices up front. Screen shape (round, semi-round, rectangular), resolution, MIP or AMOLED display, memory and available APIs all vary by device. Data fields get very little memory.
- **Publishing** means uploading an `.iq` file to the Connect IQ Store, followed by a Garmin review (no stated turnaround) and a notice when it's approved. Paid apps through Garmin's store need an approved account, **$100/year, and a 15% cut**. A free companion that is unlocked by Forge Premium would not need that.
- **Connect IQ Mobile SDK for iOS is maintained**: v1.6 (Jan 2025), v1.7 (Aug 2025), **v1.8 (2026-01-15)**, shipped as an xcframework or Swift package. The Android SDK repo was last pushed 2026-04-13. The iOS SDK talks to the watch **over Bluetooth directly**. It **needs the Garmin Connect app installed** to discover devices and install the watch app: our app jumps out to Garmin Connect for the athlete to pick a watch, then comes back through a URL scheme. It needs `LSApplicationQueriesSchemes: gcm-ciq`, a custom URL scheme, a **Bluetooth usage string**, and optionally the *Uses Bluetooth LE accessories* background mode.
- **Garmin Connect Developer Program** (Health, Activity, Training, Courses, Women's Health APIs): **business use only**, **no licence fee** (some metrics may carry one), application answered **within two business days**, and integration "typically 1–4 weeks". The **Training API publishes workouts and training plans to the athlete's Garmin Connect calendar**, which syncs them to the watch, and the athlete follows the steps on the wrist. It needs the user's consent (OAuth).

**Could not verify (treat as open until checked):**
- Whether production access needs a separate Garmin review or demo after the evaluation environment. The program docs are behind the partner login.
- Exact **strength** support in the official Training API. Community write-ups show Garmin workouts support a `strength_training` sport with exercises, sets, reps and weight drawn from Garmin's own exercise catalogue (~1,500 exercises in ~47 categories), but the public docs don't list sports.
- The OAuth version Garmin currently requires. It has historically been OAuth 1.0a; check it at application time.
- Whether Garmin Connect on Android now writes to Health Connect. This decides whether Android Garmin users get anything without B.
- **Strategic risk, reported by the5krunner (March 2026):** Garmin is building its own paid strength product (Connect+ "Live Activity" for strength on the phone). Connect IQ still has **no API for a third-party app to write strength sets** into a Garmin-recorded activity. That doesn't block D as a phone remote (Forge logs the sets), but it does mean a Garmin-recorded session from our app would show in Garmin Connect *without* sets.

---

## 4. The options, cheapest to most expensive

### (A) Apple Health import only — already planned
- **Athlete gets:** finished Garmin runs appear in Forge (iPhone only, summary-level). Nothing on the watch.
- **We build:** nothing extra for Garmin.
- **Native build:** yes, but it is build 10's own HealthKit work, already queued.
- **Garmin approvals:** none. **Effort:** 0 extra days. **Maintenance:** none extra.
- **Risks:** fidelity depends on what Garmin Connect chooses to write into HealthKit. None of it reaches Android users.

### (B) Garmin Connect API — pull activities + push workouts to the watch
- **Athlete gets:** a "Connect Garmin" row (the reserved **P-7 Connected Apps** slot). After that, every Garmin activity lands in Forge automatically with route, splits, HR and Garmin-recorded strength sets. They can also **send today's Forge run or strength workout to their watch**, and Garmin's own workout player runs it: step-by-step, pace/HR targets, rep and weight prompts, rest timers, vibration. On iPhone, Android and web alike.
- **We build (all server + JS, which this machine can test):**
  1. OAuth connect/disconnect via `expo-web-browser` (already a dependency), with tokens held server-side.
  2. Edge Functions for the OAuth callback, Garmin's activity webhook, and user deregistration. ⚠ Each needs the CORS block.
  3. A mapper from Garmin activities to Forge activities, with **de-duplication against Apple Health import** (the same run will arrive both ways). `External-Activity-Import-Ownership-Deduplication-Note.md` exists for exactly this.
  4. Training API push: Forge run plans become Garmin workout steps (easy). Forge strength days become Garmin strength steps, which needs a **Forge-catalogue → Garmin-exercise map**. That map is the long pole, because the visible catalogue is 721 exercises. Anything unmapped goes as a named custom step.
- **Native build:** **none.** It ships by OTA and web deploy.
- **Garmin approvals:** apply to the Connect Developer Program as **Forge Legacy LLC** (business only). ~2 business days to hear back, plus an unverified production sign-off.
- **Effort:** import ~1.5–2 weeks, run push ~1 week, strength push ~1.5–2 weeks. **About 4–5 weeks total**, and it can ship in slices (import first).
- **Risks:** Garmin can change terms (they gate data as a partner program). Dedup errors would inflate Progress, Rank and Goals. Garmin's paid strength product may make them less friendly to strength partners over time.
- **Ongoing:** webhook monitoring, token refresh, the exercise map growing with the catalogue, and API deprecations. Low to moderate.

### (C) Connect IQ widget / glance or data field
- **Athlete gets:** a small Forge glance on the watch ("Today: Push Day · 5 exercises", streak, next run), or a data field inside Garmin's run screen. It **cannot log sets or drive a Forge session**.
- **We build:** one small Monkey C app. It fetches from our API through the phone's Garmin Connect app (web requests proxy via the phone) and needs a pairing code to link to the Forge account. Round and rectangular layouts.
- **Native build:** none in our iOS app.
- **Garmin approvals:** Connect IQ developer account plus store review.
- **Effort:** ~1.5–2 weeks, plus a physical Garmin for testing.
- **Risks:** low value for the cost. It mostly duplicates what B already puts on the watch natively. Data fields are memory-starved.
- **Ongoing:** re-test on every new Garmin device family (several a year), and a second store listing.

### (D) Full Connect IQ companion app — mirror of the Apple Watch app
- **Athlete gets:** the Apple Watch experience on a Garmin: current set and target, **Set done** logs into Forge, a rest countdown with vibration at zero, ±15 s / Skip, and Forge themes. Optionally Garmin HR recording, but the recorded Garmin activity would lack sets (§3).
- **We build:**
  1. A Monkey C device app with 4 screens (idle/active/rest/finished) reading the same `WatchState` JSON and counting rest from `restEndsAt` against its own clock, laid out for round and rectangular screens and MIP and AMOLED displays, across ~6–10 device families at launch.
  2. A **new native module** (`modules/garmin-bridge/`) wrapping the Connect IQ iOS SDK, plus the "choose your Garmin" hand-off through Garmin Connect, plus `pushWatchState` fanning out to both bridges. WatchConnectivity's latest-wins context has to be emulated with plain messages.
  3. Info.plist changes: URL scheme, `gcm-ciq`, and the Bluetooth permission prompt (a new App Review surface).
- **Native build:** **yes.** Build 10 is full, so **build 11 at the earliest**. And like the Apple bridge, the Swift **cannot be compiled on Windows**, so each fix is a ~20-minute cloud build.
- **Garmin approvals:** Connect IQ Store review, plus App Store review of the Bluetooth usage.
- **Effort:** watch app ~2.5–3 weeks, iOS bridge ~1.5–2 weeks, device testing ~1 week, stores ~0.5 week. **About 6–8 weeks**, plus buying 1–2 Garmin test watches (~$250–450 each). **Android doubles the bridge** (the Android SDK, and a whole Android app that doesn't exist yet).
- **Risks:** the least-proven path on this project (a second uncompiled native bridge on top of the first). Fragmentation. Garmin's own Connect+ strength features competing with it. And it helps only iPhone-plus-Garmin owners until Android ships.
- **Ongoing:** highest. New devices every year, two watch codebases to keep in step with `WatchState`, and two stores.

### Summary table

| | Athlete gets | Native iOS build? | Garmin approval | Rough effort | Upkeep |
|---|---|---|---|---|---|
| **A** Apple Health | Finished runs in Forge (iPhone) | Build 10 (already planned) | None | 0 extra | None |
| **B** Connect API | Auto-import + **Forge workouts on the watch** (all platforms) | **No** | Developer Program (business, free) | ~4–5 wks | Low–med |
| **C** Widget/field | A glance; no logging | No | CIQ Store review | ~1.5–2 wks | Medium |
| **D** Full companion | Live Set done + rest on wrist | **Yes (build 11+)** | CIQ Store + App Review | ~6–8 wks (+Android) | High |

---

## 5. Is Windows OK?
For **B and C, entirely**: B is server and TypeScript work, and C's SDK, VS Code extension and simulator all run on Windows. For **D, only half**. The Monkey C side is fine here. The iOS bridge has the same no-Swift-compiler-on-Windows problem as the Apple Watch bridge.

## 6. The Android dependency
Garmin owners skew toward Android. Forge has **no Android binary**: `Android-Build-Plan.md` is PROPOSED, about 2 engineering weeks plus account lead time, and it puts Wear OS and Health Connect out of scope. Consequences:
- **A** reaches no Android user.
- **B** is the **only option that serves an Android Garmin owner today** (through the web app, and later the Android app), because it runs server-side.
- **C and D** need the Android app first to serve that half of the audience. D also needs an Android bridge module.

## 7. Privacy and policy impact
- **B:** Garmin becomes a named data source. That means updates to `site/privacy.html` / `Docs/Legal/Privacy-Policy.md` (what we pull, how to disconnect, deletion on deregistration) and a check of the App Store privacy labels. Washington My Health My Data consent covers it as health data (see the checklist). Garmin OAuth tokens are secrets, so they belong server-side only and must be wiped on account deletion.
- **C/D:** data moves over Bluetooth or through the Garmin Connect app, with no new server party. D adds an iOS Bluetooth permission prompt, and its wording goes through App Review. The Connect IQ Store needs its own privacy text for the listing.
- **All:** follow Garmin brand/attribution rules for "Garmin" on screens (not yet read; check at application).

## 8. Recommendation and sequence
1. **Now:** finish **A** in build 10 (and correct the dashboard). Test on the PO's phone what Garmin actually writes to Apple Health (route? splits?), since that sets how big the gap is.
2. **After App Store submission:** **apply to the Garmin Connect Developer Program** as Forge Legacy LLC. It's free, it takes days, and the calendar lead time is the only reason to do it early.
3. **Post-launch: build B in slices.** Import (with Apple Health dedup) comes first, then run-plan push, then strength push. This delivers "Forge on my Garmin" through Garmin's own workout player with no watch code and no native build.
4. **Skip C.** B covers its value.
5. **Hold D** until Android has shipped, the Apple Watch companion has proven itself on device, and Garmin users are actually asking for live logging on the wrist. Then re-cost it. Most of the TypeScript is already reusable.

---

## 9. Decisions for the PO

1. **Apply to the Garmin Connect Developer Program (free, business-only, as Forge Legacy LLC)?**
   *Recommendation:* yes, right after App Store submission. Nothing gets built until Decision 2.
2. **Which path first: B (Garmin Connect API: import + workouts pushed to the watch, no native build, ~4–5 wks) or D (full watch app like the Apple Watch one, build 11+, ~6–8 wks, iPhone-only until Android)?**
   *Recommendation:* **B**, with D held until Android ships and demand is real.
3. **First slice of B: import only, or import plus pushing run plans to the watch?**
   *Recommendation:* import plus **run-plan push** in slice 1 (runs map cleanly onto Garmin's workout steps). Strength push comes in slice 2, once the Forge-to-Garmin exercise map is built. Pricing follows the existing evaluation's rule: history is free, ongoing sync is Premium.
