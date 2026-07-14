/**
 * Program definitions — typed loader over the JSON generated from `Programs/*.docx`
 * (Decision Queue #6). Only PO-approved LOCKED programs are present:
 *   - Strength Foundation I (3-day)
 *   - Strength Foundation II (4-day)
 *
 * The `.docx` remain the authoritative source; regenerate via `ingest/generate.mjs`.
 * Held: Foundation I (4-day) is DRAFT. Excluded: Foundation II (3-day) source is mislabeled.
 *
 * NOTE: this is generated data, not yet wired into the app. `getActiveProgram()` still
 * reads the placeholder until the PO approves promoting this data.
 */

import type { ProgramDefinition } from '../schema';
import foundationI3Day from './strength-foundation-i-3day.json';
import foundationII4Day from './strength-foundation-ii-4day.json';

// JSON import types widen literals (e.g. theme:string); the validator test enforces the
// real ProgramDefinition contract, so a single narrowing cast here is safe.
const DEFINITIONS: readonly ProgramDefinition[] = [
  foundationI3Day,
  foundationII4Day,
] as unknown as ProgramDefinition[];

/** All converted, PO-approved program definitions. */
export function getProgramDefinitions(): readonly ProgramDefinition[] {
  return DEFINITIONS;
}

/** One program definition by id, or null. */
export function getProgramDefinition(id: string): ProgramDefinition | null {
  return DEFINITIONS.find((p) => p.id === id) ?? null;
}
