# Weekly Review Amendment 001 — The card retires, and reading it counts

**Amends:** `Docs/Weekly-Review-Design-Brief-v1.0.md` §3 (card states) and §7 rule 6
**Status:** LOCKED · applied in code 2026-08-13
**Raised by:** PO, 2026-08-13 — *"I've clicked preview on it and also I've clicked skip and it keeps
popping up."*

---

## §1 — What was wrong

Three separate things, only one of which was a bug in the usual sense.

**1 · The 24-hour window had never once been enforced.** Migration `0152_weekly_review_created_at.sql`
was authored 2026-08-12 and never applied. `ensure_weekly_review()` therefore does not return
`created_at`, `reviewWindowOpen()` reads null, and null is deliberately treated as OPEN — the safe failure
that stops an unapplied migration from vanishing every athlete's review. The card consequently sat on Home
for the full seven days, exactly the behaviour 0152 was written to end.

**2 · Skip lasted as long as the Home screen stayed mounted.** It was a `useState(false)`, on the reading
recorded in the brief: *"'not now' expiring on the next launch is the honest reading of it."* On the web
preview — which is where the PO tests — "the next launch" is the next page refresh. Combined with (1),
Skip did nothing durable for seven days.

**3 · Reading the review dismissed nothing at all.** `onView` only navigated. The athlete opened their
week, read it, came back to Home, and the card was still there asking to be opened. This is the one that
was simply missing rather than mis-tuned.

---

## §2 — The amendment

### 2.1 · Skip is stored, still per week

> **Superseded:** brief §3, *"**Skipped** | Card disappears for this session only"*, and §5's *"It is held
> in memory, not stored, because 'not now' expiring on the next launch is the honest reading of it."*
>
> **Replaced with:** the dismissal is stored device-locally, keyed to the review's `week_start`.

Everything the original rule was protecting still holds and is now the thing being tested:

- It is **not a preference**. It does not disable the feature and it is not exposed in Settings.
- It is **this week only**. Next Monday's review arrives untouched — the key is `week_start`, so a
  retired week says nothing about any other week.
- It **deletes nothing**. `athlete_weekly_reviews` is a permanent snapshot and `/weekly-review/[week]`
  opens a retired review in full, forever. **Retirement is a property of the CARD, not of the week** —
  the same sentence 0152 turns on.

The original reasoning failed on its own terms: "expiring on the next launch" is only honest if a launch
is a meaningful event to the athlete. A browser refresh is not, and a phone cold-start is not either.

### 2.2 · View retires the card too

> **New rule (brief §7):** **Reading the review retires its card.** Skip and View differ in where they
> send the athlete, not in what they mean about the card.

Leaving the card up after the athlete has read the full screen asks them to dismiss something they have
already acted on — the app failing to notice what it just watched them do.

### 2.3 · Device-local, and cleared on account switch

`src/lib/weekly-review-seen.ts` + `-model.ts`, following `podium-seen.ts` exactly. "Have I read it" is a
fact about this screen on this device, not a fact about the week; nothing is written to Supabase.
`first-run.ts` clears it on account switch, so a second athlete on the same phone is not told they have
already read a week they have never seen.

**⚠ The safe failure points the other way from `reviewWindowOpen`, on purpose.** Unreadable storage reads
as *nothing retired* — the card shows again. An absent `created_at` reads as *window open* — the card
shows again. Both err toward the athlete seeing their week: a review shown twice is an annoyance, a review
silently swallowed is the feature not existing.

---

## §3 — What did not change

- The card's **layout, states, copy, and tokens**. Skip is still bare text beside the primary pill, still
  weaker than View, still visible (brief §7 rule 6's *presentation* half stands in full).
- The **locked state**. Still shown as locked, never hidden.
- The **no-review state**. Still renders nothing. Silence beats zero.
- The **24-hour window**. Still the right rule and still 0152's job; §2 is what happens when the athlete
  acts first, and it works whether or not 0152 is applied.

---

## §4 — Applies to

| | |
|---|---|
| `src/lib/weekly-review-seen-model.ts` | New — pure. Parse, cap, and the retirement predicate |
| `src/lib/weekly-review-seen.ts` | New — the AsyncStorage edge |
| `src/lib/__tests__/weekly-review-seen-model.test.mjs` | New — 9 tests, incl. both safe-failure directions |
| `src/app/(tabs)/index.tsx` | `reviewSkipped` → `reviewRetired`; both reads settle together; `onView` retires |
| `src/components/forge/WeeklyReviewCard.tsx` | Header rewritten to describe this; `onView` contract noted |
| `src/lib/first-run.ts` | Clears retired weeks on account switch |
| `supabase/apply/pending-0152-weekly-review.sql` | New — paste-ready bundle for the unapplied 0152 |

**⚠ `0152` still has to be run by hand** in the Supabase SQL editor. §2 does not replace it: retirement
covers the athlete who *acts* on the card, the window covers the athlete who never touches it.
