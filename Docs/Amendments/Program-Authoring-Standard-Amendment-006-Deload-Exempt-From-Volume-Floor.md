# Program Authoring Standard — Amendment 006: A Deload Week Is Exempt From the Volume Floor

**Amends:** `Program-Authoring-Standard-v1.0.md` §10.1 (PAS-D11), §20 (PAS-D11 row), §16 Group B checklist
**Status:** 🔒 LOCKED
**Date:** 2026-08-06
**Related:** Amendment 004 §PAS-A4-D3 (the same scoping principle, decided for the Blueprint bands) ·
`Program-Authoring-Standard-Reconciliation-2026-08-06.md` Finding 3

---

## Two locked rules that cannot both be obeyed

**PAS-D7** makes a deload **mandatory** for any program of 7 weeks or more.
**PAS-D8** says a deload reduces primary compound sets by **40–50%**.
**PAS-D11** sets a **floor** on sets in `MAIN` — 18 for HYPERTROPHY, 12 for CONDITIONING, 15 for STRENGTH.

A HYPERTROPHY program running at the middle of its own band — 26 sets — and cutting 45% lands at 14.
The floor is 18. **Obeying PAS-D7 and PAS-D8 puts the author in breach of PAS-D11, every time, by
construction.** There is no set count that satisfies all three: to clear the floor after a 45% cut, the
working weeks would have to run at 33 sets, which is above the band's ceiling of 30.

## It is not hypothetical — it is live in the shipped catalog

Measured across all 14 shipped definitions, counting a circuit's rounds as sets (which PAS-D11 permits
for CONDITIONING):

| Program | Category band | Deload sessions below the floor |
|---|---|---|
| **Muscle Building Intermediate** | HYPERTROPHY 18–30 | **4** — Week 9 at 13, 15, 13, 15 |
| **Athletic Conditioning Foundation** | CONDITIONING 12–24 | **3** — Week 7 at 11 |

Seven sessions, in two programs, both of which were reviewed and one of which was **locked** with this
open. Neither Design Record flags it, because neither author noticed they were being asked to do two
contradictory things — which is what a contradiction between locked rules reliably produces.

## What replaces it

**PAS-A6-D1 — Deload weeks are exempt from the PAS-D11 volume FLOOR.**

The floor exists to guarantee a training stimulus. **A deload's purpose is to remove one.** Applying a
minimum-stimulus rule to the week whose job is to withdraw stimulus is a category error, and it is the
only reading under which the three rules conflict at all.

**PAS-A6-D2 — The CEILING still applies, in every week.**

Nothing here permits a bigger session. The ceiling protects the athlete from a program that asks too
much; the floor protects them from one that asks too little. Only the second is suspended, and only in
the week that is supposed to ask less.

**PAS-A6-D3 — The 40–50% reduction is measured against the preceding working week, not against the
band.** This was already PAS-D8's wording and is restated because it is what makes the exemption safe: a
deload cannot be arbitrarily small. It is anchored to the week before it, so a program cannot use this
amendment to hide a week of nothing.

**PAS-A6-D4 — A deload week still owes the same session count.** PAS-D8's frequency rule is untouched.
The athlete trains the same number of times; each session is smaller.

## Why this shape, and not a lower floor

The alternative was to lower the PAS-D11 floors so a deload fits underneath. That would have been wrong:
the floor is correct for working weeks, and lowering it to accommodate one week in eight would weaken
the guardrail for the other seven. **Scope the rule instead of weakening it.**

This is the same move Amendment 004 already made for the per-muscle weekly bands — **PAS-A4-D3: "The
band applies to a program's WORKING blocks, not to every week."** That decision was reached
independently, three programs earlier, for the same reason. This amendment brings PAS-D11 into line with
a principle the Standard had already accepted elsewhere.

## What this changes in the catalog, today

| Program | Before | After |
|---|---|---|
| **Muscle Building Intermediate** | 4 sessions in breach of PAS-D11 | **compliant** |
| **Athletic Conditioning Foundation** | 3 sessions in breach of PAS-D11 | **compliant** |

No program content changes. No JSON is re-authored. Nothing an athlete sees is different.

## ⚠ What this does NOT fix

**34 further sessions sit below their PAS-D11 floor and are NOT deload weeks** — the three
percentage-loaded specialization blocks (33 sessions at 12–14 against a STRENGTH floor of 15) and Iron &
Engine (11 sessions at 9–11 against a CONDITIONING floor of 12).

Those are a different question and this amendment deliberately leaves them open. They train **five and
six days a week**: 14 sets × 5 sessions is 70 sets in a week, more than a three-day program at 22 sets a
session. **PAS-D11 is a per-session rule being applied to programs whose training reality is per-week**,
and it silently penalises frequency. §10.1's written-deviation mechanism exists for exactly this and
**none of the four programs filed one** — which is its own finding.

Resolving that means deciding whether PAS-D11 should be read per week above a frequency threshold. That
is a product decision, it changes a locked guardrail for the whole catalog, and it is recorded in the
Reconciliation (Finding 4) rather than decided here.

## Traceability

- §10.1 (PAS-D11) — exemption paragraph + banner citing this file
- §20 PAS-D11 row — updated
- §16 Group B — the volume-guardrail checklist line now names the deload exemption
- `Programs/Forge-Program-Production-Standard.docx` — **not edited.** Data-protected (append/annotate
  only). If it restates PAS-D11 it needs the product owner's annotation

---

*Forge Legacy — Program Authoring Standard Amendment 006 — 2026-08-06*
