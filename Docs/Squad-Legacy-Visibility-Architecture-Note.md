# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
# Forge Legacy — Future Architecture Note
## Squad Legacy Visibility
### Status: Future Design Review Required | Deferred — Post-MVP / V2 Evaluation

**Priority:** Post-MVP / V2 Evaluation
**Origin:** Identified during Phase 2B Squad architecture work, June 2026
**Scope:** This note does not modify any MVP specification. No S-1, S-2, or S-3 behavior is affected. The official MVP squad philosophy remains: private, small, high-trust, accountability-focused.

---

## Background

During MVP squad architecture design, a concept was identified for future evaluation: allowing squads to optionally share aspects of what they have built together — not as social networking, not as public communities, not as competition, but as **legacy visibility**.

The distinction matters. Forge Legacy's product thesis is that transformation, consistency, and legacy are worth celebrating. A squad that has been showing up together for two years — completing chapters, earning honors, declaring accomplishments — has built something real. The question this note preserves is: should the product ever allow that collective legacy to be visible beyond the squad's private context?

This is a fundamentally different question than making squad *activity* visible. Activity visibility creates comparison pressure. Legacy visibility celebrates what has already been built.

---

## The Concept

A squad could optionally choose to share a public legacy profile — not a live feed, not a leaderboard, not performance data — but a record of what the squad has collectively built over its lifetime.

**Example:**

```
┌────────────────────────────────────────────────────────┐
│  Iron Fathers                                          │
│  Helping fathers stay strong for their families.       │
│                                                        │
│  5 members  ·  Est. 2026                               │
│                                                        │
│  ──────────────────────────────────────────────────    │
│                                                        │
│  Chapters Completed        83                          │
│  Collective Accomplishments  41                        │
│  Collective Honors           71                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**What this shows:** What the squad has built together over time.
**What this does not show:** How the squad performs. Who trained most. Individual member data. Presence states. Goals. Progress.

---

## Questions to Preserve for Future Review

### Discoverability and Visibility
1. Can squads be discoverable by athletes outside the squad?
2. Can squads have a public-facing legacy page?
3. Should squad visibility be a tristate: **Private** / **Invite Only** / **Public**?
4. What is the correct default? (Presumed: Private, opt-in required for any other state.)

### Visible Information
5. What squad-level information could be safe to share publicly?

   Candidates:
   - Squad name
   - Squad purpose / description
   - Squad creation date
   - Member count (without names or identities)
   - Collective chapters completed (aggregate, no individual attribution)
   - Collective accomplishments count
   - Collective honors count
   - Collective legacy milestones (e.g., "100 chapters completed together")

6. What squad-level information must remain private regardless of visibility setting?

   Non-negotiable exclusions:
   - Individual member names or identities (without their explicit consent)
   - Workout history — any member's
   - Goal progress — any member's
   - Training data — any member's
   - Presence states (accountability data is squad-internal by design)
   - Program names or progress
   - Any data that could be used to compare members

### Consent and Governance
7. Should squad visibility changes require **unanimous member approval** or **owner decision only**?
8. Should individual members be able to **opt out** of having their membership included in any public profile (e.g., member count visible, their contribution not attributed)?
9. If a member leaves a public squad, do their historic contributions remain in the aggregate totals?
10. Can a new member who joins an established squad consent to their future contributions being included while the historic contributions remain?

### Anti-Competition Mechanics
11. How do public squads avoid becoming competitive?
    - No ranking of squads by aggregate metrics
    - No leaderboard of "most active squads" or "squads with most chapters"
    - Collective legacy is presented as a milestone record, not a score
    - Discovery (if it exists) should be by search/invite, not by ranked browsing
12. How do public squads remain aligned with Accountability Without Shame if aggregate totals are visible?
    - Proposed principle: collective totals celebrate completion, not rate of completion
    - "83 chapters completed" tells a story of persistence over time; it does not say how fast or how often
13. Should Forge Legacy ever show one squad's legacy data alongside another squad's for comparison?
    - Presumed answer: No. Each squad's legacy page stands alone.

### Discovery Mechanics (if discoverability is approved)
14. How would athletes find squads to join?
    - Search by name? By purpose keyword? By shared member?
    - Or invitation-only even for public squads?
15. Can an athlete request to join a public squad, or must they always be invited?
16. What happens to a public legacy profile when a squad is deleted?

---

## Principles for Any Future Implementation

Any squad visibility implementation must conform to these principles — evaluated at design time, not assumed:

- **Private by default.** No squad is ever discoverable or visible without an explicit opt-in decision by the squad.
- **Consent is required.** If individual members' contributions or identities are ever represented publicly, each member must consent. Squad owner decision alone is insufficient.
- **Collective, never individual.** Public squad data aggregates the squad's history. It does not surface any individual member's data, identity, or contribution separately.
- **Celebration, not competition.** Legacy visibility presents what was built. It does not rank squads, award badges for volume, or create any comparative metric between squads.
- **No accountability data.** Presence states, training frequency, streak data, and any other data that currently powers the accountability function within the squad remain private regardless of visibility setting. The internal squad accountability model must not be exposed externally.
- **High-trust accountability is preserved.** A squad that opts into public visibility does not change its internal governance or behavior. S-2's accountability model remains unchanged. Members continue to see each other's presence states. External viewers see nothing about internal accountability.
- **Leaderboards are architecturally prohibited.** No implementation pathway that leads to squad ranking, squad comparison scores, or any metric that positions squads against each other should be built.

---

## What This Note Does NOT Change

- S-1 Squads Hub behavior — unchanged
- S-2 Squad Detail behavior — unchanged
- S-3 Squad Management & Permissions — unchanged
- All squad privacy defaults — unchanged
- Accountability Without Shame principle — unchanged
- Member presence visibility rules — unchanged
- MVP squad philosophy: private, small, high-trust, accountability-focused — unchanged

---

## Relationship to Other Future Architecture

This concept intersects with:

- **Legacy Hub Architecture (L-series)** — if collective accomplishments or honors are displayed, their definition must align with the individual legacy model
- **Profile Architecture** — if member opt-in/opt-out is required, the consent mechanism likely lives in profile settings
- **Notification Architecture** — any opt-in flow for squad visibility changes would require notification design
- **V2 Social Architecture** — if Forge Legacy ever expands into athlete discovery or community features, this is the conservative entry point: celebrating legacy, not broadcasting activity

---

*Forge Legacy Future Architecture Note — Squad Legacy Visibility*
*Identified June 2026 during Phase 2B*
*Deferred to Post-MVP / V2 Evaluation*
*No MVP specifications modified. No current squad behavior changed.*
*This document preserves the concept and questions for future design review.*
