# Program Ecosystem Amendment — Muscle Building Rename (Amendment 001)

## v1.0 | June 2026

**Status:** LOCKED

**Type:** Catalog naming amendment (athlete-facing labels and names; no schema change, no data migration).

**Authority / basis:**
- `Muscle-Building-Rename-Scoping-Note-v1.0.md` (the layered blast-radius analysis and recommendation this amendment executes)
- `Muscle-Building-Family-Research-v1.0.md` (Stage 0A family research; the open naming dependency this resolves)
- `Program-Catalog-Production-Standard-v1.0.md` §1, §7 (the "Program Catalog Naming & Positioning Reconciliation" work item — Hypertrophy-vs-Muscle-Building slice)
- `Program-Catalog-Architecture-v1.0.md` §6.6 (the display-name mapping that decouples stored enum from shown label, making this a label-only change)

**Decision:** The program family and three programs currently labeled "Hypertrophy" are renamed to **"Muscle Building."** Approved scope is **layers 1–3** of the scoping note; **layer 4 is explicitly excluded.**

---

## What Changes (Layers 1–3)

**Layer 1 — Category display label.** `Program-Catalog-Architecture-v1.0.md` §6.6 Display Name Mapping: the `HYPERTROPHY` enum now displays as **"Muscle Building"** (was "Hypertrophy"). This changes every athlete-facing surface (W-2 cards, W-3 detail) from "Hypertrophy · Beginner" to "Muscle Building · Beginner."

**Layer 2 — Program names.** The three general-ladder programs are renamed:

| Old name | New name |
|---|---|
| Hypertrophy Foundation | Muscle Building Foundation |
| Hypertrophy Intermediate | Muscle Building Intermediate |
| Hypertrophy Advanced | Muscle Building Advanced |

The two Lower Body programs (Lower Body Foundation, Lower Body Intermediate) are **unchanged** — they carry no jargon and are the Lower Body sub-ladder of the same family.

**Layer 3 — Family name.** The family is renamed from "Hypertrophy" to **"Muscle Building"** wherever the family is named as a grouping (family roster table, governance notes, succession-chain headings, coverage prose).

---

## What Does NOT Change (Layer 4 Excluded)

- **The stored category enum value remains `HYPERTROPHY`.** No schema-value change, no data migration. The enum is the stored key; the display label (layer 1) is the only thing the athlete sees, and `Program-Catalog-Architecture-v1.0.md` §6.6 already decouples the two. Renaming the enum would require a migration and produce no athlete-visible or functional benefit.
- All `category: HYPERTROPHY` values in catalog tables, the `HYPERTROPHY` enum in §3.1, and every CYCLING/COMBAT_SPORTS-style enum reference stay exactly as written.
- No goal alignment, level, environment, duration, frequency, deload, progression model, sortOrder, or successor relationship changes. This is a naming change only.

---

## Documents Updated by This Amendment

**Canonical architecture (live references updated; versions bumped):**
- `Program-Catalog-Architecture-v1.0.md` v1.3 → **v1.4** — §6.6 display label; §5 catalog table program names (Sort 5–7); PC-D4 family-name reference.
- `Program-Ecosystem-Architecture-v1.0.md` v1.3 → **v1.4** — §2.1 family roster; §2.2 governance note; §3.3 succession-chain heading + chain; §3 terminal-program list; §5 catalog table (Sort 5–7); §5 athlete-coverage (Bodybuilding row); PC-D4-equivalent prose. The **v1.2 historical change-log entry is left as-is** (a snapshot of a prior amendment; not a live reference).
- `Program-Authoring-Standard-v1.0.md` v1.2 → **v1.3** — §7.1 model "Programs:" lists (Models 2, 3, 4); §13 catalog table (Sort 5–7, including successor-name column); §14 deload table + deload naming example; §17.2 terminal-programs-to-import-first list; §16/§13 terminal-programs list.

**DRAFT companions (updated for consistency):**
- `Muscle-Building-Family-Research-v1.0.md` — the dual-name title and roster already anticipate this rename; updated so program names read as the new locked names with the old names noted parenthetically once.
- `Muscle-Building-Rename-Scoping-Note-v1.0.md` — status updated to record that the recommended layers 1–3 were approved and executed by this amendment.

**Historical / evidentiary documents (deliberately NOT rewritten):** `Strength-Foundation-I-Blueprint-v1.0.md`, `Strength-Foundation-III-Blueprint-v1.0.md`, `Powerbuilding-Intermediate-Blueprint-v1.0.md`, `Program-Ecosystem-Amendment-001-Powerbuilding-Intermediate-Retirement.md`, and the `Exercise-Library-*` documents reference the old "Hypertrophy" program/family names in passing or as historical record. These are snapshots of decisions made before this rename; per the precedent set by Program Ecosystem Amendment 001 (which preserved the retired Blueprint's original content), they are left intact. A future cosmetic-reconciliation pass may sweep them, but stale references in evidentiary records are not a blocker.

---

## Verification

After applying this amendment, a repository grep for the mixed-case strings "Hypertrophy Foundation", "Hypertrophy Intermediate", "Hypertrophy Advanced", and "Hypertrophy" (as a family name) should return hits only in (a) the historical/evidentiary documents listed above, (b) historical change-log entries, and (c) this amendment and the scoping note themselves. The all-caps enum `HYPERTROPHY` should be unchanged everywhere. This grep sweep is the same final check that closed Program Ecosystem Amendment 001.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial amendment. Renames the Hypertrophy family and its three general programs to "Muscle Building" (layers 1–3 of `Muscle-Building-Rename-Scoping-Note-v1.0.md`); stored enum `HYPERTROPHY` retained (layer 4 excluded). Updates PCA (→v1.4), PEA (→v1.4), PAS (→v1.3) and the two DRAFT muscle-building companions. Status: LOCKED. |

---

*Forge Legacy — Muscle Building Rename Amendment 001 — v1.0*
*June 2026 — LOCKED*
