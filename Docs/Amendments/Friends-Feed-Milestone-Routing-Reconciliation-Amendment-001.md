# Friends Feed — Milestone Routing Reconciliation — Amendment 001

## Amendment to Social System Architecture (SOC-D9 / SOC-D12) — Friends Feed automatic milestone posts

### June 2026

**Status:** LOCKED (product-owner approved, June 2026; all six routing decisions confirmed — no open questions remain).

**Type:** Reconciliation Amendment. Resolves a real architectural gap surfaced by the Friends Feed completeness audit (June 2026): three of the four declared `milestoneType` auto-post types had **no wired emitter**, one (`Chapter completed`) **directly conflicted** with a locked spec (WSR-001 §5.3 / M-5), and there was **no de-duplication rule**, so a single accomplishment could surface as multiple feed cards. This amendment narrows and wires the routing. **It does not redesign Social** — every rule inherits from existing SOC decisions.

**Date:** June 2026

**Amends (operative routing only; base docs not edited here — see §7 ledger):** `Social-System-Architecture-v1.0.md` SOC-D7 (`milestoneType` enum), SOC-D9 (auto-post set), SOC-D12 (Automatically-Share-Milestones).

**Origin:** Friends Feed completeness audit — `milestoneType = { Honor earned, Program completed, Chapter completed, major milestone }` (SOC-D7 §181) declared four auto-post types, but only the **Honor → auto-post** hook was wired (SOC §318; `Honor-Evaluation-Service-Architecture-v1.0` v1.0.1 changelog). `Program completed` and `Chapter completed` had no producer; `Chapter completed` contradicted WSR-001 §5.3 (`CHAPTER_SEALED` deferred as "intentionally private by design") and M-5 (no share CTA); `major milestone` was undefined; and no bundling rule prevented duplicate cards for one event.

**Authority Chain (all LOCKED, none reopened):**
- `Social-System-Architecture-v1.0.md` — SOC-D7 (Post entity / `source` / `milestoneType`), SOC-D9 (Friends Feed; manual + milestone-only auto), SOC-D10 (reverse-chronological; milestone surfacing), SOC-D12 (Automatically-Share-Milestones, default ON), SOC-D13 (separation of progression and social).
- `Honor-Evaluation-Service-Architecture-v1.0.md` v1.0.1 — the Honor → optional auto-post hook (post-commit, read-only consumer, gated by Automatically-Share-Milestones).
- `Honor-Catalog-v1.0-LOCKED.md` — Programs family (`first_program_graduated`, `_5/_10/_25`), Chapters Count family (`first_chapter_sealed`, …), Goals family (`first_goal_achieved`, …), Challenge Wins family.
- `WSR-001-Workout-Share-Result-Architecture.md` — §5.3 (`CHAPTER_SEALED` deferred / private), §7 (nothing shared without explicit action), the manual share-card + squad check-in channel (distinct primitive per SOC-D9 §222).
- `M-4-Program-Graduated-Spec.md`, `M-5-Chapter-Sealing-Confirmation-Spec.md` — ceremony specs (in-app; M-5 exposes no share CTA).
- `FORGE_LEGACY_PRODUCT_DNA.md` — §10 (no rank comparison, no public goal progress, no streak/shame).

**Amendment Log:** v1.0 (June 2026) — Initial, LOCKED. Product owner approved all six routing decisions (FFR-D1..D6, §2): D1 remove `Chapter completed` (private; surfaces only via a Chapters Honor); D2 `Goal completed` only via a Goals Honor; D3 keep `Program completed` and wire its canonical emitter (§3); D4 `Rank up` never in the feed; D5 remove the undefined `major milestone`; D6 one originating event → one combined feed card. Resulting `milestoneType` set = `{ Honor earned, Program completed }`. No open questions. Downstream pointer edits (§7) are deferred to the single repository reconciliation pass; no locked source document edited here.

---

## Section 1 — Purpose & Boundary

This amendment makes the Friends Feed's automatic milestone posting **complete, conflict-free, and duplicate-free**, using the smallest possible change:
1. **Narrow** the `milestoneType` set to only the post types that have a defined, conflict-free producer.
2. **Wire** the one missing emitter that survives the narrowing (`Program completed`).
3. **Add** a one-event → one-feed-card bundling rule.

**Boundary (what this does NOT touch):**
- It does not redesign Social, the Post entity, audiences (SOC-D8/D9), feed ordering (SOC-D10), or engagement (SOC-D11).
- It does not change **WSR-001** (the manual share-card + squad check-in channel remains a distinct primitive per SOC-D9 §222 — see §5). Manual posts (`source = MANUAL`) are unaffected.
- It does not alter any Honor, Program, Chapter, Goal, Rank, or Challenge record or evaluation; **no progression effect** (SOC-D13).

---

## Section 2 — FFR-D1..D6 — The Six Routing Decisions (PO-approved)

**FFR-D1 — Remove `Chapter completed` as a direct Friends Feed event.** Chapter sealing remains **private** (honoring WSR-001 §5.3 and M-5's no-share-CTA design). A chapter completion surfaces in the feed **only** if it earns a Chapters-family Honor (e.g., `first_chapter_sealed`), in which case it routes as an **`Honor earned`** card — never as a standalone "Chapter completed" card. This removes the SOC-vs-WSR-001 conflict by deferring to the intentional-privacy design rather than overriding it.

**FFR-D2 — `Goal completed` does not appear directly in the Friends Feed.** It surfaces **only** through a Goals-family Honor (e.g., `first_goal_achieved`) as an **`Honor earned`** card, when applicable. Consistent with DNA §10 ("no public goal progress"). Plain goal completions that cross no Honor threshold do not post.

**FFR-D3 — Keep `Program completed` as a Friends Feed event, and wire its emitter.** Program graduation **is** a first-class automatic feed card. This amendment defines its canonical emitter and routing (§3).

**FFR-D4 — `Rank up` does not appear in the Friends Feed.** Rank is self-owned, non-relative, and rank comparisons are DNA-prohibited (DNA §10). Rank-up is also **not** an Honor trigger (`Honor-Evaluation-Service` §3.2). It therefore has **no** feed route — by design. (It remains shareable only via the manual WSR-001 `RANK_UP` card — §5.)

**FFR-D5 — Remove the undefined `major milestone` value.** It had no definition, threshold, or emitter. PR and workout-count milestones already reach the feed via Strength/Club/Training **Honors** (`Honor earned` cards), which is the canonical route (WSR-001 §5.3 establishes the same: milestone honors are the PR/workout-count recognition mechanism). No catch-all is needed.

**FFR-D6 — One event → one feed card (bundling).** If a single originating accomplishment produces multiple social-worthy outputs, the feed generates **one combined card**, never duplicate posts (§4).

**Resulting `milestoneType` set (post-amendment):** **`{ Honor earned, Program completed }`** — both wired, neither conflicting. (`Chapter completed` and `major milestone` removed.)

---

## Section 3 — FFR-D3 emitter — `Program completed` routing

Modeled **exactly** on the existing Honor → auto-post hook (SOC §318 / Honor-Eval v1.0.1) so no new pattern is introduced:

- **Originating event:** the **Program Graduation Event** — the same finalized event the Honor pipeline already consumes to run the Program evaluator (`Honor-Evaluation-Service` §3.1: "Session Save + Program Graduation detected" / standalone Program Graduation).
- **Consumer:** Social-System-Architecture is a **post-commit, read-only consumer** of that event. After the graduation (and any honor evaluation) is committed, it creates one Post with `source = MILESTONE_AUTO`, `milestoneType = Program completed`.
- **Gating:** the existing **Automatically-Share-Milestones** setting (SOC-D12, default ON). OFF ⇒ no auto-post; the athlete may still post manually.
- **Audience:** the athlete's configured default post audience (`FRIENDS` / `SQUAD` / `BOTH`), per SOC-D9/§269 — never wider.
- **Ordering:** reverse-chronological with the standard milestone surfacing decay (SOC-D10) — no new ordering behavior.
- **No progression effect:** creating the post never alters the `ProgramInstance`, the graduation, or any honor, and emits no progression signal (SOC-D13).
- **Display name snapshot:** the card snapshots the program name at post time (consistent with AD-52 snapshot philosophy already used across the Legacy layer), so later program renames/deletes don't break the historical card.

This is the only emitter this amendment adds. `Honor earned` remains wired as-is (unchanged).

---

## Section 4 — FFR-D6 bundling — one event → one feed card

**Bundling key = the originating triggering event** (one Session Save, one standalone Program Graduation, one Goal Completion, one Chapter Seal, one Import pass, etc.). All `MILESTONE_AUTO` outputs that derive from **the same originating event** collapse into **one** combined Friends Feed card.

| Originating event | Possible social-worthy outputs | Feed result (one card) |
|---|---|---|
| Session Save earning several Honors | N × `Honor earned` | **One** `Honor earned` card listing the honors (mirrors the M-2 modal's existing honor bundling) |
| Program Graduation that also crosses a Programs-family Honor (e.g., first/5th/10th/25th) | `Program completed` + `Honor earned` | **One** combined card ("Graduated [Program]" + the program honor) — never two cards |
| Chapter Seal that earns a Chapters Honor | `Honor earned` only (Chapter completed removed, FFR-D1) | **One** `Honor earned` card |
| Goal Completion that crosses a Goals Honor | `Honor earned` only (FFR-D2) | **One** `Honor earned` card |

Rules:
- **Within one originating event, never emit more than one feed card.** Multiple qualifying outputs are composed into a single card.
- Bundling governs **automatic feed cards only**. It does not collapse **manual posts** (`source = MANUAL`) and does not touch **WSR-001** manual share cards / squad check-ins (§5) — those are explicit, separate athlete actions on a distinct primitive.
- Bundling is purely presentational composition; it emits no progression signal (SOC-D13) and does not change Honor/Program records.

This mirrors the precedent already set by the M-2 Honor Earned modal, which bundles multiple honors from one session into one ceremony — the feed now applies the same one-event-one-surface principle.

---

## Section 5 — Coexistence with WSR-001 (unchanged; distinct primitive)

WSR-001 remains the **manual, explicit** share channel — squad check-in cards (S-2) and rendered/external share cards — and is **not** the Friends Feed (SOC-D9 §222–226). This amendment changes nothing in WSR-001:
- WSR-001 `PROGRAM_GRADUATED`, `HONOR_EARNED`, `GOAL_ACHIEVED`, `RANK_UP`, `CHALLENGE_COMPLETED` shares are **manual** (WSR-001 §7: "nothing is ever shared without an explicit athlete action") and target the squad check-in surface / external cards.
- The Friends Feed automatic posts defined here (`Honor earned`, `Program completed`) are **automatic** (gated by Automatically-Share-Milestones) and target the **feed**.
- A program graduation may therefore produce: (a) one automatic Friends Feed card (this amendment, if the setting is ON), and (b) an optional manual WSR-001 share card (only if the athlete taps "Share this graduation" in M-4). These are **different surfaces via different mechanisms** and are not duplicates of one another; FFR-D6 bundling applies only within (a).
- `RANK_UP` and `CHAPTER_SEALED` remain WSR-001/ceremony concerns only and never reach the Friends Feed (FFR-D4 / FFR-D1).

---

## Section 6 — What This Amendment Does Not Change

- No change to the Post entity beyond narrowing the `milestoneType` value set (no new field).
- No change to audiences (SOC-D8/D9), feed ordering (SOC-D10), reactions/comments (SOC-D11), or the Automatically-Share-Milestones setting itself (SOC-D12) — only **what qualifies** as an automatic milestone is narrowed/wired.
- No change to Honor evaluation, the Honor Catalog, Program/Chapter/Goal/Rank records, Challenge standings (still firewalled out of the feed per SOC §316), or WSR-001.
- **No progression effect of any kind** (SOC-D13).
- Social is **not redesigned**.

---

## Section 7 — Reconciliation Ledger (downstream pointers — for the next reconciliation pass)

Per project convention, this standalone amendment lists conforming pointer-changes for a later consolidation pass. **No locked source document is edited by this amendment.**

| Doc | Required change | Gate |
|---|---|---|
| `Social-System-Architecture-v1.0.md` (SOC-D7 §181, SOC-D9 §216, SOC-D12 §263) | Narrow `milestoneType` to `{ Honor earned, Program completed }`; remove `Chapter completed` and `major milestone` from the auto-post set; cite the `Program completed` emitter (§3) and FFR-D6 bundling. | — (PO-approved) |
| `Honor-Evaluation-Service-Architecture-v1.0.md` | Add a note (mirroring v1.0.1) that the Program Graduation Event is also a post-commit, read-only trigger for the `Program completed` auto-post (no schema/eval change). | — |
| `WSR-001-Workout-Share-Result-Architecture.md` | Add a pointer confirming the Friends Feed `Program completed` auto-post is distinct from the manual `PROGRAM_GRADUATED` share card (coexistence, §5). | — |
| `M-4-Program-Graduated-Spec.md` | Note the automatic Friends Feed `Program completed` card (separate from M-4's manual WSR-001 share action). | — |
| `Forge-Legacy-Master-PRD.md` / `FORGE_LEGACY_PRD.md` | Note the reconciled Friends Feed milestone set (Honors + Program completions only; chapters/goals via honors; rank never; one event → one card). | — |
| `Forge-Legacy-Master-Status.md` | Remove the "Friends Feed milestone routing" item from open gaps once this amendment is LOCKED. | — |

---

## Section 8 — Validation Checklist

- [ ] FFR-D1 — `Chapter completed` removed as a direct feed event; chapters surface only via a Chapters Honor (`Honor earned` card); WSR-001 §5.3 / M-5 privacy honored
- [ ] FFR-D2 — `Goal completed` not a direct feed event; surfaces only via a Goals Honor; DNA §10 (no public goal progress) honored
- [ ] FFR-D3 — `Program completed` retained; canonical emitter wired (Program Graduation Event → post-commit read-only consumer → `MILESTONE_AUTO` post; gated by Automatically-Share-Milestones; default audience; name snapshotted)
- [ ] FFR-D4 — `Rank up` has no feed route (DNA §10; not an Honor trigger); WSR-001 `RANK_UP` manual share unaffected
- [ ] FFR-D5 — `major milestone` removed; PR/workout-count milestones route via Honors
- [ ] FFR-D6 — one originating event → one feed card; multi-output events composed into a single card; manual posts and WSR-001 shares not collapsed
- [ ] Resulting `milestoneType` set = `{ Honor earned, Program completed }`, both wired, neither conflicting
- [ ] No progression effect (SOC-D13); Social not redesigned; WSR-001 unchanged; §7 pointers identified

---

*Friends Feed — Milestone Routing Reconciliation — Amendment 001*
*Amendment to Social-System-Architecture-v1.0 (SOC-D7/D9/D12) — operative routing only; base docs not edited here*
*June 2026*
*Authority: Social-System-Architecture-v1.0 (SOC-D7/D9/D10/D12/D13), Honor-Evaluation-Service-Architecture-v1.0 (v1.0.1 hook), Honor-Catalog-v1.0-LOCKED (Programs/Chapters/Goals families), WSR-001 (§5.3/§7), M-4, M-5, FORGE_LEGACY_PRODUCT_DNA (§10) — all LOCKED*
*Supersedes: nothing. Resolves: the Friends Feed milestone emitter gap, the Chapter-completed conflict, the undefined major-milestone value, and the missing one-event-one-card rule.*
*Status: LOCKED (PO-approved, June 2026)*
