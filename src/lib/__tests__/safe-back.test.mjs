import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backFallbackFor, installSafeBack } from '../safe-back.ts';

// QA 09-26 B1: with no history (web refresh, shared link, notification) `router.back()` did nothing.

function fakeRouter(canGoBack) {
  const calls = [];
  return {
    calls,
    back: () => calls.push(['back']),
    canGoBack: () => canGoBack,
    replace: (to) => calls.push(['replace', to]),
  };
}

test('with history, back is the real back', () => {
  const r = fakeRouter(true);
  installSafeBack(r, () => '/honors');
  r.back();
  assert.deepEqual(r.calls, [['back']]);
});

test('with NO history, back replaces to the parent instead of doing nothing', () => {
  const cases = [
    ['/honors', '/'],
    ['/goals', '/legacy'],
    ['/chapter/abc', '/legacy'],
    ['/food-detail', '/nutrition'],
    ['/meal-plan', '/nutrition'],
    ['/squad-post/123', '/squads'],
    ['/squad-composer', '/squads'],
    ['/squad/abc/goal', '/squad/abc'],
    ['/program-builder', '/workouts'],
    ['/activity/xyz', '/activity-history'],
  ];
  for (const [here, parent] of cases) {
    const r = fakeRouter(false);
    installSafeBack(r, () => here);
    r.back();
    assert.deepEqual(r.calls, [['replace', parent]], here);
  }
});

test('a throwing canGoBack (navigator not ready) counts as no history', () => {
  const r = fakeRouter(false);
  r.canGoBack = () => { throw new Error('not ready'); };
  installSafeBack(r, () => '/recipe');
  r.back();
  assert.deepEqual(r.calls, [['replace', '/nutrition']]);
});

test('already at the fallback: no self-replace loop', () => {
  const r = fakeRouter(false);
  installSafeBack(r, () => '/');
  r.back();
  assert.deepEqual(r.calls, []);
});

test('installing twice does not double-wrap', () => {
  const r = fakeRouter(true);
  installSafeBack(r, () => '/x');
  installSafeBack(r, () => '/x');
  r.back();
  assert.deepEqual(r.calls, [['back']]);
});

test('backFallbackFor strips query strings and never returns empty', () => {
  assert.equal(backFallbackFor('/meal-detail?date=garbage'), '/nutrition');
  assert.equal(backFallbackFor(''), '/');
  assert.equal(backFallbackFor(null), '/');
});

test('the root layout installs it on the shared router', () => {
  const src = readFileSync(join(process.cwd(), 'src', 'app', '_layout.tsx'), 'utf8');
  assert.match(src, /^installSafeBack\(router\);/m);
});
