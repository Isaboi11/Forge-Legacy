/**
 * A posted workout, as words a member reads before taking it (PO 2026-09-27, Squatober): "click on it, look at it,
 * and put it in the queue". Every lift, how many sets, the reps and percentage of each, THEIR weight from THEIR
 * max, the rest, and how a superset runs.
 *
 * Pure and relative-imported — the preview is where a wrong number would first be believed, so it is tested.
 */

import { resolveLoad, type LoadContext } from '../program/percent-max.ts';
import type { TemplatePrescription } from './template-prescription.ts';

/** The row fields the preview reads. Structural, so the app's `TemplateExercise` satisfies it. */
export interface PostedRow extends TemplatePrescription {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
  groupId?: string | null;
  groupKind?: 'superset' | 'circuit' | null;
  coachNote?: string | null;
  targetDurationSec?: number | null;
  section?: 'warmup' | 'main' | 'cooldown';
}

export interface SetLine {
  /** "Set 2" */
  label: string;
  /** "6 reps · 67% · 210 lb" / "6 reps · 67%" (no max yet) / "30s" */
  text: string;
}

export interface LiftLine {
  /** "1", "3a", "3b" — the numbering a coach's card uses. */
  label: string;
  name: string;
  catalogKey: string | null;
  /** One line: "5 sets · 4-6-8-6-4 reps · 67%" / "4 × 5" / "5 sets · 5-4-3-2-1 · 65-92%". */
  summary: string;
  /** Per-set detail — only when the sets differ from each other, or carry a weight to show. */
  sets: SetLine[];
  /** "Rest 2:00 between sets" — or, for a superset's last member, the round's rest. Null when none. */
  rest: string | null;
  note: string | null;
  /** First member of a superset: the line explaining how to run it. */
  superset: string | null;
}

/** 90 → "1:30"; 20 → "0:20"; 150 → "2:30". */
export function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const range = (xs: number[]): string => {
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
};

/** The reps each set asks for — the scheme, or the one count repeated; 0 = no count ("100 reps total", a carry). */
function repsOf(r: PostedRow): number[] {
  const n = Math.max(1, r.repScheme?.length || r.sets || 1);
  return r.repScheme?.length ? r.repScheme : Array.from({ length: n }, () => r.targetReps);
}

function pctsOf(r: PostedRow, n: number): (number | null)[] {
  if (r.percentScheme?.length) return Array.from({ length: n }, (_, i) => r.percentScheme![i] ?? null);
  return Array.from({ length: n }, () => r.percentOfMax ?? null);
}

function restsOf(r: PostedRow, n: number): (number | null)[] {
  return Array.from({ length: n }, (_, i) => r.restScheme?.[i] ?? r.restSec ?? null);
}

/**
 * The lines to draw. `load` is the reader's own maxes in their display unit (`loadContextFor`); without one, a
 * percentage stays a percentage — never a made-up weight.
 */
export function postedLines(rows: readonly PostedRow[], load?: LoadContext, maxNames: Record<string, string> = {}): LiftLine[] {
  const out: LiftLine[] = [];
  let n = 0;
  let letter = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const inGroup = !!r.groupId;
    const startsGroup = inGroup && prev?.groupId !== r.groupId;
    const endsGroup = inGroup && next?.groupId !== r.groupId;
    /* Warm-up sets ("5 @ 60%, 3 @ 70%, 2 @ 75%" before lift 1) are not lift 1 — the card's numbering starts after them. */
    const warm = r.section === 'warmup';
    if (!warm && (!inGroup || startsGroup)) {
      n += 1;
      letter = 0;
    }
    const label = warm ? 'Warm-up' : inGroup ? `${n}${String.fromCharCode(97 + letter++)}` : `${n}`;

    const reps = repsOf(r);
    const count = reps.length;
    const pcts = pctsOf(r, count);
    const rests = restsOf(r, count);
    const maxKey = pcts.some((p) => p != null) ? (r.percentOf ?? r.catalogKey) : null;
    const max = maxKey && load ? load.maxes[maxKey] : undefined;
    const weightOf = (p: number | null) => (p != null && load ? resolveLoad(max ?? null, p, load.rules)?.weight ?? null : null);

    const timed = r.targetDurationSec != null;
    const repText = (x: number) => (timed ? `${r.targetDurationSec}s` : x > 0 ? `${x}${r.repsMax && !r.repScheme?.length ? `-${r.repsMax}` : ''} ${x === 1 && !r.repsMax ? 'rep' : 'reps'}` : '');

    /* The one-line summary. */
    const parts: string[] = [];
    const sameReps = reps.every((x) => x === reps[0]);
    const pctList = pcts.filter((p): p is number => p != null);
    const samePct = pctList.length === 0 || pctList.every((p) => p === pctList[0]);
    if (sameReps && !timed && reps[0] > 0) parts.push(`${count} × ${reps[0]}${r.repsMax && !r.repScheme?.length ? `-${r.repsMax}` : ''}`);
    else parts.push(`${count} ${count === 1 ? 'set' : 'sets'}`);
    if (!sameReps) parts.push(`${reps.join('-')} reps`);
    if (timed) parts.push(`${r.targetDurationSec}s`);
    if (pctList.length) {
      const of = r.percentOf && r.percentOf !== r.catalogKey ? ` of ${maxNames[r.percentOf] ?? 'max'}` : '';
      parts.push(`${samePct ? pctList[0] : range(pctList)}%${of}`);
    }
    if (samePct && pctList.length) {
      const w = weightOf(pctList[0]);
      if (w != null) parts.push(`${w} ${load!.unit}`);
    }

    /* Per-set lines — when the sets differ, or when a ramp's weights are worth seeing one by one. */
    const sameRest = rests.every((x) => x === rests[0]);
    const detail = !sameReps || !samePct || !sameRest;
    const sets: SetLine[] = detail
      ? reps.map((x, k) => {
          const bits = [repText(x)].filter(Boolean);
          if (pcts[k] != null) bits.push(`${pcts[k]}%`);
          const w = weightOf(pcts[k]);
          if (w != null) bits.push(`${w} ${load!.unit}`);
          if (!sameRest && rests[k] != null) bits.push(`rest ${clock(rests[k]!)}`);
          return { label: `Set ${k + 1}`, text: bits.join(' · ') };
        })
      : [];

    /* Rest: a superset rests after the ROUND, so the line sits on its last member. */
    let rest: string | null = null;
    if (sameRest && rests[0] != null) {
      if (!inGroup) rest = `Rest ${clock(rests[0])} between sets`;
      else if (endsGroup) rest = `Rest ${clock(rests[0])} after each round`;
    }

    let superset: string | null = null;
    if (startsGroup) {
      const members: string[] = [];
      for (let k = i, l = 0; k < rows.length && rows[k].groupId === r.groupId; k++, l++) members.push(`${n}${String.fromCharCode(97 + l)}`);
      const kind = r.groupKind === 'circuit' ? 'Circuit' : 'Superset';
      superset = `${kind}: do ${members.join(', then ')} back to back, then rest.`;
    }

    out.push({
      label,
      name: r.name,
      catalogKey: r.catalogKey,
      summary: parts.join(' · '),
      sets,
      rest,
      note: r.coachNote ?? null,
      superset,
    });
  }
  return out;
}

/** "5 lifts · 23 sets" — the feed card's line. */
export function postedTally(rows: readonly PostedRow[]): string {
  const lifts = rows.length;
  const sets = rows.reduce((t, r) => t + Math.max(1, r.repScheme?.length || r.sets || 1), 0);
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}

/** Does anything here go off a max? The preview then says whose max it used — or asks for one. */
export function usesMaxes(rows: readonly PostedRow[]): boolean {
  return rows.some((r) => r.percentOfMax != null || !!r.percentScheme?.some((p) => p != null));
}
