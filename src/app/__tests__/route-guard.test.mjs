import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Every screen must be DECLARED inside a `<Stack.Protected>` block in `src/app/_layout.tsx`.
 *
 * This is not style. In expo-router a route is gated by being declared, not by existing:
 * `withLayoutContext` is called without `useOnlyUserDefinedScreens`, so the navigator includes every
 * file-based route, and `useSortedScreens` removes only the names gathered into `protectedScreens` —
 * which is populated ONLY from screens declared inside a `<Stack.Protected>` whose guard is false.
 * A screen nobody declared is never in that set, so no guard can exclude it, and it answers a typed
 * URL while signed out.
 *
 * Seventeen screens were reachable that way before this test existed. It is cheap to regress: add a
 * file to `src/app/`, forget one line in the layout, ship it. So the filesystem is the input and the
 * layout is checked against it, rather than a hand-kept list that would drift the same way.
 */

const APP_DIR = join(process.cwd(), 'src', 'app');
const LAYOUT = join(APP_DIR, '_layout.tsx');

/** Routes that are legitimately outside the app guard, each with the reason it is allowed out. */
const ALLOWED_OUTSIDE = new Map([
  ['sign-in', 'declared under the `auth` guard — it IS the signed-out destination'],
  ['onboarding', 'declared under the `onboarding` guard'],
  ['ceremony-harness', 'dev-only tool; redirects on !__DEV__ in the screen itself'],
  ['button-library-preview', 'dev-only design gallery; redirects on !__DEV__ in the screen itself'],
]);

/** Not screens: the layouts themselves and the web HTML shell. */
const NOT_A_SCREEN = new Set(['_layout', '+html', '(tabs)/_layout']);

function screenNames() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!entry.endsWith('.tsx')) continue;
      const name = p.slice(APP_DIR.length + 1).split(sep).join('/').replace(/\.tsx$/, '');
      if (NOT_A_SCREEN.has(name)) continue;
      // The tab group is declared as "(tabs)"; its children ride along with it.
      if (name.startsWith('(tabs)/')) continue;
      out.push(name);
    }
  };
  walk(APP_DIR);
  return out;
}

const layoutSrc = readFileSync(LAYOUT, 'utf8');
const declared = new Set([...layoutSrc.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]));

test('every screen is declared in _layout, so the auth guard can reach it', () => {
  const missing = screenNames().filter((n) => !declared.has(n) && !ALLOWED_OUTSIDE.has(n));
  assert.deepEqual(
    missing,
    [],
    `Not declared in src/app/_layout.tsx, so these answer a URL while SIGNED OUT:\n  ${missing.join('\n  ')}\n` +
      `Add <Stack.Screen name="..." /> inside the <Stack.Protected guard={route === 'app'}> block, ` +
      `or add it to ALLOWED_OUTSIDE here with the reason.`,
  );
});

test('a dev-only screen outside the guard defends itself with __DEV__', () => {
  for (const [name, reason] of ALLOWED_OUTSIDE) {
    if (!reason.includes('__DEV__')) continue;
    const src = readFileSync(join(APP_DIR, `${name}.tsx`), 'utf8');
    assert.match(
      src,
      /if\s*\(\s*!__DEV__\s*\)\s*return\s*<Redirect/,
      `${name} is outside the auth guard and must redirect on !__DEV__ — expo-router serves it by FILE, ` +
        `so "only reachable via router.push" is never true on web.`,
    );
  }
});

test('the tab group itself is guarded', () => {
  assert.ok(declared.has('(tabs)'), 'the (tabs) group must be declared inside the app guard');
});
