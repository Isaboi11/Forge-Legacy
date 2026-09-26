/**
 * ══ "SWITCH PROGRAMS?" — THE CONFLICT RESOLUTION SHEET'S WORDS (W-3 §13) ══
 *
 * One Active program at a time (Program-Architecture-Amendment-001 §2), enforced inside `start_program`,
 * which ends whatever else is active — permanently, as Ended Early — without a word. So every screen that
 * can start a program must ask first, by name, whenever there is something to lose (QA 2026-09-26 F1).
 *
 * Pure so the copy is testable and every start path says the same thing. The caller decides WHETHER to
 * ask (only when a DIFFERENT program is active); this only says what the question is.
 */

import type { ProgramProgress } from './progress-core.ts';

export interface SwitchProgramCopy {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
}

/**
 * `current` is the program that would be ended; `progress` is its own count (from `progressFromMarks`),
 * so the athlete sees exactly how far into it they are before choosing. `nextName` is null when the
 * program being started has no name yet.
 */
export function switchProgramCopy(
  currentName: string,
  progress: Pick<ProgramProgress, 'completed' | 'total'>,
  nextName: string | null,
): SwitchProgramCopy {
  const unit = progress.total === 1 ? 'session' : 'sessions';
  const next = nextName?.trim() ? `“${nextName.trim()}”` : 'this program';
  return {
    title: 'Switch programs?',
    body:
      `You’re in “${currentName}” · ${progress.completed} of ${progress.total} ${unit}. ` +
      `Starting ${next} ends it — it moves to your legacy as ended early, and that can’t be undone. ` +
      'Everything you logged stays.',
    confirm: 'End Current Program & Start New',
    cancel: 'Cancel',
  };
}
