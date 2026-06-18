# W-18 Activity History
## Wireframe Specification v1.0 | June 2026

**Status:** LOCK CANDIDATE
**Authority:** W-9 v1.0 (LOCKED), W-17 v1.0 (LOCKED), W-1 v1.1 (LOCKED), L-3/L-4 v1.0 (LOCKED), Product DNA (LOCKED)
**Reads from:** Session records written by W-9 / W-17
**Navigated from:** W-1 Workouts Hub ("View All" from Recent Workouts section)
**Navigates to:** W-1 (back), W-19 Activity Detail (per session row tap)

---

## 1. Screen Purpose

W-18 Activity History answers one question: **What have I done?**

It is the complete, reverse-chronological log of every workout session the athlete has saved to Forge Legacy. It is a read-only record — a factual accounting of training history. Nothing is interpreted, scored, coached, or narrated here.

**W-18 is not a legacy surface.** The legacy is told by L-1, L-3, and L-4. The chapter narrative, the reflection, the honored moments — those belong there. W-18 is the raw log. The difference between W-18 and L-3 is the difference between a training journal's date log and the chapter it belongs to.

**W-18 is not an analytics surface.** There are no trend charts, no PR indicators, no total volume numbers, no week-over-week comparisons. Those are post-MVP. W-18 is a list, not a dashboard.

**W-18 is not a coaching surface.** No suggestions, no gaps identified, no "you haven't trained in 5 days" messaging. W-18 has no opinion. It shows what happened.

**The athlete should feel:** "Here is everything I've done." Clean. Complete. Factual.

**Emotional tone:** Grounded. Complete. Historical.

---

## 2. Entry Points

### 2.1 Current Entry Points (MVP)

| Source | Trigger | Context Passed |
|--------|---------|---------------|
| W-1 Workouts Hub | "View All" link from Recent Workouts section | None — W-18 loads full history |

W-1's Recent Workouts section shows 2–3 most recent sessions. "View All" links to W-18 showing the complete history.

### 2.2 Presentation Mode

W-18 is a **push navigation screen** within the Workouts tab stack. It extends the W-1 navigation stack. Tab bar remains visible throughout.

W-18 is not a modal, not a sheet. The athlete navigates into it with intention and navigates back with the back arrow.

### 2.3 Future Entry Points (Noted — Not Specced)

| Source | Trigger | Notes |
|--------|---------|-------|
| W-2 / W-3 | "View History for This Program" | Program-scoped history — V1.1 |
| L-3 / L-4 | "View All Sessions" from chapter session section | Chapter-scoped history — V1.1 |
| P-1 Profile | Stats surface | V1.1 |

For MVP, W-18 always shows unfiltered full history. Program-scoped and chapter-scoped views are V1.1 entry points that would pass filter context to W-18.

---

## 3. Exit Points

| Destination | Trigger |
|-------------|---------|
| W-1 | Back button (header) |
| W-19 | Tap any session row |

There are no other exit points. W-18 is read-only. No actions taken here modify any data.

---

## 4. Information Architecture

### 4.1 Screen Layout

```
┌────────────────────────────────────────────────────┐
│  [←]    Activity History                           │
├────────────────────────────────────────────────────┤
│  [All] [Strength] [Run] [Walk] [Bike] [Swim]  →   │
│  [HIIT] [Mobility] [Yoga] [Other]                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  JUNE 2026                     (sticky header)     │
│  ─────────────────────────────────────────         │
│  [session row]                                     │
│  [session row]                                     │
│  [session row]                                     │
│                                                    │
│  MAY 2026                      (sticky header)     │
│  ─────────────────────────────────────────         │
│  [session row]                                     │
│  [session row]                                     │
│                                                    │
│  APRIL 2026                    (sticky header)     │
│  ─────────────────────────────────────────         │
│  [session row]                                     │
│                                                    │
│               [loading spinner — bottom]           │
└────────────────────────────────────────────────────┘
```

### 4.2 Scroll Hierarchy

1. **Header** — fixed (back arrow + title)
2. **Filter chip strip** — fixed below header (does not scroll)
3. **Session list** — scrollable content area
   - Month section headers: sticky within scroll area (pin below filter strip when their section is at the top of the viewport)
   - Session rows: scroll normally within their month section
   - Load-more spinner: appears at bottom of content during batch fetch

### 4.3 Content Order

Sessions are ordered: most recent first, globally. Within each month section, most recent date first, then most recent time first within the same date.

---

## 5. Session Row Anatomy

### 5.1 Row Structure

```
┌────────────────────────────────────────────────────────────┐
│  [icon]  Leg Day A                       Tue, Jun 10  [›] │
│          12 sets · 3 exercises           45 min           │
│          Season 1 — The Foundation                        │
└────────────────────────────────────────────────────────────┘
```

| Component | Spec |
|-----------|------|
| Activity type icon | 24pt, left-aligned, category-appropriate tint color |
| Workout name | 15sp, primary weight, up to 2 lines |
| Date | 13sp, muted secondary, right-aligned, same row as name. Format: "Tue, Jun 10" (day of week abbreviated + month abbreviated + day number) |
| Key stat | 13sp, muted secondary, below name |
| Duration | 13sp, muted secondary, right-aligned, same row as key stat |
| Chapter attribution | 13sp, muted secondary, third line |
| Partial indicator | 11sp chip, "Partial" label, trailing the chapter attribution (§ 8) |
| Navigation chevron | 13pt ›, rightmost, vertically centered, muted |
| Row touch target | Full-width, minimum 72pt height |
| Separator | 1pt hairline below each row, inset left to icon right edge |

### 5.2 Workout Name Fallback

If the session has no explicit name (free-form workout, no program slot name):
- Display the activity type label: "Strength", "Run", "Walk", "Bike", "Swim", "HIIT", "Mobility", "Yoga", "Custom"
- This is the same fallback used by W-17

If the session has an explicit name (program slot name from W-4, e.g., "Push A", "Leg Day"): display that name.

### 5.3 Key Stat by Activity Type

The key stat is a single compact summary — the most meaningful number for that activity type.

| Activity Type | Key Stat Format | Example |
|---------------|-----------------|---------|
| STRENGTH | "[N] sets · [M] exercises" | "12 sets · 3 exercises" |
| RUN | "[distance] [unit]" | "3.2 mi" or "5.1 km" |
| WALK | "[distance] [unit]" | "1.8 mi" |
| BIKE | "[distance] [unit]" | "14.3 mi" |
| SWIM | "[distance] [unit]" or "[N] laps" | "800 m" |
| HIIT | "[duration]" (already shown as duration) — show round count if available: "[N] rounds" | "5 rounds" |
| MOBILITY | "[duration]" (already shown) — omit; show nothing or sub-label | — |
| YOGA | "[duration]" (already shown) — omit; show nothing or sub-label | — |
| OTHER / CUSTOM | "[duration]" (already shown) — show custom activity name if set, otherwise blank | "Rock Climbing" |

**For MOBILITY and YOGA:** Duration is the defining metric and is already shown in the duration column. The key stat field is empty for these types. The row still has the key stat line for consistency — it is visually blank (no label). The row height does not collapse — it stays at 72pt minimum to maintain list regularity.

**For OTHER with a named activity:** If the athlete named the activity at W-16 (custom activity name field), that name appears as the key stat. If no custom name, the key stat is blank.

### 5.4 Activity Type Icons

| Type | Icon |
|------|------|
| STRENGTH | Dumbbell |
| RUN | Running figure |
| WALK | Walking figure |
| BIKE | Bicycle |
| SWIM | Wave / swimmer |
| HIIT | Lightning bolt |
| MOBILITY | Stretching figure |
| YOGA | Lotus / seated figure |
| OTHER | Stopwatch / generic activity |

Icons are 24pt, rendered in a category-appropriate muted tint color. No filled background. No badge.

### 5.5 Duration Display Format

| Duration | Format |
|----------|--------|
| Under 1 minute | "< 1 min" |
| 1–59 minutes | "[N] min" |
| 60–89 minutes | "1 hr [N] min" |
| 90+ minutes | "[N] hr [M] min" |
| Exact on-hour (e.g. 120 min) | "2 hr" |

### 5.6 Date Format

Within a month section, dates display: "Tue, Jun 10" — abbreviated day name, abbreviated month, day number. Year is not shown because the month section header already establishes the year.

**Edge case:** For current calendar day's sessions, still show "Tue, Jun 10" — not "Today." The W-1 Recent Workouts section uses "Today" for recency labeling; W-18 uses absolute dates for historical accuracy.

---

## 6. Month Grouping

### 6.1 Section Header Format

```
JUNE 2026
──────────────────────────────────────────
```

- Section label: uppercase month name + year, 12sp, secondary weight, muted color
- Divider line: 1pt hairline, full width, below label
- Minimum vertical padding: 8pt above label, 4pt below divider

### 6.2 Sticky Behavior

Month section headers pin to the top of the scrollable content area (below the filter chip strip) when their section reaches the top of the viewport. They are replaced by the next month's header as the athlete scrolls deeper. Standard iOS/Android section index header behavior.

### 6.3 Session Count in Month Header

No session count is displayed in the month header. Counts add visual noise without clear benefit — the athlete is scanning for sessions, not auditing quantities.

### 6.4 Months With No Sessions

Months with zero sessions (from a gap in training history) do not appear in the list. No empty month section header. Sessions from the prior month are followed immediately by the next month that has sessions. Time gaps are naturally apparent from the date difference between rows without explicitly calling them out.

The same applies when a filter is active: months that have no sessions of the filtered type are omitted entirely.

---

## 7. Filter Architecture

### 7.1 Filter Strip

A horizontally scrollable chip strip pinned below the header, above the session list.

```
[All] [Strength] [Run] [Walk] [Bike] [Swim] [HIIT] [Mobility] [Yoga] [Other] →
```

- Default selected: "All" (no filter applied)
- Single-select: selecting a type deselects "All"; selecting "All" clears any active type filter
- Chips: 32pt height, 12sp label, 16pt horizontal padding, 12pt corner radius
- Active chip: filled background (primary tint color), white label
- Inactive chip: outlined or muted background, secondary text color
- Strip scrolls horizontally if chips exceed viewport width; left-fades when there are hidden chips to the right
- Gradient fade mask at right edge signals scrollability; no explicit scroll indicator

### 7.2 Filter Behavior

When a filter chip is selected:

- The session list re-renders to show only sessions of the selected activity type
- Month headers update to reflect only months that have sessions of that type
- Months with no sessions of that type disappear
- If no sessions of the selected type exist: show activity-type empty state (§ 11.2)
- The filter chip strip remains visible; the active chip remains highlighted

Filter state is **not preserved** across W-18 sessions. Each entry to W-18 defaults to "All." Athletes coming back to check their history get the full picture by default.

### 7.3 Filter and Imported Sessions

Imported sessions are included in filter results. A STRENGTH import session appears when the Strength chip is selected. No special behavior.

### 7.4 No Multi-Select (MVP)

The filter is single-select. An athlete cannot select "Run + Walk" simultaneously. Multi-select is V1.1.

---

## 8. Partial Session Handling

### 8.1 What Is a Partial Session

A partial session is one the athlete ended early via "Save & Exit" in W-9's abandonment confirmation sheet. The session record exists with `isPartial: true` and whatever data was logged before exit. W-17 displayed a "Partial" label on the summary.

### 8.2 Partial Indicator in W-18

Partial sessions display normally in W-18 rows with an additional "Partial" chip trailing the chapter attribution line:

```
[icon]  Push A                            Mon, Jun 8  [›]
        4 sets · 2 exercises              18 min
        Season 1 — The Foundation   [Partial]
```

- "Partial" chip: 11sp label, outlined chip style (not filled), same secondary tint as chapter attribution
- Chip color: neutral muted — not red, not orange, not any alarm color. The partial label is factual, not critical.
- A partial session is valid training history. It is not an error.

### 8.3 Partial Sessions in Filters

Partial sessions of a given activity type appear when that type's filter chip is active. No separate "Partial only" filter. Partial sessions participate fully in the list.

---

## 9. Chapter Attribution

### 9.1 Attribution Display

Each session row shows the name of the chapter the athlete was in at the time the session started. This is snapshotted at session start and immutable.

```
Season 1 — The Foundation
```

- 13sp, muted secondary text
- Third line of the session row
- Chapter name as snapshotted — the current chapter name may have been edited post-session, but the snapshot is what displays (History Cannot Be Rewritten)

### 9.2 Unchaptered Sessions

If the athlete had no active chapter at the time of the session (valid state), the chapter attribution line is omitted entirely. The row is 2-line instead of 3-line.

```
[icon]  Run                               Sat, Jun 6  [›]
        3.1 mi                            31 min
```

No "[No Chapter]" label, no "—", no placeholder. Absent = unchaptered. Clean.

### 9.3 Sessions from Archived Chapters

Sessions from chapters that have since been sealed (archived) display the same chapter attribution. The chapter name is still shown in muted secondary text. The row tap goes to W-19, where the chapter detail link (if any) correctly routes to L-4 (archived chapter detail) rather than L-3 (active chapter detail).

W-18 itself does not need to distinguish active vs. archived chapter attribution — it shows the name, and W-19 handles the correct routing.

### 9.4 Tappability of Chapter Attribution in W-18

The chapter attribution text in W-18 rows is **not independently tappable**. The entire row is a single tap target going to W-19. Chapter detail access is available within W-19.

Rationale: Making inline text tappable within a tappable row creates a hit-target ambiguity problem. The athlete taps the row to see the session; if they want to navigate to the chapter, they can do so from W-19.

---

## 10. Program Attribution

### 10.1 Program Information in W-18 Rows

Program attribution (program name, workout slot name) is **not displayed in W-18 session rows**.

Rationale: Session rows already carry three data lines (name/date, stat/duration, chapter). Adding a fourth line for program context clutters the row without proportionate scanning value. The athlete identifying a session by scanning W-18 uses the workout name, date, activity type, and chapter — not the program name. Program context is available in W-19.

### 10.2 Program Attribution in W-19

The program name and workout slot name (if the session was a program workout) appear in W-19 Activity Detail. W-18 passes only `sessionId` to W-19.

---

## 11. Empty States

### 11.1 No Sessions (Account Has No Training History)

```
┌────────────────────────────────────────────────────┐
│  [←]    Activity History                           │
├────────────────────────────────────────────────────┤
│  [All] [Strength] [Run] ...                        │
├────────────────────────────────────────────────────┤
│                                                    │
│                                                    │
│         Your workout history will appear           │
│         here as you train.                         │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

- Primary copy: "Your workout history will appear here as you train."
- No CTA — this is a history screen, not a dispatch surface. The athlete trains from W-1, not W-18.
- No illustration, no encouragement, no coaching. Factual.

### 11.2 No Sessions for Active Filter

When a filter is applied and no sessions of that type exist:

```
No [Activity Type] sessions yet.
```

Examples:
- "No Run sessions yet."
- "No Swim sessions yet."

- 15sp, muted, centered
- "All" chip remains accessible at left of filter strip to clear the filter
- No CTA

---

## 12. Loading States

### 12.1 Initial Load (Cached Data Available)

If session data is cached locally:

- Header and filter strip render immediately
- First visible month section renders immediately with session rows
- No skeleton, no loading indicator for cached data
- Athletes navigating back into W-18 see their data instantly

### 12.2 Initial Load (No Cache / First Load)

If no cached data exists (brand new account, cleared cache, or first sync):

```
[←]    Activity History

[All] [Strength] [Run] ...

JUNE 2026
──────────────────────────────────

[skeleton row, 72pt]
[skeleton row, 72pt]
[skeleton row, 72pt]

MAY 2026
──────────────────────────────────

[skeleton row, 72pt]
[skeleton row, 72pt]
```

- Skeleton rows: shimmer animation, 72pt height, placeholder content areas for icon / name / date / stat / chapter
- Month headers visible immediately (placeholder text, not shimmer)
- Suppress skeleton entirely if data arrives within ~100ms (avoid flash)
- Reduce Motion: static muted placeholder rows, no shimmer

### 12.3 Batch Load (Infinite Scroll)

When the athlete scrolls near the bottom of the loaded content:

- A subtle spinner appears at the very bottom of the scroll content area
- The next batch of 20 sessions loads
- When loaded: spinner disappears, new rows animate in below existing rows (Reduce Motion: instant insertion, no animation)
- If the batch crosses a month boundary: the new month header appears before the new rows

### 12.4 End of History

When all sessions have been loaded:

- No spinner
- No "You've reached the beginning of your history" message
- No visual marker
- The list simply ends at the oldest session

The last month's last session is followed by empty space (bottom content padding). No end-of-list marker is needed — the absence of a load spinner signals to the athlete that scrolling further won't load more.

---

## 13. Offline Behavior

### 13.1 Reading History Offline

W-18 reads from locally cached session data. All sessions previously synced to the device are viewable offline.

No "offline mode" banner or indicator on W-18 unless there are pending-sync sessions not yet reflected in the history.

### 13.2 Pending-Sync Sessions

If the athlete completed a workout while offline (sessions queued for sync to server), those sessions are available locally and appear in W-18 immediately from local storage. No distinction is drawn — pending-sync sessions appear identically to synced sessions.

When connectivity returns and sync completes, no visual change to W-18 (the sessions were already visible). No notification, no re-sort.

### 13.3 No Actions Offline

W-18 is read-only. There are no offline-blocked actions. The athlete can browse history, tap rows to W-19, and apply filters without connectivity.

### 13.4 Stale Cache Warning

No stale cache warning in W-18. History is immutable — once written, sessions do not change. The cached data is authoritative.

---

## 14. Accessibility

### 14.1 Touch Targets

| Element | Minimum |
|---------|---------|
| Back button | 44pt |
| Filter chip | 44pt height (chip is 32pt visual; 44pt touch target with inset) |
| Session row | Full width × minimum 72pt height |
| Trailing chevron › | Not independently tappable — row is the target |

### 14.2 Screen Reader Labels

| Element | Accessible Label |
|---------|----------------|
| Back button | "Back to Workouts" |
| Filter chip "All" | "Show all activity types" |
| Filter chip (type) | "Filter by [Activity Type]. [Selected / Not selected]" |
| Session row | "[Workout Name]. [Activity Type]. [Date]. [Duration]. [Key stat]. [Chapter name if present]. [Partial if applicable]. Double-tap to view session detail." |

The full session row is announced as a single accessibility element. Individual text labels within the row do not have separate focus targets.

### 14.3 Focus Order

1. Back button
2. Filter chip strip (left to right: All, Strength, Run, Walk, Bike, Swim, HIIT, Mobility, Yoga, Other)
3. For each session row (top to bottom in the list)

### 14.4 Reduce Motion

- No skeleton shimmer — static muted placeholder rows
- No row insertion animation when batch loads
- No filter transition animation — list updates instantly on filter tap

### 14.5 Dynamic Type

Session row text scales with system text size. At large sizes, the name + date may wrap to two lines. Row height expands to accommodate. Key stat and chapter lines wrap if needed. Minimum row height is 72pt; no maximum.

At extra-large Dynamic Type sizes: the date may drop below the workout name (stacked layout) instead of remaining trailing-right.

### 14.6 Sticky Headers and VoiceOver

When VoiceOver is active, month section headers are announced as they become the current section context. The athlete hears "[Month Year] — section" when navigating into a new month group.

---

## 15. Navigation Specification

### 15.1 Navigation Matrix

| Current State | Action | Result |
|---------------|--------|--------|
| W-18 | Back button | W-1 restored at prior scroll position |
| W-18 | Session row tap | W-19 opens (push navigation) |
| W-18 | Filter chip tap | List filters in place; scroll position resets to top |
| W-18 | Scroll to bottom | Next batch loads silently |
| W-19 | Back | W-18 restored at prior scroll position |

### 15.2 Header

| Header Left | Header Title | Header Right |
|-------------|-------------|-------------|
| ← (back arrow) | "Activity History" | — (none) |

### 15.3 Tab Bar

Bottom tab bar remains visible. W-18 is push navigation within the Workouts tab — it does not suppress the tab bar.

### 15.4 Scroll Position Preservation

When the athlete navigates from W-18 to W-19 and then returns (back button from W-19), W-18 restores to the exact scroll position the athlete was at before tapping the row. The previously tapped row remains visually selected briefly (platform deselect animation), then deselects.

### 15.5 Filter State on Back Navigation

If the athlete filters W-18 to "Run," taps a session into W-19, and returns via back — the "Run" filter remains active. Filter state is preserved within the W-18 navigation session (not across separate W-18 entries).

---

## 16. Non-Behaviors

W-18 does not and will never:

| Non-Behavior |
|-------------|
| Allow editing session data — W-18 is strictly read-only |
| Allow deleting sessions — training records are permanent; History Cannot Be Rewritten |
| Display trend analytics, volume summaries, or PR indicators |
| Display motivational copy, coaching insights, or training recommendations |
| Show a "streak" counter, week summary bar, or calendar heat map |
| Display program attribution in session rows — program context is W-19 |
| Make the chapter attribution text independently tappable within the row |
| Show total session count for a month in the section header |
| Show empty month sections for months with no training activity |
| Label imported sessions differently from natively logged sessions |
| Label unchaptered sessions with "[No Chapter]" or any placeholder — the chapter line is simply absent |
| Allow multi-select of activity type filters in MVP (V1.1) |
| Allow search by workout name in MVP (V1.1) |
| Show chapter-scoped filtered views (V1.1 — chapter filters belong to a separate entry point context) |
| Show a "You've reached the beginning of your history" end-of-list message |
| Show "Today" for current-day sessions — dates are always absolute (consistent with historical surface purpose) |
| Auto-navigate to W-19 for any session — all W-19 navigation is athlete-initiated by row tap |
| Reset filter state when the athlete returns from W-19 — filter is preserved within the W-18 navigation session |
| Surface the "Partial" indicator with any visual alarm — partial sessions are factual records, not errors |
| Display a "No Activity" row for training gaps — missing months are simply absent |
| Provide a "Jump to date" or calendar navigation control in MVP (V1.1) |

---

## 17. Performance Requirements

### 17.1 Initial Render

- **Cached data:** Session list renders within 150ms of W-18 entry. Header and filter strip render instantly.
- **First load (no cache):** Skeleton visible within 100ms. First batch of sessions replaces skeleton within 500ms.

### 17.2 Scroll Performance

- 60fps sustained scroll through any list length
- Virtualized rendering: only the visible window of rows plus a modest off-screen buffer is rendered
- Row heights are uniform (72pt minimum) or predictably sized — no dynamic height calculation during scroll for standard rows

### 17.3 Filter Apply Performance

- Filter application to cached data: list re-renders within 100ms
- No loading state for activity type filter if data is fully cached

### 17.4 Batch Load Latency

- Batch load triggers when the athlete is within ~3 screen heights of the bottom
- Target: next batch available before athlete reaches the rendered bottom
- If batch load takes >300ms: spinner appears
- If batch load takes <300ms: no spinner (suppressed to avoid flash)

### 17.5 Large History Sets

W-18 must remain performant for athletes with 5+ years of daily training history (~1,800+ sessions). Virtualization is non-negotiable at this scale. The infinite scroll strategy defined in the decisions section (§ D5) is a performance requirement, not a preference.

---

## 18. Validation Checklist

### Navigation and Presentation
- [ ] W-18 is push navigation within Workouts tab (not modal, not sheet)
- [ ] Tab bar remains visible
- [ ] Back button → W-1 at prior scroll position
- [ ] Session row tap → W-19 (push navigation)
- [ ] W-18 scroll position restored after returning from W-19
- [ ] Filter state preserved when returning from W-19

### Header
- [ ] Title: "Activity History", 17sp, centered
- [ ] Back button: 44pt touch target, routes to W-1
- [ ] No overflow in header (W-18 has no per-screen actions)

### Filter Strip
- [ ] Pinned below header, above session list; does not scroll with list
- [ ] Chips: All / Strength / Run / Walk / Bike / Swim / HIIT / Mobility / Yoga / Other
- [ ] Default: "All" selected
- [ ] Single-select: selecting a type deselects "All"; selecting "All" clears type filter
- [ ] Active chip: filled primary tint; inactive chip: outlined/muted
- [ ] Strip scrolls horizontally; right fade gradient when chips overflow viewport
- [ ] Filter tap: list re-renders immediately, scroll position resets to top
- [ ] Filter state: not preserved across separate W-18 entries (always defaults to "All" on fresh entry)

### Session Rows
- [ ] Full-width row, minimum 72pt height
- [ ] Activity type icon: 24pt, left-aligned, category tint color
- [ ] Workout name: 15sp, primary weight, up to 2 lines; fallback = activity type label
- [ ] Date: 13sp, muted, right-aligned, same line as name, format "Tue, Jun 10"
- [ ] Key stat: 13sp, muted, second line, per-type format (§ 5.3)
- [ ] Duration: 13sp, muted, right-aligned, same line as key stat, format per § 5.5
- [ ] Chapter attribution: 13sp, muted, third line — omitted entirely for unchaptered sessions
- [ ] No "[No Chapter]" placeholder
- [ ] Trailing chevron › visible, not independently tappable
- [ ] Row tap → W-19 with sessionId
- [ ] Separator: 1pt hairline below each row, left-inset to icon right edge

### Month Grouping
- [ ] Most recent month at top; most recent sessions within month at top
- [ ] Section header: uppercase "MONTH YYYY", 12sp, muted, sticky below filter strip when section at top of viewport
- [ ] No session count in section header
- [ ] Months with zero sessions (globally or for active filter) absent — no empty section headers

### Partial Sessions
- [ ] "Partial" chip: 11sp, outlined style, neutral muted color, trailing chapter attribution line
- [ ] Partial sessions included in all filters
- [ ] No visual alarm treatment — factual label only

### Chapter Attribution
- [ ] Chapter name shown as snapshotted (immutable — even if chapter was renamed post-session)
- [ ] Unchaptered sessions: chapter line absent entirely
- [ ] Sessions from archived chapters: chapter name shown normally (routing handled in W-19)
- [ ] Chapter attribution text not independently tappable in W-18

### Program Attribution
- [ ] Program name not shown in W-18 session rows
- [ ] Program info available in W-19

### Activity Type Icons
- [ ] 9 activity type icons (STRENGTH / RUN / WALK / BIKE / SWIM / HIIT / MOBILITY / YOGA / OTHER)
- [ ] 24pt, category tint color, no badge

### Empty States
- [ ] No sessions at all: "Your workout history will appear here as you train." — no CTA
- [ ] No sessions for active filter: "No [Activity Type] sessions yet." — no CTA

### Loading States
- [ ] Cached data: renders within 150ms, no skeleton
- [ ] No cache: skeleton rows at 72pt, shimmer animation, replaces with real data within 500ms
- [ ] Batch load: spinner at bottom of content; appears only if load >300ms; disappears when batch renders
- [ ] End of history: no end-of-list message, no spinner, list simply ends
- [ ] Reduce Motion: static placeholder rows for skeleton, no insertion animation

### Offline Behavior
- [ ] All cached sessions viewable offline
- [ ] Pending-sync (offline-logged) sessions visible from local storage
- [ ] No offline indicator on W-18 (history is read-only; no actions to block)
- [ ] Filters work offline against local cache

### Accessibility
- [ ] All touch targets ≥ 44pt (§ 14.1)
- [ ] Full session row announced as single accessible element with all fields (§ 14.2)
- [ ] Filter chips: accessible labels include selection state (§ 14.2)
- [ ] Focus order: back → filter chips → session rows (§ 14.3)
- [ ] Reduce Motion: no shimmer, no row insertion animation (§ 14.4)
- [ ] Dynamic Type: rows expand to accommodate larger text sizes (§ 14.5)
- [ ] VoiceOver: month section headers announced as section context (§ 14.6)

### Performance
- [ ] 60fps sustained scroll
- [ ] Virtualized rendering — only visible rows + buffer rendered
- [ ] Initial render <150ms (cached), skeleton <100ms (no cache)
- [ ] Filter apply <100ms
- [ ] Batch load trigger: 3 screen heights from bottom
- [ ] Large history sets (1,800+ sessions) remain performant via virtualization

---

## 19. Decisions Record

| Decision | Value |
|----------|-------|
| W18-D1 — Month Grouping: Always expanded, sticky headers | Collapsible sections add interaction cost to hide data the athlete opened W-18 to see. Always-expanded with sticky month headers is the universal pattern for activity history surfaces (Apple Health, Garmin, Strava). Sticky headers give location context; collapsible sections give none. |
| W18-D2 — No search (MVP) | Early MVP datasets are small. Month grouping + activity type filter covers realistic browsing. Search implementation adds complexity for a use case not yet critical. V1.1 when history depth warrants it. |
| W18-D3 — Activity type filter only | "Show me all my runs" is a recurring, high-value use case W-18 uniquely serves. Chapter-filtered views are served by L-3/L-4 — athletes wanting chapter-scoped sessions have a better surface for that. Activity type is the orthogonal cut W-18 owns. Multi-select deferred to V1.1. |
| W18-D4 — Partial sessions show "Partial" indicator | Consistent with W-17 treatment. Athletes deserve to distinguish a cut-short session from a completed one in their history. The indicator is neutral / factual — no alarm color, no stigma. A partial session is valid training history. |
| W18-D5 — Virtualized infinite scroll | Large histories (1,800+ sessions for 5+ years of daily training) cannot be rendered in full. Pagination breaks the mental model of a timeline. Virtualized infinite scroll is the correct pattern: smooth continuous list, renders only visible rows, loads silently in batches. Initial batch: 40 sessions. Subsequent batches: 20 sessions. |
| W18-D6 — No chapter attribution tap in row | Tappable inline text within a tappable row creates hit-target ambiguity. W-18 rows are single-target: row → W-19. Chapter navigation is available from W-19 with a clear, unambiguous affordance. |
| W18-D7 — Unchaptered sessions: chapter line absent | "[No Chapter]" is a placeholder that names the absence of something. Omitting the line entirely is cleaner and less distracting. The athlete scanning history is not confused by a 2-line row — they simply see a session with no chapter association. |
| W18-D8 — Program attribution omitted from rows | Row already carries three content lines. Program name adds a fourth without proportionate scanning value. Workout name (often the program slot name, e.g., "Push A") already implies program context to the athlete. Full program attribution in W-19. |
| W18-D9 — No end-of-list message | An end-of-list message ("You've reached the beginning of your history") is unnecessary noise. The absence of a load spinner and the end of scroll content is a self-evident signal. No message needed. |
| W18-D10 — No "Today" label — absolute dates only | W-18 is a history surface. Absolute dates ("Tue, Jun 10") are more useful than relative labels ("Today") for historical reference. "Today" is appropriate on W-1 where recency is the point; on W-18 where history is the point, absolute dates are better. |
| W18-D11 — Filter state: not preserved across entries | Athletes enter W-18 to browse their full history by default. A previously set filter from a prior session could cause confusion ("why am I only seeing runs?"). Each W-18 entry defaults to "All." Filter state is preserved only within a single W-18 navigation session (including W-18 → W-19 → back). |
| W18-D12 — No session count in month header | Counts add visual noise without clear browsing value. The athlete is looking for sessions, not counting them. Adding a count would invite comparison ("only 8 sessions in May") that W-18 should not be doing — that is analytics territory. |
| W18-D13 — Imported sessions: no badge | A session is a session. Its origin is not relevant to a history surface. The athlete knows they imported; labeling imports differently in W-18 would create a two-tier history that undermines the "Everything counts equally" principle. Origin metadata is available in W-19. |
| W18-D14 — Read-only, no deletion | Training records are permanent. This is a core product principle. Session deletion would violate "History Cannot Be Rewritten" and could corrupt chapter attribution, program completion records, honor conditions, and the timeline. W-18 is never a destructive surface. |
| W18-D15 — No analytics in W-18 | W-18 is a history log, not a performance dashboard. PR indicators, total volume, week-over-week trends — all post-MVP. Adding a single analytics element sets a precedent that can expand without bound. The emotional target is "Here is everything I've done," not "Here is how I'm doing." |

---

## 20. Downstream Dependencies

### 20.1 W-19 Activity Detail (Required)

W-18 is incomplete without W-19. Every session row taps to W-19, which provides the full session detail. W-19 must be specced and locked as the next workstream item.

W-18 passes `sessionId` to W-19. W-19 owns all session detail rendering including:
- Full exercise list (STRENGTH sessions)
- Route / distance breakdown (cardio sessions)
- Program attribution and slot name
- Chapter attribution with navigation link (L-3 or L-4 depending on chapter state)
- Session notes
- WwF partner attribution
- Import origin indicator (if applicable)

### 20.2 W-1 Amendment Required (W1-A1)

W-1 v1.1 defines a "Recent Workouts" section that shows 2–3 recent sessions. A "View All" link from that section opens W-18. The exact visual treatment of the "View All" link in W-1 is defined in the W-1 spec. No functional change to W-1 is required — the link already exists in principle. The W-1 amendment (W1-A1) only needs to confirm the link target is W-18 and the navigation is push (not modal).

This is a trivial amendment — one route assignment — not a structural W-1 change.

---

## 21. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Complete activity history log. Reverse chronological, month-grouped with sticky headers. Activity type filter strip (single-select, 9 types + All). Session row: icon, name, date, key stat, duration, chapter attribution, Partial indicator. Unchaptered sessions: chapter line absent. No search (MVP). No program attribution in rows. Virtualized infinite scroll (40 session initial batch, 20 session subsequent batches). No analytics, no coaching, no deletion. 15 decisions (W18-D1 through W18-D15). Downstream: W-19 required, W-1 trivial amendment (W1-A1). |

---

*W-18 Activity History — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
