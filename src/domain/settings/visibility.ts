/**
 * Profile Visibility (P-6) — per-section audience control, ported from the design's `forge-visibility.js`.
 *
 * The athlete chooses who sees each part of their Legacy. Rank, Standard and Honors are core identity and
 * are ALWAYS visible — they are not listed here, by design.
 *
 * The audience ladder, least→most private:
 *   everyone — anyone who opens the profile
 *   squads   — squad-mates (and anyone closer)
 *   friends  — accepted friends only
 *   private  — nobody but the owner
 *
 * A viewer's clearance resolves the ladder: a friend clears friends+squads+everyone; a squad-mate clears
 * squads+everyone; a stranger clears everyone only. `private` clears for no one but the owner.
 */

import type { SymbolName } from '@/components/forge/ForgeSymbol';

export type AudienceId = 'everyone' | 'squads' | 'friends' | 'private';

export interface Audience {
  id: AudienceId;
  label: string;
  short: string;
}

/** The four choices, in ladder order. `private` reads "Only me" — it is owner-only, not a clearance. */
export const AUDIENCES: Audience[] = [
  { id: 'everyone', label: 'Everyone', short: 'Everyone' },
  { id: 'squads', label: 'Squads', short: 'Squads' },
  { id: 'friends', label: 'Friends', short: 'Friends' },
  { id: 'private', label: 'Only me', short: 'Only me' },
];

export type VisibilityKey =
  | 'chapter'
  | 'history'
  | 'timeline'
  | 'transformation'
  | 'photos'
  | 'accomplishments'
  | 'stats'
  | 'training'
  | 'live_session';

export interface VisibilitySection {
  key: VisibilityKey;
  label: string;
  desc: string;
  def: AudienceId;
  icon: SymbolName;
}

/**
 * The controllable sections, with the design's defaults, copy and per-row symbol (verbatim).
 *
 * `training` is the one addition (0086). Live presence needed an off switch, and it did not need a new
 * privacy concept to get one — it is a section like any other, on the same audience ladder, and setting
 * it to "Only me" is how an athlete stops broadcasting that they are mid-workout. Default `squads`: the
 * people you train alongside see it, strangers never do.
 */
export const VISIBILITY_SECTIONS: VisibilitySection[] = [
  { key: 'chapter', label: 'Current Chapter & Goal', desc: 'The chapter you’re training through now, and its goal.', def: 'everyone', icon: 'book' },
  { key: 'history', label: 'Chapter History', desc: 'Sealed chapters from your past.', def: 'everyone', icon: 'seal' },
  { key: 'timeline', label: 'Timeline', desc: 'The running log of milestones and events.', def: 'squads', icon: 'banner' },
  { key: 'transformation', label: 'Transformation', desc: 'Physique and progress footage.', def: 'friends', icon: 'spark' },
  { key: 'photos', label: 'Photos', desc: 'Your full photo archive.', def: 'friends', icon: 'medal' },
  { key: 'accomplishments', label: 'Accomplishments', desc: 'Records and milestones you’ve preserved.', def: 'everyone', icon: 'trophy' },
  { key: 'stats', label: 'Training Stats', desc: 'Volume, streaks and totals.', def: 'squads', icon: 'dumbbell' },
  { key: 'training', label: 'Live Workout Status', desc: 'That you’re training right now, while you are.', def: 'squads', icon: 'spark' },
  /*
   * ⚠ DEFAULT PRIVATE — AN OPT-IN, NOT AN INHERITANCE (0181). `training` promises only the fact; this
   * is the plan and the log, with numbers, and CC-D2 / WSR-D6 forbid those on any surface the athlete
   * did not choose. `private` is the off switch, exactly as it is for `training`.
   */
  { key: 'live_session', label: 'Live Workout Detail', desc: 'What you’ve logged and what’s planned, while you train. Off until you turn it on.', def: 'private', icon: 'dumbbell' },
];

export type VisibilityMap = Record<VisibilityKey, AudienceId>;

export const VISIBILITY_DEFAULTS: VisibilityMap = VISIBILITY_SECTIONS.reduce(
  (m, s) => ((m[s.key] = s.def), m),
  {} as VisibilityMap,
);

const KEYS = new Set(VISIBILITY_SECTIONS.map((s) => s.key));
const IDS = new Set(AUDIENCES.map((a) => a.id));

/** Merge a stored (possibly partial or stale) map over the defaults, dropping anything unrecognised. */
export function sanitizeVisibility(raw: unknown): VisibilityMap {
  const out: VisibilityMap = { ...VISIBILITY_DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (KEYS.has(k as VisibilityKey) && typeof v === 'string' && IDS.has(v as AudienceId)) {
        out[k as VisibilityKey] = v as AudienceId;
      }
    }
  }
  return out;
}

export type Clearance = 'stranger' | 'squad' | 'friend' | 'owner';

const RANK: Record<AudienceId, number> = { everyone: 1, squads: 2, friends: 3, private: 99 };
const CLEARANCE: Record<Clearance, number> = { stranger: 1, squad: 2, friend: 3, owner: 100 };

/** Would a viewer with the given clearance see a section set to this audience? `private` = owner only. */
export function canSee(audience: AudienceId, viewer: Clearance): boolean {
  if (audience === 'private') return viewer === 'owner';
  return CLEARANCE[viewer] >= RANK[audience];
}

export const audienceLabel = (id: AudienceId): string => AUDIENCES.find((a) => a.id === id)?.label ?? id;
