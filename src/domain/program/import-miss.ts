/**
 * IM-5 — "SEND THIS TO FORGE SO WE LEARN THIS FORMAT?" (AI Road to 10 Sprint 3b; PO 2026-11-17; migration 0275).
 *
 * The import always answers at once. When the read was UNSURE, the screen offers to send it to Forge — the athlete's
 * choice, every time, and nothing goes without the tap. Claude works the queue on /admin: a rule for the reader and a
 * case for the corpus, so the format stays read right for everyone (Free, Premium and AI alike).
 *
 * This file decides WHEN to offer, WHAT is sent (small, plain JSON — no photo bytes, no account fields), and the text
 * an operator copies for Claude. Pure: tested under `node --test` (`import-miss.test.mjs`).
 */
import type { ParsedItem, ParsedWeek } from './import-parse.ts';

/**
 * Lines every card has that are not training, listed on the preview as "not read as training" on purpose — the
 * warm-up words, the recovery list. They are not a sign the read was unsure.
 */
const ROUTINE_SKIP = /^(?:warm[\s-]?up|recovery|cardio|note|notes)\b\s*:?/i;

/**
 * Why this read is unsure, in the athlete's words — empty when it is not, and then the offer is not shown.
 *   · a line nothing could be made of (not a warm-up or recovery line, which every card has);
 *   · something the read asks them to check (a number AI could not check, a lift with no reps, a line not read);
 *   · a lift name the exercise library does not know.
 */
export function importUnsureReasons(input: {
  weeks: readonly ParsedWeek[];
  skipped: readonly string[];
  checks: readonly string[];
  /** True when the library knows the name (the screen passes `resolveImportedName`). */
  isKnown: (name: string) => boolean;
}): string[] {
  const out: string[] = [];
  const lines = input.skipped.filter((s) => s.trim() && !ROUTINE_SKIP.test(s.trim()));
  if (lines.length) out.push(lines.length === 1 ? 'A line wasn’t read as training.' : `${lines.length} lines weren’t read as training.`);
  if (input.checks.length) out.push(input.checks.length === 1 ? 'One thing to check.' : `${input.checks.length} things to check.`);
  const names = new Set<string>();
  for (const w of input.weeks) for (const d of w.days) for (const it of d.items) if (!it.section && !input.isKnown(it.name)) names.add(it.name);
  if (names.size) out.push(names.size === 1 ? 'A lift name we don’t know.' : `${names.size} lift names we don’t know.`);
  return out;
}

/** One preview row, as the queue shows it — the prescription only. */
function itemOf(it: ParsedItem) {
  const rx = it.rx ?? {};
  return {
    name: it.name,
    sets: it.sets,
    reps: it.reps,
    ...(it.durationSec ? { sec: it.durationSec } : null),
    ...(it.toFailure ? { failure: true } : null),
    ...(it.section ? { section: it.section } : null),
    ...(rx.repScheme?.length ? { ladder: rx.repScheme } : null),
    ...(rx.repsMax != null ? { repsMax: rx.repsMax } : null),
    ...(rx.percentOfMax != null ? { pct: rx.percentOfMax } : null),
    ...(rx.percentScheme?.length ? { pcts: rx.percentScheme } : null),
    ...(rx.restSec != null ? { rest: rx.restSec } : null),
    ...(rx.groupId ? { group: rx.groupId } : null),
  };
}

export type MissWeeks = { week: number; days: { name: string; items: ReturnType<typeof itemOf>[] }[] }[];

export function missWeeks(weeks: readonly ParsedWeek[]): MissWeeks {
  return weeks.map((w) => ({ week: w.index, days: w.days.map((d) => ({ name: d.name, items: d.items.map(itemOf) })) }));
}

/** Short enough for the 256 kB column check with room to spare: a program is 200 rows, a line 200 characters. */
const MAX_LINES = 60;
const MAX_LINE = 300;
const clip = (xs: readonly string[]) => xs.slice(0, MAX_LINES).map((s) => (s.length > MAX_LINE ? `${s.slice(0, MAX_LINE)}…` : s));

/** What was read: the preview's weeks, the lines not read, the checks, and why the offer was made. */
export function importMissRead(input: { weeks: readonly ParsedWeek[]; skipped: readonly string[]; checks: readonly string[]; reasons: readonly string[]; via: 'paste' | 'card' | 'table' | 'photos' }) {
  return { via: input.via, weeks: missWeeks(input.weeks), skipped: clip(input.skipped), checks: clip(input.checks), reasons: [...input.reasons] };
}

/** What the athlete changed by hand before sending — the preview as it stands — or null when they changed nothing. */
export function importMissCorrected(read: readonly ParsedWeek[], now: readonly ParsedWeek[]): MissWeeks | null {
  const a = missWeeks(read);
  const b = missWeeks(now);
  return JSON.stringify(a) === JSON.stringify(b) ? null : b;
}

/** A row of the /admin queue (`admin_import_misses`, 0275). */
export interface ImportMiss {
  id: string;
  createdAt: string;
  kind: 'paste' | 'photo';
  inputText: string | null;
  photoPath: string | null;
  read: { via?: string; weeks?: MissWeeks; skipped?: string[]; checks?: string[]; reasons?: string[] } | null;
  corrected: MissWeeks | null;
  appVersion: string | null;
  athlete: string;
  handle: string | null;
  resolvedAt: string | null;
  resolution: string | null;
}

/** The server's row → the queue's. Throws on a shape it cannot read (a failed load is said, never drawn empty). */
export function shapeImportMisses(raw: unknown): ImportMiss[] {
  if (!Array.isArray(raw)) throw new Error('admin_import_misses did not return a list');
  return raw.map((r: Record<string, unknown>) => {
    if (!r || typeof r.id !== 'string' || typeof r.created_at !== 'string') throw new Error('an import miss came back without its id');
    const str = (v: unknown) => (typeof v === 'string' ? v : null);
    return {
      id: r.id,
      createdAt: r.created_at,
      kind: r.kind === 'photo' ? 'photo' : 'paste',
      inputText: str(r.input_text),
      photoPath: str(r.photo_path),
      read: r.read && typeof r.read === 'object' ? (r.read as ImportMiss['read']) : null,
      corrected: Array.isArray(r.corrected) ? (r.corrected as MissWeeks) : null,
      appVersion: str(r.app_version),
      athlete: str(r.athlete) ?? 'Unknown',
      handle: str(r.handle),
      resolvedAt: str(r.resolved_at),
      resolution: str(r.resolution),
    };
  });
}

/** One row of what was read, in the corpus key's own notation ("Back Squat | 5x5 @70%"). */
export function itemLine(it: ReturnType<typeof itemOf>): string {
  const rx = it.ladder ? it.ladder.join('/') : it.failure ? `${it.sets}xF` : it.sec ? `${it.sets}x${it.sec}s` : `${it.sets}x${it.reps}${it.repsMax ? `-${it.repsMax}` : ''}`;
  const pct = it.pcts ? ` @${it.pcts.join(',')}%` : it.pct != null ? ` @${it.pct}%` : '';
  return `${it.section ? `(${it.section}) ` : ''}${it.name} | ${rx}${pct}`;
}

export function weeksLines(weeks: MissWeeks | undefined | null): string[] {
  const out: string[] = [];
  for (const w of weeks ?? []) {
    if ((weeks?.length ?? 0) > 1) out.push(`Week ${w.week}`);
    for (const d of w.days) {
      out.push(`  ${d.name}`);
      for (const it of d.items) out.push(`    ${itemLine(it)}`);
    }
  }
  return out;
}

/**
 * "Copy for Claude": everything Claude needs to work one miss — what the reader saw, what it read, what the athlete
 * changed, and the job (a reader rule + a corpus case, never a prompt guess). No account details travel in it.
 */
export function importMissForClaude(m: ImportMiss): string {
  const lines = [
    `Import miss ${m.id} (${m.kind}, ${m.createdAt.slice(0, 10)}, app ${m.appVersion ?? 'unknown'})`,
    '',
    'Work it per Docs/AI-Road-To-10-Plan-v1.0.md IM-5: add a rule to the reader (code, so every tier gets better) and add this',
    'input to the import corpus (scripts/evals/corpus/import) with its answer key, so the format stays tested. Never loosen the grader.',
    '',
    m.kind === 'photo' ? '── What the card reader read off the photo ──' : '── What they pasted ──',
    m.inputText ?? '(no text — photo only)',
    '',
    `── What the app read (via ${m.read?.via ?? '?'}) ──`,
    ...weeksLines(m.read?.weeks),
  ];
  if (m.read?.reasons?.length) lines.push('', `Why it was unsure: ${m.read.reasons.join(' ')}`);
  if (m.read?.skipped?.length) lines.push('', '── Not read as training ──', ...m.read.skipped);
  if (m.read?.checks?.length) lines.push('', '── Asked to check ──', ...m.read.checks);
  if (m.corrected) lines.push('', '── What they changed it to by hand (the right answer, as they see it) ──', ...weeksLines(m.corrected));
  if (m.photoPath) lines.push('', `Photo: import-misses/${m.photoPath} (private bucket; open it from /admin — the link lasts an hour)`);
  return lines.join('\n');
}

/** The plain words under the offer: exactly what is sent, and what is not. */
export function importMissSendsLine(kind: 'paste' | 'photo', withPhoto: boolean): string {
  const what = kind === 'paste' ? 'the text you pasted' : withPhoto ? 'your photo, the words we read off it' : 'the words we read off your photo (not the photo)';
  return `We’ll send ${what}, what we read, any changes you made, the app version and your account. Only the Forge team sees it, and it’s deleted after 90 days.`;
}
