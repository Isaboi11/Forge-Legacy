# W-18 Amendment 001 — Month Calendar on Activity History

**Status:** LOCKED · 2026-10-01 · PO-approved (design `Activity History Calendar.dc.html`, variant **1a "Dot under the date"**)
**Amends:** `Docs/Activity-History-Wireframe-Spec-W18.md` §6 (Month Grouping, incl. §6.2 sticky headers, §6.3 no counts, §6.4 empty months omitted); `Docs/Calendar-System-Architecture-v1.0.md` header note that "W-18 remains the linear list of completed sessions."
**Scope:** `src/app/activity-history.tsx`, `src/components/workout/ActivityCalendar.tsx`, `src/domain/activity/calendar-core.ts`. The standalone Calendar surface (Month/Week/Day views, scheduling, program projection) is **unchanged and still unbuilt**.

## Why

PO, 2026-10-01: *"build the calendar. We are doing 1a."* The brief put a one-month calendar at the top of Activity History, with the list below showing that month's sessions.

## What changes on W-18

| Was (W-18 LOCKED) | Now |
|---|---|
| One list of every session, grouped by month under sticky headers (§6, §6.2) | A month calendar heads the list and scrolls with it. The list shows **only the month on show**, newest first, with no month headers |
| Months with no sessions never appear (§6.4) | Every month from the first session to this one can be reached. An empty month shows the grid and "No sessions this month." |
| No session counts (§6.3) | One summary line under the grid: "14 sessions · 3 new records · 11 h". This month only, never compared with another |
| — | Weeks start Monday. One dot per session (max 3): solid bronze = lifting, bronze ring = cardio, grey = mobility/other. Record day = bronze ring round the date. Today = raised disc. Chapter began/sealed = corner diamond (All filter only) |
| — | Arrows or a sideways swipe change month: back to the first session, never forward past this month. Tapping a trained day narrows the list to it; tap again or "Show all" clears. A chapter day puts that chapter's row at the top of the list, linking to Chapter Detail |
| Type chips filter the list | They filter the calendar too. Changing the filter or month clears the selected day |

## What does not change (binding)

- **An empty day is empty:** no mark, no red, no cross, no "missed", and it can't be tapped. There is no streak counter and no "X days since". (DNA §10; CC-D3; Calendar §19 / CAL-D19.)
- Rows, row content, and the tap into Activity Detail (W-19) are as before.
- States: a brand-new account shows "Your first session will show up here." Loading shows static blocks in the shape of the grid and rows. A failed read keeps the grid outline and offers "Try again". A failed read is never shown as an empty history.

## Known limit

The history read is capped at 200 sessions (`ACTIVITY_HISTORY_LIMIT`). When a read comes back full, the oldest month in it may be only partly loaded, so the arrows stop one month later rather than show an under-counted month. Reaching older months needs a per-month read, which is not built yet.
