/**
 * Program definitions — the built-in Forge Legacy catalog.
 *
 * GENERATED, from `Programs/*.docx` (Decision Queue #6):
 *   - Strength Foundation I (3-day)
 *   - Strength Foundation II (4-day)
 * The `.docx` remain the authoritative source; regenerate via `ingest/generate.mjs`.
 * Held: Foundation I (4-day) is DRAFT. Excluded: Foundation II (3-day) source is mislabeled.
 *
 * AUTHORED IN-REPO, with no `.docx` behind it:
 *   - Iron & Engine
 *   - Squat Ascent Intermediate
 *
 * ── WHY ONE PROGRAM HAS NO `.docx` ───────────────────────────────────────────────────────────────────
 *
 * Every program before it was written in Word and converted. Iron & Engine was authored directly against
 * this schema, so its `sourceFile` points at a Markdown Design Record rather than a document, and
 * `ingest/generate.mjs` neither produces nor validates it — running the ingest does not touch this file.
 * That is a real difference in provenance and it is recorded rather than hidden: the Production
 * Standard's documentation requirement is met by `Programs/Conditioning/Iron and Engine/`, which carries
 * the same Design Record and Lock Record every locked program owes.
 *
 * Its `status` is deliberately NOT `LOCKED`. Phases 1–8 of the Production Standard are complete and
 * written down; Lock Approval is the product owner's, and claiming it here would be forging a signature.
 *
 * ── THE FIRST PERCENTAGE-BASED PROGRAM ───────────────────────────────────────────────────────────────
 *
 * Squat Ascent Intermediate loads every squat as a fraction of a tested max (0111). It is the
 * first program in the catalog to do so, and the only one whose prescriptions cannot be read without the
 * athlete answering the max gate first. Its `status` is likewise NOT `LOCKED`.
 *
 * Its METHOD was analysed from a publicly-posted training month; its structure, prescriptions, session
 * names and copy are original, and none of the source's are reproduced. The provenance is written down
 * in its Design Record rather than left to memory — see `sourceFile`.
 */

import type { ProgramDefinition } from '../schema';
import foundationI3Day from './strength-foundation-i-3day.json';
import foundationII4Day from './strength-foundation-ii-4day.json';
import ironAndEngine from './iron-and-engine.json';
import squatAscent from './squat-ascent-intermediate.json';

// JSON import types widen literals (e.g. theme:string); the validator test enforces the
// real ProgramDefinition contract, so a single narrowing cast here is safe.
const DEFINITIONS: readonly ProgramDefinition[] = [
  foundationI3Day,
  foundationII4Day,
  ironAndEngine,
  squatAscent,
] as unknown as ProgramDefinition[];

/** All converted, PO-approved program definitions. */
export function getProgramDefinitions(): readonly ProgramDefinition[] {
  return DEFINITIONS;
}

/** One program definition by id, or null. */
export function getProgramDefinition(id: string): ProgramDefinition | null {
  return DEFINITIONS.find((p) => p.id === id) ?? null;
}
