/**
 * ExerciseCoachingContent — normalized coaching-content schema for Forge Legacy.
 *
 * This is a SEPARATE, modular layer that sits beside the canonical exercise
 * catalog, equipment catalog, muscle taxonomy and relationship graph — it never
 * replaces or mutates them. One coaching record exists per exercise, keyed by the
 * catalog's `exerciseId`. The exercise definition, workout prescriptions, and the
 * relationship graph each remain independent (see README.md § "Modularity").
 *
 * Source of truth for the deterministic logic (risk classification, confidence,
 * flags, generation, similarity, workflow) lives in `engine.mjs`. This file is the
 * typed mirror consumed by the app layer (`query-service.ts`, `integration.ts`).
 * The constant arrays below are mirrored verbatim in `engine.mjs` and enforced by
 * `validate.mjs`, exactly as `schema.ts` ↔ `engine.mjs` are mirrored in the
 * sibling `exercise-relationships` domain.
 *
 * IMPORTANT: This schema defines the SYSTEM. No coaching content has been
 * generated or committed. The batch production run is gated on human approval
 * (README.md § "Generation strategy").
 */

/**
 * The bump-on-breaking-change version of this record shape (not per-record content
 * version). v2 added `whyItMatters`, `difficultyExplanation`, `progressionGuidance`,
 * and per-mistake `whyItMatters` (`CoachingMistake`).
 */
export const COACHING_SCHEMA_VERSION = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Editorial workflow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The editorial lifecycle. Claude/automation may only ever move a record within
 * the first three states. `Approved` and `Published` are HUMAN-ONLY transitions
 * (they require a reviewer/approver identity) — see `engine.mjs` WORKFLOW guards.
 *
 *   Draft → Auto-Validated → Needs Review → Approved → Published
 */
export type ContentStatus =
  | 'Draft'
  | 'Auto-Validated'
  | 'Needs Review'
  | 'Approved'
  | 'Published';

export const CONTENT_STATUSES: readonly ContentStatus[] = [
  'Draft',
  'Auto-Validated',
  'Needs Review',
  'Approved',
  'Published',
];

/** States automation is permitted to assign. Everything past this is human-gated. */
export const AUTOMATABLE_STATUSES: readonly ContentStatus[] = [
  'Draft',
  'Auto-Validated',
  'Needs Review',
];

/** States whose content is safe to serve to end users (integration layer gate). */
export const USER_VISIBLE_STATUSES: readonly ContentStatus[] = ['Published'];

/** Provenance of the current content body — distinct from workflow status. */
export type ContentSource = 'Auto-Generated' | 'Editor-Edited';

// ─────────────────────────────────────────────────────────────────────────────
// Risk classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Automatic risk tier. Drives spotting/safety expectations, confidence, and how
 * aggressively a record is routed to human review. Never shown to end users.
 *
 *   Standard   — guided/isolation/low-skill (machine chest press, leg extension, cable curl)
 *   Technical  — free-weight compound / bodyweight skill (back squat, deadlift, pull-up, power clean)
 *   Specialist — Olympic lifts, advanced gymnastics, strongman, loaded get-ups
 */
export type RiskTier = 'Standard' | 'Technical' | 'Specialist';

export const RISK_TIERS: readonly RiskTier[] = ['Standard', 'Technical', 'Specialist'];

// ─────────────────────────────────────────────────────────────────────────────
// Review flags
// ─────────────────────────────────────────────────────────────────────────────

/** Every automatic review-flag code the flag engine can raise. */
export type ReviewFlagCode =
  | 'LOW_CONFIDENCE'
  | 'OLYMPIC_LIFT'
  | 'ADVANCED_GYMNASTICS'
  | 'STRONGMAN'
  | 'SPECIALIST_TIER'
  | 'TECHNICAL_TIER'
  | 'SPOTTING_REQUIRED'
  | 'METADATA_INCONSISTENCY'
  | 'AMBIGUOUS_SETUP'
  | 'UNUSUAL_EQUIPMENT'
  | 'DUPLICATE_WORDING'
  | 'POSSIBLE_CONTRADICTION'
  | 'MOVEMENT_PATTERN_MISMATCH'
  | 'STANDING_SEATED_CONTRADICTION'
  | 'MACHINE_FREEWEIGHT_MISMATCH'
  | 'ZERO_RELATIONSHIPS'
  | 'SPARSE_CONTENT';

export const REVIEW_FLAG_CODES: readonly ReviewFlagCode[] = [
  'LOW_CONFIDENCE',
  'OLYMPIC_LIFT',
  'ADVANCED_GYMNASTICS',
  'STRONGMAN',
  'SPECIALIST_TIER',
  'TECHNICAL_TIER',
  'SPOTTING_REQUIRED',
  'METADATA_INCONSISTENCY',
  'AMBIGUOUS_SETUP',
  'UNUSUAL_EQUIPMENT',
  'DUPLICATE_WORDING',
  'POSSIBLE_CONTRADICTION',
  'MOVEMENT_PATTERN_MISMATCH',
  'STANDING_SEATED_CONTRADICTION',
  'MACHINE_FREEWEIGHT_MISMATCH',
  'ZERO_RELATIONSHIPS',
  'SPARSE_CONTENT',
];

/** Flag severity. Any `block` flag prevents a record from resting at Auto-Validated. */
export type FlagSeverity = 'info' | 'warn' | 'block';

export interface ReviewFlag {
  code: ReviewFlagCode;
  severity: FlagSeverity;
  /** Concise, human-readable reason. Editorial-only; never surfaced to users. */
  detail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Versioning / history
// ─────────────────────────────────────────────────────────────────────────────

export type CoachingHistoryAction =
  | 'generated'
  | 'regenerated'
  | 'validated'
  | 'flagged'
  | 'edited'
  | 'reviewed'
  | 'approved'
  | 'published'
  | 'reverted';

/** One immutable audit entry. The record's `history` array is append-only. */
export interface CoachingHistoryEntry {
  /** The `contentVersion` the record held when this event occurred. */
  version: number;
  action: CoachingHistoryAction;
  /** ISO-8601 timestamp. */
  at: string;
  /** Actor identity: a generator id (`generator@vN`) or a human reviewer id. */
  actor: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coaching content — the record
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A common mistake with why it matters and its concrete correction. `mistake`
 * mirrors an entry in `commonMistakes`. `whyItMatters` explains the cost of the
 * mistake (lost effectiveness / weaker position) — educational, never a medical claim.
 */
export interface CoachingMistake {
  mistake: string;
  whyItMatters: string;
  correction: string;
}

/**
 * @deprecated Superseded by {@link CoachingMistake} (which adds `whyItMatters`).
 * Retained as a name alias for any external reference.
 */
export type MistakeCorrection = CoachingMistake;

/**
 * Structured progression guidance, sourced from the canonical relationship graph
 * (regression/progression edges). IDs are catalog `exerciseId`s the UI resolves
 * to names; reasons explain why to step down or up. Fields are optional — an
 * exercise may have a regression, a progression, both, or neither.
 */
export interface ExerciseProgressionGuidance {
  regressionExerciseId?: string;
  regressionReason?: string;
  progressionExerciseId?: string;
  progressionReason?: string;
}

/**
 * The result of the semantic guidance-eligibility check for one candidate edge.
 * A relationship-graph edge only becomes user-facing progression/regression
 * guidance when it is a genuine training continuation — same modality, movement
 * pattern, and recognizable skill/strength continuity — not merely a harder or
 * easier exercise that shares some metadata. Editorial only (never user-visible).
 */
export interface CoachingGuidanceEligibility {
  /** The candidate target that was evaluated (id + name), or null when there were no candidates. */
  candidateExerciseId: string | null;
  eligible: boolean;
  /** 0–100 continuity confidence (0 when rejected). */
  confidence: number;
  reasons: string[];
  rejectionReasons: string[];
}

/**
 * The normalized coaching record for a single exercise. Exactly one per
 * `exerciseId`. Content fields hold coaching text; the trailing block holds
 * editorial metadata that is NEVER exposed to end users (see `integration.ts`).
 */
export interface ExerciseCoachingContent {
  // ── Identity ────────────────────────────────────────────────────────────────
  /** FK to the canonical catalog. Unique across all records (one record per exercise). */
  exerciseId: string;
  /** BCP-47 locale of this content body. `en` for V1; the record shape is translation-ready. */
  locale: string;

  // ── Coaching content ─────────────────────────────────────────────────────────
  /** Why the exercise matters — purpose and training adaptation. Feeds W-22 "WHY IT MATTERS". */
  whyItMatters: string | null;
  /** Getting into the start position, before the first rep. Ordered. */
  setupInstructions: string[];
  /** The movement itself, rep by rep. Ordered. Feeds W-22 "HOW TO DO IT". */
  executionSteps: string[];
  /** Unordered focal cues. Feeds W-22 "COACHING CUES". */
  coachingTips: string[];
  /** What to watch for, framed descriptively (no shame/imperatives). Feeds W-22 "WATCH OUT FOR". */
  commonMistakes: string[];
  /** 1:1 mistake → why-it-matters → correction; each `.mistake` matches an entry in `commonMistakes`. */
  mistakeCorrections: CoachingMistake[];
  /** When/how to breathe. Null when not meaningfully specific. */
  breathingGuidance: string | null;
  /** Cadence guidance (e.g. "Control a 2-count lower; drive up with intent"). Null when generic. */
  tempoGuidance: string | null;
  /** Depth/range observations specific to this movement. Null when not specific. */
  rangeOfMotionNotes: string | null;
  /** Cues ordered most-important-first (the one thing to nail leads). */
  cueHierarchy: string[];
  /** Notes for experienced athletes (intensification, loading nuance). */
  advancedCoachingNotes: string[];
  /** Notes for first-timers (scaling, orientation). */
  beginnerNotes: string[];
  /** Equipment-specific setup (bench angle, pin height, handle/attachment). Null when trivial. */
  equipmentSetup: string | null;
  /** Present ONLY when a spotter is genuinely relevant (free-weight overhead/loaded-spine press). */
  spottingNotes: string | null;
  /** Present ONLY when a specific, non-medical safety note applies. */
  safetyNotes: string[];
  /** How difficulty scales / who this suits (multi-axis training note). Null when not distinctive. */
  difficultyConsiderations: string | null;
  /** Plain explanation of WHY this exercise carries its difficulty rating. Null when not distinctive. */
  difficultyExplanation: string | null;
  /**
   * Structured regression/progression guidance — populated ONLY with candidate
   * edges that pass the semantic eligibility check (same modality/pattern +
   * recognizable continuity). Often empty: no guidance is better than weak guidance.
   */
  progressionGuidance: ExerciseProgressionGuidance;

  // ── Editorial metadata (NEVER user-visible) ───────────────────────────────────
  /**
   * Why the regression/progression guidance was included or rejected — the
   * eligibility result for the top candidate edge in each direction (or the
   * selected eligible one). Editorial transparency; never served to users.
   */
  guidanceEligibility: {
    regression: CoachingGuidanceEligibility | null;
    progression: CoachingGuidanceEligibility | null;
  };
  /** Internal editorial note carried with the record. Never served to users. */
  coachNotes: string | null;
  reviewFlags: ReviewFlag[];
  riskTier: RiskTier;
  /** 0–100, one decimal. Editorial routing signal only — users never see it. */
  confidenceScore: number;
  contentStatus: ContentStatus;
  source: ContentSource;
  /** Monotonic per-record content version, starts at 1, bumps on each material change. */
  contentVersion: number;
  /** Bump-on-breaking-change shape version (mirrors {@link COACHING_SCHEMA_VERSION} at write time). */
  schemaVersion: number;
  /** Version tag of the generator that produced the current body (for regeneration diffing). */
  generatorVersion: string;
  /** Deterministic hash of the content body — powers idempotency & change detection. */
  contentHash: string;
  /** ISO-8601 timestamps. */
  generatedAt: string;
  updatedAt: string;
  /** Human reviewer identity, or null until reviewed. */
  reviewedBy: string | null;
  /** Human approver identity, or null until approved. */
  approvedBy: string | null;
  approvedAt: string | null;
  /** Append-only audit trail (review + approval + regeneration history). */
  history: CoachingHistoryEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration projection (what the app / W-22 is allowed to see)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The ONLY shape the UI layer receives. It is a strict projection of the record
 * that omits every editorial field (confidence, flags, status, risk tier, coach
 * notes, corrections). Section names map onto the LOCKED W-22 content order.
 *
 *   WHY IT MATTERS ← whyItMatters
 *   HOW TO DO IT   ← instructions   (setupInstructions + executionSteps)
 *   COACHING CUES  ← tips           (cueHierarchy-ordered coachingTips)
 *   WATCH OUT FOR  ← commonMistakes
 *   (additive, optional) Safety Notes / Advanced Notes / Progression
 *
 * The coaching system now authors `whyItMatters` (previously an ExerciseDefinition
 * field, Architecture Amendment 001); the integration layer supplies it to the
 * W-22 "WHY IT MATTERS" section. `description` (ABOUT) remains ExerciseDefinition-owned.
 */
export interface ExerciseCoachingView {
  exerciseId: string;
  /** Feeds W-22 "WHY IT MATTERS". Null when not authored. */
  whyItMatters: string | null;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  /** Optional additive section — present only when the record carries safety notes. */
  safetyNotes: string[];
  /** Optional additive section — present only when the record carries advanced notes. */
  advancedNotes: string[];
  /** Optional additive: structured "make it easier / harder" guidance from the relationship graph. */
  progressionGuidance: ExerciseProgressionGuidance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store manifest (batch generation / resumability)
// ─────────────────────────────────────────────────────────────────────────────

/** Ordered generation batches (README.md § "Batch generation"). */
export type GenerationBatch =
  | 'Machines'
  | 'Cable'
  | 'Dumbbells'
  | 'Bodyweight'
  | 'Barbell'
  | 'Bands'
  | 'Kettlebells'
  | 'Cardio'
  | 'Mobility'
  | 'Specialist';

export const GENERATION_BATCHES: readonly GenerationBatch[] = [
  'Machines',
  'Cable',
  'Dumbbells',
  'Bodyweight',
  'Barbell',
  'Bands',
  'Kettlebells',
  'Cardio',
  'Mobility',
  'Specialist',
];

/** Persisted alongside the content store; lets the generator resume without duplicating work. */
export interface CoachingStoreManifest {
  schemaVersion: number;
  generatorVersion: string;
  /** Total exercises in the canonical catalog at last generation. */
  catalogSize: number;
  /** exerciseIds with a committed record, by batch. */
  completedByBatch: Record<GenerationBatch, string[]>;
  updatedAt: string;
}
