import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * WHETHER COACH HOLT IS OPEN — held here rather than inside the bubble, so a screen can open him.
 *
 * ══ WHY THIS EXISTS ══
 *
 * The sheet is owned by `CoachBubble`, which is mounted in `_layout.tsx` OUTSIDE the navigator so it can
 * float over every route. That is the right place for it and it is why the bubble survives navigation —
 * but it also meant the open/closed flag was a `useState` nothing else could reach. Holt could only ever
 * be opened by tapping the bubble itself.
 *
 * A new athlete has no reason to tap a circle in the corner and no idea what it is, so the one surface
 * that could ask them what they want to train was the one surface they never found. Home needs to be able
 * to open him; so does anything else that should hand over rather than dead-end.
 *
 * ══ THE STATE MOVES, THE SHEET DOES NOT ══
 *
 * Deliberately NOT the `ShareProvider` shape, which owns and renders its own sheet. `CoachBubble` carries
 * the teaser rules, the surface allow-list and the suppression logic for workouts, ceremonies and tours —
 * duplicating a second mounting of `CoachChatSheet` here would give the app two coaches that could both
 * be open at once. Only the boolean lives here. The bubble still renders him.
 *
 * ⚠ AND IT IS PLAIN STATE, NOT A REQUEST COUNTER. A "someone asked you to open" signal would have to be
 * consumed in an effect, and this project's react-compiler lint rejects `setState` inside one outright.
 * Holding the flag itself means the caller sets it and the bubble reads it, with nothing to synchronise.
 */
/**
 * What the athlete already told us on the way in.
 *
 * ⚠ WITHOUT THIS, A DOOR IS ONLY A SHORTCUT TO A MENU. Home's "Build it with me" opened the sheet and
 * left Holt sitting on his own opener list — so somebody who had just said, in as many words, that they
 * wanted a program built was asked to say it a second time. That is the exact defect already recorded
 * against the old "Build me a program" chip, where the athlete's line and Holt's next question
 * contradicted each other.
 */
export type CoachIntent = 'build' | 'import';

export interface CoachDoorValue {
  /** True while the chat sheet is on screen. Read by `CoachBubble`, which does the rendering. */
  open: boolean;
  /** What they asked for on the way in, or null when they simply opened him. */
  intent: CoachIntent | null;
  /** Open Holt from anywhere — a Home door, a dead end, anything that should hand over to him. */
  openCoach: (intent?: CoachIntent) => void;
  closeCoach: () => void;
}

const CoachDoorContext = createContext<CoachDoorValue | null>(null);

export function CoachDoorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<CoachIntent | null>(null);
  const openCoach = useCallback((next?: CoachIntent) => {
    setIntent(next ?? null);
    setOpen(true);
  }, []);
  /* Cleared on close, so the next tap on the bubble opens him plainly rather than re-running whatever
     the last door asked for. */
  const closeCoach = useCallback(() => {
    setOpen(false);
    setIntent(null);
  }, []);
  const value = useMemo<CoachDoorValue>(
    () => ({ open, intent, openCoach, closeCoach }),
    [open, intent, openCoach, closeCoach],
  );
  return <CoachDoorContext.Provider value={value}>{children}</CoachDoorContext.Provider>;
}

/**
 * ⚠ DEGRADES, NEVER THROWS. A surface rendered outside the provider loses the ability to open the coach
 * and keeps working — the same rule the entitlement and keyboard-primer contexts follow, and the lesson
 * from the launch crash a context that threw once caused. A door that quietly does nothing is a bug worth
 * fixing; a blank app is an outage.
 */
export function useCoachDoor(): CoachDoorValue {
  return useContext(CoachDoorContext) ?? FALLBACK;
}

const FALLBACK: CoachDoorValue = { open: false, intent: null, openCoach: () => {}, closeCoach: () => {} };
