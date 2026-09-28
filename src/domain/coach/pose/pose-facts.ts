/**
 * BODY POSE — the measured facts as they cross the wire, and the ONLY sentences they become. Plan §5.4.
 *
 * The app measures the set on the phone (`pose-measure.ts`) and sends Holt NUMBERS, not sentences: an
 * optional `pose` object on the `coach-form-check` request. The function narrows it with {@link capPose}
 * (a client is not a boundary — the posture `capFrames` states) and turns it into lines with
 * {@link poseFactLines}. There is no free-text field anywhere in the shape, so there is no channel for a
 * client to put words in Holt's prompt: every sentence below is a fixed template with a number or a
 * fixed word dropped into it, and a test runs every template through `bannedFamily()`.
 *
 * ⚠ IMPORT-FREE, AND SMALL, ON PURPOSE. The Edge Function imports this file and the deploy builder inlines
 * it into the dashboard paste copy, which refuses a module with imports of its own. The app-only half
 * (measuring, frame choice, mark snapping) lives in the other `pose/` files so the paste stays small.
 *
 * ⛔ MOVEMENT ONLY (plan §7). "Knees move inward relative to the feet on reps 4-5" is a movement. No
 * template says risk, injury, a clinical word, a verdict, or anything about the athlete's body; no body
 * measurement is ever in the shape (the torso length the app uses as a ruler is never sent).
 */

export const POSE_KINDS = ['squat', 'hinge', 'bench', 'pushup', 'press', 'pull', 'row', 'curl', 'extension', 'auto'] as const;
export type PoseFactKind = (typeof POSE_KINDS)[number];
export const POSE_VIEWS = ['side', 'front', 'behind', 'diagonal'] as const;
export type PoseView = (typeof POSE_VIEWS)[number];
/** Where in a rep a frame sits: rest before, the working extreme, halfway back, rest after. */
export const POSE_AT = ['start', 'turn', 'mid', 'end'] as const;
export type PoseAt = (typeof POSE_AT)[number];
export const POSE_DEPTHS = ['below', 'level', 'above'] as const;
export type PoseDepth = (typeof POSE_DEPTHS)[number];
type Side = 'left' | 'right';

export interface PoseTag {
  rep: number;
  at: PoseAt;
}

/**
 * What the phone measured. Every per-rep list is indexed by rep (0 = rep 1). A list of rep NUMBERS
 * (`hipsFirst`, `kneesIn`, …) is null when that fact could not be measured from this view, and `[]` when
 * it was measured and never happened — the difference between "not measurable" and "clean".
 */
export interface PoseFacts {
  kind: PoseFactKind;
  view: PoseView | null;
  /** Side view: which of the athlete's sides faces the camera. */
  side: Side | null;
  reps: number;
  /** One per frame sent, same order. */
  frames: (PoseTag | null)[];
  /** Seconds per rep: `[down, pause, up]` (the kind names them). Null on slow-motion clips (plan §9). */
  tempo: [number | null, number | null, number][] | null;
  depth: (PoseDepth | null)[] | null;
  /** Torso from vertical at the extreme, degrees, rounded to 5. */
  torso: (number | null)[] | null;
  hipsFirst: number[] | null;
  kneesIn: number[] | null;
  tilt: number[] | null;
  shift: number[] | null;
  shiftSide: Side | null;
  lockoutShort: number[] | null;
}

export const POSE_REPS_MAX = 50;

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null;

const secs = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 30 ? Math.round(v * 10) / 10 : null;

/** A list of rep numbers, narrowed into 1..reps, sorted, unique. Null unless it is an array. */
function repList(v: unknown, reps: number): number[] | null {
  if (!Array.isArray(v)) return null;
  const out = new Set<number>();
  for (const x of v) if (typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= reps) out.add(x);
  return [...out].sort((a, b) => a - b);
}

function perRep<T>(v: unknown, reps: number, one: (x: unknown) => T | null): (T | null)[] | null {
  if (!Array.isArray(v) || v.length > reps) return null;
  return v.map(one);
}

/**
 * The `pose` field, narrowed — or null, which means "send the read without it", never "refuse the read".
 * Unknown words and out-of-range numbers are dropped like every other field in `form-check.ts`.
 */
export function capPose(raw: unknown, frameCount: number): PoseFacts | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const kind = oneOf(POSE_KINDS, r.kind);
  const reps = typeof r.reps === 'number' && Number.isInteger(r.reps) ? r.reps : 0;
  if (!kind || reps < 1 || reps > POSE_REPS_MAX) return null;
  const framesIn = Array.isArray(r.frames) ? r.frames : [];
  const frames: (PoseTag | null)[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const f = framesIn[i] as { rep?: unknown; at?: unknown } | undefined;
    const at = f ? oneOf(POSE_AT, f.at) : null;
    const rep = f && typeof f.rep === 'number' && Number.isInteger(f.rep) && f.rep >= 1 && f.rep <= reps ? f.rep : 0;
    frames.push(at && rep ? { rep, at } : null);
  }
  let tempo: PoseFacts['tempo'] = null;
  if (Array.isArray(r.tempo) && r.tempo.length <= reps) {
    const rows = r.tempo.map((x) => (Array.isArray(x) && x.length === 3 && secs(x[2]) != null ? ([secs(x[0]), secs(x[1]), secs(x[2])!] as [number | null, number | null, number]) : null));
    tempo = rows.every(Boolean) ? (rows as [number | null, number | null, number][]) : null;
  }
  return {
    kind,
    view: oneOf(POSE_VIEWS, r.view),
    side: oneOf(['left', 'right'] as const, r.side),
    reps,
    frames,
    tempo,
    depth: perRep(r.depth, reps, (x) => oneOf(POSE_DEPTHS, x)),
    torso: perRep(r.torso, reps, (x) => (typeof x === 'number' && x >= 0 && x <= 90 ? Math.round(x / 5) * 5 : null)),
    hipsFirst: repList(r.hipsFirst, reps),
    kneesIn: repList(r.kneesIn, reps),
    tilt: repList(r.tilt, reps),
    shift: repList(r.shift, reps),
    shiftSide: oneOf(['left', 'right'] as const, r.shiftSide),
    lockoutShort: repList(r.lockoutShort, reps),
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The sentences — fixed templates only
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** How each kind names the four moments and its three phases. */
const KIND_WORDS: Record<PoseFactKind, { at: Record<PoseAt, string>; phase: [string, string, string]; lift: 0 | 2 }> = {
  squat: { at: { start: 'top', turn: 'bottom', mid: 'halfway up', end: 'top' }, phase: ['down', 'pause', 'up'], lift: 2 },
  hinge: { at: { start: 'top', turn: 'bottom', mid: 'halfway up', end: 'top' }, phase: ['down', 'pause', 'up'], lift: 2 },
  bench: { at: { start: 'top', turn: 'bottom', mid: 'halfway up', end: 'top' }, phase: ['down', 'pause', 'up'], lift: 2 },
  pushup: { at: { start: 'top', turn: 'bottom', mid: 'halfway up', end: 'top' }, phase: ['down', 'pause', 'up'], lift: 2 },
  press: { at: { start: 'lockout', turn: 'bottom', mid: 'halfway up', end: 'lockout' }, phase: ['down', 'pause', 'up'], lift: 2 },
  pull: { at: { start: 'hang', turn: 'top', mid: 'halfway down', end: 'hang' }, phase: ['up', 'hold', 'down'], lift: 0 },
  row: { at: { start: 'arms long', turn: 'pulled in', mid: 'halfway back', end: 'arms long' }, phase: ['pull', 'hold', 'return'], lift: 0 },
  curl: { at: { start: 'bottom', turn: 'top', mid: 'halfway down', end: 'bottom' }, phase: ['up', 'hold', 'down'], lift: 0 },
  extension: { at: { start: 'start', turn: 'lockout', mid: 'halfway back', end: 'start' }, phase: ['extend', 'hold', 'return'], lift: 0 },
  auto: { at: { start: 'start', turn: 'turnaround', mid: 'halfway back', end: 'end' }, phase: ['out', 'hold', 'back'], lift: 2 },
};

/** "rep 2", "reps 4-5", "reps 1-3 and 5", "reps 1, 3 and 5". */
export function repPhrase(reps: number[]): string {
  if (!reps.length) return '';
  const runs: string[] = [];
  for (let i = 0; i < reps.length; ) {
    let j = i;
    while (j + 1 < reps.length && reps[j + 1] === reps[j] + 1) j += 1;
    runs.push(j > i ? `${reps[i]}-${reps[j]}` : `${reps[i]}`);
    i = j + 1;
  }
  const one = reps.length === 1;
  const list = runs.length === 1 ? runs[0] : `${runs.slice(0, -1).join(', ')} and ${runs[runs.length - 1]}`;
  return `${one ? 'rep' : 'reps'} ${list}`;
}

/** "rep 1 bottom" for a frame label, or ''. */
export function poseFrameTag(p: PoseFacts | null, i: number): string {
  const f = p?.frames[i];
  return f ? `rep ${f.rep} ${KIND_WORDS[p!.kind].at[f.at]}` : '';
}

/** The first line of the block — also what the system prompt tells Holt to look for. */
export const POSE_HEADER =
  "Measured on the athlete's phone with body tracking. Trust these for positions, rep count and timing; do not contradict them.";

const DEPTH_WORDS: Record<PoseDepth, string> = {
  below: 'hip below the knee',
  level: 'hip about level with the knee',
  above: 'hip above the knee',
};

/** A per-rep fact that was measured: "on every rep" when it happened on all of them. */
const onReps = (list: number[], reps: number) => (list.length === reps && reps > 1 ? 'on every rep' : `on ${repPhrase(list)}`);

/**
 * The block Holt reads, one line per fact. Empty when there is nothing (the function then sends none).
 * Facts not measurable from this view are NAMED, so Holt does not fill the silence by eyeballing them.
 */
export function poseFactLines(p: PoseFacts | null): string[] {
  if (!p) return [];
  const w = KIND_WORDS[p.kind];
  const out = [POSE_HEADER];
  const view = p.view ? `${p.view}${p.view === 'side' && p.side ? ` (athlete's ${p.side} side toward the camera)` : ''}` : 'not clear';
  out.push(`- View: ${view}. Reps: ${p.reps}.`);

  const tags = p.frames.map((f, i) => (f ? `${i + 1} rep ${f.rep} ${w.at[f.at]}` : '')).filter(Boolean);
  if (tags.length) out.push(`- Frames: ${tags.join(' · ')}`);

  if (p.depth?.some(Boolean)) {
    const groups: string[] = [];
    for (let i = 0; i < p.depth.length; ) {
      const d = p.depth[i];
      let j = i;
      while (j + 1 < p.depth.length && p.depth[j + 1] === d) j += 1;
      if (d) groups.push(`${repPhrase(Array.from({ length: j - i + 1 }, (_, k) => i + k + 1))} ${DEPTH_WORDS[d]}`);
      i = j + 1;
    }
    out.push(`- Depth at the bottom (hip joint against the knee): ${groups.join('; ')}.`);
  }

  if (p.tempo?.length) {
    const f = (x: number | null) => (x == null ? '-' : x.toFixed(1));
    const rows = p.tempo.slice(0, 12).map((r) => `${f(r[0])} / ${f(r[1])} / ${f(r[2])}`);
    let slow = '';
    if (p.tempo.length > 1) {
      let at = -1;
      let most = -1;
      p.tempo.forEach((r, i) => {
        const v = r[w.lift];
        if (v != null && v > most) {
          most = v;
          at = i;
        }
      });
      if (at >= 0) slow = ` · rep ${at + 1} ${w.phase[w.lift]} was slowest (${most.toFixed(1)} s)`;
    }
    out.push(`- Tempo, ${w.phase.join(' / ')} (s): ${rows.join(' · ')}${slow}.`);
  }

  const torso = (p.torso ?? []).map((v, i) => ({ v, rep: i + 1 })).filter((x): x is { v: number; rep: number } => x.v != null);
  if (torso.length) {
    const a = torso[0];
    const z = torso[torso.length - 1];
    out.push(
      torso.every((x) => x.v === a.v) && torso.length > 1
        ? `- Torso at the bottom: about ${a.v}° from vertical on every rep.`
        : `- Torso at the bottom: about ${a.v}° from vertical on rep ${a.rep}${z !== a ? `, about ${z.v}° on rep ${z.rep}` : ''}.`,
    );
  }

  if (p.hipsFirst) {
    out.push(p.hipsFirst.length ? `- Out of the bottom: hips rose ahead of the shoulders ${onReps(p.hipsFirst, p.reps)}.` : '- Out of the bottom: hips and shoulders rose together on every rep.');
  }
  if (p.kneesIn) {
    out.push(p.kneesIn.length ? `- Knees: moved inward relative to the feet ${onReps(p.kneesIn, p.reps)}.` : '- Knees: stayed in line with the feet on every rep.');
  }
  if (p.tilt) {
    out.push(p.tilt.length ? `- Bar: one hand higher than the other at the top ${onReps(p.tilt, p.reps)}.` : '- Bar: hands level at the top on every rep.');
  }
  if (p.shift) {
    out.push(
      p.shift.length
        ? `- Hips: shifted toward the athlete's ${p.shiftSide ?? 'one'} side at the bottom ${onReps(p.shift, p.reps)}.`
        : '- Hips: stayed centred over the feet on every rep.',
    );
  }
  if (p.lockoutShort) {
    out.push(p.lockoutShort.length ? `- Lockout: stopped short of full lockout ${onReps(p.lockoutShort, p.reps)}.` : '- Lockout: reached full lockout on every rep.');
  }

  // What this lift would measure and this view could not.
  const wanted: [boolean, unknown, string][] = [
    [p.kind === 'squat', p.depth, 'depth'],
    [p.kind === 'squat', p.kneesIn, 'knee tracking'],
    [p.kind === 'squat' || p.kind === 'hinge', p.torso, 'torso angle'],
    [p.kind === 'press' || p.kind === 'bench', p.tilt, 'bar tilt'],
  ];
  // A rep list is measured when present at all ([] = measured, clean); a per-rep list when any rep has a value.
  const measured = (v: unknown) => Array.isArray(v) && (v.length === 0 || v.some((x) => x != null));
  const hidden = wanted.filter(([want, v]) => want && !measured(v)).map(([, , name]) => name);
  if (hidden.length) out.push(`- Not measurable from this view: ${hidden.join(', ')}.`);
  return out;
}
