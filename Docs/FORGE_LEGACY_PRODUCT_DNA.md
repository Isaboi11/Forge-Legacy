# FORGE_LEGACY_PRODUCT_DNA.md

**Status:** Locked Source-of-Truth Document
**Purpose:** Preserve Forge Legacy's identity, philosophy, design direction, UX principles, and architectural guardrails across all future planning, design, and development work.

---

# 1. Mission

Forge Legacy exists to help people build a meaningful fitness legacy over years and decades, not chase short-term performance metrics.

The product is designed to answer:

> Who am I becoming?

Not:

> How do I compare?

Forge Legacy celebrates transformation, consistency, identity, and personal growth.

The athlete is building a life story, not accumulating workout statistics.

---

# 2. Core Principles

## Legacy First

The legacy is the product.

Workouts, goals, programs, honors, accomplishments, chapters, and squads exist to support the athlete's long-term story.

---

## Story Before Data

Data exists to support the story.

The story never exists to support the data.

When forced to choose, the athlete's journey takes priority over analytics.

---

## Identity Over Performance

The app should reinforce:

* Who the athlete is
* What they are building
* What they have overcome

The app should not reinforce:

* Comparison
* Status
* Vanity metrics

---

## Accountability Without Shame

Accountability should be visible.

Failure should not be amplified.

The athlete should never feel punished for:

* Missing a workout
* Taking time off
* Getting injured
* Prioritizing family
* Starting over

---

## Transformation Over Activity

The app rewards meaningful progress over time.

The app does not reward activity for activity's sake.

---

## High Trust Relationships

Forge Legacy is built around trusted relationships.

Not audiences.

Not followers.

Not influencers.

Not public performance.

---

# 3. What Forge Legacy Is

Forge Legacy is:

* A legacy-building platform
* A fitness journey platform
* A personal growth platform
* A chapter-based life system
* A long-term accountability system
* A relationship-centered fitness platform
* A memory-preservation system

---

# 4. What Forge Legacy Is Not

Forge Legacy is NOT:

* A social network
* A leaderboard platform
* A streak app
* An influencer platform
* A content creation platform
* A challenge app
* A workout feed
* A public performance platform
* A productivity gamification system

---

# 5. Brand Personality

Forge Legacy should feel:

* Timeless
* Premium
* Intentional
* Crafted
* Mature
* Strong
* Quietly confident
* Meaningful

The product should never feel:

* Loud
* Flashy
* Juvenile
* Hyper-competitive
* Trend-driven
* Social-media inspired

---

# 6. Visual Design Direction

## Design Language

Keywords:

* Legacy
* Craftsmanship
* Heritage
* Depth
* Simplicity
* Strength
* Permanence
* Purpose

---

## Interface Style

* Mobile-first
* Clean
* Spacious
* Premium
* Purposeful

Every element should justify its existence.

Visual clutter is the enemy.

---

# 7. Color Direction

## Primary Foundation

* Near Black
* Charcoal
* Graphite
* Deep Slate

---

## Accent Colors

* Bronze
* Warm Gold
* Brushed Metal Tones

Accents should communicate earned recognition.

Not excitement.

---

## Supporting Colors

* Stone
* Off White
* Slate
* Warm Gray

---

## Avoid

* Neon Green
* Neon Purple
* Bright Red
* Electric Blue
* Candy Colors
* Esports Color Palettes

---

# 8. UX Philosophy

## Recognition Before Gamification

Recognition is meaningful.

Gamification is temporary.

Forge Legacy should recognize achievements without turning life into a game.

---

## Progress Without Pressure

The athlete should always feel invited.

Never pushed.

---

## Simplicity Wins

If two solutions accomplish the same goal:

Choose the simpler solution.

---

## Deliberate Interaction

The app should feel intentional.

Not addictive.

Not compulsive.

Not engineered for endless engagement.

---

# 9. Architecture Guardrails

## Never Charge For History

An athlete's history belongs to them.

Forever.

---

## History Cannot Be Rewritten

Memories may be added.

History cannot be altered.

The integrity of the legacy must remain intact.

---

## Chapters Are Sacred

Chapters represent real periods of life.

Once archived, they become part of the permanent legacy.

---

## Rank Represents Legacy

Rank is long-term recognition.

Not competition.

Not social status.

Not a leaderboard.

---

## Accomplishments Are Identity

Accomplishments represent meaningful life achievements.

Not performance statistics.

---

## Honors Are Recognition

Honors are system-awarded recognition.

Not trophies.

Not collectibles.

---

## Squads Are Private

Squads are:

* Small
* Private
* High Trust
* Accountability Focused

They are not communities.

They are not social networks.

---

# 10. Explicitly Prohibited Patterns

Do not introduce:

* Public leaderboards
* Workout feeds
* Like systems
* Follower systems
* Comment systems
* Public workout statistics
* Streak pressure systems
* "Days since workout" shame mechanics
* Rank comparisons
* Public goal progress
* Public body metrics

Without a formal architecture review.

**Amendment pointer — Comparison-Philosophy-Amendment-001 (LOCKED, June 2026; v1.1):** that review has occurred for one bounded case. §10, §4, and §2 are now read in light of the **Consenting Competition Context** (CC-D1): performance comparison and ranked standings are permitted **only** when **roster-scoped (private to an opted-in bounded roster — a Squad *or* an explicitly-invited set of accepted Friends)** + opt-in + roster-locked + bounded-duration, behind the binding **Performance Firewall** (CC-D2) and anti-shame guardrails (CC-D3). "Public leaderboards," "Rank comparisons," and "Streak pressure systems" remain prohibited in their *public / involuntary / always-on* forms. Outside a Consenting Competition Context, every prohibition here stands unchanged. See the amendment for the four-gate Permissibility Test.

**Amendment pointer — Friend-Relationship-Architecture-Amendment-001 (LOCKED, June 2026):** Forge Legacy has a persistent, **mutual, private, doubly-consented Friend relationship** and a **private Friends Feed**. Neither is a banned pattern, and this pointer clarifies (does **not** change) the philosophy above:
- A **Friend is not a follower** (§6 "not followers"). Followers are asymmetric and unconsented; a Friend is mutual and accepted by both athletes — the *same category as squad membership*, which the DNA already endorses under High-Trust Relationships. No follower counts, no friend counts as a metric, no public/squad-visible friend lists, no popularity scores, no rankings between Friends, no friend-suggestion surfaces (FR-D2/D3).
- The **Friends Feed is not the prohibited "Workout feed" / "Public workout statistics."** The banned pattern is a *public, comparison-driven, automatic* workout feed. The Friends Feed is **private (visible only between accepted Friends), opt-in, bounded, and non-algorithmic** (FR-D4) — a curated activity feed of **intentional shares** (workout/PR photos & videos, captions, chosen fitness updates) plus a few **meaningful automatic milestones** (Honor earned, Program completed, Chapter completed, major milestones). It **never** auto-posts started/finished workouts, per-workout logs, sets/reps/weight/pace/scores/rankings, or any performance comparison. **Friendship alone never exposes protected performance data** — performance stays behind the Performance Firewall (CC-D2) and is visible only inside an opted-in challenge context.
- **Governing interpretation:** Forge Legacy prohibits *public, comparison-driven* workout feeds; it *permits* a **private, mutually-consented Friends Feed** centered on intentional sharing and meaningful milestones, exposing no protected performance data. Friend Challenges are permitted under CC-D1's roster-scoped context (above), always requiring explicit opt-in.

**Amendment pointer — Social-System-Architecture-v1.0 (LOCKED, June 2026; the governing authority for all social behavior in Forge Legacy):** the §10 "formal architecture review" required above has now been performed for the social engagement surfaces, in **SOC-D4** (the same narrowing precedent CC-D1 set for leaderboards). The narrowing, scoped as tightly as possible:
- **"Like systems"** — *public* like systems / like-counts-as-popularity remain prohibited; **private, audience-scoped reactions** (no popularity score, no ranking, no feed-bump) are permitted.
- **"Comment systems"** — *public* comment systems remain prohibited; **private, audience-scoped comments** (visible only to a post's audience, encouragement-oriented, non-ranking, non-bumping) are permitted.
- **"Workout feeds"** — the *public / automatic / comparison-driven* workout feed remains prohibited; a **private, opt-in, intentional-sharing Friends Feed** (manual posts + meaningful milestone posts only; never an automatic workout log) is permitted.
- **"Follower systems," "Public workout statistics," "Public goal progress," "Public body metrics," "Rank comparisons," "Streak pressure systems"** — **unchanged; still prohibited.** This review does not touch them.

The Performance Firewall (CC-D2) and anti-shame guardrails (CC-D3) are untouched, and no social action ever affects Rank, Honors, Legacy, or any progression (SOC-D13). Social-System-Architecture-v1.0 supersedes the Friends-Feed *presence-only* framing of FR-D4 (the intentional-sharing model above is now the authority); all other Friend decisions remain intact. **All future social work inherits from Social-System-Architecture-v1.0.**

**Amendment pointer — Calendar-System-Architecture-v1.0 (LOCKED, June 2026; the governing authority for the Calendar timeline layer):** the §10 "formal architecture review" required above has been performed for the **streak/consistency** patterns, in **CAL-D19** (the same narrowing precedent CC-D1 and SOC-D4 set). The narrowing, scoped as tightly as possible:
- **"Streak pressure systems"** — a *forward counter the athlete must protect*, "keep your streak" pressure, status-streaks, and engagement loops remain prohibited; a **private, backward-looking consistency visualization** (a calm calendar heat-map of which past days were trained, as *memory of what was built*) is permitted. It is never a target, never a status number, and feeds no progression.
- **"'Days since workout' shame mechanics"** — **unchanged; still prohibited in full.** The Calendar never shows "days since last workout," never marks gaps in red, never warns of a broken streak, and never notifies inactivity. Empty days are simply empty.
- **"Public leaderboards," "Rank comparisons," "Public workout statistics," and every other §10 pattern** — **untouched; still prohibited.** The consistency view is private to the athlete and never compared to anyone.

The Calendar owns no data, schedules only workouts / goal-milestone dates / rest days, never duplicates or replaces another system's logic, and emits no progression signal (CAL-D3/D21). **All future calendar/timeline work inherits from Calendar-System-Architecture-v1.0.**

---

# 11. Product Decision Test

Before any new feature is approved, ask:

1. Does this strengthen the athlete's story?
2. Does this strengthen long-term transformation?
3. Does this strengthen identity?
4. Does this strengthen legacy?
5. Does this avoid comparison?
6. Does this avoid shame?
7. Does this fit a premium, timeless product?

If the answer is no to multiple questions, the feature should be challenged before implementation.

---

# 12. North Star

Forge Legacy is not helping athletes win today.

Forge Legacy is helping athletes become someone they are proud of ten years from now.

Every product decision should support that outcome.
