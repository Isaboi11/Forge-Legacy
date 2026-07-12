/**
 * CoachingContentService — typed, app-facing query layer over the coaching store.
 *
 * This is the single integration point for coaching content, mirroring the
 * pattern of the sibling `ExerciseRelationshipService`. It reads the pre-built,
 * committed store and never re-implements generation/validation (those live in
 * the `.mjs` build tools).
 *
 * Two distinct audiences:
 *   • EDITORIAL tooling — may read full records incl. internal fields
 *     (`get`, `all`, `getByStatus`, `needingReview`, `byRiskTier`).
 *   • The APP / W-22 UI — must go through `integration.ts`, which projects a
 *     record onto the UI-safe {@link ExerciseCoachingView} and only ever serves
 *     Published content. The UI must NOT read raw records from this service.
 *
 * The committed store is currently EMPTY — no coaching content has been
 * generated. Every method degrades gracefully to empty results.
 */

import type { ExerciseCoachingContent, ContentStatus, RiskTier } from './schema';
import store from './content/coaching_content.json';

/** The committed store, typed. Empty until the first approved generation run. */
const RECORDS = store as unknown as ExerciseCoachingContent[];

export class CoachingContentService {
  private readonly byId = new Map<string, ExerciseCoachingContent>();

  constructor(records: ExerciseCoachingContent[] = RECORDS) {
    for (const r of records) this.byId.set(r.exerciseId, r);
  }

  /** Whether any coaching record exists for this exercise. */
  has(exerciseId: string): boolean {
    return this.byId.has(exerciseId);
  }

  /** Full record (incl. internal editorial fields). EDITORIAL use only. */
  get(exerciseId: string): ExerciseCoachingContent | null {
    return this.byId.get(exerciseId) ?? null;
  }

  /** Full record only if it is Published; otherwise null. */
  getPublished(exerciseId: string): ExerciseCoachingContent | null {
    const r = this.byId.get(exerciseId);
    return r && r.contentStatus === 'Published' ? r : null;
  }

  /** All records (editorial). */
  all(): ExerciseCoachingContent[] {
    return [...this.byId.values()];
  }

  count(): number {
    return this.byId.size;
  }

  getByStatus(status: ContentStatus): ExerciseCoachingContent[] {
    return this.all().filter((r) => r.contentStatus === status);
  }

  /** Editorial queue: everything awaiting human review. */
  needingReview(): ExerciseCoachingContent[] {
    return this.getByStatus('Needs Review');
  }

  byRiskTier(tier: RiskTier): ExerciseCoachingContent[] {
    return this.all().filter((r) => r.riskTier === tier);
  }
}

/** Convenience singleton over the shipped store. */
export const coachingContent = new CoachingContentService();
