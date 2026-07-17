/**
 * nav-routes.test.mjs — STEP B route-mapping guard.
 * Asserts the 4-tab shell (Home · Workouts · Legacy · Squads — Community is shelved
 * until launch) with correct order, labels, and hrefs, that the emphasized tab is
 * Legacy, that every tab route file exists, and — the specific bug we're guarding
 * against — that `/workout` (the active session Home's "Start Workout" pushes to)
 * stays DISTINCT from the `/workouts` tab root (never mis-routing to the catalog).
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
];

test('exactly 4 tabs in order, with correct names + hrefs (Community shelved)', () => {
  const triggers = tabTriggers();
  assert.equal(triggers.length, 4, 'expected 4 tabs');
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
  // and it is positioned 3rd of 4 (the emphasized centre tile)
  assert.equal(tabTriggers()[2].name, 'legacy');
});

test('/workout (active session) is DISTINCT from the /workouts tab root', () => {
  const hrefs = tabTriggers().map((t) => t.href);
  assert.ok(hrefs.includes('/workouts'), 'tab root should be /workouts');
  assert.ok(!hrefs.includes('/workout'), '/workout must NOT be a tab href');
});

test("Home's fresh-athlete hero: Start Training → /workout (logger) · Browse Programs → /workouts (catalog)", () => {
  // The ONB-D17 isNew hero has two distinct actions. Start Training is the first-workout path — it must
  // reach the active-session LOGGER (/workout), never the catalog tab. Browse Programs is a separate,
  // intended affordance that DOES route to the catalog tab (/workouts). Both must be present and distinct.
  const home = readFileSync(join(APP, '(tabs)', 'index.tsx'), 'utf8');
  assert.match(home, /router\.push\(['"]\/workout['"]\)/, 'Start Training should push /workout (the logger)');
  assert.match(home, /router\.push\(['"]\/workouts['"]\)/, 'Browse Programs should push /workouts (the catalog)');
});

test('every tab route file exists in (tabs)/ (+ the distinct /workout session route at app root)', () => {
  for (const f of ['index.tsx', 'workouts.tsx', 'legacy.tsx', 'squads.tsx']) {
    assert.ok(existsSync(join(APP, '(tabs)', f)), `missing tab route: app/(tabs)/${f}`);
  }
  // /workout (active session) is a root-Stack sibling, NOT a tab — presents over the tabs full-screen.
  assert.ok(existsSync(join(APP, 'workout.tsx')), 'missing route: app/workout.tsx');
});

test('Community is SHELVED (reversibly): no tab, screen preserved non-routed, /community redirects to Home', () => {
  // no Community tab trigger
  assert.ok(!tabTriggers().some((t) => t.name === 'community'), 'Community tab must be removed');
  // the real screen is preserved outside the routed tree (for a clean re-enable)
  assert.ok(existsSync(join(SRC, '..', 'deferred', 'community.tsx')), 'deferred Community screen must be preserved');
  // it must NOT be back in the routed tab tree
  assert.ok(!existsSync(join(APP, '(tabs)', 'community.tsx')), 'Community must not be a routed tab screen');
  // stale /community links soft-redirect to Home instead of 404
  const redirect = readFileSync(join(APP, 'community.tsx'), 'utf8');
  assert.match(redirect, /Redirect\s+href="\/"/, '/community should soft-redirect to Home');
});
