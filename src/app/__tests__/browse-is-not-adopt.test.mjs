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

test('adoption happens on Start, and only there', () => {
  const src = read('program/[id].tsx');
  const calls = src.match(/adoptCatalogProgram\(/g) ?? [];
  assert.equal(calls.length, 1, `expected exactly one adopt call, found ${calls.length}`);

  // It must sit after the terminal/active branches — i.e. in the branch that starts a program.
  const at = src.indexOf('adoptCatalogProgram(');
  const start = src.indexOf('await startProgram(');
  assert.ok(at > 0 && start > at, 'adoption must precede startProgram inside the Start branch');
});

test('a preview is never handed to a screen that needs a real program id', () => {
  // `/send-program`, the builder's edit and duplicate modes, and the max sheet all write against a row.
  // Reaching them from a preview would pass a definition slug where a uuid is required.
  const src = read('program/[id].tsx');
  for (const marker of ["o: 'edit'", "o: 'dup'", "'/send-program'", 'programId={']) {
    const i = src.indexOf(marker);
    if (i < 0) continue;
    const window = src.slice(Math.max(0, i - 1200), i);
    assert.ok(
      /owned/.test(window) || /program!\./.test(src.slice(i, i + 200)),
      `${marker} is reachable without an owned program`,
    );
  }
});
