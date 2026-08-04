# Rank Computation Model Amendment 002 — Self-Directed Training Blocks
## Amendment to Rank-Computation-Model.md
### August 2026

**Amendment ID:** Rank-Computation-Model-Amendment-002
**Status:** LOCKED
**Type:** Substantive Amendment — widens the evidence admitted by one threshold row; changes no threshold value
**Date:** 2026-08-02
**Amends:** `Rank-Computation-Model.md` v1.0.1 → v1.1 · `Rank-System-Architecture.md` v1.0 → v1.1
**Supersedes:** No prior substantive amendment (Amendment 001 was administrative — the DRAFT→LOCKED flip)
**Authority Chain:**
- `Rank-System-Architecture.md` v1.0 (LOCKED — architectural authority)
- `Rank-Calibration-Decisions.md` v1.0 (LOCKED — numeric calibration)
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED)
**Applies to:** RCM §14.7, §14.11, §14.13, §13.7 · RSA §14, §15 · P-2 What's Next · `src/domain/rank/*`
**New decisions:** **D-RCM-29** (RCM) · **R-D48** (RSA)
**Origin:** PO direction, 2026-08-02 — *"a certain amount of freestyle workouts should count as a program… make it fit for those that only do freestyle."*
**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — The Problem

**An athlete who trains day to day and never builds a program cannot progress past Craftsman. Ever.**

RCM §14.7 makes program graduations a hard requirement at four of the six family transitions — 1 at C→A, 3 at A→E, 6 at E→L, 10 at L→G. §14.11 states every row is a hard requirement. So for an athlete who never adopts a program, no quantity of training, no span of years, no number of sealed chapters and no depth of improvement produces a promotion above Craftsman. The ceiling is absolute and permanent.

This is not a hypothetical population. `Docs/Workouts-Hub-Wireframe-Spec-W1.md` §5 and `Docs/Goal-Hub-Wireframe-Spec-G1.md` §15.3 both address the program-less athlete as a first-class case; `Onboarding-Amendment-003` uses the term "freestyle athlete" as established product vocabulary; and the data layer has always agreed with them — `save_workout` increments the chapter count and calls `evaluate_honors` with no program filter, and rank's own volume and consistency categories read every saved workout regardless of `program_id`. **Program Progression is the only place in the product where an athlete's training does not count as training.**

**Two locked documents already disagree with the shipped behaviour:**

- **RSA §15**, Craftsman identity test: *"Structured development — meaningful engagement with training structure through programs **or deliberate programming**."* The disjunction is in the locked architecture. The engine implements only the left branch.
- **RS-D8**: *"Programs are major development signals, not universal gates… **They are not required at every rank transition** — but athletes who complete programs advance significantly faster."*

The RCM's own footer names it *"Computational Authority for Rank-System-Architecture.md v1.0 (LOCKED)."* It is the computational layer. In operationalising RS-D8's "major development signal" as a hard count at every transition above Craftsman, §14.7 overshot the architecture it computes. **This amendment is a reconciliation, not a relaxation.**

---

## Section 2 — Decision D-RCM-29 — The Program Progression row is a Structured Development row

### Statement

> **D-RCM-29:** The Program Progression threshold row is a *structured development* row. One credit is earned by a program graduation **or** by a self-directed training block (six qualifying weeks within an eight-week span, non-overlapping, derived automatically from training history). Credits are additive at parity. **Threshold values are unchanged at every transition.** Blocks are never recorded as program graduations, never enter the Program Progression honor metric, and are never displayed as an in-progress counter.

### Rules

**R1 — Qualifying week.** A Mon–Sun calendar week (D-RCM-5) containing meaningful work (§3.5) on **at least three distinct days**. Distinct *days*, not sessions: three ten-minute walks on one Saturday is one day of training, and counting sessions would let it read as a trained week.

**R2 — Block.** **Six qualifying weeks falling inside a span of eight consecutive calendar weeks.**

**R3 — Non-overlap.** A qualifying week belongs to at most one block, assigned by a left-to-right earliest-completion scan. Greedy-by-earliest-completion is the optimal strategy for maximum non-overlapping intervals, so no athlete is under-credited by unlucky alignment of their qualifying weeks.

**R4 — Parity.** One block satisfies exactly as much of the requirement as one graduation. No threshold value moves.

**R5 — Derived, never declared.** Blocks are computed from session history. The athlete declares nothing, commits to nothing, and no record is created. There is no block table, no block column and no block entity.

**R6 — Native only.** Blocks derive from Forge-native session records. Whether imported sessions may form blocks, and at what credit, is deferred (see §7).

### Why 6 × 3 and not some other numbers

`weeks` and `minDaysPerWeek` are calibrated to the shipped catalogue rather than invented. Both authored programs — Strength Foundation I (3-Day) and II (4-Day) — are `durationWeeks: 6` at `frequencyPerWeek: 3–4`. So "one block counts as much as one graduation" is measured against **what a graduation actually is in this product**, not against an opinion about effort.

- **≥2 days/week** would let a maintenance habit manufacture credits, and "deliberate programming" would not survive the reading.
- **≥4 days/week** would set the freestyle bar *above* the program bar, defeating the parity this amendment grants.

### Why a WINDOW, and why this is the load-bearing part

Six *consecutive* weeks was the obvious rule and is the wrong one, for three reasons — the third disqualifying:

1. **It punishes better training.** An athlete running 5×/week with one planned deload week earns nothing across eleven weeks and fifty-one sessions, while a flat 3×/week athlete earns a block on eighteen. Periodization is a thing programs *contain*; a rule that models a program must not punish the athlete who performs one without a JSON file.

2. **It contradicts the DNA's own commitments.** The product explicitly honours the athlete who got injured or prioritised family. Zeroing five weeks of work for one week of flu does the opposite.

3. **It is a streak, and the product bans streaks.** "Six consecutive weeks, one miss resets to zero" is precisely *a forward counter the athlete must protect*. Product DNA §10 prohibits streak pressure systems; CAL-D19 narrowed that prohibition only for a private, backward-looking Calendar visualisation that *"is never a target, never a status number, and **feeds no progression**."* A consecutive-week counter gating rank feeds progression by definition.

**Two tolerated weeks in eight removes the thing that could be broken.** A gap costs nothing recoverable and destroys nothing already earned; the scan re-anchors at the next qualifying week. **There is no state that can be broken** — that absence, not the copy, is what makes this not a streak.

**The eight-week window is the one number in this design that is judgment rather than derivation.** It is 6 + 2: a deload plus one life week, and not enough to stretch "six weeks of training" into a quarter. It is recorded here as a judgment so a future calibration pass knows where to look.

---

## Section 3 — Exact Document Changes

### 3.1 §14.7 — title and table

**Before:** `### 14.7 Program Progression Thresholds`
**After:** `### 14.7 Structured Development Thresholds (Program Progression)`

Table column header "Program Graduations Required" → **"Structured Development Credits Required"**. Row text reworded to name both forms; **the values 0 / 0 / 1 / 3 / 6 / 10 do not move.**

### 3.2 New §14.7.1 — Structured development credits (D-RCM-29)

> One credit is earned by either:
> - a **program graduation** — a program record reaching the Graduated state (RSA §8.2, C-5); or
> - a **self-directed training block** — six qualifying weeks (a Mon–Sun week with meaningful work on at least three distinct days) falling inside a span of eight consecutive calendar weeks. Blocks are derived automatically from training history; the athlete declares nothing and no record is created. Blocks are non-overlapping: a qualifying week belongs to at most one block, assigned by a left-to-right earliest-completion scan.
>
> Credits are additive at full parity: one block satisfies exactly as much of the requirement as one graduation.
>
> **A self-directed block is not a program graduation and must never be reported as one.** The Program Progression count consumed by the Honor Evaluation Service counts graduated program records only. **No honor may fire on a block.** This boundary is load-bearing: an honor is a permanent claim about a specific act, and "5 Programs Graduated" awarded to an athlete who graduated none would be a false permanent record in a product whose first principle is that history cannot be rewritten. Unlike a rank, an honor cannot be quietly recomputed.
>
> **No in-progress block may be displayed.** Completed blocks are counted; partial progress toward a block is never surfaced on any screen, in any notification, or in any share artefact. A visible partial count would be a forward counter the athlete must protect — the pattern Product DNA §10 prohibits and CAL-D19 narrowed only for a backward-looking view that feeds no progression. This one would feed progression directly.

### 3.3 §14.7 — the Legend and Legacy "multiple" definitions

The existing *"6 program graduations, spanning at least 2 different programs (not 6 repetitions of the same program)"* becomes:

> 6 structured development credits with distinct identity, where a program's identity is its **source plan** and a block's identity is **the span of weeks it occupies**. Blocks are distinct by construction — no two occupy the same week — so no de-duplication rule is needed for them.

This is also the cleanest available answer to what CAL Q14 was reaching for with its rejected taxonomy options: **the partition of calendar time is the distinctness rule**, and it needs no program-category tag and no PAS amendment.

### 3.4 §14.11 — the convergence table and its closing paragraph

Row label `**Program graduations**` → `**Structured development (graduations or self-directed blocks)**`. Signature-milestone rows "3 programs + 2 chapters" → "3 structured development credits + 2 chapters" (likewise 6 and 10). **No numeric value in the entire table moves.**

**Before:**
> **Every row is a hard requirement.** An athlete who satisfies all rows except one is not eligible for family promotion. There are no substitute paths — this is the multi-requirement convergence model. The value in any cell is the minimum that must be met; exceeding a threshold does not compensate for a deficit in another.

**After:**
> **Every row is a hard requirement.** An athlete who satisfies all rows except one is not eligible for family promotion. There are no substitute paths **between rows** — this is the multi-requirement convergence model. The value in any cell is the minimum that must be met; exceeding a threshold does not compensate for a deficit in another.
>
> **Within a single row, a threshold may admit more than one form of evidence where the locked architecture defines more than one.** Two rows do. *Cumulative active weeks* and *volume* admit imported history at 50% (CAL Q11, R-D46). *Structured development* admits program graduations and self-directed training blocks at parity (D-RCM-29, RSA §15's "programs **or deliberate programming**"). Admitting a second form of evidence for one row is not a substitute path: it never lets a row go unmet, and it never allows a surplus in one row to cover a deficit in another. That prohibition is unchanged and absolute.

### 3.5 §14.13 — Forge-native scope

Append: *"Self-directed training blocks are derived from Forge-native session records only. Whether imported sessions may form blocks, and at what credit, is deferred to the import workstream alongside Q3–Q6."*

### 3.6 §13.7 — sub-tier confirming evidence

Architect II→III ("1 completed program graduation") and Legend III→IV ("1 additional program graduation") read **structured development credits**, on the same rule as the gate. Otherwise an athlete promoted *into* Architect on a block would stall at II for want of a graduation the gate had already declared unnecessary.

---

## Section 4 — The Three Objections, Answered

### Objection A — §14.11 says "there are no substitute paths"

Read in full, the operative clause is *"exceeding a threshold does not compensate for a deficit in another."* That is a prohibition on **cross-row compensation**, and D-RCM-29 performs none: every row still binds independently, an athlete short on structured development is still not promoted, and no surplus anywhere covers any deficit anywhere.

**The decisive precedent is already locked and already shipped.** CAL Q11 gives `effectiveAW = nativeActiveWeeks + 0.5 × importedActiveWeeks` — the cumulative-active-weeks row *already* admits two different kinds of evidence, at different rates, inside one row. Nobody has ever read that as a substitute path, because it is not one. D-RCM-29 is structurally the same move at 100% instead of 50%. **If the import credit is compatible with §14.11, so is this.**

### Objection B — Identity Credibility (RS-D18)

RS-D18: *"The athlete must be able to honestly say the rank's identity statement when they receive the promotion."* RSA §15 Established currently lists "**Multiple graduated programs**" as required evidence. An athlete with zero graduations cannot say it.

**This objection is correct and cannot be argued away.** It would be incoherent to build a firewall protecting the honors path from a false permanent claim and then leave a false identity statement standing. **Therefore the identity statements are amended in the same change — see R-D48, §5.**

### Objection C — "Transformation Over Activity" / "NOT a streak app"

1. **A block is not activity — it is density sustained over a defined horizon.** At least eighteen days of meaningful work inside eight weeks is the literal shape of the two programs this product ships and calls structured development. If 6 × 3/week is structured development when a JSON file describes it in advance, it is structured development when the athlete does it without one. A session earns nothing; a week earns nothing; a month earns nothing.

2. **Nothing here is a streak, and that is a property of the algorithm rather than of the copy.** See §2. There is no counter to protect and no state that can be broken. Combined with the §14.7.1 prohibition on displaying an in-progress block, there is no number on any surface an athlete could feel pressure to defend.

---

## Section 5 — R-D48 (amends `Rank-System-Architecture.md`)

> **R-D48:** Structured development may be evidenced by graduated programs **or** by self-directed training blocks. This implements RSA §15's Craftsman identity test ("through programs **or deliberate programming**") at every rank requiring structured development, and resolves the conflict between RS-D8 ("Programs… are not required at every rank transition") and the Program Progression thresholds as computed in RCM §14.7. The Established and Legend identity statements are restated so RS-D18 continues to hold. Programs remain primary category #3 and remain the faster route — a graduation credits at completion with no minimum weekly density, where a block requires six qualifying weeks.

### RSA text changes

| Location | Before | After |
|---|---|---|
| §15 Craftsman | "through programs or deliberate programming" | **unchanged — this is the source authority for the whole amendment** |
| §15 Architect | "Structured development" | **unchanged — already type-neutral** |
| §15 Established | "Structured development through multiple programs" + "Multiple graduated programs" (two bullets saying one thing) | **"Structured development through multiple training blocks — programs graduated, or blocks the athlete ran themselves"** (single bullet; the duplicate is deleted) |
| §15 Legend | "multiple programs representing distinct development phases, not a single continuous program" | **"multiple programs or self-directed training blocks representing distinct development phases, not a single continuous effort"** |
| §15 Legacy | "multiple distinct phases of intentional growth, not one long program" | **unchanged — already type-neutral** |
| §14 milestone table | "multiple completed programs + multiple completed and sealed Chapters" | "multiple completed **structured development cycles** + multiple completed and sealed Chapters" |

Worth recording: **the RSA's own drafting drifts toward the neutral formulation as rank rises** — Craftsman says "or deliberate programming", Architect and Legacy are already type-neutral, and only the two middle tiers name programs specifically. That is corroborating evidence that "programs" in those tiers was shorthand rather than doctrine.

---

## Section 6 — What This Amendment Concedes

Three costs, recorded rather than papered over.

**1. This is a genuine widening.** A reader in June 2026 could reasonably have understood "Program graduations: 3" to mean three `ProgramGraduated` events, and D-RCM-29 changes what that cell admits. **We do not claim the old text already meant this.** It is acceptable because rank never decreases (RSA §3.3): the change can only add promotions, never revoke one. No athlete who was told "3 programs" and met it loses anything.

**2. The double count.** An athlete who graduates one 6-week program trained at ≥3 days/week earns a graduation *and* a block. Not fixed, deliberately: excluding program-attributed sessions would credit a program-running athlete **less per unit of training**, inverting RS-D5's "structure accelerates", and it would be a rule the athlete cannot see (RS-D16).

**3. At full parity, programs barely accelerate any more.** RS-D8 says programs "materially accelerate"; RSA §6.4 calls them "the most deliberate form of development available in Forge Legacy". After D-RCM-29 the only remaining acceleration is that a graduation credits instantly at completion with no minimum weekly density, where a block needs six qualifying weeks. That is a small margin. **The PO chose full parity knowingly**, having been shown the half-credit alternative (which would have mirrored `IMPORT_PRESTIGE_CREDIT`) and declined it. The lever exists if a future calibration pass wants it back.

**A fourth, structural:** category #3 (Program Progression) becomes partially collinear with category #1 (Consistency), since a block is reachable by consistency at a specific cadence. The answer is bounding, not denial: a block costs eight weeks minimum, so Legacy's 10 credits demand at least 80 of the athlete's 288 active weeks at ≥3 days/week — and blocks do nothing at all for the nine other rows (chapters, goal events, primary goals, improvement shape, native AW floor, recent engagement, time gate). The convergence model is what makes the collinearity harmless.

---

## Section 7 — What This Amendment Does NOT Change

- **No threshold value moves**, anywhere in §14.7 or §14.11. The change is to what evidence a row admits, not to how much it asks for.
- **D-RCM-18's canonical trigger set stays at four events.** A block completes on the save of a meaningful session, which `MeaningfulWorkSessionSaved` already covers. **No fifth trigger.**
- **No honor changes.** `first_program_graduated` and `programs_graduated_5|10|25|50` are byte-identical and continue to read graduated program records only.
- **No block honors are created.** The entire firewall is that a block never becomes a permanent claim about a specific act.
- **No persisted block entity.** No table, no column, no migration. Persisting blocks would create a second source of truth that could drift from the sessions — and, worse, something `honor_metrics()` could one day be pointed at. The firewall is strongest when there is nothing to point at.
- **No import credit rule for blocks.** Deferred (§3.5), open alongside Q3–Q6.
- **RSA §17.2 Guided Transparency** is not re-litigated. The boundary was crossed deliberately when the What's Next standards shipped, with the rationale in that module's own header.

---

## Section 8 — Downstream Impact

| Surface | Impact |
|---|---|
| P-2 What's Next (`rank-progression.tsx`) | Two rows restated: "Programs or blocks", "Different programs or blocks". Two sub-tier evidence strings restated. No component change. |
| `src/domain/rank/*` | New `RankSignals.selfDirectedBlocks`; `countSelfDirectedBlocks`; `structuredDevelopment` / `distinctStructuredDevelopment` used by the gate, the sub-tier evidence and the standards screen alike. |
| `src/data/rank-live.ts` | `distinctProgramGraduations` now derives from `programs.source_definition_id` (CAL Q14) instead of aliasing the total. Promotion is clamped to one family per refresh so each is individually experienced (RS-D12) — see §9. |
| Honor Evaluation Service | **None.** Verified by construction and asserted by test. |
| Migrations | **None.** |

---

## Section 9 — One Family Per Refresh (RS-D12)

`refreshRank` fires exactly one M-1 ceremony per run, for the family newly entered — so an athlete crossing two or three families in a single evaluation was silently carried past the ones between. That violates RS-D12 (*"every promotion must be individually experienced"*), RSA §12 and D-RCM-24.

This is a **pre-existing** defect (a large import would have done the same), but D-RCM-29 turns it from theoretical into likely: a cohort of athletes held at Craftsman by the program gate can clear two families at once on their first evaluation after this ships. Promotion is therefore clamped to one family per refresh, walking the ladder over consecutive visits with a ceremony each. **The proper fix is the promotion queue (D-RCM-24), which remains unbuilt and is its own architecture slice.**

---

## Section 10 — Product DNA Alignment

| Principle | How this amendment supports it |
|---|---|
| **Legacy First** | The permanent record stops discounting training that happened. A block is recognition of work done, not a scoring device. |
| **Identity Over Performance** | Rank stops asking "did you use our feature?" and asks "did you develop?" — which is what it claimed to ask. |
| **Accountability Without Shame** | The window tolerates illness, injury and life. Nothing resets; nothing is lost. |
| **Transformation Over Activity** | A session, a week and a month all earn nothing. Only sustained density over a program-length horizon earns a credit. |
| **Recognition Before Gamification** | No counter, no streak, no in-progress indicator — prohibited in the text, not merely unbuilt. |
| **Progress Without Pressure** | The athlete is never asked to declare, commit, or protect anything. Blocks are noticed, not demanded. |
| **History Cannot Be Rewritten** | The honors firewall: a block never becomes a false permanent claim about an act that did not occur. |

---

## Section 11 — Reconciliation Ledger

| Document | Required reconciliation |
|---|---|
| `Rank-Computation-Model.md` | §14.7 title/table + new §14.7.1 · §14.11 row label + closing paragraph · §14.13 append · §13.7 sub-tier evidence · D-RCM-29 in the decision record · version → v1.1 |
| `Rank-System-Architecture.md` | §14 milestone table · §15 Established + Legend identity statements · R-D48 in the decision record · version → v1.1 |
| `Rank-Calibration-Decisions.md` | No change. Q11 and Q14 are cited, not altered. |
| `Honor-Catalog-v1.0-LOCKED.md` | No change — recorded here so the absence is deliberate. |
| `Forge-Legacy-Master-Status.md` | Recently Completed entry. |

---

## Section 12 — Validation Checklist

- [ ] An athlete with **zero graduated programs** and sustained training reaches Architect, and can reach Legacy.
- [ ] That athlete has **no program honor** in `/honors` — not "First Program Graduated", not any `programs_graduated_*`.
- [ ] Six weeks at 3 days/week = 1 credit. Six weeks at 2 days/week = 0.
- [ ] A deload week inside a run of hard weeks does **not** destroy the block around it.
- [ ] Six qualifying weeks spread over nine calendar weeks is **not** a block.
- [ ] Twelve consecutive qualifying weeks = 2 credits; seven = 1.
- [ ] Three sessions on one day, six weeks running = **0** (distinct days, not sessions).
- [ ] A year away destroys nothing already earned.
- [ ] No screen, notification or share artefact shows partial progress toward a block.
- [ ] What's Next reads "Programs or blocks" and its number equals the number that promotes.
- [ ] Sub-tier copy no longer tells a program-less Architect they need "a program finished".
- [ ] Rank rises **one family per visit**, with a ceremony each.
- [ ] No threshold value in §14.7 or §14.11 differs from v1.0.1.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*Rank Computation Model Amendment 002 — Self-Directed Training Blocks*
*Amends `Rank-Computation-Model.md` v1.0.1 → v1.1 and `Rank-System-Architecture.md` v1.0 → v1.1*
*August 2026 · Authority: Rank-System-Architecture v1.0, Rank-Calibration-Decisions v1.0, FORGE_LEGACY_PRODUCT_DNA*
*Status: LOCKED*
