# External Activity Import Architecture Evaluation

## v1.0 | June 2026

**Status:** ARCHITECTURE EVALUATION — no schemas, APIs, amendments, or implementation specs authored; no redesign of Goals, Progress, or Rank performed. This evaluation determines whether importing completed activities from external fitness platforms (Strava, Garmin, Apple Health, and others) should become a first-class Forge Legacy capability, and if so on what terms — before any implementation, API, schema, or monetization decision is made.

**Type:** Architecture Evaluation

**Predecessors:** `Endurance-Multi-Activity-Architecture-Evaluation.md` v1.0, `Pace-Speed-Definition-Architecture-Note.md` v1.0, `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` v1.0.

**Read in full for this pass:** `Architecture-Amendment-001-Import.md`, `Amendments/Monetization-Architecture-Amendment-001.md`, `Forge-Legacy-Master-PRD.md` (Section 5, Section 18, Future Roadmap), `P-4-Settings-Root-Architecture.md`, `Account-Auth-Architecture.md`, `FORGE_LEGACY_PRODUCT_DNA.md`, `WSR-001-Workout-Share-Result-Architecture.md`, `Exercise-001-Custom-Exercise-Architecture.md`, `M-7-Premium-Upsell-Spec.md`, `Endurance-Multi-Activity-Architecture-Evaluation.md`, `Pace-Speed-Definition-Architecture-Note.md`, `ActivityType-Expansion-Evaluation-Hiking-Rowing.md`, `Active-Workout-Flow-Spec-W9-W16.md`, `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md`, `P-2-Progress-Hub-Architecture.md`, `Rank-Computation-Model.md`, `O-2-Amendment-001-Athlete-Type-Declaration.md`, `Goal-Hub-Wireframe-Spec-G1.md`, `Honor-Catalog-v1.0-LOCKED.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`.

---

## A Naming Note, Stated Before Section 1

This evaluation's subject — pulling completed activity records (runs, rides, swims, hikes) from external platforms like Strava, Garmin, or Apple Health — is a **different feature** from the already-locked `Architecture-Amendment-001-Import.md` ("Program / Chapter Import"), which imports training *plans* from CSV/XLSX into Programs and Chapters. The two share the word "import" and nothing else: different content (training structure vs. completed sessions), different source (spreadsheet upload vs. third-party API/OAuth), different consuming systems (Programs/Chapters vs. Activity History, Progress, Rank, Goals, Honors). `Architecture-Amendment-001-Import.md` §5 itself already drew this line: "Import History Integration: Third-party app connections (Strava, Apple Health, MyFitnessPal) for historical workout data import — distinct from Program/Chapter Import." This evaluation refers to its subject as **External Activity Import** throughout, to avoid colliding with the existing "Import" terminology (W-IM-1–4) anywhere it is referenced.

The repository already names this unresolved capability three separate times, independently, without ever reconciling them:

1. **"Import History (Third-Party)"** — `Forge-Legacy-Master-PRD.md` Future Roadmap: "Import historical workout data from third-party apps (Strava, Apple Health, MyFitnessPal, etc.) during onboarding or post-install. Deferred due to third-party API complexity." Framed as a one-time, batch, historical pull.
2. **"Wearable Integrations (Apple Watch, Garmin)"** — listed separately in the Master PRD's Future Roadmap table and Additional Future Features list. Framed as an ongoing device connection, not a one-time pull — and notably names Garmin here, not in item 1.
3. **P-7 Connected Apps** — a reserved-but-unspecced Settings row. `P-4-Settings-Root-Architecture.md` §2.1 (locked): "P-7 is the only item in the P-4–P-9 range with zero supporting architecture anywhere in the documentation... Health integrations (HealthKit, Google Fit, etc.) are a standalone engineering effort — platform SDK integration, permissions UX, data mapping, conflict resolution — not a settings toggle screen... Resolution: P-7 is a reserved code, not an MVP row... reserved for a future integration architecture workstream."

This evaluation treats all three as one subject and is the workstream P-4's own resolution explicitly anticipated ("revisit only when integration architecture becomes a planned workstream").

**A calibration note on activity types:** this evaluation's Context lists HIKE and ROW as part of the "current activity ecosystem." Per `Activity-Type-Picker-Spec-W8.md` Decision 2 (locked), the production `ActivityType` enum is still nine values (`STRENGTH | RUN | WALK | BIKE | SWIM | HIIT | MOBILITY | YOGA | OTHER`) — `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` v1.0 *recommended* `HIKE`/`ROW` but, per its own Status line, drafted no amendment and authored no enum change. This evaluation treats HIKE/ROW as recommended-but-not-yet-applied, consistent with that document's own status, and does not depend on their being live for any finding below — every finding here generalizes across "the Endurance family," whatever its current membership.

---

## Section 1 — Product Vision Evaluation

### 1.1 Are imports expected by endurance athletes?

Yes, for the device-equipped majority — with real variance by activity. Running, Cycling, and Swimming athletes overwhelmingly already record activities on a dedicated watch or device before ever opening a second app; re-entering that same session by hand into Forge Legacy duplicates work already done elsewhere. This is the identical friction-of-recreation argument `Architecture-Amendment-001-Import.md` already made for training plans: "Forcing these athletes to recreate their training from scratch inside Forge Legacy is a barrier to adoption and a failure of the product's core promise" (§1). That argument is not plan-specific — it generalizes cleanly from training plans to completed activities.

Hiking and Walking carry the same expectation but with lower urgency — a smaller share of this population trains with a dedicated device pushing to one hub app. Rowing is a bifurcated population: on-water rowers using Garmin/Coros-class devices resemble the Tier 1 endurance profile; indoor ergometer rowers typically log through gym equipment or a Concept2-specific ecosystem outside this evaluation's named source list. Section 2 does not recommend a Concept2-specific integration — Garmin/Strava/Apple Health coverage already captures the on-water population, which is the larger and more architecturally tractable share.

### 1.2 Is manual entry sufficient?

Functionally, yes. Every Endurance-family activity type already has a working manual-entry path (the continuous-timer pattern, confirmed across W-10 through W-13 and extended to Hiking/Rowing by the predecessor evaluations) — manual entry is not a blocker to the product functioning. But "sufficient" depends on the bar being cleared. `Active-Workout-Flow-Spec-W9-W16.md` §4.3 already states plainly: "Distance is entered manually for MVP — GPS tracking is post-MVP." The Endurance Evaluation already flagged the consequence of this (§7.4): Rank's Personal Improvement Endurance signal currently rests on unverified self-report. External Activity Import is a way to acquire GPS-verified distance, duration, and pace without building GPS tracking natively — it resolves an already-named trust gap as a side effect, not by design coincidence.

For an athlete already wearing a watch every session, re-keying distance and duration by hand after each one is a real, recurring adoption tax. Without import, Forge Legacy asks an endurance athlete to maintain two parallel systems indefinitely: their watch/Strava (source of truth, where training history and partners already live) and Forge Legacy (where their legacy lives) — with no bridge between them. That gap does not stop manual logging from working; it caps how much of a serious endurance athlete's real training volume will ever actually reach Forge Legacy's Rank, Progress, Goals, and Honors systems without one.

### 1.3 Does importing fit Forge Legacy's identity?

Conditionally yes — and the condition matters more than the yes. `FORGE_LEGACY_PRODUCT_DNA.md` §2 (Identity Over Performance): the app should reinforce "who the athlete is... what they have overcome," and should not reinforce "comparison, status, vanity metrics." §10 (Explicitly Prohibited Patterns, locked): bars "public leaderboards," "workout feeds," "like systems," "follower systems," "public workout statistics" — all "without a formal architecture review."

Strava in particular is built around exactly these mechanics (Kudos, segments, public leaderboards, social feed). Importing an **activity record** — distance, duration, date, route taken — is identity-neutral and squarely fits Legacy First / Story Before Data: it is the same "honor existing work, don't force recreation" principle `Architecture-Amendment-001-Import.md` already established for training plans, applied to completed sessions instead of plans. Importing Strava's **social and comparison layer** — Kudos counts, segment leaderboard placement, public achievement badges — would directly violate the locked Prohibited Patterns list. Section 3 treats this distinction formally below; it is named here first because it is the single most important product-identity boundary this evaluation surfaces.

**Verdict:** imports are expected and identity-aligned, conditioned strictly on importing the *activity*, never the *social layer* it arrived with.

---

## Section 2 — Source Ecosystem Evaluation

This section is the evaluation's informed architectural judgment about external platforms, not a citation of any locked Forge Legacy document — no internal document names these platforms' technical characteristics.

| Source | Importance | Adoption among endurance athletes | Long-term value | Notes |
|---|---|---|---|---|
| **Strava** | Highest | Broadest — functions as a cross-brand aggregator; most Garmin/Coros/Wahoo/Polar device activity already auto-syncs *into* Strava regardless of which hardware the athlete owns | Highest — one integration captures activity originating from nearly every other source on this list | The aggregation effect is also Section 5's biggest duplicate-prevention risk if an athlete later connects a second source directly |
| **Garmin** | High | Large, serious-endurance-athlete-skewed; meaningful population never connects Strava at all | High for the subset of Garmin owners who skip Strava | Adds coverage Strava's aggregation doesn't reach, not a superset of it |
| **Apple Health** | High | iOS-only, but reaches every iPhone owner regardless of which watch/app feeds it upstream — a platform-level store, not a single brand | High, low marginal maintenance once built (one platform API, not per-brand) | No Android equivalent at the OS level — an Apple Health integration alone does not give cross-platform parity |
| **Coros** | Moderate | Smaller, loyal niche (trail running, hiking) | Moderate | Largely already reachable via Strava aggregation for athletes who also connect Strava |
| **Wahoo** | Moderate | Smaller, cyclist-skewed niche | Moderate | Same Strava-overlap consideration as Coros |
| **Polar** | Moderate | Smaller, general-endurance niche | Moderate | Same Strava-overlap consideration |
| **Fitbit** | Lower for this product's population | General fitness/step-tracking skew, not dedicated endurance training | Lower | Population mismatch with this product's serious-endurance-athlete framing more than a technical concern |

**Recommended support order:** Strava → Apple Health → Garmin → (Tier 2, demand-gated, not a launch tier) Coros / Wahoo / Polar / Fitbit, roughly in that order if ever pursued.

**Rationale:** Strava's aggregation effect means a single integration likely captures the majority of importable activity volume across nearly every other source on this list — the highest-leverage investment by a wide margin. Apple Health adds the no-third-party-account, OS-native path and reaches Apple Watch users who skip Strava entirely. Garmin direct adds the remaining serious-athlete population that bypasses both. Each Tier 2 source adds marginal coverage at full integration and maintenance cost (Section 8) — recommend treating them as demand-gated follow-ups, never a launch-tier default.

---

## Section 3 — Import Philosophy

| Field | Status | Rationale |
|---|---|---|
| **Activity summary** (type, date) | **Required** | The entire value proposition — without it, nothing downstream has anything to read. |
| **Distance** | **Required** | Already the core field every Endurance-family type logs (`distanceValue`/`distanceUnit`, `Program-Authoring-Standard-v1.0.md` §2.3, reused across every prior endurance workstream). Import should map onto this exact existing field, not invent a new one. |
| **Duration** | **Required** | Same reasoning — the "always present" session timer (`Rank-Computation-Model.md` §9). |
| **Pace / Speed** | **Optional — derive, do not import** | `Pace-Speed-Definition-Architecture-Note.md` §4.4 already establishes per-session pace/speed as "derived on demand" from distance ÷ duration, not stored. Importing a source's own pace value risks two parallel, possibly-disagreeing definitions for the same session. Recommend Forge Legacy compute pace/speed itself from imported distance/duration using its own already-defined formula (§4.1), discarding whatever pace/speed value the source provides. |
| **Elevation** | **Avoid at launch** | No elevation field exists anywhere in the locked active-logging architecture today — `ActivityType-Expansion-Evaluation-Hiking-Rowing.md` §2.1 already found and flagged a stale "elevation" reference in W-8's own routing table with nothing behind it elsewhere. Importing elevation now would store a field with no consuming surface — display, Progress, or Rank. |
| **Splits** | **Avoid at launch** | No surface in W-18, W-19, P-2, or RCM displays or consumes split-level detail today — every existing document operates at whole-session granularity. Real future Honors potential (e.g., negative-split milestones); importing it now stores data nothing reads. |
| **Heart rate** | **Avoid at launch** | No consuming surface exists, and it is materially higher-sensitivity biometric data than distance/duration. Forge Legacy's current Privacy architecture (P-6, per prior audits: "only 2 settings, each independently owned... not a unified privacy entity") and Account/Auth Architecture were never built with a biometric-data category in mind. Importing heart rate would require a privacy-architecture decision this evaluation is not scoped to make. |
| **Calories** | **Avoid** | Same no-consuming-surface reasoning, compounded by methodology variance across sources — displaying a number Forge Legacy did not compute, next to distance/duration it does fully own, undermines trust in both. |
| **Route / GPS track** | **Avoid, on identity grounds, not just plumbing grounds** | Beyond having no consuming surface, precise route geometry is meaningfully higher privacy/security surface (home-location inference, training-pattern exposure) than anything any activity type stores today. It also sits adjacent to the "public workout statistics" territory the Prohibited Patterns list is wary of (§10) even when unpublished. A future route-summary feature would need its own dedicated privacy review — not a default field on this import. |
| **Source social/engagement data** (Kudos, comments, segment leaderboard placement, achievement badges) | **Avoid, unconditionally** | These are exactly the comparison/status/public-performance mechanics `FORGE_LEGACY_PRODUCT_DNA.md` §10 bars "without a formal architecture review." Do not import, store, or display any of this without that review. |

---

## Section 4 — Activity Ownership

- **Who owns the record:** The importing athlete, fully — the same principle `Architecture-Amendment-001-Import.md` §3.5 already established for Program/Chapter import: "All imported programs and chapters are fully owned by the importing athlete. Import creates new records — not references to external sources." Recommend the identical principle here: an imported activity becomes a normal, fully-owned Forge Legacy activity record, not a live-synced mirror of the external source.
- **Can athletes edit imported activities?** Recommend yes, on the same terms as a manually-logged activity. Precedent: `Exercise-001-Custom-Exercise-Architecture.md` §5.1 already establishes a `source` attribute (`source: 'CUSTOM' | 'FORGE'`, immutable after creation) where most fields stay freely editable regardless of source — only `source` and `authorId` are locked. Recommend the same shape here: a `source` attribute (e.g., manual vs. originating platform) is set once at creation and never changes; the activity's actual data — distance, duration, notes, date — remains editable like any other record.
- **Can athletes add notes?** Yes. `notes` is already a shared field across every activity type today (Endurance Evaluation §2.3) — no reason to withhold it from imported activities specifically.
- **Can athletes attach activities to chapters?** Yes, on the same generic terms manually-logged activities already attach to chapters — not something import needs to handle specially.
- **Should source attribution exist?** Recommend yes — a visible, lightweight "Imported from [Source]" indicator, the same spirit as Exercise-001's `[Custom Exercise]`/`[Deleted Exercise]` tombstones making origin visible without a second question being asked. This serves real trust value, especially given Section 1.2's framing of import as a way to bring verified data in: an athlete should be able to tell which entries came from a watch and which they typed. Attribution should be informational only — it must not gate or alter behavior in Progress, Rank, or Goals (Section 6).
- **Can imported activities be deleted?** Yes, recommend the same deletion model as any manually-logged activity. `WSR-001-Workout-Share-Result-Architecture.md`'s existing pattern is a useful precedent for *how*, even though it governs shares, not imports: "`WorkoutShare` does not create foreign keys into `WorkoutSession`... `sourceEntityId` is a reference for navigation, not a referential integrity constraint. This preserves the ability to delete or archive source records without affecting share history." The same principle applied in reverse here: deleting an imported activity should never need to "reach back" to the external source, and should never fail because of it.

---

## Section 5 — Duplicate Prevention

### Scenario A — manual log, then later import of the same activity

**Risk:** double-counting in Progress (Lifetime Workouts, Hours Forged), Rank (Training Volume/Consistency, Personal Improvement), Goals (auto-update accumulating distance twice), and any future Honors family. This risk is real specifically *because* `Rank-Computation-Model.md` D-RCM-4 and `P-2-Progress-Hub-Architecture.md` PH-D8 already count every qualifying session generically and automatically — neither has a manual-review step that would catch a duplicate; both are built to trust whatever lands in the session table.

**Detection requirement:** at minimum, a heuristic match on activity type + date + a tolerance window on duration/distance (an exact match is unlikely given manual-entry imprecision versus GPS-measured import). This is a load-bearing prerequisite for the feature, not a refinement to add later — without it, Scenario A is the most likely single cause of inflated Rank/Progress/Honors data this feature could introduce. This evaluation does not design the detection algorithm (per Rule 6/7), but finds that *some* detection step must be named as in-scope for whichever workstream eventually specs this feature.

### Scenario B — import from multiple sources

**Risk:** the same underlying activity arrives twice through two different external sources (e.g., a Garmin watch auto-syncs to Strava, and the athlete later connects both directly) — a harder version of Scenario A, because there is no manual entry to compare against, only two external records of varying provenance. This is the direct consequence of the same aggregation effect that makes Strava the highest-leverage single source (Section 2): the property that makes Strava valuable is exactly what creates this risk once a second source is added.

**Detection requirement:** the same heuristic as Scenario A, but run across all connected sources together, not per-source — a cross-source de-duplication pass. This also implies an eventual precedence rule (which source's version "wins" when two disagree slightly on distance/duration) — not designed here, but named as a real open question for the next workstream.

### Scenario C — import, then edit

**Risk:** lower than A/B. Once an activity is imported and owned (Section 4), editing it afterward is no different from editing any manually-logged activity. The one edge case worth naming: if a re-sync or refresh action is ever built and the same source activity is re-fetched after the athlete has already edited their local copy, should the edit be preserved or overwritten? Recommend the edit always wins — an athlete's owned, edited record should never be silently overwritten by a re-fetch. This is consistent with Section 4's no-live-sync ownership model; if there is no ongoing sync relationship, this scenario mostly does not arise, which is itself an argument for the one-time-import shape over continuous sync (revisited in Sections 7 and 9).

---

## Section 6 — Existing System Impact

- **Activity History (W-18):** No new UI structure if imported activities use the same `ActivityType` values — the same "two new rows in an existing table" pattern this project has applied repeatedly. Source attribution (Section 4) would be a small addition to the existing row component, not a new screen.
- **Activity Detail (W-19):** Same reasoning — the existing per-type "Expected Fields" table already renders generically; an imported activity populates the same fields a manually-logged one would (Section 3's Required fields), using the same per-type pace/speed display logic `Pace-Speed-Definition-Architecture-Note.md` already defines.
- **Progress:** Counts fully, by design, once de-duplication (Section 5) is solved — and this is exactly where the risk concentrates. PH-D8's classification and distance/pace metrics already trust every session in the table equally (Endurance Evaluation §6.1–6.3). Per Rule 11, no change to that trust model is proposed; the finding is that Progress is one of the systems most exposed to Scenario A/B, because it has no source-awareness today and is not expected to gain any — source-blindness for *counting* is correct once de-duplication happens upstream, not a flaw to fix inside Progress.
- **Goals:** Same exposure, via the same mechanism. `Critical-Decisions-Amendment-001.md`'s auto-update model already accumulates "logged run distances" generically — a "Run 500 miles" goal would inflate from an un-de-duplicated import exactly as easily as Progress would. Per Rule 9, no change to Goals' accumulation logic is proposed; the fix belongs upstream, at de-duplication.
- **Rank:** Counts fully by design, on the same generic terms D-RCM-4 already established ("no activity type is excluded... must not be reversed by future threshold-setting") — extending this to "no activity *source* is excluded" is the natural, consistent extension, not a new principle. The one genuine abuse vector worth naming precisely: an athlete could, in principle, import a single favorable GPS-recorded activity (e.g., a short or downhill course with generous distance rounding) to set an artificially strong `bestPace`. This is not a new category of risk — Endurance Evaluation §7.4 already named manual self-report as an equally unverified existing risk for the same signal — and a verified GPS import generally *raises*, not lowers, trust in this signal; the rare adversarial case is no easier than typing in a fast time by hand today. No Rank redesign implied (Rule 10).
- **Future Honors:** per the predecessor evaluations, the evaluator-family plumbing is already generic and does not require a schema-version increment for new families. Imported activities should count toward any future Endurance honor family on identical terms to manually-logged ones, once Section 5's de-duplication is solved — one more upstream dependency added to the chain those evaluations already identified (pace/distance definition → activity-type inclusion → evaluator family).

**Verdict:** imported activities should count fully and identically everywhere, by design — consistent with every relevant locked principle already treating "what kind of session" as something that must never gate participation. The one real abuse vector this evaluation finds is duplicate-driven inflation (Section 5), not source-driven unfairness — and that risk sits upstream of all five consuming systems, not within any one of them.

---

## Section 7 — Premium Strategy Evaluation

No monetization decision is assumed here, per the objective's instruction. Three framings, each evaluated against existing locked precedent:

- **Free:** Strongest alignment with Never Charge For History. `Amendments/Monetization-Architecture-Amendment-001.md` §2 already applies that principle to "content created by completed imports" for the existing Program/Chapter import feature. A free, one-time historical pull (e.g., "bring in your last 12 months of Strava runs") fits the same precedent that already makes the existing import feature's *historical migration* use case free (§8: "Historical migration — an athlete brings their prior training legacy into Forge Legacy. This is a one-time act of recording history, not a power-user workflow... The free import covers use case 1.").
- **Premium:** Strongest alignment if framed as ongoing convenience. The same amendment, same section, already draws this exact line for the existing import feature: "Ongoing import pipeline — an athlete regularly imports structured training from external tools. This is a workflow preference and a premium capability... Premium covers both." A continuous, automatic sync (every new Garmin activity appears in Forge Legacy going forward) is a recurring convenience, not a one-time historical act — the same logic that makes unlimited *repeat* Program/Chapter imports Premium-only applies cleanly here.
- **Hybrid (the framing this evaluation finds most consistent with locked precedent, not a decision):** the existing Import Model already encodes exactly this free-historical / premium-ongoing split for a different import feature. Recommend evaluating External Activity Import against the identical split — free one-time historical pull, Premium ongoing sync — rather than inventing a new monetization shape from first principles. This also mirrors the seam this evaluation's naming note (above) already found in the Master PRD: "Import History" (batch/historical) and "Wearable Integrations" (ongoing) were already named as two separate future-roadmap items, never reconciled — the free/Premium boundary maps naturally onto a distinction the architecture has already half-drawn on its own.

---

## Section 8 — Complexity Assessment

**Product complexity:** Moderate-to-high, and structurally different from the recent endurance workstreams. Those (ActivityType Expansion, Pace/Speed Note) found the *consuming* architecture already generalized, requiring no new product surface. External Activity Import requires real new surface: a connection/authorization flow, a source-selection UI (the dormant P-7 Connected Apps row is the natural home), a historical-vs-ongoing distinction (Section 7), and a duplicate-resolution UX (Section 5) with no existing precedent screen to reuse.

**Architecture complexity:** High, concentrated almost entirely outside the systems this project has spent its recent evaluations hardening. Goals, Progress, Rank, History, and Honors all require zero architecture change (Section 6). The hard part is everything upstream: third-party OAuth and token storage (no existing document covers this — `Account-Auth-Architecture.md`'s locked scope is session lifecycle, logged-out destination, and Delete Account, not third-party auth), per-source API integration and rate limits, sync infrastructure for the ongoing case, and Section 5's de-duplication logic. This is the inverse of this project's recent endurance work: previously the hard part was content (Honors, Programs); here the hard part is plumbing the consuming systems were never asked to do before.

**Maintenance complexity:** High and ongoing — the one dimension genuinely unlike anything else in the current architecture. Every other system in this project is internally controlled; Forge Legacy owns its own schema, screens, and logic indefinitely. External Activity Import would be the first capability with a permanent dependency on other companies' APIs, which can change format, rate-limit, or deprecate endpoints on their own schedule. Each additional source (Tier 2 especially) multiplies this surface linearly — a direct argument for Section 2's narrow, demand-gated source list over supporting all seven at once.

**User value:** High, but concentrated — high for the already-device-equipped endurance population most likely to abandon manual re-entry (Section 1.2), low for an athlete who already logs manually with no external device habit to bridge. A real-but-narrow-population feature, not a universal one.

**Hidden costs:** (1) a privacy/legal review for handling third-party health data, larger in scope than anything current Privacy architecture (P-6) was built to handle (Section 3's heart-rate/route findings); (2) de-duplication (Section 5) is easy to underestimate because it has no UI of its own — it fails silently, as inflated stats, rather than loudly, as a crash; (3) third-party API deprecation risk is a recurring, indefinite-horizon cost with no clean "done" state, unlike any other workstream this project has completed.

---

## Section 9 — Launch Recommendation

**Recommendation: A — No imports at launch**, with the architecture groundwork for it actively commissioned now (Section 10), so it is built deliberately rather than rushed when demand or roadmap pressure eventually surfaces it.

**Why not B/C/D:** Strava-only (B) or Strava+Garmin(+Apple Health) (C/D) are each technically launchable in isolation, but launching any of them today means choosing between two bad outcomes: shipping without Section 5's de-duplication logic (locking in a known data-integrity defect across Progress, Rank, Goals, and any future Honors family — every one of which already trusts session counts unconditionally) or building de-duplication for the first time under launch deadline pressure, which is how durable architecture mistakes get made. Neither is "the best long-term architecture" (Rule 13) even though both are achievable in the short term. Section 8 also found the hard part of this feature is plumbing with no existing precedent anywhere in the architecture (third-party OAuth, ongoing sync infrastructure) — unlike every other recent endurance workstream, where the consuming systems were already generalized and waiting.

**Convergent evidence, not just this evaluation's opinion:** `P-4-Settings-Root-Architecture.md` §2.1 already reached essentially this same conclusion independently, from a completely different angle (Settings information architecture, not Rank/Progress/Goals impact), naming P-7 Connected Apps "a standalone engineering effort... not a settings toggle screen" and deferring it as "reserved code." Two independent passes over different parts of the architecture arriving at the same complexity conclusion is a stronger signal than either alone.

**Why A over "Other":** the objective's framing (E — Other) could mean "launch with manual entry only, forever" — this evaluation does not recommend that. Section 1 found genuine, durable user value once the architecture groundwork exists. The recommendation is sequencing, not rejection.

---

## Section 10 — Roadmap Recommendation

**Next architecture workstream:** an **External Activity Import — Ownership & De-Duplication Architecture Note** — small in scope, in the same shape `Pace-Speed-Definition-Architecture-Note.md` took relative to the Endurance Evaluation that commissioned it. It should formally define, at the conceptual level only (no schema, no API, per Rules 6–8): the `source`-attribution model extending `Exercise-001-Custom-Exercise-Architecture.md`'s existing precedent (Section 4); the shape of the de-duplication detection requirement named in Section 5; and the free-historical/Premium-ongoing seam named in Section 7, as a distinction for whoever eventually specs monetization.

**Required follow-up evaluations, in dependency order:**
1. A dedicated Privacy / Account-Auth extension evaluation covering third-party OAuth token handling and a biometric/health-data category — required before heart rate or any biometric field (Section 3) is ever considered, and before P-7 can be specced at all.
2. A P-7 Connected Apps wireframe spec, once (1) and the ownership/de-duplication note above exist. `P-4-Settings-Root-Architecture.md` §2.1 already named this exact trigger condition: "revisit only when integration architecture becomes a planned workstream." This evaluation is that triggering workstream.

**Is External Activity Import launch-critical?** No. This conclusion does not overturn anything — it confirms, from a different angle, what the Master PRD's Future Roadmap already independently classified both "Import History (Third-Party)" and "Wearable Integrations" as: post-MVP. Recommend keeping it off the MVP critical path while banking the architecture groundwork above, so that whenever the feature is greenlit, it is the second or third workstream in an already-prepared sequence — not a from-scratch effort under deadline pressure.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial External Activity Import Architecture Evaluation across all ten requested sections. Distinguished this subject (third-party activity sync — Strava/Garmin/Apple Health/etc.) from the locked `Architecture-Amendment-001-Import.md` ("Program/Chapter Import," CSV/XLSX training plans) — the two share only a name. Found the repository already names this gap three separate, never-reconciled times: Master PRD's "Import History (Third-Party)" and "Wearable Integrations" future-roadmap items, plus P-7 Connected Apps' reserved Settings row. Found Activity History, Activity Detail, Progress, Goals, and Rank all require zero architecture change to accept imported activities (consistent with the activity-type-agnostic design these systems already had before this evaluation) — the real complexity is upstream: third-party OAuth (no existing document covers it), ongoing-sync infrastructure, and duplicate-detection across manual/import and multi-source scenarios, none of which have any existing precedent. Recommended a `source`-attribution model extending `Exercise-001-Custom-Exercise-Architecture.md`'s existing CUSTOM/FORGE pattern. Recommended a free-historical/Premium-ongoing monetization seam mirroring the existing, already-locked Program/Chapter Import Model precedent (Monetization Architecture Amendment 001 §8) rather than inventing a new shape. Recommended Launch Option A (no imports at launch) on long-term-architecture grounds — not as the easiest option, but because launching before de-duplication architecture exists risks a silent, durable data-integrity defect across Progress/Rank/Goals/Honors — while commissioning the architecture groundwork (an Ownership & De-Duplication Note, a Privacy/Auth extension evaluation, and the P-7 Connected Apps spec) immediately, so the eventual feature is prepared rather than rushed. No schemas, APIs, amendments, or implementation specs authored; no redesign of Goals, Progress, or Rank performed — evaluation only, per Rules 5–11. |

---

*External Activity Import Architecture Evaluation — v1.0*
*Forge Legacy | June 2026*
