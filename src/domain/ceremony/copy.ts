/**
 * Ceremony copy resolver — eyebrow / title / body line / footer labels per event.
 *
 * ⚠ The copy below is REPRESENTATIVE placeholder text so the ① machinery reads
 * correctly in the dev harness. Unit ② replaces each line with the EXACT LOCKED copy
 * from the M-x spec (Rank-Up-Modal-Spec-M1, Honor-Earned-Modal-Spec-M2, M-3, M-4,
 * M-7). Do not treat these strings as the final ceremony language.
 */

import type { CeremonyEvent } from './types';
import type { RankTier } from '../rank-artwork/resolver';

export interface CeremonyCopy {
  eyebrow: string;
  title: string;
  body: string;
  primary: string;
  /** Secondary action (usually Share → SH-1); omitted where a ceremony has one action. */
  secondary?: string;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

export function rankTierLabel(rank: RankTier): string {
  const family = rank.family.charAt(0).toUpperCase() + rank.family.slice(1);
  return `${family} ${ROMAN[rank.level] ?? rank.level}`;
}

export function ceremonyCopy(event: CeremonyEvent): CeremonyCopy {
  switch (event.kind) {
    case 'rankUp':
      return {
        eyebrow: 'Rank Ascended',
        title: rankTierLabel(event.rank),
        body: 'You have forged a new standing.',
        primary: 'Continue',
        secondary: 'Share',
      };
    case 'goalAchieved':
      return {
        eyebrow: 'Goal Achieved',
        title: event.goalName,
        body: 'A goal you set, now behind you.',
        primary: 'Continue',
        secondary: 'Share',
      };
    case 'programGraduated':
      return {
        eyebrow: 'Program Graduated',
        title: event.programName,
        body: 'You saw the work through to the end.',
        primary: 'Continue',
        secondary: 'Share',
      };
    case 'honorEarned':
      return {
        eyebrow: 'Honor Earned',
        title: event.honorName,
        body: event.citation ?? 'A permanent part of your legacy.',
        primary: 'View Honor',
        secondary: 'Share',
      };
    case 'premiumUpsell':
      return {
        eyebrow: 'Forge Premium',
        title: 'Go further',
        body: event.reason ?? 'Unlock unlimited programs, photos, and squads.',
        primary: 'See Premium',
        secondary: 'Not now',
      };
  }
}
