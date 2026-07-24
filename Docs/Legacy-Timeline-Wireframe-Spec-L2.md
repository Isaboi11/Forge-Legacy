# L-2 Legacy Timeline — Wireframe Specification
## Screen Specification: Full Legacy Timeline
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) §9 Risk 2 — the "View Full Timeline ›" destination, unspecced since L-1 locked.

> **Governing-authority pointer — `Calendar-System-Architecture-v1.0` (LOCKED, June 2026).** L-2 is the Legacy timeline indexed **by chapter** (newest-first). The Calendar is the **complementary by-date lens** over the **same** Legacy (CAL-D20) — not a second store. The Calendar's long-term purpose is this same permanent record viewed along the axis of time, inheriting **Never Charge For History** and **History Cannot Be Rewritten**. The Calendar reads timeline events as read-throughs (CAL-D3) and links into their owning detail surfaces (CAL-D17); it never edits a sealed entry. L-2's content and rules are unchanged; Legacy is reachable from the Calendar as its backward-looking entry point, and vice-versa.

**Authority Chain:**
- Legacy-Hub-Wireframe-Spec-L1.md (LOCKED) — §9.1–9.5: Timeline Teaser entry format, "View Full Timeline" CTA, V1.1 Candidate Deep Links framing
- Featured-Legacy-Moment-Standards.md (LOCKED) — canonical 9-event-type list and Tier definitions
- Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED) — §21.1: confirms chapter group headers exist and are tappable, routing to L-4
- Activity-History-Wireframe-Spec-W18.md (LOCKED) — confirms the explicit boundary between workout history (W-18) and legacy events (L-2)
- Accomplishments-Architecture-Note.md (LOCKED) — two-context accomplishment model (account-level vs. chapter-level), the basis for this document's athlete-level entry handling
- Forge-Legacy-Master-PRD.md §12 — the only prior specification text for the timeline ("Newest first. Chapter-grouped."), which this document implements

**Downstream Dependents:** None. No screen is unspecced because of this document.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

L-2 is the athlete's complete transformation arc — every meaningful and recent legacy event, in one continuous record. L-1's own teaser draws the distinguishing line for this screen: *"The timeline is not the same as the Featured Legacy Moment. The FLM selects the most meaningful event; the timeline shows the most recent events. They may overlap but are independent."* L-2 is the *recency* surface; the FLM (on L-1) is the *meaning* surface.

L-2 is also explicitly distinct from W-18 Activity History. W-18 is a raw workout log — *"not a legacy surface... no honor events, goal achievements, chapter sealing, photos, reflections, program graduations, rank-ups."* L-2 is the inverse: every one of those events, and never an individual workout-session log entry.

---

## Section 2 — Navigation Entry

L-2 is reached exclusively via L-1's Timeline Teaser — the "View Full Timeline ›" link (L-1 §9.2, Decision 9: *"'View Full Timeline' → L-2"*). No other screen in the locked architecture links directly to L-2. This is consistent with L-1's own stated navigation model: screens elsewhere that reference the Legacy tab navigate to L-3 or L-4 directly, never push to L-1 — L-2 follows the same single-entry-point shape, one level deeper.

L-2 is a standard tab-stack push from L-1 (system app bar, back chevron + title), not a modal.

---

## Section 3 — Layout Structure

```
┌─────────────────────────────────────────┐
│  ‹ Timeline                              │
│                                           │
│  Rank Up · Architect                Jun 8│   ← standalone (athlete-level)
│                                           │
│  ───────────────────────────────────     │
│  Road to 405                          ›  │   ← chapter header (tappable → L-3/L-4)
│  ───────────────────────────────────     │
│  Chapter Sealed · Road to 405       Jun 11│
│  Goal Achieved · Squat 405 lbs       Jun 1│
│  Memory Added · Road to 405         May 28│
│  Photo Added · Road to 405          May 20│
│  Chapter Started · Road to 405       Apr 2│
│                                           │
│  Major Accomplishment ·                  │
│  Ran first 5K                       Mar 15│   ← standalone (athlete-level)
│                                           │
│  ───────────────────────────────────     │
│  Foundations                          ›  │   ← chapter header (tappable → L-4)
│  ───────────────────────────────────     │
│  Chapter Sealed · Foundations        Mar 1│
│  Program Graduated ·                     │
│  Strength Foundation I              Feb 20│
│  Honor Earned · 10 Workouts          Feb15│
│  Chapter Started · Foundations       Jan 5│
│                                           │
│  [ loading more… ]                       │
└─────────────────────────────────────────┘
```

The screen is one continuous, single-column, reverse-chronological flow. Chapter-scoped events collapse into chapter sections (header + member events); athlete-level events appear as standalone rows directly in that same flow, at their own date, with no header of their own.

---

## Section 4 — Entry Format Per Event Type

All ten entry types reuse L-1 Timeline Teaser's exact format: `[Event Type] · [Object Name]` with the date right-aligned.

| Event Type | Object Name Source | Example | Grouping |
|---|---|---|---|
| Chapter Started | Chapter name | "Chapter Started · Road to 405" | Chapter section |
| Chapter Sealed | Chapter name | "Chapter Sealed · Road to 405" | Chapter section |
| Goal Achieved | Goal name | "Goal Achieved · Squat 405 lbs" | Chapter section (the goal's own chapter) |
| Program Graduation | Program name | "Program Graduated · Strength Foundation I" | Chapter section (whichever chapter was active at the time of graduation) — **standalone if no chapter was active then** |
| Major Accomplishment | Accomplishment text | "Major Accomplishment · Ran first 5K" | Chapter section **or** standalone, per Accomplishments-Architecture-Note's two-context model |
| Honor Earned | Honor name | "Honor Earned · 10 Workouts in Chapter" | Chapter section, when the honor is chapter-attributed; otherwise standalone |
| Reflection Added | Chapter name | "Reflection Added · Road to 405" | Chapter section |
| Memory Added | Chapter name | "Memory Added · Road to 405" | Chapter section |
| Photo Added | Chapter name | "Photo Added · Road to 405" | Chapter section |
| Rank Up | New rank name | "Rank Up · Architect" | **Always standalone** — rank is never chapter-scoped |

**Program Graduation's attribution is time-based, not program-based.** Per Critical-Decisions-Amendment-001.md, *"programs span chapters"* — a program is not tied to a single chapter, so it has no fixed chapter of its own to inherit. M-4-Program-Graduated-Spec.md §8.7 confirms graduation fires at W-17 (post-workout), and Workouts-Hub-Wireframe-Spec-W1.md confirms workouts can be logged with no active chapter (*"surface as uncategorized in the Legacy system"*). So a graduation is attributed to whichever chapter happened to be active at that moment — it can just as easily have no chapter relationship at all. This is a different mechanism from Goal Achieved, where the goal's chapter relationship is fixed at creation (per G-1's "current active chapter's goals" model), not re-evaluated at the moment of achievement. The two rows should not be read as following the same rule.

---

## Section 5 — Chapter Grouping Behavior

- **Header**: chapter name, right-aligned chevron (›), full row tappable. Active chapter → L-3 (Active Chapter Detail). Archived chapter → L-4 (Archived Chapter Detail) — confirmed locked behavior per Chapter-Detail-Wireframe-Spec-L3-L4.md §21.1: *"Timeline → taps chapter group header → L-4 Archived Chapter."*
- **Section ordering**: the active chapter's section (if it has any timeline-worthy entries) appears first; archived chapters follow in reverse-chronological order by seal date.
- **Within a section**: every event belonging to that chapter, newest-first.
- **No empty chapter sections**: a chapter with zero timeline-worthy entries (e.g., started but immediately abandoned with nothing else recorded) does not produce an empty header — consistent with this product's "silence is the correct empty state" convention.

---

## Section 6 — Athlete-Level Entry Behavior

Rank Up, any account-level Major Accomplishment or Honor Earned (per the two-context model), and any Program Graduation that occurred with no active chapter (per Section 4's note — the same "uncategorized" case Workouts-Hub-Wireframe-Spec-W1.md already names for ordinary workouts), have no chapter relationship. These are rendered as **standalone chronological entries**. They are **not** grouped into a separate section of their own, and they are **not** attached to a chapter — there is no "Account" or "Other" pseudo-section anywhere on this screen. Each one appears **inline at its exact chronological position relative to the chapter-grouped events**, interspersed directly into the same single timeline flow (see Section 3's layout — the standalone Rank Up and Major Accomplishment rows sit between chapter sections, exactly where their dates place them).

This deliberately avoids two errors: forcing a false chapter attribution onto an event the architecture defines as chapter-independent, and inventing a structural grouping ("Account events") that no locked document specifies.

---

## Section 7 — Date Formatting

L-1's teaser explicitly defers this to the full timeline: *"Dates: for entries within the last 7 days, use calendar date... Not time-ago in the teaser (the full timeline handles relative formatting)."* L-2 is that full timeline, so it owns the relative-formatting decision:

- Today → "Today"
- Yesterday → "Yesterday"
- 2–6 days ago → "X days ago"
- 7+ days ago, same year → "MMM D" (e.g., "Jun 11")
- Different year → "MMM D, YYYY" (e.g., "Nov 3, 2025")

---

## Section 8 — Empty States

A new athlete with zero timeline entries is an unlikely but possible edge case (if onboarding's chapter/goal creation was skipped entirely). Per this product's established convention, no fake content or illustration is shown — a single centered line: *"Your legacy timeline will appear here as you build."* No CTA — chapter/goal creation happens elsewhere (L-5, O-3), not from this screen.

---

## Section 9 — Navigation Table

| From | Action | To |
|---|---|---|
| L-1 | Tap "View Full Timeline ›" | L-2 |
| L-2 | Tap a chapter header (active chapter) | L-3 |
| L-2 | Tap a chapter header (archived chapter) | L-4 |
| L-2 | Tap back chevron | L-1 |
| L-2 | Scroll to bottom | Loads more entries (infinite scroll) |
| L-2 | Tap an individual entry (any type) | No-op — entries are read-only in MVP (Section 11) |

---

## Section 10 — Accessibility Requirements

| Element | accessibilityLabel | Notes |
|---|---|---|
| Back chevron | "Back" | Returns to Legacy Hub |
| Chapter header | "[Chapter Name]" | `accessibilityHint`: "Opens chapter detail" |
| Standalone entry (e.g., Rank Up) | "[Event Type], [Object Name], [Date]" | Read as static text — not a button, not focusable as an interactive element |
| Chapter-section entry | "[Event Type], [Object Name], [Date]" | Same — static text within the section |
| Loading indicator | "Loading more timeline entries" | Announced when infinite scroll fetch begins |

**Focus order:** Top to bottom, matching visual order — back chevron, then every entry and header in the order they're rendered.

---

## Section 11 — Non-Behaviors

- **No per-entry tap-through in MVP.** L-1 §9.5 explicitly frames deep links to L-4/G-2/W-3/L-10 as "V1.1 Candidate" — not committed MVP scope, and one of the four candidate destinations (L-10) isn't even built. Entries remain read-only, consistent with W-19's same treatment of historical records.
- **No filters** (by event type, by date range, by chapter) — not evidenced as locked anywhere for this screen.
- **No analytics, trend charts, or aggregate statistics** — consistent with W-18's own non-behaviors, reused here; L-2 is a record, not an analysis surface.
- **No new event types** beyond the ten already canonical (nine from Featured-Legacy-Moment-Standards.md, plus Chapter Started).
- **No false chapter attribution** for Rank Up or account-level accomplishments/honors — they are never displayed under a chapter header they don't actually belong to.
- **No "Account" or "Other" pseudo-section** — standalone entries are interspersed inline, never collected into their own group.
- **No pagination UI** (page numbers, "next page" controls) — infinite scroll only.

---

## Section 12 — Validation Checklist

### Navigation
- [ ] L-2 reachable only via L-1's "View Full Timeline ›" link
- [ ] Standard tab-stack push, system app bar, back chevron returns to L-1
- [ ] Chapter headers tappable → L-3 (active) / L-4 (archived)
- [ ] Individual entries are not tappable (no-op)

### Layout & Grouping
- [ ] Chapter sections ordered: active chapter first (if it has entries), then archived chapters newest-sealed-first
- [ ] Within each chapter section, events ordered newest-first
- [ ] No empty chapter sections rendered
- [ ] Standalone athlete-level entries (Rank Up, account-level Major Accomplishment/Honor Earned) appear inline at their correct chronological position, never inside a chapter section, never in a separate pseudo-section
- [ ] All ten event types use the exact `[Event Type] · [Object Name]` format from Section 4

### Date Formatting
- [ ] Today / Yesterday / "X days ago" for entries within 7 days
- [ ] "MMM D" for entries 7+ days ago in the same year
- [ ] "MMM D, YYYY" for entries from a different year

### Empty State
- [ ] Zero-entry state shows a single static line, no illustration, no CTA

### Non-Behaviors
- [ ] No per-entry tap-through anywhere
- [ ] No filters, analytics, trend data, or pagination controls
- [ ] No new event types introduced
- [ ] No chapter attribution invented for chapter-independent events

### Accessibility
- [ ] All interactive elements (back chevron, chapter headers) have accessibilityLabel and accessibilityHint per Section 10
- [ ] All entries are static text, not focusable as buttons
- [ ] Focus order matches visual top-to-bottom order

---

## Section 13 — Open Issues

**None blocking.** Every event type, the entry format, and the chapter-header-tappable behavior trace to specific locked text.

Carried forward, not blocking:
- **L-9 terminology lag.** Chapter-Detail-Wireframe-Spec-L3-L4.md §21.1 still refers to this screen as "L-9 Timeline" — an older, Phase-1-era PRD code. This document uses L-2 as canonical, matching L-1's own current usage. Same documentation-lag pattern already found repeatedly across this project (P-6, P-4, L-1's own P-3 references); a cosmetic cross-reference fix, not a blocker.
- **Per-entry deep links** (Chapter Sealed → L-4, Goal Achieved → G-2, Program Graduated → W-3, Honor Earned → L-10) remain a clearly-scoped V1.1 candidate, explicitly not resolved by this document, per L-1's own framing.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. |
| 1.0.1 | June 2026 | Corrected Program Graduation's chapter attribution (Sections 4, 6) from a static "chapter-linked or not" property to a time-based rule: attributed to whichever chapter was active at the moment of graduation, standalone if none was. Per Critical-Decisions-Amendment-001.md ("programs span chapters") and Workouts-Hub-Wireframe-Spec-W1.md's confirmed "uncategorized" case for workouts logged without an active chapter. No navigation, layout, or new-behavior change. |

---

*L-2 Legacy Timeline — Wireframe Specification*
*Screen Specification: Full Legacy Timeline*
*June 2026*
*Authority: Legacy-Hub-Wireframe-Spec-L1.md (LOCKED), Featured-Legacy-Moment-Standards.md (LOCKED), Chapter-Detail-Wireframe-Spec-L3-L4.md (LOCKED), Activity-History-Wireframe-Spec-W18.md (LOCKED), Accomplishments-Architecture-Note.md (LOCKED)*
*Status: LOCKED*
