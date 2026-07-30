# Challenge Architecture — Amendment 007: Runners-up on C-5, Longest Streak on C-4

**Status:** LOCKED · 2026-07-29
**Amends:** `Hall-of-Champions-Wireframe-Spec-C5.md` §6 / §12 · `Challenge-Results-Wireframe-Spec-C4.md` §6.3 / §12
**Ruling:** PD-7 — the design is the north star; where a locked doc and the design conflict, the design governs and the doc is corrected.
**Decided by:** product owner, 2026-07-29 (following Amendment 006, same ruling applied to the two calls it explicitly left open)
**Shipped in:** migration 0072

---

## 1 · CA7-D1 — C-5 names the runners-up

**The spec said:** §6 — "Only winners are named. No 'runner-up,' no per-challenge loser, no 'X never won'
(CC-D3)." Repeated in §12 as a validation item.

**The design does:** each Hall card ends with a "subtle podium" strip naming 2nd and 3rd, with a ringed
place badge in steel and copper and a "YOU" mark on the viewer's own row.

C-5 shipped the spec's version — a "5 athletes competed" line in place of the strip — and the conflict was
raised. The product owner ruled for the design. The strip is restored.

**Bounded at the top three.** `runners` returns place 2 and 3 only, so the strip names who was close rather
than enumerating the field. No card ever displays a last place, which is the part of CC-D3 that was doing
real work here. Places are places; there is no deficit framing and no "never won" copy anywhere on the
screen.

**What the spec's reasoning was, recorded rather than deleted:** a hall is scrolled, and a list of every
season that keeps naming who came second reads as a record of who kept losing. That concern is not refuted
— it is outweighed by PD-7. A future reader should know the trade was made on purpose.

---

## 2 · CA7-D2 — C-4 shows Longest Streak

**The spec said:** §6.3 — "The challenge's completion does not itself display streaks here; participation
streaks are personal stats feeding honors. **No squad-surface streak comparison (Firewall).**"

**The design does:** Longest Streak is the third of three Season Moments, naming an athlete and a
consecutive-day count.

Ruled for the design. The card is restored as a derived badge alongside Most Consistent and Biggest Climb.

### A correction to an earlier claim

Squad Records (0058) left Longest Streak out on the grounds that *"nothing tracks streaks: no table, no
definition of what breaks one"*, and that reasoning was carried into C-4 and stated again when this
amendment was proposed. **It was overstated.** The distinction that matters:

- A **squad record** needs an all-time streak with a definition stable across an athlete's entire history.
  That genuinely does not exist, and CS-D19's record book still omits it.
- A **challenge** streak is bounded by the season, and inside a fixed window it is fully determined.

The definition now in force for C-4:

> A day counts when the athlete saved at least one workout on it, in the challenge's own timezone
> (`challenges.tz`). A streak is a maximal run of consecutive counting days. A day with no session ends
> the run.

Computed by gaps-and-islands over `workouts` — date minus a per-athlete row number is constant across
consecutive days, so grouping on it counts each unbroken run. No table, no stored state, and because the
window is closed the value cannot drift.

**Streaks of 1 are not reported.** A single session is not a streak, and "Longest Streak: 1 day" on a
finished season would be worse than showing nothing.

---

## 3 · What is NOT weakened

- **The Firewall's roster-scoping (CS-D22)** — both surfaces remain Challenge surfaces, squad-scoped, and
  none of this is echoed to S-1 cards, the S-2 member list, the Limited Profile or check-ins. SA2-D1 still
  bars champion recognition from always-on squad surfaces.
- **CC-D3's anti-shame floor** — no row is labelled last, no deficit is framed, no athlete is annotated for
  absence, and a cancelled season still never appears anywhere.
- **CS-D14 / CS-D17 immutability** — both reads come from frozen `challenge_results`; C-4 still never
  recomputes.
- **CS-D15 co-winners** — unchanged on both surfaces.

What moved in each case was a *placement* rule — which surface may show which comparison — not a rule
about dignity.

---

## 4 · Documents needing edits

- [ ] `Hall-of-Champions-Wireframe-Spec-C5.md` — strike the winners-only language in §6 and §12; add the
      podium strip to §3's card anatomy
- [ ] `Challenge-Results-Wireframe-Spec-C4.md` — strike §6.3's streak bar and its §12 validation row; add
      the streak definition above
- [ ] `Squad-Records-Wireframe-Spec-C6` / CS-D19 — note that the all-time streak record remains out of
      scope for a *different* reason than C-4's (no stable cross-history definition), so the two decisions
      are not in conflict

---

## 5 · Validation

- [x] C-5 names 2nd and 3rd; never a 4th or a last
- [x] C-5 marks the viewer's own row in the strip
- [x] C-4 renders all three Season Moments when earned; each is absent when unearned
- [x] Streak definition is timezone-correct and bounded by the season window
- [x] Streaks of 1 suppressed
- [x] Both reads use frozen results; neither recomputes
- [x] Nothing echoed to always-on squad surfaces

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-29 | Initial. CA7-D1 (C-5 names runners-up, top three only), CA7-D2 (C-4 shows Longest Streak, with a season-bounded definition). Corrects the earlier overstatement that challenge streaks were untrackable — that applies to an all-time squad record, not a bounded season. |
