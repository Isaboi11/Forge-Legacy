/**
 * nav-routes.test.mjs — STEP B route-mapping guard.
 * Asserts the 5-tab shell matches Forge Home.dc.html tabItems EXACTLY (order,
 * labels, hrefs), that the emphasized tab is Legacy, that every tab route file
 * exists, and — the specific bug we're guarding against — that `/workout` (the
 * active session Home's "Start Workout" pushes to) stays DISTINCT from the
 * `/workouts` tab root (never mis-routing Start Workout to the catalog).
 *
 * Run:  node --test src/components/__tests__/nav-routes.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..'); // src/components
const APP = join(SRC, '..', 'app');
const tabs = readFileSync(join(SRC, 'app-tabs.tsx'), 'utf8');

/** Ordered (name, href) pairs from the TabTrigger elements. */
function tabTriggers() {
  const out = [];
  const re = /<TabTrigger\s+name="([^"]+)"\s+href="([^"]+)"/g;
  let m;
  while ((m = re.exec(tabs)) !== null) out.push({ name: m[1], href: m[2] });
  return out;
}

const EXPECTED = [
  { name: 'home', href: '/', label: 'Home' },
  { name: 'workouts', href: '/workouts', label: 'Workouts' },
  { name: 'legacy', href: '/legacy', label: 'Legacy' },
  { name: 'squads', href: '/squads', label: 'Squads' },
  { name: 'community', href: '/community', label: 'Community' },
];

test('exactly 5 tabs in the handoff order, with correct names + hrefs', () => {
  const triggers = tabTriggers();
  assert.equal(triggers.length, 5, 'expected 5 tabs');
  assert.deepEqual(
    triggers,
    EXPECTED.map((e) => ({ name: e.name, href: e.href })),
  );
});

test('labels match the dc (incl. "Workouts" plural)', () => {
  for (const e of EXPECTED) {
    assert.ok(tabs.includes(`label="${e.label}"`), `missing tab label: ${e.label}`);
  }
});

test('Legacy is the emphasized (centre) tab', () => {
  assert.match(tabs, /label="Legacy"\s+emphasized/);
  // and it is positioned 3rd of 5 (the centre)
  assert.equal(tabTriggers()[2].name, 'legacy');
});

test('/workout (active session) is DISTINCT from the /workouts tab root', () => {
  const hrefs = tabTriggers().map((t) => t.href);
  assert.ok(hrefs.includes('/workouts'), 'tab root should be /workouts');
  assert.ok(!hrefs.includes('/workout'), '/workout must NOT be a tab href');
});

test("Home's Start Workout still routes to /workout (not the catalog)", () => {
  const home = readFileSync(join(APP, 'index.tsx'), 'utf8');
  assert.match(home, /router\.push\(['"]\/workout['"]\)/, 'Start Workout should push /workout');
  assert.ok(!/router\.push\(['"]\/workouts['"]\)/.test(home), 'Start Workout must not push /workouts');
});

test('every tab route file exists (+ the distinct /workout session route)', () => {
  for (const f of ['index.tsx', 'workouts.tsx', 'legacy.tsx', 'squads.tsx', 'community.tsx', 'workout.tsx']) {
    assert.ok(existsSync(join(APP, f)), `missing route: app/${f}`);
  }
});
