import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLAIN, errorKind, isDayKey, isUuid, plainError } from '../plain-error.ts';

// QA 09-26 B4: screens printed raw database errors. These are the REAL strings from the report.

const pg = (code, message, extra = {}) => ({ code, message, details: null, hint: null, ...extra });

test('a database message never reaches the screen, whatever the code', () => {
  const raw = [
    pg('22P02', 'invalid input syntax for type uuid: "abc"'),
    pg('42501', 'new row violates row-level security policy for table "squad_posts"'),
    pg('PGRST202', 'Could not find the function public.squad_goal_notifications without parameters in the schema cache'),
    pg('42703', 'column squads.goal_closed_at does not exist'),
    pg('23505', 'duplicate key value violates unique constraint "squad_members_pkey"'),
    pg('PGRST116', 'JSON object requested, multiple (or no) rows returned'),
    pg('XX000', 'cache lookup failed for relation 12345'),
  ];
  for (const e of raw) {
    const out = plainError(e);
    assert.ok(Object.values(PLAIN).includes(out), `${e.code} → "${out}" is not one of the plain sentences`);
    assert.doesNotMatch(out, /uuid|violates|relation|column|function|schema|\(\w{5}\)|PGRST/i);
  }
  // …and the same when supabase-js hands it over as an Error subclass rather than a plain object.
  const asError = Object.assign(new Error('invalid input syntax for type uuid: "abc"'), { code: '22P02' });
  assert.equal(plainError(asError), PLAIN.notFound);
});

test('each failure gets the RIGHT reason — a bad link is not "check your connection"', () => {
  assert.equal(errorKind(pg('22P02', 'invalid input syntax for type uuid: "abc"')), 'not-found');
  assert.equal(errorKind(pg('42501', 'permission denied')), 'forbidden');
  assert.equal(errorKind(pg('PGRST202', 'Could not find the function')), 'unavailable');
  assert.equal(errorKind(new TypeError('Failed to fetch')), 'network');
  assert.equal(errorKind(new TypeError('Network request failed')), 'network');
  assert.equal(plainError(new TypeError('Failed to fetch')), PLAIN.network);
  // A server function that is not deployed (kitchen-02) is "not switched on", not a connection problem.
  const missingFn = Object.assign(new Error('Edge Function returned a non-2xx status code'), { name: 'FunctionsHttpError', context: { status: 404 } });
  assert.equal(plainError(missingFn), PLAIN.unavailable);
});

test('a JS failure is never printed (programs-10: a stack line on Start Program)', () => {
  assert.equal(plainError(new TypeError("Cannot read properties of undefined (reading 'weeks')")), PLAIN.other);
  assert.equal(plainError(new Error('x is not a function\n    at startProgram (index-d365.js:1:2)')), PLAIN.other);
  assert.equal(plainError({}), PLAIN.other);
  assert.equal(plainError(null), PLAIN.other);
  assert.equal(plainError(undefined, 'Couldn’t start the program.'), 'Couldn’t start the program.');
});

test('a sentence the app wrote itself is kept, and tidied', () => {
  assert.equal(plainError(new Error('This squad is full.')), 'This squad is full.');
  // social2-08, verbatim: our own `raise exception`, shown lower-case with "(P0001)" stuck on the end.
  assert.equal(plainError(pg('P0001', 'no pending request from that athlete')), 'No pending request from that athlete.');
  // A P0001 that is NOT a sentence for a person falls back.
  assert.equal(plainError(pg('P0001', 'null value in column "squad_id" violates not-null constraint')), PLAIN.other);
  // Sign-in's own errors carry a word code, not a database one — they stay readable.
  assert.equal(plainError(Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials', status: 400 })), 'Invalid login credentials.');
});

test('every sentence the data layer throws today survives the mapper', () => {
  // The real inputs, read from the source — a tidy fixture would not have caught a bad pattern.
  const files = ['data/squad-live.ts', 'data/notifications-live.ts', 'data/challenges-live.ts', 'data/friends-live.ts'];
  let seen = 0;
  for (const f of files) {
    let src;
    try {
      src = readFileSync(join(process.cwd(), 'src', f), 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(/throw new Error\('([^'$]+)'\)/g)) {
      seen += 1;
      const out = plainError(new Error(m[1]));
      assert.ok(out.startsWith(m[1].charAt(0).toUpperCase() + m[1].slice(1, 12)), `lost an authored sentence from ${f}: "${m[1]}" → "${out}"`);
    }
  }
  assert.ok(seen > 5, `expected to find authored throws to check, found ${seen}`);
});

test('ids are checked before they are sent to a uuid column', () => {
  assert.equal(isUuid('3f2c1b9a-7d4e-4a1b-9c0d-5e6f7a8b9c0d'), true);
  for (const bad of ['abc', '', undefined, null, 'bad', '3f2c1b9a7d4e4a1b9c0d5e6f7a8b9c0d', ['3f2c1b9a-7d4e-4a1b-9c0d-5e6f7a8b9c0d'], 12]) {
    assert.equal(isUuid(bad), false, `${String(bad)} passed as an id`);
  }
});

test('a day is a real calendar day (N-38: /meal-detail?date=garbage was a blank screen)', () => {
  assert.equal(isDayKey('2026-09-26'), true);
  assert.equal(isDayKey('2024-02-29'), true);
  for (const bad of ['garbage', '', undefined, '2026-13-01', '2026-02-30', '2026-9-26', '26-09-2026', '2026-09-26T00:00:00Z']) {
    assert.equal(isDayKey(bad), false, `${String(bad)} passed as a day`);
  }
});
