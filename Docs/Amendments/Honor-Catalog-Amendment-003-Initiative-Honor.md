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
| Training | Origin | 101 | `initiative` | Initiative | The **first move** — program **built**, **chosen**, OR **first workout logged** (≥ 1), whichever comes first |

- **One-time** (`chapter_id` null; the `honor_once` earned-once rule applies — §6.3). **DB-idempotent** — earned exactly once regardless of how many of the three triggers fire.
- **Snapshotted** `display_name = "Initiative"` at earn time (AD-58), like every honor.
- **Distinct from** `first_workout_logged` (also Origin family): Initiative can fire earlier (program-commit) and can co-occur on Workout #1 for an athlete who never touched a program. It **precedes and does not replace** First Workout Logged.

## Section 2 — Category / Count Delta

| | Before (v1.5) | After (v1.6) |
|---|---|---|
| Training category | 23 types | **24 types** |
| Origin family | 1 (`first_workout_logged`) | **2** (`first_workout_logged`, `initiative`) |
| Catalog total | 167 types / 13 categories / 34 families | **168 types** / 13 categories / 34 families |

The **Category Summary** and **TRAINING** section of `Honor-Catalog-v1.0-LOCKED.md` reconcile to these numbers (Training → Origin (2), Workout Count (9), Hours Forged (8), Consistency (5)). The inline edit adding this row is parked with the doc's larger uncommitted catalog-expansion backlog; **this amendment is the governing record** until that reconciliation lands.

## Section 3 — Trigger & Persistence (implementation of record)

Initiative has **three triggers**, all writing the same one-time honor into `honor_instances` (guarded by the `honor_once` partial unique index + `ON CONFLICT DO NOTHING`, so exactly one row ever):

- **Program build / choose (client, migration `0014`):** `claim_initiative_honor(p_source)` — a dedicated client-callable RPC (the pick/build paths persist no countable session row, so they can't live in `evaluate_honors`). Fired best-effort at `createProgram` success and at accept-a-suggestion. Grants immediately so the First Honor Ceremony's "Initiative is yours" is truthful at program-commit.
- **First workout logged (DB, migration `0015`):** `evaluate_honors` (which runs inside `save_workout`) gains an `initiative` branch that grants on `total_sessions >= 1`, mirroring `first_workout_logged`. This covers the athlete who **trains without a program**, grants **atomically with the workout** (so Initiative appears in the workout-complete honor hero, matched by `awarded_at = saved_at`), and is a **no-op** when 0014 already granted it.
- **Read path:** unchanged — Legacy Honors + the **Honors Hub (L-10)** read `honor_instances` live.
- **Proofs:** `supabase/seed/initiative-roundtrip.mjs` (the pick/build RPC path) and `supabase/seed/honor-roundtrip.mjs` (updated: the first workout now earns `first_workout_logged` + `initiative`, matched in the save txn) — both pass against the live DB.

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
