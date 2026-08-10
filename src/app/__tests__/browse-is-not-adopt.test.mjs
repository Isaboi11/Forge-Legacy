import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * LOOKING AT A PROGRAM IS NOT TAKING IT ON.
 *
 * Built-in programs have no database row. Program Detail needed an id to load, so browsing the catalog
 * called `adoptCatalogProgram` purely to produce one — which INSERTS a `programs` row. The consequence
 * was that opening a program to read it put "Planned" on the athlete's list, for a plan they had never
 * chosen. The PO hit it doing the one thing a catalog exists to invite: having a look.
 *
 * Nothing was broken in any layer beneath. The write succeeded, the row was correct, the screen rendered
 * it faithfully. The defect was that the write happened at all, and no test in this repo could see it —
 * a navigation that quietly creates a record is invisible to tsc, to lint, and to every unit test, and
 * only shows up as a list with something in it you did not put there.
 *
 * So the rule is structural and is checked against the structure, in the same spirit as `route-guard`
 * and `overlay-branch`: the CATALOG BROWSE surfaces may not adopt. Adoption belongs to Start, which is
 * the first moment the athlete has said they want the program.
 *
 * `(tabs)/index.tsx` is deliberately NOT on this list. Home's "accept this recommendation" adopts AND
 * starts in one motion, which is correct — accepting is a choice, not a glance.
 */

// `fileURLToPath`, not `url.pathname` — this repo lives under a directory with a space in its name, and
// the raw pathname arrives percent-encoded.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..');
const read = (f) => fs.readFileSync(path.join(APP, f), 'utf8');

/** Screens whose job is to let the athlete LOOK at programs. */
const BROWSE_SURFACES = ['(tabs)/workouts.tsx'];

test('browsing the catalog never adopts a program', () => {
  for (const f of BROWSE_SURFACES) {
    const src = read(f);
    assert.ok(
      !/adoptCatalogProgram/.test(src),
      `${f} calls adoptCatalogProgram — opening a program would put it on the athlete's list unasked`,
    );
  }
});

test('Program Detail renders a catalog program without reading or writing a row', () => {
  const src = read('program/[id].tsx');

  // The preview path is what makes browsing free: a definition slug, resolved from shipped content.
  assert.match(src, /previewDef/, 'no preview path — Program Detail still requires a saved row');
  assert.match(src, /getProgramDefinition\(id\)/, 'preview must resolve from the shipped definition');

  // And the fetch must be skipped for it, or "no row" becomes a failed lookup and an error screen.
  assert.match(
    src,
    /if \(previewDef\) \{[\s\S]{0,200}?setLoading\(false\);[\s\S]{0,40}?return;/,
    'the focus effect must short-circuit for a preview rather than fetching a row that does not exist',
  );
});

/** Comments stripped: a source guard that a COMMENT can trip is one a comment can also satisfy. */
const codeOf = (f) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

test('adoption happens where the athlete asked for it, through one call', () => {
  const src = codeOf('program/[id].tsx');
  const calls = src.match(/adoptCatalogProgram\(/g) ?? [];
  assert.equal(calls.length, 1, `expected exactly one adopt call, found ${calls.length}`);

  /*
   * TWO DOORS, ONE WRITE. Start and "Add to Planned" both take a Forge program — the first begins it,
   * the second queues it — and both go through `adoptPreview`. Keeping the actual call to exactly one
   * is what lets this test mean anything: two call sites and "adoption only happens when asked" stops
   * being checkable. Browsing still adopts nothing, which is the rule that matters.
   */
  assert.match(src, /const adoptPreview = async/, 'both doors must adopt through one helper');
  assert.match(src, /const onAddToPlanned = async/, 'there must be a way to plan a program without starting it');

  // The write must still sit ahead of the start, so starting resumes the row rather than forking one.
  const at = src.indexOf('adoptCatalogProgram(');
  const start = src.indexOf('await startProgram(');
  assert.ok(at > 0 && start > at, 'adoption must precede startProgram inside the Start branch');
});

/**
 * The same defect, one press further in. Start adopts BEFORE the max gate (the gate writes the run's
 * frozen maxes and needs a row to write them to), so closing that gate without answering would leave
 * exactly the "Planned" program on the list that browsing used to leave. The adoption is provisional
 * until the athlete answers or the program starts.
 */
test('backing out of the max gate takes the row with it', () => {
  const src = read('program/[id].tsx');

  assert.match(src, /provisionalRef/, 'no provisional adoption — abandoning the max gate keeps the row');

  // A REF, not state: LiftMaxSheet calls onSaved then onClose in the same tick, both closing over the
  // same render, so a state flag cleared in the first still reads as set in the second — and the screen
  // would delete the program the athlete had just answered for.
  assert.match(src, /useRef<string \| null>\(null\)/, 'provisional id must be a ref, not state');

  // Cleared on both ways of keeping it, and acted on when the gate closes.
  const saved = src.indexOf('onSaved={');
  assert.ok(saved > 0 && /provisionalRef\.current = null/.test(src.slice(saved, saved + 400)), 'answering the gate must clear the provisional id');
  assert.match(src, /await startProgram\(row\.id\);\s*\n\s*provisionalRef\.current = null/, 'starting must clear the provisional id');
  assert.match(src, /onClose=\{\(\) => \{[\s\S]{0,160}?discardProvisional\(\)/, 'the gate’s close must discard an unkept adoption');

  // And discarding is a real delete, not just forgetting the id.
  const disc = src.indexOf('const discardProvisional');
  assert.ok(disc > 0 && /await deleteProgram\(id\)/.test(src.slice(disc, disc + 600)), 'discard must delete the row');
});

test('a preview is never handed to a screen that needs a real program id', () => {
  // `/send-program`, the builder's edit and duplicate modes, and the max sheet all write against a row.
  // Reaching them from a preview would pass a definition slug where a uuid is required.
  const src = read('program/[id].tsx');
  for (const marker of ["o: 'edit'", "o: 'dup'", "'/send-program'", 'programId={']) {
    const i = src.indexOf(marker);
    if (i < 0) continue;
    /* ⚠ A PROXIMITY HEURISTIC, and it needs saying. This looks BACKWARDS from the marker for the guard
       that encloses it, so the window has to be wide enough to clear whatever commentary sits between
       them. It was 1200 and broke on a comment — Edit gained a paragraph explaining why a Forge program
       cannot be edited, and the guard slid out of range while still being right there in the source.
       Widened rather than made exact: parsing JSX to prove enclosure would be a worse test than this. */
    const window = src.slice(Math.max(0, i - 3000), i);
    assert.ok(
      // A conditional render is the STRONGEST of the three and was not originally listed: `program!.`
      // is a type assertion that compiles away, so it proves the author's intent and nothing about
      // runtime. `{program ? …}` means the handler cannot be constructed without a row at all. Edit and
      // Duplicate moved to this form in 0123, when Edit was gated to future-state programs.
      /\{program \?/.test(window) || /owned/.test(window) || /program!\./.test(src.slice(i, i + 200)),
      `${marker} is reachable without an owned program`,
    );
  }
});

/**
 * W-5 Decision 1: Edit is a FUTURE-state action. Its permission matrix reads NO for Active on every row,
 * because an active program's structure has begun writing history — `program_sessions` rows are keyed by
 * (week_index, day_index) and graduation compares against a denominator recomputed from the structure.
 *
 * This screen gated Edit on `terminal` (graduated / ended_early) instead, so it rendered on a live
 * program. Asserted here rather than left to review: the two spellings look almost identical in a diff,
 * and the one that shipped could irrevocably graduate someone (see migration 0123).
 */
test('Edit is offered on a future program and on no other', () => {
  const src = read('program/[id].tsx');
  const i = src.indexOf("o: 'edit'");
  assert.ok(i > 0, 'the Edit action must still exist');

  const window = src.slice(Math.max(0, i - 1200), i);
  assert.match(window, /state === 'future'/, 'Edit must be gated on future state');
  assert.ok(
    !/\{terminal \? null :/.test(window),
    'gating Edit on `terminal` lets it through on an ACTIVE program — the W-5 Decision 1 violation',
  );
});
