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

test('Prev is a column with its own header, not a subline — and the column stayed 76', () => {
  /* ⚠ W9-A13 REVERSES A11-D4's SPELLING BUT NOT ITS WIDTH, AND THE SPLIT IS THE POINT. A11 widened
     `cPrev` 66 → 76 for TWO reasons: `PREVIOUS` needed ~56pt of heading, and `prevVal` is 14.5pt
     display so a metric athlete's `102.5 × 8` measures ~72pt and was overflowing 66. A13 shortens the
     word; only the first reason went away. Re-narrowing the column to 66 clips the figure again. */
  assert.match(WORKOUT, /<Text style=\{\[styles\.h, styles\.cSet, styles\.hCentered\]\}>Set<\/Text>/, 'the Set heading is not centred over its ring');
  assert.match(WORKOUT, /<Text style=\{\[styles\.h, styles\.cPrev\]\}>Prev<\/Text>/, 'the Prev heading changed');
  assert.match(WORKOUT, /cPrev: \{ width: 76, flexGrow: 0, flexShrink: 0 \}/, '⚠ the Prev column was re-narrowed — 102.5 × 8 clips at 66');
  /* The unit prints inside every weight field already; in the heading it cost a second line. */
  assert.match(WORKOUT, /<Text style=\{\[styles\.h, styles\.cWeight, styles\.hCentered\]\}>Weight<\/Text>/, 'the Weight heading is not the bare word');
  assert.ok(!/>Weight · \{unitLabel/.test(WORKOUT), 'the unit is back in the Weight heading — it wraps to two lines there');
  /* ⚠ THE HEADER MUST KEEP THE ROWS' HORIZONTAL PADDING OR EVERY LABEL SITS INBOARD OF ITS CELL.
     A13 asked for `11px 14px 9px`; 14 would put the header 10pt off the rows, which is the defect the
     instruction exists to fix. Both stay at 4. */
  const head = WORKOUT.slice(WORKOUT.indexOf('headRow: {'), WORKOUT.indexOf('},', WORKOUT.indexOf('headRow: {')));
  const rowAt = WORKOUT.indexOf('row: { flexDirection');
  const row = WORKOUT.slice(rowAt, WORKOUT.indexOf('},', rowAt));
  const pad = (b) => Number(b.match(/paddingHorizontal: (\d+)/)?.[1]);
  assert.equal(pad(head), pad(row), 'the header and the rows no longer share a horizontal inset — the labels have drifted off their cells');
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

test('the three plinth cells still share a label row — and only the NOTE lost its sub-line', () => {
  /* ⚠ W9-A12 DELETED `Read note`, WHICH A10-D2 HAD MADE THE NOTE'S THIRD LINE. That is a deliberate
     narrowing of A10's "all three, no exceptions", not a regression: the two FIGURE cells still carry
     label + value + sub, and the note cell trades its printed link for the whole-cell tap it already
     had. The tap is asserted separately below and is the thing that must never go. */
  const plinth = WORKOUT.slice(WORKOUT.indexOf('<View style={styles.plinth}>'), WORKOUT.indexOf('</TourAnchor>', WORKOUT.indexOf('<View style={styles.plinth}>')));
  assert.equal((plinth.match(/styles\.plinthLabelRow/g) ?? []).length, 3, 'a cell lost its label row');
  assert.equal((plinth.match(/styles\.plinthSub/g) ?? []).length, 2, 'Goal and Best must both keep a sub-line');
  assert.ok(!/plinthRead/.test(WORKOUT), '`Read note` is back — A12 replaced the link with the cell tap');
  // The label must name what the value IS. "Last Time" reads as a third statistic.
  assert.match(plinth, />Note</, 'the note cell no longer says it holds a note');
  assert.ok(!/>Last Time</.test(plinth), '"Last Time" is back — it does not say the value is a note');
});

test('⚠ the plinth figures are TIGHT, and the Previous column is not', () => {
  /* ⚠ A12 REVERSES A10-D1a. A10 opened the figures to `3 × 8` at 24pt, where the cell had the room;
     A12 sets them at 19pt in a 0.85fr cell and spells the format out as `3×8`. `spacedFigure` is
     deleted rather than left uncalled — a helper with no consumer is how a retired format comes back. */
  assert.ok(!/spacedFigure/.test(WORKOUT), 'the spacing helper is back — A12 sets the plinth figures tight');
  assert.match(WORKOUT, /plinthFigureStyle\(goalText\)/, 'the goal is no longer sized off the string it renders');
  assert.match(WORKOUT, /\$\{setWeightLabelLb\(liftHist\.best\.weight, units\)\}×\$\{liftHist\.best\.reps\}/, 'Best is spaced again');
  /* ⚠ THE SET ROW IS THE EXCEPTION AND MUST STAY ONE. `Previous` has 76pt (A11-D4) and there the
     spaces are what stop `45×8` reading as a single number. Two formats, two widths, on purpose. */
  assert.match(WORKOUT, /\$\{setWeightLabelLb\(p\.weight, units\)\} × \$\{p\.reps\}|prevText/, 'the row lost its spaced Previous figure');
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

/* ── 7 · W9-A11 — THE HERO BECOMES A STAGE AND THE PLINTH STEPS BACK AGAIN ───────────────────────── */

test('⚠ the plate is a fixed 150 × 212 stage, and it CROPS rather than letterboxes', () => {
  /* ⚠ W9-A12 OVERRIDES W9-A11-D1. A11 made this a stretching `minHeight` precisely so a bigger
     picture would cost the set table no height; A12 sets a literal fixed size instead and accepts the
     ~120pt taller card that comes with it. Both are the PO's; the later one governs. */
  const slot = WORKOUT.slice(WORKOUT.indexOf('mediaSlot: {'), WORKOUT.indexOf('},', WORKOUT.indexOf('mediaSlot: {')));
  assert.ok(slot, 'the media slot style is gone');
  assert.match(slot, /width: 150/, 'the plate lost its spec width');
  assert.match(slot, /height: 212/, 'the plate lost its spec height');
  assert.ok(!/minHeight/.test(slot), 'the plate is stretching again — A12 fixes both dimensions');
  assert.match(slot, /flexGrow: 0, flexShrink: 0/, 'the plate can be squeezed by the text rail');
  /* ⚠ THE PALETTE IS THE PRE-A12 ONE AND THAT IS THE POINT. The spec asked for `--fl-surface-recessed`
     and `--fl-border-inset`; PO afterwards: *"All the coloring we should keep as before. No coloring
     changes."* A12 is a LAYOUT pass — it moved the geometry and handed the palette back. Asserted so
     nobody "finishes" the spec by re-applying a ground that was reverted on purpose. */
  assert.match(slot, /backgroundColor: flColor\.charcoal600/, 'the plate ground changed — A12 was layout only');
  assert.match(slot, /rgba\(181, 138, 97/, 'the bronze glow was removed again — the PO kept the colouring as it was');
  /* ⚠ `contain`, AND THIS ONE IS A HARD FLOOR — PO: *"I want the full animation in there."*
     `deliver_forge.py` normalises every loop to height 300 and lets the width land where it lands, so
     aspect ratio is per-clip. Measured over 96 clips: min 0.327 (ring-muscle-up), median 0.800, max
     3.640 (foam-roll-lats) — an 11× spread that NO fixed plate can `cover` without cutting the
     movement in half. Changing this back crops the athlete out of their own demonstration. */
  assert.match(WORKOUT, /<ExerciseLoop[\s\S]{0,160}contentFit="contain"/, '⚠ the demo is cropping again — an 11× aspect spread means cover cuts movements in half');
  assert.ok(!/contentFit="cover"/.test(WORKOUT), 'a cover fit is back on this screen');
});

test('⚠ How To is a pill anchored to the foot of the rail, and BOTH its faces survive', () => {
  /* ⚠ TWO PROPERTIES, TWO DIFFERENT BUGS (W9-A13). `marginTop: 'auto'` eats the rail's vertical slack
     so the pill lands level with the bottom of the 212pt plate at any title length — without it the
     dead space under the meta stack comes back, which is the whole reason A13 exists. `alignSelf:
     flex-start` stops the pill stretching to the rail's width — without it, it is a bar again. And
     BOTH depend on `heroMeta` stretching; a rail only as tall as its own text gives `auto` no slack. */
  const bar = WORKOUT.slice(WORKOUT.indexOf('howTo: {'), WORKOUT.indexOf('howToText:'));
  assert.ok(bar, 'the How To style is gone');
  assert.match(bar, /marginTop: 'auto'/, '⚠ the pill is no longer pushed to the foot of the rail — the gap is back');
  assert.match(bar, /alignSelf: 'flex-start'/, '⚠ the pill will stretch to the rail width — that is the bar again');
  assert.match(bar, /borderRadius: flRadius\.pill/, 'the pill lost its radius');
  assert.match(WORKOUT, /heroMeta: \{[^}]*alignSelf: 'stretch'/, "⚠ the rail stopped stretching — marginTop:auto has no slack to eat");
  assert.ok(!/heroRow1/.test(WORKOUT), 'the A12 column wrapper is back — the block holds one row now');
  /* Both colour faces, and the copy that goes with them. */
  assert.match(WORKOUT, /howToFirst: \{ borderColor: flColor\.bronzeBorder, backgroundColor: flColor\.bronzeTint \}/, 'the first-time face lost its colouring');
  assert.match(WORKOUT, /liftHist \? null : styles\.howToFirst/, 'the first-time face is no longer applied');
  assert.match(WORKOUT, /liftHist \? 'How To' : "First time — here's how"/, 'the first-time copy was dropped');
});

test('⚠ an un-entered rep count reads as a suggestion — by OPACITY, not by a new colour', () => {
  /* PO: the goal rep count rendered *"at the same strength as a real entry"*. The fix is 0.35 on the
     digit and nothing else — the brief says *"opacity is the only difference"* and forbids colour
     changes, so the W9-A9 three-ink ladder underneath is untouched and asserted elsewhere. */
  assert.match(WORKOUT, /const repsSuggested = !isDone && !repsAnswered;/, 'the suggestion state is gone');
  assert.match(WORKOUT, /fieldNumSuggested: \{ opacity: 0\.35 \}/, 'the suggestion dim changed — or grew a colour of its own');
  assert.match(WORKOUT, /repsSuggested && styles\.fieldNumSuggested/, 'the dim is not applied to the reps digit');
  // It must ride ON TOP of the ladder, never replace it.
  assert.match(WORKOUT, /\{ color: repsColor \}, repsSuggested && styles\.fieldNumSuggested/, 'the dim replaced the state ink instead of riding on it');
});

test('the scroll reserves room for the coach coin, and does not double-count the safe area', () => {
  /* coin bottom 82 + height 52 − bar (14 + 48) = 72 of intrusion, + 16 clearance = 88. ⚠ `barBottom`
     cancels: the coin and the bar both ride it, so adding it here would reserve ~150pt of dead space. */
  assert.match(WORKOUT, /scroll: \{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 88, gap: 14 \}/, 'the coach-coin clearance changed');
  assert.match(WORKOUT, /styles\.holtWrap, \{ bottom: 82 \+ barBottom \}/, '⚠ the coin moved — re-derive the scroll padding above');
});

test('⚠ the plinth figure is 19 and STILL sits under the set row numerals', () => {
  /* A10's hierarchy claim is the one thing that has survived every resize: 24 → 21 → 17 → 19, and at
     every step the plinth must not out-shout the row the athlete is actually filling in. */
  const top = Number(WORKOUT.match(/const size = s\.length > \d+ \? \d+ : s\.length > \d+ \? \d+ : (\d+);/)?.[1]);
  const field = Number(WORKOUT.match(/fieldNum: \{ fontFamily: flFont\.display, fontSize: (\d+)/)?.[1]);
  assert.equal(top, 19, `the plinth figure is ${top}pt — W9-A12 specifies 19`);
  assert.ok(top - field <= 1, `plinth ${top}pt vs row ${field}pt — Level 2 is shouting over Level 4 again`);
  /* Label and sub-line are set by the spec too, and are NOT derived from the figure. */
  assert.match(WORKOUT, /plinthLabel: \{ fontSize: 9\.5,/, 'the plinth label left its spec size');
  assert.match(WORKOUT, /plinthSub: \{ fontSize: 10, lineHeight: 14,/, 'the plinth sub-line left its spec size');
  assert.match(WORKOUT, /plinthNote: \{ fontSize: 11\.5,/, 'the note body left its spec size');
});

test('the bottom strip is 0.85 / 0.85 / 1.3, and collapses to two cells with no note', () => {
  assert.match(WORKOUT, /plinthColFirst: \{ flex: 0\.85/, 'the Goal cell lost its share');
  assert.match(WORKOUT, /plinthColBest: \{ flex: 0\.85 \}/, 'the Best cell lost its share');
  assert.match(WORKOUT, /plinthColWide: \{ flex: 1\.3/, 'the Note cell lost its share');
  /* ⚠ THE WHOLE CELL GOES when there is no note — border and all — rather than standing as a
     labelled em-dash. `plinthColRuled` lives on the cell, so removing the cell removes its rule. */
  assert.match(WORKOUT, /\{plinthNote \? \(/, 'the note cell is no longer conditional');
  assert.match(WORKOUT, /styles\.plinthColWide, pressed && styles\.plinthColPressed/, 'the note cell stopped being the tap target');
});

test('the rest panel moved DOWN toward the thumb, and was deliberately not centred', () => {
  /* The PO asked whether to centre it. No: it drops in under the band chip it demotes into, it is
     ~265pt tall so centred it covers set rows 3–8 rather than the first two, and `restPinned` keeps
     it up for the whole session. 200 buys the reach without any of that. */
  const top = Number(WORKOUT.match(/restOverlayWrap: \{ position: 'absolute', top: (\d+),/)?.[1]);
  assert.ok(Number.isFinite(top), 'the rest overlay lost its anchor');
  assert.ok(top > 118, `the panel is back at ${top} — the controls are out of one-handed reach again`);
  assert.ok(top < 300, `the panel is at ${top} — that is the centre, and it parks over the set table when pinned`);
});
