/**
 * THE CHECKER — "AI rewrites, the app checks" (Holt Listens, PO D12, 2026-11-19).
 *
 * Holt is handed the running program and returns the weeks from the athlete's next session on, rewritten however they
 * asked — movements, order, supersets, sets, reps, run distance or time. Nothing he returns reaches the athlete until
 * this has gone through it. The rules are code, not examples:
 *
 *   · A trained or skipped session is never changed — whatever came back for it is ignored.
 *   · A started program keeps its session count (migration 0123 refuses anything else): a week that came back with a
 *     different number of sessions is kept as it was, and SAID. Fewer runs a week is `rest` (skip marks), not deletion.
 *   · Every movement is checked by `validateAuthored` — the visible catalogue, the athlete's kit, level, limitations and
 *     exclusions, the set cap, the session volume envelope. What fails is dropped and said, never swapped.
 *   · Running: a week may not rise more than ~10% over the ENGINE'S OWN PLAN for that week (its build, cutbacks and
 *     taper are the envelope), nor the long run, never past 22 mi, no run under a mile — over the line is pulled back
 *     and SAID. Cutting is always allowed. On a race program the final week is never rewritten.
 *   · No load: a row carries no weight field the model could fill. Loads come from the athlete's logged lifts (PO D13).
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../../program/progress-core.ts';
import { cardioKey } from '../../workout/conditioning.ts';
import type { AuthoredExercise } from '../author.ts';
import { SESSION_SET_ENVELOPE, validateAuthored, type AuthorAthlete, type Dropped } from '../author-validate.ts';
import { weeklyMuscleSets, type VolumeGroup } from '../rulebook/volume.ts';
import { GROUP_WORDS, typedOverCeiling } from '../typed-block.ts';
import type { CatalogExercise, EquipmentGate } from '../candidates.ts';
import { editableSessions } from '../edit-chat.ts';
import { canEdit, commit, materialise } from '../edit-ops.ts';

/** One row as Holt writes it. `key` is a catalogue key, or `cardio-run` / `cardio-bike` / … for a bout. */
export interface RewriteRow {
  key: string;
  part?: 'warmup' | 'main' | 'cooldown';
  sets?: number;
  reps?: number;
  repsTo?: number;
  /** A timed hold or a bout's length. */
  seconds?: number;
  /** A run's distance. */
  miles?: number;
  /** Superset letter — rows sharing one are done back to back. */
  group?: string;
  note?: string;
}
export interface RewriteDay {
  name: string;
  rows: RewriteRow[];
}
export interface Rewrite {
  /** 1-based weeks, from the athlete's next session on. Days in schedule order (training days only); `null` = unchanged. */
  weeks: { week: number; days: (RewriteDay | null)[] }[];
  /** Sessions to rest instead (skip marks), 1-based week and day. */
  rest?: { week: number; day: number }[];
}

export type CheckResult =
  | { ok: true; structure: ProgramStructure; rest: { weekIndex: number; dayIndex: number }[]; dropped: Dropped[]; said: string[] }
  | { ok: false; reason: string };

export interface CheckContext {
  athlete: AuthorAthlete;
  catalog: readonly CatalogExercise[];
  canDo: EquipmentGate;
  /** A race program: the final week is never rewritten. */
  race?: boolean;
  /** Their goal (`constraints.ts` Goal) — picks the weekly per-muscle ceilings (PB-4). None = no weekly ceiling. */
  goal?: string | null;
}

const RUN_KEY = 'cardio-run';
const MAX_LONG_RUN_MI = 22;
const isRunRow = (e: ProgramExercise) => e.kind === 'cardio' && e.activity === 'run';
const round1 = (n: number) => Math.round(n * 10) / 10;

/** A run as the logger knows it. */
function runRow(r: RewriteRow, name: string): ProgramExercise {
  return {
    catalogKey: cardioKey('run'),
    name,
    kind: 'cardio',
    activity: 'run',
    modality: 'outdoor',
    sets: 1,
    ...(r.miles != null && r.miles > 0 ? { targetMi: Math.max(1, round1(r.miles)) } : { targetSec: Math.max(600, Math.min(4 * 3600, Math.round(r.seconds ?? 1800))) }),
  };
}

const authored = (r: RewriteRow): AuthoredExercise => ({
  key: r.key,
  part: r.part ?? 'main',
  sets: r.sets ?? 3,
  reps: r.reps ?? 10,
  repsTo: r.repsTo ?? 0,
  seconds: r.seconds ?? 0,
  group: r.group ?? '',
  note: r.note ?? '',
});

/**
 * A RUN day as the plan wrote it keeps its warm-up, cool-down, stretches, each run's name, coach note and pace — Holt
 * sets only the distance or time of its runs (live run 11-19: rebuilding run days from his rows alone dropped all of
 * that, and a tempo day with a warm-up and a walk failed outright). His run rows map onto the plan's main runs in
 * order; any extra he wrote is appended as an easy run.
 */
function runDayFrom(rd: RewriteDay, before: ProgramDay): ProgramDay {
  const wanted = rd.rows.filter((r) => r.key === RUN_KEY && (r.part ?? 'main') === 'main');
  let k = 0;
  const main = before.main.map((e) => {
    if (!isRunRow(e)) return e;
    const r = wanted[k];
    k += 1;
    if (!r) return e;
    if (r.miles != null && r.miles > 0 && e.targetMi != null) return { ...e, targetMi: Math.max(1, round1(r.miles)) };
    if (r.seconds != null && r.seconds > 0 && e.targetSec != null) return { ...e, targetSec: Math.max(600, Math.min(4 * 3600, Math.round(r.seconds / 60) * 60)) };
    if (r.miles != null && r.miles > 0) return { ...e, targetMi: Math.max(1, round1(r.miles)), targetSec: null };
    return e;
  });
  for (const extra of wanted.slice(k)) main.push(runRow(extra, 'Easy Run'));
  return { ...before, main };
}

/** What the checker had to take back, so it can SAY it (re-audit 11-20: it used to measure and throw away). */
interface Trims {
  session: boolean;
  deload: boolean;
  groups: Set<VolumeGroup>;
  /** Groups still past the weekly ceiling after every row was at one set — said as a heads-up. */
  stillOver: Map<VolumeGroup, { sets: number; max: number }>;
}

const median = (xs: readonly number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** A lifting row whose sets count toward a session's volume (holds and cardio don't). */
const liftRow = (e: ProgramExercise) => e.kind !== 'cardio' && e.durationSec == null && typeof e.sets === 'number';
const liftSets = (rows: readonly ProgramExercise[]) => rows.filter(liftRow).reduce((n, e) => n + (e.sets as number), 0);

/** Takes sets off the biggest lifting rows, one at a time (never below one), until the total fits. True if it trimmed. */
function trimToTotal(rows: ProgramExercise[], max: number): boolean {
  let trimmed = false;
  for (let guard = 0; guard < 500 && liftSets(rows) > max; guard += 1) {
    let at = -1;
    for (let i = 0; i < rows.length; i += 1) {
      const e = rows[i];
      if (!liftRow(e) || (e.sets as number) <= 1) continue;
      if (at < 0 || (e.sets as number) > (rows[at].sets as number)) at = i;
    }
    if (at < 0) break;
    rows[at] = { ...rows[at], sets: (rows[at].sets as number) - 1 };
    trimmed = true;
  }
  return trimmed;
}

const BOUT = /^cardio-(bike|row|walk|elliptical|stair)$/;
/** A ride / row / walk bout as written → a cardio row (its minutes clamped 10–180). */
function boutRow(r: RewriteRow): ProgramExercise {
  const minutes = Math.max(10, Math.min(180, Math.round((r.seconds ?? 1800) / 60)));
  const activity = r.key.slice('cardio-'.length) as 'bike' | 'row' | 'walk' | 'elliptical' | 'stair';
  const easy = { bike: 'Easy Bike', row: 'Easy Row', walk: 'Brisk Walk', elliptical: 'Easy Elliptical', stair: 'Easy Stair Climb' }[activity];
  return { catalogKey: cardioKey(activity), name: easy, kind: 'cardio' as const, activity, modality: activity === 'walk' ? ('outdoor' as const) : ('indoor' as const), sets: 1, targetSec: minutes * 60 };
}

/** One rewritten session → a `ProgramDay`, or null when nothing usable came back (the session is then kept). */
function buildDay(rd: RewriteDay, before: ProgramDay, cx: CheckContext, dropped: Dropped[], trims: Trims): ProgramDay | null {
  const wasRunDay = before.main.length > 0 && before.main.every(isRunRow);
  const mainRows = rd.rows.filter((r) => (r.part ?? 'main') === 'main');
  const runs = mainRows.filter((r) => r.key === RUN_KEY);
  // A run day stays a run day when he wrote runs for it: only distances/times move.
  if (wasRunDay && runs.length && runs.length === mainRows.length) return runDayFrom(rd, before);
  // A run day he turned into a ride / row / walk (live run 11-19: "swap an easy run for a bike ride" was refused — a
  // lone cardio bout failed the LIFTING day's minimum). Its warm-up, cool-down and stretches stay the day's own.
  const bouts = mainRows.filter((r) => BOUT.test(r.key));
  if (wasRunDay && bouts.length && bouts.length === mainRows.length) {
    return { ...before, name: rd.name || before.name, main: bouts.map(boutRow) };
  }
  /* Stress run 11-19 ("15 minutes of cardio after every workout"): a run, ride, row or walk he writes on a LIFTING day,
     in any part, is that day's finisher — added after the lifts, never sent through the lifting check (where a
     cardio key is not a catalogue movement and was silently dropped, taking the change with it). */
  const allRuns = rd.rows.filter((r) => r.key === RUN_KEY);
  const finishers = rd.rows.filter((r) => BOUT.test(r.key));
  const rest = rd.rows.filter((r) => r.key !== RUN_KEY && !BOUT.test(r.key));
  if (allRuns.length && !rest.length && !finishers.length) {
    return { ...before, name: rd.name || before.name, warmup: [], main: allRuns.map((r) => runRow(r, rd.name || 'Run')), cooldown: [] };
  }
  const v = validateAuthored({ say: '', title: rd.name, unmet: [], days: [{ name: rd.name, exercises: rest.map(authored) }] }, cx.athlete, cx.catalog, cx.canDo);
  if (!v) return null;
  for (const d of v.dropped) if (!dropped.some((x) => x.name === d.name)) dropped.push(d);
  const day = v.days[0];
  /* What he did not write stays the session's own: its warm-up and cool-down, and the coach note on a movement kept. */
  const notes = new Map(before.main.filter((e) => e.catalogKey && e.coachNote).map((e) => [e.catalogKey as string, e.coachNote]));
  /* Re-audit 11-20: a rewritten session kept its movements but LOST their rest (his rows carry none). A movement the
     session had keeps its rest; a new one takes the session's usual rest (the middle value), so no row comes back bare. */
  const rests = new Map(before.main.filter((e) => e.catalogKey && e.restSec != null).map((e) => [e.catalogKey as string, e.restSec as number]));
  const usual = median(before.main.filter((e) => e.kind !== 'cardio' && e.restSec != null).map((e) => e.restSec as number));
  const main: ProgramExercise[] = day.main.map((e) => {
    const withNote = !e.coachNote && e.catalogKey && notes.has(e.catalogKey) ? { ...e, coachNote: notes.get(e.catalogKey) } : e;
    if (withNote.kind === 'cardio' || withNote.restSec != null) return withNote;
    const rest = (withNote.catalogKey ? rests.get(withNote.catalogKey) : undefined) ?? usual;
    return rest != null ? { ...withNote, restSec: rest } : withNote;
  });
  /* Re-audit 11-20: the session volume envelope is ENFORCED, not just measured — sets come off the biggest rows first. */
  if (trimToTotal(main, SESSION_SET_ENVELOPE.max)) trims.session = true;
  return {
    ...before,
    name: rd.name || before.name,
    warmup: rest.some((r) => r.part === 'warmup') ? day.warmup : before.warmup,
    main: [...main, ...allRuns.map((r) => runRow(r, 'Run')), ...finishers.map(boutRow)],
    cooldown: rest.some((r) => r.part === 'cooldown') ? day.cooldown : before.cooldown,
  };
}

export function checkRewrite(before: ProgramStructure, marks: readonly SessionMark[], rw: Rewrite, cx: CheckContext): CheckResult {
  const first = editableSessions(before, marks, 1)[0];
  if (!first) return { ok: false, reason: "Every session in this program is done — there's nothing left in it to change." };
  const weeks = Math.max(1, before.weeks);
  const lockedWeek = cx.race ? weeks - 1 : -1;
  const plans = materialise(before);
  const dropped: Dropped[] = [];
  const said: string[] = [];
  const keptWeeks: number[] = [];
  let changedFrom = Infinity;
  const trims: Trims = { session: false, deload: false, groups: new Set(), stillOver: new Map() };
  /** Every session this rewrite rebuilt: its week, the rebuilt day, and the day as the plan had it. */
  const built: { w: number; d: number; day: ProgramDay; was: ProgramDay }[] = [];

  for (const wk of rw.weeks) {
    const w = wk.week - 1;
    if (w < first.at.weekIndex || w >= weeks || w === lockedWeek) continue;
    const raw = plans[w].days;
    const sessions = trainingDays(raw);
    if (wk.days.length !== sessions.length) {
      keptWeeks.push(w + 1);
      continue;
    }
    let s = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (!trainingDays([raw[i]]).length) continue; // a rest day in the raw week
      const d = s;
      s += 1;
      if (!canEdit(marks, w, d)) continue;
      const rd = wk.days[d];
      if (!rd) continue;
      const day = buildDay(rd, raw[i], cx, dropped, trims);
      if (!day) {
        said.push(`I kept week ${w + 1}'s ${raw[i].name} as it was — what I wrote for it didn't hold up.`);
        continue;
      }
      built.push({ w, d, day, was: raw[i] });
      raw[i] = day;
      changedFrom = Math.min(changedFrom, w);
    }
  }
  if (keptWeeks.length) {
    said.push(`I kept week${keptWeeks.length > 1 ? 's' : ''} ${keptWeeks.join(', ')} as ${keptWeeks.length > 1 ? 'they were' : 'it was'}: the program you've started keeps its number of sessions. Fewer days is a rest day, not a deleted one.`);
  }

  // ── a deload stays a deload (re-audit 11-20: a per-week rewrite brought deload week back at full volume) ──
  /* The deload keeps the SAME lightness it had against the week before it: if the plan's deload was 60% of the normal
     session, it stays 60% of the normal session as rewritten (so a movement added everywhere lands in the deload too,
     at deload volume — rewrite.ts does that — but a deload written at full volume comes back down). */
  for (const b of built) {
    if (!/deload/i.test(b.was.name)) continue;
    const was = liftSets(b.was.main);
    const prevBefore = b.w > 0 ? trainingDays(plannedDays(before, b.w - 1))[b.d] : undefined;
    const prevAfter = b.w > 0 ? trainingDays(plans[b.w - 1].days)[b.d] : undefined;
    const usable = prevBefore && prevAfter && !/deload/i.test(prevBefore.name) && liftSets(prevBefore.main) > 0;
    // Grows with the normal week — by its ratio, or by the same number of sets the normal week gained ("one more set
    // on everything" adds one in the deload too) — never to the normal week's full volume on its own.
    const pb = usable ? liftSets(prevBefore!.main) : 0;
    const pa = usable ? liftSets(prevAfter!.main) : 0;
    const cap = usable ? Math.max(Math.ceil((was / pb) * pa), was + Math.max(0, pa - pb)) : was;
    if (cap > 0 && liftSets(b.day.main) > cap && trimToTotal(b.day.main, cap)) trims.deload = true;
  }

  // ── PB-4: each muscle's WEEKLY ceiling is enforced on the sessions this rewrite wrote (re-audit 11-20: a probe got
  //    144 chest sets a week through with nothing said). Floors are not: a lopsided week they asked for is theirs. ──
  if (cx.goal) {
    const byKey = new Map(cx.catalog.map((c) => [c.key, c]));
    const muscles = (key: string) => byKey.get(key) ?? null;
    for (const w of new Set(built.map((b) => b.w))) {
      const days = trainingDays(plans[w].days);
      const mine = built.filter((b) => b.w === w).map((b) => b.day);
      for (let guard = 0; guard < 500; guard += 1) {
        const over = typedOverCeiling(days, cx.goal, cx.athlete.experience, muscles).sort((a, b) => b.sets - b.max - (a.sets - a.max));
        if (!over.length) break;
        const g = over[0].group;
        let pick: { day: ProgramDay; i: number; credit: number } | null = null;
        for (const day of mine) {
          day.main.forEach((e, i) => {
            if (!liftRow(e) || (e.sets as number) <= 1 || !e.catalogKey) return;
            const m = muscles(e.catalogKey);
            if (!m) return;
            const credit = weeklyMuscleSets([{ sets: 1, primaryMuscleIds: m.primaryMuscleIds, muscleIds: m.muscleIds }])[g];
            if (credit <= 0) return;
            const better = !pick || credit > pick.credit || (credit === pick.credit && (e.sets as number) > (pick.day.main[pick.i].sets as number));
            if (better) pick = { day, i, credit };
          });
        }
        if (!pick) {
          for (const o of over) trims.stillOver.set(o.group, { sets: o.sets, max: o.max });
          break;
        }
        const p = pick as { day: ProgramDay; i: number };
        p.day.main[p.i] = { ...p.day.main[p.i], sets: (p.day.main[p.i].sets as number) - 1 };
        trims.groups.add(g);
      }
    }
  }
  if (trims.deload) said.push('I kept your deload week light — that week is there so the rest of the block works.');
  if (trims.groups.size) {
    const named = [...trims.groups].slice(0, 3).map((g) => GROUP_WORDS[g]);
    said.push(`I trimmed some sets of ${andWords(named)}: past that much in a week, most people stop recovering, and the extra work stops paying off.`);
  } else if (trims.session) {
    said.push('I trimmed a few sets so no session runs past what one workout should hold.');
  }
  if (trims.stillOver.size) {
    const [g, o] = [...trims.stillOver.entries()][0];
    said.push(`Heads up: that's still about ${Math.round(o.sets)} sets of ${GROUP_WORDS[g]} a week — past the ${o.max} most people recover from.`);
  }

  // ── running safety, week by week from the first changed week ──
  // The envelope is the ENGINE'S OWN PLAN (its build, cutback weeks and taper): a rewrite may cut freely, but a run may
  // not go more than ~10% past the same run in the plan — so the week keeps its shape (the long run stays the long run).
  // Running added where the plan had none starts small and grows ~10% a week. Never past 22 mi, never under a mile.
  let pulled = false;
  if (Number.isFinite(changedFrom)) {
    for (let w = changedFrom; w < weeks; w += 1) {
      if (w === lockedWeek) continue;
      const planned = trainingDays(plannedDays(before, w));
      const cur = trainingDays(plans[w].days);
      for (const [d, day] of cur.entries()) {
        if (!canEdit(marks, w, d)) continue;
        const plannedRuns = (planned[d]?.main ?? []).filter(isRunRow);
        let k = 0;
        for (const e of day.main) {
          if (!isRunRow(e)) continue;
          const slot = plannedRuns[k];
          k += 1;
          if (!slot) continue;
          if (e.targetMi != null && slot.targetMi != null) {
            const cap = Math.min(MAX_LONG_RUN_MI, Math.floor(slot.targetMi * 1.1 * 10) / 10);
            if (e.targetMi > cap) {
              e.targetMi = cap;
              pulled = true;
            }
          }
          if (e.targetSec != null && slot.targetSec != null) {
            const capSec = Math.floor((slot.targetSec * 1.1) / 60) * 60;
            if (e.targetSec > capSec) {
              e.targetSec = capSec;
              pulled = true;
            }
          }
        }
      }
      for (const day of cur) for (const e of day.main) if (isRunRow(e) && e.targetMi != null && e.targetMi > MAX_LONG_RUN_MI) e.targetMi = MAX_LONG_RUN_MI;
      /* ── the WEEK's running, every week (re-audit 11-20) ──
         The per-run cap above only reads runs that have a slot in the plan — an extra run he appended, or a timed run
         turned into miles, had none, and a probe took a marathon week from 18.7 to 98.7 mi. Now the whole week is held
         (a timed run counts at 10 min a mile): no more than ~10% past the plan's own week, and no more than ~10% past
         LAST week as it now stands — the ramp is anchored to the weeks before, so asking again and again can't ratchet
         it up (a probe: +56% over five asks). A week the plan had no running in starts small, as before. */
      const plannedEq = runEqOf(planned);
      const prevEq = w > 0 ? runEqOf(trainingDays(plans[w - 1].days)) : 0;
      const capWeek = plannedEq > 0 ? Math.min(plannedEq * 1.1, Math.max(plannedEq, prevEq * 1.1)) : prevEq * 1.1 + 3;
      const locked = cur.reduce((t, day, d) => t + (canEdit(marks, w, d) ? 0 : runEq(day)), 0);
      const editable = runEqOf(cur) - locked;
      if (editable > 0 && locked + editable > capWeek + 0.05) {
        /* What comes off comes off what he ADDED first — a run the plan has no slot for, the last one first, shortened
           and then taken out (never left as a sub-mile stub) — and only then the plan's own runs, back toward the plan
           (never below it: the cap is at least the plan's week). So the long run stays the long run. */
        let over = locked + editable - capWeek;
        const runsOf = (d: number) => cur[d].main.filter(isRunRow);
        const slotsOf = (d: number) => (planned[d]?.main ?? []).filter(isRunRow);
        for (let d = cur.length - 1; d >= 0 && over > 0.05; d -= 1) {
          if (!canEdit(marks, w, d)) continue;
          const extras = runsOf(d).slice(slotsOf(d).length).reverse();
          for (const e of extras) {
            if (over <= 0.05) break;
            const v = runEq({ ...cur[d], main: [e] });
            if (v - over < 1) {
              cur[d].main = cur[d].main.filter((x) => x !== e);
              over -= v;
            } else {
              if (e.targetMi != null) e.targetMi = Math.floor((e.targetMi - over) * 10) / 10;
              else if (e.targetSec != null) e.targetSec = Math.floor(((e.targetSec / 600 - over) * 600) / 60) * 60;
              over = 0;
            }
          }
        }
        for (let d = 0; d < cur.length && over > 0.05; d += 1) {
          if (!canEdit(marks, w, d)) continue;
          const slots = slotsOf(d);
          runsOf(d).slice(0, slots.length).forEach((e, k) => {
            if (over <= 0.05) return;
            const slot = slots[k];
            if (e.targetMi != null && slot.targetMi != null && e.targetMi > slot.targetMi) {
              const take = Math.min(over, e.targetMi - slot.targetMi);
              e.targetMi = Math.max(slot.targetMi, Math.floor((e.targetMi - take) * 10) / 10);
              over -= take;
            } else if (e.targetSec != null && slot.targetSec != null && e.targetSec > slot.targetSec) {
              const take = Math.min(over, (e.targetSec - slot.targetSec) / 600);
              e.targetSec = Math.max(slot.targetSec, Math.floor((e.targetSec - take * 600) / 60) * 60);
              over -= take;
            }
          });
        }
        pulled = true;
      }
    }
  }
  if (pulled) said.push('I eased a few runs back: no week goes more than about 10% past what your plan had there, and the long run the same.');

  // ── rest marks: editable sessions only, never the locked week ──
  const rest: { weekIndex: number; dayIndex: number }[] = [];
  for (const r of rw.rest ?? []) {
    const w = r.week - 1;
    const d = r.day - 1;
    if (w < 0 || w >= weeks || w === lockedWeek || !canEdit(marks, w, d)) continue;
    if (d < 0 || d >= trainingDays(plans[w].days).length) continue;
    if (!rest.some((x) => x.weekIndex === w && x.dayIndex === d)) rest.push({ weekIndex: w, dayIndex: d });
  }

  if (!Number.isFinite(changedFrom) && !rest.length) {
    return { ok: false, reason: said[0] ?? "Nothing I wrote could go in — your program is unchanged." };
  }
  const result = commit(before, plans);
  if (!result.ok) return { ok: false, reason: result.refusal.message };
  return { ok: true, structure: result.structure, rest, dropped, said };
}

/** A day's running in miles, a timed run counted at 10 minutes a mile (so time and distance share one cap). */
function runEq(d: ProgramDay): number {
  return d.main.filter(isRunRow).reduce((t, e) => t + (e.targetMi ?? (e.targetSec != null ? e.targetSec / 600 : 0)), 0);
}

function runEqOf(days: readonly ProgramDay[]): number {
  return days.reduce((t, d) => t + runEq(d), 0);
}

const andWords = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
