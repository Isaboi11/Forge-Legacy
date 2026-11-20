/**
 * WHAT HOLT ASKED THE APP TO DO — moved out of `CoachChatSheet.tsx` unchanged (Holt Listens HL-10, slice S3b).
 *
 * `coach-ask` forwards his action tools (`ask-tools.ts` `ASK_ACTIONS`) instead of running them. A program change goes
 * through `respondTo` → `editByWords` — the same resolver, the same confirm chips and the same invariants as a change
 * the athlete typed as a command — so the model never gets a more powerful edit path than the athlete's own thumb
 * (edit-ops header). A build is the same 'patch' a typed request always was; a card is held until the turn ended
 * cleanly, then drawn. The online offer is a chip, and tapping it is the consent.
 *
 * With this in the engine, a simulated athlete's conversation runs model → actions → app with no phone (HL-12).
 * Card drawing (ids, Undo tokens) stays the sheet's: {@link ActHooks}.
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { AskAction } from '@/data/coach-ask-live';
import { CARD_DROPPED_LINE, planHoltActions } from '../ask-outcome.ts';
import type { ChatMode, ChatState, nextQuestion } from '../chat-core.ts';
import { holdTurnActions, type CardContext, type ShownCard, type TurnEnd } from '../holt-action-cards.ts';
import { localToday } from '../../nutrition/day.ts';
import type { EquipmentGate } from '../candidates.ts';
import { proposeChange } from './change.ts';
import { finishTypedEdit } from './edit.ts';
import { respondTo, type TurnHooks } from './turn.ts';
import type { EnginePort, EngineRefs, EngineSink } from './types.ts';

/** What acting on his tools still needs from the sheet: the typed turn's hooks, and the card shelf. */
export interface ActHooks {
  turn: TurnHooks;
  /** Holt's notes as last read (`notesRef`), else the build's copy — a note they already have is not offered twice. */
  knownNotes(): string[];
  /** What a card needs to draw itself (units, nutrition access, today's plan…). */
  cardContext(): Promise<CardContext>;
  /** Put a drawn card on screen (the sheet keeps its id and Undo token). */
  showCard(card: ShownCard): void;
  /** The kit gate a rewrite is checked with (`canDoExercise` on the phone). */
  canDo: EquipmentGate;
}

/** True when something was shown, so the caller adds nothing on top; `flow` when it carried on a build or a change. */
export async function actOn(
  refs: EngineRefs,
  port: EnginePort,
  sink: EngineSink,
  hooks: ActHooks,
  actions: AskAction[],
  asked: string,
  end: TurnEnd,
  clean: boolean,
  q: ReturnType<typeof nextQuestion>,
  m: ChatMode,
): Promise<{ shown: boolean; flow: boolean }> {
  if (!actions.length) return { shown: false, flow: false };
  /* Sprint 4a: routed in one pure place (`planHoltActions`, ask-outcome.ts) — and ⛔ nothing at all unless the turn
     ended cleanly (§1.3). Builds and edits go through the SAME handling a typed line always had (`respondTo`). */
  const plan = planHoltActions(actions, {
    clean,
    todayISO: localToday(),
    knownNotes: hooks.knownNotes(),
    asked,
    nutrition: hooks.turn.nutritionAccess,
    building: refs.mode != null,
  });
  let shown = false;
  let flow = false;
  /* Lane C's hold: the card actions of THIS turn, released only after a clean ending (`cardsMayShow`, again). */
  const hold = holdTurnActions();
  for (const step of plan.steps) {
    switch (step.kind) {
      case 'edit':
        await respondTo(refs, port, sink, hooks.turn, { kind: 'door', to: 'edit', edit: step.edit }, asked, q, m);
        shown = flow = true;
        break;
      case 'door':
        await respondTo(refs, port, sink, hooks.turn, { kind: 'door', to: step.to }, asked, q, m);
        shown = flow = true;
        break;
      case 'patch':
        await respondTo(refs, port, sink, hooks.turn, { kind: 'patch', patch: step.patch as Partial<ChatState>, say: null, remaining: null }, asked, q, m);
        shown = flow = true;
        break;
      case 'change':
        await proposeChange(refs, port, sink, { canDo: hooks.canDo, creditsLine: hooks.turn?.creditsLine, medicalStop: hooks.turn?.stops?.medical }, step.brief, asked, step.newEquipment);
        shown = flow = true;
        break;
      /* "Scratch that change" (round 3, 11-19): the model decided it is an undo — the app's own Undo, free. A card
         still waiting is simply left; nothing of his to undo is said plainly. */
      case 'undo':
        if (refs.pendingRewrite) {
          refs.pendingRewrite = null;
          sink.say({ kind: 'holt', text: "Left it as it was — nothing changed." });
        } else if (refs.lastEdit) {
          await finishTypedEdit(refs, port, sink, hooks.turn.edit, { label: 'Undo', patch: {}, typedEdit: 'undo' });
        } else {
          sink.say({ kind: 'holt', text: "There's no change of mine to undo in this chat — your program is as it was." });
        }
        shown = flow = true;
        break;
      case 'web':
        sink.say({ kind: 'chips', chips: [{ label: 'Find one online', patch: {}, webSearch: step.lookingFor }] });
        shown = true;
        break;
      case 'card':
        hold.hold(step.action);
        break;
    }
  }
  const held = hold.count;
  const cards = held ? await hold.release(end, await hooks.cardContext()) : [];
  for (const c of cards) hooks.showCard(c);
  if (cards.length) shown = true;
  /* A card this app could not draw (`cardFor` → null): dropped, and he says nothing changed. */
  if (held > cards.length) {
    /* Live run 11-19: "swap my bench" with no program got "I couldn't set that one up". With nothing running there is no
       workout to swap or start — he says so and offers the build, which is what they need. */
    const todayOnly = plan.steps.some((s) => s.kind === 'card' && (s.action.name === 'swap_exercise_today' || s.action.name === 'start_workout'));
    const nothingRunning = todayOnly && !(await port.programs.active().catch(() => null));
    sink.say({ kind: 'holt', text: nothingRunning ? "You don't have a program running yet, so there's no workout to change. Want me to build you one?" : CARD_DROPPED_LINE });
    shown = true;
  }
  return { shown, flow };
}
