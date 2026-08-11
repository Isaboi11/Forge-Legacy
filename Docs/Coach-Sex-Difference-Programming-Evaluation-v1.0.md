# Forge Legacy — Coach Holt and Sex Differences in Resistance Training
## Version 1.0 (Research + Scope) | 2026-08-11

**Status:** EVALUATION — no decisions locked, nothing implemented
**Trigger:** PO, 2026-08-11 — *"weight lifting is different for males and females. So the plans that
coach holt comes up with should be slightly different. We need to teach him how that looks."*
**Authority consulted:** `Coach-Holt` implementation (`src/domain/coach/**`),
`Program-Authoring-Standard-v1.0.md` (PAS-D11, LOCKED), `Exercise-Library-Architecture-v1.0.md`,
profile model (`profiles.sex`), starter-template audience system.

---

## Section 0 — The finding, up front

**The premise is half right, and the half that is right is not the half that looks obvious.**

The research does not support making Holt's *programming structure* sex-specific. Sets, reps, exercise
selection, rep ranges, progression logic and volume should be **the same for a man and a woman with the
same goal, experience and equipment** — the evidence for differentiating any of those is weak to absent,
and the largest relevant meta-analysis specifically found sex does not move the one table you would most
expect it to.

What genuinely differs is **absolute load** — the number of pounds, most pronounced on upper body. And
Forge has exactly one place where absolute pounds are decided by a rule rather than by the athlete:
`incrementFor`, which adds a **flat 5 lb**. That flat number is a 2% jump on a 225 lb bench and an 8%
jump on a 65 lb bench. It is the same defect this codebase already identified and fixed on the *back-off*
path — and never fixed on the way up.

So the recommendation is: **do not brand the plan by sex. Fix the thing that is actually wrong, which
disproportionately affects women but is not really about sex at all.** A 130 lb man on a 65 lb bench has
the identical problem, and a sex-branded fix would leave him with it.

There is a second, smaller finding: Forge **already ships a sex-differentiated plan library** — 42
women's starter templates against 36 men's. The product's existing answer to "the plans should be
different" is *curated content*, which is the correct layer for anything preference-driven.

---

## Section 1 — What the evidence says

### 1.1 Reps at a percentage of 1RM — NO meaningful sex difference

The obvious feature ("women get more reps at a given %1RM, so the rep tables should differ") is not
supported. A meta-regression of **952 repetitions-to-failure tests, 7,289 individuals, 269 studies**
found *little influence of sex, age, or training status* on the REPS~%1RM relationship, and states
explicitly that its estimates "can be applied to all individuals, regardless of sex."

Individual studies do show women completing more reps in specific conditions — 75% 1RM bench across
multiple sets, slow elbow-flexor contractions, 50% 1RM biceps curls. The effect is real but
context-dependent, and it does not survive aggregation into a general rule.

**Implication for Forge: do not build a sex-specific rep table.** It would be a confident,
specific claim the evidence does not carry.

### 1.2 Strength and hypertrophy adaptation — comparable, or favouring women in relative terms

- Hypertrophy: **no significant difference** between sexes (12 outcomes, 10 studies), confirmed by later
  Bayesian meta-analysis on relative muscle-size change.
- Upper-body strength: a **significant effect favouring females** — untrained women show a *higher*
  capacity to increase upper-body strength than men (19 outcomes, 17 studies).
- Lower-body strength: **no significant difference** (23 outcomes, 23 studies).
- Men show greater **absolute** change; women show equal or greater **relative** change.

**Implication for Forge: the progression engine's shape is already correct.** Double progression on a
rep range, earned by topping it, works identically for both. What needs to be relative is the *step*.

### 1.3 Fatigue and recovery — real within a session, unclear between sessions

Women fatigue less than men in several within-session protocols, plausibly linked to a greater relative
type I fibre area. But between-session recovery is genuinely unresolved: one protocol had men recovering
faster from squats, another had women completing a higher relative workload and recovering at the same
rate. The literature's own conclusion is that it "remains unclear whether there are generalizable sex
differences in recovery capacity."

**Implication for Forge: nothing to build, and nowhere to put it if there were.** `ProgramExercise` has
**no rest field** — `prescribe.ts` says so explicitly and refuses to write one, because the rest timer is
a session-time concern the logger owns. A shorter-rest-for-women rule has no destination, and the
evidence would not justify a schema change to create one.

### 1.4 Menstrual cycle — do not build

A 2023 systematic review found **no meaningful influence of cycle phase** on acute strength performance
or on adaptation to resistance training. 2024–25 mechanistic work found no difference in muscle protein
synthesis or breakdown between phases. Reviews repeatedly flag *poor and inconsistent methodological
practice* in this literature and call it premature to conclude that short-term hormonal fluctuation
appreciably affects performance or adaptation.

**Implication for Forge: explicitly out of scope, and worth recording as a decision rather than an
omission.** Cycle-phase periodisation would be (a) unsupported, (b) a health-data class this app does not
currently touch, with the privacy and platform obligations that brings, and (c) a standing invitation to
tell an athlete her training should change on a day the evidence says it should not.

### 1.5 Injury-risk profile — modest, and already handled generically

Higher ACL injury rates in women are well established, and landing/deceleration mechanics are the usual
programming response. Forge's conditioning skeletons already include plyometric work without a
sex-specific landing-quality layer. This is the one place a sex-linked adjustment has genuine support —
but it is a **content and cueing** change (landing mechanics, progression of jump volume), not a
structural one, and it belongs in the exercise coaching content rather than in the generator.

### 1.6 Exercise selection and emphasis — a preference, not a physiology

The common expectation ("women want more glute and lower-body work") is a **preference distribution**,
not a physiological difference. Encoding it from `profiles.sex` would mean the app deciding what a woman
wants to train because she is a woman — which is both a stereotype and, structurally, a worse product
than what Forge already has:

- `goal` (`strength | muscle | weight_loss | conditioning | mobility`) already carries training intent;
- the starter library already splits by audience, human-curated, 42 women's / 36 men's / 3 all;
- `defaultAudiences` already shows a woman the women's track **as a default, never a restriction** —
  "a man who wants the women's glute day can take it."

**Implication: emphasis belongs to goals and curated content, both of which exist.** The generator should
not infer training preference from sex.

---

## Section 2 — Where this lands in Forge's actual architecture

The point of this section is that **most of the plausible sex-aware features have nowhere to go**, and
knowing that is most of the scoping work.

| Candidate change | Evidence | Where it would live | Verdict |
|---|---|---|---|
| Sex-specific rep ranges | ✗ contradicted | `prescribe.ts` `REP_RANGES` | **No** |
| Sex-specific %1RM→reps | ✗ contradicted | `percent-max.ts` | **No** |
| Shorter rest for women | ~ weak, within-session only | **nowhere — no rest field** | **No** |
| Higher frequency for women | ~ unresolved | `skeletons.ts` | **No** |
| Sex-varying volume bands | ✗ no evidence | `rulebook/volume.ts` — but that is PAS-D11, **LOCKED** | **No** — would need a locked-doc amendment to encode a difference the evidence does not support |
| Cycle-phase periodisation | ✗ contradicted, + health data | new subsystem | **No — record as a decision** |
| Sex-specific strength standards | n/a | **none exist** — honors are `workouts_total`, `hours_forged`, `chapters_sealed`, `goals_achieved`, `active_weeks`, `chapter_workouts`, `chapter_days` | **Nothing to fix.** Forge measures consistency, not absolute load. This is a quietly excellent existing decision and it should stay. |
| **Load-relative progression step** | ✓ strong (absolute-load difference is the real one) | `progression.ts` `incrementFor` | **YES — the one real change** |
| Landing mechanics in plyo progression | ~ modest | exercise coaching content | **Maybe — content, not generator** |
| Starting-load estimation | ✓ upper/lower ratio differs by sex | **not built** — Holt refuses to prescribe load without a tested max | **Only if that feature is ever built** |

### 2.1 The one real change, in detail

`incrementFor(pattern, experience, equipment)` returns a **flat** figure — typically 5 lb, floored at the
equipment's loadable step. It has no idea what is currently on the bar.

```
5 lb added to a 225 lb bench  →  +2.2%   a normal progression
5 lb added to a 65 lb bench   →  +7.7%   a jump most lifters will fail, repeatedly
```

The codebase has **already reasoned this through once**, on the other side. From `progression.ts`, on
backing off:

> *"Adding and backing off are not the same move in opposite directions… Five pounds off a 315 squat is a
> rounding error; off a 65 lb overhead press it is a real cut. A single fixed number cannot serve both."*

That is exactly the argument for the way up, and the way up never got it. The fix is a **percentage step
with an absolute floor, rounded to the equipment's loadable notch** — the same shape the back-off logic
already uses.

Who this helps: everyone on a light bar. That includes most women on upper-body lifts, every beginner of
either sex, and every athlete on an accessory movement. **It is the right fix precisely because it is not
about sex** — it is about load, which is the variable that actually differs.

⚠ It has a dependency: microplates. A 2.5% step on a 65 lb bench is 1.6 lb, and `loadableStep` will round
that up to the smallest real increment. Whether the athlete owns fractional plates is a Home Gym question
(`plates` exists as an inventory id; fractional plates do not), and without them the honest floor on a
barbell is 5 lb regardless. **Dumbbells are worse** — the jump from a 20 to a 25 is 25% and no rule can
soften it. This is a real limit and the fix must not pretend otherwise.

---

## Section 3 — What "teaching Holt" would actually mean

Holt's architecture is *"engine small, RULEBOOK is the product — zero per-goal branches, everything is a
table."* Anything added here must be a table, not a branch. Three levels, smallest first:

### Level 1 — Fix the increment (recommended, ~half a day)

Make `incrementFor` load-relative. **No sex input at all.** Pure domain change in `progression.ts`, fully
unit-testable, no migration, no new intake question, ships OTA.

This is the change with the best evidence behind it and the widest benefit.

### Level 2 — Give the coach `sex`, and use it only where it earns its place (~1–2 days)

Add `sex` to `CoachConstraints` (it is already on `profiles`, so no migration — just plumbing it into
`assemble.ts`). Then use it for **exactly two things**, both of which are honest:

1. **The starter/anchor programs Holt reaches for**, matching the existing `defaultAudiences` behaviour —
   a default, never a restriction.
2. **Rationale copy** (`rulebook/rationale.ts`) — so Holt can *say* why he chose something, if there is
   ever a real sex-linked reason to state. Today there is only one candidate: landing mechanics.

⚠ The unspecified rule is already established and must be honoured: *"an unset sex is never quietly read
as male."* `defaultAudiences` returns all three tracks for `unspecified`. Any new code must do the same,
and there must be no path where a blank profile silently gets the men's plan.

### Level 3 — Sex-aware starting loads (only if load estimation is ever built)

Holt deliberately does not prescribe weight without a tested max, and that refusal is correct — *"a
percentage of a number nobody has measured is a guess wearing a decimal point."* If a future feature
estimates a starting load from bodyweight (`body_metrics.weight_lb` exists), **that** estimator needs
sex-specific coefficients and a different upper/lower ratio, because the sex difference in absolute
strength is larger in the upper body. Not before.

---

## Section 4 — Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| **SD-1** | Fix `incrementFor` to be load-relative? | **Yes.** Best evidence, widest benefit, no sex input needed. |
| **SD-2** | Plumb `sex` into `CoachConstraints`? | **Yes, but only for program selection + rationale.** Cheap, no migration, and it makes SD-4 possible later. |
| **SD-3** | Sex-varying reps / sets / volume / rest? | **No.** Contradicted (reps), unresolved (recovery), or governed by a LOCKED standard the evidence gives no reason to amend. |
| **SD-4** | Landing-mechanics emphasis in plyometric progressions? | **Defer.** Real but modest; belongs in exercise coaching content, and that pass is human-authored. |
| **SD-5** | Cycle-phase programming? | **No — and record it as a decision, not a gap**, so it is not repeatedly re-proposed. |
| **SD-6** | Fractional/microplate support in Home Gym? | **Open.** SD-1 is meaningfully better with it and still worthwhile without. |
| **SD-7** | Should Holt ever *say* it is adjusting for sex? | **No, under the current scope** — because after SD-1 and SD-2 he is not. Claiming a sex-based adjustment the engine does not make would be exactly the kind of small lie this codebase keeps removing. |

---

## Section 5 — What this does NOT change

- The 81 starter templates and their audience split. That is the sex-differentiated plan library, it is
  human-curated, and it is the right layer.
- PAS-D11 volume bands.
- Honors and rank, which measure consistency and carry no absolute-load standard.
- The reps, sets and rep-range tables in `prescribe.ts`.
- The rule that an unspecified sex is never coerced to male.

---

## Sources

- [Maximal Number of Repetitions at Percentages of the One Repetition Maximum: A Meta-Regression and Moderator Analysis of Sex, Age, Training Status, and Exercise (Sports Medicine)](https://link.springer.com/article/10.1007/s40279-023-01937-7) · [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10933212/)
- [Sex Differences in Resistance Training: A Systematic Review and Meta-Analysis (J Strength Cond Res)](https://journals.lww.com/nsca-jscr/_layouts/15/oaks.journals/downloadpdf.aspx?an=00124278-202005000-00030)
- [Sex differences in absolute and relative changes in muscle size following resistance training: a systematic review with Bayesian meta-analysis (PeerJ)](https://peerj.com/articles/19042/) · [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11869894/)
- [The effects of biological sex on fatigue during and recovery from resistance exercise (PeerJ)](https://peerj.com/articles/20542/) · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12790778/)
- [Sex Differences in the Temporal Recovery of Neuromuscular Function Following Resistance Training in Resistance Trained Men and Women (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6206044/)
- [Current evidence shows no influence of women's menstrual cycle phase on acute strength performance or adaptations to resistance exercise training (Frontiers)](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1054542/full)
- [The Influence of Menstrual Cycle Phases on Maximal Strength Performance in Healthy Female Adults: A Systematic Review with Meta-Analysis (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10818650/)
- [Sex differences in resistance training: a brief narrative review (Sport Sciences for Health)](https://link.springer.com/article/10.1007/s11332-026-01650-8)
