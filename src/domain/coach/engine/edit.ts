/**
 * CHANGING A PROGRAM ALREADY RUNNING — moved out of `CoachChatSheet.tsx` unchanged (Holt Listens HL-10, slice S2).
 *
 *   · Tapped: {@link beginEdit} → {@link stepEdit} (which session, what about it, which movement, what to, how far)
 *     → {@link applyEdit}. Five taps at most.
 *   · Typed: {@link editByWords} resolves "swap bench for dumbbell press on Monday" against the real program and
 *     confirms; {@link finishTypedEdit} answers its questions, applies, cancels and undoes.
 *
 * ⚠ EVERY LIST COMES OUT OF `edit-chat.ts`, WHICH ONLY OFFERS WHAT `edit-ops` WOULD ALLOW. Nothing here filters on
 * its own — duplicating the safety rules is how two copies drift and the app offers something it then refuses.
 *
 * Words, chips and order are exactly the sheet's. What still lives in the sheet comes in through {@link EditHooks}:
 * the Premium AI read, the ranker's context (it reads the build's constraints, which move in S4), and "build the new
 * one" (which runs the build, also S4).
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { SavedProgram } from '@/data/programs-live';
import type { SessionMark } from '../../program/progress-core.ts';
import type { CandidateContext } from '../candidates.ts';
import type { Chip } from '../chat-core.ts';
import {
  changesFor,
  describeTappedEdit,
  editableSessions,
  replacementsFor,
  rowsFor,
  SCOPE_CHOICES,
  slotKeysElsewhere,
  valuesFor,
  type EditChangeId,
} from '../edit-chat.ts';
import { otherProgramNamed, resolveEditIntent, type EditIntent } from '../edit-intent.ts';
import { carriedDoseNote, setCardioTarget, setPrescription, swapExercise, type EditScope } from '../edit-ops.ts';
import { markHoltChange } from '../holt-marks.ts';
import {
  BUILD_THE_NEW_ONE,
  LOOP_LINE,
  ONE_AT_A_TIME,
  ONE_SESSION_FIRST_LINE,
  REPLACE_LINE,
  laterWeekLabel,
  sameAskAgain,
  splitSessionPicker,
  wholeProgramAsk,
  wholeProgramLine,
} from '../listens.ts';
import { pick } from '../rulebook/voice.ts';
import { activeOrNull } from './guards.ts';
import { applyRewrite } from './change.ts';
import { optionsInWords } from './lane.ts';
import type { EnginePort, EngineRefs, EngineSink } from './types.ts';

/** Said when the plan read has not come back yet — never a "no". */
export const PLAN_UNCHECKED = 'I couldn’t check your plan just now. Try again in a moment.';

/** What the edit flow still needs from the sheet (until S4 moves the build). */
export interface EditHooks {
  premiumAi: boolean;
  entitlementStatus: string;
  /** The ranker's context for a swap, judged against the program being edited (QA holt-24, `swapTerms`). */
  ctx(program: SavedProgram): CandidateContext;
  /** A new program in place of the running one, from everything they have said (HL-1d/1c). */
  buildTheNewOne(said: string | undefined, line: string): void;
}

export async function beginEdit(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: EditHooks): Promise<void> {
  /*
   * ⚠ HOLT CHANGING YOUR PROGRAM FOR YOU IS PREMIUM AI (Monetization Amendment 008, MA8 work owed #1; PO 11-08
   * launch QA, H19). Every chat door to it — "Change my program", Home's ADJUST card, "Change the one I have" —
   * lands here. The edit runs on the phone with no AI call, so the server cannot refuse it: the gate has to be
   * here. Changing it yourself stays free on every plan. An unverified read is not a "no".
   */
  if (!hooks.premiumAi) {
    sink.say(
      hooks.entitlementStatus === 'ready'
        ? {
            kind: 'holt',
            text: 'Changing your program for you is part of Premium AI. You can still change it yourself — open a session on your program and swap or edit it.',
          }
        : { kind: 'holt', text: PLAN_UNCHECKED },
      ...(hooks.entitlementStatus === 'ready'
        ? [{ kind: 'chips' as const, chips: [{ label: 'See Premium AI', patch: {}, goTo: '/subscription?from=gate' }] }]
        : []),
    );
    return;
  }
  sink.busy('thinking');
  const active = await activeOrNull(port);
  if (!active) {
    sink.busy(null);
    sink.say(
      { kind: 'holt', text: pick('no_active_program', port.choose) },
      { kind: 'chips', chips: [{ label: 'Build me something', patch: {} }] },
    );
    return;
  }
  const marks = await port.programs.sessions(active.id).catch(() => [] as SessionMark[]);
  sink.busy(null);

  /* QA holt-09: every session still ahead, not the first six — a change in week 5 is a real ask. */
  const sessions = editableSessions(active.structure, marks, Number.POSITIVE_INFINITY);
  if (sessions.length === 0) {
    /* Everything left is already trained. Not a failure — the block is essentially done. */
    sink.say({ kind: 'holt', text: "There's nothing left in that block I'd change — you've trained all of it." });
    return;
  }
  refs.edit = { program: active, marks };
  /* HL-1e (tester 2026-11-18: 22 chips): this week and next as chips, later weeks one more tap (holt-09 still holds). */
  const { now, laterWeeks } = splitSessionPicker(sessions);
  sink.say(
    /* HL-1d: a typed request is waiting - he is honest that this flow goes a session at a time. */
    { kind: 'holt', text: refs.typed.length ? ONE_SESSION_FIRST_LINE : pick('ask_edit_session', port.choose) },
    {
      kind: 'chips',
      chips: [
        ...now.map((sn) => ({ label: sn.label, patch: {}, edit: { step: 'session' as const, ...sn.at } })),
        ...laterWeeks.map((w) => ({ label: laterWeekLabel(w), patch: {}, edit: { step: 'week' as const, weekIndex: w } })),
      ],
    },
  );
}

/** One tap inside the flow. Each step narrows and asks the next question. */
export function stepEdit(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: EditHooks, pickStep: NonNullable<Chip['edit']>): void {
  const edit = refs.edit;
  if (!edit) return;

  /* HL-1e: a later week, opened - its open sessions as chips. */
  if (pickStep.step === 'week') {
    const inWeek = editableSessions(edit.program.structure, edit.marks, Number.POSITIVE_INFINITY).filter(
      (sn) => sn.at.weekIndex === pickStep.weekIndex,
    );
    if (!inWeek.length) return;
    sink.say(
      { kind: 'holt', text: `Which session in week ${pickStep.weekIndex + 1}?` },
      { kind: 'chips', chips: inWeek.map((sn) => ({ label: sn.label, patch: {}, edit: { step: 'session' as const, ...sn.at } })) },
    );
    return;
  }

  if (pickStep.step === 'session') {
    const at = { weekIndex: pickStep.weekIndex, dayIndex: pickStep.dayIndex };
    const found = editableSessions(edit.program.structure, edit.marks, Number.POSITIVE_INFINITY).find(
      (sn) => sn.at.weekIndex === at.weekIndex && sn.at.dayIndex === at.dayIndex,
    );
    if (!found) return;
    refs.edit = { ...edit, at, day: found.day, change: undefined, rowIndex: undefined, value: undefined };
    sink.say(
      { kind: 'holt', text: pick('ask_edit_change', port.choose) },
      { kind: 'chips', chips: changesFor(found.day).map((c) => ({ label: c.label, patch: {}, edit: { step: 'change' as const, change: c.id } })) },
    );
    return;
  }

  if (pickStep.step === 'change') {
    const change = pickStep.change as EditChangeId;
    const day = edit.day;
    if (!day) return;
    if (change === 'rebuild') {
      /* ⚠ REBUILD IS DELIBERATELY NOT WIRED YET. `rebuildDay` exists and is tested, but it needs the
         athlete to name what to work around, and a limitation picker is its own conversation. Saying so
         is better than a chip that quietly does the wrong thing. */
      /* QA holt-04: it was a dead end. Now it points at the program page, where Ask Holt on the session
         does this, and keeps the other changes one tap away here. */
      sink.say(
        {
          kind: 'holt',
          text: 'Reworking a whole session is on the program page — open it, tap the session, then Ask Holt. Or change one thing about it here.',
        },
        {
          kind: 'chips',
          chips: [
            { label: 'Open the program', patch: {}, goTo: `/program/${edit.program.id}` },
            ...changesFor(day)
              .filter((c) => c.id !== 'rebuild')
              .map((c) => ({ label: c.label, patch: {}, edit: { step: 'change' as const, change: c.id } })),
          ],
        },
      );
      return;
    }
    const rows = rowsFor(day, change);
    refs.edit = { ...edit, change, rowIndex: undefined, value: undefined };
    sink.say(
      { kind: 'holt', text: pick('ask_edit_row', port.choose) },
      { kind: 'chips', chips: rows.map((r) => ({ label: r.label, patch: {}, edit: { step: 'row' as const, index: r.index } })) },
    );
    return;
  }

  if (pickStep.step === 'row') {
    const { day, change } = edit;
    if (!day || !change) return;
    const options =
      change === 'swap'
        ? replacementsFor(
            day.main[pickStep.index],
            port.catalog,
            hooks.ctx(edit.program),
            5,
            edit.at ? slotKeysElsewhere(edit.program.structure, { ...edit.at, exerciseIndex: pickStep.index }) : [],
          )
        : valuesFor(day, change, pickStep.index);
    refs.edit = { ...edit, rowIndex: pickStep.index, value: undefined };
    sink.say(
      /* QA holt-07: a swap is a movement, not a number — never "Give me the number." */
      { kind: 'holt', text: pick(change === 'swap' ? 'ask_edit_replacement' : 'ask_edit_value', port.choose) },
      {
        kind: 'chips',
        chips: options.map((v) => ({
          label: v.label,
          patch: {},
          edit: {
            step: 'value' as const,
            sets: v.sets,
            targetMi: v.targetMi,
            targetSec: v.targetSec,
            replacementKey: v.replacement?.key,
            replacementName: v.replacement?.name,
          },
        })),
      },
    );
    return;
  }

  if (pickStep.step === 'value') {
    refs.edit = { ...edit, value: pickStep };
    sink.say(
      { kind: 'holt', text: pick('ask_edit_scope', port.choose) },
      { kind: 'chips', chips: SCOPE_CHOICES.map((c) => ({ label: c.label, patch: {}, edit: { step: 'scope' as const, scope: c.scope } })) },
    );
    return;
  }

  if (pickStep.step === 'scope') void applyEdit(refs, port, sink, pickStep.scope);
}

export async function applyEdit(refs: EngineRefs, port: EnginePort, sink: EngineSink, scope: EditScope): Promise<void> {
  const edit = refs.edit;
  if (!edit?.at || !edit.change || edit.rowIndex == null || !edit.value) return;
  const at = { ...edit.at, exerciseIndex: edit.rowIndex };
  const v = edit.value;

  /* ⚠ THE REPLACEMENT IS LOOKED UP, NOT RECONSTRUCTED. A chip carries only a key and a name, because
     the thread is persisted and must stay JSON. Handing `swapExercise` a two-field object shaped like
     a CatalogExercise would compile today and quietly pass `undefined` for anything it starts reading
     tomorrow — so the real record comes back out of the catalogue. */
  const replacement = edit.change === 'swap' ? port.catalog.find((e) => e.key === v.replacementKey) : null;
  if (edit.change === 'swap' && !replacement) {
    sink.say({ kind: 'holt', text: "I can't find that movement any more. Pick another one." });
    return;
  }

  sink.busy('thinking');
  try {
    const res =
      edit.change === 'swap'
        ? swapExercise(edit.program.structure, edit.marks, at, replacement!, scope)
        : edit.change === 'sets'
          ? setPrescription(edit.program.structure, edit.marks, at, { sets: v.sets }, scope)
          : setCardioTarget(edit.program.structure, edit.marks, at, { targetMi: v.targetMi, targetSec: v.targetSec }, scope);

    if (!res.ok) {
      /* The guard should be unreachable from here — everything offered was checked before it was shown.
         It fires on a race: a session trained on another device since the list was drawn. */
      sink.say({ kind: 'holt', text: res.refusal.message });
      refs.edit = null;
      return;
    }

    /* QA holt-05: the tapped path gets the same Undo the typed path has, and says what it changed. */
    const stamp = port.now();
    const undoId = stamp.getTime();
    const row = edit.day?.main[edit.rowIndex];
    const what = describeTappedEdit(edit.change, row?.name ?? 'That one', v, scope);
    /* "Updated by Holt" (PO 2026-10-01): the changed sessions carry what changed and how they were. */
    const saved = markHoltChange(edit.program.structure, res.structure, { id: String(undoId), at: stamp.toISOString(), what, asked: null });
    await port.programs.update(edit.program.id, saved);
    refs.lastEdit = { programId: edit.program.id, before: edit.program.structure, id: undoId };
    /* QA holtai-09: a bodyweight dose carried onto a loaded lift is said, with where to change it. */
    const dose = replacement && row ? carriedDoseNote(row, replacement) : null;
    const doseLine = dose ? ` It ${dose} — change the reps on the program if that's not what you meant.` : '';
    refs.edit = { ...edit, program: { ...edit.program, structure: saved }, at: undefined, change: undefined, rowIndex: undefined, value: undefined };
    sink.say(
      { kind: 'holt', text: `${what}${doseLine} ${pick('edit_done', port.choose)}` },
      {
        kind: 'chips',
        chips: [
          { label: 'Undo', patch: {}, typedEdit: 'undo', undoOf: undoId },
          { label: 'Change something else', patch: {} },
          /* QA holt-06: to the program itself, not Home. */
          { label: 'Show me the program', patch: {}, goTo: `/program/${edit.program.id}` },
        ],
      },
    );
  } catch (e) {
    sink.say({
      kind: 'error',
      text: 'That did not save.',
      sub: e instanceof Error ? e.message : String(e),
      action: 'Your program is unchanged. Try again in a moment.',
    });
  } finally {
    sink.busy(null);
  }
}

/**
 * Resolve "swap bench for dumbbell press on Monday" against the running program and confirm it.
 *
 * `resolveEditIntent` never guesses between two plausible matches — it asks, with the options as chips —
 * and it applies through `edit-ops`, so every invariant (a trained session is never touched, the session
 * count never moves) holds exactly as it does in the tapped flow. Nothing saves until they say so.
 *
 * `wanted`, not `intent`: the sheet's own `intent` prop was in scope where this came from (C-I7).
 */
export async function editByWords(
  refs: EngineRefs,
  port: EnginePort,
  sink: EngineSink,
  hooks: EditHooks,
  wanted: EditIntent,
  said?: string,
): Promise<void> {
  if (said) refs.editAsked = said;
  sink.busy('thinking');
  const active = await activeOrNull(port);
  if (!active) {
    sink.busy(null);
    sink.say({ kind: 'holt', text: pick('no_active_program', port.choose) }, { kind: 'chips', chips: [{ label: 'Build me something', patch: {} }] });
    return;
  }
  const [marks, mine] = await Promise.all([
    port.programs.sessions(active.id).catch(() => [] as SessionMark[]),
    said ? port.programs.mine().catch(() => [] as SavedProgram[]) : Promise.resolve([] as SavedProgram[]),
  ]);
  sink.busy(null);
  const res = resolveEditIntent(wanted, active.structure, marks, port.catalog, port.now(), { ctx: hooks.ctx(active) });
  /*
   * == HOLT LISTENS (HL-1c, tester 2026-11-18) == "Edit the entire workout", "replace the entire program" reached here
   * and came back as "Which session should change?" - every time. A whole-program ask is not a session ask: "replace"
   * builds the new one from everything they have said, "the whole thing" is told plainly what he can do today.
   */
  if (!res.ok && res.ask === 'which_day') {
    const whole = wholeProgramAsk(said);
    if (whole === 'replace') {
      refs.pendingEditAsk = null;
      refs.lastEditAsk = null;
      return void hooks.buildTheNewOne(said, REPLACE_LINE);
    }
    /* ⚠ NOT for a named row change: "swap bench everywhere" / "4 sets of curls on every day" already work — which
       session, then "the rest of the block" — so they keep that road. Only a change with no single movement in it
       (add core, rebuild, more volume) is the whole-block rewrite this flow cannot do yet. */
    const rowChange = !!wanted.exercise && wanted.op !== 'add' && wanted.op !== 'rebuild' && wanted.op !== 'volume';
    if (whole === 'whole' && !rowChange) {
      refs.pendingEditAsk = null;
      refs.lastEditAsk = null;
      /* AI lane (S7): said, not tapped — and the replace question is now asked, so "build the new one" builds. */
      if (hooks.premiumAi) {
        refs.askedAboutReplacing = true;
        sink.say({ kind: 'holt', text: `${wholeProgramLine(active.name)} Which do you want?` });
        return;
      }
      sink.say(
        { kind: 'holt', text: wholeProgramLine(active.name) },
        { kind: 'chips', chips: [{ label: BUILD_THE_NEW_ONE, patch: {} }, { label: ONE_AT_A_TIME, patch: {} }] },
      );
      return;
    }
  }
  if (!res.ok && res.ask !== 'not_editable' && said && sameAskAgain(refs.lastEditAsk, { ask: res.ask, message: res.message })) {
    /* The loop breaker: they typed instead of tapping, and the resolver would ask the very same thing again. */
    refs.pendingEditAsk = { intent: res.retarget ? { ...wanted, op: res.retarget } : wanted, ask: res.ask };
    if (hooks.premiumAi) return void sink.say({ kind: 'holt', text: optionsInWords(LOOP_LINE.replace(/ — tap one, or name it,/, ' — name it,'), res.options) });
    sink.say(
      { kind: 'holt', text: LOOP_LINE },
      {
        kind: 'chips',
        chips: [
          ...res.options.slice(0, 6).map((o) => ({ label: o, patch: {}, typedEdit: 'answer' as const })),
          { label: BUILD_THE_NEW_ONE, patch: {} },
        ],
      },
    );
    return;
  }
  if (!res.ok) {
    refs.lastEditAsk = res.ask === 'not_editable' ? null : { ask: res.ask, message: res.message };
    /* A `retarget` answer fills a different op — "shorter" on a lifting day becomes taking one out (holtai-06). */
    refs.pendingEditAsk = res.ask === 'not_editable' ? null : { intent: res.retarget ? { ...wanted, op: res.retarget } : wanted, ask: res.ask };
    /* AI lane (S7): the question and its options in words; the athlete answers by typing, and Holt places it. */
    if (hooks.premiumAi) return void sink.say({ kind: 'holt', text: res.ask === 'not_editable' ? res.message : optionsInWords(res.message, res.options) });
    sink.say(
      { kind: 'holt', text: res.message },
      ...(res.ask !== 'not_editable' && res.options.length
        ? [{ kind: 'chips' as const, chips: res.options.map((o) => ({ label: o, patch: {}, typedEdit: 'answer' as const })) }]
        : []),
    );
    return;
  }
  refs.pendingEdit = { programId: active.id, before: active.structure, plan: res.plan };
  refs.pendingEditAsk = null;
  refs.lastEditAsk = null;
  /*
   * ⚠ EVERY CONFIRM NAMES THE PROGRAM IT TOUCHES (holtai-02). A typed change only reaches the one running;
   * "In my QA Holt Plan, swap…" was confirmed as a bare "Week 1, Push — …" and landed in another program.
   */
  const other = otherProgramNamed(said, active.name, mine.map((p) => p.name));
  sink.say(
    {
      kind: 'holt',
      text: other
        ? `I can only change the program you're running, and that's ${active.name}, not ${other}. In ${active.name}: ${res.plan.label}. Want it there?`
        : `In ${active.name}: ${res.plan.label}. Want it?`,
    },
    {
      kind: 'chips',
      chips: res.plan.scope
        ? [
            { label: 'Do it', patch: {}, typedEdit: 'apply' },
            { label: 'Leave it', patch: {}, typedEdit: 'cancel' },
          ]
        : [
            { label: 'Just this week', patch: {}, typedEdit: 'this_week' },
            { label: 'The rest of the block', patch: {}, typedEdit: 'rest_of_block' },
            { label: 'Leave it', patch: {}, typedEdit: 'cancel' },
          ],
    },
  );
}

export async function finishTypedEdit(refs: EngineRefs, port: EnginePort, sink: EngineSink, hooks: EditHooks, chip: Chip): Promise<void> {
  if (chip.typedEdit === 'answer') {
    const p = refs.pendingEditAsk;
    if (!p) return sink.say({ kind: 'holt', text: 'I lost the thread on that one. Tell me the change again.' });
    const n = Number(chip.label.replace(/[^0-9.]/g, ''));
    const next: EditIntent =
      p.ask === 'which_day'
        ? { ...p.intent, day: chip.label }
        : p.ask === 'which_exercise'
          ? { ...p.intent, exercise: chip.label }
          : p.ask === 'which_replacement'
            ? { ...p.intent, to: chip.label }
            : p.intent.op === 'distance'
              ? { ...p.intent, miles: n }
              : p.intent.op === 'duration'
                ? { ...p.intent, minutes: n }
                : p.intent.op === 'reps'
                  ? { ...p.intent, reps: n }
                  : { ...p.intent, sets: n };
    return editByWords(refs, port, sink, hooks, next);
  }
  /* A rewrite waiting for "Do it" (PO D12) answers apply/cancel first. */
  if (refs.pendingRewrite && (chip.typedEdit === 'apply' || chip.typedEdit === 'this_week' || chip.typedEdit === 'rest_of_block')) {
    if (await applyRewrite(refs, port, sink)) return;
  }
  if (chip.typedEdit === 'cancel' && refs.pendingRewrite) {
    refs.pendingRewrite = null;
    return sink.say({ kind: 'holt', text: 'Left it as it was.' });
  }
  if (chip.typedEdit === 'cancel') {
    refs.pendingEdit = null;
    return sink.say({ kind: 'holt', text: 'Left it as it was.' });
  }
  if (chip.typedEdit === 'undo') {
    const le = refs.lastEdit;
    if (!le) return sink.say({ kind: 'holt', text: 'Nothing to undo — that one is already settled.' });
    /* holtai-08: an older Undo stays tappable, but it only ever undoes the change it was offered for. */
    if (chip.undoOf != null && chip.undoOf !== le.id) {
      return sink.say({ kind: 'holt', text: "That's not the last change any more — I can only take back the newest one." });
    }
    refs.lastEdit = null;
    sink.busy('thinking');
    try {
      /* The structure goes back exactly as it was; a skip is un-marked session by session. Both keep
         the session count, so the live-edit guard (0123/0175) has nothing to refuse. */
      if ('before' in le) {
        await port.programs.update(le.programId, le.before);
        /* A rewrite's rest days come back as sessions too. */
        for (const at of le.rested ?? []) await port.programs.unskip(le.programId, at.weekIndex, at.dayIndex);
      } else for (const at of le.skipped) await port.programs.unskip(le.programId, at.weekIndex, at.dayIndex);
      sink.say({ kind: 'holt', text: 'Put it back the way it was.' });
    } catch (e) {
      sink.say({ kind: 'error', text: 'That did not undo.', sub: e instanceof Error ? e.message : String(e), action: 'Open the program to check it.' });
    } finally {
      sink.busy(null);
    }
    return;
  }
  const pe = refs.pendingEdit;
  if (!pe) return sink.say({ kind: 'holt', text: "That change went stale. Tell me again and I'll set it up." });
  const scope: EditScope | undefined =
    chip.typedEdit === 'this_week' ? 'this_week' : chip.typedEdit === 'rest_of_block' ? 'rest_of_block' : undefined;
  const res = pe.plan.apply(scope);
  if (!res.ok) {
    refs.pendingEdit = null;
    return sink.say({ kind: 'holt', text: res.refusal.message });
  }
  sink.busy('thinking');
  const stamp = port.now();
  const undoId = stamp.getTime();
  try {
    /* A skip is a MARK on each session, never a structure change — saving the unchanged structure and
       saying "done" is the defect this branch exists to prevent. The RPC ignores a session already done. */
    if (pe.plan.kind === 'skip') {
      for (const at of pe.plan.sessions) await port.programs.skip(pe.programId, at.weekIndex, at.dayIndex);
      refs.lastEdit = {
        programId: pe.programId,
        skipped: pe.plan.sessions.map((at) => ({ weekIndex: at.weekIndex, dayIndex: at.dayIndex, state: 'skipped' as const })),
        id: undoId,
      };
    } else {
      /* "Updated by Holt" (PO 2026-10-01): the changed sessions carry what changed, what was asked and how they were. */
      const saved = markHoltChange(pe.before, res.structure, { id: String(undoId), at: stamp.toISOString(), what: pe.plan.label, asked: refs.editAsked });
      await port.programs.update(pe.programId, saved);
      refs.lastEdit = { programId: pe.programId, before: pe.before, id: undoId };
    }
    refs.pendingEdit = null;
    refs.editAsked = null;
    sink.say(
      { kind: 'holt', text: pick('edit_done', port.choose) },
      {
        kind: 'chips',
        chips: [
          { label: 'Undo', patch: {}, typedEdit: 'undo', undoOf: undoId },
          { label: 'Change something else', patch: {} },
          /* QA holt-06: to the program itself, not Home. */
          { label: 'Show me the program', patch: {}, goTo: `/program/${pe.programId}` },
        ],
      },
    );
  } catch (e) {
    sink.say({
      kind: 'error',
      text: 'That did not save.',
      sub: e instanceof Error ? e.message : String(e),
      action: 'Your program is unchanged. Try again in a moment.',
    });
  } finally {
    sink.busy(null);
  }
}

/** Forget every half-finished change — a new chat, a rebuild, or "build the new one". */
export function clearEdit(refs: EngineRefs): void {
  refs.edit = null;
  refs.pendingEdit = null;
  refs.pendingEditAsk = null;
  refs.lastEditAsk = null;
}

