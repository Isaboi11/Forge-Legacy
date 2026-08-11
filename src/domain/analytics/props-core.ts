/**
 * What an analytics event is allowed to carry.
 *
 * ══ THIS MODULE IS A PROMISE MADE TRUE IN CODE ══
 *
 * `Docs/Legal/Privacy-Policy.md` § 2 "Product usage" tells athletes that a usage record never contains
 * anything they wrote — no workout or exercise names, notes, reflections, goals, messages, comments or
 * search terms — and nothing they lifted. `P-6-Amendment-001` P6-A1-D3 makes that binding.
 *
 * A rule like that cannot live in a habit. Every `track()` call is written by somebody in a hurry, and
 * `track('workout_saved', { name: workout.name })` is the most natural line in the world to write. So
 * the boundary is an ALLOWLIST, applied here, tested: a key nobody added to `ALLOWED_PROP_KEYS` does
 * not reach the database, whatever the caller passed.
 *
 * ⚠ BEFORE ADDING A KEY, ask whether an athlete typed it or lifted it. If either, it does not go in.
 *   Ids, enums, booleans and counts describe HOW the app was used. Names and numbers-they-moved
 *   describe the athlete, and that is the line.
 */

/**
 * The complete set of prop keys any event may carry.
 *
 * Every one is an id, an enum, a boolean or a count. There is deliberately no `name`, no `title`, no
 * `note`, no `query`, no `weight`, no `reps`, no `url`.
 */
export const ALLOWED_PROP_KEYS: ReadonlySet<string> = new Set([
  // What kind of thing, never which specific one the athlete authored.
  'category',
  'kind',
  'source',
  'result',
  'method',
  'tab',
  'section',
  'state',
  'variant',
  'reason',
  // Catalogue ids — a shipped constant, not athlete text. `catalog_key` is the exercise the app
  // offered; a custom exercise contributes `is_custom: true` and nothing else.
  'catalog_key',
  'activity_type',
  'modality',
  'equipment',
  'is_custom',
  // Counts and durations OF THE INTERACTION — how many taps, how long on screen. Never a lift.
  'count',
  'index',
  'position',
  'duration_ms',
  'ms',
  'step',
  'total',
  // Booleans about the app's own state.
  'success',
  'enabled',
  'first_time',
  'from_push',
  'offline',
  'has_program',
  'is_empty',
]);

/** One prop value, after sanitising. */
export type PropValue = string | number | boolean;
export type Props = Record<string, PropValue>;

/** A string prop longer than this is truncated. Enums and ids are far shorter; anything near it is suspect. */
export const MAX_STRING = 64;
/** More keys than this and somebody is shipping a record, not an event. */
export const MAX_KEYS = 12;

/**
 * ⚠ A LAST-RESORT CONTENT CHECK, NOT THE MAIN DEFENCE.
 *
 * The allowlist is the defence. This catches the case where an allowlisted key is handed
 * athlete-authored text anyway — `{ category: workout.name }` — which the key check alone cannot see.
 * A value with whitespace in the middle is prose, not an id or an enum: `LEGS_AND_GLUTES`,
 * `barbell_bench_press` and `saved` all pass; "Push Day A" and "felt strong today" do not.
 */
function looksLikeProse(v: string): boolean {
  return /\s/.test(v.trim());
}

/**
 * Reduce arbitrary caller input to something safe to store.
 *
 * Drops, rather than throws: an analytics call must never be able to break a screen (P6-A1-D11). A
 * dropped prop costs one dimension on a chart; a thrown error costs the athlete their workout.
 */
export function sanitizeProps(raw: unknown): Props {
  const out: Props = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

  let kept = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (kept >= MAX_KEYS) break;
    if (!ALLOWED_PROP_KEYS.has(key)) continue;

    if (typeof value === 'boolean') {
      out[key] = value;
      kept += 1;
      continue;
    }
    if (typeof value === 'number') {
      // NaN and Infinity are not JSON and would land as null; a broken number is worse than no number.
      if (!Number.isFinite(value)) continue;
      out[key] = value;
      kept += 1;
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (looksLikeProse(trimmed)) continue;
      out[key] = trimmed.slice(0, MAX_STRING);
      kept += 1;
      continue;
    }
    // Objects, arrays, null, undefined, functions: no event needs one, and a nested object is how a
    // whole workout ends up in a props column.
  }
  return out;
}

/** Event names follow the same discipline as prop keys: lower_snake_case, bounded, no prose. */
export function sanitizeKind(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim().toLowerCase();
  if (!k || k.length > 60) return null;
  return /^[a-z][a-z0-9_]*$/.test(k) ? k : null;
}

/**
 * A route path, reduced to its SHAPE.
 *
 * `/squad/9f3c-…` is one athlete's squad; `/squad/[id]` is the screen. Storing the raw path would put
 * ids of things the athlete looked at into the event log for no analytical gain — every question worth
 * asking is "how often is the squad screen opened", never "which squad".
 *
 * Also drops the query string, which is where a search term would ride in.
 */
export function sanitizeScreen(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const path = raw.split('?')[0].split('#')[0].trim();
  if (!path) return null;

  const shaped = path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      // A uuid, a long hex id, or a bare number is an instance, not a screen.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return '[id]';
      if (/^[0-9a-f]{16,}$/i.test(seg)) return '[id]';
      if (/^\d+$/.test(seg)) return '[id]';
      return seg;
    })
    .join('/');

  return shaped.slice(0, 120) || null;
}
