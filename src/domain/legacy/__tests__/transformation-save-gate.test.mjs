import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * ⚠ AN ENTRY MUST NEVER BE OVERWRITTEN BY A FORM THAT NEVER HELD IT.
 *
 * `transformation-add.tsx` is a screen, so it cannot be imported under `node --test` (it pulls in
 * react-native). The rule it must obey is one line, and losing it costs six irreplaceable photos, so it
 * is asserted against the source text rather than left unguarded.
 *
 * THE DEFECT THIS LOCKS OUT:
 *   `fetchTransformationEntry` returned `null` on any error, so a dropped connection looked exactly like
 *   a deleted entry. The prefill runs only on a truthy row, so the form rendered blank — and `canSave`
 *   was `… || isEdit`, meaning edit mode ALONE enabled Save. `updateTransformationEntry` writes every key
 *   that is not `undefined` and the caller passes `photos` unconditionally, so one tap wrote `{}` over a
 *   full entry. The objects stay in the bucket with nothing pointing at them, and no path in the app can
 *   re-link them.
 *
 * THE THREE THINGS THAT MUST STAY TRUE:
 *   1. the data layer throws on a failed read instead of returning null;
 *   2. `canSave` in edit mode requires `ready`, which only the prefill sets;
 *   3. a failed/absent load renders an explanation, not an editable blank form.
 */

const url = (p) => new URL(p, import.meta.url);
const screen = readFileSync(url('../../../app/transformation-add.tsx'), 'utf8');
const live = readFileSync(url('../../../data/transformation-live.ts'), 'utf8');

test('a failed read throws — it does not masquerade as a missing entry', () => {
  const fn = live.slice(live.indexOf('export async function fetchTransformationEntry'));
  const body = fn.slice(0, fn.indexOf('\n}'));

  assert.ok(
    /if \(error\) throw error;/.test(body),
    'fetchTransformationEntry must throw on a read error so useQuery reports it',
  );
  assert.ok(
    !/if \(error \|\| !data\) return null;/.test(body),
    'the old `error || !data` collapse is what made a blank form indistinguishable from a deleted entry',
  );
});

test('canSave in edit mode requires the prefill to have run', () => {
  const line = screen.split('\n').find((l) => l.includes('const canSave'));
  assert.ok(line, 'canSave must exist');

  assert.ok(
    /isEdit \?\s*ready/.test(line),
    `edit mode must gate on \`ready\`, got: ${line.trim()}`,
  );
  assert.ok(
    !/\|\|\s*isEdit\s*;/.test(line),
    'edit mode must never satisfy canSave on its own — that is the overwrite',
  );
});

test('only the prefill sets ready, and it only runs on a real row', () => {
  // If `ready` could be set anywhere else, gating canSave on it would prove nothing.
  const setters = screen.match(/setReady\(/g) ?? [];
  assert.equal(setters.length, 1, 'setReady must be called in exactly one place — the prefill');
  assert.ok(
    /if \(isEdit && existing && !ready\)/.test(screen),
    'the prefill must require a truthy `existing` before it seeds state and sets ready',
  );
});

test('a failed or absent load renders an explanation instead of a blank form', () => {
  assert.ok(
    /if \(isEdit && !loadingEntry && !existing\)/.test(screen),
    'there must be an early return for "edit mode, finished loading, nothing to edit"',
  );
  // The two outcomes need different sentences: one is retryable, the other never will be.
  assert.ok(/entryError \?/.test(screen), 'the copy must distinguish a failed read from a deleted entry');
  assert.ok(/refetchEntry/.test(screen), 'a failed read must offer a retry');
});
