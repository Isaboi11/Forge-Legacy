/**
 * root-overlays.test.mjs — anything rendered beside the navigator, and what it is allowed to depend on.
 *
 * ══ THE SHIPPED CRASH THIS EXISTS FOR ══
 *
 * `CoachBubble` renders as a sibling of the navigator, so it is on screen for every route. It called
 * `useSafeAreaInsets()`, which **throws** when no `SafeAreaProvider` is above it — and there was none at
 * that level. Every screen gets one from react-navigation's `SafeAreaProviderCompat` INSIDE the navigator;
 * nothing outside it had ever needed insets before. The bubble threw on first render and the app would not
 * launch on device.
 *
 * ⚠ AND EVERY CHECK WAS GREEN. It did not reproduce on web, because `react-native-safe-area-context` ships
 * a DOM implementation that reads real metrics instead of throwing. Typecheck passed, 1,420 tests passed,
 * lint passed, the web build was perfect — and the phone showed a blank screen. There was no automated
 * signal at all, which is exactly why this file is a static assertion about the tree rather than a
 * behavioural test: the property that matters cannot be observed anywhere the test runner can reach.
 *
 * Run:  node --test --experimental-strip-types src/app/__tests__/root-overlays.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, '..', rel), 'utf8');

const layout = read('_layout.tsx');

test('the root layout provides a safe area', () => {
  assert.match(
    layout,
    /<SafeAreaProvider/,
    'anything rendered beside the navigator that asks for insets throws without this',
  );
  assert.match(layout, /from 'react-native-safe-area-context'/);
});

test('the safe area provider wraps the whole tree, not part of it', () => {
  const open = layout.indexOf('<SafeAreaProvider');
  const navigator = layout.indexOf('<RootNavigator />');
  const close = layout.indexOf('</SafeAreaProvider>');
  assert.ok(open > 0 && navigator > 0 && close > 0, 'all three markers must exist');
  assert.ok(open < navigator, 'the provider must open before the navigator');
  assert.ok(navigator < close, 'and close after it');
});

/**
 * The general rule, not a patch for one component: a global decoration must never be able to take the app
 * down. The safe-area fix removes today's cause; the boundary removes the category.
 */
test('every overlay rendered beside the navigator sits inside a boundary', () => {
  const overlays = ['<CoachBubble />'];
  for (const overlay of overlays) {
    const i = layout.indexOf(overlay);
    assert.ok(i > 0, `${overlay} is no longer rendered — update this list`);
    const before = layout.slice(Math.max(0, i - 500), i);
    const after = layout.slice(i, i + 300);
    assert.match(before, /<OverlayBoundary>/, `${overlay} must be wrapped in an OverlayBoundary`);
    assert.match(after, /<\/OverlayBoundary>/);
  }
});

test('the boundary renders nothing rather than something, when it catches', () => {
  const src = readFileSync(path.join(here, '../../components/overlay-boundary.tsx'), 'utf8');
  assert.match(src, /getDerivedStateFromError/, 'it must actually be an error boundary');
  assert.match(
    src,
    /failed \? null :/,
    'a failed overlay is absent — a fallback UI for a decoration is noise about something nobody asked for',
  );
});
