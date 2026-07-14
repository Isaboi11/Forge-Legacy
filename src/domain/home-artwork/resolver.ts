/**
 * Home Workout Artwork Resolver — production port of the design handoff's
 * `forge-artwork-resolver.js` (Spec v1.0). Deterministic · centralized · testable.
 *
 *   resolveHomeWorkoutArtwork({ user, workout, program, exercises }) -> ResolvedArtwork
 *
 * The consuming surface reads ONLY the returned object; it holds no classification
 * logic. Legacy & Honors are never selected (guarded in the manifest).
 *
 * Pure module: no JSON, no catalog import. It reads already-enriched exercises
 * (see catalog.ts) and the pure bridges/manifest, so Metro and `node --test`
 * consume it identically.
 *
 * Divergences from the reference JS, driven by the delivered assets + our real
 * taxonomy (documented inline):
 *  - `conditioning` artwork lives in `training_split`, not `workout_modality`
 *    (verified on disk) — the reference returned an unregistered
 *    `workout_modality:conditioning`; we route it to `training_split:conditioning`.
 *  - Every rung validates its key against the manifest before returning, so a
 *    missing/unregistered asset always fails safe to the next rung (never broken).
 *  - Exercise family/split come from the explicit taxonomy bridges, not string
 *    guessing over ad-hoc fields.
 */

import type { Program, Split, Workout, Modality } from '../training/schema';
import type { ResolveContext, ResolvedArtwork, ResolvedExercise, SexVariant } from './types';
// Explicit .ts extensions on these VALUE imports so the resolver runs under both
// Metro and `node --test` (Node ESM requires the extension; type-only imports are
// stripped and so stay extensionless). Enabled by tsconfig allowImportingTsExtensions.
import { familyOfExercise, splitFromMuscles, type ExerciseFamily } from './bridges.ts';
import { hasKey, isReserved, resolveAsset } from './manifest.ts';

// ── Sex variant (saved selection only — never inferred) ──────────────────────
// TEMPORARY: no neutral artwork exists yet; a missing/unspecified sex is served
// from the male set but still REPORTS `neutral` so it is auditable (FORGE_DELTAS §7).
const NEUTRAL_SERVED: Exclude<SexVariant, 'neutral'> = 'male';

interface SexResolution {
  variant: SexVariant;
  served: Exclude<SexVariant, 'neutral'>;
}

function resolveSexVariant(user: ResolveContext['user']): SexResolution {
  const raw = (user?.sex ?? '').toString().toLowerCase().charAt(0);
  if (raw === 'm') return { variant: 'male', served: 'male' };
  if (raw === 'f') return { variant: 'female', served: 'female' };
  return { variant: 'neutral', served: NEUTRAL_SERVED };
}

// ── Title normalization (fallback only) ──────────────────────────────────────
function normalizeTitle(title: string | undefined): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation
    .replace(/\b[a-d]\b/g, ' ') // ignore day letters A–D
    .replace(/\b\d+\b/g, ' ') // ignore numbers
    .replace(/\s+/g, ' ')
    .trim();
}

const MODALITY_TOKENS: readonly [Modality, RegExp][] = [
  ['sprinting', /\bsprint/],
  ['running', /\b(run|jog|tempo|interval run)\b/],
  ['walking', /\bwalk/],
  ['cycling', /\b(cycle|cycling|bike|spin)\b/],
  ['swimming', /\bswim/],
  ['rowing', /\b(row|erg)\b/],
  ['yoga', /\byoga\b/],
  ['mobility', /\bmobilit/],
  ['stretching', /\bstretch/],
  ['recovery', /\brecover/],
  ['conditioning', /\b(conditioning|circuit|metcon|hiit|engine|cardio|wod)\b/],
];

const SPLIT_TOKENS: readonly [Split, RegExp][] = [
  ['full_body', /\b(full body|total body|whole body|full)\b/],
  ['upper', /\bupper\b/],
  ['lower', /\blower\b/],
  ['push', /\b(push|chest|shoulder|press|pressing)\b/],
  ['pull', /\b(pull|back|lat|bicep|row)\b/],
  ['legs', /\b(legs?|leg day|quad|glute|hamstring)\b/],
  ['core', /\b(core|abs?|midsection|trunk)\b/],
  ['conditioning', /\b(conditioning|circuit|metcon|hiit)\b/],
];

function matchToken<T>(norm: string, table: readonly [T, RegExp][]): T | null {
  for (const [value, re] of table) {
    if (re.test(norm)) return value;
  }
  return null;
}

/** Where each session Modality's artwork lives. `conditioning` → training_split (on disk). */
const MODALITY_ART: Readonly<Record<Modality, { collection: 'training_split' | 'workout_modality'; key: string }>> = {
  strength: { collection: 'workout_modality', key: 'strength' },
  running: { collection: 'workout_modality', key: 'running' },
  walking: { collection: 'workout_modality', key: 'walking' },
  sprinting: { collection: 'workout_modality', key: 'sprinting' },
  cycling: { collection: 'workout_modality', key: 'cycling' },
  swimming: { collection: 'workout_modality', key: 'swimming' },
  rowing: { collection: 'workout_modality', key: 'rowing' },
  mobility: { collection: 'workout_modality', key: 'mobility' },
  stretching: { collection: 'workout_modality', key: 'stretching' },
  yoga: { collection: 'workout_modality', key: 'yoga' },
  recovery: { collection: 'workout_modality', key: 'recovery' },
  conditioning: { collection: 'training_split', key: 'conditioning' },
};

// ── Program structure ('upper_lower' | 'ppl' | 'full_body' | null) ───────────
function programStructure(program: Program | null): string | null {
  if (!program) return null;
  if (program.structure) return program.structure;
  const names = (program.schedule || []).map((d) => String(d.name || '').toLowerCase()).join(' ');
  const hasUpper = /\bupper\b/.test(names);
  const hasLower = /\blower\b/.test(names);
  if (hasUpper && hasLower) return 'upper_lower';
  if (/\bpush\b/.test(names) && /\bpull\b/.test(names) && /\bleg/.test(names)) return 'ppl';
  if (/\bfull body\b/.test(names)) return 'full_body';
  return null;
}

// ── Modality (primary session modality controls; warm-ups ignored) ───────────
function primaryModality(workout: Workout, program: Program | null): Modality {
  if (workout.modality) return workout.modality;
  const byTitle = matchToken(normalizeTitle(workout.name), MODALITY_TOKENS);
  if (byTitle) return byTitle;
  const fam = program?.family;
  if (fam === 'Running') return 'running';
  if (fam === 'Conditioning') return 'conditioning';
  if (fam === 'Mobility') return 'mobility';
  return 'strength';
}

// ── Split resolution: A structured → B muscles → C composition → D title → E program
interface SplitResult {
  key: Split;
  confidence: number;
  via: string;
}

function splitFromTitle(name: string | undefined, structure: string | null): Split | null {
  const norm = normalizeTitle(name);
  if (!norm) return null;
  const key = matchToken(norm, SPLIT_TOKENS);
  if (!key) return null;
  // Legs vs Lower: `lower` only inside an explicit upper/lower structure.
  if (key === 'legs' && structure === 'upper_lower') return 'lower';
  if (key === 'lower' && structure !== 'upper_lower') return 'legs';
  return key;
}

function splitFromProgram(program: Program | null): Split | null {
  if (!program) return null;
  if (programStructure(program) === 'full_body' || program.family === 'Full Body & Home') return 'full_body';
  return null;
}

function isMainWork(ex: ResolvedExercise): boolean {
  return ex.section === 'main' && !ex.optional;
}

function resolveSplit(workout: Workout, exercises: ResolvedExercise[], program: Program | null): SplitResult | null {
  const structure = programStructure(program);
  // A · explicit structured split
  if (workout.split && hasKey('training_split', workout.split)) {
    return { key: workout.split, confidence: 0.95, via: 'structured' };
  }
  // B · structured target muscle groups
  if (workout.targetMuscleGroups && workout.targetMuscleGroups.length) {
    const byMuscle = splitFromMuscles(workout.targetMuscleGroups, structure);
    if (byMuscle) return { key: byMuscle, confidence: 0.95, via: 'muscle-groups' };
  }
  // C · exercise composition (main work only; warm-ups/cooldowns/finishers excluded)
  const compMuscles = exercises.filter(isMainWork).flatMap((ex) => ex.primaryMuscleIds);
  if (compMuscles.length) {
    const byComp = splitFromMuscles(compMuscles, structure);
    if (byComp) return { key: byComp, confidence: 0.85, via: 'composition' };
  }
  // D · normalized title
  const byTitle = splitFromTitle(workout.name, structure);
  if (byTitle) return { key: byTitle, confidence: 0.7, via: 'title' };
  // E · program default
  const byProgram = splitFromProgram(program);
  if (byProgram) return { key: byProgram, confidence: 0.6, via: 'program' };
  return null;
}

// ── Dominant exercise family (working sets; 60% & +20pp; excl warm-up/cooldown/finisher)
function dominantFamily(exercises: ResolvedExercise[]): ExerciseFamily | null {
  const tally: Partial<Record<ExerciseFamily, number>> = {};
  let total = 0;
  for (const ex of exercises) {
    if (!isMainWork(ex)) continue;
    const fam = familyOfExercise(ex.movementPattern, ex.equipmentId);
    if (!fam) continue;
    const sets = ex.workingSets || 1;
    tally[fam] = (tally[fam] || 0) + sets;
    total += sets;
  }
  if (!total) return null;
  const ranked = (Object.keys(tally) as ExerciseFamily[])
    .map((k) => [k, (tally[k] as number) / total] as const)
    .sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const second = ranked[1];
  if (top && top[1] >= 0.6 && (!second || top[1] - second[1] >= 0.2)) return top[0];
  return null;
}

// ── Program theme (explicit metadata preferred; conservative inference) ───────
function programTheme(program: Program | null): string | null {
  if (!program) return null;
  if (program.theme && hasKey('program_theme', program.theme)) return program.theme;
  const name = String(program.name || '').toLowerCase();
  if (/powerbuilding/.test(name)) return 'powerbuilding';
  if (/hypertroph/.test(name)) return 'hypertrophy';
  if (/bodybuild/.test(name)) return 'bodybuilding';
  if (program.difficulty === 'Beginner') return 'beginner';
  if (program.family === 'Strength') return 'strength';
  if (program.family === 'Muscle Building') return 'hypertrophy';
  return null;
}

// ── Build helpers ────────────────────────────────────────────────────────────
function build(
  collection: ResolvedArtwork['collection'],
  key: string,
  sx: SexResolution,
  confidence: number,
  reason: string,
  source: string,
  assetPath: string,
): ResolvedArtwork {
  return { collection, key, sexVariant: sx.variant, confidence, reason, source, assetPath };
}

/** Build only if the key is registered + non-reserved; otherwise null (fail safe). */
function tryBuild(
  collection: string,
  key: string,
  sx: SexResolution,
  confidence: number,
  reason: string,
  source: string,
): ResolvedArtwork | null {
  if (isReserved(collection) || !hasKey(collection, key)) return null;
  const assetPath = resolveAsset(collection, key, sx.served);
  if (!assetPath) return null;
  return build(collection as ResolvedArtwork['collection'], key, sx, confidence, reason, source, assetPath);
}

/** Registered final fallback — always resolves, never broken, never random. */
const DEFAULT = { collection: 'training_split' as const, key: 'full_body' };

// ── Entry point ──────────────────────────────────────────────────────────────
export function resolveHomeWorkoutArtwork(ctx: ResolveContext): ResolvedArtwork {
  const workout = ctx.workout || ({} as Workout);
  const program = ctx.program || null;
  const exercises = ctx.exercises || [];
  const sx = resolveSexVariant(ctx.user);

  // 1 · explicit override (rejected if invalid or reserved → falls through)
  const ov = workout.artworkOverride;
  if (ov) {
    const hit = tryBuild(ov.collection, ov.key, sx, 1.0, 'Explicit valid override', 'override');
    if (hit) return hit;
  }

  // 2 · non-strength modality (primary session modality controls)
  const modality = primaryModality(workout, program);
  if (modality !== 'strength') {
    const art = MODALITY_ART[modality];
    if (art) {
      const hit = tryBuild(art.collection, art.key, sx, 0.95, 'Primary non-strength modality', 'modality');
      if (hit) return hit;
    }
  }

  const isStrength = modality === 'strength';
  if (isStrength) {
    // 3 · strength split (A structured → B muscles → C composition → D title → E program)
    const split = resolveSplit(workout, exercises, program);
    if (split) {
      const hit = tryBuild('training_split', split.key, sx, split.confidence, `Training split (${split.via})`, `split:${split.via}`);
      if (hit) return hit;
    }
    // 4 · dominant exercise family
    const fam = dominantFamily(exercises);
    if (fam) {
      const hit = tryBuild('exercise_family', fam, sx, 0.85, 'Dominant exercise family', 'family');
      if (hit) return hit;
    }
  }

  // 5 · program theme
  const theme = programTheme(program);
  if (theme) {
    const hit = tryBuild('program_theme', theme, sx, 0.6, 'Program theme fallback', 'theme');
    if (hit) return hit;
  }

  // 6 · generic fallback
  if (isStrength) {
    const hit = tryBuild('workout_modality', 'strength', sx, 0.6, 'Generic strength fallback', 'generic:strength');
    if (hit) return hit;
  }
  if (matchToken(normalizeTitle(workout.name), SPLIT_TOKENS) === 'conditioning') {
    const hit = tryBuild('training_split', 'conditioning', sx, 0.0, 'Generic mixed fallback', 'generic:mixed');
    if (hit) return hit;
  }

  // 7 · neutral default — always terminates with a registered asset
  const assetPath = resolveAsset(DEFAULT.collection, DEFAULT.key, sx.served) as string;
  return build(DEFAULT.collection, DEFAULT.key, sx, 0.0, 'Neutral default', 'default', assetPath);
}

// Exposed for tests / tooling.
export const _internals = {
  resolveSexVariant,
  normalizeTitle,
  primaryModality,
  programStructure,
  resolveSplit,
  dominantFamily,
  programTheme,
};
