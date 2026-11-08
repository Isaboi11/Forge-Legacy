/**
 * Launch QA 11-08, H15 — Edit Profile → Save (or Remove photo) flashed the splash and dropped the athlete on Home:
 * `refetch()` raises the query's loading flag, the profile provider passed it straight through, and the boot router
 * swapped the whole Stack for the splash on every refresh.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('only "no profile for the athlete signed in now" holds the splash — a refresh keeps the one in hand', () => {
  const src = readFileSync(new URL('../profile.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /const loading = uid != null && data == null;/);
  assert.equal(/rawLoading \|\|/.test(src), false);
  // …and the profile is tagged with whose it is, so a sign-in as someone else never shows the last athlete's.
  assert.match(src, /const data = read != null && read\.uid === uid \? read\.profile : null;/);
});
