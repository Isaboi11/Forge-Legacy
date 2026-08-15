/**
 * A NATIVE-ONLY PACKAGE MUST NEVER BE REACHABLE FROM THE WEB BUNDLE.
 *
 * ══ WHAT THIS GUARDS ══
 *
 * `react-native-maps` has no web build. Importing it on web throws at MODULE LOAD, before any component
 * renders — so the failure is a white page on `forgelegacy.expo.app`, which is the surface the PO tests.
 * The mitigation is a `.web.tsx` sibling: Metro resolves `Foo.web.tsx` ahead of `Foo.tsx` when bundling
 * for web, so the native file is never evaluated there.
 *
 * ⚠ NOTHING ELSE IN THIS REPO CAN SEE A MISSING SIBLING. `tsc` type-checks the native file and is
 *   correct to. Lint has no opinion. `react-native-web-parity.test.mjs` reads the `react-native` export
 *   list and this is a different package entirely. The web bundle may even BUILD, because the failure is
 *   at require time in the browser rather than at bundle time.
 *
 * This is the same shape as the `useAnimatedValue` white screen and the `useSafeAreaInsets` device
 * crash: a gate that is green on one platform and fatal on the other. The lesson recorded both times was
 * that the two platforms need separate proof, and this is that proof for native-only dependencies.
 *
 * ⚠ TO ADD A PACKAGE HERE: any dependency with no browser build belongs in `NATIVE_ONLY`. Getting the
 *   list wrong in the SAFE direction (listing something that does work on web) costs a redundant `.web`
 *   file. Getting it wrong the other way costs a white screen nobody sees until a PO opens the link.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

/** Packages that throw, or render nothing, in a browser. */
const NATIVE_ONLY = ['react-native-maps'];

/** Every source file, minus the web variants themselves and the tests. */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.web\.(ts|tsx)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const FILES = walk(SRC);

test('every file importing a native-only package has a .web sibling', () => {
  const offenders = [];
  for (const file of FILES) {
    const src = fs.readFileSync(file, 'utf8');
    const imports = NATIVE_ONLY.filter((pkg) => new RegExp(`from ['"]${pkg}['"]`).test(src));
    if (imports.length === 0) continue;
    const web = file.replace(/\.(tsx|ts)$/, '.web.$1');
    if (!fs.existsSync(web)) {
      offenders.push(`${path.relative(ROOT, file)} imports ${imports.join(', ')} but has no ${path.basename(web)}`);
    }
  }
  assert.deepEqual(offenders, [], `these would white-screen the web preview:\n  ${offenders.join('\n  ')}`);
});

test('⚠ the guard is actually watching something', () => {
  // A list that matches nothing passes forever and proves nothing. If react-native-maps is removed from
  // the project, delete it from NATIVE_ONLY too rather than leaving a guard that cannot fire.
  const anyImporter = FILES.some((f) =>
    NATIVE_ONLY.some((pkg) => new RegExp(`from ['"]${pkg}['"]`).test(fs.readFileSync(f, 'utf8'))),
  );
  assert.equal(anyImporter, true, 'no file imports any NATIVE_ONLY package — the list is stale');
});

test('a .web sibling does NOT itself import the native-only package', () => {
  // The fallback existing is not the point; the fallback being web-safe is. A `.web.tsx` that imports
  // the same package is a longer route to the same white screen.
  const offenders = [];
  for (const file of FILES) {
    const web = file.replace(/\.(tsx|ts)$/, '.web.$1');
    if (!fs.existsSync(web)) continue;
    const src = fs.readFileSync(web, 'utf8');
    for (const pkg of NATIVE_ONLY) {
      if (new RegExp(`from ['"]${pkg}['"]`).test(src)) {
        offenders.push(`${path.relative(ROOT, web)} imports ${pkg}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the two halves of RouteMap agree on their props', () => {
  // They are resolved interchangeably by the bundler, so a prop one accepts and the other ignores is a
  // difference that only shows up on one platform — the exact class this file exists for.
  const native = fs.readFileSync(path.join(SRC, 'components/workout/RouteMap.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(SRC, 'components/workout/RouteMap.web.tsx'), 'utf8');
  assert.match(native, /export interface RouteMapProps/, 'the native file owns the prop type');
  assert.match(web, /RouteMapProps/, 'the web file must be typed by the SAME props, not its own guess');
  assert.match(web, /export function RouteMap\(/, 'and must export the same name');
});
