# Iron & Engine — Lock Record

**Program:** Iron & Engine
**Version:** 1.0
**Shape:** 6 weeks · **6 days per week** · 36 sessions · Advanced
**Status:** ⛔ **NOT LOCKED** — awaiting product-owner Lock Approval
**Date authored:** 2026-08-03
**Design Record:** `Iron-and-Engine-Design-Record.md`
**Implementation:** `src/domain/training/programs/iron-and-engine.json`

---

## Workflow completion

| Phase | Deliverable | Status |
|---|---|---|
| 1 — Research | Research & Benchmark Analysis | ✅ Design Record §1 |
| 2 — Blueprint | Blueprint v1.0 | ✅ Design Record §2 |
| 3 — Exercise Selection Architecture | Selection Architecture | ✅ Design Record §3 |
| 4 — Authoring | Authoring Draft | ✅ all 3 blocks, **18 workouts / 36 sessions** (6 weeks × 6 days) |
| 5 — Coaching Audit | Coaching Audit Report | ✅ Design Record §5 — 7 findings, **re-audited at 6 days** |
| 6 — Revision | Revised Draft | ✅ Design Record §6 — 3 applied, 3 accepted with mitigations, 1 open |
| 7 — PAS Compliance Review | Compliance Review | ⚠️ Design Record §7 — **8 of 9 met**, Coaching Notes not met (schema gap); Recovery met by design with a stated residual risk |
| 8 — Lock Recommendation | Recommendation | ✅ Design Record §8 — recommends LOCK |
| 9 — **Lock Approval** | **PO signature** | ⛔ **OUTSTANDING** |

## Documentation Requirements

| Required | Present |
|---|---|
| Program Source Document | ✅ folded into the Design Record (no `.docx` — see Design Record §0) |
| Design Record | ✅ `Iron-and-Engine-Design-Record.md` |
| Lock Record | ✅ this file |

## Catalog Index

`Programs/Program-Catalog-Index.docx` has **not** been edited. It is an authoritative `.docx` under the
repository's data-protection rule (append/annotate only, and never without confirmation), and the entry
it needs is a product-owner edit, not an automated one.

**The edit it needs, once locked:**

- Under **Hybrid**, change `□ Strength + Conditioning Builder` to `✓ Iron & Engine`
  *(or add `✓ Iron & Engine` as a new row and leave the planned Builder slot open)*
- **Locked Programs:** 1 → 2
- **Catalog Completion:** 4% → 8%

## What is true in the app today

The program **ships and is adoptable**: it appears in `getProgramDefinitions()`, so it is offered by
onboarding recommendation, listed on the Workouts tab, and can be started — which writes it out as a real
`programs` row through `adoptCatalogProgram`, exactly as the two Foundation programs do.

It ships **un-LOCKED and says so** in its `status` string, and
`src/domain/training/programs/__tests__/programs.test.mjs` asserts that string. Promoting it to `LOCKED`
without a signature on this file will fail the test suite.

## Signature

| | |
|---|---|
| **Authored by** | Claude (agent), 2026-08-03 |
| **Coaching audit** | self-audit, recorded in full at Design Record §5 — **not an independent human review** |
| **Lock approved by** | ☐ ______________________  Date: ____________ |

To approve: replace the `status` string in `iron-and-engine.json` with `LOCKED`, update the assertion in
`programs.test.mjs` (the test names what it is guarding), sign above, and make the Catalog Index edit.
