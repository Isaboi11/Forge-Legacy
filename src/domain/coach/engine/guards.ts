/**
 * THE QUESTIONS BEFORE A BUILD — moved out of `CoachChatSheet.tsx` unchanged (Holt Listens HL-10, slice S1).
 *
 *   · {@link guardActiveProgram} — a program is already running: ask before building another.
 *   · {@link offerProgramSession} — "What should I train today?" with a program running: offer its next session.
 *
 * Behaviour, words and chips are exactly what the sheet had; only the reads go through the port and the drawing
 * through the sink. Step 2's AI lane will change WHAT is said here — that is a later slice, not this one.
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import { dayLabel, nextOpenSlot } from '../../program/progress-core.ts';
import type { SessionMark } from '../../program/progress-core.ts';
import { isOneWeek, JUST_A_WEEK, programSessionOffer, type ChatState } from '../chat-core.ts';
import { BUILD_THE_NEW_ONE, KEEP_AND_CHANGE, typedGuardLine } from '../listens.ts';
import { guardInWords } from './lane.ts';
import type { EnginePort, EngineRefs, EngineSink, Lane } from './types.ts';

/** Long enough for a slow connection, short enough that it never reads as a hang. */
export const ACTIVE_LOOKUP_TIMEOUT_MS = 4000;

/**
 * The running program, or `null` when there is none, the read failed, or it ran past
 * {@link ACTIVE_LOOKUP_TIMEOUT_MS}.
 *
 * ⚠ FAIL-OPEN — only for the conversational nudges, which create and start nothing. The door that ENDS a running
 * program (`startNow`) fails CLOSED through `checkActiveProgram` (launch QA B14 / UX-006). Never use this there.
 */
export function activeOrNull(port: EnginePort) {
  return Promise.race([port.programs.active().catch(() => null), port.wait(ACTIVE_LOOKUP_TIMEOUT_MS).then(() => null)]);
}

/**
 * "Replace it" asks only once per request: the athlete has heard the program exists, and asking again after they
 * chose would be the app being nervous at them. True = carry on building; false = he asked, stop here.
 */
export async function guardActiveProgram(
  refs: EngineRefs,
  port: EnginePort,
  sink: EngineSink,
  request?: ChatState,
  lane: Lane = 'tap',
): Promise<boolean> {
  if (refs.askedAboutReplacing) return true;
  /* QA holt-19: a single week is saved as a week, not started as a program — it ends nothing, so a
     running block is no reason to refuse it. Starting it later asks by name, as any Start does. */
  if (request && isOneWeek(request)) return true;
  /*
   * ⚠ **A SILENT AWAIT IS A STALL, WHICH IS WHAT THIS LOOKED LIKE.** The athlete taps "Build me a
   * program", their own line appears, and then nothing happens at all while this round-trip runs —
   * no bubble, no dimmed composer, no sign anybody heard them. On a phone with one bar that is
   * indistinguishable from a frozen app, so the wait is SHOWN.
   */
  sink.busy('thinking');
  /*
   * And it is BOUNDED (`activeOrNull`). Safe to assume HERE ONLY because nothing is created or started here:
   * this is the conversational nudge before a build.
   */
  const active = await activeOrNull(port);
  sink.busy(null);
  if (!active) return true;
  refs.askedAboutReplacing = true;
  /* AI lane (S7, PO D10): the same three ways forward, said — the answer is typed, and Holt reads it (a new program
     builds, "keep it" goes to the change flow, "just a week" builds a week). Nothing to tap. */
  if (lane === 'ai') {
    sink.say({ kind: 'holt', text: guardInWords(active.name, refs.typed.length > 0), live: true });
    return false;
  }
  /*
   * Holt Listens HL-1d (tester 2026-11-18): when they TYPED what they want, the question carries it - "Build the new
   * one" builds from their words (the same path as "Replace it"), and he says so, instead of a line that ignores
   * everything they just told him. A tapped door keeps its old line and chips.
   */
  if (refs.typed.length) {
    sink.say(
      { kind: 'holt', text: typedGuardLine(active.name), live: true },
      {
        kind: 'chips',
        chips: [
          { label: BUILD_THE_NEW_ONE, patch: {} },
          { label: JUST_A_WEEK, patch: { weeks: 1 } },
          { label: KEEP_AND_CHANGE, patch: {} },
        ],
      },
    );
    return false;
  }
  sink.say(
    { kind: 'holt', text: `You've already got ${active.name} running. I'm not going to start a second one behind your back.`, live: true },
    {
      kind: 'chips',
      chips: [
        { label: 'Replace it', patch: {} },
        /* QA holt-19: "A program or a week" — the week needs no replacing; it carries this request on. */
        { label: JUST_A_WEEK, patch: { weeks: 1 } },
        /* Where "Change the one I have" leads — the running program's own page, not the Workouts tab (holtai-06). */
        { label: 'Change the one I have', patch: {}, goTo: `/program/${active.id}` },
      ],
    },
  );
  return false;
}

/**
 * QA holt-19 — "What should I train today?" with a program running names the program's next session
 * and offers it, before building anything. True when he asked; false (build the day as before) when
 * there is no program, it is finished, or the lookup failed or ran long — never a reason to refuse.
 */
export async function offerProgramSession(port: EnginePort, sink: EngineSink): Promise<boolean> {
  sink.busy('thinking');
  const found = await Promise.race([
    (async () => {
      const active = await port.programs.active().catch(() => null);
      if (!active) return null;
      const marks = await port.programs.sessions(active.id).catch(() => [] as SessionMark[]);
      const next = nextOpenSlot(active.structure, marks);
      return next?.day ? { active, name: dayLabel(next.day, next.dayIndex) } : null;
    })(),
    port.wait(ACTIVE_LOOKUP_TIMEOUT_MS).then(() => null),
  ]);
  sink.busy(null);
  if (!found) return false;
  sink.say(...programSessionOffer(found.active.id, found.active.name, found.name));
  return true;
}
