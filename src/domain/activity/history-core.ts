/**
 * Activity History (W-18) — filtering, month grouping and row formatting for the training log.
 * Pure (type-only imports) so every rule here runs under `node --test`.
 *
 * The `.dc` reads a demo module (`forge-activity-log.js`: 23 seed records + localStorage). This builds
 * against the athlete's REAL logged workouts instead, so the list is their actual history.
 *
 * ACTIVITY TYPES: the design names nine (…hiit, yoga…). The database's `modality` enum has eight and
 * they don't line up — it has no `hiit` or `yoga`, and it does have `rowing`. The chips below follow the
 * ENUM, because a chip for a type the app cannot log would be a filter that can never match anything.
 */

export type Modality = 'strength' | 'running' | 'walking' | 'cycling' | 'swimming' | 'rowing' | 'mobility' | 'other';

export interface ActivityRecord {
  id: string;
  type: Modality;
  title: string;
  /** ISO timestamp the session started. */
  startedAt: string;
  durationSec: number | null;
  /** Strength: how many exercises and completed sets the session actually logged. */
  exerciseCount: number;
  setCount: number;
  /** Cardio: distance as stored, with its own unit — never assumed or converted blind. */
  distance: number | null;
  distanceUnit: string | null;
  chapterName: string | null;
  /** A personal record was set in this session. */
  pr: boolean;
  partners: string[];
}

export const ACTIVITY_ORDER: Modality[] = [
  'strength',
  'running',
  'walking',
  'cycling',
  'swimming',
  'rowing',
  'mobility',
  'other',
];

export const ACTIVITY_LABEL: Record<Modality, string> = {
  strength: 'Strength',
  running: 'Run',
  walking: 'Walk',
  cycling: 'Bike',
  swimming: 'Swim',
  rowing: 'Row',
  mobility: 'Mobility',
  other: 'Other',
};

export type ActivityFilter = 'all' | Modality;

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** `< 1 min` · `{m} min` · `{h} hr` · `{h} hr {r} min` (design §5.3). */
export function fmtDuration(sec: number | null): string {
  if (sec == null || sec <= 0) return '—';
  // Test the SECONDS, not the rounded minutes: 30s rounds to 1 and would read "1 min" for a session
  // that never reached a minute.
  if (sec < 60) return '< 1 min';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} hr` : `${h} hr ${r} min`;
}

/** "Jun 10" — the design strips the leading weekday from the row's date. */
export function fmtRowDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "June 2026" — the month-group key. */
export function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The centre stat line, by type. Empty when duration already says everything. */
export function statLine(r: ActivityRecord): string {
  switch (r.type) {
    case 'strength':
      return r.setCount > 0 ? plural(r.setCount, 'set') : '';
    case 'running':
    case 'walking':
    case 'cycling':
    case 'swimming':
    case 'rowing':
      return r.distance != null && r.distance > 0
        ? `${Number(r.distance.toFixed(1))} ${r.distanceUnit ?? 'mi'}`
        : '';
    default:
      return '';
  }
}

/** "with Marcus" / "with Marcus +2" — first name only, count for the rest. */
export function partnersLabel(partners: string[]): string {
  if (partners.length === 0) return '';
  const first = partners[0].trim().split(/\s+/)[0];
  return partners.length > 1 ? `with ${first} +${partners.length - 1}` : `with ${first}`;
}

/** The row's spoken description — everything the visual row conveys, in one sentence. */
export function rowA11y(r: ActivityRecord): string {
  const parts = [
    r.title,
    ACTIVITY_LABEL[r.type],
    new Date(r.startedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    fmtDuration(r.durationSec),
  ];
  const stat = statLine(r);
  if (stat) parts.push(stat);
  if (r.pr) parts.push('personal record');
  if (r.chapterName) parts.push(r.chapterName);
  if (r.partners.length) parts.push(partnersLabel(r.partners));
  return `${parts.join(', ')}. Double-tap for detail.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER + GROUP
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthGroup {
  month: string;
  rows: ActivityRecord[];
}

/**
 * Filter by type, then group into months — newest first throughout. Grouping preserves the incoming
 * order rather than re-sorting, so a caller that has already ordered by `started_at desc` keeps it.
 */
export function groupByMonth(records: readonly ActivityRecord[], filter: ActivityFilter): MonthGroup[] {
  const matched = filter === 'all' ? records : records.filter((r) => r.type === filter);
  const groups: MonthGroup[] = [];
  for (const r of matched) {
    const key = monthKey(r.startedAt);
    const last = groups[groups.length - 1];
    if (last && last.month === key) last.rows.push(r);
    else groups.push({ month: key, rows: [r] });
  }
  return groups;
}

/** Empty-state copy: generic when unfiltered, type-specific otherwise (design §5.4). */
export function emptyMessage(filter: ActivityFilter): string {
  if (filter === 'all') return 'Your workout history will appear here as you train.';
  return `No ${ACTIVITY_LABEL[filter]} sessions yet.`;
}
