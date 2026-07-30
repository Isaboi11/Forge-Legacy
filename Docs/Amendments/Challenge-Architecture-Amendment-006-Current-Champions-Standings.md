# Challenge Architecture — Amendment 006: Current Champions shows standings

**Status:** LOCKED · 2026-07-29
**Amends:** `Current-Champions-Wireframe-Spec-C7.md` — §7 (data sources), §9 (Firewall & anti-shame), §12 (validation)
**Ruling:** PD-7 — the design is the north star; where a locked doc and the design conflict, the design governs and the doc is corrected.
**Decided by:** product owner, 2026-07-29
**Shipped in:** migration 0071

---

## 1 · The conflict

`Current-Champions-Wireframe-Spec-C7` bars scores from C-7, three times:

- §7 — "No score read (recognition only)."
- §9 — "Recognition only (name + category + challenge) — **no scores, no ranks, no leaderboard** rendered
  here (those stay on C-3/C-4)."
- §12 — "Recognition only — no scores/ranks/leaderboard on C-7."

`Forge Current Champions.dc.html` does the opposite. Every tile prints the champion's value and unit, and
tapping a tile opens a bottom sheet containing the full field for that title — names, values, and rank
numbers, with a crown on first place and a bronze-tint override on the viewer's own row.

C-7 was **first built to the spec** — tiles carrying title, holder, crowning challenge and date, routing
to C-4 for the numbers — and the conflict was raised rather than resolved silently. The product owner
ruled for the design.

---

## 2 · CA6-D1 — C-7 renders the winning score and the full standings per title

The spec's recognition-only restriction is **struck**. C-7 renders:

- the winning score + unit on the featured card and on every tile
- the field size ("5 in")
- a per-title standings sheet: every finisher with place, score, tie marking, crown on first, and the
  viewer's own row highlighted

Tiles open the sheet. The sheet carries a "See Full Result" action into C-4, so the frozen result detail
is still one step away rather than replaced.

---

## 3 · Why this is a placement decision, not an anti-shame one

The distinction matters for what this amendment does and does not touch.

**No new data is disclosed.** Every number C-7 now shows is already readable by the same viewer on C-3
(live standings) and C-4 (frozen results), behind the same `can_read_challenge` roster gate. A squad
member could always reach all of it in two taps. This amendment changes **where** they see it, not **who**
may see it. No athlete gains access to anything, and the Firewall's roster-scoping (CS-D22) is unweakened:
C-7 remains a Challenge surface, squad-scoped, and none of this is echoed to S-1 cards, the S-2 member
list, the Limited Profile or check-ins.

**CC-D3 is untouched.** The anti-shame floor was never the line being amended, and it still holds on this
screen: places are stated as places, no row is labelled last, there is no deficit framing, and there is no
"former champion dethroned" copy. What moved was §9's *placement* rule about which surface may host
standings — a layout constraint, not an anti-shame one.

**What was given up, honestly.** The spec's reasoning was that a permanent, browsable recognition surface
that also ranks everybody stops being recognition and becomes a standing comparison table. That concern is
real and is not refuted here; it is outweighed by PD-7 and by the fact that the same comparison is already
available two taps away. It is recorded so a future reader knows the trade was made deliberately.

---

## 4 · What this does NOT extend to

This amendment is scoped to C-7 alone. Two other spec-over-design calls made in the same build stand
unchanged **unless separately ruled on**:

- **C-4 §6.3 — "Longest Streak"** is not rendered. §6.3 bars a squad-surface streak *comparison*
  outright, and separately nothing in this app tracks streaks, so the card had no data source either way.
- **C-5 §6 — runner-up names** are not rendered in the Hall of Champions; it shows "N athletes competed"
  instead. That surface is a scrolling history, where the concern in §3 above applies with more force than
  it does to C-7's fixed set of title tiles.

Both remain open to the same PD-7 ruling if the product owner wants the design's version there too.

---

## 5 · Documents needing edits

- [ ] `Current-Champions-Wireframe-Spec-C7.md` — strike the recognition-only language in §7 / §9 / §12 and
      point to this amendment; add the standings sheet to the §3 scroll order and §5 interaction list
- [ ] `Challenge-System-Architecture-v1.0.md` CS-D20 — note that C-7 carries standings

---

## 6 · Validation

- [x] Winning score + unit on featured card and tiles
- [x] Standings sheet per title: place, score, tie marking, crown on first, own-row highlight
- [x] Sheet reads frozen `challenge_results`, never `challenge_score` — a title's standings cannot drift
      after the season closed (CS-D14/D17)
- [x] Co-champions share a title (CS-D15)
- [x] Cancelled seasons still absent
- [x] Departed champions still retained until superseded
- [x] Squad-scoped membership gate unchanged; nothing echoed to always-on squad surfaces (SA2-D1)
- [x] No row labelled last; no deficit framing; no dethroned copy (CC-D3)

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-29 | Initial. CA6-D1 — C-7 renders the winning score and per-title standings, striking the spec's recognition-only restriction under PD-7. Scoped to C-7; C-4 §6.3 and C-5 §6 unchanged. |
