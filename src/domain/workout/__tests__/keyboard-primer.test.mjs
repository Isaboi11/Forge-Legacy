import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * ══ A TEXT FIELD THAT CANNOT BE TYPED INTO, AND NOTHING THAT COULD SEE IT ══
 *
 * PO: *"When I go to log a run it's not letting me put in the time."*
 *
 * A browser raises the software keyboard only for a `focus()` issued INSIDE the user-gesture call stack.
 * React Native's `autoFocus` fires when the element MOUNTS — one commit after the tap that mounted it —
 * so any `autoFocus` field that is conditionally rendered by a tap handler focuses on iOS Safari and
 * silently shows no keyboard. The field looks completely live. Native has no such rule, which is why
 * twelve screens shipped this and every one of them worked in the simulator.
 *
 * ⚠ EVERY `BottomSheet` COUNTS, because it is a bare `<Modal visible={open}>` and RN's Modal renders
 * `null` while closed — its children genuinely do not exist at the moment of the tap.
 *
 * The fix is `KeyboardPrimer`: an always-mounted offscreen input focused synchronously inside the
 * gesture, which opens the keyboard so the real field can take it over on mount.
 *
 * ══ WHY THIS TEST IS A FILE-LEVEL PAIRING AND NOT A REAL PARSE ══
 *
 * The honest invariant — "this particular `autoFocus` is mounted by that particular tap handler" — needs
 * a JSX parse and a data-flow analysis, and there is no parser in this project's test rig. What is
 * cheaply checkable is the pairing: a file that mounts an `autoFocus` field behind a condition must also
 * reach for the primer. That is coarse in one direction (a file could prime for one field and forget
 * another) and it is exact in the direction that has actually gone wrong twice — somebody adds a sheet
 * with an `autoFocus` field and never learns the rule exists.
 *
 * The comment above `autoFocus` in each file is where the specific reasoning lives. This stops a NEW
 * file joining the list unnoticed.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SRC = join(ROOT, 'src');

/**
 * ⚠ COMMENTS OUT FIRST, ALWAYS.
 *
 * Every file touched by this fix EXPLAINS the fix, so the words `autoFocus`, `TextInput` and `setEditing`
 * all appear in prose in exactly the files that no longer do the thing. The first version of this test
 * failed on its own documentation — `CardioBlockCard` was reported as still using `autoFocus` because the
 * header says why it stopped. A source-scanning assertion that reads comments is testing the commentary.
 *
 * `//` is left alone when preceded by `:`, so a `https://` inside a string survives.
 */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Files whose `autoFocus` is on an ALWAYS-MOUNTED field — the whole screen is the route, so there is no
 * tap to be inside and no keyboard anybody expects to rise on arrival.
 *
 * `ForgeSearchInput` takes `autoFocus` as a prop defaulting to false and has no call site in `src/`
 * passing it; when one appears, that caller is the thing that needs the primer, not this file.
 */
const ALWAYS_MOUNTED = new Set([
  'src/app/custom-exercise.tsx',
  'src/components/forge/inputs/ForgeSearchInput.tsx',
]);

test('a field that mounts behind a tap primes the keyboard first', () => {
  const offenders = [];

  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (ALWAYS_MOUNTED.has(rel)) continue;

    const body = code(readFileSync(file, 'utf8'));
    const fields = (body.match(/\bautoFocus\b/g) ?? []).length;
    if (fields === 0) continue;

    // Conditionally mounted: a sheet/modal/overlay that opens, or a `{flag ? <TextInput/> : null}` swap.
    const conditional = /<BottomSheet\b/.test(body) || /\{\s*\w+[^\n]{0,80}\?\s*\(?\s*<(View|TextInput)/.test(body);
    if (!conditional) continue;

    /*
     * ⚠ COUNTED, NOT MERELY PRESENT — and this is the difference between a guard and a decoration.
     *
     * The first version asked only "does this file mention the primer anywhere", and mutation testing
     * killed it immediately: deleting the prime from `workout-complete`'s RENAME sheet left the one in
     * its TEMPLATE-NAME sheet, the file still matched, and the test stayed green over a field that had
     * gone back to being untypeable. A file with two `autoFocus` sheets has to prime twice.
     *
     * Still not a parse — it cannot tell that the right handler primes for the right field — but it is
     * exact about the regression that has actually happened: one of several sheets losing its prime.
     */
    const primes =
      (body.match(/primeKeyboard\(/g) ?? []).length + (body.match(/primerRef\.current\?\.focus\(\)/g) ?? []).length;

    if (primes < fields) offenders.push(`${rel} — ${fields} autoFocus field(s), ${primes} prime(s)`);
  }

  assert.deepEqual(
    offenders,
    [],
    'these mount an autoFocus field behind a tap without priming the keyboard — on iOS Safari the field ' +
      'focuses and no keyboard appears. See src/components/forge/KeyboardPrimer.tsx:\n  ' +
      offenders.join('\n  '),
  );
});

/**
 * ⚠ THE PRIMER'S INPUTS MUST STAY MOUNTED AND FOCUSABLE.
 *
 * `display: none`, `width: 0` or conditional rendering would each make `focus()` a silent no-op and turn
 * the whole mechanism off without failing anything else — the exact shape of the bug it exists to fix.
 * Offscreen-but-real is the only version that works.
 */
test('the primer inputs are offscreen rather than hidden, or they cannot take focus', () => {
  const src = code(readFileSync(join(SRC, 'components/forge/KeyboardPrimer.tsx'), 'utf8'));
  assert.match(src, /position: 'absolute'/);
  assert.match(src, /top: -1000/);
  assert.match(src, /width: 1, height: 1/, 'a zero-sized input cannot be focused');
  assert.doesNotMatch(src, /display: 'none'/, 'an undisplayed input cannot be focused');

  /* One primer per keyboard, because `keyboardType` is a state write and a state write does not land
     before the `focus()` on the next line. A single primer would raise whichever keyboard it was last
     configured for — which is how `workout.tsx`'s local one ends up offering a number pad for a name. */
  /* Counted by the offscreen STYLE rather than by `<TextInput`, which also matches the three
     `useRef<TextInput | null>` generics and reported six. */
  const mounted = src.match(/style=\{styles\.primer\}/g) ?? [];
  assert.equal(mounted.length, 3, 'expected exactly three primers: default, number-pad, decimal-pad');
  assert.match(src, /keyboardType="number-pad"/);
  assert.match(src, /keyboardType="decimal-pad"/);

  // A missing provider must lose the keyboard nicety, never take a screen down.
  assert.match(src, /createContext<PrimeKeyboard>\(noop\)/, 'the context must default to a no-op, not throw');
});

/**
 * The provider has to be mounted, or every `primeKeyboard()` in the app is a no-op that looks fine in
 * review and fails only on a phone.
 */
test('the primer is mounted at the root, above every screen that primes', () => {
  const layout = code(readFileSync(join(SRC, 'app/_layout.tsx'), 'utf8'));
  assert.match(layout, /<KeyboardPrimerProvider>/);
  assert.match(layout, /<\/KeyboardPrimerProvider>/);
  assert.match(layout, /import \{ KeyboardPrimerProvider \}/);
});

/**
 * ⚠ THE CARDIO FIELDS ARE ALWAYS-MOUNTED INPUTS, NOT A `Text` THAT SWAPS ON PRESS.
 *
 * This is the field the PO could not type a run time into. It needs no primer BECAUSE the input is
 * already on screen — tapping it focuses inside the gesture with nothing to work around. Reintroducing
 * the swap would bring the bug back and would read as a tidy-up.
 */
test('the cardio value field never goes back to swapping a Text for an input', () => {
  const src = code(readFileSync(join(SRC, 'components/workout/CardioBlockCard.tsx'), 'utf8'));
  assert.doesNotMatch(src, /\bautoFocus\b/, 'an always-mounted input must not need autoFocus');
  assert.doesNotMatch(src, /setEditing\(/, 'the Text→TextInput swap is what broke typing on iOS');
  /*
   * The input is rendered on the `typeable` PROP — a call-site capability, not a tap.
   *
   * ⚠ THE MATCH ALLOWS MARKUP BETWEEN THE BRANCH AND THE INPUT, and it did not before. It read
   * `\{typeable \? \(\s*<TextInput`, which is the shape of the code on the day it was written rather
   * than the rule it protects: the field grew a wrapping row and a pencil button — the input still
   * mounts on the prop, and the guard went red anyway. A source guard that fails on a refactor it does
   * not care about gets loosened in a hurry by whoever is mid-change, which is how a real one gets lost.
   * Bounded so it cannot stretch across the file and match some unrelated input further down.
   */
  assert.match(src, /\{typeable \? \([\s\S]{0,1500}?<TextInput/, 'the value must render as an input whenever it is typeable');
});
