# Coach Adaptive Learning Amendment 002 — Intensity

**Status:** LOCKED
**Date:** 2026-08-12
**Owner:** Product
**Amends:** `Coach-Adaptive-Learning-Amendment-001.md` (extends CL-D1…CL-D11)
**Implemented by:** `domain/coach/rulebook/intensity.ts`, `domain/coach/intra-set.ts`,
`domain/coach/rulebook/in-workout-voice.ts`, `progression.ts` (`INCREMENT_BY_PATTERN`, `incrementFor`)

---

## 1. The request

> *"Some people want to be pushed and in the middle of a set be told, let's go up 10 lbs. Some people
> want just a helpful coaching daily 'be sure you feel it in your legs and not your back'."*
>
> *"If a beginner chooses the highest level of intensity it shouldn't be as high of a level as an expert
> lifter. And then even some people that are experts don't want a coach that's going to push them like
> that. Just reminders. So it's a very big range."* — PO, 2026-08-11

Holt had exactly one register. `experience` was the only dial and it changes set counts and jump sizes —
not how insistent he is.

## 2. Decisions

**CI-D1 — Intensity is one dial with four levels, and every level is available to everybody.**
`reminders | steady | push | drive`, stored on `profiles.app_prefs.coachIntensity`, default `steady`.

⚠ **Nothing is disabled by experience.** A greyed-out `drive` reads as *"you're not good enough"*, which
is the posture `Active-Workout-Flow-Spec-W9-W16` §"must never become" forbids, and it is a silent
narrowing under CL-D3. What a level MEANS is bounded instead — see CI-D2.

**CI-D2 — The level indexes a matrix that experience also indexes.** Twelve cells. On the three levers
that touch training content — `confirmSessions`, `intraSession`, `stepScale` — **`beginner@drive` is
bounded by `intermediate@push` and strictly below `intermediate@drive`.** A beginner who asks to be
pushed gets a louder coach, never a more aggressive one. That is the PO's sentence as arithmetic rather
than as a disabled control.

⚠ **`reminders` is identical across all three experiences on every content lever.** There is no
"quiet, but for an expert".

**CI-D3 — Intensity may never touch the volume tables.** `assemble()`, `prescribe.ts` and `skeletons.ts`
take no intensity argument and must not gain one. `SET_COUNTS`, `REP_RANGES`, `bandFor` and
`deloadWeeks` are PAS §10 bands re-checked by `validate-program.ts`; a settings toggle that can push an
athlete outside a locked band is a settings toggle that can hurt them.

**CI-D4 — `back_off` is invariant across all twelve cells.** `progression.ts`'s stated asymmetry —
*"advancing someone too fast costs them a rep, and it is the cheaper mistake to make in the other
direction"* — is the moral core of the engine. At maximum intensity the rescue behaviour is
byte-identical, `backOffTo()` never receives an intensity argument, and `set_back_off` reads the same at
all three registers so the rescue can never be delivered hard.

**CI-D5 — Safety cues are delivered at every level.** `reminders` is not "no coach"; it is *"the
technique cue and nothing else"*, which is literally the PO's second example. A dial that can switch off
*"feel it in your legs, not your back"* is a dial that can switch off the only thing between a novice and
a rounded back.

**CI-D6 — Every increment is bounded by the movement, in both directions.**
`INCREMENT_BY_PATTERN` becomes `[typical, floor, ceiling]`.

⚠ **The ceiling is the floor bug pointing upward.** The floor exists because a multiplier once dragged a
squat's jump to 2.5 lb — caught twice by the PO. Unbounded, `stepScale: 2` on advanced shoulder isolation
is **10 lb on a lateral raise**, the same *"teaches an athlete to stop reading the coach"* failure arrived
at from the other side. One table, three numbers, so bound and jump cannot drift apart.

⚠ **The order is floor → scale → ceiling and is not interchangeable.** Scaling first, an advanced squat
is `10 × 0.5 = 5`, floored to 10, so `× 2` gives 10 — `drive` would produce exactly `steady`'s jump for
the athletes most likely to reach for it.

**CI-D7 — There is no level above `drive`, and the request routes to programming.** "More intense"
means either jumps a movement cannot safely take (CI-D6) or more talking, which is nagging. Holt refuses
plainly — *"That's as hard as I push. The weight goes up when your logs say it should — not because you
asked."* — and routes to `experience` or a new program. This matches how the engine already behaves:
**endurance refuses rather than guesses.**

**CI-D8 — An unknown experience resolves to `beginner`, not `intermediate`.** Experience is device-local
(`coach-memory.ts`), so "absent" is what every new phone looks like. Because experience *bounds* the
dial here, falling to the middle would let a fresh install quietly unlock a harder coach. ⚠ This differs
from `incrementFor`'s own default, which only sizes a jump.

**CI-D9 — Within-session progression exists, and it is where "go up 10 lbs" lives.** `progressionFor`
reads the last two SESSIONS and speaks before the first rep; it cannot answer a question about the set
just finished. `intraSetSuggestion` is a separate module with five gates: the profile allows it, a
genuine overshoot (`OVERSHOOT_REPS = 2` past the top — beating a range by one is what the range is for),
a later set exists to instruct, the equipment is loadable, and **never downward**.

**CI-D10 — Register is a third dimension, never extra variants.** `voice.ts`'s rule is that a variant may
reword an answer but never change it. Keyed separately, three registers are three wordings of a fixed
answer *by construction* — the answer is decided before the voice table is reached.

**CI-D11 — No line characterises the set just logged.** Every line names the next action; any assessment
is handed to the athlete as a conditional, never asserted. ✅ *"If that moved well, take it to 195."*
❌ *"That looked easy — go up."* Enforced by a grading-regex test across all seven keys.

**CI-D12 — The dial is reachable from inside a session.** The moment an athlete learns it is wrong is the
moment Holt says something they did not want, and that is in a gym, not in Account Settings two days
later. Same field, two doors.

## 3. What did not change

| Document | Status |
| --- | --- |
| `Coach-Adaptive-Learning-Amendment-001` CL-D1…CL-D11 | Unchanged. Intensity is a CHOSEN preference; CL-D3's "propose, never silently apply" governs the learning layer, which is not in this pass. |
| PAS §10 volume bands | Unchanged, and CI-D3 exists to keep them that way. |
| `progression.ts`'s back-off and never-push-through-a-miss branches | Unchanged (CI-D4). |
| `voice.ts`'s 28 conversation keys | Untouched. In-workout lines are a separate table. |
| The rejection of a per-exercise effort field | Stands. One global dial; *"the rep range already is the instruction."* |
