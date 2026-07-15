/**
 * Ceremony copy resolver — eyebrow / title / subtitle / body line / footer labels per
 * event. The title/subtitle/body/button strings are the EXACT LOCKED copy from the
 * M-series specs (verbatim); each is cited inline so it can be confirmed against Docs.
 *
 * Sources: Rank-Up-Modal-Spec-M1 (§6.2, §6.5), Honor-Earned-Modal-Spec-M2 (§4.1),
 * M-3-Goal-Achieved-Spec (M3-D13), M-4-Program-Graduated-Spec (§5.1), M-7-Premium-Upsell-Spec (§5.1).
 *
 * The `eyebrow` is the ceremony CATEGORY (the dc Modal Library convention — the reconciled
 * overlay Modal carries an eyebrow label); the specs don't lock an eyebrow string, so those
 * are labels, not spec-verbatim. "Share this …" secondary actions open SH-1 (unit ③).
 */

import type { CeremonyEvent } from './types';
import type { RankTier } from '../rank-artwork/resolver';

export interface CeremonyCopy {
  eyebrow?: string;
  title: string;
  /** Secondary line under the title (M-3 chapter name). */
  subtitle?: string;
  body: string;
  primary: string;
  /** Secondary action (Share → SH-1, or M-7 "Not Now"); omitted where a ceremony has one action. */
  secondary?: string;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

export function rankTierLabel(rank: RankTier): string {
  const family = rank.family.charAt(0).toUpperCase() + rank.family.slice(1);
  return `${family} ${ROMAN[rank.level] ?? rank.level}`;
}

/** The single terminal rank of the whole system (Rank-Up §6.5 "final rank"). */
function isFinalRank(rank: RankTier): boolean {
  return rank.family === 'legacy' && rank.level === 4;
}

export function ceremonyCopy(event: CeremonyEvent): CeremonyCopy {
  switch (event.kind) {
    case 'rankUp':
      // M-1 §6.2 (standard) / §6.5 (final rank) — locked ceremony copy.
      return {
        eyebrow: 'Rank Ascended',
        title: rankTierLabel(event.rank),
        body: isFinalRank(event.rank)
          ? 'Your legacy has been forged.'
          : 'Earned through every session. Welcome to what you’ve become.',
        primary: 'Continue',
        secondary: 'Share this advancement',
      };
    case 'honorEarned':
      // M-2 §4.1 — locked.
      return {
        eyebrow: 'Honor Earned',
        title: event.honorName,
        body: 'A permanent part of your legacy.',
        primary: 'Continue',
        secondary: 'Share this honor',
      };
    case 'goalAchieved':
      // M-3 (M3-D13) — locked, goal-agnostic.
      return {
        eyebrow: 'Goal Achieved',
        title: event.goalName,
        subtitle: event.chapterName,
        body: 'Set, chased, earned. A permanent mark in your legacy.',
        primary: 'Continue',
        secondary: 'Share this achievement',
      };
    case 'programGraduated':
      // M-4 §5.1 — locked, program-agnostic.
      return {
        eyebrow: 'Program Graduated',
        title: event.programName,
        body: 'Finished what you started. A permanent mark in your legacy.',
        primary: 'Continue',
        secondary: 'Share this graduation',
      };
    case 'premiumUpsell':
      // M-7 §5.1 — fixed heading + reassurance; trigger_reason injected per trigger.
      return {
        title: 'Build more. Keep everything.',
        body: `${event.reason ?? 'You’ve reached your 3-program limit.'}\n\nEverything you’ve already built is yours — forever.`,
        primary: 'Upgrade',
        secondary: 'Not Now',
      };
  }
}
