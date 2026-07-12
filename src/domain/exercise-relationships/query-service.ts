/**
 * ExerciseRelationshipService — typed, app-facing query layer over the generated
 * relationship graph. This is the single integration point for the features that
 * consume relationships:
 *
 *   • W-23 Exercise Picker — "Suggested Substitutes" (REPLACEMENT context)
 *   • W-22 Exercise Detail — ALTERNATIVES section (+ post-MVP REGRESSIONS row)
 *   • W-9  Active Workout  — "Replace Exercise" substitution flow (Exercise-002)
 *   • Program Builder      — alternative/progression suggestions
 *
 * It does NOT re-implement scoring — that lives in engine.mjs (build-time). This
 * class only reads the pre-computed, deterministic graph and projects it onto the
 * three relationship arrays defined in Exercise-Library-Architecture-v1.0 (EL-D12):
 *   alternativeExerciseIds ← {Substitute, Equipment Alternative, Variation} (bidirectional)
 *   regressionExerciseIds  ← {Regression} (directional)
 *   progressionExerciseIds ← {Progression} (directional)
 *
 * Per Exercise-002, progressions are excluded from all MVP substitution surfaces.
 */

import type {
  ExerciseRelationship,
  RelationshipType,
  ExerciseRelationshipArrays,
} from './schema';
import relationships from './exercise_relationships.json';
import exercises from './source/exercises.json';
import equipment from './source/equipment.json';

const ALTERNATIVE_TYPES: ReadonlySet<RelationshipType> = new Set([
  'Substitute',
  'Equipment Alternative',
  'Variation',
]);

interface ExerciseLite {
  id: string;
  equipmentId: string;
  movementPattern: string;
  modality: string | null;
}
interface EquipmentLite {
  id: string;
  environments: string[];
  portable: boolean;
}

export class ExerciseRelationshipService {
  private readonly edges: ExerciseRelationship[];
  private readonly bySource = new Map<string, ExerciseRelationship[]>();
  private readonly altInByTarget = new Map<string, ExerciseRelationship[]>();
  private readonly exerciseById = new Map<string, ExerciseLite>();
  private readonly equipmentById = new Map<string, EquipmentLite>();

  constructor(
    edges: ExerciseRelationship[] = relationships as ExerciseRelationship[],
    catalog: ExerciseLite[] = exercises as ExerciseLite[],
    equip: EquipmentLite[] = equipment as EquipmentLite[],
  ) {
    this.edges = edges;
    for (const e of catalog) this.exerciseById.set(e.id, e);
    for (const q of equip) this.equipmentById.set(q.id, q);
    for (const e of edges) {
      (this.bySource.get(e.sourceExerciseId) ?? this.bySource.set(e.sourceExerciseId, []).get(e.sourceExerciseId)!).push(e);
      if (ALTERNATIVE_TYPES.has(e.type)) {
        (this.altInByTarget.get(e.targetExerciseId) ?? this.altInByTarget.set(e.targetExerciseId, []).get(e.targetExerciseId)!).push(e);
      }
    }
    for (const list of this.bySource.values()) list.sort((a, b) => a.rank - b.rank);
  }

  /** All outgoing relationships for an exercise, ranked best-first. */
  getRelationships(exerciseId: string): ExerciseRelationship[] {
    return (this.bySource.get(exerciseId) ?? []).slice();
  }

  getByType(exerciseId: string, type: RelationshipType): ExerciseRelationship[] {
    return this.getRelationships(exerciseId).filter((e) => e.type === type);
  }

  getAlternatives(exerciseId: string): ExerciseRelationship[] {
    return this.getRelationships(exerciseId).filter((e) => ALTERNATIVE_TYPES.has(e.type));
  }

  getRegressions(exerciseId: string): ExerciseRelationship[] {
    return this.getByType(exerciseId, 'Regression');
  }

  getProgressions(exerciseId: string): ExerciseRelationship[] {
    return this.getByType(exerciseId, 'Progression');
  }

  /**
   * Exercise-002 substitution pool: alternatives (primary) + regressions
   * (secondary). Progressions are intentionally excluded. Ranked best-first.
   */
  getSubstitutionPool(exerciseId: string): ExerciseRelationship[] {
    return this.getRelationships(exerciseId).filter(
      (e) => ALTERNATIVE_TYPES.has(e.type) || e.type === 'Regression',
    );
  }

  /**
   * Project onto the locked EL-D12 arrays. Alternatives resolve bidirectionally
   * (if A→B or B→A is an alternative-type edge, they are mutual alternatives —
   * Exercise Library Architecture §2.3). Regressions/progressions stay directional.
   */
  resolveArrays(exerciseId: string): ExerciseRelationshipArrays {
    const out = this.getRelationships(exerciseId);
    const altOut = out.filter((e) => ALTERNATIVE_TYPES.has(e.type)).map((e) => e.targetExerciseId);
    const altIn = (this.altInByTarget.get(exerciseId) ?? [])
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((e) => e.sourceExerciseId);
    return {
      exerciseId,
      alternativeExerciseIds: [...new Set([...altOut, ...altIn])],
      regressionExerciseIds: out.filter((e) => e.type === 'Regression').map((e) => e.targetExerciseId),
      progressionExerciseIds: out.filter((e) => e.type === 'Progression').map((e) => e.targetExerciseId),
    };
  }

  // ── Environment / equipment filters (W-23 picker, home/hotel-gym contexts) ──

  private environmentsOf(exerciseId: string): string[] {
    const ex = this.exerciseById.get(exerciseId);
    if (!ex) return [];
    return this.equipmentById.get(ex.equipmentId)?.environments ?? [];
  }

  /** Keep relationships whose TARGET is executable in the given environment. */
  filterByEnvironment(rels: ExerciseRelationship[], environment: string): ExerciseRelationship[] {
    return rels.filter((e) => this.environmentsOf(e.targetExerciseId).includes(environment));
  }

  filterByEquipment(rels: ExerciseRelationship[], equipmentId: string): ExerciseRelationship[] {
    return rels.filter((e) => this.exerciseById.get(e.targetExerciseId)?.equipmentId === equipmentId);
  }

  isBodyweight(exerciseId: string): boolean {
    return this.exerciseById.get(exerciseId)?.equipmentId === 'bodyweight';
  }

  isCardio(exerciseId: string): boolean {
    const ex = this.exerciseById.get(exerciseId);
    return ex?.modality === 'Cardio' || ex?.movementPattern === 'Cardio / Locomotion';
  }
}

/** Convenience singleton over the shipped graph. */
export const exerciseRelationships = new ExerciseRelationshipService();
