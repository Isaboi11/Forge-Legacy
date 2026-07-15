/**
 * Share content model (SH-1 Share Configuration + Share Card Renderer).
 *
 * SH-1 does not decide WHAT may be shared — the athlete already tapped a "Share" action;
 * SH-1 shows the card and controls the variables. This module holds the per-kind card
 * config (eyebrow / verb / fields / footer) and assembles the in-progress `ShareContent`
 * the card renderer + text snippet read. Real renderer; PLACEHOLDER content (no share
 * backend — demo defaults, and the athlete name from the placeholder profile).
 *
 * Sources: Share-Configuration-Step-Wireframe-Spec-SH1, Share-Card-Renderer-Architecture,
 * and the handoff "Forge Share Configuration.dc.html" (FIELDS / EYE / VERB / RANK_FOOT).
 */

/** The card kinds. The four ceremony share-types map here: RANK_UP→rank, HONOR_EARNED→honor, GOAL_ACHIEVED→goal, PROGRAM_GRADUATED→program. */
export type ShareKind =
  | 'accomplishment'
  | 'honor'
  | 'goal'
  | 'pr'
  | 'chapter'
  | 'rank'
  | 'program'
  | 'transformation'
  | 'workout';

/** Emphasis controls how a card line reads (value = mono figure, bronze = accent, body = prose, muted = meta). */
export type FieldEmphasis = 'value' | 'bronze' | 'body' | 'muted';

export interface ShareField {
  key: string;
  label: string;
  text: string;
  emphasis: FieldEmphasis;
}

export interface ShareContent {
  kind: ShareKind;
  /** Sheet title, e.g. "Share Honor". */
  verb: string;
  /** Small uppercase card label, e.g. "Honor Earned". */
  eyebrow: string;
  title: string;
  athlete: string;
  /** Rank shown in the card footer when `rankInFooter`. */
  rank: string;
  rankInFooter: boolean;
  fields: ShareField[];
}

const VERB: Record<ShareKind, string> = {
  accomplishment: 'Share Accomplishment',
  honor: 'Share Honor',
  goal: 'Share Achievement',
  pr: 'Share PR',
  chapter: 'Share Chapter',
  rank: 'Share Rank',
  program: 'Share Program',
  transformation: 'Share Transformation',
  workout: 'Share Workout',
};

const EYE: Record<ShareKind, string> = {
  accomplishment: 'Accomplishment',
  honor: 'Honor Earned',
  goal: 'Goal Achieved',
  pr: 'Personal Record',
  chapter: 'Chapter Sealed',
  rank: 'Rank Ascended',
  program: 'Program',
  transformation: 'Transformation',
  workout: 'Workout Complete',
};

/** Whether the card footer appends the athlete's rank (dc RANK_FOOT). */
const RANK_FOOT: Record<ShareKind, boolean> = {
  accomplishment: true,
  pr: true,
  honor: false,
  goal: false,
  chapter: false,
  rank: false,
  program: false,
  transformation: false,
  workout: true,
};

interface FieldDef {
  key: string;
  label: string;
  emphasis: FieldEmphasis;
}

/** Possible card fields per kind, in card order (dc FIELDS). A field renders only when supplied. */
const FIELDS: Record<ShareKind, FieldDef[]> = {
  accomplishment: [
    { key: 'value', label: 'Value', emphasis: 'value' },
    { key: 'chapter', label: 'Chapter', emphasis: 'bronze' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  honor: [
    { key: 'citation', label: 'Citation', emphasis: 'body' },
    { key: 'chapter', label: 'Chapter', emphasis: 'bronze' },
    { key: 'date', label: 'Date earned', emphasis: 'muted' },
  ],
  goal: [
    { key: 'chapter', label: 'Chapter', emphasis: 'bronze' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  pr: [
    { key: 'prev', label: 'Previous PR', emphasis: 'muted' },
    { key: 'neu', label: 'New PR', emphasis: 'value' },
    { key: 'improve', label: 'Improvement', emphasis: 'bronze' },
    { key: 'chapter', label: 'Chapter', emphasis: 'bronze' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  chapter: [
    { key: 'stats', label: 'Stats', emphasis: 'bronze' },
    { key: 'reflection', label: 'Reflection', emphasis: 'body' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  rank: [
    { key: 'current', label: 'New rank', emphasis: 'bronze' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  program: [
    { key: 'status', label: 'Completion', emphasis: 'value' },
    { key: 'reflection', label: 'Reflection', emphasis: 'body' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  transformation: [
    { key: 'chapter', label: 'Chapter', emphasis: 'bronze' },
    { key: 'reflection', label: 'Reflection', emphasis: 'body' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
  workout: [
    { key: 'summary', label: 'Summary', emphasis: 'bronze' },
    { key: 'date', label: 'Date', emphasis: 'muted' },
  ],
};

/**
 * Demo card content per kind — PLACEHOLDER, used because there is no share backend. The
 * real SH-1 assembles this from the source entity (session, honor, goal, rank event).
 */
const DEMO: Partial<Record<ShareKind, { title: string; values: Record<string, string> }>> = {
  accomplishment: { title: '315 lb Barbell Bench Press', values: { value: '315 lb', chapter: 'Chapter III · The Rebuild', date: 'May 3, 2026' } },
  honor: { title: 'The Unbroken', values: { citation: '30 sessions · no missed week', chapter: 'Chapter III · The Rebuild', date: 'Apr 2, 2026' } },
  goal: { title: 'Squat 315 lbs', values: { chapter: 'Chapter III · The Rebuild', date: 'May 3, 2026' } },
  pr: { title: 'Back Squat', values: { prev: 'Was 385 lb × 3', neu: '405 lb × 3', improve: '+20 lb' } },
  chapter: { title: 'Ironborn', values: { stats: '48 workouts · 14 weeks', date: 'Mar 1, 2026' } },
  rank: { title: 'Foundation · III', values: { current: 'Foundation tier · III', date: 'Jun 14, 2026' } },
  program: { title: 'Strength Foundation I', values: { status: 'Completed · 18 of 18', date: 'Jun 12, 2026' } },
};

export interface ShareOverrides {
  title?: string;
  athlete?: string;
  rank?: string;
  values?: Record<string, string>;
}

/** Assemble the in-progress ShareContent for a kind, from demo defaults + any overrides. */
export function buildShareContent(kind: ShareKind, overrides: ShareOverrides = {}): ShareContent {
  const demo = DEMO[kind];
  const values = { ...(demo?.values ?? {}), ...(overrides.values ?? {}) };
  const fields = FIELDS[kind]
    .filter((f) => values[f.key] != null && values[f.key] !== '')
    .map((f) => ({ key: f.key, label: f.label, text: values[f.key], emphasis: f.emphasis }));
  return {
    kind,
    verb: VERB[kind],
    eyebrow: EYE[kind],
    title: overrides.title ?? demo?.title ?? 'Milestone',
    athlete: overrides.athlete ?? 'Athlete',
    rank: overrides.rank ?? 'Foundation · III',
    rankInFooter: RANK_FOOT[kind],
    fields,
  };
}

/** Plain-text snippet for the native share payload (Share Card Renderer output 2). */
export function shareSnippet(content: ShareContent, hiddenKeys: ReadonlySet<string>, includeName: boolean): string {
  const lines = [content.title, ...content.fields.filter((f) => !hiddenKeys.has(f.key)).map((f) => f.text)];
  if (includeName) lines.push(`— ${content.athlete}${content.rankInFooter ? ` · ${content.rank}` : ''}`);
  lines.push('Forged in Forge Legacy.');
  return lines.join('\n');
}
