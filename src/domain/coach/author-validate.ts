/**
 * WHAT HOLT WROTE, CHECKED AGAINST THE ATHLETE IN FRONT OF HIM.
 *
 * `author.ts` lets the model write a typed session (Coach-AI-Amendment-003). This is the half that makes
 * that safe to put on a card: every movement he named is looked up in the catalogue the app shows and run
 * through the SAME gates the rulebook's own builder uses — kit (`canDo`), level (`difficultyAllows`),
 * limitations (`rulebook/limitations.ts`) and anything the athlete said to leave out. Nothing here trusts
 * the prompt to have been obeyed.
 *
 * ⚠ DROPPED, NEVER REPLACED — and never silently. A movement that fails a gate is taken out and named in
 * `dropped`, and Holt says so (`droppedLine`). Swapping in "something close" would be the code inventing
 * training nobody asked for, which is the thing this whole path exists to stop doing.
 *
 * ⚠ A MISSPELLED KEY IS NOT A MISSING MOVEMENT. Live run 2026-09-30: 6 of 94 asks lost a slot to
 * `incline-dumbbell-bench-press` (the catalogue says `dumbbell-incline-…`), `dips`, `leg-press-machine`.
 * Those are names, and a name is resolved by the app's own resolver (`resolveAgainstCatalog`) — the one an
 * athlete's typed exercise and an imported program already go through. That is reading what he wrote, not
 * choosing for him: a name the resolver cannot place is still dropped.
 *
 * ⚠ A DAY LEFT TOO THIN IS NOT SHIPPED. If the drops leave any day's main work under `MIN_DAY_MOVEMENTS`
 * the whole plan is refused (`null`) and the caller builds from the rulebook instead.
 */

import type { ProgramDay, ProgramExercise } from '@/data/programs-live';

import type { AuthoredExercise, AuthoredPlan } from './author.ts';
import { contextFrom, difficultyAllows, type CatalogExercise, type EquipmentGate } from './candidates.ts';
import { equipmentForEnvironment, type Environment, type Experience, type Limitation } from './constraints.ts';
import { MIN_DAY_MOVEMENTS } from './day.ts';
import { medicalRoute, mentionsDiscomfort } from './medical-routing.ts';
import { resolveAgainstCatalog } from '../exercise-picker/aliases.ts';
import { CARDIO_ACTIVITIES, cardioKey, type CardioActivity } from '../workout/conditioning.ts';
import {
  equipmentAfterLimitations,
  activitiesAfterLimitations,
  limitationExcludeKeys,
  limitationKeepKeys,
  limitationPatterns,
} from './rulebook/limitations.ts';

export interface AuthorAthlete {
  experience: Experience;
  environment: Environment;
  ownedEquipment: readonly string[];
  limitations: readonly Limitation[];
  excludeExercises?: readonly string[];
}

export type DropReason = 'unknown' | 'gear' | 'limit' | 'level';
export interface Dropped {
  /** The catalogue name, or the key he wrote when there is no such movement. */
  name: string;
  why: DropReason;
}

export interface ValidatedPlan {
  title: string;
  days: ProgramDay[];
  dropped: Dropped[];
}

/** What this athlete's kit resolves to once the room and the limitations have had their say. */
const ownedFor = (a: AuthorAthlete): readonly string[] =>
  equipmentAfterLimitations(equipmentForEnvironment(a.environment, a.ownedEquipment), a.limitations);

const contextFor = (a: AuthorAthlete, canDo: EquipmentGate) =>
  contextFrom({
    owned: ownedFor(a),
    canDo,
    experience: a.experience,
    limitations: a.limitations,
    limitationPatterns,
    limitationKeys: limitationExcludeKeys,
    limitationKeepKeys,
    excludeExercises: a.excludeExercises ?? [],
  });

/**
 * ══ CARDIO IS A BOUT, NOT A CATALOGUE MOVEMENT ══
 *
 * "Start with five minutes on the bike" had nowhere to go: the catalogue has no bike, treadmill or rower in
 * it (live run 2026-09-30 — he reached for an arc trainer, prescribed in reps). In this app a run or a ride
 * is a `kind: 'cardio'` row keyed `cardio:<activity>`, the shape the endurance rulebook and the logger
 * already use. So he writes `cardio-bike` with a duration, and it becomes that row.
 *
 * What each needs: a run or a walk needs nothing (outside will do); a machine needs the machine. A stair
 * climber is not something a home gym lists, so it is a full gym's. Limitations take the run exactly as
 * `LIMITATION_ACTIVITIES` says.
 */
const CARDIO_NEEDS: Record<string, readonly string[] | 'full_gym'> = {
  run: [],
  walk: [],
  bike: ['bike', 'airbike'],
  row: ['rower'],
  elliptical: ['elliptical'],
  stair: 'full_gym',
};

function cardioFor(a: AuthorAthlete, owned: readonly string[]): { can: string[]; limited: string[] } {
  const kit = Object.keys(CARDIO_NEEDS).filter((act) => {
    const needs = CARDIO_NEEDS[act];
    return needs === 'full_gym' ? a.environment === 'full_gym' : needs.length === 0 || needs.some((id) => owned.includes(id));
  });
  const can = [...activitiesAfterLimitations(kit, a.limitations)];
  return { can, limited: kit.filter((act) => !can.includes(act)) };
}

/**
 * What the model is TOLD about this athlete, worked out from the same tables that then check him.
 *
 * ⚠ AN EQUIPMENT CLASS IS TOO COARSE TO BE THE WHOLE STORY. A dip is filed under `bodyweight` and needs
 * bars; a jump rope is `cardio` and a full gym may not have one. Told only the classes, he wrote dips for
 * "no equipment at all" and the device dropped two of six movements (live run 2026-09-30). So he is given
 * the exact movements: the ones the kit allows when that is the shorter list (a home gym, bodyweight), or
 * the ones it does not when that is (a full gym). Telling him is a courtesy that saves drops —
 * `validateAuthored` is the boundary either way.
 */
export function authorFacts(
  a: AuthorAthlete,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
): { canUse: string[]; offPatterns: string[]; only: string[]; cannot: string[]; keep: string[]; avoid: string[]; cardio: string[] } {
  const ctx = contextFor(a, canDo);
  const can = pool.filter((ex) => canDo(ex, ctx.owned));
  const canUse = [...new Set(can.map((ex) => ex.equipId))].sort();
  const cannot = pool.filter((ex) => !canDo(ex, ctx.owned) && canUse.includes(ex.equipId)).map((ex) => ex.key);
  const listAllowed = can.length < pool.length / 2;
  return {
    canUse,
    offPatterns: [...ctx.excludePatterns].sort(),
    only: listAllowed ? can.map((ex) => ex.key) : [],
    cannot: listAllowed ? [] : cannot,
    keep: can.filter((ex) => ctx.excludePatterns.has(ex.pattern) && ctx.keepKeys?.has(ex.key)).map((ex) => ex.key),
    // What a limitation removes by name (a leg extension for `knees`) and what they said to leave out.
    avoid: [...ctx.excludeKeys].filter((k) => can.some((ex) => ex.key === k)),
    cardio: cardioFor(a, ctx.owned).can.map((act) => `cardio-${act}`),
  };
}

const LETTERS = 'ABCDEFG';

/**
 * Is this line of HOLT'S OWN safe to show? Stricter than the guard on an athlete's message: he is never the
 * one to bring up pain or an injury, so a line that so much as mentions discomfort is cut (the same pair of
 * checks CA2-D2 runs on a chat summary).
 */
const plain = (line: string): boolean => medicalRoute(line) === 'clear' && !mentionsDiscomfort(line);

/**
 * Adjacent movements he gave the same letter, as the block the logger already knows how to run.
 *
 * Two to four is a superset; five or more is a circuit; one on its own is just an exercise. The fields are
 * the ones `pairWithNext` (`program-draft-model.ts`) writes, so a superset Holt wrote and one the athlete
 * paired by hand are the same object. Rounds are the longest member's sets, the logger's own rule.
 */
function grouped(list: { ex: ProgramExercise; group: string }[], dayIndex: number): ProgramExercise[] {
  const out: ProgramExercise[] = [];
  for (let i = 0; i < list.length; ) {
    let j = i + 1;
    while (list[i].group && j < list.length && list[j].group === list[i].group) j += 1;
    const block = list.slice(i, j).map((x) => x.ex);
    if (block.length < 2) out.push(...block);
    else {
      const circuit = block.length > 4;
      const rounds = Math.max(...block.map((e) => e.sets ?? 1));
      for (const e of block) {
        out.push({
          ...e,
          groupId: `holt-${dayIndex}-${i}`,
          groupKind: circuit ? 'circuit' : 'superset',
          groupName: circuit ? 'Circuit' : 'Superset',
          groupRounds: rounds,
          groupCapSec: null,
        });
      }
    }
    i = j;
  }
  return out;
}

export function validateAuthored(
  plan: AuthoredPlan,
  a: AuthorAthlete,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
): ValidatedPlan | null {
  const ctx = contextFor(a, canDo);
  const byKey = new Map(pool.map((ex) => [ex.key, ex]));
  const catalog = pool.map((ex) => ({ key: ex.key, name: ex.name, aliases: ex.aliases ? [...ex.aliases] : undefined }));
  const dropped: Dropped[] = [];
  const drop = (name: string, why: DropReason) => {
    if (!dropped.some((d) => d.name === name)) dropped.push({ name, why });
  };

  const find = (key: string): CatalogExercise | undefined => {
    const exact = byKey.get(key);
    if (exact) return exact;
    const named = resolveAgainstCatalog(key.replace(/-/g, ' '), catalog);
    return named ? byKey.get(named.key) : undefined;
  };

  const days: ProgramDay[] = [];
  for (const [i, day] of plan.days.entries()) {
    const parts: Record<AuthoredExercise['part'], { ex: ProgramExercise; group: string }[]> = { warmup: [], main: [], cooldown: [] };
    const used = new Set<string>();
    for (const e of day.exercises) {
      const bout = /^cardio-([a-z]+)$/.exec(e.key)?.[1];
      if (bout) {
        const activity = CARDIO_ACTIVITIES.find((c) => c.key === bout);
        const { can, limited } = cardioFor(a, ctx.owned);
        if (!activity || !(bout in CARDIO_NEEDS)) drop(`cardio ${bout}`, 'unknown');
        else if (limited.includes(bout)) drop(activity.name, 'limit');
        else if (!can.includes(bout)) drop(activity.name, 'gear');
        else if (!used.has(e.key)) {
          used.add(e.key);
          const row = {
            catalogKey: cardioKey(bout as CardioActivity),
            name: activity.name,
            kind: 'cardio',
            activity: bout,
            modality: 'indoor',
            sets: 1,
            targetSec: e.seconds >= 60 && e.seconds <= 3600 ? e.seconds : 600,
          } as ProgramExercise;
          (parts[e.part] ?? parts.main).push({ ex: row, group: '' });
        }
        continue;
      }
      const ex = find(e.key);
      if (!ex) {
        drop(e.key.replace(/-/g, ' '), 'unknown');
        continue;
      }
      if (used.has(ex.key)) continue;
      // `keepKeys` re-admits a movement whose pattern is banned; `excludeKeys` always wins (see `contextFrom`).
      if ((ctx.excludePatterns.has(ex.pattern) && !ctx.keepKeys?.has(ex.key)) || ctx.excludeKeys.has(ex.key)) {
        drop(ex.name, 'limit');
        continue;
      }
      if (!canDo(ex, ctx.owned)) {
        drop(ex.name, 'gear');
        continue;
      }
      if (!difficultyAllows(ex, a.experience, true)) {
        drop(ex.name, 'level');
        continue;
      }
      used.add(ex.key);

      const sets = e.sets >= 1 && e.sets <= 8 ? e.sets : 3;
      // A cue is Holt talking. Anything that reads as medical is cut, exactly as a saved note would be.
      const note = e.note && plain(e.note) ? { coachNote: e.note } : {};
      let row: ProgramExercise;
      if (ex.unit === 'time') {
        // A hold is held, never counted — the rulebook's rule (`prescribeTimed`), kept when he forgets it.
        row = { catalogKey: ex.key, name: ex.name, sets, durationSec: e.seconds >= 5 && e.seconds <= 3600 ? e.seconds : 30, ...note };
      } else {
        const reps = e.reps >= 1 && e.reps <= 50 ? e.reps : 10;
        const top = e.repsTo > reps && e.repsTo <= 50 ? { repsMax: e.repsTo } : {};
        row = { catalogKey: ex.key, name: ex.name, sets, reps, ...top, ...note };
      }
      (parts[e.part] ?? parts.main).push({ ex: row, group: e.group ?? '' });
    }
    if (parts.main.length < MIN_DAY_MOVEMENTS) return null;
    days.push({
      letter: LETTERS[i] ?? String(i + 1),
      name: day.name || (plan.days.length === 1 ? plan.title : '') || `Day ${i + 1}`,
      // A block never spans sections: the logger resolves one by walking adjacent rows of a single list.
      warmup: grouped(parts.warmup, i),
      main: grouped(parts.main, i),
      cooldown: grouped(parts.cooldown, i),
    });
  }
  if (!days.length) return null;
  return { title: plan.title || days[0].name, days, dropped };
}

const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const WHY: Record<DropReason, (names: string, many: boolean) => string> = {
  unknown: (n, many) => `I left out ${n}: ${many ? "they aren't" : "it isn't"} in the exercise library.`,
  gear: (n, many) => `I left out ${n}: you can't do ${many ? 'them' : 'it'} with the kit you have.`,
  limit: (n) => `I left out ${n} because of what you told me to work around.`,
  level: (n, many) => `I left out ${n}: ${many ? "they're" : "it's"} a step past where you are right now.`,
};

/** What came out and why, in his voice. Null when nothing did. */
export function droppedLine(dropped: readonly Dropped[]): string | null {
  const lines: string[] = [];
  for (const why of ['limit', 'gear', 'level', 'unknown'] as DropReason[]) {
    const names = dropped.filter((d) => d.why === why).map((d) => d.name);
    if (names.length) lines.push(WHY[why](listed(names), names.length > 1));
  }
  return lines.length ? lines.join(' ') : null;
}

/** He is told to write for the athlete. When he writes about the app's insides instead, the line is not shown. */
const INTERNAL =
  /\b(catalog(ue)?|schema|json|mismatch|excluded|equipment list|the app requested|cardio-[a-z]+|vertical push|horizontal push|hip dominant|knee dominant|elbow (flexion|extension))\b|\bkeys?\b[^.]*\b(library|exact|match\w*|list)\b|\bsections?\b[^.]*\b(off|excluded|banned|limits?)\b/i;

/**
 * The line above the card.
 *
 * His own sentence stands only when the card is exactly what he wrote. Once anything was dropped, that
 * sentence may describe a movement that is no longer there — so it is replaced by a plain one, and the drop
 * is said instead. What he could not do (`unmet`) is said, unless it talks about the app's internals.
 */
export function authoredLine(plan: AuthoredPlan, v: ValidatedPlan): string {
  const own = plan.say && plain(plan.say) && !INTERNAL.test(plan.say) ? plan.say : '';
  const lead = v.dropped.length || !own ? "Here's what I wrote for that." : own;
  /* What he could not do is said once. Live run 2026-09-30: asked for an overhead press he had to leave out,
     he said so in his sentence and again, word for word, in `unmet`. */
  const said = lead.toLowerCase();
  const unmet = plan.unmet
    .filter((u) => plain(u) && !INTERNAL.test(u))
    .map((u) => u.replace(/[.\s]+$/, ''))
    .filter((u) => u && !said.includes(u.toLowerCase().slice(0, 32)));
  return [lead, droppedLine(v.dropped), unmet.length ? `What I couldn't do: ${unmet.join('; ')}.` : null].filter(Boolean).join(' ');
}
