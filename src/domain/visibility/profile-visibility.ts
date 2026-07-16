/**
 * Profile section visibility — the audience model for the Public Profile, PORTED from the design
 * source of truth (`design_reference/.../forge-visibility.js`): which Legacy sections an athlete
 * exposes, and to whom. This is the app-side home for that model (it existed only in the design JS).
 *
 * TWO-GATE rule (see `sectionVisible`): a section renders only if BOTH
 *   (a) the owner's per-section audience × the viewer's relationship clears it, AND
 *   (b) real data for it exists (`hasData`).
 * Self bypasses gate (a) for its OWNED sections but still needs data (gate b). Gate (b) is the
 * launch-correct shape — new / data-less athletes render sparse, truthfully.
 *
 * Rank, My Standard and Honors are CORE IDENTITY — always visible, never gated (not listed here).
 */

export type VisibilitySection =
  | 'chapter'
  | 'history'
  | 'timeline'
  | 'transformation'
  | 'photos'
  | 'accomplishments'
  | 'stats';

export type Audience = 'everyone' | 'squads' | 'friends' | 'private';

/** The viewer's relationship to the profile subject. `following` clears as a stranger. */
export type ViewerRelationship = 'self' | 'friend' | 'squadmate' | 'stranger' | 'following';

export interface SectionMeta {
  key: VisibilitySection;
  label: string;
  desc: string;
  defaultAudience: Audience;
}

/** The 7 gated sections + their default audiences — verbatim from forge-visibility.js. */
export const VISIBILITY_SECTIONS: readonly SectionMeta[] = [
  { key: 'chapter', label: 'Current Chapter & Goal', desc: 'The chapter you’re training through now, and its goal.', defaultAudience: 'everyone' },
  { key: 'history', label: 'Chapter History', desc: 'Sealed chapters from your past.', defaultAudience: 'everyone' },
  { key: 'timeline', label: 'Timeline', desc: 'The running log of milestones and events.', defaultAudience: 'squads' },
  { key: 'transformation', label: 'Transformation', desc: 'Physique and progress footage.', defaultAudience: 'friends' },
  { key: 'photos', label: 'Photos', desc: 'Your full photo archive.', defaultAudience: 'friends' },
  { key: 'accomplishments', label: 'Accomplishments', desc: 'Records and milestones you’ve preserved.', defaultAudience: 'everyone' },
  { key: 'stats', label: 'Training Stats', desc: 'Volume, streaks and totals.', defaultAudience: 'squads' },
];

/** Default audience per section (no settings backend yet — these are the launch defaults). */
export const VISIBILITY_DEFAULTS: Readonly<Record<VisibilitySection, Audience>> = Object.freeze(
  Object.fromEntries(VISIBILITY_SECTIONS.map((s) => [s.key, s.defaultAudience])) as Record<VisibilitySection, Audience>,
);

const AUD_RANK: Record<Audience, number> = { everyone: 1, squads: 2, friends: 3, private: 99 };

/** Viewer clearance level (higher sees more), matching forge-visibility.js. */
export function clearanceOf(viewer: ViewerRelationship): number {
  switch (viewer) {
    case 'self':
      return 99;
    case 'friend':
      return 3;
    case 'squadmate':
      return 2;
    default:
      return 1; // stranger, following
  }
}

/** Gate (a): can a viewer with this relationship see a section whose audience is `audience`? */
export function canSee(audience: Audience, viewer: ViewerRelationship): boolean {
  const need = AUD_RANK[audience] ?? 1;
  if (need >= 99) return false; // private — owner only (self is handled by the isSelf bypass below)
  return clearanceOf(viewer) >= need;
}

/**
 * The two-gate section-visibility rule. A section renders iff it is (a) cleared by
 * (owner audience × viewer relationship) — self bypasses this for owned sections — AND (b) backed by
 * real data. NOTE: self bypasses gate (a) for ALL owned sections (the design `.dc` only bypassed
 * Accomplishments — an incomplete prototype behavior; "self sees all owned sections" is the intent).
 */
export function sectionVisible(args: {
  audience: Audience;
  viewer: ViewerRelationship;
  hasData: boolean;
  isSelf: boolean;
}): boolean {
  const cleared = args.isSelf || canSee(args.audience, args.viewer);
  return cleared && args.hasData;
}
