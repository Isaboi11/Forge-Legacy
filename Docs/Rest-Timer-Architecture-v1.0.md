# Rest Timer Architecture v1.0

**Status:** LOCKED
**Version:** 1.0
**Last Updated:** 2026-06-30
**Amendment Log:** Initial.

**Architecture Freeze:** This document closes Freeze Row 19 (Standalone Rest Timer Architecture).

---

## Preamble

The rest period is the athlete's time, not the product's. Forge Legacy's rest timer counts up because the product does not know what the correct rest duration is — and neither does science for a given athlete on a given day. The timer records; it does not evaluate.

This architecture document governs everything beneath the rest state UX: the mechanism that drives the timer, the state machine that tracks its lifecycle, the ProgressRing component, and the platform behaviors that keep it accurate across backgrounding, recovery, and future platform surfaces. The UX shell around the timer — the rest overlay layout, dismissal, and "Ready" CTA — is governed by `Active-Workout-Flow-Spec-W9-W16.md` §7.

---

## §1 — Purpose & Scope

### §1.1 Purpose

This document prevents the failure modes that arise when timer behavior is specified only inside a workout wireframe:

- Inconsistent elapsed time across foreground, background, and cold launch
- Ambiguous ProgressRing ownership between the Component Library and workout flow
- No defined recovery behavior when the app is killed mid-rest
- No governing authority for future platform surfaces (Live Activities, Watch, widgets)

### §1.2 Scope

**In scope:**
- Timer mechanism: start trigger, count strategy, elapsed calculation, end triggers, reset
- Timer state machine (INACTIVE / RUNNING / BACKGROUNDED / RECOVERABLE)
- Single-timer concurrency rule
- ProgressRing component specification (visual contract, animation, render conditions)
- Background and foreground continuity strategy
- Notifications framework (V1: deferred; framework defined; RT-OQ-1 flagged for PO)
- Accessibility and Reduce Motion behavior for timer and ring
- Offline behavior
- Persistence and recovery (cold launch, app kill)
- Future platform integration surface declarations

**Out of scope:**
- Rest state overlay layout, dismissal behavior, "Ready" CTA — governed by `Active-Workout-Flow-Spec-W9-W16.md` §7
- ProgressRing render conditions and reference source priority — governed by `W9-Amendment-003-Optional-Rest-Progress-Ring.md` Decisions 1–3
- Timer Preferences sheet contents — governed by `W9-Amendment-003-Optional-Rest-Progress-Ring.md` Decision 3
- `restSeconds` field definition — governed by `ExercisePrescription-Amendment-001.md` §4.4
- Global push notification toggles — governed by `P-5-Notifications-Architecture.md`
- General-purpose progress components (e.g., ProgressBar CLA-C12) — governed by `Component-Library-Architecture-v1.0.md`

### §1.3 Document Relationships

| Document | Relationship |
|---|---|
| `FORGE_LEGACY_PRODUCT_DNA.md` | Parent — Accountability Without Shame principle governs all timer design |
| `Active-Workout-Flow-Spec-W9-W16.md` §7 | Peer — owns rest state UX shell; this document owns the timer mechanism inside it |
| `W9-Amendment-003-Optional-Rest-Progress-Ring.md` | Peer — owns ProgressRing render conditions and reference-source decisions; this document owns the ProgressRing component contract |
| `ExercisePrescription-Amendment-001.md` §4.4 | Peer — defines `restSeconds` as an optional reference value consumed by the ring |
| `Component-Library-Architecture-v1.0.md` | Peer — explicitly excludes ProgressRing from CLA-C01–C37; defers to this document |
| `P-5-Notifications-Architecture.md` | Peer — governs global notification permission and toggles; rest timer notification framework (RT-OQ-1) may intersect |

---

## §2 — Ownership & Authority

This document is the sole authority for:

- The timer mechanism and state machine (§3–§4)
- The single-active-timer concurrency rule (§5)
- The ProgressRing component contract (§9)
- Background/foreground continuity strategy (§7)
- Persistence and recovery behavior (§12)
- Future platform integration surface declarations (§13)

Any proposed change to timer behavior, ProgressRing rendering, or persistence strategy requires an amendment to this document.

**ProgressRing is not part of the Component Library.** Per `Component-Library-Architecture-v1.0.md` §1.2, ProgressRing is explicitly excluded from the CLA component registry. It is a rest-timer-specific component, defined here and permitted only on the rest timer surface without a formal amendment.

---

## §3 — Timer Lifecycle

### RT-D1 — Start Trigger

The timer starts when a set is logged and the rest overlay appears. The timer does not start on screen navigation, workout start, or any other event — only on set completion.

### RT-D2 — Count Mechanism

The timer is a wall-clock differential, not an interval counter. On timer start, record `restStartTimestamp` = current wall-clock time. Displayed elapsed = current wall-clock time − `restStartTimestamp`. This strategy ensures accuracy across backgrounding, device sleep, and suspension with no background process required.

### RT-D3 — End Triggers

Three events end the current rest period:

1. **Ready tap** — athlete taps the "Ready" CTA on the rest overlay; timer stops, overlay dismisses, next set begins
2. **Next-set tap** — athlete taps the next set row behind the overlay directly; same effect as Ready
3. **Workout complete** — athlete taps "Workout Complete — Save" on the last set's rest overlay; timer stops, workout flows to W-17

All three end triggers must clear the persisted `restStartTimestamp` and `workoutSessionId` from storage.

### RT-D4 — Per-Rest Reset

Each new rest period is a fresh timer. `restStartTimestamp` is overwritten on each new set log. No cumulative rest time is computed across a session.

---

## §4 — Timer States

### §4.1 State Machine

```
                         set logged
   [INACTIVE] ──────────────────────────────► [RUNNING]
       ▲                                          │ │ │
       │                                          │ │ └── end trigger ──► [INACTIVE]
       │                              app         │ │
       │                          backgrounds ────┘ │
       │                              ▼             │
       │                        [BACKGROUNDED]      │
       │                              │             │
       │                  app returns │             │
       │                  to         ▼             │
       │                foreground  [RUNNING]       │
       │                                            │
       │                              app killed ───┘
       │                              ▼
       │                        [RECOVERABLE]
       │                              │
       │          cold launch +       │
       │          open session +      │
       │          saved timestamp ────┘
       │                              ▼
       │                          [RUNNING]
       │                              │
       └──── session closed / no ─────┘
             matching timestamp
```

### §4.2 State Definitions

| State | Description |
|---|---|
| **INACTIVE** | No rest period active. No timer visible. No persisted timestamp. |
| **RUNNING** | Rest overlay visible. Elapsed incrementing every render frame from persisted timestamp. |
| **BACKGROUNDED** | App not in foreground. Timestamp persisted. No UI. Elapsed accumulates silently via wall-clock. No background process required. |
| **RECOVERABLE** | App was killed while timer was RUNNING. Persisted timestamp and session ID found on next cold launch with an open session. Transitions to RUNNING with correctly computed elapsed. |

---

## §5 — Workout Integration

### RT-D5 — Timer Is Ephemeral

Elapsed rest time is not written to the workout log, set record, or any persistent entity. The timer is informational only. Elapsed time cannot be queried from the workout history — it is not stored.

### RT-D6 — Timer Never Blocks Workout Actions

Athletes may log additional sets, navigate, or complete the workout regardless of timer state. Timer state does not gate any workout action.

### RT-D7 — Single Source of Truth

The displayed elapsed = current wall-clock time − `restStartTimestamp` at render time. No secondary counter, no stored "elapsed" field, no re-derivation. The display updates on each render frame.

### RT-D22 — Single Active Timer Per Session

Only one Rest Timer may exist in a non-INACTIVE state per workout session at any time. If a new set is logged while a previous rest period is still active (overlay not yet dismissed), the current timer is ended and a new timer begins immediately for the new rest period. The new `restStartTimestamp` overwrites the previous one. Only one `restStartTimestamp` is ever persisted at a time per session.

---

## §6 — Manual Adjustments

### RT-D8 — Reference Duration Is the Only Athlete-Adjustable Parameter

Athletes may change "My rest reference time" in Timer Preferences (defined in `W9-Amendment-003-Optional-Rest-Progress-Ring.md` Decision 3) between sets. Changes take effect on the next rest period — the current rest's ring fill target is immutable once that rest begins. No mid-rest override of count direction, timer reset, or ring fill target is permitted.

**Non-behaviors:**
- No pause or resume control; the count-up timer runs from start to end trigger
- No manual time entry to override elapsed time
- No per-exercise or per-set local override of the reference duration (account-level preference only, per W9-A3 Decision 3)

---

## §7 — Background & Foreground Behavior

### RT-D9 — Wall-Clock Strategy Requires No Background Process

Because elapsed = current wall-clock time − `restStartTimestamp` (RT-D2), the timer requires no background thread, no platform background task registration (no `BGTaskScheduler`, no `WorkManager`), and no OS wake-up call. The timestamp is persisted on timer start (RT-D19). On foreground return, elapsed is computed instantly from the persisted timestamp. Battery impact and background execution restrictions are non-issues.

### RT-D10 — Foreground Return

When the app returns to foreground during a rest period:

1. Read `restStartTimestamp` from persisted storage
2. Compute elapsed = current wall-clock time − `restStartTimestamp`
3. Render RUNNING state with computed elapsed immediately (no animation catch-up)

If the elapsed time exceeds the reference duration, the ProgressRing renders at 100% full and the timer displays the actual elapsed time. No truncation, no "expired" label, no urgency state.

---

## §8 — Notifications

### §8.1 V1 Position

**No rest-timer notifications fire in V1.** This is consistent with `W9-Amendment-003-Optional-Rest-Progress-Ring.md` §6 Non-Behaviors: "No notification behavior is added or changed. The base spec defines no rest-ended notification today (§16.8 explicitly excludes any haptic for rest timer events); this amendment does not introduce one."

The foreground experience is complete via the ProgressRing visual. The background experience is: timer continues silently; athlete returns when ready; timer shows accurate elapsed.

### §8.2 Notification Framework (For Future Amendment)

The following framework is defined here so a future amendment can add background notifications without architectural rework:

- **Trigger:** Rest-timer background notification fires when reference duration is reached and the app is backgrounded
- **Type:** Local notification only — no server, no push
- **Opt-in:** Independent toggle in Timer Preferences (a 3rd field, independent of the ring toggle) — athlete must explicitly enable
- **Copy:** Neutral framing consistent with Accountability Without Shame (e.g., "Your rest reference time has been reached")
- **Frequency:** Once per rest period; no repeat
- **Suppression:** Suppressed if app is foregrounded (ring visual suffices)
- **Permission:** Requires platform notification permission — coordinate with `P-5-Notifications-Architecture.md` to determine whether V1 permission grant covers this or requires a separate prompt (RT-OQ-1, RT-OQ-2)

### §8.3 Open Questions

See §14 (RT-OQ-1 and RT-OQ-2).

---

## §9 — ProgressRing Component

ProgressRing is owned exclusively by this document. It is not part of the Component Library (CLA-C01–C37). Per `Component-Library-Architecture-v1.0.md` §1.2, it is explicitly excluded from that registry.

### RT-D11 — Component Name

`ProgressRing` — singular, unambiguous. Not "TimerRing," "RestRing," or a CLA-prefixed identifier.

### RT-D12 — Visual Contract

This decision canonicalizes `W9-Amendment-003-Optional-Rest-Progress-Ring.md` Decision 4 into a component-layer specification:

| Property | Value |
|---|---|
| Shape | Circular arc, origin at 12 o'clock, fills clockwise |
| Stroke width | 2–3dp |
| Diameter | 72–84dp (circumscribes the existing count-up timer numerals) |
| Fill color | `accent.primary` semantic token |
| Track (unfilled) color | `surface.muted` semantic token |
| Progress value | `min(elapsed / referenceDuration, 1.0)` — capped at 1.0, never exceeds full |
| At 100% | Ring holds full; no color change, no pulse, no additional animation |
| Animation | Continuous linear interpolation; no per-second stepping; update cadence matches timer display rate |
| Text on ring | None — no numerals, percentage, or countdown text |

### RT-D13 — Render Conditions

ProgressRing renders only when both conditions are true:

1. `referenceDuration !== null` — a reference duration has resolved (via Timer Preferences personal value or program `restSeconds`, per W9-A3 Decision 2)
2. `ringEnabled === true` — the athlete has the ring toggle set to On (per W9-A3 Decision 3)

When either condition is false, the component is **unmounted** — not hidden, not rendered at zero opacity. The rest overlay reverts to the base spec layout without the ring.

### RT-D14 — Scope Restriction

ProgressRing may not be reused outside the rest timer surface. It is not a general-purpose progress arc. Any reuse outside this surface requires a formal amendment to this document. For general-purpose linear progress, use CLA-C12 (ProgressBar) from the Component Library.

---

## §10 — Accessibility & Reduce Motion

### RT-D15 — Reduce Motion

When the system Reduce Motion flag is active (`UIAccessibility.isReduceMotionEnabled` on iOS; `AccessibilityManager.isAnimationEnabled` on Android):

- ProgressRing animation is disabled
- The ring renders as a **static arc** at the current progress percentage
- The static arc updates discretely each second (same cadence as the timer text numerals)
- No interpolation between updates
- Timer text behavior is unchanged

### RT-D16 — Screen Reader Labels

| Element | Accessibility Label |
|---|---|
| Timer | "Rest timer, [M:SS] elapsed" |
| ProgressRing (when visible) | "Rest progress, [N] of [M] seconds" |
| Timer Preferences entry ("⋯ Options") | "Timer preferences" (existing label from W9-W16 §4.2; unchanged) |

Timer and ring elements do not auto-announce on tick. Labels are available on focus only.

### RT-D17 — Timer Text Is Always Primary

ProgressRing is additive. If the ring cannot render (no reference, toggle off, Reduce Motion override, or any failure condition), the timer text carries 100% of the elapsed information. No fallback text, alternative visual, or compensating element is introduced.

---

## §11 — Offline Behavior

### RT-D18 — Fully Local; No Network Dependency

The rest timer, ProgressRing, and Timer Preferences operate entirely on-device. No network call is required to start, stop, display, or persist the timer. No sync event is emitted on timer start or end. This is the architectural baseline, not a resilience feature — there is no online mode for the timer.

---

## §12 — Persistence & Recovery

### RT-D19 — Persist on Start

When a rest period begins (RT-D1), write to local persistent storage:

- `restStartTimestamp` — current wall-clock time at timer start
- `workoutSessionId` — the open session identifier

The timestamp must be durably written before the rest overlay transitions to RUNNING state. The timer is not considered active until persistence is confirmed.

### RT-D20 — Clear on End

Any of the three end triggers (RT-D3) clears both `restStartTimestamp` and `workoutSessionId` from storage before navigating away. Stale data must not survive a completed rest period.

### RT-D21 — Cold Launch Recovery

On app cold launch, evaluate persisted storage:

| Condition | Action |
|---|---|
| `restStartTimestamp` found AND `workoutSessionId` matches an open session | Transition to RUNNING with elapsed = current wall-clock time − `restStartTimestamp` |
| `restStartTimestamp` found AND no open session matches | Clear stale timestamp; enter INACTIVE |
| No `restStartTimestamp` found | Enter INACTIVE |

A stale timestamp from a prior workout must never surface a rest timer in a new session.

**RT-OQ-4 (see §14):** If recovered elapsed already exceeds the reference duration, the ProgressRing renders at 100% immediately — no catch-up animation.

---

## §13 — Future Platform Integrations

Three surface declarations. None are V1 commitments. Each requires a dedicated amendment to this document.

### §13.1 Live Activities & Dynamic Island (iOS 16.2+)

Display elapsed timer and ProgressRing percentage on the lock screen and Dynamic Island during rest periods. The wall-clock strategy (RT-D2) is already compatible with ActivityKit's `ActivityAttributes` timeline model — the persisted `restStartTimestamp` is the only data needed. No architectural change is required to support this.

Amendment needed to define: ActivityAttributes schema, lock screen and Dynamic Island layout, and update/end lifecycle.

### §13.2 Apple Watch & Wear OS Companion

Mirror RUNNING state to a wearable companion. The elapsed value is derivable on the watch from the shared `restStartTimestamp` — no separate timer process is needed on the watch. No architectural change required.

Amendment needed to define: WatchConnectivity / Wearable Data Layer protocol, watch UI layout, and session state synchronization.

### §13.3 Home Screen Widget

Display last rest duration (post-session) or current elapsed (mid-rest). Post-session duration is the more useful value for a home screen context; mid-rest real-time update has battery implications that require platform evaluation.

Amendment needed to define: WidgetKit (iOS) / Glance (Wear OS) data model, update strategy, and widget layout.

**V1 architectural note:** The wall-clock strategy (RT-D2), timestamp persistence (RT-D19), and session ID (RT-D19) are the only prerequisites for all three integrations. No other V1 change is needed to unlock them in future amendments.

---

## §14 — Open Questions & Blockers

**No blockers found.** Status: LOCK-CANDIDATE.

Four open questions for PO review — none block this lock:

| ID | Question | Recommended Default |
|---|---|---|
| RT-OQ-1 | Should V1 schedule a background local notification when the reference duration is reached? (Framework defined in §8.2; requires Timer Preferences 3rd toggle and platform permission coordination.) | Defer to post-V1 future amendment |
| RT-OQ-2 | If RT-OQ-1 is approved: does the background notification use the existing P-5 permission grant, or require a separate permission prompt? | Coordinate with P-5 Architecture; likely covered by existing grant |
| RT-OQ-3 | Maximum displayed duration: what renders if an athlete rests longer than 99:59? | Roll over to H:MM:SS format (e.g., 1:40:00); no cap; no truncation |
| RT-OQ-4 | On cold launch recovery (RT-D21): if recovered elapsed already exceeds the reference duration, does the ring animate from 0% to 100% or render immediately at 100% full? | Render at 100% immediately — no catch-up animation |

---

## §15 — Downstream Reconciliation

Four documents require pointer updates after this document is locked:

| Document | Required Change |
|---|---|
| `Component-Library-Architecture-v1.0.md` §17 Downstream Reconciliation Priority 1 | Update "ProgressRing is now owned by the forthcoming Standalone Rest Timer Architecture (Freeze Row 19)" → "ProgressRing is owned by `Rest-Timer-Architecture-v1.0.md` (Freeze Row 19, LOCKED). See §9." |
| `Active-Workout-Flow-Spec-W9-W16.md` §7.6 (Optional Rest Progress Ring) | Add footer note: "ProgressRing component contract: `Rest-Timer-Architecture-v1.0.md` §9. Timer mechanism: `Rest-Timer-Architecture-v1.0.md` §3–§5." |
| `W9-Amendment-003-Optional-Rest-Progress-Ring.md` §component-governance-note | Update "forthcoming Standalone Rest Timer Architecture (Freeze Row 19)" → "`Rest-Timer-Architecture-v1.0.md` (LOCKED)." |
| `Forge-Legacy-Master-Status.md` | Update Freeze Row 19 from 🔴 Missing → ✅ LOCKED. |

---

## §16 — Decisions Reference

| ID | Decision |
|---|---|
| RT-D1 | Timer starts on set log / rest overlay appearance |
| RT-D2 | Wall-clock differential: elapsed = current wall-clock time − restStartTimestamp |
| RT-D3 | Three end triggers: Ready tap, next-set tap, workout-complete |
| RT-D4 | Per-rest reset: fresh timestamp each rest period |
| RT-D5 | Timer is ephemeral — not written to workout log |
| RT-D6 | Timer never blocks workout actions |
| RT-D7 | Single source of truth: current wall-clock time − restStartTimestamp at render time |
| RT-D8 | Reference duration adjustable via Timer Preferences; takes effect on next rest |
| RT-D9 | Wall-clock strategy requires no background process |
| RT-D10 | Foreground return: compute elapsed from persisted timestamp; render RUNNING immediately |
| RT-D11 | ProgressRing component name |
| RT-D12 | ProgressRing visual contract (arc, accent.primary, 2–3dp stroke, 72–84dp, linear fill, cap at 1.0) |
| RT-D13 | ProgressRing render conditions: referenceDuration resolved AND ringEnabled; unmount otherwise |
| RT-D14 | ProgressRing is rest-timer-specific; no reuse without amendment |
| RT-D15 | Reduce Motion: static arc at current %, discrete per-second updates |
| RT-D16 | Screen reader labels for timer and ring elements |
| RT-D17 | Timer text is always primary; ring is additive |
| RT-D18 | Fully local — no network dependency |
| RT-D19 | Persist restStartTimestamp + workoutSessionId on timer start; durable before RUNNING |
| RT-D20 | Clear persisted timestamp on any end trigger |
| RT-D21 | Cold launch recovery: match sessionId before resuming; clear stale state otherwise |
| RT-D22 | Only one active Rest Timer per session; new set log ends current timer and starts fresh |

---

## §17 — Validation Checklist

- [ ] Timer starts on set log only (RT-D1) — not on navigation, not on workout start
- [ ] Elapsed displayed = current wall-clock time − restStartTimestamp at render time (RT-D2, RT-D7)
- [ ] All three end triggers clear persisted timestamp and workoutSessionId (RT-D3, RT-D20)
- [ ] Each new rest period overwrites restStartTimestamp (RT-D4, RT-D22)
- [ ] Timer elapsed is never written to workout log or set record (RT-D5)
- [ ] Timer never gates any workout action (RT-D6)
- [ ] Only one non-INACTIVE timer per session (RT-D22)
- [ ] Reference duration changes take effect on next rest only (RT-D8)
- [ ] No background process registered for timer continuity (RT-D9)
- [ ] Foreground return renders RUNNING with correct elapsed immediately, no catch-up animation (RT-D10)
- [ ] ProgressRing uses accent.primary fill, surface.muted track, 2–3dp stroke, 72–84dp diameter (RT-D12)
- [ ] ProgressRing progress capped at 1.0; no change at 100% (RT-D12)
- [ ] ProgressRing unmounts (not hides) when render conditions are false (RT-D13)
- [ ] ProgressRing not used outside rest timer surface (RT-D14)
- [ ] Reduce Motion: ring is static arc, discrete updates (RT-D15)
- [ ] VoiceOver labels present on timer and ring elements (RT-D16)
- [ ] Timer text renders with no ring dependency (RT-D17)
- [ ] No network call at any point in timer lifecycle (RT-D18)
- [ ] restStartTimestamp durably persisted before RUNNING state (RT-D19)
- [ ] Cold launch recovery matches workoutSessionId before resuming (RT-D21)
- [ ] Stale timestamp from prior session never surfaces a timer in a new session (RT-D21)
- [ ] V1 fires no background notifications (§8.1)
- [ ] ProgressRing does not appear in CLA component registry (§9 preamble)

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-30 | Initial. Closes Architecture Freeze Row 19. Defines 22 decisions (RT-D1–RT-D22) covering timer lifecycle, state machine, single-timer rule, ProgressRing component contract, background strategy, persistence, accessibility, offline behavior, and future platform surface declarations. |

---

*Rest Timer Architecture v1.0*
*2026-06-30*
*Authority: `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED), `Active-Workout-Flow-Spec-W9-W16.md` (LOCKED), `W9-Amendment-003-Optional-Rest-Progress-Ring.md` (LOCKED), `ExercisePrescription-Amendment-001.md` (LOCKED), `Component-Library-Architecture-v1.0.md` (LOCKED)*
*Status: LOCK-CANDIDATE*
