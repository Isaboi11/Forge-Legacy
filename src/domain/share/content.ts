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
  /** Null when the athlete isn't known — the byline is omitted rather than invented. */
  athlete: string | null;
  /** Rank shown in the card footer when `rankInFooter`. Null when unknown. */
  rank: string | null;
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
 * ══ THERE ARE NO DEFAULT VALUES, AND THAT IS THE POINT ══
 *
 * This file used to carry a `DEMO` table — a per-kind set of card values used whenever the caller didn't
 * supply its own. It was written when nothing enqueued a ceremony in production, so the only caller was
 * the dev harness and the invented values were only ever seen by us.
 *
 * That stopped being true. Legacy enqueues a real rank-up and Goals enqueues a real achievement, and both
 * offer "Share …" — which built a card reading "Chapter III · The Rebuild", dated "May 3, 2026", signed
 * "Ada Ridge", for an athlete none of that was true of. A share card is the one artifact designed to LEAVE
 * the app, so it was also the worst possible place for it.
 *
 * A card now shows exactly what its caller passes and nothing more. `buildShareContent` already drops
 * fields whose value is empty, so an under-supplied card renders SHORTER — never wrong. Same reason
 * `athlete` and `rank` are nullable: an unknown name is an omitted byline, not "Athlete".
 */

export interface ShareOverrides {
  title?: string;
  athlete?: string;
  rank?: string;
  values?: Record<string, string>;
}

/** Assemble the ShareContent for a kind from what the caller actually knows. */
export function buildShareContent(kind: ShareKind, overrides: ShareOverrides = {}): ShareContent {
  const values = overrides.values ?? {};
  const fields = FIELDS[kind]
    .filter((f) => values[f.key] != null && values[f.key] !== '')
    .map((f) => ({ key: f.key, label: f.label, text: values[f.key], emphasis: f.emphasis }));
  return {
    kind,
    verb: VERB[kind],
    eyebrow: EYE[kind],
    // A neutral noun for the headline is a label, not a claim — unlike a value, which would be.
    title: overrides.title ?? 'Milestone',
    athlete: overrides.athlete ?? null,
    rank: overrides.rank ?? null,
    rankInFooter: RANK_FOOT[kind],
    fields,
  };
}

/** Plain-text snippet for the native share payload (Share Card Renderer output 2). */
export function shareSnippet(content: ShareContent, hiddenKeys: ReadonlySet<string>, includeName: boolean): string {
  const lines = [content.title, ...content.fields.filter((f) => !hiddenKeys.has(f.key)).map((f) => f.text)];
  // No name, no byline — "— Athlete" signs the card with a person who doesn't exist.
  if (includeName && content.athlete) {
    const rank = content.rankInFooter && content.rank ? ` · ${content.rank}` : '';
    lines.push(`— ${content.athlete}${rank}`);
  }
  lines.push('Forged in Forge Legacy.');
  return lines.join('\n');
}
