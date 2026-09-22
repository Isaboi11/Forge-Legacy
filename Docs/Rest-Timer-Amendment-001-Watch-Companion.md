# Rest Timer — Amendment 001: Apple Watch Companion

**Type:** Amendment
**Status:** 🔒 LOCKED (protocol v1)
**Date:** 2026-09-02
**Amends:** `Rest-Timer-Architecture-v1.0.md` §13.2 — *"Amendment needed to define: WatchConnectivity / Wearable Data Layer protocol, watch UI layout, and session state synchronization."*
**Build plan:** `Docs/Apple-Watch-Companion-Build-Plan.md`
**Artboards:** `design-drafts/ForgeWatchCompanion.dc.html`
**Decision Queue:** #29

---

## 0. What this settles

§13.2 said an amendment was needed and named three things it had to define. This is those three:
the **protocol**, the **synchronisation rules**, and the **failure semantics**. The watch UI layout it
also asked for is the `.dc` above, which governs; this document does not restate it.

§13.2's architectural claim was correct and is worth recording as confirmed: **no change to the rest
timer was required.** RT-D2's wall-clock strategy was already the whole enabling decision. `restEndsAt`
is an epoch millisecond deadline, so the watch subtracts its own clock from it and needs no timer
process, no ticking messages, and no reconciliation when it reconnects.

---

## 1. Decisions

| # | Decision | Why, and what the alternative would have cost |
|---|---|---|
| **RTW-D1** | **The phone is the source of truth. The watch never logs a set itself; it asks.** | A queued write the wrist cannot verify is worse than a tap the athlete repeats. This is the same rule that governs consent elsewhere in the app: never act on the athlete's behalf without a verified round trip. |
| **RTW-D2** | **State goes out on `updateApplicationContext`; commands come back on `sendMessage`.** | Application context is latest-wins and system-queued, so a watch that was in a locker catches up in ONE delivery instead of replaying ten. `sendMessage` fails immediately when unreachable, and that failure is the feature — it is what puts "Phone not reachable" on the button. |
| **RTW-D3** | **The rest countdown is computed on the watch from `restEndsAt` against its own clock.** | RT-D2, unchanged. It is why the ring keeps running out of Bluetooth range, which is the single behaviour that justifies wearing the thing in a gym. |
| **RTW-D4** | **`target` crosses the wire as a finished display STRING.** | Weights are canonical pounds. If the wrist received a number and a unit it would have to convert, which means a second conversion path in Swift that nobody on this project can run a test against. A units change becomes a different string on the next push. |
| **RTW-D5** | **Every guard is in TypeScript (`watch-commands.ts`), none in Swift.** | The Swift moves two strings and refuses nothing. `watch-commands.ts` refuses everything worth refusing and is unit-tested on a machine with no Xcode. A rule added on either native side is a rule this project cannot verify. |
| **RTW-D6** | **`setDone` carries `exerciseIndex` and `setIndex`, and the phone re-reads the live session before acting.** | A double tap, a redelivered message and a watch holding stale state all collapse to one log. Without the indices they could not. |
| **RTW-D7** | **The reply to a command is a TRANSPORT ACK only. Confirmation is the next state push.** | The delegate callback must reply synchronously; JavaScript has not decided anything by then. So the wrist's confirmation beat waits for a state carrying more sets done — it means the set was *written*, not that the tap was *received*. |
| **RTW-D8** | **The theme travels in every push.** | ⚠ **watchOS has no user-facing light mode.** SwiftUI's `ColorScheme` on a watch is always `.dark`, so an asset-catalogue colour set with a light appearance never resolves — the standard iOS mechanism has no effect on a wrist. Alabaster cannot be inherited there; it can only be sent. Palette lives in `targets/watch/Theme.swift`. |
| **RTW-D9** | **Set-complete and exercise-complete are BEATS, not states.** | A state is something you land on and must leave. Mid-workout that costs an interaction the athlete never agreed to. Set logged passes on its own in ~600 ms; exercise complete is the Rest screen wearing a different header. |
| **RTW-D10** | **V1 is strength-only, and says so by staying on Idle.** | A cardio-only session has no Active screen to draw. Idle is the honest answer and is not a crash. |

---

## 2. The protocol, v1

`src/domain/workout/watch-projection.ts` **is** the protocol. This section describes it; that file
defines it, and where they disagree the file wins.

### 2.1 Versioning

`WatchState.v` is the version. **A phone on build N+1 will talk to a watch on build N** for as long as
the athlete leaves either un-updated, so:

- **Add fields. Never repurpose one.** Every field but `v` and `phase` is optional on the Swift side.
- **An unknown `phase` decodes as Idle**, never a throw. A watch frozen on the last thing it drew is
  worse than one admitting it knows nothing.
- Bump `v` only for a change Swift cannot read past. No such change is anticipated in V1.

### 2.2 Phone → watch

One JSON string under `state` in the application context, plus a monotonic `seq`.

> ⚠ **`seq` is not decoration.** `updateApplicationContext` replaces what is queued and the system may
> skip delivering a dictionary equal to the one already there. The TypeScript side drops byte-identical
> payloads, so anything reaching the wire is a genuine change — but a session returning to a previous
> state (skip a rest, undo a set) produces a repeat. The counter makes every push distinct.

| Field | Phases | Notes |
|---|---|---|
| `v`, `phase`, `theme` | all | `theme` is present even on Idle — the wrist paints before a session exists |
| `workoutName` | all but bare Idle | |
| `exercise`, `setLabel`, `target`, `perLabel` | active, rest | `target` is finished text (RTW-D4) |
| `setsDone`, `setsTotal` | active, rest | the set bars |
| `exerciseIndex`, `setIndex` | active, rest | what a `setDone` answers (RTW-D6) |
| `restEndsAt` | rest | epoch **ms**; `null` while paused |
| `restRemainingSec` | rest | frozen seconds, paused only |
| `restTotalSec` | rest | the ring's denominator |
| `nextExercise`, `nextTarget` | rest | on **every** rest, not only supersets |
| `exerciseComplete`, `completedExercise` | rest | Beat B's header |
| `elapsedSec`, `totalSets` | finished | |

### 2.3 Watch → phone

One JSON string under `payload`. Four shapes, and `isWatchCommand` admits exactly these:

```
{ "type": "setDone", "exerciseIndex": <int>, "setIndex": <int> }
{ "type": "restSkip" }
{ "type": "restToggle" }
{ "type": "restAdjust", "deltaSec": <int, ±1…±300> }
```

Anything else is `malformed` and is refused before the workout screen is consulted.

---

## 3. Synchronisation rules

**Phase precedence, and the order is deliberate:**

1. No session, or no strength work in it → **Idle**.
2. Every strength set done → **Finished**, *even if a rest is running*. Completing the last set ends
   the session; a ring counting down to nothing would be the watch disagreeing with the phone.
3. A rest running or paused → **Rest**. The boundary is exclusive: `endsAt > now`.
4. Otherwise → **Active**.

**The cursor starts at `session.exerciseIndex`, not at zero.** That field is where the athlete *is* —
`live-session.ts` calls it "not necessarily the first unfinished" — and someone who skipped ahead to
finish arms should not have the wrist calling them back to a squat set they left on purpose. It walks
forward only when the exercise they are on is complete.

**Cardio blocks are stepped over, never pointed at.**

---

## 4. Failure semantics

| Situation | Behaviour | Guaranteed by |
|---|---|---|
| Phone locked in a pocket | Unchanged. WatchConnectivity needs neither the phone awake nor the app foregrounded | — |
| Out of range mid-rest | Ring keeps counting; controls read **Phone not reachable**; nothing logs; one push resyncs on return | RTW-D3, RTW-D1 |
| Phone app killed | Falls to Idle. Resuming re-pushes | latest-wins context |
| **Set done tapped twice** | Exactly one set logged | RTW-D6 — `already-done`, mutation-tested |
| Watch rebooted mid-session | Reopens to the correct set | latest-wins context |
| Units switched mid-session | Next push carries the new unit | RTW-D4 |
| Clocks disagree | Ring tolerates ±2 s. The phone's ding is authoritative for sound; the wrist haptic is independent | RTW-D3 |
| Watch on an older build | Unknown fields absent, unknown phase → Idle. No throw | §2.1 |
| Command this phone has never heard of | `malformed`, refused before the screen | `isWatchCommand` |

---

## 5. Where this lives

| Concern | File |
|---|---|
| **The protocol** | `src/domain/workout/watch-projection.ts` |
| Command surface + every guard | `src/domain/workout/watch-commands.ts` |
| Platform split | `src/lib/watch-bridge.ts` · `.web.ts` |
| Phone native | `modules/watch-bridge/ios/ForgeWatchBridgeModule.swift` |
| Watch native | `targets/watch/PhoneLink.swift` · `WatchState.swift` · `Theme.swift` |
| Watch UI | `targets/watch/RootView.swift` and the four view files |
| Screen wiring | `src/app/workout.tsx` — one ref, one registration, one push |
| Tests | `__tests__/watch-projection.test.mjs` · `watch-commands.test.mjs` (24) |

---

## 6. Open, and deliberately so

1. **Nothing here has run.** Every Swift file in §5 is unverified — this project cannot compile Swift
   (`expo prebuild` is skipped on Windows, no WSL or Docker). The first proof is an EAS build, and
   §13.2's protocol is only *proposed* until the Phase 2 gate passes on a wrist.
2. **Alabaster at arm's length is a judgement, not a token.** RTW-D8 makes it possible; whether a cream
   field on an always-on display in gym lighting is *right* is a call for the PO after wearing it. If
   it reads worse, the fallback is that the watch follows the app's theme **except** during a live
   session — a one-line change to the projection, not a redesign.
3. **`WKRunsIndependentlyOfCompanionApp = NO`** is assumed and untested against App Review.
4. Complications, HealthKit, standalone runs and Wear OS remain out of scope (build plan §9).
