/**
 * workout-plinth-and-row.test.mjs — W9-Amendment-009: the hero gets a plinth back, the set row loses
 * `Target`, and `Prev` is promoted from a subline to a column.
 *
 * PO (2026-09-08, second pass the same day): the Option-3A handoff. *"We are just rearranging the
 * screen basically. Functionally all the same."*
 *
 * That last sentence is the whole reason this file exists. A rearrangement that quietly drops a fact is
 * indistinguishable from a rearrangement that keeps it — until the athlete under the bar is the one who
 * notices. The `Target` column carried FOUR things and only one of them was a rep count:
 *
 *   · the rep target                → the faded numeral inside the Reps field
 *   · `toFailure` / `targetSec`     → `MAX` and a clock, in the same slot
 *   · `ex.per` ("per leg")          → the Goal plinth's sub-line
 *   · `set.targetWeight`            → a faded numeral inside the Weight field
 *
 * Every assertion below is one of those landings, or one of the two rules that must survive the move.
 * None of this is visible to `tsc`: a deleted `<Text>` is as valid as a kept one, and a style with no
 * consumer compiles perfectly. Same shape as `workout-section-wiring.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/workout-plinth-and-row.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Comments explain this rearrangement at length; they must never be able to SATISFY a test about it. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const RAW = read('../workout.tsx');
const WORKOUT = strip(RAW);
const SAVE = strip(read('../../domain/workout/save-core.ts'));

/* ── 1 · THE TARGET COLUMN IS GONE, AND EVERYTHING IT CARRIED LANDED ─────────────────────────────── */

test('the Target column is gone — header, cell and every style it used', () => {
  assert.ok(!/styles\.cTarget\b/.test(WORKOUT), 'the Target cell is back');
  assert.ok(!/\bcTarget:/.test(WORKOUT), 'the cTarget style is back');
  // The retired figure styles too — a style with no consumer is how somebody rebuilds a deleted column.
  for (const dead of ['targetText', 'targetPer', 'targetLoad', 'repsLabel', 'cActual', 'actualCell', 'actualBtn', 'actualDone', 'actualCurrent', 'actualPending', 'weightBtn', 'weightText', 'prevLine', 'prevTag', 'heroRow', 'heroGoalFigure', 'heroBestVal', 'lastNoteText']) {
    assert.ok(!new RegExp(`\\b${dead}:`).test(WORKOUT), `\`${dead}\` is declared with nothing consuming it`);
    assert.ok(!new RegExp(`styles\\.${dead}\\b`).test(WORKOUT), `\`styles.${dead}\` is still being used`);
  }
});

test('⚠ the ask is not deleted, it moved into the Reps field — all three shapes of it', () => {
  const from = WORKOUT.indexOf('const repsAnswered =');
  const to = WORKOUT.indexOf('const repsColor =');
  assert.ok(from !== -1 && to > from, 'the reps-field derivation is gone');
  const fn = WORKOUT.slice(from, to);
  // A to-failure set carries `targetReps: 0` by construction; printing that says they did nothing.
  assert.match(fn, /set\.toFailure\s*\r?\n?\s*\?\s*'MAX'/, 'a to-failure set no longer reads MAX');
  // A timed set has no rep count to report at all.
  assert.match(fn, /set\.targetSec != null/, 'a timed set no longer shows its clock');
  assert.match(fn, /targetRepsText\(set\)/, 'the rep target (and its range) is no longer shown');
});

test('⚠ the three inks ARE the state — nothing else distinguishes asked from answered from logged', () => {
  assert.match(
    WORKOUT,
    /const repsColor = isDone \? flColor\.cream100 : repsAnswered \? flColor\.bronze300 : flColor\.gray600;/,
    'the faded/bronze/cream ladder changed — with Target gone it is the whole state language',
  );
  assert.match(WORKOUT, /fieldNumFaded: \{ color: flColor\.gray600 \}/, 'the faded ask lost its own token');
});

test('“per leg” survived the column it lived in', () => {
  // `per-side-core`: its absence does not leave a gap on screen, it leaves a different,
  // complete-looking prescription. Dropping it silently doubles or halves a day's work.
  assert.match(
    WORKOUT,
    /\{ex\.per \? `Today · per \$\{ex\.per\}` : 'Today'\}/,
    'the per-side qualifier is not on the Goal plinth — check it did not simply vanish with Target',
  );
});

test('a percentage program’s prescribed bar survived too, and is still not pre-filled', () => {
  // Shown FADED inside the Weight field, never written onto the set: a weight on an untouched row
  // records a lift nobody made and can announce a PR for it.
  assert.match(WORKOUT, /set\.targetWeight != null \? \(/, 'the prescribed load is no longer drawn');
  assert.match(WORKOUT, /styles\.fieldNumFaded/, 'the prescribed load is drawn as a real value, not as the ask');
  assert.ok(
    !/weight: set\.targetWeight/.test(WORKOUT),
    '⚠ the prescribed load is being written onto the set — that is a lift nobody made',
  );
});

/* ── 2 · `Prev` IS A COLUMN, AND ON THE LIVE ROW A CONTROL ───────────────────────────────────────── */

test('Prev is a column with its own header, not a subline', () => {
  assert.match(WORKOUT, /<Text style=\{\[styles\.h, styles\.cPrev\]\}>Prev<\/Text>/, 'Prev lost its column heading');
  assert.match(WORKOUT, /cPrev: \{ width: 66, flexGrow: 0, flexShrink: 0 \}/, 'the Prev column lost its width');
});

test('⚠ Prev fills the weight with the figure it SHOWS — not the pounds underneath it', () => {
  /* `liftHistory` holds canonical POUNDS; a live session's `set.weight` holds what the athlete typed.
     Writing the raw history number would hand a metric athlete 225 for the 102.5 they are reading. */
  assert.match(
    WORKOUT,
    /const prevWeightAt = \(setI: number\): number \| null => \{[\s\S]*?exactWeight\(p\.weight, units\)\.value/,
    'the Prev fill is not converting through exactWeight',
  );
});

test('⚠ the fill writes the WEIGHT and nothing else', () => {
  const from = WORKOUT.indexOf('const fillFromPrev =');
  const to = WORKOUT.indexOf('const bestFigure =');
  assert.ok(from !== -1 && to > from, 'fillFromPrev is gone');
  const fn = WORKOUT.slice(from, to);
  assert.match(fn, /patchSet\(s, exIdx, setI, \(set\) => \(\{ \.\.\.set, weight: w \}\)\)/, 'the fill writes more than the weight');
  for (const forbidden of ['done: true', 'actualReps', 'saved:']) {
    assert.ok(!fn.includes(forbidden), `fillFromPrev is writing \`${forbidden}\` — a tap on Prev must not log a set`);
  }
  // The guarantee that makes the above safe, asserted at its source rather than assumed.
  assert.match(SAVE, /\.filter\(\(s\) => s\.done\)/, 'un-done sets are no longer filtered out of the save');
});

/* ── 3 · THE PLINTH IS BACK, AND ITS THIRD COLUMN IS NOT THE ONE W9-A8 DELETED ───────────────────── */

test('⚠ `Last` does NOT come back with the band — the plinth’s third column is the NOTE', () => {
  /* W9-A8 removed `Last` because it was the per-set `Prev` printed twice, four inches apart. The band
     returning must not bring the duplicate with it. The column reads `lastNote`, never `sessions[0]`. */
  const from = WORKOUT.indexOf('<View style={styles.plinth}>');
  assert.ok(from !== -1, 'the plinth is gone');
  // To the end of the hero card — the plinth is the last thing in it.
  const plinth = WORKOUT.slice(from, WORKOUT.indexOf('</TourAnchor>', from));
  assert.ok(plinth.includes('styles.plinthColWide'), 'the plinth block could not be read');
  assert.match(plinth, /styles\.plinthNote/, 'the third column is not showing the note');
  assert.ok(!/sessions\[0\]/.test(plinth), '⚠ the plinth is reading last session’s SETS again — that is the `Last` W9-A8 deleted');
  assert.match(WORKOUT, /const plinthNote = lastNote && !ex\.note \? lastNote\.text : null;/, 'the note column lost its source');
});

test('the note is truncated WITH a way through, never truncated full stop', () => {
  /* ⚠ ASSERT THE CLAMP AND THE SOURCE, NOT THE EXACT CHILD EXPRESSION. The first version of this
     pinned `>{plinthNote}<` literally and broke the moment W9-A10 wrapped the note in quotation
     marks — a test that fails on a change it does not care about teaches people to edit tests. */
  const el = WORKOUT.match(/<Text style=\{styles\.plinthNote\}[^>]*>[\s\S]{0,80}?<\/Text>/);
  assert.ok(el, 'the note excerpt element is gone');
  assert.match(el[0], /numberOfLines=\{2\}/, 'the excerpt is no longer clamped to two lines');
  assert.match(el[0], /plinthNote/, 'the excerpt is no longer reading the note');
  assert.match(WORKOUT, /onPress=\{\(\) => setReadNote\(plinthNote\)\}/, 'Read note does not open the full note');
  assert.match(WORKOUT, /\{readNote \?/, 'the full-note sheet is not mounted');
  // Mounted as a sibling of the note editor — see `overlay-branch.test.mjs` for why that matters.
  assert.ok(WORKOUT.indexOf('{readNote ?') < WORKOUT.indexOf('{noteOpen != null ?'), 'the read sheet drifted out of the overlay block');
});

test('Goal keeps its control, its figure and its panel — only where it is drawn has moved', () => {
  assert.match(WORKOUT, /onPress=\{\(\) => setGoalOpen\(goalPanelOpen \? null : exIdx\)\}/, 'the goal is no longer editable from the card');
  assert.match(WORKOUT, /styles\.plinthLabelLive/, 'the goal label lost the bronze that marks it as the live instruction');
  assert.match(WORKOUT, /\{goalPanelOpen && !ssFused \? \(/, 'SetGoalPanel no longer opens under the hero');
});

test('⚠ a figure that will not fit is set smaller, never clipped', () => {
  // `102.5×5` and a ladder goal like `4×6-6-4-4` both overflow the design's 24pt in a third of a card.
  assert.match(WORKOUT, /function plinthFigureStyle\(s: string\)/, 'the plinth figure is back to a fixed size');
  assert.ok(!/adjustsFontSizeToFit/.test(WORKOUT), 'adjustsFontSizeToFit is iOS-only — it does nothing on the web preview the PO tests');
  assert.match(WORKOUT, /styles\.fieldNumSm/, 'the row fields lost their small size — `10-12` and `MAX` will clip');
});

/* ── 4 · THE LAYOUT RULES THE REARRANGEMENT DEPENDS ON ───────────────────────────────────────────── */

test('the six cells are fixed and the slack is spread BETWEEN them', () => {
  // Without `space-between` the leftover pools at one end and the columns stop meeting their headings.
  assert.match(WORKOUT, /rowCells: \{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'/, 'the row lost space-between');
  for (const cell of ['cSet', 'cPrev', 'cWeight', 'cReps', 'cCheck']) {
    assert.match(WORKOUT, new RegExp(`${cell}: \\{ width: \\d+, flexGrow: 0, flexShrink: 0`), `${cell} can grow or shrink — the columns will not line up`);
  }
  assert.match(WORKOUT, /cTrash: \{ width: 18, flexGrow: 0, flexShrink: 0/, 'the trash column changed width');
});

test('the hero clips, or the plinth’s square corners stand proud of it', () => {
  assert.match(WORKOUT, /hero: \{[^}]*overflow: 'hidden'/, 'the hero card lost its clip');
  assert.match(WORKOUT, /plinth: \{ flexDirection: 'row', borderTopWidth: 1/, 'the plinth lost its lid');
});

test('the three in-row controls stay a full 44pt', () => {
  // Prev, Weight and Reps. The whole point of a ~58pt row is that it does not buy the height back
  // out of the targets.
  assert.match(WORKOUT, /prevCell: \{ height: 44/, 'Prev is under 44pt');
  assert.match(WORKOUT, /fieldBox: \{ height: 44/, 'the number fields are under 44pt');
});

/* ── 5 · AND THE THINGS THE PO ASKED TO KEEP ─────────────────────────────────────────────────────── */

test('the animations and the auto-collapse are untouched', () => {
  // PO: "Keep the animations and the way the card closes after the first set the same."
  assert.match(WORKOUT, /if \(!autoCollapsed\[ei\]\)/, 'the hero no longer auto-collapses on the first resolved set');
  assert.match(WORKOUT, /flash && flash\.ei === exIdx && flash\.si === si \? <FuseFlash/, 'the green fuse is gone from the row');
  assert.match(WORKOUT, /popCell\(si, 'weight'/, 'the weight cell lost its value-pop');
  assert.match(WORKOUT, /popCell\(si, 'reps'/, 'the reps cell lost its value-pop');
  assert.match(WORKOUT, /styles\.checkCurrentPressed/, 'the check lost its press answer');
});

/* ── 6 · W9-A10 — THE PO'S CRITIQUE PASS ─────────────────────────────────────────────────────────── */

test('⚠ the plinth figures sit BELOW the set row\'s numerals, or the hierarchy inverts', () => {
  /* The whole point of the resize. The row's own numerals are 20pt (`fieldNum`); at 24 the plinth
     out-shouted the thing the athlete is actually doing. Any future bump has to keep this order. */
  // Deliberately loose about the two fallback steps — those are a width calculation and will move
  // again; the TOP size is the hierarchy claim and is what this test is about.
  const plinth = Number(WORKOUT.match(/const size = s\.length > \d+ \? \d+ : s\.length > \d+ \? \d+ : (\d+);/)?.[1]);
  const field = Number(WORKOUT.match(/fieldNum: \{ fontFamily: flFont\.display, fontSize: (\d+)/)?.[1]);
  assert.ok(Number.isFinite(plinth) && Number.isFinite(field), 'could not read both type sizes');
  assert.ok(plinth <= 21, `the plinth figure is back up to ${plinth}pt — the PO asked for ~10-15% off 24`);
  assert.ok(plinth - field <= 1, `plinth ${plinth}pt vs row ${field}pt — Level 2 is shouting over Level 4 again`);
});

test('the three plinth columns are one structure — label, value, sub-line', () => {
  const plinth = WORKOUT.slice(WORKOUT.indexOf('<View style={styles.plinth}>'), WORKOUT.indexOf('</TourAnchor>', WORKOUT.indexOf('<View style={styles.plinth}>')));
  assert.equal((plinth.match(/styles\.plinthLabelRow/g) ?? []).length, 3, 'a column lost its label row');
  assert.equal((plinth.match(/styles\.plinthSub|styles\.plinthRead/g) ?? []).length, 3, 'a column lost its sub-line');
  // The label must name what the value IS. "Last Time" reads as a third statistic.
  assert.match(plinth, />Last Note</, 'the note column no longer says it holds a note');
  assert.ok(!/>Last Time</.test(plinth), '"Last Time" is back — it does not say the value is a note');
});

test('⚠ the figures are spaced, and the size thresholds count the SPACED string', () => {
  // `spacedFigure` adds two characters. Measuring the compact form would keep `185 × 5` at a size it
  // no longer fits, which is the clipping this function exists to prevent.
  assert.match(WORKOUT, /const spacedFigure = \(s: string\): string => s\.replace\(\/×\/g, ' × '\);/, 'the spacing helper is gone');
  assert.match(WORKOUT, /plinthFigureStyle\(spacedFigure\(goalText\)\)/, 'the goal is sized off the unspaced string');
  assert.match(WORKOUT, /\$\{setWeightLabelLb\(liftHist\.best\.weight, units\)\} × \$\{liftHist\.best\.reps\}/, 'Best lost its spaces');
  // The collapsed strip keeps the COMPACT form — 11pt has no room for the spaces.
  assert.match(WORKOUT, /Goal <Text style=\{styles\.heroStripGoal\}>\{goalText\}<\/Text>/, 'the collapsed strip is now spacing its goal too');
});

test('an empty weight field says what it wants, not just that it is empty', () => {
  assert.match(WORKOUT, /<Text style=\{styles\.emDashUnit\}>\{unitLabel\(units\)\}<\/Text>/, 'the em-dash lost its unit affordance');
  // Quieter than the faded ask beside it — a unit must not read as a value somebody entered.
  assert.match(WORKOUT, /emDashUnit: \{ fontSize: 10\.5, fontWeight: '600', color: flColor\.charcoal500 \}/, 'the unit is no longer quieter than the ask');
});

test('the bottom actions read as a bar the screen ends at', () => {
  const bar = WORKOUT.match(/\n  bottom: \{[\s\S]*?\n  \},/)?.[0] ?? '';
  assert.ok(bar, 'the bottom bar style is gone');
  assert.match(bar, /backgroundColor: flColor\.charcoal800/, 'the bar sank back to the canvas colour');
  assert.match(bar, /borderTopColor: flColor\.charcoal600/, 'the edge softened back to a seam');
  assert.match(bar, /boxShadow: '0 -\d+px \d+px/, 'the upward shadow is gone — content no longer passes behind it');
});

test('the hint says the thing in as few words as it can', () => {
  assert.match(WORKOUT, /<Text style=\{styles\.tableHint\}>Tap weight or reps to edit\.<\/Text>/, 'the hint grew back');
});

test('a hold still gets a clock instead of a reps box', () => {
  assert.match(
    WORKOUT,
    /\{isCurrent && set\.targetSec != null \? \([\s\S]{0,240}<HoldTimer/,
    'the hold timer no longer stands in for the Reps field',
  );
});
