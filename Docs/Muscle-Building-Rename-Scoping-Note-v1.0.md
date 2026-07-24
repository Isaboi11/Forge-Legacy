# Forge Legacy — "Hypertrophy → Muscle Building" Rename Scoping Note

## v1.0 | June 2026

**Status:** Recommendation **APPROVED and EXECUTED** (June 2026). The layers 1–3 rename recommended below was approved and carried out by `Muscle-Building-Rename-Amendment-001.md` (LOCKED). Layer 4 (stored enum) was excluded as recommended. This note is retained as the analysis of record behind that decision.

**Purpose:** Answer the question "what would it take to rename the Hypertrophy family to Muscle Building, and is it worth it?" with a precise, layered blast-radius analysis and a recommendation. This note is a decision aid, not an executed change.

**Relationship to other documents:** This is the companion to `Muscle-Building-Family-Research-v1.0.md` (Stage 0A family research, which is name-agnostic and does not depend on this decision). It operationalizes the "Program Catalog Naming & Positioning Reconciliation" work item that `Program-Catalog-Production-Standard-v1.0.md` §7 flagged as a prerequisite for large-scale program authoring — specifically the Hypertrophy-vs-Muscle-Building slice of it.

**Authority referenced (not modified):** `Program-Catalog-Architecture-v1.0.md` (PCA) §3.1, §6.5–6.6; `Program-Ecosystem-Architecture-v1.0.md` (PEA) §2.1, §3.3, §5; `Program-Authoring-Standard-v1.0.md` (PAS) §7.1, §13, §14; `FORGE_LEGACY_PRODUCT_DNA.md` (plain-language content rules).

---

## 1 — The Word "Hypertrophy" Lives in Four Independent Layers

The single most important finding: **PCA §6.6 (Display Name Mapping) decouples the stored category value from the string the athlete sees.** That decoupling is what makes most of this rename cheap, and one layer of it pointless.

| # | Layer | Where it is defined | Athlete-facing? | Cost to change |
|---|---|---|---|---|
| 1 | Category **display label** | PCA §6.6 maps `HYPERTROPHY` → "Hypertrophy"; rendered on W-2 cards and W-3 detail as "Hypertrophy · Beginner" (PCA §6.5 Category/Level format) | **Yes** | **One table row.** No schema change, no data change, no migration. |
| 2 | Program **names** ("Hypertrophy Foundation / Intermediate / Advanced") | Canonically in three catalog tables: PCA §5, PEA §5, PAS §13. Referenced in many derived lists (see §2). | **Yes** (the `name` field shown everywhere) | Catalog naming amendment — multi-document text sweep (see §2 for the real surface count). No schema change, no migration. |
| 3 | **Family** name ("Hypertrophy") | PEA §2.1 (family grouping); §2.2, §3.3 (governance, succession-chain headings) | **No** — W-2 is a flat sortOrder list at MVP (PCA PC-D5); cards show category + level, not family. Family is internal grouping/governance only. | Internal-doc find/replace. No athlete impact, no schema impact. |
| 4 | Category **enum value** `HYPERTROPHY` | PCA §3.1 (the stored key itself) | No — it is the stored key, never the displayed string (that is layer 1) | **The only path requiring a schema-value change + data migration — and it buys nothing**, because layer 1 already controls everything the athlete sees. |

**The decisive consequence:** the entire athlete-facing comprehension change is purchasable at **layer 1 alone** — edit one row of PCA §6.6 so `HYPERTROPHY` displays as "Muscle Building," and every card and detail screen instantly reads "Muscle Building · Beginner." The stored enum, every program record's `category` field, the import pipeline, and the post-MVP W-2 filter architecture (PCA PC-D5) are all untouched. **Layer 4 should never be done** — renaming the enum string is the only expensive action available and it produces no athlete-visible or functional benefit that layer 1 doesn't already deliver.

---

## 2 — The Real Blast Radius of Layer 2 (Program Names)

Layer 1 makes the *category label* read "Muscle Building," but the three general programs would still be **named** "Hypertrophy Foundation / Intermediate / Advanced." To fully remove the jargon from the athlete's view, those three names must change (e.g., to "Muscle Building Foundation / Intermediate / Advanced"). The two Lower Body programs already carry no jargon and need no rename.

**This is wider than three table rows.** A repository scan for the three program names returns ~61 occurrences across ~10 documents — the names propagate into derived structures far from the primary catalog tables. The Powerbuilding Intermediate retirement (Program Ecosystem Amendment 001) taught this exact lesson: a file-by-file pass against the primary table missed derived references hiding in secondary tables, prose, and checklists, and only a full-repo re-grep caught them. A program-name rename must sweep, at minimum:

- **Primary catalog tables (canonical):** PCA §5, PEA §5, PAS §13.
- **PEA derived references:** succession-chain block (§3.3 "Hypertrophy Ladder"), terminal-program list (§3 / §5), family roster (§2.1), governance example text (§2.2), validation checklist (§9).
- **PAS derived references:** the deload schedule table (§14), the per-model "Programs:" lists under §7.1 (Models 2, 3, 4 all name these programs), the terminal-programs-to-import-first list (§17.2), the RPE/category checklist examples (§16).
- **Cross-doc citations:** the names appear in `Strength-Foundation-I/III-Blueprint`, `Powerbuilding-Intermediate-Blueprint`, the Powerbuilding retirement amendment, `Exercise-Library-Architecture`, and `Exercise-Library-Production-Plan` — these would need at least a consistency check, even if some are historical records left as-is.
- **This family's own Stage 0A research** (`Muscle-Building-Family-Research-v1.0.md`), which uses the locked names throughout by design.

Mechanically this is the same shape and scale as the Powerbuilding retirement amendment (a multi-doc catalog text change executed via a single locked amendment + a final full-repo grep sweep for the changed strings). It is **not** a schema change and requires **no** migration.

---

## 3 — Is It Worth It?

**Recommendation: yes — scoped to layers 1–3, never layer 4 — with layer 1 as the minimum viable change.**

**The strongest argument is an existing inconsistency in the locked design.** The *goal* an athlete selects for this exact training intent is already plain-language: the goal-alignment enum is `BUILD_MUSCLE`, described as "Increase muscle mass" (PCA §3.4). But the *category* shown for that same intent is the clinical term "Hypertrophy." An athlete picks "build muscle" as their goal and is then shown a program categorized as "Hypertrophy" — two labels, same concept, one plain and one jargon. Renaming the display label to "Muscle Building" aligns the category with the already-plain goal language and with the project's plain-language content rules (`FORGE_LEGACY_PRODUCT_DNA.md`; PCA §4.4 athlete-centered descriptions). It is a genuine comprehension and consistency win.

**The counter-argument is real but low-stakes.** "Hypertrophy" is the precise, established term, and the family's primary audience (Bodybuilding athletes, PEA §2.1) often knows and prefers it. But because layer 1 is a pure display-mapping change, the decision is fully reversible at near-zero cost — which lowers the stakes of getting it "wrong" to almost nothing.

**Recommended phasing:**

1. **Do layer 1 now (or whenever the reconciliation lands):** one row in PCA §6.6. Highest comprehension-per-effort ratio in the entire reconciliation backlog.
2. **Do layer 2 (program-name rename) and layer 3 (family-name rename) together, as a single catalog naming amendment, *before* Stage 1 Blueprints author athlete-facing names** — so the Blueprints are written against final names and don't need re-naming later (the precise risk `Program-Catalog-Production-Standard-v1.0.md` §7 warns about). If the rename is going to happen, doing it before Stage 1 is materially cheaper than after.
3. **Never do layer 4.** Keep the enum value `HYPERTROPHY`. There is no reason to migrate stored data for a label change the display layer already handles.

**What this note explicitly does not do:** it does not decide the broader catalog-naming/positioning conflict (beginner-first vs. intermediate-first audience; the other families' name disputes). It scopes only the Hypertrophy → Muscle Building slice. And it changes nothing — every edit above is described, not applied.

---

## 4 — One-Line Summary for the Product Owner

Renaming the family to "Muscle Building" costs **one table row** to change everything athletes see (PCA §6.6), plus an optional multi-doc text sweep to rename the three "Hypertrophy X" programs and the family name; it requires **no schema change and no migration** as long as the stored enum `HYPERTROPHY` is left alone; and it is **worth doing** because it makes the category label match the already-plain `BUILD_MUSCLE` goal language — ideally executed before Stage 1 Blueprints lock in athlete-facing names.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial rename scoping note. Companion to `Muscle-Building-Family-Research-v1.0.md`. Layered blast-radius analysis (4 layers), real layer-2 surface count, recommendation (layers 1–3 yes, layer 4 never, layer 1 minimum). No document modified. Status: DRAFT, for product-owner decision. |

---

*Forge Legacy — "Hypertrophy → Muscle Building" Rename Scoping Note — v1.0*
*June 2026*
*Decision aid for the catalog naming reconciliation (`Program-Catalog-Production-Standard-v1.0.md` §7). No change executed.*
