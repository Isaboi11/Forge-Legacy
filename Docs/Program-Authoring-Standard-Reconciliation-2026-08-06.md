# Program Authoring Standard — Reconciliation Audit

**Date:** 2026-08-06
**Scope:** `Program-Authoring-Standard-v1.0.md` (v1.4 at audit start) against `src/domain/training/schema.ts`,
the 14 shipped program definitions, and the four decisions the product owner made in the last week.
**Asked for:** *"I've now found five places where your own Standards contradict each other. Each got
patched locally. Nobody has looked at them together."*

**Method:** every PAS decision (PAS-D1..D12) read against the shipped model and measured against all 14
definitions where the rule was measurable. Numbers below are counted, not estimated; the counting
convention for each is stated.

---

## Verdicts at a glance

| # | Finding | Verdict |
|---|---|---|
| 1 | **The Standard describes a schema and a pipeline that were never built** | ⛔ **Systemic — needs PAS v2.0**, not an amendment |
| 2 | RPE (PAS-D3, D5, D12) has no field, no program, and has been answered differently | ⛔ Real — folds into v2.0 |
| 3 | Mandatory deload (PAS-D7/D8) vs volume floor (PAS-D11) | ✅ **CLOSED — Amendment 006** |
| 4 | PAS-D11 is a per-session rule read against per-week training | ⚠️ **OPEN — product decision, 34 live sessions** |
| 5 | Warm-up standard vs the product owner's 2026-08-06 instruction | ✅ **CLOSED — Amendment 005** |
| 6 | Cool-down required with no field to hold one | ✅ Closed 2026-08-06 — Amendment 003 |
| 7 | Superset encoding via `notes` | ✅ **CLOSED — Amendment 001, merged today** (had sat unmerged) |
| 8 | Session duration (§10.2) vs Mobility Foundation week 1 | ↩️ **WITHDRAWN — I was wrong** |
| 9 | The per-muscle band vs the coaching cap | ↩️ Not a PAS conflict — belongs to the Blueprint |
| 10 | PAS-Amendment-002 has no amendment document | ⚠️ Governance gap, recorded |

**Four were closable and are closed. One needs the product owner. One I withdrew. One is bigger than an
amendment.**

---

## Finding 1 — The Standard governs a product that was never built ⛔

This is the finding that reframes all the others, and it was not on the list of five.

**§2.3 describes an `ExercisePrescription` that does not exist.**

| PAS §2.3 says the fields are | The shipped `schema.ts` has |
|---|---|
| `exerciseName` (resolved at import) | `catalogKey` + `displayName` |
| `section` (`WARM_UP`/`MAIN`/`COOL_DOWN`) | *(none — `ProgramWorkout` has `warmup` and `main` as separate arrays)* |
| `order` | *(array position)* |
| `durationSeconds` · `restSeconds` | `durationSec` · `restSec` |
| `weightValue` + `weightUnit` | *(none — load is `percentOfMax` / `percentScheme` / `percentOf`)* |
| `distanceValue` + `distanceUnit` | `targetMi` · `targetSec` (cardio only) |
| **`notes` (max 200 chars)** | **deliberately absent, and documented as such** |
| — | `repsMax` · `per` · `repScheme` · `unit` · `optional` · `substitution` · `intensity` |
| — | `groupId` · `groupName` · `groupKind` · `groupRounds` · `groupCapSec` |
| — | `kind` · `activity` · `modality` |

**`ProgramSlot` — the unit §2.2 specifies in detail — appears nowhere in `src`.** The real hierarchy is
`ProgramDefinition → ProgramBlock → ProgramWorkout`.

**The Google Sheets authoring template (§12), the import tool (§16 Group A, "Automated — Import Tool
Will Catch These"), and the import-to-publish workflow (§17) do not exist.** Two programs came through
`src/domain/training/ingest/` (a `.docx` reader). **The other twelve were authored directly as JSON**
and are gated by `programs.test.mjs` — a `node --test` acceptance suite the Standard has never heard of.

**Why this matters more than any single contradiction:** several of the "contradictions" on the original
list are downstream of this one. RPE-in-notes, rep-range-upper-bounds-in-notes and supersets-in-notes are
all the same defect — *a field that does not exist*, relied on by three separate rules. `schema.ts` says
why it does not exist, and says it about coaching notes specifically:

> NO per-exercise coaching note field, deliberately. […] a `notes` here would be dropped on the way
> across and rendered by nothing.

**Verdict: not amendable.** Amending §2, §6, §12, §16 and §17 individually is a rewrite pretending to be
five patches. **The PAS needs a v2.0 authored against the model that shipped** — describing the JSON
authoring path, the `node --test` gate, and the fields that actually exist (`repsMax`, `per`,
`repScheme`, `percentOfMax`, the group fields, the cardio fields), none of which the Standard mentions
and all of which programs depend on. Until then the Standard is authoritative on *policy* (naming,
description, deload, volume, quality) and unreliable on *mechanism*.

---

## Finding 2 — RPE: a rule with no field, no program, and a different answer already given ⛔

**PAS-D3** encodes RPE in `notes`, permitted for STRENGTH and HYPERTROPHY at INTERMEDIATE/ADVANCED.
**PAS-D5** fixes the exact format. **PAS-D12** calls a dedicated `rpe` field "the correct long-term
solution" and "the first post-launch prescription enhancement".

Three things are true:

1. **There is no `notes` field.** PAS-D3 and PAS-D5 are unsatisfiable (Finding 1).
2. **No shipped program contains the string "RPE."** Counted: 0 across all 14 definitions — including
   Muscle Building Intermediate, which is INTERMEDIATE HYPERTROPHY, the exact case PAS-D3 permits.
3. **The question was asked and answered differently, this month.** The 2026-08-06 coaching audit found
   that not one of the thirteen programs told the athlete how hard to push. The first proposal was a
   per-exercise effort field; **the product owner objected that it would clutter the workout screen, and
   was right.** The answer shipped instead was that **the rep range IS the instruction** — *8–12, and if
   you can beat 12 the weight is too light* — rendered by machinery that already existed.

**Verdict: real, and not urgent.** Nothing is broken in the catalog because nothing uses it. PAS-D12's
recommendation is superseded by a product decision and should be rewritten in v2.0 rather than amended
now — the honest replacement text is "effort is communicated by the rep range; a dedicated field was
proposed on 2026-08-06 and declined."

---

## Finding 3 — Mandatory deload vs the volume floor ✅ CLOSED

PAS-D7 mandates a deload at 7+ weeks. PAS-D8 cuts primary compound sets 40–50%. PAS-D11 sets a floor.
A HYPERTROPHY program at the middle of its own band (26 sets) cutting 45% lands at 14, against a floor
of 18. **No set count satisfies all three** — clearing the floor after the cut would require working
weeks at 33 sets, above the band's ceiling of 30.

**Live in the catalog:** 7 sessions in 2 programs, one of them **locked** with it open.

**Closed by Amendment 006** — the floor is scoped out of deload weeks; the ceiling still applies
everywhere. Same principle Amendment 004 had already adopted for the per-muscle bands (PAS-A4-D3).

---

## Finding 4 — PAS-D11 is a per-session rule measured against per-week training ⚠️ OPEN

Surfaced while measuring Finding 3, and the more consequential half of it.

Counting a circuit's rounds as sets (which PAS-D11 permits for CONDITIONING), **41 sessions across 6
programs sit below their category floor. Only 7 are deload weeks.** The other **34** are working weeks:

| Program | Band | Sessions below | Range |
|---|---|---:|---|
| Squat Ascent Intermediate | STRENGTH 15–25 | 10 | 13–14 |
| Bench Approach Intermediate | STRENGTH 15–25 | 11 | 14 |
| Deadlift Measure Intermediate | STRENGTH 15–25 | 12 | 12–14 |
| Iron & Engine | CONDITIONING 12–24 | 11 | 9–11 |

**These programs are not under-training anyone.** They run **five and six days a week**. Fourteen sets
across five sessions is 70 sets in a week — more than a three-day program at 22 sets a session, which
passes the guardrail comfortably. **The floor is per-session, the training is per-week, and the rule
therefore penalises frequency for being frequency.**

§10.1's written-deviation mechanism exists for precisely this, and **none of the four programs filed
one.** So there are two separate problems: a guardrail that may be scoped wrong, and four programs that
took an undeclared exemption from it.

**Verdict: OPEN — needs a product decision, deliberately not made here.** It changes a locked guardrail
for the whole catalog and for the 10 unbuilt programs. The options:

- **(a)** Read PAS-D11 per week above a frequency threshold (e.g. ≥5 sessions), keeping the per-session
  ceiling. Closes all 34 and matches how the programs are actually trained.
- **(b)** Keep the per-session rule and require the four programs to file deviation notes. Honest,
  cheap, and leaves the same argument to be had every time a 5-day program is authored.
- **(c)** Lower the STRENGTH and CONDITIONING floors. **Not recommended** — it weakens the guardrail for
  3-day programs to accommodate 5-day ones.

**Recommendation: (a).**

---

## Finding 5 — The warm-up standard vs the instruction that broke it ✅ CLOSED

The product owner's 2026-08-06 instruction retired 244 of 405 warm-up items. It was carried out
correctly and **§9 was never updated**, leaving **114 of 244 non-MOBILITY sessions — 47% of the
catalog** — in breach of a LOCKED standard: 19 with no warm-up at all against PAS-D9's "Required", and
95 below §9.3's floor of three.

**Closed by Amendment 005.** Required → "required where authorable"; count 3–6 → 1–4; two new binding
rules (must resolve to the **visible** 721; no ramp sets) that catch different things; PAS-D10
reconciled to `WarmupItem`.

**This is the purest instance of the project's recurring failure and worth naming precisely.** It is not
"an amendment authored and left unmerged." It is a **decision made, implemented in code, and guarded by
tests, that never reached the rulebook governing it** — so the document went on instructing authors to
do the thing that had just been removed, and the next author following §9.3 would have been *more* wrong
than the ones who wrote nothing.

---

## Finding 6 — Cool-down ✅ CLOSED 2026-08-06 (Amendment 003)

`ProgramWorkout` has `warmup` and `main` and no third section, so no in-repo program could ever author a
cool-down while PAS-D9 required one for four categories. It had failed silently twice before anyone
changed the rule. Recorded here for completeness; nothing further to do.

---

## Finding 7 — Superset encoding ✅ CLOSED (found unmerged during this audit)

§10.3 still instructed authors to indicate supersets in `notes` — a field that does not exist, for a
feature the model has supported since migration 0106 (`groupKind: 'superset'`).
**`Program-Authoring-Standard-Amendment-001` (LOCKED 2026-08-03) had never been merged into §10.3.**

Merged today, with the original retained beneath a superseded marker. **The audit found this; nobody
reported it** — which is the argument for doing an audit like this on a schedule rather than when
somebody notices five things.

---

## Finding 8 — Session duration ↩️ WITHDRAWN

**I claimed this as the fourth Standard conflict when authoring Mobility Foundation. It is not a
conflict, and the claim is withdrawn.**

Mobility Foundation's week 1 runs 8.0–9.6 minutes against §10.2's MOBILITY range of 10–30. But §10.2
says of itself:

> The following ranges are **quality-review guidelines, not import rules**. […] **Programs outside the
> range** require a written note in the authoring sheet explaining why.

The Standard anticipated exactly this case and provided the mechanism. The Design Record §7 **is** that
written note. **The program is compliant, by the route the Standard specifies for it.**

Recorded rather than quietly deleted, because the error is instructive: I read a range as a rule and
called a documented deviation a contradiction. The dashboard and commit message `95035d1` both carry the
over-claim; this document is the correction. **A finding argued down is worth more than one that quietly
disappears** — and the same standard has to apply when the finding is mine.

---

## Finding 9 — The per-muscle band vs the coaching cap ↩️ Not a PAS conflict

Muscle Building Intermediate's capped lateral raise sits at 8 sets/week against a Blueprint band with a
floor of 10. That is a conflict between a **Blueprint** and a coaching judgement, not between two PAS
rules — and Amendment 004 already settled the counting convention it turns on. It belongs to
`Muscle-Building-Intermediate-Blueprint-v1.0.md`, where it is recorded. No PAS change.

---

## Finding 10 — An amendment with no amendment ⚠️

`PAS-Amendment-002 (Methodology Pluralism)` is cited in the v1.4 change log, in §7.1, and in the
document footer. **There is no `Program-Authoring-Standard-Amendment-002-*.md` in `Docs/Amendments/`.**
It was applied directly and the record of *why* exists only as change-log prose.

Minor, and the opposite failure to the usual one: normally the amendment exists and the merge does not.
Recorded so the numbering gap is not later read as a lost file. **Also fixed today:** the change log had
no entries for Amendments 003 and 004 either, both of which were applied on 2026-08-06 — added
retroactively as v1.5.

---

## The systemic finding, restated

The original phrasing was: *the Standards encode volume and frequency and nothing encodes stimulus
quality — which is how a program can be 100% compliant and wrong.* That is true and it survives this
audit.

**But the audit found a second one underneath it, and it explains more of the evidence:**

> **The Standard describes a product that was never built, so its mechanism rules degrade into fiction
> while its policy rules stay live.** Three separate rules depend on a `notes` field that does not
> exist. One requires a `COOL_DOWN` section that cannot be stored. One specifies a Google Sheet feeding
> an import tool that nobody wrote. Meanwhile naming, description, deload, volume and the quality
> criteria are all still doing real work.

That mixture is the hazard: **an author cannot tell which half they are reading.** When a compliance
table contains a row nobody can satisfy, authors learn to skip rows — and the next genuine violation
looks exactly like the impossible one. Amendment 003 said this about the cool-down. It turned out to be
the general case.

**Both findings point the same way for the next 10 unbuilt programs:** the Standard is trustworthy on
*what a good program is* and unreliable on *how to write one down*. v2.0 should be authored against
`schema.ts` and `programs.test.mjs`, which is where the real gate has been for months.

---

## What changed today

| Artifact | Change |
|---|---|
| `Program-Authoring-Standard-Amendment-005-Warmup-Reconciled.md` | **New — LOCKED.** PAS-A5-D1..D4 |
| `Program-Authoring-Standard-Amendment-006-Deload-Exempt-From-Volume-Floor.md` | **New — LOCKED.** PAS-A6-D1..D4 |
| `Program-Authoring-Standard-v1.0.md` | → **v1.6.** §9.1, §9.2, §9.3, §10.1, §10.3, §16 Group B, §20 (PAS-D9, D10, D11), §21 change log (v1.5 backfilled, v1.6 added) |
| This document | New — the audit, and the record of the two findings withdrawn |

**No program content changed. No JSON was re-authored. Nothing an athlete sees is different.** Every
change moves a line in a document to match what the software, the tests, and the product owner had
already decided.

## Still open

1. **Finding 4** — PAS-D11 per-session vs per-week. Product decision. 34 live sessions. Recommendation (a).
2. **Finding 1 / Finding 2** — PAS v2.0 against the shipped model. Large, and the highest-value
   documentation work left in the program ecosystem.
3. **`Programs/Forge-Program-Production-Standard.docx`** — §warm-up is stale in the same way §9.3 was,
   and is **data-protected**: flagged, never edited. Needs the product owner's annotation. Outstanding
   since 2026-08-06.

---

*Forge Legacy — Program Authoring Standard Reconciliation — 2026-08-06*
