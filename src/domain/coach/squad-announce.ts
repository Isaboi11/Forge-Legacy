/**
 * "YOUR SQUAD JUST GOT A NOTIFICATION" — whether Holt may say it, and which way he says it.
 *
 * PO, 2026-09-25: when an athlete starts a workout and the app notifies their squad, Coach Holt tells them,
 * in words that make it obvious what happened — and only when the squad was ACTUALLY notified.
 *
 * ══ THE SERVER DECIDES, NOT THE SCREEN ══
 *
 * A start is an announcement only when `set_training_status` stamps a NEW `training_announced_at` (a
 * resume or a re-assert inside four hours keeps the old one and tells nobody — 0187/0202), the athlete's
 * training visibility clears their squads, and a squad-mate asked for starts. The client can see none of
 * that, so 0217 makes the function answer `{announced, squads, teammates}` and this module believes only
 * that answer:
 *
 *   · `announced: true`              → Holt may say it.
 *   · `announced: false`             → a resume, a private athlete, a squad with alerts off. Silence.
 *   · `null` (void / error / old DB) → a database without 0217 returns nothing. Silence — the line must
 *                                      never appear before the server can vouch for it.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { pickOnce, type Chooser } from './rulebook/voice.ts';
import { SQUAD_ANNOUNCED_LINES, type Register } from './rulebook/in-workout-voice.ts';

export interface TrainingAnnouncement {
  /** True only when this call newly announced a start to at least one squad-mate (0217). */
  announced: boolean;
  /** Distinct squads that carried it. */
  squads: number;
  /** Distinct squad-mates it was filed for. */
  teammates: number;
}

const count = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/**
 * The RPC's `data`, read defensively. Anything that is not the 0217 object — `null` from a void function,
 * a string, an array — is `null`, which the caller treats as "say nothing".
 *
 * ⚠ `announced` MUST BE THE BOOLEAN `true`. A truthy string or a number is not the server vouching for
 * anything, and a line that claims the squad was notified is exactly the wrong thing to guess about.
 */
export function parseTrainingAnnouncement(data: unknown): TrainingAnnouncement | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.announced !== 'boolean') return null;
  const squads = count(d.squads);
  const teammates = count(d.teammates);
  // "Announced to nobody" is not an announcement, whatever the flag says.
  return { announced: d.announced === true && teammates > 0, squads, teammates };
}

export interface AnnouncementLineInput {
  announcement: TrainingAnnouncement | null | undefined;
  /** The session's name ("Upper A"). Blank or missing uses the unnamed wording. */
  session?: string | null;
  /** The intensity dial's volume (HV-D6). */
  register: Register;
  /**
   * What pins the line to this start — the session's `startedAt`. The screen derives the line on every
   * render; without a slot the sentence would change under the athlete each time a set was logged.
   */
  slot: string;
}

/**
 * The line, or null when there is nothing true to say.
 *
 * Non-repeating across sessions (the shared `pickFrom` deck), fixed within one (`pickOnce`).
 */
export function squadAnnouncedLine(input: AnnouncementLineInput, choose?: Chooser): string | null {
  const a = input.announcement;
  if (!a || !a.announced) return null;

  const session = (input.session ?? '').trim();
  const table = SQUAD_ANNOUNCED_LINES[input.register] ?? SQUAD_ANNOUNCED_LINES.plain;
  const variant = session ? 'named' : 'unnamed';
  const lines = table[variant];
  const raw = pickOnce(`announce|${input.slot}|${input.register}|${variant}`, `iw:squad_announced:${input.register}:${variant}`, lines, choose);
  if (!raw) return null;

  const squad = a.squads > 1 ? 'squads' : 'squad';
  return raw.replace(/\{squad\}/g, squad).replace(/\{session\}/g, session);
}
