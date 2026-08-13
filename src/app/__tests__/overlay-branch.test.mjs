import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A SHEET MUST BE MOUNTED IN THE SAME RENDER BRANCH AS THE BUTTON THAT OPENS IT.
 *
 * `workout-complete.tsx` is a set of early returns — seal · capture · record. "Save this day as a
 * template" sits on the Record step; the naming sheet it opens was written once, at the bottom of the
 * file, inside the LAST branch. Record returned long before that line, so pressing the button set state
 * that nothing rendered and the screen did nothing at all. Every layer beneath it — the handler, the
 * data module, the `save_workout_as_template` RPC, the `workout_templates` table and its RLS — was
 * correct, and had been for weeks. The defect was three feet of JSX away from anything a database
 * migration could reach.
 *
 * This is a SOURCE test, in the same spirit as `route-guard`: the rule it guards is structural, so it
 * is checked against the structure rather than mocked at runtime.
 *
 * ⚠ THE BRANCH SET CHANGED and this test changed with it. The flow used to be seal · record · reflect ·
 * share; Reflect and Share are now SHEETS on a new `capture` stage, which means three more sheets on one
 * screen and three more chances to mount one in the wrong place. That is the rule below, not the story.
 *
 * The second half of the file guards a sibling failure — a screen that OPENS but never renders, which
 * from the outside is indistinguishable from a screen that refuses to open. Both classes are invisible
 * to tsc, to lint, and to every unit test in this repo, because nothing about them is wrong until you
 * look at the running app.
 */

const SRC = fs.readFileSync(path.join(process.cwd(), 'src/app/workout-complete.tsx'), 'utf8');

const STAGES = ['seal', 'capture', 'record'];

/** The span of one `if (stage === 'x') { ... }` early-return branch. */
function branchSpan(stage) {
  const start = SRC.indexOf(`if (stage === '${stage}')`);
  assert.notEqual(start, -1, `workout-complete no longer has a '${stage}' branch — update this test with the screen`);
  const rest = SRC.slice(start + 1);
  const nextIf = rest.indexOf('if (stage === ');
  return SRC.slice(start, nextIf === -1 ? SRC.length : start + 1 + nextIf);
}

/** Occurrences of a literal string, without having to escape it into a regex. */
const count = (haystack, needle) => haystack.split(needle).length - 1;

/** Code only. A comment describing the behaviour a test forbids must not fail that test. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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

/*
 * ══ THE RULE, NOT THE INSTANCE ══
 *
 * Naming `templateNameSheet` specifically guards the bug that happened and nothing else. Four more
 * sheets have arrived on this screen since — the session rename, and the note / playlist / share sheets
 * that replaced the Reflect and Share steps — and every one of them was just as free to be declared in
 * the wrong branch.
 *
 * So the rows are DATA. Adding a sheet to this screen means adding one line here, and forgetting to is
 * itself caught: `every sheet on this screen is guarded` fails on any `const …Sheet =` that no row
 * covers. `mount` is the literal opening tag, because not every sheet on this screen is a `BottomSheet`
 * keyed on a boolean — the playlist sheet is mounted conditionally (its draft fields seed on mount) and
 * the share sheet is a component of its own.
 */
const SHEETS = [
  { sheet: 'templateNameSheet', trigger: 'openTemplateName', mount: '<BottomSheet open={nameOpen}' },
  { sheet: 'renameSheet', trigger: 'openRename', mount: '<BottomSheet open={renameOpen}' },
  { sheet: 'noteSheet', trigger: 'openNote', mount: "<BottomSheet open={sheet === 'note'}" },
  { sheet: 'playlistSheet', trigger: "setSheet('playlist')", mount: '<PlaylistSheet' },
  { sheet: 'shareSheet', trigger: "setSheet('share')", mount: '<ShareSessionSheet' },
];

test('every branch that can open a sheet also mounts it', () => {
  // The general form of the rule, so adding an offer to another stage cannot reintroduce the bug.
  for (const { sheet, trigger } of SHEETS) {
    for (const stage of STAGES) {
      const span = branchSpan(stage);
      if (!span.includes(trigger)) continue;
      assert.ok(span.includes(`{${sheet}}`), `the '${stage}' branch opens ${sheet} without mounting it`);
    }
  }
});

test('each sheet is built once and shared, not copied per branch', () => {
  // Two copies would drift: one would keep the autofocus, or the 60-char cap, or the submit handler,
  // and the other would quietly stop matching it.
  for (const { sheet, mount } of SHEETS) {
    const declarations = SRC.match(new RegExp(`const ${sheet} =`, 'g')) ?? [];
    assert.equal(declarations.length, 1, `${sheet} should be declared exactly once`);
    assert.equal(count(SRC, mount), 1, `\`${mount}\` should appear only inside ${sheet}`);
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

/*
 * ══ STAGE 1 HAS NO TRAILING ACTION, AND THAT IS THE POINT OF THE REDESIGN ══
 *
 * The seal screen's only job is "you finished, it is sealed". Share used to be a glyph in its top-right
 * corner and nobody found it; the fix was not to make the glyph louder but to move sharing to the stage
 * that comes AFTER closure, where it is the one filled button. So the guard is that nothing on the seal
 * branch opens a sheet at all — the next thing that gets "just quietly added to the completion screen"
 * fails here rather than in review.
 */
test('the seal stage offers no sheets', () => {
  const seal = branchSpan('seal');
  for (const { sheet, trigger } of SHEETS) {
    assert.ok(!seal.includes(trigger), `the seal stage opens ${sheet} — Stage 1 takes no additions, see the handoff §3`);
  }
  assert.ok(!seal.includes('ShareChip'), 'the corner share chip is back on the seal screen — it belongs on the capture stage');
});

/*
 * ⚠ THE SEAL MUST NOT LEAVE THE SCREEN. Holding used to `goHome()`, which is why every optional
 * addition had to be offered BEFORE the ceremony instead of after it. If that ever regresses, the
 * capture stage becomes unreachable and the note, the photo, the playlist and Share all silently go
 * with it — with no error anywhere, because each of them still works if you can get to it.
 */
test('completing the seal lands on the capture stage', () => {
  const start = SRC.indexOf('const startHold =');
  assert.notEqual(start, -1, 'startHold is gone — move this assertion to whatever completes the seal');
  // Comments stripped, so the note explaining what the seal USED to do can't fail the test guarding it.
  const body = stripComments(SRC.slice(start, SRC.indexOf('const cancelHold =', start)));
  assert.ok(body.includes("setStage('capture')"), 'the seal no longer opens the capture stage');
  assert.ok(!body.includes('goHome'), 'the seal navigates away again — the capture stage is now unreachable');
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
