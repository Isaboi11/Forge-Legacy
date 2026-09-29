# W-22 Amendment 001 — Exercise Detail Shows Your Own History
## Forge Legacy | Version 1.0 — September 2026

**Amendment ID:** W22-Amendment-001
**Status:** 🔒 LOCKED
**Date:** 2026-09-29
**Authority:** PO 2026-09-29 (B8) — decision on the Full-App QA finding B8 "Your own numbers are hard to reach".
**Amends:** `Exercise-Detail-Wireframe-Spec-W22.md` §19 Non-Behaviors — the rows "Show the athlete's workout
history for this exercise", "Show PR records, personal bests, or performance data" and "Show a 'last used'
date or recency indicator" — and the §19 checklist line "No performance data, PRs, or history".
**Supersedes:** those three §19 rows and that checklist line. Nothing else in W-22 changes.

---

## Section 1 — Why

QA 09-26 (B8; lanes workout-24, firstuser-02, library-15): the exercise page is where a new athlete looks
first for their bench number, and it had none — a dead end. The PO decided on 2026-09-29 that the page
should show the athlete's own history.

## Section 2 — Decisions

**W22-A1-D1 — A "Your history" block.** Placed after the identity block (name, equipment, attribute
tiles), before What It Trains. It shows only the signed-in athlete's own data:
- **Heaviest set** — the heaviest load at any reps in the sessions read (dated). A bodyweight top set reads
  "Most reps · bodyweight". If the read hit its cap, the label says it covers the latest N sessions.
- **PR (1–5 reps)** — the record on file (`personal_records`, heaviest load at 1–5 reps), labelled exactly as
  QA F9 labels it everywhere else, so it never reads against a heavier higher-rep set.
- **Recent sessions** — the last five sessions of this exercise: date, top set, set count.

**W22-A1-D2 — One read.** Everything comes from `src/data/lift-history-live.ts` (`fetchLiftHistory`), the one
lift-history read, matched by catalogue key with the exact name as fallback. Never fuzzy.

**W22-A1-D3 — Honest states.** Loading says so; a failed read says "Couldn't load your history" with Try
again (it must never read as "never done"); an exercise never logged says so in one plain line; nothing
is invented or zero-filled.

**W22-A1-D4 — Still not here.** Everything else in §19 stands: no social or comparative data, no "Trained X
times" aggregate, no "Used In", no suggestions from history. Add-to-workout and a favourite control remain
out of scope for this amendment.
