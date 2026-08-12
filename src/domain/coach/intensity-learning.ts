/**
 * HOW HOLT LEARNS HOW HARD TO PUSH YOU.
 *
 * ══ THE ASK ══
 *
 * PO: *"Coach Holt would need to learn from how the person is working out. If they're jumping up in
 * weight. If they're staying put. If they're going down in weight. He can ask if they like the feedback
 * every once in a while."*
 *
 * ══ THE SIGNAL WAS ALREADY THERE ══
 *
 * `progressionFor()` classifies every lift every session as `add_weight | add_reps | hold | back_off |
 * no_history` — literally the three states the PO named, plus the two honest edges. Nothing needed
 * inventing; it needed KEEPING (migration 0142), because the classification depends on the prescription
 * in force and a saved workout does not store that.
 *
 * ══ ⚠ THE ASYMMETRY, WHICH IS THE WHOLE DESIGN ══
 *
 * **Moving UP must be accepted. Moving DOWN applies itself and says so.**
 *
 * A coach that quietly gets louder is exactly the failure `Coach-Adaptive-Learning-Amendment-001` CL-D3
 * exists to prevent — the athlete would experience the app becoming pushier and have no idea why, no
 * name for it, and nothing to point at. Easing off has the opposite risk profile: it is the direction
 * `progression.ts` already prefers ("advancing someone too fast costs them a rep, and it is the cheaper
 * mistake to make in the other direction"), and asking permission to be gentler is its own small
 * unkindness. So down auto-applies WITH the sentence shown and one tap to undo.
 *
 * ⚠ AND NOTHING MOVES ON ONE SESSION. CL-D3: two occurrences before anything moves. A single hard week
 * is a hard week.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { INTENSITY_LEVELS, type IntensityLevel } from './rulebook/intensity.ts';

/** One stored decision, as 0142 keeps it. */
export interface IntensitySignal {
  action: 'add_weight' | 'add_reps' | 'hold' | 'back_off' | 'no_history';
  observedAt: string;
  /** Which session it belongs to — the "two occurrences" rule counts SESSIONS, not lifts. */
  workoutId: string;
}

/** How many recent decisions the reading looks at. */
export const WINDOW = 12;
/** Sessions that must be represented before any proposal is made (CL-D3's "two occurrences"). */
export const MIN_SESSIONS = 2;
/** Share of decisions that must be `add_weight` before Holt offers to push harder. */
export const UP_SHARE = 0.7;
/** Share that must be `back_off` or a short `hold` before he eases off. */
export const DOWN_SHARE = 0.4;

export type ProposalDirection = 'up' | 'down';

export interface IntensityProposal {
  direction: ProposalDirection;
  from: IntensityLevel;
  to: IntensityLevel;
  /**
   * ⚠ SHOWN, NEVER IMPLIED (CL-D2). "Every adaptation must be explicable in one sentence, and the
   * sentence must be shown." A level that changed with no visible reason is indistinguishable from a bug.
   */
  sentence: string;
  /**
   * ⚠ `false` for UP — the athlete must accept it. `true` for DOWN — applied, with an undo. See the
   * header for why the two directions are not symmetric.
   */
  autoApply: boolean;
}

const step = (level: IntensityLevel, by: 1 | -1): IntensityLevel | null => {
  const i = INTENSITY_LEVELS.indexOf(level);
  const next = INTENSITY_LEVELS[i + by];
  return next ?? null;
};

/**
 * What the recent record says, or null when it says nothing.
 *
 * ⚠ NULL IS THE OVERWHELMINGLY COMMON ANSWER and must stay that way. This runs whenever the coach sheet
 * opens; a proposal on every visit would be the nag the intensity feature exists to avoid. Everything
 * below is a reason to say nothing.
 */
export function proposeIntensity(signals: readonly IntensitySignal[], current: IntensityLevel): IntensityProposal | null {
  const recent = [...signals]
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))
    .slice(0, WINDOW);

  // `no_history` is a first-ever lift. It says nothing about how hard somebody wants to be pushed, so
  // it is excluded rather than counted as a "hold" — which would make a week of new exercises read as
  // stagnation.
  const scored = recent.filter((s) => s.action !== 'no_history');
  if (scored.length === 0) return null;

  const sessions = new Set(scored.map((s) => s.workoutId));
  if (sessions.size < MIN_SESSIONS) return null;

  const ups = scored.filter((s) => s.action === 'add_weight').length;
  const downs = scored.filter((s) => s.action === 'back_off' || s.action === 'hold').length;

  if (ups / scored.length >= UP_SHARE) {
    const to = step(current, 1);
    if (!to) return null; // ⚠ already at `drive` — CI-D7: there is no level above it.
    return {
      direction: 'up',
      from: current,
      to,
      sentence: `You've gone up in weight on ${ups} of your last ${scored.length} lifts. Want me pushing harder?`,
      autoApply: false,
    };
  }

  if (downs / scored.length >= DOWN_SHARE) {
    const to = step(current, -1);
    if (!to) return null; // already as quiet as he gets
    return {
      direction: 'down',
      from: current,
      to,
      sentence: `You've held or come down on ${downs} of your last ${scored.length}. I'll ease off — say the word and I won't.`,
      autoApply: true,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE CHECK-IN — "he can ask if they like the feedback every once in a while"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** How long between check-ins. Long, because the question is only interesting occasionally. */
export const CHECK_IN_DAYS = 30;
/** Decisions on record before asking is worth anything. */
export const CHECK_IN_MIN_SIGNALS = 8;

/**
 * Should Holt ask how the pushing is landing?
 *
 * ⚠ THE CALLER MUST ONLY ASK THIS WHEN THE SHEET IS OPEN. The check-in belongs in `SessionCoachSheet`,
 * which the athlete TAPPED — `SessionCoachSheet.tsx`'s own rule is that it never speaks unprompted, and
 * a question about coaching style arriving unbidden between sets would be the exact interruption the
 * intensity work is meant to give people control over.
 */
export function dueForCheckIn(input: { signalCount: number; lastAskedAt: string | null; nowMs: number }): boolean {
  if (input.signalCount < CHECK_IN_MIN_SIGNALS) return false;
  if (!input.lastAskedAt) return true;
  const last = Date.parse(input.lastAskedAt);
  if (!Number.isFinite(last)) return true;
  return input.nowMs - last >= CHECK_IN_DAYS * 24 * 60 * 60 * 1000;
}
