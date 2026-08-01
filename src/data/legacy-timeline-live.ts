import { supabase } from '@/lib/supabase';
import { countHonorsByChapter, honorsInChapter } from '@/domain/legacy/chapter-tallies';

/**
 * Legacy Timeline (L-2) — every mark, in order.
 *
 * NO MIGRATION. `timeline_events` has existed since 0001 and twelve migrations write to it; `chapters`
 * and `personal_records` are the athlete's own. Three reads and a merge.
 *
 * ── THE STREAM IS A UNION, NOT A TABLE ──────────────────────────────────────
 *
 * `flm_event_type` covers nine kinds, and the design's canonical ten include two it does not:
 *
 *   · CHAPTER OPENED. Nothing writes it, because nothing needs to — `chapters.start_date` IS the fact.
 *     Storing a row to say a chapter began, next to the column that says when it began, would be two
 *     records of one truth and an invitation for them to disagree.
 *   · A PR. Same reasoning: `personal_records` already holds every one with its date and load.
 *
 * Both are derived here. The alternative — backfilling rows and writing them going forward — buys
 * nothing and adds a way to be wrong.
 *
 * ── WHERE AN EVENT BELONGS ──────────────────────────────────────────────────
 *
 * The timeline groups by chapter, and `timeline_events.chapter_id` is nullable by design: 0001 comments
 * it "null = standalone (RANK_UP)". A rank promotion still HAPPENED during a chapter, though, and
 * floating it outside one would break the rail. Anything unassigned is placed in the chapter whose dates
 * contain it, which is a resolution rather than a guess — chapters do not overlap.
 */

export type TimelineKind =
  | 'chapter-open'
  | 'chapter-seal'
  | 'rank'
  | 'honor'
  | 'goal'
  | 'pr'
  | 'program-grad'
  | 'accomplishment'
  | 'photo'
  | 'reflection'
  | 'memory';

/** Chapter boundaries, goals and rank promotions carry weight; the rest are marks along the way. */
const MAJOR: TimelineKind[] = ['chapter-open', 'chapter-seal', 'goal', 'rank'];
export const isMajor = (k: TimelineKind): boolean => MAJOR.includes(k);

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  sub: string | null;
  at: string;
  /** Where tapping it goes. Null when the record has no screen of its own. */
  route: { pathname: string; params?: Record<string, string> } | null;
}

export interface TimelineChapter {
  id: string;
  name: string;
  isActive: boolean;
  sealed: boolean;
  startDate: string;
  endDate: string | null;
  workoutCount: number;
  honorCount: number;
  events: TimelineEvent[];
}

/** A year heading, a chapter heading, or a mark. One ordered stream, three shapes. */
export type TimelineNode =
  | { type: 'year'; key: string; year: number }
  | { type: 'chapter'; key: string; chapter: TimelineChapter }
  | { type: 'event'; key: string; event: TimelineEvent };

export interface LegacyTimeline {
  chapters: TimelineChapter[];
  nodes: TimelineNode[];
  /** The first thing that ever happened. Null before there is one. */
  originAt: string | null;
}

const KIND_OF: Record<string, TimelineKind> = {
  CHAPTER_SEALED: 'chapter-seal',
  GOAL_ACHIEVED: 'goal',
  RANK_UP: 'rank',
  PROGRAM_GRADUATED: 'program-grad',
  ACCOMPLISHMENT: 'accomplishment',
  HONOR_EARNED: 'honor',
  REFLECTION_ADDED: 'reflection',
  MEMORY_ADDED: 'memory',
  PHOTO_ADDED: 'photo',
};

interface ChapterRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  sealed_at: string | null;
  is_active: boolean;
  workout_count: number;
  /* NO `honor_count` — the column is always 0 (0098). Derived from honor_instances below. */
}

interface EventRow {
  id: string;
  event_type: string;
  object_name: string;
  chapter_id: string | null;
  occurred_at: string;
}

interface PrRow {
  id: string;
  exercise: string;
  achieved_on: string | null;
  measure_kind: string | null;
  load_value: number | null;
  load_unit: string | null;
  load_reps: number | null;
}

/** "barbell-back-squat" → "Back Squat". The leading equipment word goes; a row has room for a lift. */
export function liftName(slug: string): string {
  const words = slug.split('-').filter(Boolean);
  const trimmed = words.length > 2 ? words.slice(1) : words;
  return trimmed.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const yearOf = (iso: string): number => new Date(iso).getFullYear();

/** Where a mark leads. Every destination here is a screen that exists; the rest stay inert honestly. */
function routeFor(kind: TimelineKind): TimelineEvent['route'] {
  switch (kind) {
    case 'honor':
      return { pathname: '/honors' };
    case 'accomplishment':
      return { pathname: '/accomplishments' };
    case 'goal':
      return { pathname: '/goals' };
    case 'rank':
      return { pathname: '/progress-hub' };
    case 'photo':
      return { pathname: '/photos' };
    default:
      // A PR has no screen of its own, and chapter boundaries are reached by the header above them.
      return null;
  }
}

export async function fetchLegacyTimeline(): Promise<LegacyTimeline> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { chapters: [], nodes: [], originAt: null };

  const [chapterRes, eventRes, prRes, honorRes] = await Promise.all([
    supabase.from('chapters').select('id, name, start_date, end_date, sealed_at, is_active, workout_count').eq('athlete_id', user.id).order('start_date', { ascending: false }),
    supabase.from('timeline_events').select('id, event_type, object_name, chapter_id, occurred_at').eq('athlete_id', user.id).order('occurred_at', { ascending: false }),
    supabase.from('personal_records').select('id, exercise, achieved_on, measure_kind, load_value, load_unit, load_reps').eq('athlete_id', user.id).order('achieved_on', { ascending: false }),
    // The per-chapter honor tally, derived (0098). `chapters.honor_count` reads 0 for every chapter
    // ever created, so this timeline used to label each chapter "0 honors". In the same batch as the
    // other three, so it adds no round trip.
    supabase.from('honor_instances').select('chapter_id').eq('athlete_id', user.id).not('chapter_id', 'is', null),
  ]);

  const chapterRows = (chapterRes.data ?? []) as ChapterRow[];
  const eventRows = (eventRes.data ?? []) as EventRow[];
  const prRows = (prRes.data ?? []) as PrRow[];

  const honorsByChapter = countHonorsByChapter((honorRes.data ?? []) as { chapter_id: string | null }[]);

  const chapters: TimelineChapter[] = chapterRows.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.is_active,
    sealed: c.sealed_at != null,
    startDate: c.start_date,
    endDate: c.end_date ?? (c.sealed_at ? c.sealed_at.slice(0, 10) : null),
    workoutCount: c.workout_count ?? 0,
    honorCount: honorsInChapter(honorsByChapter, c.id),
    events: [],
  }));

  const byId = new Map(chapters.map((c) => [c.id, c]));

  /** Chapters don't overlap, so a date resolves to at most one — this places, it doesn't guess. */
  const chapterAt = (iso: string): TimelineChapter | null => {
    const t = new Date(iso).getTime();
    for (const c of chapters) {
      const from = new Date(`${c.startDate}T00:00:00`).getTime();
      const to = c.endDate ? new Date(`${c.endDate}T23:59:59`).getTime() : Infinity;
      if (t >= from && t <= to) return c;
    }
    return null;
  };

  const place = (e: TimelineEvent, chapterId: string | null) => {
    const c = (chapterId ? byId.get(chapterId) : null) ?? chapterAt(e.at);
    if (c) c.events.push(e);
  };

  // ── stored events ──
  for (const r of eventRows) {
    const kind = KIND_OF[r.event_type];
    if (!kind) continue; // an event this build can't word is worse than one it words wrongly
    place(
      {
        id: r.id,
        kind,
        title: titleFor(kind, r.object_name),
        sub: subFor(kind, r.object_name),
        at: r.occurred_at,
        route: routeFor(kind),
      },
      r.chapter_id,
    );
  }

  // ── derived: every chapter opened ──
  for (const c of chapters) {
    c.events.push({
      id: `open-${c.id}`,
      kind: 'chapter-open',
      title: `Began ${c.name}`,
      sub: null,
      at: `${c.startDate}T00:00:00.000Z`,
      route: { pathname: '/chapter/[id]', params: { id: c.id } },
    });
  }

  // ── derived: every PR ──
  for (const r of prRows) {
    if (!r.achieved_on) continue;
    const load = r.load_value != null ? `${Math.round(r.load_value)} ${r.load_unit ?? 'lb'}` : null;
    place(
      {
        id: r.id,
        kind: 'pr',
        title: load ? `${liftName(r.exercise)} PR · ${load}` : `${liftName(r.exercise)} PR`,
        sub: r.load_reps && r.load_reps > 1 ? `${r.load_reps} reps` : null,
        at: `${r.achieved_on}T12:00:00.000Z`,
        route: null,
      },
      null,
    );
  }

  for (const c of chapters) c.events.sort((a, b) => b.at.localeCompare(a.at));

  return { chapters, nodes: flatten(chapters), originAt: originOf(chapters) };
}

function titleFor(kind: TimelineKind, name: string): string {
  switch (kind) {
    case 'chapter-seal':
      return `Sealed ${name}`;
    case 'honor':
      return `Earned “${name}”`;
    case 'goal':
      return `Achieved ${name}`;
    case 'rank':
      return `Reached ${name}`;
    case 'program-grad':
      return `Graduated ${name}`;
    case 'reflection':
      return 'Wrote a reflection';
    case 'memory':
      return 'Added a memory';
    case 'photo':
      return 'Added a photo';
    default:
      return name;
  }
}

/** Only where it says something the title doesn't — the design repeats the chapter name back at itself. */
function subFor(kind: TimelineKind, name: string): string | null {
  return kind === 'reflection' || kind === 'memory' ? name : null;
}

/**
 * Chapters newest-first, each header followed by its own marks, with a year divider the first time a
 * year changes.
 *
 * The `headYear` pre-check is the part that is easy to get wrong: without it the per-event check still
 * catches the change, but places the divider AFTER the chapter header rather than above it.
 */
function flatten(chapters: TimelineChapter[]): TimelineNode[] {
  const out: TimelineNode[] = [];
  let lastYear: number | null = null;

  for (const c of chapters) {
    const headYear = c.events.length ? yearOf(c.events[0].at) : yearOf(`${c.startDate}T00:00:00`);
    if (headYear !== lastYear) {
      out.push({ type: 'year', key: `y-${headYear}-${c.id}`, year: headYear });
      lastYear = headYear;
    }
    out.push({ type: 'chapter', key: `c-${c.id}`, chapter: c });

    for (const e of c.events) {
      const y = yearOf(e.at);
      if (y !== lastYear) {
        out.push({ type: 'year', key: `y-${y}-${e.id}`, year: y });
        lastYear = y;
      }
      out.push({ type: 'event', key: `e-${e.id}`, event: e });
    }
  }
  return out;
}

function originOf(chapters: TimelineChapter[]): string | null {
  let oldest: string | null = null;
  for (const c of chapters) {
    for (const e of c.events) if (!oldest || e.at < oldest) oldest = e.at;
  }
  return oldest;
}

// ── labels ──────────────────────────────────────────────────────────────────

/** "Oct 2" — the year lives in the sticky divider above it. */
export function markDate(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

/**
 * "Sep 2025 – Mar 2026", or "Started Mar 2026" while it is still being lived.
 *
 * The design binds this slot to the chapter's SUMMARY — it renders "22 workouts · 3 honors" in a field
 * named `range`, so the one screen organised by time never shows a chapter's dates. This is the range.
 */
export function chapterRange(c: TimelineChapter): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : iso;
  };
  return c.endDate ? `${fmt(c.startDate)} – ${fmt(c.endDate)}` : `Started ${fmt(c.startDate)}`;
}

/** "22 workouts · 3 honors" — kept, but beside the range rather than instead of it. */
export function chapterSummary(c: TimelineChapter): string {
  const parts = [`${c.workoutCount} ${c.workoutCount === 1 ? 'workout' : 'workouts'}`];
  if (c.honorCount > 0) parts.push(`${c.honorCount} ${c.honorCount === 1 ? 'honor' : 'honors'}`);
  return parts.join(' · ');
}
