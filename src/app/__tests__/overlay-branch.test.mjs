import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A SHEET MUST BE MOUNTED IN THE SAME RENDER BRANCH AS THE BUTTON THAT OPENS IT.
 *
 * `workout-complete.tsx` is four early returns — seal · record · reflect · share. "Save this day as a
 * template" sits on the Record step; the naming sheet it opens was written once, at the bottom of the
 * file, inside the LAST branch. Record returns long before that line, so pressing the button set state
 * that nothing rendered and the screen did nothing at all. Every layer beneath it — the handler, the
 * data module, the `save_workout_as_template` RPC, the `workout_templates` table and its RLS — was
 * correct, and had been for weeks. The defect was three feet of JSX away from anything a database
 * migration could reach.
 *
 * This is a SOURCE test, in the same spirit as `route-guard`: the rule it guards is structural, so it
 * is checked against the structure rather than mocked at runtime.
 *
 * The second half of the file guards a sibling failure — a screen that OPENS but never renders, which
 * from the outside is indistinguishable from a screen that refuses to open. Both classes are invisible
 * to tsc, to lint, and to every unit test in this repo, because nothing about them is wrong until you
 * look at the running app.
 */

const SRC = fs.readFileSync(path.join(process.cwd(), 'src/app/workout-complete.tsx'), 'utf8');

/** The span of one `if (step === 'x') { ... }` early-return branch. */
function branchSpan(step) {
  const start = SRC.indexOf(`if (step === '${step}')`);
  assert.notEqual(start, -1, `workout-complete no longer has a '${step}' branch — update this test with the screen`);
  const rest = SRC.slice(start + 1);
  const nextIf = rest.indexOf('if (step === ');
  return SRC.slice(start, nextIf === -1 ? SRC.length : start + 1 + nextIf);
}

test('the Record branch renders the template naming sheet it can open', () => {
  const record = branchSpan('record');
  assert.ok(
    record.includes('openTemplateName'),
    'the trigger moved — if "Save this day as a template" is no longer on Record, move this assertion with it',
  );
  assert.ok(
    record.includes('{templateNameSheet}'),
    'the Record step can open the naming sheet but does not mount it — pressing the button will do nothing',
  );
});

test('the sheet is built once and shared, not copied per branch', () => {
  // Two copies would drift: one would keep the autofocus, or the 60-char cap, or the submit handler,
  // and the other would quietly stop matching it.
  const declarations = SRC.match(/const templateNameSheet =/g) ?? [];
  assert.equal(declarations.length, 1, 'templateNameSheet should be declared exactly once');
  const inlineSheets = SRC.match(/<BottomSheet open=\{nameOpen\}/g) ?? [];
  assert.equal(inlineSheets.length, 1, 'the naming BottomSheet should exist only inside templateNameSheet');
});

/*
 * ══ THE RULE, NOT THE INSTANCE ══
 *
 * Everything above names `templateNameSheet` specifically, which guards the bug that happened and
 * nothing else. A second sheet arrived on this screen — `renameSheet`, for naming the session itself —
 * and would have been just as free to be declared in the wrong branch.
 *
 * So the pairs are DATA now. Adding a sheet to this screen means adding one line here, and forgetting
 * to is itself caught: `every sheet on this screen is guarded` fails on any `const …Sheet =` that no
 * row covers.
 */
const SHEETS = [
  { sheet: 'templateNameSheet', trigger: 'openTemplateName', openState: 'nameOpen' },
  { sheet: 'renameSheet', trigger: 'openRename', openState: 'renameOpen' },
];

test('every branch that can open a sheet also mounts it', () => {
  // The general form of the rule, so adding an offer to another step cannot reintroduce the bug.
  for (const { sheet, trigger } of SHEETS) {
    // 'share' is the fallthrough, not an `if (step === …)` branch, so it has no span to slice.
    for (const step of ['seal', 'record', 'reflect']) {
      const span = branchSpan(step);
      if (!span.includes(trigger)) continue;
      assert.ok(span.includes(`{${sheet}}`), `the '${step}' branch opens ${sheet} without mounting it`);
    }
  }
});

test('each sheet is built once and shared, not copied per branch', () => {
  for (const { sheet, openState } of SHEETS) {
    const declarations = SRC.match(new RegExp(`const ${sheet} =`, 'g')) ?? [];
    assert.equal(declarations.length, 1, `${sheet} should be declared exactly once`);
    const inline = SRC.match(new RegExp(`<BottomSheet open=\{${openState}\}`, 'g')) ?? [];
    assert.equal(inline.length, 1, `the ${openState} BottomSheet should exist only inside ${sheet}`);
  }
});

test('every sheet on this screen is guarded', () => {
  // Catches the failure this table introduces: a new sheet nobody added a row for.
  const declared = [...SRC.matchAll(/const (\w*Sheet) =/g)].map((m) => m[1]);
  const covered = new Set(SHEETS.map((s) => s.sheet));
  for (const name of declared) {
    assert.ok(covered.has(name), `${name} is declared on this screen but has no row in SHEETS — add one`);
  }
});


// ── LOADING GUARDS THAT SWALLOW THE NULL RESULT ─────────────────────────────────────────────────────
//
// `useQuery` resolves to `{ data: null, loading: false, error: null }` whenever a fetch legitimately
// returns nothing — a squad with no goal, a template that was deleted, a chapter you cannot see. A
// screen that gates its spinner on `loading || (!data && !error)` therefore spins FOREVER in exactly
// that case, and the not-found branch underneath it becomes unreachable.
//
// It cost a "the squad goal card wouldn't open" bug report: the route was fine, the tap fired, the
// navigation happened, and the screen sat on a spinner. `useQuery` already starts `loading: true`, so
// the extra clause buys nothing — there is no flash of "not found" to prevent.

const SCREEN_DIR = path.join(process.cwd(), 'src/app');

function screenFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...screenFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

test('no screen gates its spinner on a condition that a null result also satisfies', () => {
  const offenders = [];
  for (const file of screenFiles(SCREEN_DIR)) {
    const src = fs.readFileSync(file, 'utf8');
    // `loading || (!` — the shape that swallows it. Comments are stripped so the note explaining the
    // trap in the file that had it does not trip the test that guards against it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/loading\s*\|\|\s*\(\s*!/.test(code)) offenders.push(path.relative(process.cwd(), file));
  }
  assert.deepEqual(
    offenders,
    [],
    `these screens spin forever when their query resolves to null — gate on \`loading\` alone: ${offenders.join(', ')}`,
  );
});
