# Forge Legacy — Catalog Naming & Positioning Reconciliation

## v1.0 | June 2026

**Status:** DRAFT — pending product-team review. Not yet LOCKED.
**Phase:** Cross-catalog governance review (post-Stage-1, pre-Stage-2) — resolves the open work item in `Program-Catalog-Production-Standard-v1.0.md` §1 (catalog-naming conflict) and §7 (flagged as a prerequisite before large-scale Stage 2 authoring).

**Authority Chain:**
- `Program-Catalog-Production-Standard-v1.0.md` §1 (the catalog-naming/grouping conflict and audience-positioning conflict this review re-evaluates), §7
- `Program-Ecosystem-Architecture-v1.0.md` v1.4 §2 (families/caps), §3 (succession), §5 (the canonical 24-program catalog table + naming), §7.1 (roadmap)
- `Program-Catalog-Architecture-v1.0.md` v1.4 §3.1 (8 categories / enum), §3.2 (levels), §5 (catalog)
- `Program-Authoring-Standard-v1.0.md` v1.3 §3.2 (level = relative to training style), §5 (description/naming), PAS-D1 (tier descriptors), §13–14
- `Muscle-Building-Rename-Amendment-001.md` (LOCKED — display rename Hypertrophy→Muscle Building, enum retained)
- The six family research/Stage-1 records: `Strength-Family-Research`, `Muscle-Building-Family-Stage-1-Review`, `Conditioning-Family-Stage1-Review`, `Full-Body-Home-Family-Stage1-Review`, `Mobility-Family-Stage1-Review`, `Running-Family-Research`
- `Program-Catalog-Governance-Review-v1.0.md` (which named the §1 naming/positioning conflict the biggest cross-cutting catalog risk)

**Scope:** A catalog-wide reconciliation of every naming, positioning, terminology, ladder-label, and athlete-facing-clarity issue across the 24-program catalog, now that all six families have completed governance. **Findings and recommendations only.** This review does **not** author programs, create blueprints, modify architecture, propose amendments, rewrite catalog structure, or change any metadata. Every recommendation is deferred to a future product-team-authorized naming pass (a V1.1 amendment) — none is executed here. Program/family `name` strings are LOCKED catalog/schema values; changing one is a catalog change, explicitly out of scope.

---

## Section 1 — Headline Finding: the §1 Conflict Is Largely Overtaken by Governance

The Production Standard §1 catalog-naming conflict (item 1) described a divergence between the **locked catalog** and a **"current strategic direction"** that used different family names, counts, and program names (e.g., a standalone *Hybrid* family of 4, a standalone *Bodyweight* family of 3, a 2-program *Conditioning* family, a 3-program *Running* family with "5K/10K Builder"). **That divergence has since been resolved — in favor of the locked architecture — through the six-family Stage 0A/Stage 1 governance pass and the Muscle Building rename amendment.** The canonical `Program-Ecosystem-Architecture-v1.0.md` §5 table now reads with reconciled names:

| Family | Programs | Count |
|---|---|---|
| Strength | Strength Foundation I/II/III + Powerbuilding Foundation | 4 |
| Muscle Building | Muscle Building Foundation/Intermediate/Advanced + Lower Body Foundation/Intermediate | 5 |
| Running | Running Base I/II | 2 |
| Conditioning | Athletic Conditioning Foundation, Conditioning Intermediate, Body Recomposition Foundation/Intermediate, Hybrid Foundation/Intermediate | 6 |
| Full Body & Home | Bodyweight Foundation/Strength/Performance + Home Conditioning + Home Strength Foundation | 5 |
| Mobility | Mobility Foundation/Intermediate | 2 |

So the **family-grouping and family-count half of the §1 conflict is closed**: the speculative alternative family structure was not adopted; the catalog settled at 6 families / 24 programs. What remains is **not** a locked-vs-direction grouping conflict but a set of **residual intra-catalog naming and signaling inconsistencies** — the genuine reconciliation surface this review enumerates below. The §1 **audience-positioning conflict** (item 2 — beginner-first structure vs an intermediate/advanced-leaning audience) is a separate, still-open *positioning* question correctly deferred to the post-authoring PAS-R1 audit (Section 6); it is not a naming defect and cannot be resolved by renaming.

---

## Section 2 — Naming Conventions Currently in Use

The catalog uses **three different ladder-label conventions** simultaneously to signal level/progression:

| Convention | Signals level via | Used by |
|---|---|---|
| **Roman numerals** | I / II / III | Strength Foundation **I/II/III**, Running Base **I/II** |
| **Tier words** | Foundation / Intermediate / Advanced | Muscle Building **Foundation/Intermediate/Advanced**, Lower Body **Foundation/Intermediate**, Mobility **Foundation/Intermediate**, Athletic Conditioning **Foundation** → Conditioning **Intermediate**, Body Recomposition / Hybrid **Foundation/Intermediate** |
| **Outcome words** | Foundation → Strength → Performance | Bodyweight **Foundation/Strength/Performance** |

"Foundation" additionally does double duty: it is both the **BEGINNER tier descriptor** (PAS-D1) *and* a proper-noun component of many program names — consistent in that every "Foundation" program is in fact BEGINNER, but it means the word carries two jobs. This three-convention reality is the root cause of most issues in Section 3.

---

## Section 3 — Findings (every issue, with severity)

Severity scale: **Critical** (breaks the catalog/schema or causes likely user error / wrong program selection) · **Important** (real inconsistency or confusion risk worth a coordinated fix) · **Cosmetic** (minor polish; safe to defer indefinitely).

### Finding 1 — Cross-catalog level-signaling convention inconsistency · **Important**
- **Problem:** Three conventions (Section 2) signal "advanced": *Strength Foundation **III***, *Muscle Building **Advanced***, and *Bodyweight **Performance*** are all ADVANCED, named three different ways. Beginner is signaled as *I*, *Foundation*, and *Foundation* across families.
- **User confusion risk:** An athlete browsing across families cannot read level from the name using one mental model — they must learn three. "Is Bodyweight Performance harder than Bodyweight Strength?" is not self-evident the way "Intermediate > Foundation" is.
- **Recommendation:** In a future naming pass, adopt **one primary level convention** (tier words — Foundation/Intermediate/Advanced — already the catalog plurality) and treat roman numerals / outcome words as deliberate, documented exceptions where they carry meaning (see Findings 6 & 8). Do not change names in this review.

### Finding 2 — "Strength Foundation" overloaded across two families · **Important**
- **Problem:** The Strength family has *Strength Foundation I/II/III*; the Full Body & Home family has *Home Strength Foundation*. Two distinct ladders share the "Strength Foundation" stem in different families with different equipment, environment, and progression.
- **User confusion risk:** A user could read *Home Strength Foundation* as "the home version of Strength Foundation I," implying an equivalence/continuity that does not exist (different category, environment, progression model). Cross-family confusion is real here.
- **Recommendation:** Flag for the naming pass; the home-equipment program may warrant a stem that doesn't collide with the barbell strength ladder (e.g., signaling the home-equipment tier explicitly). Tied to the equipment-tier under-specification carried by the Full Body & Home review. No change here.

### Finding 3 — Athletic Conditioning Foundation → Conditioning Intermediate ladder-stem asymmetry · **Important**
- **Problem:** The successor chain is *Athletic Conditioning Foundation* (Sort 12, BEG) → *Conditioning Intermediate* (Sort 14, INT). The ladder stem changes mid-chain ("Athletic Conditioning" → "Conditioning"); the two rungs of one progression don't share a name.
- **User confusion risk:** An athlete finishing *Athletic Conditioning Foundation* is pointed to *Conditioning Intermediate* and may not recognize it as the intended next rung — the name doesn't visibly continue the ladder. (Flagged as a watch item in the Conditioning Stage 1 Review.)
- **Recommendation:** In the naming pass, align the two rungs on a single stem (either both "Athletic Conditioning" or both "Conditioning"). Pure label alignment, no structural change. Not executed here.

### Finding 4 — "Conditioning" family contains non-"Conditioning" ladders · **Important**
- **Problem:** The CONDITIONING category/family holds three differently-stemmed sub-ladders: *Athletic Conditioning* / *Conditioning*, *Body Recomposition* Foundation/Intermediate, and *Hybrid* Foundation/Intermediate. Two of three sub-ladders never say "Conditioning."
- **User confusion risk:** The family label and the program labels don't reinforce each other; an athlete looking for "conditioning" may not associate *Body Recomposition* or *Hybrid* with it, and vice-versa. Compounded by Finding 5.
- **Recommendation:** Accept the heterogeneity as deliberate (the Conditioning family is the catalog's multi-goal umbrella, established in its Stage 0A as three distinct goal-signatures) **or** rename for a shared stem — a product-positioning decision for the naming pass. Document the chosen rationale either way. No change here.

### Finding 5 — "Hybrid" is both a family-internal ladder name and an athlete type · **Important**
- **Problem:** *Hybrid Foundation/Intermediate* are programs inside the **Conditioning** family, but "Hybrid" is also one of the four athlete types (O-2 Amendment) and was, in the superseded "current direction," a proposed standalone family.
- **User confusion risk:** A self-identified Hybrid athlete may expect a "Hybrid family" and instead finds two Hybrid programs filed under Conditioning — a positioning mismatch between athlete-type language and family taxonomy.
- **Recommendation:** Flag for the naming/positioning pass; ensure athlete-type-to-program discovery (W-2) bridges the gap regardless of the family label. No rename asserted here.

### Finding 6 — "Full Body & Home" / "Bodyweight" / "Home" — three terms for one family · **Important**
- **Problem:** The family is named **Full Body & Home**; its category enum is `FULL_BODY`; its flagship ladder is **Bodyweight** (Foundation/Strength/Performance); two members carry a **Home** prefix (*Home Conditioning*, *Home Strength Foundation*) while the Bodyweight ladder does not. Three vocabulary stems (Full Body / Bodyweight / Home) describe one family.
- **User confusion risk:** The relationship among "Bodyweight Strength," "Home Strength Foundation," and the "Full Body & Home" family is not legible from names alone; the bodyweight-vs-home-equipment tier distinction (load-bearing per the family's Stage 1 review) is carried only by name convention, not a structured field.
- **Recommendation:** The naming pass should rationalize the family's internal vocabulary and is the natural companion to the deferred V1.1 Training-Environment/equipment-tier architecture flagged by the Full Body & Home review. The "Performance" outcome-label (Finding 1) is defensible *within* this ladder if documented. No change here.

### Finding 7 — "Powerbuilding Foundation" → "Strength Foundation II" cross-stem, level-skipping successor · **Important**
- **Problem:** *Powerbuilding Foundation* (Sort 4, BEGINNER) has successor *Strength Foundation II* (Sort 2, INTERMEDIATE). The successor changes the ladder stem ("Powerbuilding" → "Strength Foundation") and jumps to "II" (there is no "Powerbuilding" II to inherit).
- **User confusion risk:** The handoff is not name-legible: an athlete finishing Powerbuilding Foundation is sent to a differently-named ladder at a "II" they never saw a "I" of. (This is a deliberate convergence into the Strength ladder — the Powerbuilding Intermediate retirement is why — but the names don't explain it.)
- **Recommendation:** Flag for the naming pass; consider a name or in-app "what's next" affordance (W-3) that makes the cross-ladder handoff explicit. Structural relationship is correct and stays; only legibility is at issue. No change here.

### Finding 8 — Running "Base I/II" uses a unique, level-opaque convention · **Cosmetic→Important**
- **Problem:** *Running Base I/II* is the only family using "Base" + roman numerals; "Base" signals training phase, not level, and I/II don't say BEGINNER/INTERMEDIATE explicitly. The superseded "5K/10K Builder" direction names have no locked equivalent (the Running expansion is roadmap-deferred).
- **User confusion risk:** Mild — within Running the I/II ordering is clear, but cross-family the convention doesn't match anyone else's, and "Base" may read as "basic/beginner-only" to a runner who is in fact intermediate.
- **Recommendation:** Low-priority; revisit if/when the deferred Running expansion (Running Base III / race-prep) is authored, since that is the moment the ladder labels must be set coherently anyway. No change here.

### Finding 9 — "Lower Body Foundation/Intermediate" named by region inside the Muscle Building family · **Cosmetic**
- **Problem:** Within the Muscle Building family, siblings are named *Muscle Building* X while *Lower Body Foundation/Intermediate* are named by body region.
- **User confusion risk:** Low — the region naming is in fact *clarifying* (it tells the athlete exactly what's specialized). Internal heterogeneity only.
- **Recommendation:** Keep as-is; the region name is a feature, not a defect. Documented for completeness.

### Finding 10 — `HYPERTROPHY` enum vs "Muscle Building" display in author-facing tables · **Cosmetic (by design)**
- **Problem:** The catalog `category` column still reads `HYPERTROPHY` for Sorts 5–9 (Muscle Building programs); the rename was an athlete-facing display change with the enum deliberately retained (`Muscle-Building-Rename-Amendment-001.md`).
- **User confusion risk:** None athlete-facing (users see "Muscle Building"). Author-facing only — an author reading the raw table sees the old enum.
- **Recommendation:** No action; this is a locked, intentional decision. Listed so the reconciliation is exhaustive and so it is not re-flagged later as a remnant. The only residual is documentation-hygiene (ensure author docs note the display mapping) — cosmetic.

### Finding 11 — Terminal "Foundation" programs imply an unbuilt ladder · **Cosmetic→Important**
- **Problem:** *Home Strength Foundation* (Sort 22, BEGINNER, terminal) is named "Foundation" but has no successor (the roadmapped Home Strength Intermediate is unbuilt). The name implies a next rung the catalog doesn't yet contain. (Contrast Mobility Foundation, whose Intermediate exists, and Home Conditioning, which is complete-by-design and not named "Foundation.")
- **User confusion risk:** An athlete may expect a "Home Strength Intermediate" to graduate into and find none — a name-set expectation the journey doesn't meet (the terminal-by-unbuilt-successor pattern from the Full Body & Home review).
- **Recommendation:** Tie to the demand-gated Home Strength Intermediate roadmap decision; until then, in-app "what's next" (W-3) should set expectations. Naming-pass candidate, not a launch blocker. No change here.

---

## Section 4 — Re-Evaluation of Previously-Identified Issues

| Previously flagged | Status now | Severity |
|---|---|---|
| **Athletic Conditioning Foundation → Conditioning Intermediate naming asymmetry** | Confirmed, still open — Finding 3. A genuine ladder-stem asymmetry within one successor chain. | Important |
| **Remaining Muscle Building naming remnants** | Resolved-by-design — Finding 10. The display rename is complete athlete-facing; the retained `HYPERTROPHY` enum is intentional, not a remnant to fix. | Cosmetic |
| **Full Body vs Bodyweight terminology** | Confirmed, still open — Finding 6 (broadened to the Full Body / Bodyweight / Home triplet). The catalog's least-legible family vocabulary; companion to the deferred equipment-tier architecture. | Important |
| **Running naming and positioning** | Confirmed, low-priority — Finding 8. Unique "Base I/II" convention; best reconciled when the deferred Running expansion is authored. | Cosmetic→Important |
| **Unresolved Production Standard §1 conflicts** | Item 1 (grouping/counts) substantially **closed** by governance — Section 1. Item 2 (audience-positioning) **still open**, correctly deferred to post-authoring PAS-R1 — not a naming issue (Section 6). | Important (positioning, deferred) |

---

## Section 5 — Severity Rollup

- **Critical: 0.** No naming issue breaks the catalog or schema, collides as a duplicate `name`, or is likely to cause an athlete to start the *wrong* program. Program names are unique and the in-app discovery/"what's next" surfaces (W-2/W-3) mediate selection. The catalog is launch-functional as named.
- **Important: 6** (Findings 1–7, with 8 and 11 straddling) — real cross-catalog inconsistencies worth a single coordinated naming pass: convention inconsistency, "Strength Foundation" overload, the Conditioning ladder-stem asymmetry, Conditioning/Hybrid family-vs-member and athlete-type mismatches, the Full Body/Bodyweight/Home triplet, and the Powerbuilding cross-stem successor.
- **Cosmetic: the remainder** (Findings 9, 10, parts of 8/11) — polish or by-design; safe to defer indefinitely.

---

## Section 6 — Final Catalog-Wide Recommendation

**Verdict: MINOR NAMING CLEANUP RECOMMENDED — deferred to a future product-team-authorized naming pass (V1.1 amendment). Not a launch blocker; not a major reconciliation.**

Reasoning:
- **Not "no action required":** the issues in Section 3 are genuine — a three-convention level-signaling system, the "Strength Foundation" cross-family overload, and the Athletic Conditioning → Conditioning ladder asymmetry are real, repeatedly-flagged inconsistencies.
- **Not "major reconciliation required":** the family-grouping/count conflict that originally motivated §1 is **closed** (Section 1); zero Critical issues remain; the catalog is internally coherent and launch-functional; and every fix is a label change, not a structural one. The architecture stays LOCKED and unchanged.
- **Therefore minor cleanup,** executed as **one coordinated naming amendment** (not piecemeal), ideally sequenced to ride alongside two already-deferred workstreams it is coupled to: the **V1.1 Training-Environment/equipment-tier architecture** (Findings 2, 6) and the **demand-gated Running and Home Strength expansions** (Findings 8, 11), since those are the moments their ladder labels must be set coherently regardless.

**Sequencing recommendation:** This cleanup is **no longer a hard prerequisite to begin Stage 2 authoring** (the way Production Standard §7 framed the original §1 conflict), because the blocking half — family grouping/counts — is resolved. Stage 2 can proceed on the canonical PEA §5 names. The naming cleanup and the **audience-positioning question** (§1 item 2) should both be revisited at the **PAS-R1 Difficulty Calibration Audit** checkpoint (after all programs exist as drafts), when real authored content makes both the level-signaling and the beginner-vs-advanced positioning concrete rather than theoretical.

**Out of scope / not done here:** no program, family, or ladder has been renamed; no metadata, enum, successor link, or catalog row changed; no amendment authored. All recommendations await product-team authorization.

---

## Section 7 — Status Layers

- **Architecture:** LOCKED and unchanged (PEA v1.4, PAS v1.3, PCA v1.4; Muscle Building Rename Amendment v1.x). No structural, schema, enum, or catalog change proposed or made.
- **Content Production:** All six families Stage-1-complete (Running Stage-0A-complete, expansion resolved/deferred). This review closes the long-standing Production Standard §1 naming work item with findings and a deferred-cleanup recommendation.
- **Implementation Readiness:** Stage 2 may proceed on canonical names; the naming cleanup + audience-positioning re-examination are scheduled for the pre-publish PAS-R1 checkpoint.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial catalog-wide Naming & Positioning Reconciliation, after all six families completed governance. **Headline:** the Production Standard §1 grouping/count conflict is substantially closed by governance (the speculative alternative family structure was not adopted; canonical PEA §5 names prevailed). Enumerated 11 residual findings across naming, ladder-label, terminology, and clarity; re-evaluated the five previously-flagged items (Athletic Conditioning→Conditioning asymmetry = Important/open; Muscle Building remnant = Cosmetic/by-design; Full Body vs Bodyweight = Important/open, broadened to Full Body/Bodyweight/Home; Running Base = Cosmetic→Important/low-priority; §1 conflicts = grouping closed, positioning deferred). Severity rollup: **0 Critical, 6 Important, remainder Cosmetic.** **Verdict: MINOR NAMING CLEANUP RECOMMENDED** — one coordinated V1.1 naming amendment, deferred to the PAS-R1 checkpoint, coupled to the V1.1 equipment-tier architecture and the demand-gated Running/Home Strength expansions; no longer a hard Stage-2 prerequisite. Findings and recommendations only; architecture LOCKED/unchanged; nothing renamed. Status: DRAFT, pending product-team review. |

---

*Forge Legacy — Catalog Naming & Positioning Reconciliation — v1.0*
*June 2026 — governance review per `Program-Catalog-Production-Standard-v1.0.md` §1/§7. Findings only; no catalog changes authorized. Pending product-team review before LOCK.*
