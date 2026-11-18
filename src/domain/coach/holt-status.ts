/**
 * Holt's status line while a tool runs (pure). AI Road to 10 Sprint 4a §1.5 — lane C.
 *
 * The server keeps sending its fixed table line (`ASK_STATUS_PHRASES`, what an old phone shows) and adds `detail`
 * once a tool's input is complete: `{tool, n?, lift?, food?, days?}`. This turns that into the line a person would
 * say — "Reading your last 6 bench sessions…", "Looking up chicken burrito…", "Checking 4 weeks of training…".
 *
 * ⛔ NEVER THE MODEL'S WORDS. The template is the app's; the only things that may fill it are a whole number and a
 * SHORT NAME (≤ 30 characters, letters and digits and a little punctuation, at most five words — the athlete's own
 * logged lift or food, or a catalogue name, which the server is the one to choose). Anything else — an unknown tool,
 * a fraction, a sentence, a link, a number on a tool that does not use it — and the line is the server's table line,
 * exactly as an old phone shows it.
 *
 * Pure, no imports: `node --test` loads it as it is.
 */

/** The server's `detail` on a `{status}` event (lane A sends it). Numbers + a lift/food name the athlete owns. */
export interface StatusDetail {
  tool: string;
  n?: number;
  lift?: string;
  food?: string;
  days?: number;
}

/** The longest name a line may carry (§1.5). */
export const STATUS_NAME_MAX = 30;
const NAME_WORDS_MAX = 5;
const COUNT_MAX = 365;
const DAYS_MAX = 730;

/** A whole number in range, or null. */
function count(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= max ? v : null;
}

/**
 * A short name, or null. Letters, digits, spaces and the punctuation names carry ("Chicken & rice", "Pull-up",
 * "Dr. Pepper", "1/2 bagel"), at least one letter, no more than five words, nothing that looks like a link.
 */
export function shortName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t || t.length > STATUS_NAME_MAX) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’&\-.,/()+]*$/u.test(t)) return null;
  if (!/\p{L}/u.test(t)) return null;
  if (t.split(' ').length > NAME_WORDS_MAX) return null;
  if (/https?|www\.|\.(com|net|org|io)\b/i.test(t)) return null;
  return t;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** "4 weeks" when it is whole weeks (two or more), else "10 days". */
function span(days: number): string {
  if (days >= 14 && days % 7 === 0) return `${days / 7} weeks`;
  return `${days} ${plural(days, 'day')}`;
}

type Filled = { n: number | null; days: number | null; lift: string | null; food: string | null };
type Template = (d: Filled) => string | null;

/** One template per tool. A tool missing here, or a template that returns null, falls back to the table line. */
const TEMPLATES: Readonly<Record<string, Template>> = {
  get_lift_history: ({ n, lift }) =>
    lift && n === 1 ? `Reading your last ${lift} session…` : lift && n ? `Reading your last ${n} ${lift} sessions…` : lift ? `Reading your ${lift} log…` : null,
  get_personal_records: ({ lift }) => (lift ? `Checking your ${lift} records…` : null),
  get_training_summary: ({ days }) => (days ? `Checking ${span(days)} of training…` : null),
  get_recent_workouts: ({ n }) => (n === 1 ? 'Checking your last workout…' : n ? `Checking your last ${n} workouts…` : null),
  get_cardio_history: ({ days, n }) =>
    days ? `Checking ${span(days)} of cardio…` : n ? `Checking your last ${n} cardio ${plural(n, 'session')}…` : null,
  get_nutrition_log: ({ days }) => (days === 1 ? "Checking today's food log…" : days ? `Checking ${span(days)} of your food log…` : null),
  get_body_metrics: ({ days }) => (days ? `Checking ${span(days)} of measurements…` : null),
  get_past_chats: ({ n }) => (n === 1 ? 'Looking back at our last chat…' : n ? `Looking back at our last ${n} chats…` : null),
  get_foods: ({ food }) => (food ? `Looking up ${food}…` : null),
  get_recipes: ({ food }) => (food ? `Looking for ${food} recipes…` : null),
};

/** The tools that have a template — the ones lane A's server should send `detail` for. */
export const STATUS_TEMPLATE_TOOLS: readonly string[] = Object.keys(TEMPLATES);

/**
 * The line to show. `status` is the server's table line (the wire has already checked it against the table);
 * `detail` is optional and is trusted only as far as the checks above.
 */
export function statusLine(status: string, detail?: StatusDetail | null): string {
  if (!detail || typeof detail !== 'object' || typeof detail.tool !== 'string') return status;
  if (!Object.prototype.hasOwnProperty.call(TEMPLATES, detail.tool)) return status;
  const line = TEMPLATES[detail.tool]({
    n: count(detail.n, COUNT_MAX),
    days: count(detail.days, DAYS_MAX),
    lift: shortName(detail.lift),
    food: shortName(detail.food),
  });
  return line ?? status;
}
