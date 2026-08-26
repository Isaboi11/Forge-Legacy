/**
 * When Coach Holt's stored conversation survives, and when it must not be written at all.
 *
 * PO, 2026-08-26: *"with coach holt if I close him then the conversation should delete and restart."*
 *
 * ══ WHY THIS IS A MODULE AND NOT TWO `if`s IN THE SHEET ══
 *
 * It already WAS two `if`s in the sheet, and it had been wrong since 2026-08-11 without anyone noticing,
 * because there was nothing to run against it. `CoachChatSheet` is 2,000 lines of React that `node --test`
 * cannot mount, so the one rule in it that the athlete actually feels was the one rule with no test. The
 * sheet imports these; a test that re-stated them instead would pass just as happily with the guard
 * deleted, which is the hollow test this project has been bitten by before.
 *
 * ══ THE TWO RULES ══
 *
 * 1. **A hand-off keeps the thread; everything else ends it.** §15.3 is why the thread persists at all —
 *    leaving FOR the Program Builder is one errand inside a single conversation, so Holt can write the
 *    outcome back into the conversation that produced it. Every other way the sheet can vanish is the
 *    athlete walking away, and §15.2's rolling thread meant he picked up mid-sentence days later.
 *
 *    ⚠ THE DEFAULT USED TO BE THE OTHER WAY ROUND and that is what left the report open. Only three
 *    paths cleared — the X, the scrim, the drag — while a session, a ceremony, the tour or the route
 *    leaving the four home surfaces all unmounted the sheet silently, kept the thread, AND left the door
 *    flag open, so he reopened later still holding it.
 *
 * 2. **Nothing may be written once the end is declared.** Clearing storage does not stop the writer.
 *    Half a dozen paths in the sheet `say()` after an `await pause(…)` and the intro beats land on a
 *    timeout of up to 1400 ms, against a 200 ms exit animation — so a turn can land while the sheet is
 *    still mounted and save the conversation straight back over the `removeItem` that just deleted it.
 *    Deleting is not enough on its own; the flag is the authority.
 *
 * ⚠ PURE, AND RELATIVE `.ts` IMPORTS ONLY — `node --test` cannot resolve `@/`.
 */

/**
 * How the sheet went away.
 *
 * `hand-off` is the deliberate errand — the Program Builder, a chip's `goTo`, "Change the one I have".
 * `close` is the X, the scrim and the drag. `interrupted` is every unmount nobody asked for: a workout
 * session starting, a ceremony taking the screen, the tour running, or the route leaving Home.
 */
export type Exit = 'close' | 'hand-off' | 'interrupted';

/*
 * ⚠ THE EXIT IS STORED AS THE BARE STRING, NOT WRAPPED IN AN OBJECT. It lives in a `useRef` that
 * `collapse` and `handOff` both write from inside a `useCallback`, and allocating a fresh object in
 * there trips this project's react-compiler lint ("This value cannot be modified"). A string literal
 * is assigned, not constructed, so there is nothing for the compiler to take exception to.
 */

/**
 * Does the stored conversation survive this exit?
 *
 * ⚠ `interrupted` ENDS IT, and that is the deliberate half of this change. A ceremony is not the athlete
 * closing him — but the alternative is that he reopens after it holding a question about a set they
 * finished twenty minutes ago, which is the exact complaint. A fresh greeting costs nothing; the
 * remembered skill level and having met him are stored under different keys and are untouched either way.
 */
export function threadSurvives(exit: Exit): boolean {
  return exit === 'hand-off';
}

/* ── the write gate ──────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠ MODULE STATE, AND IT BELONGS HERE RATHER THAN IN THE SHEET.
 *
 * It was a `useRef` in `CoachChatSheet` first, and react-compiler rejected it: `collapse` is handed to
 * `PanResponder.create`, which runs DURING RENDER, so a `collapse` that writes a ref is "passing a ref
 * to a function [that] may read its value during render". Routing the drag through a second ref moved
 * the error rather than fixing it, because the objection is to the ref reaching render at all.
 *
 * Putting the gate in the storage layer is also simply where it belongs. "This conversation is over, do
 * not write it again" is a fact about the stored thread, not about a React tree, and `clearThread` is
 * the one function that already knows it.
 *
 * ⚠ ONE COACH AT A TIME, which is what makes a module-level flag safe — `useCoachDoor`'s header is
 * explicit that a second mounting of the sheet would give the app two coaches that could both be open,
 * and it exists to prevent exactly that.
 */
let writesAllowed = true;

/** A sheet is opening: whatever ended the last conversation no longer applies. */
export function allowWrites(): void {
  writesAllowed = true;
}

/** The conversation is over. Called by `clearThread`, so deleting and silencing cannot drift apart. */
export function stopWrites(): void {
  writesAllowed = false;
}

/**
 * May a turn that is still in flight be persisted?
 *
 * Half a dozen paths in the sheet `say()` after an `await pause(…)` and the intro beats land on a
 * timeout of up to 1400 ms, against a 200 ms exit animation — so a turn can land while the sheet is
 * still mounted and write the conversation straight back over the `removeItem` that just deleted it.
 */
export function mayPersist(): boolean {
  return writesAllowed;
}

/**
 * Should the thread be cleared as the sheet unmounts?
 *
 * ⚠ AN UNMOUNT WITH NO DECLARED ENDING IS `interrupted`, not a hand-off. Defaulting the other way is
 * precisely the bug: every path that forgot to say what it was would quietly keep the conversation.
 */
export function clearsOnUnmount(exit: Exit | null): boolean {
  return !threadSurvives(exit ?? 'interrupted');
}
