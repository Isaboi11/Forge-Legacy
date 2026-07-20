# Honor Catalog Amendment 003 — Initiative (the First-Move Honor)

## Amendment to Honor-Catalog-v1.0-LOCKED.md
### July 2026

**Status:** LOCKED

**Type:** Substantive Amendment — adds **1** honor type (`initiative`) to the existing **Origin** family (Training category). No category or schema change. Formal architecture amendment as required by the catalog's own rule ("No honor types may be added… without a formal architecture amendment").

**Date:** 2026-07-19

**Amends:** Honor-Catalog-v1.0-LOCKED.md v1.5 → v1.6

**Origin:** PO direction on the live on-ramp build (2026-07-19) — *"there's an honor that says everything is now unlocked."* The fresh athlete's **first move** (their first program, built or chosen) is recognized with a real, persisted honor and the designed First Honor Ceremony. Introduced by, and reconciled with, **Onboarding-Amendment-003**.

---

## Section 1 — The Honor

| Category | Family | # | honorType | Display Name | Qualification |
|----------|--------|---|-----------|-------------|---------------|
| Training | Origin | 101 | `initiative` | Initiative | First program committed — **built OR chosen** (≥ 1) |

- **One-time** (`chapter_id` null; the `honor_once` earned-once rule applies — §6.3).
- **Snapshotted** `display_name = "Initiative"` at earn time (AD-58), like every honor.
- **Distinct from** `first_workout_logged` (also Origin family): Initiative fires at program-**commit**; First Workout Logged fires at the first logged **session**. Initiative **precedes and does not replace** it.

## Section 2 — Category / Count Delta

| | Before (v1.5) | After (v1.6) |
|---|---|---|
| Training category | 23 types | **24 types** |
| Origin family | 1 (`first_workout_logged`) | **2** (`first_workout_logged`, `initiative`) |
| Catalog total | 167 types / 13 categories / 34 families | **168 types** / 13 categories / 34 families |

The **Category Summary** and **TRAINING** section of `Honor-Catalog-v1.0-LOCKED.md` reconcile to these numbers (Training → Origin (2), Workout Count (9), Hours Forged (8), Consistency (5)). The inline edit adding this row is parked with the doc's larger uncommitted catalog-expansion backlog; **this amendment is the governing record** until that reconciliation lands.

## Section 3 — Trigger & Persistence (implementation of record)

Unlike every other Training honor, Initiative's trigger is **program-commit, not a count over committed session data**, and the "chosen a suggestion" path persists no program row. So it is granted by a **dedicated client-callable RPC** rather than inside `evaluate_honors`/`save_workout` — but it reuses the **identical** grant machinery:

- **Migration `0014_initiative_honor.sql`** — `claim_initiative_honor(p_source)` inserts the one-time honor into `honor_instances`, guarded by the same `honor_once` partial unique index + `ON CONFLICT DO NOTHING` (DB-enforced grant-once), and writes the same live `HONOR_EARNED` `timeline_events` row. It does **not** modify `evaluate_honors`.
- **Grant sites:** fired (best-effort, DB-idempotent) at the **build** path (`createProgram` success) and the **choose** path (accepting a suggestion). Calling it repeatedly (re-pick / Change / both paths) can only ever produce one row.
- **Read path:** unchanged — the Legacy Honors section and the **Honors Hub (L-10)** read `honor_instances` live, so Initiative appears like any other earned honor.
- **Proof:** `supabase/seed/initiative-roundtrip.mjs` (grant · no-fabrication · DB idempotency · Legacy-from-DB · timeline event) — passes against the live DB.

**App presentation note:** in the Honors Hub, Initiative surfaces under an **"Origin"** group carrying the **flame** glyph. The map's canonical category glyph set (`forge-honors.js`) predates Initiative, so "Origin" is an app-side grouping/glyph for this honor; the catalog placement of record is Training → Origin family (above). The flame is the same mark the locked First Honor Ceremony uses for Initiative.

## Section 4 — Reconciliation with ONB-D22 (No Fake Progress)

Granting an honor at program-commit **narrows** ONB-D22's clause *"choosing a recommended program contributes zero to Honor evaluation."* This narrowing is a PO decision, documented and bounded in **Onboarding-Amendment-003 §4**: it admits **only** this single honor; no XP/streak/shame/meter is introduced, and Workout #1 (ONB-D18) remains the primary payoff. The binding cross-references (CAL-D21, SOC-D13, CS-D4) are unaffected.

## Section 5 — What This Amendment Does NOT Change
- The `honor_instances` schema, the `honor_once`/`honor_per_chap` idempotency indexes, or `evaluate_honors` (unchanged).
- Any other honor, category, or family.
- The First Workout Logged honor (`first_workout_logged`) — unchanged; Initiative is additive and earlier.

## Section 6 — Reconciliation Ledger
| Document | Required reconciliation |
|---|---|
| Honor-Catalog-v1.0-LOCKED.md → v1.6 | Header v1.5→v1.6; Category Summary Training 23→24 / total 167→168; TRAINING → Origin family 1→2 with the `initiative` row (inline edit parked with the catalog backlog). |
| Onboarding-Amendment-003 | Awards this honor via the First Honor Ceremony; owns the ONB-D22 narrowing. |
| Forge-Legacy-Master-Status.md | Note the new honor + migration 0014. |

---

*Honor Catalog Amendment 003 — Initiative (the First-Move Honor)*
*Amends Honor-Catalog-v1.0-LOCKED.md v1.5 → v1.6*
*July 2026 · Authority: PO direction 2026-07-19 · Introduced by Onboarding-Amendment-003*
*Status: LOCKED*
