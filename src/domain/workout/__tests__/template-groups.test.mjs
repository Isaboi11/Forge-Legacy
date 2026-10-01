import test from 'node:test';
import assert from 'node:assert/strict';

import { groupMarks } from '../template-groups.ts';

/** Template Detail says a template's blocks (library-11, QA 09-26) — it used to draw them as loose lifts. */

const row = (name, extra = {}) => ({ name, sets: 3, targetReps: 10, ...extra });
const ss = (gid) => ({ groupId: gid, groupKind: 'superset', groupName: 'Superset', groupRounds: 3 });

test('loose lifts have no heading and no tag', () => {
  assert.deepEqual(groupMarks([row('Squat'), row('Curl')]), [
    { head: null, tag: null },
    { head: null, tag: null },
  ]);
});

test('⭐ a superset is said once, above its first member, and each member carries its tag', () => {
  const out = groupMarks([row('Squat'), row('Press', ss('a')), row('Row', ss('a')), row('Curl')]);
  assert.deepEqual(out.map((m) => m.head), [null, 'Superset A · 2 exercises, alternated', null, null]);
  assert.deepEqual(out.map((m) => m.tag), [null, 'A1', 'A2', null]);
});

test('two supersets are A and B — the letters the builder and the logger use', () => {
  const out = groupMarks([row('Press', ss('a')), row('Row', ss('a')), row('Fly', ss('b')), row('Curl', ss('b')), row('Dip', ss('b'))]);
  assert.equal(out[0].head, 'Superset A · 2 exercises, alternated');
  assert.equal(out[2].head, 'Superset B · 3 exercises, alternated');
  assert.deepEqual(out.map((m) => m.tag), ['A1', 'A2', 'B1', 'B2', 'B3']);
});

test('a circuit names itself and its rounds, and its members carry no superset tag', () => {
  const c = { groupId: 'c', groupKind: 'circuit', groupName: 'Finisher', groupRounds: 4 };
  const out = groupMarks([row('Burpee', c), row('Wall Ball', c), row('Row', c)]);
  assert.equal(out[0].head, 'Finisher · 4 rounds');
  assert.deepEqual(out.map((m) => m.tag), [null, null, null]);
  // No name and no round count: still said, by what it is.
  const bare = { groupId: 'd', groupKind: 'circuit', groupName: null, groupRounds: null };
  assert.equal(groupMarks([row('A', bare), row('B', bare)])[0].head, 'Circuit · 2 exercises');
});

test('⭐ a "group" of one is not a block — an old split row gets no heading', () => {
  const out = groupMarks([row('Press', ss('a')), row('Curl'), row('Row', ss('a'))]);
  assert.deepEqual(out.map((m) => m.head), [null, null, null]);
  assert.deepEqual(out.map((m) => m.tag), [null, null, null]);
});

test('null group fields (how a template row reads back) are loose lifts', () => {
  const out = groupMarks([row('Squat', { groupId: null, groupKind: null, groupName: null, groupRounds: null })]);
  assert.deepEqual(out, [{ head: null, tag: null }]);
});
