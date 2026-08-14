import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EVERY VALUE IMPORTED FROM `react-native` MUST EXIST IN `react-native-web`.
 *
 * ══ WHAT THIS IS GUARDING, AND WHY IT IS A WHITE SCREEN RATHER THAN A BUG ══
 *
 * `CoachChatSheet.tsx` and `HoltMark.tsx` imported `useAnimatedValue` from `react-native`. React Native
 * ships it. **react-native-web does not implement it at all.** So on web the import resolved to
 * `undefined`, calling it threw
 *
 *     Uncaught TypeError: (0, b.useAnimatedValue) is not a function
 *
 * during RENDER — and an uncaught throw in render unmounts the tree. The PO hit it on the exercise
 * picker (which mounts the Holt mark) and got a blank page, twice, with no error visible in the app.
 *
 * ⚠ NOTHING IN THIS REPO'S GATES COULD SEE IT. `tsc` is correct — the export genuinely exists in React
 *   Native's types, so the TYPES are right and the RUNTIME is not. Lint has no opinion. No unit test
 *   renders a component. The web bundle BUILT CLEANLY, because the bundler resolves `react-native` to
 *   `react-native-web` at alias time and never checks that the named binding is actually there.
 *
 * ⚠ THIS IS THE MIRROR OF THE `useSafeAreaInsets` CRASH. That one shipped with tsc, 1,420 tests, lint and
 *   the web build all green, and broke only on DEVICE, because web had a DOM fallback that did not throw.
 *   This is the same class pointing the other way: correct on device, fatal on web. The lesson recorded
 *   then was "green on web ≠ working on device"; the other half is now written down too.
 *
 * ══ WHY THIS IS GENERAL RATHER THAN A BAN LIST ══
 *
 * Banning `useAnimatedValue` by name would close this one hole and leave the class open — React Native
 * adds APIs faster than react-native-web adopts them, and the next one will look exactly as innocent.
 * So the parity list is READ FROM `react-native-web` ITSELF at test time. If the package later adds an
 * API, this test starts allowing it with no edit; if it drops one, this test starts failing on the code
 * that uses it. Neither case needs a human to remember.
 */

const ROOT = process.cwd();

// ── what react-native-web actually exports ───────────────────────────────────
//
// The entry is a flat list of re-exports — `export { default as Name } from './exports/Name'` — plus a
// few bare `export { Name }` forms. Both are parsed. If react-native-web ever restructures its entry
// into something this cannot read, the assertion below fires rather than silently allowing everything,
// which is the failure mode that matters: a parity check that parses nothing passes everything.
const RNW_ENTRY = path.join(ROOT, 'node_modules/react-native-web/dist/index.js');

function reactNativeWebExports() {
  const src = fs.readFileSync(RNW_ENTRY, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const raw of m[1].split(',')) {
      const spec = raw.trim();
      if (!spec) continue;
      // `default as Foo` → Foo · `Foo as Bar` → Bar · `Foo` → Foo. The EXPORTED name is what a caller
      // can import, so it is always the last identifier in the specifier.
      const parts = spec.split(/\s+as\s+/);
      const name = parts[parts.length - 1].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
    }
  }
  return names;
}

// ── what we import from `react-native` ───────────────────────────────────────

/**
 * ⚠ COMMENTS ARE STRIPPED FIRST, AND THAT IS NOT COSMETIC. The two files fixed above now carry long
 *   comments explaining why `useAnimatedValue` must not be used — a raw-text scan would read those as
 *   usages and fail on the very files that document the fix. This repo has been bitten by exactly that
 *   before: a source guard matched commented-out SQL as present and stayed green through a deletion.
 */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

function sourceFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') sourceFiles(p, out);
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** Every VALUE imported by name from 'react-native', with the file it came from. */
function namedReactNativeImports() {
  const found = [];
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]react-native['"]/g)) {
      // `import type { X }` is erased before it ever reaches a browser, so it cannot crash anything.
      if (m[1]) continue;
      for (const raw of m[2].split(',')) {
        const spec = raw.trim();
        if (!spec) continue;
        // Inline `{ type Foo, Bar }` — the `type` ones are erased too.
        if (/^type\s/.test(spec)) continue;
        const name = spec.split(/\s+as\s+/)[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name)) {
          found.push({ name, file: path.relative(ROOT, file).replace(/\\/g, '/') });
        }
      }
    }
  }
  return found;
}

// ── the tests ────────────────────────────────────────────────────────────────

test('the parity list is actually readable — a check that parses nothing passes everything', () => {
  const exports = reactNativeWebExports();
  assert.ok(
    exports.size > 40,
    `only parsed ${exports.size} exports from react-native-web; its entry format has changed and this ` +
      `test can no longer see anything. Fix the parser — do not delete the test.`,
  );
  // Spot-check three that must always be there, so a parser that returns plausible garbage is caught.
  for (const anchor of ['View', 'Animated', 'StyleSheet']) {
    assert.ok(exports.has(anchor), `react-native-web should export ${anchor} — the parser is wrong`);
  }
});

test('this repo imports at least a few things from react-native — the scan is not looking at nothing', () => {
  const imports = namedReactNativeImports();
  assert.ok(imports.length > 50, `only found ${imports.length} react-native imports; the scan is broken`);
});

test('⚠ every value imported from react-native exists in react-native-web', () => {
  const exports = reactNativeWebExports();
  const missing = namedReactNativeImports().filter((i) => !exports.has(i.name));

  const detail = missing
    .map((m) => `  ${m.name}  ← ${m.file}`)
    .join('\n');

  assert.equal(
    missing.length,
    0,
    `These are imported from 'react-native' and DO NOT EXIST in react-native-web. On web each one is\n` +
      `\`undefined\`, and calling it throws during render — which is a WHITE SCREEN, not a broken\n` +
      `component. tsc cannot see this: the types are correct and the runtime is not.\n\n${detail}\n\n` +
      `Fix by using an equivalent that exists on both. For \`useAnimatedValue(x)\` the codebase's own\n` +
      `pattern is \`const [v] = useState(() => new Animated.Value(x))\` — stable across renders, and\n` +
      `unlike \`useRef(...).current\` it does not trip the react-compiler rule about reading a ref\n` +
      `during render.`,
  );
});

test('the comment stripper does not read an explanation as a usage', () => {
  // The regression this guards: the two files fixed on 2026-08-14 document `useAnimatedValue` at length
  // in their headers. A raw scan fails on them; a correct one does not.
  const withOnlyAComment = `
    /* Do not import useAnimatedValue from 'react-native' — it is web-fatal. */
    // import { useAnimatedValue } from 'react-native';
    import { View } from 'react-native';
  `;
  const stripped = stripComments(withOnlyAComment);
  assert.ok(!stripped.includes('useAnimatedValue'), 'comments must be removed before matching');
  assert.ok(stripped.includes('View'), 'real code must survive the strip');
});
