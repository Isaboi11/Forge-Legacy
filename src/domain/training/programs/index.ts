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
 *   - Full Frame (5-day)
 *   - Body Recomposition Foundation
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
 *
 * ── BODY RECOMPOSITION FOUNDATION IS THE FIRST ONE THE CATALOG PLAN ASKED FOR ─────────────────────────
 *
 * Every program above it was authored because someone wanted to author it. This is the first entry from
 * the LOCKED Stage-2 production plan — Sort 13, Conditioning family, BEGINNER rung — and the first
 * authored against a LOCKED Stage-1 Blueprint rather than against a blank page. Its metadata is not a
 * judgement call: `Body-Recomposition-Foundation-Blueprint-v1.0.md` fixes 8 weeks, 4 sessions, GYM,
 * `LOSE_FAT + BUILD_MUSCLE`, a Week-7 deload and the 12–24 MAIN-set envelope, and the acceptance test
 * holds the JSON to each of them.
 *
 * It is **LOCKED** (2026-08-06), over its own Design Record §9 recommendation to hold. `Lock-Record.md`
 * is the signed record and names what was accepted rather than resolved: nobody has trained it, and the
 * Week-8 rest/rep pairing is unreviewed in practice.
 *
 * ── THE COOL-DOWN RULE DIED HERE, AND THAT IS THE USEFUL PART ─────────────────────────────────────────
 *
 * `ProgramWorkout` has `warmup` and `main`. There is no third section, so **no in-repo authored program
 * has ever been able to express a cool-down** — while PAS-D9 required one for every CONDITIONING program.
 * Iron & Engine recorded that as finding 7 and shipped. This program hit it again and was LOCKED with it
 * open, which turned a draft's known gap into a written contradiction between the Standard and the
 * locked catalog — and that is what finally forced the question.
 *
 * The product owner amended the rule rather than the programs:
 * `Docs/Amendments/Program-Authoring-Standard-Amendment-003-Cooldown-Not-Required.md` (LOCKED) makes
 * COOL_DOWN optional for every category. **No JSON changed. Nothing an athlete sees changed.** Both
 * programs are now compliant, because a requirement no author can satisfy is not a standard — it just
 * teaches authors to skim the compliance table, which is how the next real violation gets missed.
 *
 * Two things survive the amendment and are worth not re-litigating:
 *   · **Never fake it in `main`** (PAS-A3-D4). `setCount` counts a stretch there as working volume and
 *     W-9 renders and logs it as a working set, inflating every volume figure the program reports.
 *   · **A field alone does not revive the rule** (PAS-A3-D3). It needs a field AND a surface that shows
 *     it — the same reason `ExercisePrescription` deliberately has no `notes`.
 *
 * ── `LOCKED` DOES NOT MEAN "NO OPEN ITEMS" ────────────────────────────────────────────────────────────
 *
 *   · `LOCKED`                   — Strength Foundation I/II (clean), Body Recomp Foundation (signed with
 *                                   two open items still named in its Lock Record)
 *   · `AUTHORED — … outstanding` — ships and is adoptable, nobody has signed it
 *
 * ── TWO MUSCLE BUILDING / INTERMEDIATE / 5-DAY PROGRAMS SHIP, ON PURPOSE ──────────────────────────────
 *
 * `full-frame-5day` and `frame-by-frame-5day` share family, level and frequency. That overlap was put to
 * the product owner before the second was authored, with the alternatives of building the locked 4-day
 * slot instead or not building at all, and the instruction was to build the five-day.
 *
 * They differ on the thing the argument is actually about: **Full Frame splits by MOVEMENT PATTERN**
 * (Push/Pull/Legs/Upper/Lower, ~2× per muscle per week, 6 weeks) and **Frame by Frame splits by BODY
 * PART** (Back/Chest/Legs/Shoulders/Arms, 1× per muscle at much higher per-session volume, 10 weeks with
 * a deload). Frequency against per-session volume is a real choice.
 *
 * ⚠ The honest caveat, recorded where someone deciding the catalog's shape will see it: **the Program
 * Catalog surface shows name, duration and frequency**, so to an athlete choosing between them these
 * read as "the 6-week one" and "the 10-week one". Frame by Frame's Design Record §2 argues both sides.
 *
 * **Neither is `Muscle Building Intermediate` (Sort 6), which remains UNBUILT.** That Blueprint is LOCKED
 * at 10 weeks × **4** sessions; authoring a 5-day under that name would break a locked Blueprint to match
 * a PDF, and a locked Blueprint outranks a PDF. Both of these ship outside the locked 24.
 */

import type { ProgramDefinition } from '../schema';
import foundationI3Day from './strength-foundation-i-3day.json';
import foundationII4Day from './strength-foundation-ii-4day.json';
import ironAndEngine from './iron-and-engine.json';
import squatAscent from './squat-ascent-intermediate.json';
import benchApproach from './bench-approach-intermediate.json';
import deadliftMeasure from './deadlift-measure-intermediate.json';
import fullFrame from './full-frame-5day.json';
import bodyRecompFoundation from './body-recomposition-foundation.json';
import frameByFrame from './frame-by-frame-5day.json';

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
  bodyRecompFoundation,
  frameByFrame,
] as unknown as ProgramDefinition[];

/** All converted, PO-approved program definitions. */
export function getProgramDefinitions(): readonly ProgramDefinition[] {
  return DEFINITIONS;
}

/** One program definition by id, or null. */
export function getProgramDefinition(id: string): ProgramDefinition | null {
  return DEFINITIONS.find((p) => p.id === id) ?? null;
}
