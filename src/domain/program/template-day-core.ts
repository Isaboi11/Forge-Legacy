import { activityFromKey, cardioKey, deriveEquip, deriveName } from '../workout/conditioning.ts';
import type { ProgramExercise } from '@/data/programs-live';
import type { TemplateExercise } from '@/data/templates-live';

/**
 * A workout template's rows → a program day's three sections.
 *
 * ── WHY THIS CONVERSION EXISTS AT ALL ────────────────────────────────────────────────────────────
 *
 * Templates and program days hold the same idea in two different shapes, because they were built for
 * two different jobs. A template is a FLAT list carrying `sets` / `targetReps` and a `section` tag on
 * each row. A program day is THREE lists — warm-up, main, cool-down — carrying `sets` / `reps` plus the
 * prescription vocabulary a program has and a template does not (ladders, percentages, AMRAP caps).
 *
 * Crossing in THIS direction is lossless and the other would not be: everything a template can say, a
 * program day can say. That asymmetry is why the Day Builder can take a template and why there is no
 * "save this program day as a template" beside it.
 *
 * ── SPLIT FROM `template-day.ts`, FOR THE USUAL REASON ───────────────────────────────────────────
 *
 * The catalogue lookup is INJECTED rather than imported, so `node --test` can load this file: a test
 * that imported the wired module would fail on resolving `@/domain/exercise-picker/data` rather than on
 * anything it was checking. Same split `catalog-core`/`catalog` and `starter-templates/core`/`index`
 * make, for the same reason. `template-day.ts` binds the real catalogue to it.
 *
 * ── WHAT IS LOOKED UP RATHER THAN CARRIED ────────────────────────────────────────────────────────
 *
 * `equip` and `muscles` are not on a template row — they were never stored there, because a template's
 * consumers (the logger, W-27) read them off the catalogue by key when they need them. The builder
 * needs them at rest: `EquipIcon` draws from `equip`, and the day-row subtitle ("Chest & Arms · 6
 * exercises") is inferred from `muscles`. Resolving them here is what makes a day built from a template
 * indistinguishable from one built by picking the same six lifts by hand.
 *
 * A CUSTOM exercise has no catalogue row and correctly resolves to neither. It keeps its name, which is
 * the only thing anyone ever knew about it.
 */

export interface DaySections {
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  cooldown: ProgramExercise[];
}

/** What the conversion needs from the exercise catalogue, and nothing more. */
export interface CatalogFacts {
  equip?: string;
  muscles?: string[];
  cat?: string;
}
export type CatalogLookup = (key: string) => CatalogFacts | undefined;

/**
 * One template row → one program exercise.
 *
 * A CARDIO ROW CROSSES AS A CARDIO BLOCK, not as sets of a run. 29 of the 81 Forge sessions end in one,
 * and the flat path would have turned "1 mile easy" into three sets of eight of it. Its name and
 * equipment are DERIVED from activity + modality rather than copied, matching how the builder's own
 * modality toggle keeps them in step — a row that says "Treadmill Run" and then gets switched outdoors
 * must stop saying treadmill.
 *
 * A template carries `targetMi` AND `targetDurationSec`; it stores no pace or speed, so those two arrive
 * `null` — an OPEN target, which is the honest reading: the template prescribed no pace, and a 0 would
 * read as a target permanently and absurdly met.
 *
 * ⚠ THE DURATION USED TO BE DROPPED HERE. Only `targetMi` crossed, so a template prescribing "run for 20
 * minutes" became a run of no stated length the moment it was used as a program day — the field was
 * written on save, stored, read back, and then silently discarded one step before anyone could see it.
 */
function toProgramExercise(e: TemplateExercise, lookup: CatalogLookup): ProgramExercise {
  const group = e.groupId
    ? {
        groupId: e.groupId,
        ...(e.groupName ? { groupName: e.groupName } : null),
        groupKind: (e.groupKind ?? 'circuit') as 'superset' | 'circuit',
        ...(e.groupRounds != null ? { groupRounds: e.groupRounds } : null),
      }
    : null;

  const activity = activityFromKey(e.catalogKey);
  if (e.kind === 'cardio' && activity) {
    const modality = e.modality === 'indoor' ? 'indoor' : 'outdoor';
    return {
      catalogKey: cardioKey(activity),
      name: deriveName(activity, modality),
      equip: deriveEquip(activity, modality),
      kind: 'cardio',
      activity,
      modality,
      targetMi: e.targetMi ?? null,
      targetSec: e.targetDurationSec ?? null,
      targetPaceSec: null,
      targetSpdMph: null,
      ...group,
    };
  }

  const rec = e.catalogKey ? lookup(e.catalogKey) : undefined;
  return {
    ...(e.catalogKey ? { catalogKey: e.catalogKey } : null),
    name: e.name,
    ...(rec?.equip ? { equip: rec.equip } : null),
    muscles: rec?.muscles ?? [],
    ...(rec?.cat ? { type: rec.cat } : null),
    sets: Math.max(1, e.sets),
    reps: Math.max(1, e.targetReps),
    ...group,
  };
}

/**
 * Split a template's rows into the day's three sections, preserving authored order within each.
 *
 * A row with no `section` reads as `main` — the same reading `templates-live` takes for every template
 * saved before 0095, which is the migration the field arrived in.
 */
export function templateRowsToDayWith(rows: readonly TemplateExercise[], lookup: CatalogLookup): DaySections {
  const out: DaySections = { warmup: [], main: [], cooldown: [] };
  for (const row of rows) {
    const section = row.section === 'warmup' || row.section === 'cooldown' ? row.section : 'main';
    out[section].push(toProgramExercise(row, lookup));
  }
  return out;
}

/** "6 lifts · 2 warm-up · 1 cool-down" — what a chooser row says a template will put in the day. */
export function daySectionsSummary(d: DaySections): string {
  const parts: string[] = [`${d.main.length} ${d.main.length === 1 ? 'lift' : 'lifts'}`];
  if (d.warmup.length) parts.push(`${d.warmup.length} warm-up`);
  if (d.cooldown.length) parts.push(`${d.cooldown.length} cool-down`);
  return parts.join(' · ');
}
