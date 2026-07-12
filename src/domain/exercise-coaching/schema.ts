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

/** The bump-on-breaking-change version of this record shape (not per-record content version). */
export const COACHING_SCHEMA_VERSION = 1;

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

/** A common-mistake paired with its concrete correction. `mistake` mirrors an entry in `commonMistakes`. */
export interface MistakeCorrection {
  mistake: string;
  correction: string;
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
  /** Getting into the start position, before the first rep. Ordered. */
  setupInstructions: string[];
  /** The movement itself, rep by rep. Ordered. Feeds W-22 "HOW TO DO IT". */
  executionSteps: string[];
  /** Unordered focal cues. Feeds W-22 "COACHING CUES". */
  coachingTips: string[];
  /** What to watch for, framed descriptively (no shame/imperatives). Feeds W-22 "WATCH OUT FOR". */
  commonMistakes: string[];
  /** 1:1 concrete corrections; each `.mistake` matches an entry in `commonMistakes`. */
  mistakeCorrections: MistakeCorrection[];
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
  /** How difficulty scales / who this suits. Null when not distinctive. */
  difficultyConsiderations: string | null;

  // ── Editorial metadata (NEVER user-visible) ───────────────────────────────────
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
 *   HOW TO DO IT   ← instructions   (setupInstructions + executionSteps)
 *   COACHING CUES  ← tips           (cueHierarchy-ordered coachingTips)
 *   WATCH OUT FOR  ← commonMistakes
 *   (additive, optional) Safety Notes / Advanced Notes
 *
 * `whyItMatters` and `description` are NOT here — they are ExerciseDefinition
 * education fields (Architecture Amendment 001), owned outside this system.
 */
export interface ExerciseCoachingView {
  exerciseId: string;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  /** Optional additive section — present only when the record carries safety notes. */
  safetyNotes: string[];
  /** Optional additive section — present only when the record carries advanced notes. */
  advancedNotes: string[];
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
