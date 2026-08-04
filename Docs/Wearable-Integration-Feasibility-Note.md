# Wearable Integration — Feasibility Note

**Type:** Engineering feasibility assessment
**Status:** ⛔ NOT BUILT — decision recorded, no implementation
**Date:** 2026-08-03
**Question asked:** *"Connecting to watch? Is this achievable with just the web app? How?"*

---

## The short answer

**No. Not from the web app, and not from any amount of web code.**

Forge Legacy ships today as an Expo **web** build at `forgelegacy.expo.app`. A browser cannot reach an
Apple Watch:

- **HealthKit has no web API at all.** It is an iOS framework. Safari cannot read it, with or without
  permission, on any device.
- **iOS has no Web Bluetooth.** Safari does not implement it, and neither does Chrome on iOS (which is
  Safari underneath). So even the fallback path — reading a Bluetooth heart-rate strap directly from
  the page — is closed on the platform this app is mainly used from.
- Web Bluetooth *does* work in Chrome on Android and could reach a standard BLE Heart Rate strap
  (service `0x180D`). That is a real capability, and it does not help an iPhone.

There is no partial version of this that works in a browser. The gap is the platform, not the effort.

---

## What it would actually take

Three routes, in ascending cost. Each assumes a **native build**, which does not exist yet.

### 1. Apple Health import — a native app, and zero watch code *(the only one worth costing today)*

The Watch already writes workouts, heart rate, active energy and rings into **Health on the paired
iPhone**. An app that reads HealthKit therefore gets watch-sourced data without a single line of
watchOS code. This is by far the best value-to-cost ratio on the list.

Needs:

| | |
|---|---|
| A native iOS binary | EAS builds iOS **in the cloud — no Mac required** |
| Apple Developer Program | ~$99/yr, also required for TestFlight |
| `HealthKit` entitlement + `NSHealthShareUsageDescription` | plus a config plugin, since Expo Go cannot carry it |
| A HealthKit module | e.g. `react-native-health`, wired behind a `Platform.OS === 'ios'` guard |
| Android equivalent | **Health Connect** — same shape, different SDK |

The web build keeps working with the feature simply absent, the same way the rest-timer ding resolves
`ding.web.ts` on web and `expo-audio` on native.

**Deduplication is the real design work, not the plumbing.** An athlete who logs a lift in Forge *and*
wears a Watch will have two records of one session. `External-Activity-Import-Ownership-Deduplication-Note.md`
already works this through and should govern any implementation.

### 2. Live in-session heart rate

Same native build, plus either a HealthKit workout session or a BLE chest strap via
`react-native-ble-plx`. Adds a live number to the active workout screen. Meaningful for conditioning,
close to meaningless for a set of five.

### 3. A real watchOS app — start and log a workout from the wrist

A separate **watchOS target** in Swift, communicating over WatchConnectivity. Expo does not build
watchOS targets: this needs `expo prebuild` and, realistically, Xcode on a Mac to author the target
even if EAS compiles it. This is the one people picture when they say "connect to my watch", and it is
several orders of magnitude more work than #1.

---

## What the repo already says about this

This is a long-standing, deliberately deferred item — not a new question:

- `Forge-Legacy-Master-PRD.md` §Future Roadmap — "Wearable Integrations (Apple Watch, Garmin)"
- `External-Activity-Import-Architecture-Evaluation.md` — recommended order **Strava → Apple Health →
  Garmin**; no schemas or APIs authored
- `External-Activity-Import-Ownership-Deduplication-Note.md` — the dedup design, ready and unimplemented
- `Rest-Timer-Architecture-v1.0.md` §347–349 — the only *technical* note: rest state is derivable from
  `restStartTimestamp`, so mirroring it to a wearable needs **"no architectural change"** — but it does
  need an amendment defining the WatchConnectivity / Wearable Data Layer protocol and the watch UI
- `P-4-Settings-Root-Architecture.md` §54 — "Health integrations … are a standalone engineering effort
  … not a settings toggle screen"

Nothing in `src/` touches health, wearables or Bluetooth. `expo-location` (outdoor cardio GPS) is the
closest the app comes to a sensor.

---

## Recommendation

**Not now.** Option 1 is the only one with a sane cost, and it is gated on there being a native build at
all — which is a separate decision with its own consequences (App Store review, TestFlight distribution,
a second release channel to keep in step with the web preview).

Revisit when: (a) a native build exists for another reason, or (b) testers ask for imported runs often
enough that manual logging is the thing standing between them and using the app.

**Decision Queue entry:** *Wearable / Apple Health import — deferred pending a native build. Route 1
(HealthKit import, no watchOS code) is the recommended first step when it is picked up.*
