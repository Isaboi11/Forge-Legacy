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
 *   - Bench Approach Intermediate
 *   - Deadlift Measure Intermediate
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
 * ── THE PERCENTAGE-LOADED SPECIALIZATION BLOCKS ──────────────────────────────────────────────────────
 *
 * Squat Ascent, Bench Approach and Deadlift Measure load their specialized lift as a fraction of a
 * tested max (0111). They are the only programs in the catalog whose prescriptions cannot be read at all
 * until the athlete answers the max gate. All three are standalone blocks run BETWEEN general programs —
 * no successor, no predecessor, not rungs on the Strength Foundation ladder. None is `LOCKED`.
 *
 * ══ THEY ARE NOT THREE COPIES OF ONE TEMPLATE ══
 *
 * All three train five days a week. What differs is how often the SPECIALIZED LIFT itself is loaded:
 * the squat and the bench are pressed or squatted every session, and the COMPETITION DEADLIFT is pulled
 * TWICE, never heavy in back-to-back sessions. The squat and the bench tolerate daily submaximal work
 * and heavy pulling does not — five heavy pulls a week is how people get hurt, and shipping that as
 * advice because it matched a sibling's shape would be the template writing the training. The deadlift
 * block's other three days carry variations, squat work and pressing, which build the same positions at
 * a fraction of the spinal cost. Its Design Record §6 argues it in full.
 *
 * That distinction — sessions per week versus pulls per week — is worth keeping sharp. Conflating them
 * once already made this block look like it trained less than its siblings when it never did.
 *
 * ══ PROVENANCE DIFFERS BETWEEN THEM, AND IS RECORDED ══
 *
 * Squat Ascent's METHOD was analysed from a publicly-posted training month — structure, prescriptions,
 * session names and copy original, none of the source's reproduced. Bench Approach and Deadlift Measure
 * were EXTRAPOLATED from that method with no source consulted at all, so their loading carries a weaker
 * warrant than their sibling's. Each Design Record says which it is, in its own §1.
 */

import type { ProgramDefinition } from '../schema';
import foundationI3Day from './strength-foundation-i-3day.json';
import foundationII4Day from './strength-foundation-ii-4day.json';
import ironAndEngine from './iron-and-engine.json';
import squatAscent from './squat-ascent-intermediate.json';
import benchApproach from './bench-approach-intermediate.json';
import deadliftMeasure from './deadlift-measure-intermediate.json';
import fullFrame from './full-frame-5day.json';

// JSON import types widen literals (e.g. theme:string); the validator test enforces the
// real ProgramDefinition contract, so a single narrowing cast here is safe.
const DEFINITIONS: readonly ProgramDefinition[] = [
  foundationI3Day,
  foundationII4Day,
  ironAndEngine,
  squatAscent,
  benchApproach,
  deadliftMeasure,
  fullFrame,
] as unknown as ProgramDefinition[];

/** All converted, PO-approved program definitions. */
export function getProgramDefinitions(): readonly ProgramDefinition[] {
  return DEFINITIONS;
}

/** One program definition by id, or null. */
export function getProgramDefinition(id: string): ProgramDefinition | null {
  return DEFINITIONS.find((p) => p.id === id) ?? null;
}
