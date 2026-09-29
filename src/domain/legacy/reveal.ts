/**
 * What the Legacy tab renders, derived from what the athlete actually has — `Legacy-Amendment-002`.
 *
 * ══ THE RULE ══
 *
 * The mature Legacy hub is the RESULT of using Forge, not the starting interface. A section appears
 * because there is something in it worth showing, never because the feature exists and never because
 * the account is old. A hidden section is ABSENT — no locked card, no disabled row, no "coming soon".
 *
 * Every decision lives here, as one pure function over counts, so the screen does no reasoning of its
 * own and a threshold is changed in one place with a test beside it.
 *
 * ══ THE ONE AMBIGUITY, AND HOW IT IS READ (PO, 2026-09-29) ══
 *
 * Skipping the chapter step in onboarding does not skip the chapter. `complete_onboarding` always
 * opens Chapter I (ONB-D14), and a skip only means it gets the default title. Nothing stores the skip.
 * So "skipped" is read as: the open chapter is Chapter I and still carries the untouched default name.
 * That chapter is real — it holds their workouts — so "Start Your First Chapter" NAMES it rather than
 * creating a second one. Someone who tapped the default suggestion on purpose reads the same way until
 * they rename it; the PO accepted that.
 */
import { chapterNameFrom } from './chapter-name.ts';

export interface LegacyFacts {
  /** The open chapter's full stored name (`Chapter I — …`), or null when no chapter is open. */
  activeChapterName: string | null;
  sealedChapterCount: number;
  /** Saved workouts, all time. */
  savedWorkoutCount: number;
  /**
   * MEANINGFUL events: what the L-2 timeline shows, minus chapter openings. Honors, real PRs, goals,
   * rank-ups, photos, accomplishments, seals, program finishes. Ordinary workouts are NOT events.
   */
  timelineEventCount: number;
  photoCount: number;
  transformationCount: number;
  /** Competitions entered — the Trophy Case's own "has something" fact. */
  trophiesEntered: number;
  accomplishmentCount: number;
  honorCount: number;
  pinCount: number;
  hasQuote: boolean;
}

/**
 * Pinned Legacy appears once curating is a real choice: something is already pinned, or there are at
 * least this many things that CAN be pinned (accomplishments · honors · sealed chapters — the L-13
 * candidates, minus the open chapter every athlete has).
 */
export const PINNED_MIN_ITEMS = 2;

/** The timeline is promoted once it has this many things to show (stored events + workouts). */
export const TIMELINE_MIN_EVENTS = 3;

/**
 * - `hero` — a named open chapter: it is the focus of the page.
 * - `start-first` — no chapter chosen yet (skipped, or none at all and none ever sealed).
 * - `start-next` — the last chapter was sealed and no new one is open.
 */
export type ChapterSlot = 'hero' | 'start-first' | 'start-next';

export interface LegacyReveal {
  chapter: ChapterSlot;
  /** When `start-first` names an EXISTING chapter (rename) rather than creating one. */
  chapterStartsByRename: boolean;
  /** "Your Legacy starts here." — only for a brand-new athlete with no chapter chosen. */
  intro: boolean;
  /** The large "Start Building Your Legacy" module — a brand-new athlete WITH a chapter. */
  startBuilding: boolean;
  /** The compact "Add to your Legacy" row, one tile per thing still missing; null when hidden. */
  addRow: { photo: boolean; accomplishment: boolean; quote: boolean } | null;
  quote: boolean;
  /**
   * "Recent Legacy". It shows meaningful events once any exist. Before that, and only before that, it
   * shows the latest workout, so the first session still proves "I trained, and Forge remembered it".
   * Workouts record what you did; Legacy records what mattered (PO, 2026-09-29).
   */
  recentLegacy: 'events' | 'workouts' | null;
  /** The closing inscription. Only once the page holds collections; an early page ends in whitespace. */
  inscription: boolean;
  pinned: boolean;
  timeline: boolean;
  transformationTile: boolean;
  photosTile: boolean;
  trophyTile: boolean;
  accomplishments: boolean;
  honors: boolean;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Today" · "Yesterday" · "Sep 12" — the Recent Activity row's day, on the athlete's LOCAL calendar.
 * Compared by calendar day, not by 24-hour windows: a workout at 11pm is "Yesterday" at 7am.
 */
export function activityDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

/** True when the open chapter is Chapter I under the name onboarding writes on a skip. */
export function isUnnamedChapterI(name: string | null): boolean {
  return name != null && name.trim() === chapterNameFrom('');
}

export function legacyReveal(f: LegacyFacts): LegacyReveal {
  const unnamed = isUnnamedChapterI(f.activeChapterName);
  const chapter: ChapterSlot =
    f.activeChapterName != null && !unnamed ? 'hero' : f.sealedChapterCount > 0 && !unnamed ? 'start-next' : 'start-first';

  // A PROGRESS photo is a Transformation entry (PO, 09-29) — a chapter photo is a memory, not a starting point.
  const needsPhoto = f.transformationCount === 0;
  const needsAccomplishment = f.accomplishmentCount === 0;
  const needsQuote = !f.hasQuote;

  /*
   * Brand new = nothing trained and nothing kept. Every fact that would reveal a section counts, so a
   * brand-new page can never sit above a collection it is pretending doesn't exist.
   */
  const hasAnyContent =
    f.savedWorkoutCount > 0 ||
    f.sealedChapterCount > 0 ||
    f.timelineEventCount > 0 ||
    f.photoCount > 0 ||
    f.transformationCount > 0 ||
    f.trophiesEntered > 0 ||
    f.accomplishmentCount > 0 ||
    f.honorCount > 0 ||
    f.pinCount > 0 ||
    f.hasQuote;
  const brandNew = !hasAnyContent;

  const startBuilding = brandNew && chapter === 'hero';
  const anyMissing = needsPhoto || needsAccomplishment || needsQuote;

  const pinned = f.pinCount > 0 || f.accomplishmentCount + f.honorCount + f.sealedChapterCount >= PINNED_MIN_ITEMS;
  const timeline = f.timelineEventCount + f.savedWorkoutCount >= TIMELINE_MIN_EVENTS;
  const transformationTile = f.transformationCount > 0;
  const photosTile = f.photoCount > 0;
  const trophyTile = f.trophiesEntered > 0;
  const accomplishments = f.accomplishmentCount > 0;
  const honors = f.honorCount > 0;

  return {
    chapter,
    chapterStartsByRename: unnamed,
    intro: brandNew && chapter === 'start-first',
    startBuilding,
    addRow: !startBuilding && anyMissing ? { photo: needsPhoto, accomplishment: needsAccomplishment, quote: needsQuote } : null,
    quote: f.hasQuote,
    recentLegacy: f.timelineEventCount > 0 ? 'events' : f.savedWorkoutCount > 0 ? 'workouts' : null,
    inscription:
      pinned || transformationTile || photosTile || trophyTile || accomplishments || honors || f.sealedChapterCount > 0,
    pinned,
    timeline,
    transformationTile,
    photosTile,
    trophyTile,
    accomplishments,
    honors,
  };
}

/** How many rows Recent Legacy shows. The full record is one tap away on the timeline. */
export const RECENT_LEGACY_MAX = 3;

/**
 * The meaningful events worth surfacing, newest first. Chapter openings are dropped: every athlete has
 * one from day one, so counting it would make the first workout's fallback unreachable.
 */
export function recentLegacyEvents<T extends { kind: string; at: string }>(events: readonly T[], max = RECENT_LEGACY_MAX): T[] {
  return events
    .filter((e) => e.kind !== 'chapter-open')
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, max);
}
