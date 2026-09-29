// sentry-sync pure core. The function is deployed by pasting ONE file, so the core cannot live in its own
// module: this test cuts the block between the PURE CORE markers out of index.ts and evaluates it.
// Run: node --test supabase/functions/sentry-sync/__tests__/core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'index.ts'), 'utf8');
const START = '// ── PURE CORE START ──';
const END = '// ── PURE CORE END ──';
const a = src.indexOf(START);
const b = src.indexOf(END);
assert.ok(a > 0 && b > a, 'PURE CORE markers missing from index.ts');
const block = src.slice(a + START.length, b);
const core = new Function(
  `${block}\nreturn { mapIssue, mapTrail, formatStack, nextCursor, mostRecent, eventEnvironment, releaseOf, TRAIL_MAX, LABEL_MAX };`,
)();

test('mapIssue: shortId, count as string → int, userCount, dates, permalink; env/release null when absent', () => {
  const row = core.mapIssue({
    id: '4501', shortId: 'FORGE-LEGACY-1A', title: 'TypeError: x is undefined', culprit: 'app/(tabs)/index',
    level: 'error', status: 'unresolved', count: '37', userCount: 4,
    firstSeen: '2026-09-20T10:00:00Z', lastSeen: '2026-09-28T09:00:00Z',
    permalink: 'https://forge-legacy-llc.sentry.io/issues/4501/',
  });
  assert.deepEqual(row, {
    id: '4501', short_id: 'FORGE-LEGACY-1A', title: 'TypeError: x is undefined', culprit: 'app/(tabs)/index',
    level: 'error', status: 'unresolved', environment: null, event_count: 37, user_count: 4,
    first_seen: '2026-09-20T10:00:00Z', last_seen: '2026-09-28T09:00:00Z',
    permalink: 'https://forge-legacy-llc.sentry.io/issues/4501/', release: null,
  });
  const r2 = core.mapIssue({ id: 7, count: 'n/a', environment: 'production', release: { version: '1.0.0+9' } });
  assert.equal(r2.id, '7');
  assert.equal(r2.event_count, 0);
  assert.equal(r2.user_count, 0);
  assert.equal(r2.environment, 'production');
  assert.equal(r2.release, '1.0.0+9');
  assert.equal(r2.title, '(untitled issue)');
});

test('mapTrail: navigation → route, else message, else category; last 12; 120-char trim', () => {
  const values = [];
  for (let i = 0; i < 15; i++) values.push({ category: 'ui.click', message: `tap ${i}` });
  values.push({ category: 'navigation', data: { from: '/a', to: '/(tabs)/workouts' } });
  values.push({ category: 'app.lifecycle' });
  values.push({ category: 'console', message: 'x'.repeat(300) });
  const trail = core.mapTrail({ entries: [{ type: 'message' }, { type: 'breadcrumbs', data: { values } }] });
  assert.equal(trail.length, core.TRAIL_MAX);
  assert.deepEqual(trail.at(-3), { label: '/(tabs)/workouts', kind: 'navigation' });
  assert.deepEqual(trail.at(-2), { label: 'app.lifecycle', kind: 'app.lifecycle' });
  assert.equal(trail.at(-1).label.length, core.LABEL_MAX);
  assert.equal(trail[0].label, 'tap 6'); // tap 0..5 dropped: only the last 12 survive
  assert.deepEqual(core.mapTrail({}), []);
  assert.deepEqual(core.mapTrail({ entries: [{ type: 'breadcrumbs', data: {} }] }), []);
});

test('mapTrail NEVER leaks a breadcrumb data body (AA-D13)', () => {
  const secret = 'bench 225x5 bodyweight 81kg me@example.com';
  const ev = {
    entries: [{
      type: 'breadcrumbs',
      data: {
        values: [
          { category: 'fetch', type: 'http', data: { url: '/rest/v1/sets', body: secret, method: 'POST' } },
          { category: 'xhr', data: { body: { weight: 81, note: secret } } },
          // A non-navigation crumb with a `to` must not be read as a route either.
          { category: 'ui.input', data: { to: secret, value: secret } },
          { category: 'navigation', data: { to: '/log', params: { note: secret }, body: secret } },
        ],
      },
    }],
  };
  const trail = core.mapTrail(ev);
  const dump = JSON.stringify(trail);
  assert.ok(!dump.includes('bench'), dump);
  assert.ok(!dump.includes('81'), dump);
  assert.ok(!dump.includes('example.com'), dump);
  assert.deepEqual(trail.map((t) => t.label), ['fetch', 'xhr', 'ui.input', '/log']);
  assert.ok(trail.every((t) => Object.keys(t).sort().join() === 'kind,label'));
});

test('formatStack: "Type: value" then last 8 frames, newest first', () => {
  const frames = [];
  for (let i = 1; i <= 10; i++) frames.push({ function: `fn${i}`, filename: `app/f${i}.tsx`, lineNo: i * 10 });
  frames.push({ module: 'react-native/Renderer' }); // no function/line
  const ev = { entries: [{ type: 'exception', data: { values: [{ type: 'TypeError', value: 'x is undefined', stacktrace: { frames } }] } }] };
  const lines = core.formatStack(ev).split('\n');
  assert.equal(lines[0], 'TypeError: x is undefined');
  assert.equal(lines.length, 9);
  assert.equal(lines[1], '? (react-native/Renderer)');
  assert.equal(lines[2], 'fn10 (app/f10.tsx:100)');
  assert.equal(lines[8], 'fn4 (app/f4.tsx:40)');
  assert.equal(core.formatStack({ entries: [] }), null);
  assert.equal(core.formatStack({ entries: [{ type: 'exception', data: { values: [{ type: 'Error' }] } }] }), 'Error');
});

test('nextCursor: follows rel="next" only when results="true"', () => {
  const more = '<https://sentry.io/api/0/projects/o/p/issues/?&cursor=0:0:1>; rel="previous"; results="false"; cursor="0:0:1", '
    + '<https://sentry.io/api/0/projects/o/p/issues/?&cursor=0:100:0>; rel="next"; results="true"; cursor="0:100:0"';
  assert.equal(core.nextCursor(more), '0:100:0');
  const done = more.replace('results="true"', 'results="false"');
  assert.equal(core.nextCursor(done), null);
  assert.equal(core.nextCursor(null), null);
  assert.equal(core.nextCursor(''), null);
});

test('mostRecent + event helpers', () => {
  const rows = [
    { id: 'a', last_seen: '2026-09-01T00:00:00Z' },
    { id: 'b', last_seen: '2026-09-28T00:00:00Z' },
    { id: 'c', last_seen: '2026-09-15T00:00:00Z' },
  ];
  assert.deepEqual(core.mostRecent(rows, 2).map((r) => r.id), ['b', 'c']);
  assert.equal(rows[0].id, 'a'); // input not reordered
  assert.equal(core.eventEnvironment({ tags: [{ key: 'level', value: 'error' }, { key: 'environment', value: 'production' }] }), 'production');
  assert.equal(core.eventEnvironment({}), null);
  assert.equal(core.releaseOf('1.0.0+9'), '1.0.0+9');
  assert.equal(core.releaseOf({ version: 'com.forge@1.0.0+9' }), 'com.forge@1.0.0+9');
  assert.equal(core.releaseOf(null), null);
});
