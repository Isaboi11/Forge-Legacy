// node --test scripts/__tests__/qa-to-ops-bugs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQa, laneIdCensus, toSql, DOC_PATH, SQL_PATH } from '../qa-to-ops-bugs.mjs';

const md = readFileSync(DOC_PATH, 'utf8');
const items = parseQa(md);
const count = (list, key) => list.reduce((a, it) => ((a[it[key]] = (a[it[key]] ?? 0) + 1), a), {});
const split = (list) => {
  const c = count(list, 'severity');
  return [c.critical ?? 0, c.high ?? 0, c.medium ?? 0, c.low ?? 0];
};

test('total is the doc total: 311 (round 1: 203, round 2: 108)', () => {
  assert.equal(items.length, 311);
  assert.deepEqual(count(items, 'round'), { 1: 203, 2: 108 });
});

test('round 1 matches the doc split exactly: C2 H16 M100 L85', () => {
  assert.deepEqual(split(items.filter((i) => i.round === 1)), [2, 16, 100, 85]);
});

test('critical and high match the doc in both rounds (C3 H25; round 2 C1 H9)', () => {
  assert.deepEqual(split(items).slice(0, 2), [3, 25]);
  assert.deepEqual(split(items.filter((i) => i.round === 2)).slice(0, 2), [1, 9]);
  assert.equal(split(items).slice(2).reduce((a, b) => a + b), 146 + 137);
});

// The doc's round-2 split (M46 L52) counts 31 lane findings that sit inside the
// R2-B bundles with each finding's own lane severity, which the doc never prints;
// the bundles are all labelled [Medium] (R2-B8 is unlabelled). From the doc alone
// those findings inherit their bundle's severity, so 10 findings the lanes rated
// Low come out Medium: round 2 is M56 L42 (doc: M46 L52), i.e. 156/127 overall.
test('severity split is exactly 3/25/146/137', {
  todo: 'doc does not print the severity of the 31 bundled round-2 findings; parse gives 3/25/156/127',
}, () => {
  assert.deepEqual(split(items), [3, 25, 146, 137]);
});

test('this parse: 3/25/156/127 (round 2: C1 H9 M56 L42)', () => {
  assert.deepEqual(split(items), [3, 25, 156, 127]);
  assert.deepEqual(split(items.filter((i) => i.round === 2)), [1, 9, 56, 42]);
});

test('round-2 lane ids: 122 raw, 10 seen-again only in round 1, 4 merged pairs, every id covered once', () => {
  const { inRound2, onlyInRound1 } = laneIdCensus(md);
  assert.equal(inRound2.size + onlyInRound1.length, 122);
  assert.equal(onlyInRound1.length, 10);
  const r2 = items.filter((i) => i.round === 2);
  const ids = r2.flatMap((i) => i.lane_ids);
  assert.equal(new Set(ids).size, ids.length, 'a lane id is on two items');
  assert.deepEqual(new Set(ids), inRound2);
  assert.equal(r2.filter((i) => i.lane_ids.length === 2).length, 4);
  assert.ok(r2.every((i) => i.lane_ids.length <= 2));
});

test('refs are unique and every row is well formed', () => {
  const refs = items.map((i) => i.ref);
  assert.equal(new Set(refs).size, refs.length);
  for (const it of items) {
    assert.ok(it.ref && it.ref.trim(), 'empty ref');
    assert.ok(it.title && it.title.trim().length > 3, `empty title on ${it.ref}`);
    assert.ok(['critical', 'high', 'medium', 'low'].includes(it.severity), it.ref);
    assert.ok(['open', 'fixed'].includes(it.status), it.ref);
    assert.ok(it.area && it.area === it.area.toLowerCase(), `area on ${it.ref}`);
    assert.ok(it.detail && it.detail.length <= 4000, `detail on ${it.ref}`);
  }
});

test('only F13 is marked fixed (the doc: "F13 … is **fixed**")', () => {
  assert.deepEqual(items.filter((i) => i.status === 'fixed').map((i) => i.ref), ['F13']);
});

test('no item detail contains another item heading (bleed check)', () => {
  const heads = items.map((i) => ({ ref: i.ref, line: i.source_line.trim() }));
  for (const it of items) {
    for (const h of heads) {
      if (h.ref === it.ref) continue;
      assert.ok(!it.detail.includes(h.line), `${it.ref} detail contains the heading of ${h.ref}`);
    }
    assert.ok(!/^#{2,4} /m.test(it.detail), `${it.ref} detail contains a markdown heading`);
  }
});

test('generated SQL matches the committed file and is well formed', () => {
  const sql = toSql(items);
  assert.equal(readFileSync(SQL_PATH, 'utf8'), sql, 'run: node scripts/qa-to-ops-bugs.mjs');
  assert.equal((sql.match(/^insert into /gm) ?? []).length, 1);
  assert.equal((sql.match(/^  \('qa', 'Full-App-QA-2026-09-26', /gm) ?? []).length, 311);
  assert.match(sql, /on conflict \(source, report, ref\) do nothing;/);
  assert.match(sql, /select severity, count\(\*\) from public\.ops_bugs where report='Full-App-QA-2026-09-26' group by 1 order by 1;\s*$/);
  // every dollar-quote opened is closed
  for (const tag of new Set(sql.match(/\$qax*\$/g) ?? [])) assert.equal(sql.split(tag).length % 2, 1, tag);
});
