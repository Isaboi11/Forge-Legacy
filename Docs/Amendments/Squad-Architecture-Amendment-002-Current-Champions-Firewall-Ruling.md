# Forge Legacy — Squad Architecture Amendment 002
## Current Champions on Always-On Squad Surfaces — Firewall Ruling
### June 2026

**Status:** LOCKED — **SUPERSEDED for Squad-internal surfaces (S-1, S-2) by `Squad-System-Architecture-v1.0.md` SQ-D2** (June 2026). SA2-D1 (no inline champion recognition on always-on squad surfaces) and SA2-D2 (neutral-entry-affordance-only) no longer hold on a squad's own page — that squad's Competitions section now displays its own challenge standings and champion recognition inline. **SA2-D3 (the self-owned-vs-relative distinction) is unaffected and reinforced** — it still governs the Friends Feed and Communities exactly as the reconciliation note below describes, and remains the test for any future feature outside Squad-internal surfaces.

**Type:** Architecture Amendment (resolves the one open ruling left by SA-D2 / C-7 §11 item C. Clarifies an existing boundary; introduces **no** new feature.)

**Target documents:** `Squad-Architecture-Amendment-001-Challenge-Surfaces.md` (clarifies SA-D2), `Current-Champions-Wireframe-Spec-C7.md` (closes §11 item C), `Comparison-Philosophy-Amendment-001.md` (reinforces CC-D2), `Challenge-System-Architecture-v1.1.md` (CS-D20/D22 reference).

**Authority:** `Comparison-Philosophy-Amendment-001` — CC-D1 (opt-in outcome visibility), CC-D2 (Firewall; "scores, standings, ranks, win/loss, **badges**" are protected), CC-D3 (anti-shame); `Squad-Architecture-Amendment-001` — SA-D2 (the ambiguous "Current Champions surface at squad level"); `Challenge-System-Architecture-v1.1` — CS-D16/D20 (Defending Champion / Current Champions), CS-D22 (Firewall correctness test); S-1 §10 and S-2 §6/§10 (presence-vs-performance line); S-2 §5.5 (Limited Athlete Profile hidden fields).

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Purpose

SA-D2 permitted "a Current Champions surface" at the squad level but did not settle whether **champion recognition** — champion name + challenge category + champion badge/icon, with **no** scores, ranks, records, history, or metrics — may appear **inline on the always-on Squad surfaces themselves** (S-1 squad cards, S-2 member list/header, the Limited Athlete Profile, check-ins). C-7 §11 flagged this as an open Firewall ruling. This amendment resolves it.

The question is precise: is a champion title *recognition* (permitted, like the rank name and accomplishments S-2 already shows) or *challenge performance data* (barred from always-on surfaces by CC-D2)?

---

## Decision SA2-D1 — Champion recognition is challenge-derived comparison data; it is NOT permitted inline on always-on Squad surfaces

### Statement

**Locked (ruling):** Champion recognition — champion **name + category + badge/icon**, even with no scores/ranks/records/history/metrics — is **challenge-derived win/comparison data** and **may not be displayed inline** on any always-on Squad surface: S-1 squad cards, the S-2 member list, the S-2 squad header, the Limited Athlete Profile modal, or WSR check-in cards.

### Rationale (why this is not mere recognition)

1. **CC-D2 already names it.** The Firewall's protected set is explicitly "scores, standings, ranks, **win/loss, badges**." A "Current Champion" is a **win** signal and a **badge** by definition. CS-D22's correctness test — *"impossible for any always-on squad surface to render challenge performance data"* — is failed the moment a champion badge appears on a member row.

2. **A champion title is relative by construction.** Stripping the score does not strip the comparison. "Volume Champion" *means* "beat these specific squadmates." It has no meaning except in relation to the others in the squad. Displaying it inline turns the always-on member list into a standing ranking of who holds crowns — exactly what S-1/S-2 forbid: *"must never become a leaderboard where members are compared."* The number was never the comparison; the **title** is.

3. **It breaches opt-in outcome visibility (CC-D1).** Competition outcomes are meant to be visible only to those who entered the consenting context. A champion badge on the always-on surface exposes the outcome **involuntarily** to non-participants — including the squadmate who never opted in, and the one who finished last — every time they open their squad. That recurring, unchosen reminder is precisely the relational shame CC-D3 protects against.

4. **The rank/accomplishment analogy fails on the load-bearing axis.** S-2's Limited Profile shows rank **name** and accomplishments because those are **self-owned and non-relative** — rank is the athlete's own legacy depth; accomplishments are self-declared life achievements. Neither encodes "I beat you." A champion title is **intrinsically relative to the squad**. That difference — self-owned vs. won-against-peers — is the line between permitted identity and barred comparison. (Consistently, S-2 §5.5.5 already hides Honors, and challenge honors are hidden there too.)

### Scope of the bar

No champion name, category, badge, crown, or "defending champion" marker may render on: S-1 cards, S-2 member rows, S-2 header, the Limited Athlete Profile, or check-in cards. This holds for the athlete's own row as well — there is no "you're the champion" inline treatment on always-on surfaces.

---

## Decision SA2-D2 — A neutral, person-agnostic entry point IS permitted

### Statement

**Locked:** S-1 and S-2 may host a **neutral entry affordance** into the Challenge context (e.g., a "Challenges ›" or "Champions ›" row/button) that **names no member and shows no outcome**. Champion recognition itself lives only on the C-series Challenge surfaces (C-1 / C-7), reached *through* that affordance.

### Rules

1. The affordance is a navigation element only — no member name, no category-holder, no badge, no count. "Champions ›" that opens C-7 is permitted; "Maya — Volume Champion" inline is not.
2. This is consistent with SA-D2's own rule 3, now clarified: a "Current Champions surface at the squad level" means **a Challenge surface reachable from** S-1/S-2 — never recognition rendered **on** the always-on card/list/profile.
3. C-7 (and C-1's Current Champions preview) are unaffected — they are Challenge surfaces and already display champion recognition legitimately.

---

## Decision SA2-D3 — The governing distinction (codified for future features)

**Locked principle:** On always-on Squad surfaces, **self-owned, non-relative** identity (rank name, accomplishments, presence) is permitted; **relative, peer-comparative** status (champion titles, standings, win markers, badges) is not — regardless of whether numbers are attached. Future recognition features are tested against this line, not against "does it show a score."

---

## Affected References

| Document | Change | Status |
|---|---|---|
| `Squad-Architecture-Amendment-001` SA-D2 | Clarified: "Current Champions surface at squad level" = a Challenge surface reachable from S-1/S-2; no inline champion recognition on always-on surfaces | Reference (carried by this amendment) |
| `Current-Champions-Wireframe-Spec-C7.md` §10/§11 item C | Open ruling C **RESOLVED** — inline recognition not permitted; neutral entry point permitted | **Applied this session** |
| `Comparison-Philosophy-Amendment-001` CC-D2 / `Challenge-System-Architecture` CS-D22 | Reinforced — champion recognition is within the protected set; no text change required | Reference |
| S-1 / S-2 (locked specs) | If a challenge/champions entry point is added, it is a neutral affordance only (SA2-D2); inline champion recognition prohibited | Pending (with the existing SA-D2 entry-point edit) |

---

## Downstream Impacts

1. **C-7 reaches full lock** — its last open item (§11 C) is resolved.
2. The **Pending S-1/S-2 entry-point edit** (already tracked under SA-D2) now carries the SA2-D2 constraint: neutral affordance only.
3. No change to C-1's Current Champions preview (a Challenge surface) or to any C-series screen.
4. No impact to Honors, Rank, Notifications, or scoring.

---

## Non-Behaviors

- No new feature, entity, screen, or metric.
- No change to where champion recognition legitimately lives (C-1 / C-7).
- No relaxation of CC-D2; this ruling **reinforces** it.

> **Reconciliation note — Challenge-Architecture-Amendment-003 v1.1 (participant-based challenges):** This ruling is **unaffected and further reinforced**. SA2-D1/D2/D3 govern what may appear on **always-on Squad surfaces**. **Friend Challenges (`context = FRIENDS`) have no always-on surface at all** (CA3-D6/D8) — no squad card, member row, header, Limited Profile, or check-in — so they create no new exposure path for champion recognition. SA2-D1's bar on inline champion recognition and SA2-D2's neutral-entry-point rule apply only to **SQUAD-context** champion data (the only kind that exists, since Current Champions is SQUAD-context only, CA3-D8). The self-owned-vs-relative distinction (SA2-D3) stands for all future features.

> **Reconciliation note — Social-System-Architecture-v1.0 (LOCKED, June 2026; governing social authority).** SA2-D3's self-owned-vs-relative distinction is explicitly adopted by the Social System and **extends to the new always-on identity surfaces it introduces — the Social Profile, Posts, and the Friends Feed.** On those surfaces: **self-owned, non-relative** identity (rank **name**, accomplishments, presence — shown per the owner's public/private settings) is permitted; **relative, peer-comparative** challenge data (champion titles, standings, win/loss, badges) is **barred** — exactly as on always-on Squad surfaces. **Challenge standings/champion recognition never appear in the Friends Feed or on a profile** (SOC-D16; CA3-D6 reconciliation note). The Privacy Firewall (CC-D2) is **completely unchanged**; the Social System adds no exposure path. This note reinforces the existing ruling; it changes nothing.

---

## Validation Checklist

- [ ] SA2-D1 — no champion name/category/badge on S-1 cards, S-2 member list, S-2 header, Limited Profile, or check-ins (incl. the athlete's own row)
- [ ] SA2-D2 — only a neutral, person-agnostic entry affordance permitted on S-1/S-2 → C-7
- [ ] SA2-D3 — self-owned/non-relative permitted; relative/peer-comparative barred, score or no score
- [ ] C-7 §11 item C marked resolved; status caveat lifted
- [ ] Firewall correctness test still holds for all always-on surfaces
- [ ] No other feature change

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.2 | June 2026 | **Superseded** for Squad-internal surfaces by `Squad-System-Architecture-v1.0.md` SQ-D2: SA2-D1/D2 no longer bar inline champion recognition on a squad's own S-1/S-2. SA2-D3 unaffected and reinforced, including its extension to the Friends Feed/Communities below. Banner and changelog only. |
| 1.1 | June 2026 | Reconciliation pass for `Social-System-Architecture-v1.0`. Added a reconciliation note extending SA2-D3's self-owned-vs-relative distinction to the new social always-on identity surfaces (Profile, Posts, Friends Feed): self-owned identity permitted, relative challenge data (champion titles/standings/badges) barred; challenge standings never appear in the Friends Feed or on a profile (SOC-D16). Firewall unchanged; reinforcement only, no decision changed. |
| 1.0 | June 2026 | Initial. Resolves the SA-D2 / C-7 §11-C open ruling: champion recognition (name/category/badge) is challenge-derived win/comparison data and is **not permitted inline** on always-on Squad surfaces (SA2-D1); only a neutral, person-agnostic entry point into C-7 is permitted (SA2-D2); codifies the self-owned-vs-relative distinction (SA2-D3). Reinforces CC-D2; clarifies SA-D2; closes C-7. No other feature change. |

---

*Forge Legacy — Squad Architecture Amendment 002 (Current Champions on Always-On Squad Surfaces — Firewall Ruling)*
*v1.1 — June 2026*
*Authority: Comparison-Philosophy-Amendment-001 (CC-D1/D2/D3), Squad-Architecture-Amendment-001 (SA-D2), Challenge-System-Architecture-v1.1 (CS-D20/D22), Social-System-Architecture-v1.0 (SOC-D16, reconciliation)*
*Status: LOCKED*
