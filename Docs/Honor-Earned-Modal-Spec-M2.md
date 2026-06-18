# M-2 Honor Earned Modal
## Wireframe Specification v1.1 | June 2026

**Authority:** L-10 Honors Architecture (all 16 decisions locked), W-17 Workout Summary Spec v1.0, Master PRD § 13, Product DNA.

---

### 1. Purpose

M-2 is the ceremony moment when an honor is awarded. It is the product's voice saying: *I see what you just built.*

M-2 fires at W-17 load, immediately after a live session save completes. It appears before the athlete has interacted with the workout summary. The session is the context; the honor is the recognition.

**Emotional tone:** Earned. Quiet pride. Not celebration — recognition. M-2 should feel like a deep nod, not an explosion. The honor is permanent; the modal is brief. The athlete dismisses it and returns to W-17.

---

### 2. Trigger Conditions

M-2 fires when **all** of the following are true:

1. A workout session save has just completed (W-17 is loading)
2. The server-side honor evaluation has returned one or more newly earned honors for this session
3. The session was live (online, or sync completes before W-17 loads)

M-2 does **not** fire when:
- No honors were earned this session
- The session was completed offline and sync has not yet occurred (silent delivery to L-10)
- The honors were retroactively awarded via import (handled in import completion flow)
- The honors were triggered by chapter sealing (handled in M-5 / L-6 sealing flow)
- M-2 has already been shown for this session (exactly one M-2 per session, never re-triggered)

**Honor evaluation timing:** The evaluation service runs server-side after session save. For live sessions, evaluation is expected to complete before W-17 fully loads. If it completes after W-17 has loaded, M-2 fires as soon as the result arrives. If evaluation does not complete within an acceptable threshold (~5 seconds after W-17 load), evaluation is abandoned for this session — the honor is delivered silently to L-10. W-17 is never blocked or delayed waiting for evaluation.

---

### 3. Placement in Workout Completion Flow

```
W-9–W-16  (Active Workout)
    ↓
"End Workout" → Abandonment/End Confirmation Sheet
    ↓
Session save + server sync initiated
    ↓
W-17 loads
    ↓ ← honor evaluation result arrives
M-2 fires as centered modal overlay on W-17
    ↓ ← athlete dismisses M-2
W-17 fully accessible
```

M-2 is a centered modal overlay on W-17. W-17 content is visible but dimmed behind M-2 until it is dismissed. The athlete sees M-2 first; the workout summary is the context beneath it.

M-2 never interrupts W-9–W-16. The session is complete before any recognition is shown.

---

### 4. Single-Honor Behavior

When exactly one honor is earned this session:

```
┌────────────────────────────────────┐
│                                    │
│   First Chapter Sealed             │  ← Honor name, large, centered
│                                    │
│   A permanent part of your         │  ← Acknowledgment copy
│   legacy.                          │
│                                    │
│         [ Continue ]               │  ← Single dismiss CTA, centered
│                                    │
└────────────────────────────────────┘
```

**Content:**
- Honor name — large primary weight, centered
- Acknowledgment copy below the honor name (see Section 4.1)
- Single CTA: `"Continue"` — centered, primary style

**No honor icon. No trophy imagery. No confetti. No sound by default.**

#### 4.1 Acknowledgment Copy

The single line of copy beneath the honor name is the same across all honors:

> *"A permanent part of your legacy."*

This copy:
- Is honor-type-agnostic — no variations per honor
- Does not say "Congratulations" (hollow)
- Does not reference rank ("This honor contributes to your rank") — explicitly excluded
- Does not tease the next honor ("X more workouts until your next honor") — explicitly excluded
- Is calm, not effusive — recognition, not spectacle

---

### 5. Multi-Honor Behavior

When two or more honors are earned this session:

```
┌────────────────────────────────────┐
│                                    │
│   Honors Earned                    │  ← Section label, secondary weight
│                                    │
│   First Chapter Sealed          ›  │  ← Honor row, tappable → L-11
│   50 Workouts Logged            ›  │  ← Honor row, tappable → L-11
│                                    │
│         [ Continue ]               │  ← Single dismiss CTA, centered
│                                    │
└────────────────────────────────────┘
```

**Content:**
- Section label: `"Honors Earned"` — secondary weight, muted, above the list
- Vertical text list of honor names, one per row, with trailing `›`
- Each row is tappable → opens L-11 for that specific honor
- Single CTA: `"Continue"` — centered, primary style

**Order:** Honors listed in the order awarded by the evaluation service. No sorting by category or significance.

**Scroll:** If more than ~5 honors are listed (edge case; a single session typically triggers at most a handful of evaluation events even across the full 53-type catalog), the list scrolls within the modal. The `"Continue"` CTA remains fixed at the bottom.

---

### 6. Dismissal Behavior

| Action | Result |
|--------|--------|
| `"Continue"` tap | Dismiss M-2. W-17 fully revealed and interactive. |
| Tap outside modal (dimmed region) | No action. M-2 remains open. |
| Drag gesture | No action. M-2 is a centered modal, not a bottom sheet. |
| Android hardware back | No action. M-2 remains open. |

After dismissal:
- M-2 does not re-appear for this session or for these honors, ever.
- W-17 is fully revealed and all standard W-17 interactions are available.
- The earned honors are permanently accessible at L-10 → L-11.

The only way to dismiss M-2 is the `"Continue"` CTA. This is deliberate — accidental dismissal degrades the recognition value.

---

### 7. Navigation Behavior

| Action | Destination |
|--------|------------|
| `"Continue"` tap | W-17 (M-2 dismissed, W-17 revealed) |
| Honor row tap (multi-honor, tappable) | L-11 for that specific honor (M-2 dismissed) |
| Hardware back (Android) | No navigation — M-2 remains open |

**M-2 → L-11 flow:** When an honor row is tapped in the multi-honor modal, M-2 dismisses and L-11 opens as a bottom sheet on top of W-17. Returning from L-11 (drag down or tap outside) returns to W-17 — not back to M-2. M-2 does not reappear after L-11 is dismissed.

---

### 8. Offline Behavior

M-2 does not fire for sessions completed while offline.

```
Athlete completes session offline
    ↓
Session written to local storage
    ↓
W-17 loads from local record
    ↓
No honor evaluation has run (server-side only)
    ↓
M-2 does not fire
    ↓
On sync: server evaluates, honors awarded silently
    ↓
Honors appear in L-10 with session date
```

The honor is permanently in L-10. The ceremony (M-2) does not occur for that session. A deferred modal appearing hours or days after a session would lack context and meaning — silent delivery is the correct trade-off.

---

### 9. Accessibility

- Modal announced to screen readers as `"Honor earned"` (single) or `"Honors earned"` (multiple)
- Honor name(s) announced at heading level
- Acknowledgment copy (single-honor) announced as static text
- `"Continue"` CTA is the default focus target when modal opens
- In multi-honor modal: each honor row announced as a link — `"[Honor Name], double-tap for details"`
- Focus is trapped within the modal while open (standard modal behavior)
- After dismissal, focus returns to W-17

Minimum touch target: 44×44pt for all interactive elements, including individual honor rows in multi-honor list.

---

### 10. Edge Cases

**E-1: Session completes live but honor evaluation fails or times out.**
M-2 does not fire. The honor (if awarded later on retry) is silently delivered to L-10. No error message shown to athlete. W-17 is unaffected.

**E-2: Honor evaluation returns after W-17 has been dismissed.**
M-2 does not fire after W-17 is no longer active. Honor is silently delivered to L-10. No deferred modal.

**E-3: First ever honor earned (first session, first use).**
No special behavior. M-2 for `"First Workout Logged"` is identical to any other single-honor modal. The honor name carries the significance.

**E-4: Athlete earns a one-time honor that was already earned.**
The evaluation service must not award duplicates of one-time honors. This is an evaluation service responsibility. M-2 never receives a duplicate honor ID.

**E-5: Chapter-sealing honors earned in the same general timeframe as a workout session.**
`"First Chapter Sealed"` fires at chapter sealing (M-5/L-6 flow), not at W-17. If the athlete logs their final workout and then seals the chapter in the same session, two separate delivery events occur: `"First Workout Logged"` (or another workout-triggered honor) via M-2 at W-17, and `"First Chapter Sealed"` via the M-5 sealing flow. These do not merge.

**E-6: Athlete immediately navigates away from W-17 before M-2 fires.**
If the evaluation result arrives after the athlete has left W-17, M-2 does not fire. Honor is silently delivered to L-10.

**E-7: Multiple honors of the same session trigger M-2 across two devices.**
Honor evaluation is server-side and deduplicated. Only one M-2 fires per honor per session, regardless of device. This is an evaluation service responsibility.

---

### 11. Non-Behaviors

M-2 does not and will never:

- Fire mid-session (W-9–W-16)
- Fire as a push notification
- Fire at app open, home screen load, or tab switch
- Fire for offline-deferred honors
- Fire for import-retroactive honors
- Fire for chapter-sealing honors
- Show a sequential second modal for the same session
- Show an honor icon or trophy imagery
- Show a share CTA
- Show rank contribution messaging
- Show a "next honor" progress tease
- Play confetti or particle animation
- Play a sound by default
- Persist after dismissal
- Re-trigger after dismissal for the same session or the same honors

---

### 12. Downstream Dependencies

- **W-17** must trigger M-2 display on load when honor evaluation returns results
- **Honor evaluation service** must run server-side, post-session-save, and return results before or immediately after W-17 load
- **Honor evaluation service** must handle one-time honor deduplication (never award same one-time honor twice)
- **L-11** receives navigation from M-2 multi-honor row taps (passes `honorId`)
- **M-5 / L-6 sealing flow** handles chapter-sealing honors independently — M-2 spec has no opinion on M-5 implementation

---

### 13. Validation Checklist

- [ ] M-2 fires at W-17 load when at least one honor was earned this session
- [ ] M-2 does not fire when no honors were earned
- [ ] M-2 does not fire mid-session (W-9–W-16)
- [ ] Single-honor: honor name visible, acknowledgment copy visible, `"Continue"` CTA present
- [ ] Multi-honor: `"Honors Earned"` label visible, all honor names listed, `"Continue"` CTA present
- [ ] Multi-honor honor rows are tappable → L-11
- [ ] L-11 opens on honor row tap; M-2 does not reappear after L-11 dismissal
- [ ] `"Continue"` dismisses M-2; W-17 fully revealed
- [ ] Tap outside does not dismiss
- [ ] Drag gesture does not dismiss
- [ ] Android hardware back does not dismiss
- [ ] M-2 does not fire for offline-deferred honors
- [ ] M-2 does not fire for import-retroactive honors
- [ ] M-2 does not re-fire after dismissal for the same session
- [ ] No icon or trophy imagery present
- [ ] No share CTA present
- [ ] No rank contribution message present
- [ ] No next-honor tease present
- [ ] `"Continue"` is default focus when modal opens (accessibility)
- [ ] Focus trapped while modal is open (accessibility)
- [ ] Announced as `"Honor earned"` / `"Honors earned"` to screen readers
- [ ] Multi-honor rows announced as links to screen readers
- [ ] No behavior change if evaluation times out (honor delivered silently to L-10)

---

### 14. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification |
| v1.1 | June 2026 | Updated catalog count reference from 12 to 53 types |

---

*M-2 Honor Earned Modal — Wireframe Specification v1.1*
*Forge Legacy | June 2026*
