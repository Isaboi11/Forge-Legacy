# Competitive Gap-Close — Build Plan v1.0

**Date:** 2026-09-04
**Source analysis:** `Competitive-Analysis-Hevy-Strava-v1.0.md`
**Scope:** the six items identified as buildable without a new binary. Two were re-scoped by PO decision
on 2026-09-04; one was re-classified as needing a migration; one is technically impossible as chosen.

> **Why this document exists.** The six items were originally classified on *technical* feasibility.
> A spec pass before writing code found that three of them collide with locked documents. That is the
> whole value of this plan: the collisions were found before the code, not after.

---

## Section 0 — Status board

| # | Item | Governance | Ships how | Status |
|---|---|---|---|---|
| **3** | Offline save queue | **W-9 §13.4 specs it** | OTA | ✔ **BUILT 2026-09-04** — see §3.1 |
| **2** | Auto-pause on runs | None. Greenfield | OTA | ✔ **BUILT 2026-09-04** — see §2.1 |
| **6** | Data export | **P-9 §2 + §4 spec it** (found late) | OTA + amendment | ✔ **BUILT 2026-09-04** |
| **1** | Per-set `Prev` | W9-A5 §A5 declined it — **PO overrode 2026-09-04** | OTA + amendment | ✔ **BUILT 2026-09-04** — `W9-Amendment-007` |
| **5** | Hevy/Strong CSV import | Ownership & De-Dup Note binds it | — | ⛔ **SKIPPED — PO, 2026-09-04** |
| **4** | Rest alert when locked | Rest-Timer-Arch §8.1 bans it in V1 | — | ⛔ BLOCKED — see §4 |

---

## Section 1 — Per-set `Prev` (PO override, re-scoped)

### What the PO decided

> *"We want to add it… without making it look too crowded or busy. Scope it out and figure out what's
> going to look and flow the best. We do not want to have to tap to see it. Should be there always."*

This overrides `W9-Amendment-005` §A5, which declined a per-set `Prev` on phone-width grounds and
deferred to the `.dc` under **PD-7**. An amendment recording the override is owed before this ships.

### The arithmetic that made A5 right

The set row is `flexDirection: 'row'`, `gap: 6`, `paddingHorizontal: 8`:

| Cell | Width |
|---|---|
| `cSet` | **56pt fixed** |
| `cTarget` | `flex: 1` |
| `cWeight` | `flex: 1` |
| `cActual` | `flex: 1.05` |

At iPhone width the row is ≈330pt. Minus 56, minus three 6pt gaps → ≈256pt across three flex columns,
≈83pt each. **A fifth column cuts every cell to ≈62pt.** A5 was not being conservative; it was right.

### The chosen design — a subline, not a column

`cTarget` **already stacks sublines** under its primary value: `targetPer` ("per side", 10px) and
`targetLoad` (target weight, 11px bronze). The pattern exists in this exact table and reads cleanly.

**Decision: `Prev` renders as a muted subline under the `cWeight` cell, formatted `185 × 10`.**

Why this and not the alternatives:

- **No new column** — the width constraint A5 was protecting is honored, so the override is narrow.
- **Always visible, no tap** — exactly what the PO asked for.
- **It sits under Weight, which is the number it informs.** Last session's load belongs against the
  load you are about to enter.
- **Pending sets only.** Once a set is done, the athlete's own actual is in the row and last week's is
  noise. The table gets *quieter* as the session progresses rather than busier — which is the direct
  answer to "crowded or busy."

**Colour:** `gray600` — a tertiary-text role that exists in **both** `foundation.forge.ts` and
`foundation.paper.ts`. Not bronze: bronze is the prescription/target role in this table and `Prev` is
history, not a prescription. ⚠ This is a **layout** change, so it lands in both themes and must be
checked in both (Forge and Alabaster).

**Collision to watch:** on a percentage-based program `targetLoad` renders a bronze subline in the
adjacent column. Two sublines side by side is the one busy case; `targetWeight` is null for the large
majority of sessions, and the two are visually distinct (bronze vs grey). Accepted, and re-checked on
device.

**Owed docs:** ✔ written — `W9-Amendment-007-Per-Set-Prev.md` records the PO override of A5, the
placement, and the `.dc` divergence. The `.dc` is not edited here — PD-7 makes it the design authority, and an
amendment recording an override is the established way this project overrules it.

---

## Section 2 — Auto-pause on runs

No governing spec. `useRunTracker` already carries the mechanism this needs:

```
/** Set on resume. The first fix after a pause re-anchors the position WITHOUT crediting distance —
  * otherwise walking to the water fountain and back while "paused" is silently added to the run. */
const reanchor = useRef(false);
```

Auto-pause plugs into the existing manual pause path and reuses `reanchor` verbatim. The logic belongs
in `run-core.ts` (pure, `node --test`-able), not in the hook.

⚠ **The failure mode to design against is a false pause, not a missed one.** A runner stopped at a
light and un-paused late loses seconds; a runner auto-paused mid-stride loses the run's integrity. The
threshold must be conservative and hysteretic — the same shape as the existing `sustainedCue`.

### 2.1 As built — 2026-09-04

| File | What it is |
|---|---|
| `src/domain/run/auto-pause.ts` | **new** — pure: `windowSpeedMph`, `shouldAutoPause`, `autoResumeStep` |
| `src/domain/run/__tests__/auto-pause.test.mjs` | **new** — 17 tests |
| `src/hooks/useRunTracker.ts` | the decision on the tick, resume on the raw fix stream, `autoPaused` exposed |
| `src/domain/run/run-core.ts` | `signalNote` takes `boolean \| 'auto'` — non-breaking, every old caller still means what it meant |
| `src/components/workout/CardioBlockCard.tsx` | reads "Auto-paused · it starts again when you do" |

**Thresholds.** Pause below **0.8 mph** over a trailing **10 s** window, after a **25 s** grace and once
the bout has covered **0.01 mi**. Resume on **2 consecutive fixes ≥ 15 m** from where it paused, ignoring
any fix sloppier than **30 m**. The asymmetry is the design: a sustained near-stop to pause, unambiguous
movement to resume — so a false pause self-corrects in about four seconds of running.

**⚠ Measured against the wall clock, not the last fix.** When an athlete stops, `acceptFix` rejects their
jitter as drift and the track stops growing. A speed derived from `last.at` divides a tiny distance by a
tiny elapsed and can report anything; dividing by the window makes a stale track read as the zero it is.
This is also why `currentPaceSec` could not be reused — it returns `null` for both "standing still" and
"not enough data yet", the two states this has to tell apart.

**Three holes found while reviewing the wiring, all fixed:**

1. **Silence is not stillness.** A frozen track means a stop *only while the device is still delivering
   fixes*. In a tunnel it means the opposite. `shouldAutoPause` takes `receivingFixes` and refuses to
   guess; `onFix` records every delivery whether or not the fix is used.
2. **⚠ Auto-pause is now FOREGROUND-ONLY, and it had to become so.** Auto-resume reads the raw fix stream
   in `onFix`, which does not run while the app is suspended — that is the entire reason
   `background-task.ts` exists. A run auto-paused with the phone in a pocket would have had **no mechanism
   able to restart it** and would have sat paused for the rest of the session. Leaving the foreground
   while auto-paused now resumes the run, erring toward the clock running.
3. **The background buffer kept filling through a pause** — and the drain folds its batch straight through
   `acceptFix`, which knows nothing about `reanchor`. So the walk to the water fountain arrived on the
   next foreground and was credited. **This is a pre-existing defect of manual pause**; auto-pause would
   have fired it many times a session. All three resume paths now clear the buffer.

**A manual pause never auto-resumes.** Pressing Pause is a statement; `autoProbe` is null after it and
`autoResumeStep` declines to decide.

**Deliberately no on/off toggle in this pass.** P-4b prefs are server-backed and asserted by
`ecosystem.test.mjs`, and a false pause self-corrects within seconds — so the toggle buys little against
the cost of touching a locked settings surface. Add one if it misbehaves on the road.

**Gates:** `tsc --noEmit` clean · `expo lint` at baseline · **3209 tests pass, 0 fail**.

---

## Section 3 — Offline save queue *(first to build)*

### The spec being implemented

`W-9 §13.4`, verbatim: *"Local storage is the source of truth during a session. Cloud sync occurs after
session save when a connection is available… W-17 and W-18 display from local storage · The athlete sees
no error state · Sync completes silently when connection is restored · No 'saving to cloud' indicators."*

### The current behaviour, stated accurately

The failure mode today is **stuck, not lost.** `workout.tsx`'s Finish handler catches, sets an error and
returns to `phase: 'active'`; the autosave still holds the session and Home still offers Continue
Workout. What the athlete cannot do is *leave* — they are standing in the gym tapping Finish.

### ⚠ The hazard, already documented in `save.ts`

> *"A LOST RESPONSE IS NOT A FAILED SAVE — AND RETRYING ONE MAKES A SECOND WORKOUT. `save_workout` takes
> no idempotency key and there is no unique index on `workouts`."*

A naive retry queue creates duplicate workouts, duplicate PRs, a double `chapters.workout_count` bump
and a second `evaluate_honors` pass. **The guard already exists** — `findCommittedWorkout(userId,
startedAt)` uses the session's start instant as a natural fingerprint. The queue reuses it and must
never retry without it.

### Design

1. **Classify the failure.** Only a *transport* failure queues. A real rejection (RLS, validation)
   must still surface. ⚠ Queueing everything would silently swallow genuine errors — the guard gets
   proven against known positives and negatives before it ships.
2. **Queue it.** Session + partners + signals + units, appended to a `pending-saves` list in
   AsyncStorage. All four are already JSON-serialisable; the session is autosaved today.
3. **Release the athlete.** Clear the active session, end presence, navigate Home with a quiet
   confirmation. No error state, per §13.4.
4. **Drain silently** on launch and on foreground: for each pending entry, `findCommittedWorkout` first;
   if found, discard it as already landed; otherwise `saveWorkout` again. Silent on success and on
   continued failure — it stays queued.

### Scope, stated honestly

**In:** the queue, the idempotent drain, the offline confirmation. The athlete is never stuck and never
loses a session.

**Deferred, not dropped:** §13.4's *"W-17 and W-18 display from local storage."* `workout-complete`
fetches by `workoutId`, which a queued save does not have, so an offline athlete gets no completion
ceremony. Closing that means a second render mode for W-17 driven by the client-side `SaveResult` (which
already carries `prs`, `volume` and `sets` before the RPC runs). **This is a real gap in §13.4 coverage
and is recorded here rather than quietly skipped.**

### 3.1 As built — 2026-09-04

| File | What it is |
|---|---|
| `src/domain/workout/pending-save.ts` | **new** — pure: the queue shape, `isTransportFailure`, list ops keyed on `(athleteId, startedAt)` |
| `src/domain/workout/__tests__/pending-save.test.mjs` | **new** — 22 tests |
| `src/data/pending-save-live.ts` | **new** — AsyncStorage + the idempotent drain |
| `src/components/pending-save-drain.tsx` | **new** — headless; drains on mount and on every foreground |
| `src/domain/workout/save.ts` | `findCommittedWorkout` exported for the drain |
| `src/app/workout.tsx` | the offline branch in the Finish handler; `partnerNames`/`signals` hoisted out of the `try` |
| `src/app/_layout.tsx` | mounts the drain beside `AnalyticsTracker`, inside `OverlayBoundary` |

**A bug found while reviewing this and fixed before it shipped:** the first cut keyed the queue on
`startedAt` alone, with no owner. Two testers on one device — routine on this project — and the second
one's drain would have written the first one's workout into **their own** account: their chapter bump,
their records, their honors. Nothing downstream would ever have flagged it, because a saved workout looks
exactly like a saved workout. Entries now carry `athleteId`, read from the cached auth session (which
survives having no network), the drain replays only its own, and another athlete's entries are left on
disk rather than discarded. Three tests cover it.

**⚠ There is no NetInfo in this project** — it is a native dependency and adding one moves the
fingerprint. **Returning to the app is the proxy for returning to signal**, which is why the drain listens
to `AppState` and not to connectivity.

**Gates:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error, 14 pre-existing warnings —
the `displayWeight` unused import in `workout.tsx` is in `HEAD`) · **3178 tests pass, 0 fail**.

**Not closed, and named rather than skipped:** §13.4's *"W-17 and W-18 display from local storage."* An
offline finish lands on Home with a confirmation instead of the seal ceremony. Closing it means a second
render mode for W-17 off the client-side `SaveResult`.

---

## Section 4 — Rest alert when locked ⛔

### The PO chose "sound only, no banner". It cannot be built.

Three independent findings, each sufficient on its own:

1. **`shouldPlayInBackground: false`** is explicitly set in `src/lib/ding.ts`. Flipping it is OTA-able —
   but insufficient.
2. **`UIBackgroundModes` is `["location"]`** in `app.json`. Adding `"audio"` moves the fingerprint →
   **new binary**, so this was never an OTA item.
3. **The decisive one:** `UIBackgroundModes: audio` only keeps an app alive *while audio is actively
   playing*. The rest timer is a `setInterval` against a deadline. iOS suspends the JS runtime seconds
   after backgrounding, so **the timer never fires and no ding is ever requested.** Making it fire would
   mean playing continuous silent audio for the whole rest period — battery cost, and an App Store
   review risk Apple rejects apps for.

There is no way to emit a sound at a deadline from a suspended app without a notification. iOS offers no
programmatic "sound but no banner"; that is a per-app setting the *user* controls in iOS Settings.

### The two real options

| | What it is | Cost |
|---|---|---|
| **A — notification with sound** | A scheduled local notification at rest end. Reliable, and it **is OTA** — `expo-notifications` is already in the binary and configured in `app.json`. The banner shows; a user who wants sound-only sets Forge Legacy to *Deliver Quietly* in iOS Settings. Needs a Rest-Timer amendment resolving **RT-OQ-1** and lifting §8.1 | ~0.5 day + amendment |
| **B — drop it** | §8.1 stands. The rest timer stays foreground-only | nothing |

**Awaiting PO decision. Not built either way until then.**

---

## Section 5 — CSV history import ⚠ re-classified

`External-Activity-Import-Ownership-Deduplication-Note.md` is LOCKED and binds *any* import, not only
OAuth sync:

- §2 — a `source` attribute, set once at creation, never changed.
- §2 — a visible "imported from" indicator on Activity Detail.
- §4 Scenario C — **idempotency**: a re-import must never create a second record.
- §7 — the source marker and de-dup reference **survive edits**.

None of that is satisfiable in client code alone. **A migration is required** (a `source` column plus a
de-duplication reference on `workouts`). Still ordinary work — a paste bundle, as with the last 190 —
but this is not the pure-OTA item the analysis claimed, and the analysis doc is corrected accordingly.

### 5.1 ⛔ SKIPPED — PO decision, 2026-09-04

> *"Let's skip the csv import"*

Not built, and not started. ⚠ **The analysis still rates this the single highest-value acquisition fix in
the document** (`Competitive-Analysis-Hevy-Strava-v1.0.md` §2 H3: a switcher must abandon their history).
That assessment is unchanged by this decision and is left standing on purpose — skipping it is a
sequencing call, not a finding that the gap closed. The parser (`import-parse.ts`) and the file picker
(`pick-text-file.ts`) are both already in the codebase, so whenever this is picked up the remaining work
is the migration and the mapping, not the reading.

---

## Section 6 — Build order

1. **Offline save queue** — specced, highest reliability value, no open questions.
2. **Auto-pause** — greenfield, pure domain logic, fully testable under `node --test`.
3. **Per-set `Prev`** — needs `W9-Amendment-007` written alongside it.
4. **Data export** — ✔ BUILT. ⚠ Not greenfield after all: `P-9-Account-Wireframe-Spec.md` §2 gives Account
   exactly two rows, **Export My Data** and Delete Account, and only the second was ever built. §4.2's copy
   said the export is emailed, which is undeployable from here — see `P9-Amendment-001-Local-Data-Export.md`.
5. **CSV import** — last of the buildable set; needs its migration written and applied.
6. **Rest alert** — only if the PO takes Option A.

Each item ships complete — code, tests, and any owed amendment — before the next begins.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-04 | Initial plan. Spec pass found three collisions: W9-A5 declined per-set `Prev` (PO overrode, re-scoped as a subline rather than a column); the Ownership & De-Dup Note forces a migration for CSV import; Rest-Timer §8.1 bans notifications and the PO's chosen "sound only" variant is technically unbuildable on iOS. Recorded the `save_workout` idempotency hazard as the central risk of the offline queue, and the existing `findCommittedWorkout` guard as its answer. Recorded W-17-from-local-storage as a deferred, named gap in §13.4 coverage. |
