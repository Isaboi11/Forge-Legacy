/**
 * THE TYPED TURN — moved out of `CoachChatSheet.tsx` unchanged (Holt Listens HL-10, slice S3).
 *
 *   · {@link process} — everything that happens to a typed line once it is on screen: the code-first stops, the
 *     kitchen, the free local matcher, the openers, then Holt (Premium AI) or "didn't catch that" (taps).
 *   · {@link understand} — Premium AI: a typed answer to the question on the table is placed for free, anything else
 *     goes to Holt's chat (`coach-ask`) with the build line ({@link buildingLine}).
 *   · {@link respondTo} — one understood step (a stop, an answer, a door, a build patch) acted on.
 *
 * Generated from the sheet by a script (scratchpad `s3.py`; names swapped in CODE only, never in comments), so nothing
 * was retyped. What is still the sheet's — the coach-ask stream (`askAloud`), the kitchen, the stop cards, the chip
 * router (`tapChip`, S5), the Premium gate modal — comes in as {@link TurnHooks}.
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { InterpretResult, InterpretStep } from '@/data/coach-interpret-live';
import { withNotCharged } from '../../ai/ai-call.ts';
import type { CapKey } from '../../entitlement/caps-core.ts';
import { isMakeRequest } from '../../nutrition/kitchen-dishes.ts';
import { ASK_CONTEXT_MS, within } from '../ask-stream.ts';
import type { AskTurn } from '../ask-wire.ts';
import { resolveAvoid } from '../avoid.ts';
import {
  focusSaid,
  fromOpener,
  interpret,
  isMedical,
  isRoom,
  looksLikeQuestion,
  nextQuestion,
  OPENERS,
  type ChatMode,
  type ChatState,
  type Chip,
  type Room,
} from '../chat-core.ts';
import { KITCHEN_UNCLEAR, KITCHEN_UNCLEAR_DOORS, kitchenWantsTraining } from '../kitchen.ts';
import { medicalRoute } from '../medical-routing.ts';
import { pick } from '../rulebook/voice.ts';
import { typedEquipment } from '../typed-equipment.ts';
import { advance, type BuildHooks } from './build.ts';
import { editByWords, finishTypedEdit, type EditHooks } from './edit.ts';

import { guardActiveProgram } from './guards.ts';
import { askInWords, CHANGE_WHAT_LINE } from './lane.ts';
import type { EnginePort, EngineRefs, EngineSink } from './types.ts';

/** "undo that", "put it back", "never mind, change it back", "revert" — short lines that ask to take back the last change. */
export const isUndoAsk = (text: string): boolean => {
  const t = text.toLowerCase().replace(/[’']/g, "'");
  if (t.length > 120) return false;
  return (
    /\b(undo|revert) (that|it|this|the (last )?change|what you (just )?(did|changed))\b/.test(t) ||
    /^\s*(please )?(undo|revert)[.!]?\s*$/.test(t) ||
    /\b(put|change|set) (it|that|them) back\b/.test(t) ||
    /\btake (it|that|them) back\s*[.!]?\s*$/.test(t) ||
    /\bgo back to (how|what) it was\b/.test(t) ||
    /^\s*(actually,? )?never ?mind[.!,]?\s*(undo (that|it)[.!]?)?\s*$/.test(t)
  );
};

/** What the typed turn still needs from the sheet (until S5/S7). */
export interface TurnHooks {
  premiumAi: boolean;
  nutritionAccess: boolean;
  /** The sheet is open as Holt's kitchen. */
  kitchen: boolean;
  edit: EditHooks;
  build: BuildHooks;
  /** The paired setters (S4a). */
  setMode(next: ChatMode | null): void;
  setConstraints(next: ChatState): void;
  /** The chip router (moves in S5). */
  tapChip(chip: Chip, echo?: boolean): void;
  /** The Premium gate: true = may proceed; false = the modal is up. */
  guard(key: CapKey): boolean;
  blockDoorRefuses(weeks?: number | null): boolean;
  keepRoom(env: Room): void;
  creditsLine(r: { remaining: number; allowance: number }, web: boolean): Promise<string>;
  loadNotes(): Promise<string[]>;
  /** This conversation's own recent words (CA-D1), for the model. */
  history(): AskTurn[];
  /** Holt's chat — the coach-ask stream (stays in the sheet: streaming, Stop, Try again). */
  askAloud(text: string, history: AskTurn[], q: ReturnType<typeof nextQuestion>, opts?: { allowWeb?: boolean; kitchen?: boolean; building?: string | null }): Promise<void>;
  runKitchen(ask: string, nudge: null): Promise<void>;
  stops: { crisis(text: string): void; urgent(text: string): void; care(text: string): void; medical(text: string): void };
}

/** The build fields Holt is told are settled mid-build (Sprint 4a — coach-interpret's `known`, minus the long lists). */
export const SETTLED_KEYS: ReadonlySet<string> = new Set([
  'goal', 'daysPerWeek', 'sessionMinutes', 'environment', 'experience', 'limitations', 'raceDate', 'weeks',
  'currentWeeklyMi', 'liftDays', 'strengthGoal', 'goalTimeSec', 'focusMuscles', 'dayFocus',
]);

/** A new request: their own words for it, and the goal no longer a stand-in. */
export function beginRequest(refs: EngineRefs, words: string[]): void {
  refs.typed = words;
  refs.goalGuessed = false;
}

/** Another line of the same request, once. */
export function alsoSaid(refs: EngineRefs, text: string): void {
  if (refs.typed[refs.typed.length - 1] !== text) refs.typed = [...refs.typed, text];
}

/**
 * The facts about the ATHLETE that outlive one request — their level and the kit in their garage.
 * Everything else in `constraints` describes the request just made, and carrying it into the next one
 * is how "What should I train today?" after a marathon build came back as *Bench 1×1* (stress test
 * 2026-09-21): the race goal was still set, so the day was prescribed as race work.
 */
export const athleteFacts = (c: ChatState): ChatState => ({
  ...(c.experience ? { experience: c.experience } : {}),
  ...(c.ownedEquipment ? { ownedEquipment: c.ownedEquipment } : {}),
});

/** One understood step — a single reply, or one part of a message that asked for several things. */
export async function respondTo(
  refs: EngineRefs,
  port: EnginePort,
  sink: EngineSink,
  hooks: TurnHooks,
  r: InterpretStep | InterpretResult,
  text: string,
  q: ReturnType<typeof nextQuestion>,
  m: ChatMode,
): Promise<void> {
  switch (r.kind) {
    case 'crisis':
      return hooks.stops.crisis(text);
    case 'urgent':
      return hooks.stops.urgent(text);
    case 'care':
      return hooks.stops.care(text);
    case 'medical':
      return hooks.stops.medical(text);
    case 'out_of_credits':
      /* The same line as a question at the cap (C-D1) — never the Free plan's `allowance_program`. */
      return sink.say({ kind: 'holt', text: await hooks.creditsLine(r, false) });
    case 'offline':
      /* Which way it failed (Sprint 1, P-G3): his end, a clock, or the connection — and "Not charged." when the
         server gave the credit back. */
      return sink.say({
        kind: 'error',
        text: "I couldn't reach my notes just then.",
        sub: withNotCharged(
          r.timedOut
            ? 'It took too long, so I stopped waiting.'
            : r.unavailable
              ? 'Something broke on my end, not your connection.'
              : 'The connection dropped before I heard back.',
          r.refunded,
        ),
        action: 'Tap an answer, or send it again in a moment.',
      });
    case 'unclear':
      /* With a question on the table, "didn't catch that" and the choices again is right. With nothing on
         the table (an emoji, "ok", a stray line) it reads as a coach who is not listening — he offers the
         doors instead (live run 2026-09-22: 23 small-talk lines got "didn't catch that"). */
      if (q) {
        if (hooks.premiumAi) sink.say({ kind: 'holt', text: `${pick('not_understood', port.choose)} ${askInWords(q)}` });
        else sink.say({ kind: 'holt', text: pick('not_understood', port.choose) }, { kind: 'chips', chips: q.chips, ctl: q.ctl });
        return;
      }
      /* AI lane: he is listening — no doors to tap, just the question. */
      if (hooks.premiumAi && !hooks.kitchen) return void sink.say({ kind: 'holt', text: "I'm here. What are we working on?" });
      sink.say(
        hooks.kitchen
          ? { kind: 'holt', text: KITCHEN_UNCLEAR }
          : { kind: 'holt', text: "I'm here. What are we working on?" },
        hooks.kitchen
          ? { kind: 'chips', chips: KITCHEN_UNCLEAR_DOORS.map((d) => ({ label: d.label, patch: {}, goTo: d.goTo })) }
          : { kind: 'chips', chips: OPENERS.slice(0, 4).map((label) => ({ label, patch: {} })) },
      );
      return;
    /* A question mid-conversation is answered, and the question that was on the table comes back —
       asking "what's RPE?" while he wants to know your days should not lose the build. */
    case 'answer':
      sink.say({ kind: 'holt', text: r.text });
      if (q && hooks.premiumAi) sink.say({ kind: 'holt', text: askInWords(q) });
      else if (q) sink.say({ kind: 'holt', text: q.ask }, { kind: 'chips', chips: q.chips, ctl: q.ctl });
      return;
    /* A door the app already has. Opened exactly as the matching opener chip opens it, minus the echo —
       the athlete's own sentence is already in the thread. */
    case 'door':
      /* "Swap bench for dumbbell press on Monday" carries the change itself — resolve and confirm it
         rather than walking them through five taps to say what they already said. */
      /* A draft Holt just wrote is changed by writing it again with this message added — "add one more
         triceps movement" is about the card on screen, not about a program they are running. */
      if (r.to === 'edit' && refs.built && refs.typed.length && refs.mode && refs.mode !== 'pick') {
        alsoSaid(refs, text);
        return void advance(refs, port, sink, hooks.build, refs.constraints, refs.mode);
      }
      if (r.to === 'edit' && r.edit) return editByWords(refs, port, sink, hooks.edit, r.edit, text);
      /* AI lane: "change my program" with nothing said about what — he asks, in words, instead of a session picker. */
      if (r.to === 'edit' && hooks.premiumAi) {
        return void sink.say({ kind: 'holt', text: CHANGE_WHAT_LINE });
      }
      /* "Give me something for today, keep it light, mostly machines" opens the door with nothing the
         form could hold — and everything Holt needs. The door resets the request; the sentence is put
         back so he still reads it when it is time to build. */
      if (r.to === 'build' || r.to === 'build_day') setTimeout(() => alsoSaid(refs, text), 0);
      return hooks.tapChip(
        {
          label:
            r.to === 'edit'
              ? 'Change my program'
              : r.to === 'import'
                ? "I've got a program already"
                : r.to === 'build'
                  ? 'Build me something'
                  : r.to === 'build_day'
                    ? 'What should I train today?'
                    : 'Which one should I pick?',
          patch: {},
        },
        false,
      );
    case 'patch': {
      /* The model hands back the athlete's own words for a day focus; the engine needs a `DayFocus`. */
      const { dayFocus: said, avoid, ...rest } = r.patch as Partial<ChatState> & { dayFocus?: unknown; avoid?: unknown };
      /* What they said to leave out is removed by the ENGINE, so Holt's "no lunges" is a fact on the card. */
      const avoidKeys = Array.isArray(avoid) ? resolveAvoid(avoid.filter((x): x is string => typeof x === 'string'), port.catalog) : [];
      if (avoidKeys.length) {
        (rest as Partial<ChatState>).excludeExercises = [...new Set([...(refs.constraints.excludeExercises ?? []), ...avoidKeys])];
      }
      /* …and how they said to divide it — "upper chest", "two tricep workouts and the rest chest" — is
         read from their own sentence, because the patch has no field for either (`focusSaid`). */
      /* A focus the model heard and the parser cannot place ("forearms and neck") must not be asked for
         again: Holt reads the sentence itself, and full body is only what the rulebook would fall back to. */
      const focus =
        typeof said === 'string' ? focusSaid(said, text) ?? ({ kind: 'split', split: 'full_body' } as const) : null;
      /* QA holtai-04 — the model's patch has no equipment field, so "dumbbells only" arrived as a bare
         `home` and built from an empty home gym. The kit named in their own sentence rides along. */
      const patch: Partial<ChatState> = { ...rest, ...(focus ? { dayFocus: focus } : {}), ...(typedEquipment(text) ?? {}) };
      /* "Run twice a week and lift three times" is THEIR split, and the race rulebook does not re-cut it
         (`CoachConstraints.splitAsSaid`). Only ever set from words — no tap carries a lifting-day count. */
      if (typeof patch.liftDays === 'number' && patch.liftDays > 0) patch.splitAsSaid = true;
      /* A room typed in answer to "where?", or the first one they have ever named, is kept. Any other
         is this request's alone: "I'm at a hotel gym today" must not become where they train. */
      if (isRoom(patch.environment) && (q?.id === 'where' || refs.room == null)) hooks.keepRoom(patch.environment);
      if (refs.mode) {
        if (r.say) sink.say({ kind: 'holt', text: r.say });
        alsoSaid(refs, text);
        return void advance(refs, port, sink, hooks.build, { ...refs.constraints, ...patch }, m);
      }
      const opens: ChatMode = focus ? 'day' : 'program';
      if (opens === 'day' && !hooks.guard('holt_days_per_month')) return sink.say({ kind: 'holt', text: pick('allowance_day', port.choose) });
      /* "Build me a one-week deload" says its length, so it asks for the training week it will spend (MA4-D5). */
      if (opens === 'program' && hooks.blockDoorRefuses(patch.weeks)) return;
      hooks.setMode(opens);
      beginRequest(refs, [text]);
      const request: ChatState = { ...athleteFacts(refs.constraints), ...patch };
      /* ⚠ SAVED BEFORE THE ACTIVE-PROGRAM QUESTION (QA R2-F8). The guard can stop here to ask about the
         block they already run, and "Replace it" carries on from `constraints` — so the parsed request has
         to be in state first, or a fully typed build comes back as "What's the goal?". */
      hooks.setConstraints(request);
      if (opens === 'program' && !(await guardActiveProgram(refs, port, sink, request, hooks.build.lane))) return;
      /* ⚠ THE MODEL'S LINE WAITS FOR THE GUARDS (QA holtai-22). Said first, "Let's replace that plan." sat
         above "You've already got X running…" — Holt announcing a replacement nobody had agreed to — and
         above the allowance stop it contradicted. It is only true once the build is actually going ahead. */
      if (r.say) sink.say({ kind: 'holt', text: r.say });
      return void advance(refs, port, sink, hooks.build, request, opens);
    }
  }
}

/**
 * ══ PREMIUM AI: EVERY TYPED LINE GOES TO HOLT'S CHAT (AI Road to 10 Sprint 4a, CH-3 — PO 11-18) ══
 *
 * `coach-interpret` used to read every line that was not a question. Now `coach-ask` reads them all — one brain — and
 * hands back what the app should do as actions (`actOn`): a build (`propose_program` / `propose_day`) runs the SAME
 * 'patch' handling a typed request always had, a door the same door, a change the same edit flow, and everything new
 * is a card. Old phones keep calling coach-interpret, which stays deployed and unchanged.
 *
 * The free local matcher still places a typed answer to the question on the table ("4 days") — no model, no credit
 * (it was interpretTyped's step 1). Anything it cannot place goes to Holt with the build line (`buildingLine`).
 */
export function buildingLine(refs: EngineRefs, q: ReturnType<typeof nextQuestion>, m: ChatMode): string | null {
  if (!refs.mode) return null;
  const settled = Object.fromEntries(
    Object.entries(refs.constraints).filter(
      ([k, v]) => SETTLED_KEYS.has(k) && v != null && !(Array.isArray(v) && v.length === 0),
    ),
  );
  return [
    m === 'day' ? 'Building ONE session, not a program.' : 'Building a full program.',
    q ? `Holt just asked: "${q.ask}"` : null,
    q?.chips.length ? `Offered answers: ${q.chips.map((c) => c.label).join(' · ')}` : null,
    Object.keys(settled).length ? `Already settled, do not re-fill: ${JSON.stringify(settled)}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export async function understand(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: TurnHooks, text: string): Promise<void> {
  const m: ChatMode = refs.mode ?? 'program';
  const q = refs.mode ? nextQuestion(refs.constraints, m) : null;
  /* This conversation's own recent words (CA-D1) — the current message is not in `thread` yet. */
  const history = hooks.history();
  /* What Holt knows about them (CA-D2), read once per sheet — the build's coach-author write carries it
     (`heardNotes`), and a note he offers that they already have is not offered twice. Bounded (C-D2). */
  await within(ASK_CONTEXT_MS, hooks.loadNotes(), []);
  if (q && !looksLikeQuestion(text)) {
    const local = interpret(text, q);
    if (local) return respondTo(refs, port, sink, hooks, { kind: 'patch', patch: local, say: null, remaining: null }, text, q, m);
  }
  return hooks.askAloud(text, history, q, { building: buildingLine(refs, q, m) });
}

/** Everything that happens to a message after it is on screen. */
export function process(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: TurnHooks, text: string): void {
  /* ⚠ CHECKED BEFORE ANYTHING ELSE, and before any attempt to understand the sentence as training.
     Someone describing an injury is not answering the question on the table, and treating their knee
     as an answer to "how many days a week" would be the worst possible reading of it. */
  /* ⛔ A person in danger first — before the injury check, whose copy is a physio referral. */
  const danger = medicalRoute(text);
  if (danger === 'crisis') return void hooks.stops.crisis(text);
  if (danger === 'urgent') return void hooks.stops.urgent(text);
  if (danger === 'care') return void hooks.stops.care(text);
  /*
   * ══ THE KITCHEN ══ (Chef Holt stress test 2026-09-25). Every stop is code-first here — a condition or
   * an injury never reaches a model or spends a credit — and every other line goes to `coach-ask`, which
   * has the recipe book, the diary and the NUT-D4 rules, unless it is plainly about training.
   */
  if (hooks.kitchen && danger !== 'clear') return void hooks.stops.medical(text);
  /*
   * ══ "UNDO THAT", TYPED, UNDOES IT (live run 11-19) ══ The model has no undo tool, and answered "no problem — leaving
   * your Pull days as they are" about a change that had ALREADY SAVED. Typed undo of Holt's last change is the Undo
   * button's job, done here, free, before any model — and it never claims what did not happen.
   */
  if (!hooks.kitchen && refs.lastEdit && isUndoAsk(text)) {
    void finishTypedEdit(refs, port, sink, hooks.edit, { label: 'Undo', patch: {}, typedEdit: 'undo' });
    return;
  }
  if (hooks.kitchen && hooks.premiumAi && hooks.nutritionAccess && isMakeRequest(text)) {
    void hooks.runKitchen(text, null);
    return;
  }
  if (hooks.kitchen && hooks.premiumAi && !kitchenWantsTraining(text)) {
    void hooks.askAloud(text, hooks.history(), null, { kitchen: true });
    return;
  }
  /* The broad word list stops "my shoulder hurts, swap it" — right for a string matcher, wrong once the
     model reads the sentence (the PO's action-is-fine rule). With Premium AI, `interpretTyped` runs the
     narrow code guard and the model's own medical routing instead. */
  if (!hooks.premiumAi && isMedical(text)) {
    hooks.stops.medical(text);
    return;
  }

  /* QA holtai-04 — kit named outright ("dumbbells only", "just bands and a bench") is read here, free,
     before any model. It answers the where/gear question on the table without a round trip. */
  const gear = typedEquipment(text);
  const onTable = refs.mode ? nextQuestion(refs.constraints, refs.mode) : null;
  if (gear && (onTable?.id === 'where' || onTable?.id === 'gear')) {
    void advance(refs, port, sink, hooks.build, { ...refs.constraints, ...gear }, refs.mode ?? 'program');
    return;
  }

  const opener = fromOpener(text);
  /* The typed path only understands the two openers that START something. Typing "how do I…" is a
     question for the model, not for a string match — see TYPING_ENABLED. */
  if (opener?.kind === 'build') {
    hooks.setMode(opener.mode);
    void advance(refs, port, sink, hooks.build, { ...athleteFacts(refs.constraints), ...opener.patch, ...(gear ?? {}) }, opener.mode);
    return;
  }

  if (hooks.premiumAi) {
    void understand(refs, port, sink, hooks, text);
    return;
  }

  const q = nextQuestion(refs.constraints, refs.mode ?? 'program');
  const said = q ? interpret(text, q) : null;
  const patch = said || gear ? { ...(said ?? {}), ...(gear ?? {}) } : null;
  if (!patch) {
    /* He asks again rather than guessing. A coach who mishears and proceeds is worse than one who
       checks — and until the model lands, this is the honest edge of what he understands. */
    sink.say({ kind: 'holt', text: pick('not_understood', port.choose) });
    if (q) sink.say({ kind: 'chips', chips: q.chips, ctl: q.ctl });
    return;
  }
  void advance(refs, port, sink, hooks.build, { ...refs.constraints, ...patch }, refs.mode ?? 'program');
}
