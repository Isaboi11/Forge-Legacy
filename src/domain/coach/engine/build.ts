/**
 * THE BUILD — moved out of `CoachChatSheet.tsx` unchanged (Holt Listens HL-10, slice S4b).
 *
 * `advance` takes the request so far and either asks the next question, recommends from the shelf, has Holt write
 * the program or day (typed — Coach-AI-Amendment-003), or builds it from the rulebook — then shows the card. Words,
 * order and every guard are the sheet's; reads, writes, the model and the drafts go through the PORT; what is a
 * React value on the phone (cap gates, the close signal, the stop helpers, the card on screen, the paired setters)
 * comes in as {@link BuildHooks}.
 *
 * Generated from the sheet by a script (scratchpad `s4b.py`) so nothing was retyped; the substitutions are mechanical:
 * `say`/`setBusy` → sink, `pick(k)` → `pick(k, port.choose)`, data calls → port, refs → `refs.*`.
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { ProgramStructure } from '@/data/programs-live';
import type { CapGate } from '@/lib/entitlement';
import { AI_DECLINED_HOLT } from '../../consent/consent.ts';
import { withNotCharged } from '../../ai/ai-call.ts';
import { holtSpendVerdict, holtUncapped } from '../../entitlement/caps-core.ts';
import type { CapKey } from '../../entitlement/caps-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { earnsStructuredDevelopmentCredit } from '../../program/progress-core.ts';
import { draftFromStructure } from '../../../lib/program-draft-model.ts';
import { assemble } from '../assemble.ts';
import { authorFallbackLine, type AuthoredPlan, type AuthorRequest } from '../author.ts';
import { endsOnRace, firstWeeksOf, placeWrittenLifts, RACE_WEEK_LINE, raceWeekShape, stopsShortLine } from '../author-race.ts';
import { authorFacts, authoredLine, validateAuthored, type ValidatedPlan } from '../author-validate.ts';
import type { CatalogExercise } from '../candidates.ts';
import {
  askedLine,
  completeFor,
  dayCardFor,
  dayPreamble,
  isRoom,
  JUST_A_WEEK,
  nextQuestion,
  pickCardFor,
  preamble,
  programCardFor,
  readyToBuild,
  refusalCardFor,
  roomAssumedLine,
  startingLoadLine,
  thinDayFor,
  volumeFor,
  weeksBetween,
  writtenDayCardFor,
  type ChatMode,
  type ChatState,
  type DayCard,
  type ProgramCard,
} from '../chat-core.ts';
import { isEnduranceGoal } from '../constraints.ts';
import { buildDayWorkout, whyThin } from '../day.ts';
import { appliedSentence } from '../learned-preference.ts';
import { recommendFromShelf, SHELF_CANNOT_ADAPT, type ShelfProgram } from '../recommend.ts';
import { RACE_SPEC } from '../rulebook/endurance.ts';
import { limitationsLeftOut } from '../rulebook/hybrid.ts';
import { rationaleFor } from '../rulebook/rationale.ts';
import { defaultWeeksFor } from '../rulebook/skeletons.ts';
import { pick } from '../rulebook/voice.ts';
import { overCeilingLine, typedBlock, typedBlockLine, typedOverCeiling } from '../typed-block.ts';
import { PLAN_UNCHECKED } from './edit.ts';
import { askInWords, assumedLine, assumeForAiLane } from './lane.ts';
import type { Built, EnginePort, EngineRefs, EngineSink, Lane } from './types.ts';

/** What the build still needs from the sheet — React values on the phone, fakes in a test. */
export interface BuildHooks {
  /** Which conversation (S7, PO D10): `ai` asks in words and assumes the low-stakes answers; `tap` is today's chips. */
  lane: Lane;
  gates(key: CapKey): CapGate;
  closeSignal(): AbortSignal;
  /** The stop helpers (crisis / urgent / care / medical): the card goes up and the line is marked never-resend. */
  stop(route: 'crisis' | 'urgent' | 'care' | 'medical', text: string): void;
  /** The card on screen (render state). */
  lastCard(card: { program?: ProgramCard; day?: DayCard } | null): void;
  /** The paired setters (S4a) — they write the engine's copy and the sheet's together. */
  setConstraints(next: ChatState): void;
  setBuilt(next: Built | null): void;
}

/** The catalogue by key — `itemByKey` on the phone, built once per catalogue. */
const indexes = new WeakMap<readonly CatalogExercise[], Map<string, CatalogExercise>>();
function keyed(catalog: readonly CatalogExercise[]): (key: string) => CatalogExercise | undefined {
  let ix = indexes.get(catalog);
  if (!ix) {
    ix = new Map(catalog.map((e) => [e.key, e]));
    indexes.set(catalog, ix);
  }
  const found = ix;
  return (key) => found.get(key);
}

/*
 * ⚠ THE FREE ALLOWANCE IS SPENT ON WHAT HE ACTUALLY HANDS OVER (PO 11-08 launch QA, H18; AI audit 11-16, B-D1/B-D4).
 * `consume_holt_allowance` is the only thing that moves the counters the doors' `guard` reads. Walking away from the
 * questions costs nothing; so does a build he could not finish (a thin day) and a block nobody kept. A DAY pays once
 * it exists. A BLOCK pays at the keep (Start / Save to the Builder, `keepAsProgram` — the spend and the row in one
 * server step since 0270), once — "Ask me again" used to spend
 * Free's only program before they had kept anything. A refusal is the server's answer (another device spent the last
 * one). A null is an unreadable answer, and it fails CLOSED (sweep G4): it pays only for an athlete with no ceiling on
 * that allowance — anyone else is asked to try again, never sold anything (M-7 §10). See `holtSpendVerdict`.
 */
/** Why the allowance was not spent, in his words — a day's spend (`payHolt`) and a block's keep (`keepAsProgram`). */
export function sayHoltRefused(
  port: EnginePort,
  sink: EngineSink,
  hooks: BuildHooks,
  kind: 'day' | 'program',
  verdict: 'used_up' | 'retry',
  offerWeek = false,
): void {
  sink.busy(null);
  if (verdict === 'retry') {
    sink.say({ kind: 'holt', text: PLAN_UNCHECKED });
    return;
  }
  /* A full block refused while a week is still free: the week is the door that can help, with every answer kept. */
  const week = offerWeek && hooks.gates('short_programs').ok ? [{ label: JUST_A_WEEK, patch: { weeks: 1 } }] : [];
  sink.say(
    { kind: 'holt', text: kind === 'day' ? 'You’ve used this month’s free days from me. Premium makes them unlimited.' : 'You’ve used the free program I can build on your plan. Premium makes them unlimited.' },
    { kind: 'chips', chips: [...week, { label: 'See Premium', patch: {}, goTo: '/subscription?from=gate' }] },
  );
}

export async function payHolt(port: EnginePort, sink: EngineSink, hooks: BuildHooks, kind: 'day' | 'program', offerWeek = false): Promise<boolean> {
  const spend = await port.build.spend(kind);
  const verdict = holtSpendVerdict(spend, hooks.gates(kind === 'day' ? 'holt_days_per_month' : 'holt_programs'));
  if (verdict === 'build') return true;
  sayHoltRefused(port, sink, hooks, kind, verdict, offerWeek);
  return false;
}

/** `lead` replaces the ack beat when the answer was a DECISION rather than information — "Replace it"
    is not something to thank anybody for (holtai-22). */
export async function advance(
  refs: EngineRefs,
  port: EnginePort,
  sink: EngineSink,
  hooks: BuildHooks,
  next: ChatState,
  mode_: ChatMode,
  lead?: string,
): Promise<void> {
  const byKey = keyed(port.catalog);
  const merged = { ...next };
  /* ⚠ THE ROOM IS ANSWERED FROM MEMORY AT THE MOMENT IT WOULD HAVE BEEN ASKED (PO, 2026-09-30), not
     seeded up front — so a race, which never asks where, never gets a gym it did not want, and a
     room they SAID in this request ("I'm at home today") is already there and wins. */
  /* A TYPED day is not asked "what are we chasing today?" — they have just said what they want, and
     Holt reads the goal out of that. The rulebook fallback still needs one, so it gets what onboarding
     recorded, else the moderate range `buildDayWorkout` already treats as the least wrong guess. */
  if (mode_ === 'day' && refs.typed.length && nextQuestion(merged, mode_)?.id === 'goal') {
    merged.goal = refs.profileGoal ?? 'muscle';
    refs.goalGuessed = refs.profileGoal == null;
  }
  if (refs.room && nextQuestion(merged, mode_)?.id === 'where') {
    merged.environment = refs.room;
    refs.roomAssumed = true;
  } else if (merged.environment !== refs.room) {
    refs.roomAssumed = false;
  }
  /*
   * ══ AI LANE: A COACH DOES NOT STOP FOR THE SMALL THINGS (S7, PO D10 / P7) ══ Session length, what to work around and
   * the block's length are assumed — 60 minutes, nothing, the goal's usual length — and SAID before the build, so a
   * word changes them. Only what was never said is filled; anything they said stands.
   */
  if (hooks.lane === 'ai' && mode_ !== 'pick') {
    const { next: filled, assumed } = assumeForAiLane(merged, mode_);
    Object.assign(merged, filled);
    for (const a of assumed) if (!refs.assumed.includes(a)) refs.assumed.push(a);
  }
  hooks.setConstraints(merged);
  if (merged.experience) void port.memory.rememberExperience(merged.experience);

  try {
    if (!readyToBuild(merged, mode_)) {
      // Thinking is a real state and short. It exists so the next question does not appear the instant
      // you tap — a coach who answers before you have finished is not listening, he is waiting.
      sink.busy('thinking');
      await port.wait(420);
      sink.busy(null);
      const q = nextQuestion(merged, mode_);
      /* The short beat before the question — "Good." / "Right." / "Noted." It is what the original
       hardcoded line did ("Good. What are you training for?"), now varied so it does not become the
         tic that makes him sound like a script. */
      /* AI lane: asked in words, the choices named inline, nothing to tap — the answer is typed (or spoken). */
      if (q && hooks.lane === 'ai') sink.say({ kind: 'holt', text: `${lead ?? pick('ack', port.choose)} ${askInWords(q)}` });
      else if (q) sink.say({ kind: 'holt', text: `${lead ?? pick('ack', port.choose)} ${q.ask}` }, { kind: 'chips', chips: q.chips, ctl: q.ctl });
      return;
    }
    /* What he assumed for this request, said once, before he builds it (AI lane). */
    const assumedSaid = mode_ !== 'pick' ? assumedLine(refs.assumed) : null;
    if (assumedSaid) {
      sink.say({ kind: 'holt', text: assumedSaid });
      refs.assumed = [];
    }

    /*
     * ⚠ **THE SHELF BRANCH RETURNS BEFORE `completeFor`, AND THAT IS LOAD-BEARING.**
     *
     * `completeFor` fills a `CoachConstraints` — session length, limitations, equipment — with
     * defaults for anything the questionnaire did not ask. That is exactly right for a build and
     * exactly wrong here: this flow deliberately never asks about session length or a bad shoulder
     * (see `askShelf`), so running it would manufacture answers the athlete never gave and then
     * match a program against them. Nothing downstream would notice, and the card would quietly be
     * claiming a fit computed from invented input.
     */
    if (mode_ === 'pick') {
      sink.busy('reading');
      await port.wait(650);
      /*
       * ⚠ **THE PROGRAM THEY ARE ALREADY ON COMES OFF THE SHELF FIRST.**
       *
       * Nothing in `recommend.ts` knows what the athlete owns — it is pure, and it ranks a list it is
       * handed. So without this it will happily answer "which of these should I take" with the block
       * they are four weeks into, because that block genuinely is the best match for their goal,
       * their level and their week. Correct by the numbers and useless as an answer.
       *
       * Swallowed to null rather than surfaced: failing to read the active program is a reason to
       * recommend from the whole shelf, never a reason to refuse to recommend at all.
       */
      const active = await port.programs.active().catch(() => null);
      const running = active?.sourceDefinitionId ?? null;

      /* Projected here, at the boundary, exactly like `learned` — `domain/coach/**` reads no data of
         its own, so the shelf is handed in rather than imported by the recommender. */
      const shelf: ShelfProgram[] = port.build.definitions()
        .filter((d) => d.id !== running)
        .map((d) => ({
          id: d.id,
          name: d.name,
          family: d.family,
          difficulty: d.difficulty ?? null,
          durationWeeks: d.durationWeeks,
          frequencyPerWeek: d.frequencyPerWeek,
          environment: d.environment ?? null,
          description: d.description ?? null,
          theme: d.theme ?? null,
          goals: d.goals ?? [],
        }));
      const answer = recommendFromShelf(
        {
          /* Always answered. `askShelf` asks the goal first and cannot report ready without it. */
          goal: merged.goal!,
          /*
           * ⚠ **THESE THREE ARE DEFAULTED, AND THE DEFAULTS ARE PROVABLY NEVER READ.**
           *
           * `askShelf` reports ready in exactly two situations: every question answered, or an
           * ENDURANCE goal — which it short-circuits on the goal alone, because no amount of asking
           * about a room changes the fact that the shelf has no running programs. On that second
           * path none of these three has been asked, and `recommendFromShelf` refuses on
           * `isEnduranceGoal` before reading a single other field.
           *
           * ⚠ Written as defaults rather than a `!` because `experience!.lifting` is a CRASH, not a
           * lint complaint: a brand-new athlete whose very first tap is "Run a race" has no
           * remembered level, and the non-null assertion would have thrown a TypeError on a coach
           * about to say something perfectly sensible. And a default is only safe here because the
           * refusal makes it unreachable — this is the project's own standing lesson about a value
           * that is only ever its default, which is worse than an absent one precisely because it
           * renders a confident, specific, false claim. It renders nothing.
           */
          experience: merged.experience?.lifting ?? 'beginner',
          daysPerWeek: merged.daysPerWeek ?? 3,
          environment: merged.environment ?? 'full_gym',
        },
        shelf,
        /* QA holt-21: the card says the program they are on ends if they start this one. */
        { current: active?.name ?? null },
      );
      sink.busy(null);

      if (!answer.ok) {
        /* ⚠ A REFUSAL IS NOT AN ERROR — the same rule the endurance path already keeps. He says the
           no in his own voice and then offers the door that CAN help, because a recommendation flow
           that dead-ends is the defect the Discover link was added to fix. */
        sink.say(
          { kind: 'holt', text: answer.reason },
          { kind: 'chips', chips: [{ label: 'Write me one instead', patch: {}, startsBuild: true }, { label: "I'll look myself", patch: {}, goTo: '/workouts' }] },
        );
        return;
      }

      hooks.setBuilt(null);
      sink.say(
        { kind: 'holt', text: `${pick('ack', port.choose)} ${pick('pick_one_for_you', port.choose)}` },
        { kind: 'pick', card: pickCardFor(answer.best, answer.runnerUp) },
        /* ⚠ SAID EVERY TIME, NOT ONLY WHEN SOMETHING LOOKS WRONG. It is the standing limit of this
           whole flow — he did not write these and cannot bend one around anybody — and it doubles as
           the honest reason to have him write one. See `SHELF_CANNOT_ADAPT`. */
        { kind: 'holt', text: SHELF_CANNOT_ADAPT },
      );
      return;
    }

    sink.busy('building');
    /* `payHolt` (above `advance`) says what each build spends and when — a day pays once it exists (B-D4). */
    await port.wait(650);
    const c = completeFor(merged, mode_);
    /** A block's Builder draft is written now only when keeping it owes nothing more. A capped athlete's Holt
        program (four weeks or more, MA4-D5) waits for the keep and its payment (`keepAsProgram`, B-D1): written here,
        it was the whole program sitting in the Builder before anything was paid for. */
    const draftNow = (structure: ProgramStructure): boolean =>
      !earnsStructuredDevelopmentCredit(structure) || holtUncapped(hooks.gates('holt_programs'));
    /* Resolved at the boundary and handed down — see the note on the same call in `coach.tsx`. The
       chat and the wizard must build the same program from the same answers, so both paths get it. */
    const [learned, recent] = await Promise.all([port.build.learned(), port.build.recent()]);

    /*
     * ══ TYPED → HOLT WRITES IT (Coach-AI-Amendment-003, PO 2026-09-30) ══
     *
     * When the athlete typed or spoke the ask, the model reads every word and writes the session —
     * movements, order, sets, reps — from the catalogue the app shows. `validateAuthored` then runs each
     * movement through the same kit, level and limitation gates the rulebook uses; what fails is
     * dropped and said. A tapped build, a race, and any ask the model cannot be reached for fall
     * through to the rulebook below, and he says that it did.
     */
    const roomLine = refs.roomAssumed && isRoom(c.environment) ? roomAssumedLine(c.environment) : null;
    /* Held in an object because `holtWrites` fills it from inside a closure, and a `let` assigned there is
       one TypeScript still believes is null out here. */
    const holt: { written: { plan: AuthoredPlan; valid: ValidatedPlan } | null; fellBack: string | null } = { written: null, fellBack: null };
    /** Ask Holt to write it (`coach-author`). `false` means a stop card went up and nothing more should be said.
        ⚠ It used to be a local `askHolt` that shadowed the imported coach-ask stream (AI audit C-I7); that import
        is `streamCoachAsk` now, so neither name can stand for the other. */
    const holtWrites = async (kind: 'day' | 'program', days: number | null, weeks: number | null, beside: AuthorRequest['beside']): Promise<boolean> => {
      const athlete = {
        experience: c.experience.lifting,
        environment: c.environment,
        ownedEquipment: c.ownedEquipment,
        limitations: c.limitations,
        excludeExercises: c.excludeExercises,
      };
      const a = await port.build.author({
        kind,
        said: refs.typed,
        minutes: c.sessionMinutes,
        days,
        weeks,
        /* Beside a race the lifting has its own purpose (`strengthGoal`), never the race itself. */
        goal: beside ? ((c.strengthGoal ?? 'strength') as AuthorRequest['goal']) : refs.goalGuessed ? null : (c.goal as AuthorRequest['goal']),
        level: c.experience.lifting,
        room: isRoom(c.environment) ? c.environment : null,
        ...authorFacts(athlete, port.catalog, canDoExercise),
        recent: Object.keys(recent?.sessionsAgo ?? {}),
        notes: refs.heardNotes,
        beside,
      }, hooks.closeSignal());
      if (a.kind === 'stop') {
        sink.busy(null);
        /* Through the same four helpers as every other stop, so the line is marked and never sent again. */
        hooks.stop(a.route, refs.typed[refs.typed.length - 1] ?? '');
        return false;
      }
      if (a.kind === 'no_consent') holt.fellBack = AI_DECLINED_HOLT;
      /* "Not charged." when the server gave the credit back (Sprint 1 contract §1.2). */
      else if (a.kind !== 'ok') holt.fellBack = withNotCharged(authorFallbackLine(a), a.refunded);
      else {
        const valid = validateAuthored(a.plan, athlete, port.catalog, canDoExercise);
        holt.written = valid ? { plan: a.plan, valid } : null;
        if (!valid) holt.fellBack = authorFallbackLine({ kind: 'none' });
      }
      return true;
    };
    if (refs.typed.length && !isEnduranceGoal(c.goal)) {
      const kind = mode_ === 'day' ? 'day' : 'program';
      const ok = await holtWrites(kind, kind === 'program' ? c.daysPerWeek : null, kind === 'program' ? (c.weeks ?? defaultWeeksFor(c.goal)) : null, null);
      if (!ok) return;
    }
    const written = holt.written;

    if (written && mode_ === 'day') {
      const day = written.valid.days[0];
      /* The day exists, so now it pays (B-D4) — and before the draft is written. */
      if (!(await payHolt(port, sink, hooks, 'day'))) return;
      sink.busy(null);
      await port.drafts.saveWorkout({ name: day.name, warmup: day.warmup, main: day.main, cooldown: day.cooldown, editId: null });
      hooks.setBuilt({ kind: 'day', day });
      const dayCard = writtenDayCardFor(merged, day);
      hooks.lastCard({ day: dayCard });
      sink.say({ kind: 'holt', text: [authoredLine(written.plan, written.valid), roomLine].filter(Boolean).join(' ') }, { kind: 'day', card: dayCard, authored: true });
      return;
    }

    if (written) {
      /* The week he wrote, run through the rulebook's wave and deload for the length they chose (PB-4,
         audit B-G4): his rep ranges climb a rep a week, PAS-D7's deload weeks are marked and cut, and any
         fixed number they asked for is held. It used to be one week repeated (`vary: false`). */
      const { structure, deloads } = typedBlock(written.valid.title, written.valid.days, c.weeks ?? defaultWeeksFor(c.goal));
      /* PB-4: the shape said once — and a muscle the week takes past its recoverable ceiling, with the offer to trim. */
      const shape = [
        typedBlockLine(structure, deloads),
        overCeilingLine(typedOverCeiling(written.valid.days, c.goal, c.experience.lifting, byKey)),
      ]
        .filter(Boolean)
        .join(' ');
      sink.busy(null);
      if (draftNow(structure)) await port.drafts.saveProgram(draftFromStructure(structure));
      hooks.setBuilt({ kind: structure.weeks === 1 ? 'week' : 'program', structure });
      const asBuilt = { ...c, daysPerWeek: structure.daysPerWeek };
      const programCard = programCardFor(asBuilt, structure, [], written.valid.dropped.length ? '' : written.plan.say);
      hooks.lastCard({ program: programCard });
      const load = startingLoadLine(c);
      sink.say(
        { kind: 'holt', text: [authoredLine(written.plan, written.valid), roomLine].filter(Boolean).join(' ') },
        ...(shape ? [{ kind: 'holt' as const, text: shape }] : []),
        ...(load ? [{ kind: 'holt' as const, text: load }] : []),
        { kind: 'program', card: programCard, authored: true },
      );
      return;
    }

    if (mode_ === 'day') {
      const dayReq = {
        /* ⚠ WAS HARDCODED `full_body`, WHICH IS WHY A BACK-AND-BICEPS ASK CAME BACK AS A FULL BODY
           SESSION. The day builder has supported muscle groups since it was written; the chat was
           handing it the same focus every time and never asking. */
        focus: merged.dayFocus ?? ({ kind: 'split', split: 'full_body' } as const),
        /* The goal decides the prescription AND the cue — 5 × 5 heavy or 3 × 12, and what he says about it. */
        goal: c.goal,
        sessionMinutes: c.sessionMinutes,
        experience: c.experience.lifting,
        environment: c.environment,
        ownedEquipment: c.ownedEquipment,
        limitations: c.limitations,
        learned,
        recent,
      };
      const r = buildDayWorkout(dayReq, port.catalog, canDoExercise);
      sink.busy(null);
      /*
       * ⚠ **TWO MOVEMENTS IS NOT A SESSION, AND THIS USED TO SHIP THEM.** The old guard was
       * `length === 0`, so a bodyweight pull day came back as a single Plank and a beginner with a
       * bad back got "Walking Lunge, Dead Bug" — reported by the PO as *"it came up with one thing"*.
       *
       * `whyThin` re-runs the builder to find out WHICH lever would have fixed it rather than
       * inferring it from the request, because Holt is about to name a cause and offer a fix, and
       * being confidently wrong about which one is worse than saying nothing.
       */
      const thin = whyThin(dayReq, r.day.main.length, port.catalog, canDoExercise);
      if (thin) {
        const out = thinDayFor(thin);
        sink.say({ kind: 'holt', text: out.text }, { kind: 'chips', chips: out.chips });
        return;
      }
      /* A day he could not put together costs nothing; this one exists, so it pays — before the draft (B-D4). */
      if (!(await payHolt(port, sink, hooks, 'day'))) return;
      /* The wizard's own handoff, not a second one. A single day goes to the WORKOUT builder and a
         block goes to the PROGRAM builder — two different review screens, and the chat has no business
         inventing a third route to either. */
      await port.drafts.saveWorkout({ name: r.day.name, warmup: r.day.warmup, main: r.day.main, cooldown: r.day.cooldown, editId: null });
      hooks.setBuilt({ kind: 'day', day: r.day });
      const dayCard = dayCardFor(merged, r.day);
      hooks.lastCard({ day: dayCard });
      /* CL-D2 — if a learned preference actually landed in this session, he says so in his own
         turn rather than burying it in the card. `appliedSentence` reads the keys the assembler
         CHOSE, so he can never claim a movement the day does not contain. */
      const learnedSaid = appliedSentence(
        learned,
        r.day.main.map((e) => e.catalogKey ?? ''),
        (k) => byKey(k)?.name ?? k,
      );
      /* What they asked for by name ("upper chest", "two triceps") is said back from the session that
         was built, and an assumed room is said out loud — both so nothing he did is silent. */
      const heard = [askedLine(r.asked), roomLine, learnedSaid];
      sink.say({ kind: 'holt', text: [holt.fellBack ?? dayPreamble(), ...heard].filter(Boolean).join(' ') }, { kind: 'day', card: dayCard });
      /* PO 2026-09-29 (holtai-04): he says what "knees" took out, on a single day as on a block —
         and shoulders and lower back the same way (QA holt-02). */
      for (const line of limitationsLeftOut(c.limitations)) sink.say({ kind: 'holt', text: line });
      return;
    }

    /* ⚠ A RACE THE ATHLETE ASKED FOR IS BUILT (PO, 2026-09-21: *"holt shouldn't really say no to a race.
       Maybe suggest, but then just have him do what they say"*). `buildAnyway` turns the endurance
       refusal into `assembly.concern`, said once below the card with the suggestion as one tap. */
    const res = assemble(
      { ...c, learned, recent, ...(isEnduranceGoal(c.goal) ? { buildAnyway: true } : {}) },
      port.catalog,
      canDoExercise,
    );
    sink.busy(null);

    if (!res.ok) {
      /* ⚠ A REFUSAL IS NOT AN ERROR AND MUST NOT LOOK LIKE ONE. Holt says the no in his own voice, and
         the counter-offer follows as a CARD — the alternative becomes a thing with a button rather
         than a sentence the athlete has to act on themselves. */
      const weeks = weeksBetween(c.raceDate);
      const card = refusalCardFor(c.goal, weeks, c.daysPerWeek, res.refusal.message);
      sink.say({ kind: 'holt', text: res.refusal.message });
      if (card) sink.say({ kind: 'refusal', card });
      return;
    }

    let structure = res.assembly.structure;
    /*
     * ══ A TYPED RACE BLOCK THAT LIFTS (Coach-AI-Amendment-003 CW-D13, PO 2026-09-30) ══
     *
     * *"I want to run twice a week and lift 3 times a week. I'm prepping for a marathon but I want to
     * have weights and strength to help me. Build me a 7 week program."* The running above is the race
     * rulebook's arithmetic — the curve, the long run, the taper — on the days they gave it. The LIFTING
     * days are Holt's to write from their own words and their own gym, and they replace the rulebook's
     * in every week but race week. If he cannot be reached, the rulebook's lifting stays and he says so.
     */
    let raceLine: string | null = null;
    const builtWeeks = structure.weeks;
    if (refs.typed.length && isEnduranceGoal(c.goal)) {
      const shape = raceWeekShape(structure);
      if (shape.liftDays > 0) {
        sink.busy('building');
        /* The weeks they will actually be handed — told the block's full length, he reported their "7
           weeks" as something he had not done. */
        const keeps = merged.weeks != null && merged.weeks >= 1 && merged.weeks < structure.weeks ? merged.weeks : structure.weeks;
        const ok = await holtWrites('program', shape.liftDays, keeps, { race: RACE_SPEC[c.goal].label, runDays: shape.runDays });
        if (!ok) return;
        sink.busy(null);
        const wrote = holt.written;
        if (wrote) {
          /* Placed by what each day asks of the legs against the rulebook's week, deloads kept (B-D3). */
          const { weekShape, racePlacing } = res.assembly;
          const placed = placeWrittenLifts(
            structure,
            wrote.valid.days,
            weekShape && racePlacing ? { shape: weekShape, ...racePlacing, patternOf: (k) => byKey(k)?.pattern } : null,
          );
          structure = placed.structure;
          raceLine = [authoredLine(wrote.plan, wrote.valid), placed.clash, shape.liftDays > 1 && endsOnRace(structure) ? RACE_WEEK_LINE : null].filter(Boolean).join(' ');
        }
      }
      /* "A 7 week program" for a race further off is the first seven weeks of its build. */
      if (merged.weeks != null && merged.weeks >= 1 && merged.weeks < structure.weeks) {
        structure = firstWeeksOf(structure, merged.weeks);
        raceLine = [raceLine, stopsShortLine(structure.weeks, builtWeeks)].filter(Boolean).join(' ');
      }
    }
    /* Nothing is charged here: what is kept is paid for at the keep (`keepAsProgram`), and it is this structure —
       after any cut to "the first N weeks" — so what is charged is the block they are handed. */
    sink.busy(null);
    if (draftNow(structure)) {
      const chatDraft = draftFromStructure(structure);
      await port.drafts.saveProgram(chatDraft);
      /* QA holt-13 / holtai-16: a plan he just showed in chat is not news — mark it told, so the bubble
         never turns it into "still sitting in the builder". A draft left in the builder itself still is. */
      await port.drafts.setTold(chatDraft.name || null);
    }
    /* A week and a block are the same object from the engine and two different things to save — one
       goes to `week_templates`, the other to the Program Builder's draft. The size answer is what
       tells them apart, and `structure.weeks` is the engine's own word for it rather than the
       request's, so a clamp cannot make the buttons lie. */
    hooks.setBuilt({ kind: structure.weeks === 1 ? 'week' : 'program', structure });
    /* The curve of the block that was BUILT, cut to the weeks that are kept — a fresh curve for seven
       weeks would peak and taper inside a program that does neither. */
    const volume = volumeFor(c, builtWeeks).slice(0, structure.weeks);
    const reason = rationaleFor({
      goal: c.goal,
      daysPerWeek: c.daysPerWeek,
      sessionMinutes: c.sessionMinutes,
      weeks: structure.weeks,
      splitStyle: c.splitStyle ?? null,
      deloadWeeks: res.assembly.deloadWeeks,
      restructuredBecause: res.assembly.restructured?.because,
    });
    const programCard = programCardFor(c, structure, volume, reason);
    hooks.lastCard({ program: programCard });
    /*
     * ⚠ A SECOND BUBBLE, NOT A LONGER FIRST ONE. For a first-timer Holt says how to LOAD week one —
     * the question no prescription in the app answers, because none of them carries a weight. It is
     * its own line so it reads as the instruction it is rather than a clause at the end of a summary,
     * and it lands here, with the build, because in-workout coaching is capped at zero on Free and
     * anything said mid-set would never reach the athletes who need it. See `startingLoadLine`.
     */
    const load = startingLoadLine(c);
    /* The concern, once — and BEFORE the card (QA F14): a Start button above the warning reads as
       "fine to go", and the athlete should hear the risk before the one tap that commits them. It is
       still built (PO 2026-09-21, "suggest, then build"); the suggestion is a chip, never a wall —
       tapping it rebuilds for that race with every other answer kept. */
    const concern = res.assembly.concern;
    const alt = concern?.altGoal;
    sink.say(
      ...(holt.fellBack ? [{ kind: 'holt' as const, text: holt.fellBack }] : []),
      { kind: 'holt', text: [preamble({ ...c, daysPerWeek: structure.daysPerWeek }, structure.weeks), roomLine].filter(Boolean).join(' ') },
      ...(raceLine ? [{ kind: 'holt' as const, text: raceLine }] : []),
      ...(load ? [{ kind: 'holt' as const, text: load }] : []),
      ...(concern ? [{ kind: 'holt' as const, text: concern.message }] : []),
      /* AI lane (S7): the suggestion is said — "say the word and I'll build the half instead" — not a button. */
      ...(concern && alt && alt !== c.goal && hooks.lane === 'ai'
        ? [{ kind: 'holt' as const, text: `Say the word and I'll build the ${RACE_SPEC[alt].label} instead.` }]
        : []),
      ...(concern && alt && alt !== c.goal && hooks.lane !== 'ai'
        ? [{ kind: 'chips' as const, chips: [{ label: `Build the ${RACE_SPEC[alt].label} instead`, patch: { goal: alt } }] }]
        : []),
      /* Authored only when Holt wrote its lifting days (the race path above); a rulebook build carries no vote. */
      { kind: 'program', card: programCard, ...(holt.written ? { authored: true } : {}) },
    );
    /*
     * ⚠ WHAT THE ATHLETE ASKED FOR THAT DID NOT LAND IS SAID, NEVER DROPPED (Coach-AI-Amendment-001 §4.2).
     * A name the catalogue could not place is asked back; an exercise held out for a limitation or missing
     * kit is named with the reason and one tap to put it in anyway (CA-D12 — a stated limitation is never
     * silently overridden, and never silently obeyed against their explicit ask either). Concerns about
     * the week (seven days, no rest, a leg day before the long run) are said once.
     */
    const asm = res.assembly;
    const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
    for (const line of asm.concerns ?? []) sink.say({ kind: 'holt', text: line });
    if (asm.unresolved?.length) {
      sink.say({
        kind: 'holt',
        text: `I couldn't find ${list(asm.unresolved)} in the exercise library. Tell me what you meant and I'll put ${asm.unresolved.length > 1 ? 'them' : 'it'} in.`,
      });
    }
    const held = (asm.held ?? []).filter((h) => h.reason === 'limitation' || h.reason === 'equipment');
    if (held.length && merged.pinned?.length) {
      const why = held.some((h) => h.reason === 'limitation') ? 'because of what you asked me to work around' : "because it needs kit you haven't got";
      sink.say(
        { kind: 'holt', text: `I left ${list(held.map((h) => h.name))} out ${why}. Your call.` },
        {
          kind: 'chips',
          chips: [
            {
              label: 'Put it in anyway',
              patch: { pinned: merged.pinned.map((p) => (held.some((h) => h.asked === p.name) ? { ...p, confirmed: true } : p)) },
            },
          ],
        },
      );
    }
  } catch (e) {
    /*
     * ⚠ **THE SHEET FREEZING WAS THIS, AND THE FAILURE CARD BELOW HAD NO CALLER.**
     *
     * `busy` disables the composer — that is the point of it, you cannot answer a question Holt
     * has not finished asking. But it was cleared only on the happy paths, so ONE throw anywhere
     * in assembly left it set forever: the typing bubble pulsing, the input dead, no error, no
     * way out but to kill the app. A stall with no explanation, which is exactly what was
     * reported.
     *
     * The `error` turn has existed since the first version of this sheet and was rendered by
     * nothing — the failure state was designed, styled, and unreachable. Same write-only shape
     * this repo has shipped before, in the direction that hurts more: the UI was there and the
     * path to it was not.
     */
    sink.say({
      kind: 'error',
      text: 'That one broke on my end.',
      sub: e instanceof Error ? e.message : String(e),
      action: 'Tell me again and I’ll have another go.',
    });
  } finally {
    /* ⚠ THE ONLY PLACE `busy` IS GUARANTEED TO CLEAR. Every early return above passes through
       here, so a path added later cannot reintroduce the freeze by forgetting to reset it. */
    sink.busy(null);
  }
}

export type { ProgramStructure, AuthoredPlan, AuthorRequest, ValidatedPlan, ShelfProgram };
