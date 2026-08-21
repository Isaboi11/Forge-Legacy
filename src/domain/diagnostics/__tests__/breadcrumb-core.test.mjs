import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_CRUMBS,
  MAX_MESSAGE,
  MAX_STACK,
  crumbDetail,
  crumbLabel,
  crumbRoute,
  fingerprintError,
  hash32,
  makeCrumb,
  normalizeMessage,
  pushCrumb,
  sanitizeMessage,
  sanitizeName,
  sanitizeStack,
  topFrame,
} from '../breadcrumb-core.ts';

/**
 * A breadcrumb trail is stored in the same database as `app_events`, so it lives under the same promise:
 * `Docs/Legal/Privacy-Policy.md` § 2 says a usage record never contains what the athlete wrote.
 *
 * These tests are what make that checkable for the diagnostic path. A failure in the first block is not a
 * cosmetic bug — it is the app storing something the policy says it does not store.
 *
 * The second block is about whether the dashboard is READABLE. An error tracker that emits one row per
 * occurrence is a firehose, and a firehose gets ignored, which costs exactly as much as having nothing.
 */

// ── the promise ──────────────────────────────────────────────────────────────

test('nothing the athlete WROTE survives as a crumb label or detail', () => {
  assert.equal(crumbLabel('Push Day A'), null, 'a workout name is prose');
  assert.equal(crumbLabel('felt strong today'), null);
  assert.equal(crumbDetail('I hurt my shoulder doing this'), undefined);
  assert.equal(crumbDetail('Isaiah Altamirano'), undefined);
  assert.equal(crumbDetail('  '), undefined);
});

test('enum-shaped labels and ids DO survive — they are the whole point', () => {
  assert.equal(crumbLabel('screen_view'), 'screen_view');
  assert.equal(crumbLabel('onboarding_continue'), 'onboarding_continue');
  assert.equal(crumbLabel('rpc_failed'), 'rpc_failed');
  assert.equal(crumbDetail('PGRST202'), 'PGRST202');
  assert.equal(crumbDetail('barbell_bench_press'), 'barbell_bench_press');
  assert.equal(crumbDetail(42), '42');
});

test('a route is reduced to its SHAPE, never the instance the athlete opened', () => {
  assert.equal(crumbRoute('/squad/9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8'), '/squad/[id]');
  assert.equal(crumbRoute('/challenge/1274'), '/challenge/[id]');
  assert.equal(crumbRoute('/exercise-library?q=how+do+i+bench'), '/exercise-library', 'the query string is where a search term rides in');
  assert.equal(crumbRoute('/onboarding'), '/onboarding');
});

test('a label cannot smuggle a sentence in through an allowed shape', () => {
  // The label regex permits `/`, `[`, `]` and `:` so route-ish and code-ish values pass. Whitespace is
  // what separates an identifier from prose, and it is rejected at every door.
  assert.equal(crumbLabel('squad/[id] was opened by me'), null);
  assert.equal(makeCrumb('action', 'note: felt great'), null);
});

// ── the ring ─────────────────────────────────────────────────────────────────

test('the buffer is capped and drops the OLDEST', () => {
  let buf = [];
  for (let i = 0; i < MAX_CRUMBS + 15; i += 1) {
    buf = pushCrumb(buf, { t: i, type: 'action', label: `step_${i}` });
  }
  assert.equal(buf.length, MAX_CRUMBS);
  assert.equal(buf[buf.length - 1].label, `step_${MAX_CRUMBS + 14}`, 'the newest is kept');
  assert.equal(buf[0].label, 'step_15', 'the oldest is gone');
});

test('⚠ a render loop COLLAPSES instead of eating the window that holds the cause', () => {
  // This is the case the whole design turns on. Without collapsing, 500 identical crumbs push the
  // preceding trail out and every report of the worst bug class arrives with its evidence overwritten.
  let buf = pushCrumb([], { t: 0, type: 'action', label: 'sign_in_submitted' });
  buf = pushCrumb(buf, { t: 1, type: 'route', label: '/onboarding' });
  for (let i = 0; i < 500; i += 1) {
    buf = pushCrumb(buf, { t: 2 + i, type: 'route', label: '/onboarding' });
  }

  assert.equal(buf.length, 2, 'five hundred repeats are one crumb');
  assert.equal(buf[0].label, 'sign_in_submitted', 'the cause is still in the trail');
  assert.equal(buf[1].n, 501);
  assert.equal(buf[1].t, 501, 'the timestamp is the LATEST occurrence, so the duration is honest');
});

test('only CONSECUTIVE repeats collapse — an A/B/A loop stays visible as a loop', () => {
  let buf = [];
  for (let i = 0; i < 3; i += 1) {
    buf = pushCrumb(buf, { t: i * 2, type: 'route', label: '/onboarding' });
    buf = pushCrumb(buf, { t: i * 2 + 1, type: 'action', label: 'onboarding_continue' });
  }
  assert.equal(buf.length, 6, 'alternating crumbs are distinct events, not a repeat');
});

test('pushCrumb never mutates the buffer it was handed', () => {
  const original = [{ t: 0, type: 'route', label: '/home' }];
  const frozen = Object.freeze([...original]);
  const next = pushCrumb(frozen, { t: 1, type: 'route', label: '/legacy' });
  assert.equal(frozen.length, 1);
  assert.equal(next.length, 2);
});

// ── grouping: is the dashboard readable ──────────────────────────────────────

test('the SAME bug hit by two athletes is ONE fingerprint', () => {
  const stack = 'TypeError: x\n    at Program (src/app/program/[id].tsx:88:19)\n    at renderWithHooks (node_modules/react/index.js:1)';
  const a = fingerprintError('TypeError', "Cannot read property 'name' of undefined", stack);
  const b = fingerprintError('TypeError', "Cannot read property 'name' of undefined", stack);
  assert.equal(a, b);
});

test('the same bug carrying DIFFERENT ids is still one fingerprint', () => {
  const stack = 'Error\n    at load (src/data/programs-live.ts:41:9)';
  const a = fingerprintError('Error', 'row 9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8 not found', stack);
  const b = fingerprintError('Error', 'row 11111111-2222-3333-4444-555555555555 not found', stack);
  assert.equal(a, b, 'an id is which athlete hit it, not which bug it is');
});

test('two DIFFERENT bugs do not collide into one row', () => {
  const a = fingerprintError('TypeError', "Cannot read property 'name' of undefined", 'at A (src/app/a.tsx:1:1)');
  const b = fingerprintError('TypeError', "Cannot read property 'reps' of undefined", 'at B (src/app/b.tsx:9:1)');
  assert.notEqual(a, b);
});

test('the top frame prefers OUR code over the framework that re-threw it', () => {
  const stack = [
    'TypeError: undefined is not an object',
    '    at renderWithHooks (node_modules/react-native/index.js:11:2)',
    '    at commitRoot (node_modules/react/cjs/react.js:44:9)',
    '    at ProgramScreen (src/app/program/[id].tsx:88:19)',
  ].join('\n');
  // Every React error's first frames are identical framework noise, so grouping on them groups nothing.
  assert.match(topFrame(stack), /src[/\\]app[/\\]program/);
});

test('the top frame drops the column but keeps the line', () => {
  assert.match(topFrame('    at Foo (src/app/foo.tsx:88:19)'), /foo\.tsx:88(?!:)/);
});

test('normalizeMessage groups on the FAULT, not on the numbers in it', () => {
  assert.equal(normalizeMessage('failed after 3 retries'), 'failed after [n] retries');
  assert.equal(normalizeMessage('GET https://x.supabase.co/rest/v1/programs 401'), 'GET [url] [n]');
  assert.equal(
    normalizeMessage('row 9f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8 missing'),
    'row [id] missing',
  );
});

test('hash32 is stable across runs and platforms', () => {
  // Pinned literals: if the algorithm is ever "improved", every historical fingerprint silently
  // re-groups and the dashboard's counts reset without anyone noticing. That should fail here first.
  assert.equal(hash32(''), '811c9dc5');
  assert.equal(hash32('a'), 'e40c292c');
  assert.equal(hash32('foobar'), 'bf9cf968');
});

// ── bounds: the insert must never bounce ─────────────────────────────────────

test('message and stack are trimmed to the column caps', () => {
  assert.equal(sanitizeMessage('x'.repeat(5000)).length, MAX_MESSAGE);
  assert.equal(sanitizeStack('y'.repeat(20000)).length, MAX_STACK);
});

test('a stack keeps its HEAD — the frames nearest the throw identify it', () => {
  const stack = ['at Culprit (src/app/culprit.tsx:1:1)', ...Array(2000).fill('at Noise (node_modules/x.js:1:1)')].join('\n');
  assert.match(sanitizeStack(stack), /^at Culprit/);
});

test('an empty or absent error still produces a storable row', () => {
  assert.equal(sanitizeMessage(undefined), 'Unknown error');
  assert.equal(sanitizeMessage(''), 'Unknown error');
  assert.equal(sanitizeName(undefined), 'Error');
  assert.equal(sanitizeName('a whole sentence somehow'), 'Error', 'the name column stays filterable');
  assert.equal(sanitizeStack(undefined), null);
  assert.equal(topFrame(undefined), '');
  // A report with nothing in it is still worth having: it says WHEN and WHERE, and the trail is intact.
  assert.equal(typeof fingerprintError(undefined, undefined, undefined), 'string');
});
