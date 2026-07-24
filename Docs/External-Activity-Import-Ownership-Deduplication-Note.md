# External Activity Import — Ownership & De-Duplication Architecture Note

## v1.0 | June 2026

**Status:** ARCHITECTURE NOTE — no schemas, APIs, database tables, or implementation details authored; no redesign of Activity History, Progress, Goals, Rank, or Honors performed. This note resolves exactly the dependency named by `External-Activity-Import-Architecture-Evaluation.md` §10: ownership and de-duplication principles for imported activities, ahead of any OAuth, API, Connected Apps, or provider-specific work.

**Type:** Small Architecture Note

**Predecessor:** `External-Activity-Import-Architecture-Evaluation.md` v1.0 — Section 10, Workstream 1.

**Read in full for this pass:** `External-Activity-Import-Architecture-Evaluation.md`, `Architecture-Amendment-001-Import.md`, `Exercise-001-Custom-Exercise-Architecture.md`, `WSR-001-Workout-Share-Result-Architecture.md`, `Amendments/Monetization-Architecture-Amendment-001.md`, `P-4-Settings-Root-Architecture.md`, `Rank-Computation-Model.md`, `P-2-Progress-Hub-Architecture.md`, `Amendments/Critical-Decisions-Amendment-001.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`.

---

## Section 1 — Ownership Principles

**What constitutes ownership of an imported activity:** the act of import completing — the athlete confirming the activity should be brought into Forge Legacy — creates a new, fully-owned Forge Legacy record. This is the same ownership moment the predecessor evaluation already recommended (§4) and the same principle `Architecture-Amendment-001-Import.md` §3.5 already locked for the unrelated Program/Chapter import feature: "All imported programs and chapters are fully owned by the importing athlete. Import creates new records — not references to external sources." This note extends that exact principle to activities rather than restating it from scratch.

**Do imported activities become native Forge Legacy records?** Yes, unconditionally. An imported activity is a normal activity record of its `ActivityType` — the same record any manually-logged session of that type would be. There is no separate "imported activity" entity, table, or treatment. This is required for Rules 10–14 to hold: Activity History, Progress, Goals, Rank, and Honors can only continue requiring zero redesign (the predecessor evaluation's §6 finding) if imported activities are indistinguishable, structurally, from manually-logged ones.

**Do imported activities remain linked to external systems?** A *reference* may persist (Section 2 — for attribution and de-duplication purposes only), but never a *live* link. There is no ongoing dependency on the external platform remaining reachable, authenticated, or even continuing to exist. Precedent: `WSR-001-Workout-Share-Result-Architecture.md`'s existing pattern — "`WorkoutShare` does not create foreign keys into `WorkoutSession`, `ProgramInstance`, etc. — `sourceEntityId` is a reference for navigation, not a referential integrity constraint. This preserves the ability to delete or archive source records without affecting share history." Applied here: an imported activity's reference to its origin is informational, never load-bearing. Disconnecting a Strava account, revoking access, or Strava itself disappearing must never affect an already-imported activity's validity, editability, or standing in History/Progress/Goals/Rank/Honors.

**Does ownership change after import?** No. Ownership is established once, at creation, and never reverts to the external source or changes hands. This is the principle that resolves Scenario C (re-import) and Scenario D (edit) in Section 4 below: once owned, the external source has no further authority over the record — it cannot overwrite it, revoke it, or supersede an athlete's edit to it.

---

## Section 2 — Source Attribution Model

**Should a source marker exist?** Yes. Recommend extending the precedent already established by `Exercise-001-Custom-Exercise-Architecture.md` §5.1, which attaches a `source` attribute to `ExerciseDefinition` (`source: 'CUSTOM' | 'FORGE'`) that is set once and never changes. The same shape applies cleanly here: an activity carries a record of where it came from — manual entry, or the specific external platform — set once, at creation.

**Should athletes see where an activity originated?** Yes, recommend a lightweight, visible indicator (e.g., on Activity Detail), in the same spirit as Exercise-001's `[Custom Exercise]` / `[Deleted Exercise]` tombstones making origin legible without the athlete needing to ask. This serves a real trust purpose the predecessor evaluation already named (§4, §1.2): an athlete who connects a watch specifically to bring in verified data should be able to tell which entries came from that data and which they typed by hand. Attribution must remain informational only — it must never gate or alter behavior in Progress, Rank, or Goals (Section 6).

**Should source information survive edits?** Yes. Source is immutable once set — the same rule Exercise-001 already applies to its own `source` field ("`source` and `authorId` are immutable after creation"). An athlete correcting a distance, adding a note, or changing the date on an imported activity does not change, clear, or weaken its source attribution. This matters beyond display: Section 7 depends on source surviving edits so that a later re-import attempt can still recognize the record as already accounted for.

---

## Section 3 — De-Duplication Philosophy

Before any detection mechanism is designed (explicitly out of scope, per Rule 9 and the objective's own instruction), the governing principle must be settled.

**What is considered the same activity?** Conceptually: **one real-world session of physical effort**, regardless of how many records describe it or how many sources reported it. "Same activity" is a question about the world, not about matching fields in a database — a single run an athlete completed on a Tuesday morning is one activity whether it is described once, twice, or three times across a manual entry, a Garmin sync, and a Strava sync.

**What is considered a different activity?** Two sessions that are genuinely distinct real-world events, even when superficially similar — e.g., two separate short runs completed on the same day, or a walk and a hike on the same afternoon. Superficial similarity (same type, same date) is not sufficient grounds to treat two sessions as duplicates; the governing question is always whether they correspond to one effort or two.

**What outcome should occur when duplicates are detected?** The athlete's Forge Legacy history should reflect the real-world session **exactly once**, regardless of how many sources described it. This implies three sub-principles, stated here without prescribing how any of them is implemented:

1. **Single count, always.** No real-world session should ever contribute more than once to Progress, Goals, Rank, or Honors.
2. **No silent data loss.** Resolving a duplicate must not destroy information the athlete might reasonably want (e.g., a richer GPS-sourced record arriving after a sparse manual entry) without that being a deliberate, recoverable outcome — not an accidental side effect of detection logic.
3. **Resolution favors the athlete's visibility over silent automation.** Where the system can confidently recognize a duplicate, it should resolve quietly and correctly toward principle 1. Where confidence is genuinely ambiguous, the athlete should not be left worse off — but designing the exact boundary between "confident" and "ambiguous" is detection-algorithm work, explicitly deferred.

---

## Section 4 — Duplicate Scenarios

Per the objective's instruction, this section determines desired outcomes and implications only — no detection algorithm is designed for any scenario.

### Scenario A — Manual entry, then later import of the same activity

- **Desired outcome:** the activity counts once. The manually-created record, having been athlete-authored first, is the one that continues to exist; the later import attempt is recognized as describing the same real-world session and does not create a second record.
- **Ownership implications:** the manual record's ownership (already established at its own creation, per Section 1) is undisturbed. The import does not "claim" or convert the manual record into an imported one — its source remains manual (Section 2's immutability principle applies symmetrically here).
- **Data integrity implications:** prevents the most likely single cause of inflated Progress/Rank/Goals/Honors data named by the predecessor evaluation (§5, Scenario A) — this is the scenario the entire note exists to close.

### Scenario B — Import from multiple connected platforms

- **Desired outcome:** still exactly one record, even though no manual anchor exists to establish precedence the way Scenario A's manual entry does. This is the harder case: two external records of the same real-world session, both equally "first" from the athlete's point of view.
- **Ownership implications:** ownership still resolves to a single record once recognized as a duplicate (Section 1's "single owned record" principle), but *which* of the two external records becomes that single owned record is the open question Section 5 addresses directly — this scenario is the reason Section 5 exists as its own section rather than folding into Section 3.
- **Data integrity implications:** identical risk profile to Scenario A, but the predecessor evaluation's Section 2 finding (Strava's aggregation effect re-surfacing Garmin-originated activity) means this scenario is the *likely common case* for any athlete using more than one connected source, not an edge case.

### Scenario C — Re-import of a previously imported activity

- **Desired outcome:** idempotency. Re-importing — whether from a reconnected source, a delayed sync, or a refresh action — must never create a second Forge Legacy record for an activity already imported once.
- **Ownership implications:** directly confirms Section 1's "ownership never reverts" principle. The original imported record, now athlete-owned, is authoritative; a later re-import attempt has no standing to create a competing record or to silently revise the existing one.
- **Data integrity implications:** the simplest of the four scenarios conceptually, because it involves only one source describing its own activity twice — no cross-source ambiguity (unlike B) and no manual-vs-external precedence question (unlike A).

### Scenario D — Imported activity edited by the athlete

- **Desired outcome:** the edit is preserved permanently. The record does not revert to its originally-imported values, whether because of a later re-sync (Scenario C colliding with this one) or any other mechanism.
- **Ownership implications:** this is the clearest practical demonstration of Section 1's ownership principle — once owned, the athlete's edit is final and authoritative over the record, exactly as it would be for a manually-logged activity. The external source retains no override authority.
- **Data integrity implications:** none beyond what Section 2 already requires — the source marker and any internal de-duplication reference must survive the edit (Section 7), specifically so this edited record continues to be recognized correctly if Scenario C's re-import case is later triggered against it.

---

## Section 5 — Source Precedence Principles

This section addresses Scenario B's open question directly: when two external sources disagree on the details of what both describe as the same real-world session, which version should be trusted?

**Should Forge Legacy decide unilaterally?** Only as a default, never as a silent, unreviewable final answer. Recommend a default preference for the **most direct source** — the platform or device that actually recorded the session, as distinct from a downstream aggregator the activity was later synced to. The predecessor evaluation's own Section 2 finding supports this directly: Strava's value is precisely that it aggregates device data from Garmin, Coros, Wahoo, and others — meaning a Strava copy of a Garmin-recorded run is, by construction, one step removed from the original recording. Where the more direct source is determinable, default to it.

**Should the athlete decide?** Yes, whenever the system's confidence is genuinely ambiguous (the same boundary named in Section 3) — for example, when the two sources disagree by more than ordinary measurement variance, or when "most direct source" cannot be determined. This is consistent with existing precedent for ambiguous, athlete-relevant decisions elsewhere in the architecture: `Exercise-001-Custom-Exercise-Architecture.md` does not silently block or auto-resolve an ambiguous duplicate-name case — "the athlete may proceed anyway" — the system surfaces the ambiguity rather than arbitrating it invisibly.

**Why not let Forge Legacy always decide:** doing so would mean silently overwriting or discarding part of the athlete's own data based on an inference about a third party's recording method — in direct tension with `FORGE_LEGACY_PRODUCT_DNA.md`'s Story Before Data and Legacy First principles (cited in the predecessor evaluation, §1.3): the athlete's record is the athlete's truth, not a vendor's. A default is appropriate for the common, low-ambiguity case; an invisible final arbitration is not appropriate for the genuinely ambiguous one.

---

## Section 6 — Existing System Integrity

The predecessor evaluation already found that Activity History, Progress, Goals, Rank, and Honors require zero architecture change to accept imported activities (§6) — each already counts every qualifying session generically and automatically, by deliberate, locked, activity-type-agnostic design (`Rank-Computation-Model.md` D-RCM-4; `P-2-Progress-Hub-Architecture.md` PH-D8; `Amendments/Critical-Decisions-Amendment-001.md`'s auto-update model; `Honor-Evaluation-Service-Architecture-v1.0.md` §7.2's generic evaluator plumbing).

**How duplicate prevention protects these systems:** all five already trust the session table unconditionally — none has, or needs, a manual-review step of its own. This means the *only* thing standing between a correctly-functioning system and an inflated one is whether exactly one record reaches the table per real-world session. De-duplication is not an enhancement to these five systems; it is the precondition that keeps their existing, correct, trusting design correct once import exists.

**Guarantees the architecture must provide**, derived directly from Sections 1–5 above:

1. **Exactly-once counting per real-world session**, regardless of how many sources described it (Section 3's governing principle) or how it was resolved (Sections 4–5).
2. **Source-blindness for counting, source-awareness only for display.** Once a record exists, no downstream system's behavior should differ by source (Section 2) — this is the same generic, type-blind treatment D-RCM-4 and PH-D8 already apply to activity *type*, extended consistently to activity *source*.
3. **No record's deletion or edit corrupts another system's view.** Consistent with Section 1's non-referential-integrity pattern (borrowed from WSR-001) — editing or removing an activity must behave exactly as it already does for manually-logged activities today, with no special-case failure mode introduced by having once been imported.

Once these three guarantees hold, History, Progress, Goals, Rank, and Honors need no further change — consistent with Rules 10–14.

---

## Section 7 — Edit Behavior

**Are imported activities editable?** Yes, fully — on identical terms to a manually-logged activity. Section 1 and Scenario D (Section 4) already establish this: ownership is complete and unconditional, so there is no principled reason an imported activity should be more locked-down than one the athlete typed in themselves. Precedent: Exercise-001's `source` field pattern locks only `source` and `authorId`, leaving every other field — including the equivalent of an activity's actual data — freely editable regardless of origin.

**Do edits affect source attribution?** No. Source is immutable once set (Section 2) and is entirely independent of how much the activity's data is subsequently edited.

**Should edited records remain import-linked?** Yes. The source marker, and whatever internal reference is used to recognize the record for de-duplication purposes, must persist through edits. This is not optional: losing that link on edit would silently reopen exactly the risk this note exists to close — a later re-import or re-sync (Scenario C) would no longer recognize an edited record as already accounted for, and could create a duplicate of a record the athlete had already corrected.

---

## Section 8 — Future Compatibility

**Strava, Garmin, Apple Health, and future providers:** the model is provider-agnostic by construction. Source (Section 2) is a value, not a structural branch — ownership (Section 1), de-duplication philosophy (Section 3), precedence (Section 5), and edit behavior (Section 7) reference no provider-specific detail anywhere in this note. Apple Health is worth naming specifically because it is itself an aggregator rather than a single recording device (the predecessor evaluation's §2 finding) — it receives the same treatment as Strava under Section 5's "most direct source" principle, not a special case.

**Does the model scale without redesign?** Yes. Adding a new provider later is purely a connection/integration concern — exactly the maintenance-complexity dimension the predecessor evaluation already named as the real cost driver (§8) — not a reason to revisit any principle in this note. A new provider is simply a new possible value of `source`, governed by the same rules already stated for every existing one.

---

## Section 9 — Risks

- **Data inflation.** Already the headline risk identified by the predecessor evaluation (§5, §9). Mitigated conceptually by Section 6's single-count guarantee — this note's entire purpose is to make that guarantee well-founded before any implementation begins.
- **Ownership ambiguity.** Concentrated in Scenario B (Section 4), where no manual anchor exists. Mitigated by making Section 5's precedence principle a deliberate, named decision applied consistently — not an accidental default (e.g., "whichever source happened to sync second") that nobody chose on purpose.
- **Multi-source risk.** Compounded by the aggregation effect named in Section 5 and Section 8 — an athlete connecting a second source after the first is the common case this note treats as expected, not exceptional. Mitigated by treating "is this real-world session already represented from any connected source" as one unified question (Section 3), not a series of independent pairwise checks against each source separately.
- **Long-term maintenance.** Each future provider integration is a new place this note's principles must be honored correctly. Mitigated by keeping every principle in this note provider-agnostic and centrally documented here, rather than left to be re-derived, inconsistently, by whoever builds each future integration.

---

## Section 10 — Final Recommendation

### 10.1 Architecture principles established by this note

1. Import creates a new, fully-owned, native Forge Legacy record — never a live mirror of an external source (Section 1).
2. Source attribution is visible, informational, and immutable once set; it survives every subsequent edit (Section 2).
3. De-duplication's governing principle is real-world-session identity, not field-matching — exactly one count per real-world session, with no silent data loss (Section 3).
4. Manual entry, multi-source import, re-import, and post-import edits all resolve to the same single, owned, authoritative record (Section 4).
5. Source disagreement defaults to the most direct recording source, with athlete visibility — never silent, unreviewable system arbitration — when genuinely ambiguous (Section 5).
6. Downstream systems remain source-blind for counting and source-aware only for display; nothing about History, Progress, Goals, Rank, or Honors changes (Section 6).

### 10.2 Required document touchpoints

None required immediately. This note contradicts, supersedes, or requires editing no locked document — the same outcome `Pace-Speed-Definition-Architecture-Note.md` reached for its own dependency (§7.2: "No amendment is required... This note supplies the missing... rule those... documents already assumed existed, without requiring any of them to be edited"). This is new groundwork for an unbuilt feature, not a correction to existing architecture.

### 10.3 Open questions, explicitly deferred

- The exact detection signal(s) used to recognize a likely duplicate (Section 3/4) — detection-algorithm design, out of scope per Rule 9.
- The exact UX for surfacing an ambiguous precedence conflict to the athlete (Section 5) — implementation, out of scope.
- Whether niche/ergometer-specific sources (e.g., Concept2) fit this model identically or need separate treatment — already scoped out by the predecessor evaluation (§1.1) and not reopened here.

### 10.4 Readiness assessment

**Ready.** This note, paired with `External-Activity-Import-Architecture-Evaluation.md`, gives whoever eventually builds OAuth, Connected Apps (P-7), or any provider-specific integration a stable, provider-agnostic set of principles to build against — ownership, attribution, and de-duplication philosophy no longer need to be invented under implementation pressure once that workstream begins.

### 10.5 Final verdict

**B — Small ownership/de-duplication note required.** Not A: History, Progress, Goals, Rank, and Honors needing no redesign (already confirmed) does not mean ownership and de-duplication principles already existed anywhere — they did not, which is exactly the gap this note closes. Not C: nothing in this note contradicts, weakens, or overrides a locked decision; it is additive groundwork for a feature that does not yet exist, not a correction to one that does. Not D: the predecessor evaluation already found genuine, durable athlete value in external import (§1, §9) — nothing found in this note's tighter focus on ownership and de-duplication reopens that conclusion.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial External Activity Import — Ownership & De-Duplication Architecture Note. Resolved the dependency named by `External-Activity-Import-Architecture-Evaluation.md` §10 (Workstream 1). Established ownership-on-creation with no live external mirror (extending `Architecture-Amendment-001-Import.md`'s existing ownership principle from Program/Chapter import to activities); an immutable, edit-surviving source-attribution model (extending `Exercise-001-Custom-Exercise-Architecture.md`'s `source` field precedent); a real-world-session-identity governing principle for de-duplication (single count, no silent data loss, ambiguity favors athlete visibility over silent automation); a most-direct-source default for cross-source precedence conflicts, with athlete visibility for genuinely ambiguous cases; and confirmation that Activity History, Progress, Goals, Rank, and Honors require zero changes once exactly-once counting and source-blindness are guaranteed upstream. No schemas, APIs, database tables, or implementation details authored; no redesign of Activity History, Progress, Goals, Rank, or Honors performed — architecture note only, per Rules 6–14. Final verdict: B (small note required) — confirmed, not reopened, by this note's own findings. |

---

*External Activity Import — Ownership & De-Duplication Architecture Note — v1.0*
*Forge Legacy | June 2026*
